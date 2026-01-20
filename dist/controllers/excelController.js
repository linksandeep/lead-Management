"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeadFields = exports.importWithMapping = exports.getSheetPreview = exports.analyzeExcelFile = void 0;
const XLSX = __importStar(require("xlsx"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const Lead_1 = __importDefault(require("../models/Lead"));
const validSources = ['Website', 'Social Media', 'Referral', 'Import', 'Manual', 'Cold Call', 'Email Campaign'];
const validPriorities = ['High', 'Medium', 'Low'];
const convertScientificNotation = (value) => {
    if (typeof value === 'number') {
        return value.toLocaleString('fullwide', { useGrouping: false });
    }
    if (typeof value === 'string') {
        const scientificMatch = value.match(/^([+-]?\d*\.?\d+)[eE]([+-]?\d+)$/);
        if (scientificMatch) {
            const number = parseFloat(value);
            if (!isNaN(number)) {
                return number.toLocaleString('fullwide', { useGrouping: false });
            }
        }
    }
    return String(value).trim();
};
const cleanPhoneNumber = (phone) => {
    if (!phone)
        return phone;
    let cleaned = phone.replace(/[^\d\+\-\(\)\s\.]/g, '');
    if (cleaned.match(/^00\d/)) {
        cleaned = '+' + cleaned.substring(2);
    }
    return cleaned.trim();
};
const cleanupUploadedFile = (filePath) => {
    if (filePath) {
        try {
            fs_1.default.unlinkSync(filePath);
            console.log('🗑️ Cleaned up uploaded file:', filePath);
        }
        catch (error) {
            console.error('Error deleting uploaded file:', error);
        }
    }
};
const analyzeExcelFile = async (req, res) => {
    try {
        const uploadedFile = req.file;
        if (!uploadedFile) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
            return;
        }
        const filePath = uploadedFile.path;
        const fileExtension = path_1.default.extname(uploadedFile.originalname).toLowerCase();
        let workbook;
        try {
            if (fileExtension === '.csv') {
                const csvData = fs_1.default.readFileSync(filePath, 'utf8');
                workbook = XLSX.read(csvData, { type: 'string' });
            }
            else {
                workbook = XLSX.readFile(filePath);
            }
        }
        catch (fileError) {
            fs_1.default.unlinkSync(filePath);
            res.status(400).json({
                success: false,
                message: 'Failed to read the uploaded file',
                errors: ['The file appears to be corrupted or in an unsupported format']
            });
            return;
        }
        const sheets = [];
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
            const hasData = range.e.r > 0;
            const headers = [];
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                const cell = worksheet[cellAddress];
                headers.push(cell ? String(cell.v).trim() : `Column ${col + 1}`);
            }
            sheets.push({
                name: sheetName,
                rowCount: hasData ? range.e.r : 0,
                columnHeaders: headers,
                hasData
            });
        }
        const analysis = {
            fileName: uploadedFile.originalname,
            fileSize: uploadedFile.size,
            sheets,
            uploadedAt: new Date().toISOString()
        };
        res.status(200).json({
            success: true,
            message: 'File analyzed successfully',
            data: analysis
        });
    }
    catch (error) {
        console.error('File analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze Excel file',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
    finally {
        cleanupUploadedFile(req.file?.path);
    }
};
exports.analyzeExcelFile = analyzeExcelFile;
const getSheetPreview = async (req, res) => {
    try {
        const uploadedFile = req.file;
        const { sheetName, previewRows = 5 } = req.body;
        if (!uploadedFile) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
            return;
        }
        if (!sheetName) {
            res.status(400).json({
                success: false,
                message: 'Sheet name is required'
            });
            return;
        }
        const filePath = uploadedFile.path;
        const fileExtension = path_1.default.extname(uploadedFile.originalname).toLowerCase();
        let workbook;
        try {
            if (fileExtension === '.csv') {
                const csvData = fs_1.default.readFileSync(filePath, 'utf8');
                workbook = XLSX.read(csvData, { type: 'string' });
            }
            else {
                workbook = XLSX.readFile(filePath);
            }
        }
        catch (fileError) {
            fs_1.default.unlinkSync(filePath);
            res.status(400).json({
                success: false,
                message: 'Failed to read the uploaded file'
            });
            return;
        }
        if (!workbook.Sheets[sheetName]) {
            res.status(400).json({
                success: false,
                message: `Sheet "${sheetName}" not found in the file`
            });
            return;
        }
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            raw: true,
            defval: ''
        });
        if (sheetData.length === 0) {
            res.status(400).json({
                success: false,
                message: 'The selected sheet appears to be empty'
            });
            return;
        }
        const headers = sheetData[0];
        const dataRows = sheetData.slice(1);
        const sampleRows = dataRows.slice(0, parseInt(previewRows, 10))
            .map(row => row.map((cell, index) => {
            let converted = convertScientificNotation(cell);
            const header = headers[index]?.toLowerCase() || '';
            if (header.includes('phone') || header.includes('contact') || header.includes('mobile')) {
                converted = cleanPhoneNumber(converted);
            }
            return converted;
        }));
        const previewData = {
            headers: headers.map(h => String(h).trim()),
            sampleRows,
            totalRows: dataRows.length
        };
        res.status(200).json({
            success: true,
            message: 'Sheet preview generated successfully',
            data: previewData
        });
    }
    catch (error) {
        console.error('Sheet preview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate sheet preview',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
    finally {
        cleanupUploadedFile(req.file?.path);
    }
};
exports.getSheetPreview = getSheetPreview;
const importWithMapping = async (req, res) => {
    try {
        const User = mongoose_1.default.model('User');
        const systemUser = await User.findOne({ email: 'system@leadmanager.com' });
        if (!systemUser) {
            res.status(500).json({
                success: false,
                message: 'System user not found for import operations',
                errors: ['Please run the seed script to create the system user']
            });
            return;
        }
        const uploadedFile = req.file;
        if (!uploadedFile) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
            return;
        }
        const sheetName = req.body.sheetName;
        const skipEmptyRows = req.body.skipEmptyRows === 'true';
        const startFromRow = parseInt(req.body.startFromRow, 10) || 2;
        let fieldMappings;
        try {
            fieldMappings = JSON.parse(req.body.fieldMappings);
        }
        catch (parseError) {
            res.status(400).json({
                success: false,
                message: 'Invalid field mappings format',
                errors: ['Field mappings must be valid JSON']
            });
            return;
        }
        if (!sheetName || !fieldMappings || fieldMappings.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Sheet name and field mappings are required'
            });
            return;
        }
        const requiredFields = ['name', 'email', 'phone'];
        const mappedFields = fieldMappings.map(m => m.leadField);
        const missingRequired = requiredFields.filter(field => !mappedFields.includes(field));
        if (missingRequired.length > 0) {
            res.status(400).json({
                success: false,
                message: 'Required fields must be mapped',
                errors: [`Missing mappings for: ${missingRequired.join(', ')}`]
            });
            return;
        }
        const filePath = uploadedFile.path;
        const fileExtension = path_1.default.extname(uploadedFile.originalname).toLowerCase();
        let workbook;
        try {
            if (fileExtension === '.csv') {
                const csvData = fs_1.default.readFileSync(filePath, 'utf8');
                workbook = XLSX.read(csvData, { type: 'string' });
            }
            else {
                workbook = XLSX.readFile(filePath);
            }
        }
        catch (fileError) {
            fs_1.default.unlinkSync(filePath);
            res.status(400).json({
                success: false,
                message: 'Failed to read the uploaded file'
            });
            return;
        }
        if (!workbook.Sheets[sheetName]) {
            res.status(400).json({
                success: false,
                message: `Sheet "${sheetName}" not found`
            });
            return;
        }
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            raw: true,
            defval: ''
        });
        if (sheetData.length < startFromRow) {
            res.status(400).json({
                success: false,
                message: 'Not enough data rows in the sheet'
            });
            return;
        }
        const headers = sheetData[0];
        const dataRows = sheetData.slice(startFromRow - 1);
        const columnIndexMap = {};
        headers.forEach((header, index) => {
            columnIndexMap[header.trim()] = index;
        });
        const validationResults = [];
        const validLeads = [];
        const createdLeads = [];
        for (let i = 0; i < dataRows.length; i++) {
            const rowData = dataRows[i];
            const rowNumber = startFromRow + i;
            if (skipEmptyRows && rowData.every(cell => !cell || String(cell).trim() === '')) {
                continue;
            }
            const mappedData = {};
            const rowErrors = [];
            for (const mapping of fieldMappings) {
                if (mapping.leadField === 'notes') {
                    continue;
                }
                const columnIndex = columnIndexMap[mapping.excelColumn];
                let value = '';
                if (columnIndex !== undefined && rowData[columnIndex] !== undefined) {
                    value = convertScientificNotation(rowData[columnIndex]);
                    if (mapping.leadField === 'phone') {
                        value = cleanPhoneNumber(value);
                    }
                }
                else if (mapping.defaultValue) {
                    value = mapping.defaultValue;
                }
                mappedData[mapping.leadField] = value;
                if (mapping.isRequired && (!value || value === '')) {
                    rowErrors.push({
                        field: mapping.leadField,
                        message: `${mapping.leadField} is required`,
                        value: value
                    });
                }
            }
            const notes = [];
            const notesMapping = fieldMappings.find(m => m.leadField === 'notes');
            if (notesMapping && notesMapping.excelColumn) {
                const noteColumns = notesMapping.excelColumn.split(',').map(col => col.trim());
                for (const excelColumn of noteColumns) {
                    const columnIndex = columnIndexMap[excelColumn];
                    if (columnIndex !== undefined && rowData[columnIndex] !== undefined) {
                        const noteContent = convertScientificNotation(rowData[columnIndex]);
                        if (noteContent && noteContent.trim() !== '') {
                            notes.push({
                                content: noteContent.trim(),
                                createdBy: systemUser._id
                            });
                        }
                    }
                }
            }
            mappedData.notes = notes;
            if (mappedData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mappedData.email)) {
                rowErrors.push({
                    field: 'email',
                    message: 'Invalid email format',
                    value: mappedData.email
                });
            }
            if (mappedData.source && !validSources.includes(mappedData.source)) {
                mappedData.source = 'Import';
            }
            if (mappedData.priority && !validPriorities.includes(mappedData.priority)) {
                mappedData.priority = 'Medium';
            }
            mappedData.source = mappedData.source || 'Import';
            mappedData.priority = mappedData.priority || 'Medium';
            mappedData.status = 'New';
            mappedData.position = mappedData.position || '';
            mappedData.folder = mappedData.folder || '';
            const validationResult = {
                isValid: rowErrors.length === 0,
                rowNumber,
                data: mappedData,
                errors: rowErrors
            };
            validationResults.push(validationResult);
            if (validationResult.isValid) {
                validLeads.push(mappedData);
            }
        }
        const errors = [];
        const processedEmails = new Set();
        const processedPhones = new Set();
        for (const leadData of validLeads) {
            try {
                const validationError = validationResults.find(vr => vr.data === leadData);
                const rowNumber = validationError?.rowNumber || 0;
                const emailKey = leadData.email.toLowerCase().trim();
                const phoneKey = leadData.phone.trim();
                if (processedEmails.has(emailKey)) {
                    errors.push({
                        row: rowNumber,
                        field: 'email',
                        message: `Duplicate email "${leadData.email}" found within import file`
                    });
                    continue;
                }
                if (processedPhones.has(phoneKey)) {
                    errors.push({
                        row: rowNumber,
                        field: 'phone',
                        message: `Duplicate phone "${leadData.phone}" found within import file`
                    });
                    continue;
                }
                const existingEmail = await Lead_1.default.findOne({ email: emailKey });
                if (existingEmail) {
                    errors.push({
                        row: rowNumber,
                        field: 'email',
                        message: `Lead with email "${leadData.email}" already exists in database`
                    });
                    continue;
                }
                const existingPhone = await Lead_1.default.findOne({ phone: phoneKey });
                if (existingPhone) {
                    errors.push({
                        row: rowNumber,
                        field: 'phone',
                        message: `Lead with phone "${leadData.phone}" already exists in database`
                    });
                    continue;
                }
                const lead = new Lead_1.default(leadData);
                const savedLead = await lead.save();
                createdLeads.push(savedLead);
                processedEmails.add(emailKey);
                processedPhones.add(phoneKey);
            }
            catch (error) {
                const validationError = validationResults.find(vr => vr.data === leadData);
                const rowNumber = validationError?.rowNumber || 0;
                const duplicateError = Lead_1.default.getDuplicateError(error);
                if (duplicateError) {
                    errors.push({
                        row: rowNumber,
                        field: 'duplicate',
                        message: duplicateError
                    });
                }
                else {
                    errors.push({
                        row: rowNumber,
                        field: 'general',
                        message: error.message || 'Failed to create lead'
                    });
                }
            }
        }
        validationResults.forEach(vr => {
            if (!vr.isValid) {
                vr.errors.forEach(err => {
                    errors.push({
                        row: vr.rowNumber,
                        field: err.field,
                        message: err.message
                    });
                });
            }
        });
        const result = {
            success: true,
            message: `Successfully imported ${createdLeads.length} leads`,
            data: {
                totalRows: dataRows.length,
                successfulImports: createdLeads.length,
                failedImports: errors.length,
                errors,
                leads: createdLeads
            }
        };
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Dynamic import error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to import leads',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
    finally {
        cleanupUploadedFile(req.file?.path);
    }
};
exports.importWithMapping = importWithMapping;
const getLeadFields = async (_req, res) => {
    try {
        const leadFields = [
            {
                name: 'name',
                label: 'Full Name',
                type: 'string',
                required: true,
                description: 'Contact\'s full name'
            },
            {
                name: 'email',
                label: 'Email Address',
                type: 'email',
                required: true,
                description: 'Valid email address'
            },
            {
                name: 'phone',
                label: 'Phone Number',
                type: 'string',
                required: true,
                description: 'Contact phone number'
            },
            {
                name: 'position',
                label: 'Job Title',
                type: 'string',
                required: false,
                description: 'Job title or position'
            },
            {
                name: 'folder',
                label: 'Folder',
                type: 'string',
                required: false,
                description: 'Folder to organize leads (e.g., UK, USA, Germany)'
            },
            {
                name: 'source',
                label: 'Lead Source',
                type: 'enum',
                required: false,
                options: validSources,
                defaultValue: 'Import',
                description: 'How the lead was acquired'
            },
            {
                name: 'priority',
                label: 'Priority Level',
                type: 'enum',
                required: false,
                options: validPriorities,
                defaultValue: 'Medium',
                description: 'Lead priority level'
            }
        ];
        res.status(200).json({
            success: true,
            message: 'Lead fields retrieved successfully',
            data: leadFields
        });
    }
    catch (error) {
        console.error('Get lead fields error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve lead fields',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getLeadFields = getLeadFields;
//# sourceMappingURL=excelController.js.map