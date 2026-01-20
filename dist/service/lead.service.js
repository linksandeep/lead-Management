"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importLeadsFromGoogleSheetService = void 0;
const Lead_1 = __importDefault(require("../models/Lead"));
const DuplicateLead_1 = __importDefault(require("../models/DuplicateLead"));
const googleSheet_1 = require("../utils/googleSheet");
const importLeadsFromGoogleSheetService = async (sheetUrl) => {
    if (!sheetUrl) {
        const err = new Error('Google Sheet URL is required');
        err.statusCode = 400;
        throw err;
    }
    const rows = await (0, googleSheet_1.getCsvFromGoogleSheet)(sheetUrl);
    if (!rows || !rows.length) {
        const err = new Error('Google Sheet is empty');
        err.statusCode = 400;
        throw err;
    }
    const requiredFields = ['name', 'email', 'phone'];
    const insertedLeads = [];
    const duplicateLeads = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;
        for (const field of requiredFields) {
            if (!row[field] || !row[field].toString().trim()) {
                const err = new Error(`Missing required field "${field}" at row ${rowNumber}`);
                err.statusCode = 400;
                err.details = { row: rowNumber, field };
                throw err;
            }
        }
        const email = row.email.toLowerCase().trim();
        const phone = row.phone.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const err = new Error(`Invalid email format at row ${rowNumber}`);
            err.statusCode = 400;
            err.details = { row: rowNumber, email };
            throw err;
        }
        const existingLead = await Lead_1.default.findOne({
            $or: [{ email }, { phone }]
        });
        if (existingLead) {
            let reason = 'EMAIL_PHONE_EXISTS';
            if (existingLead.email === email)
                reason = 'EMAIL_EXISTS';
            else if (existingLead.phone === phone)
                reason = 'PHONE_EXISTS';
            await DuplicateLead_1.default.create({
                originalData: row,
                reason,
                existingLeadId: existingLead._id
            });
            duplicateLeads.push({
                row: rowNumber,
                name: row.name,
                email,
                phone,
                reason
            });
            continue;
        }
        const lead = await Lead_1.default.create({
            name: row.name.trim(),
            email,
            phone,
            position: row.position || '',
            source: 'Import',
            status: 'New',
            priority: 'Medium'
        });
        insertedLeads.push(lead);
    }
    return {
        insertedCount: insertedLeads.length,
        duplicateCount: duplicateLeads.length,
        duplicateLeads
    };
};
exports.importLeadsFromGoogleSheetService = importLeadsFromGoogleSheetService;
//# sourceMappingURL=lead.service.js.map