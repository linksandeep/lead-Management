"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importLeadsFromGoogleSheet = exports.getFolderCounts = exports.getMyLeadsStats = exports.getDistinctFolders = exports.getMyLeads = exports.addNote = exports.bulkUpdateStatus = exports.unassignLeads = exports.assignLeads = exports.deleteLead = exports.updateLead = exports.createLead = exports.getLeadById = exports.getLeads = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Lead_1 = __importDefault(require("../models/Lead"));
const User_1 = __importDefault(require("../models/User"));
const lead_service_1 = require("../service/lead.service");
const sendError_1 = require("../utils/sendError");
const getLeads = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, source, priority, assignedTo, folder, search, dateRange } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const filter = {};
        if (req.user?.role !== 'admin') {
            filter.assignedTo = req.user?.userId;
        }
        if (status) {
            const statusArray = Array.isArray(status) ? status : [status];
            filter.status = { $in: statusArray };
        }
        if (source) {
            const sourceArray = Array.isArray(source) ? source : [source];
            filter.source = { $in: sourceArray };
        }
        if (priority) {
            const priorityArray = Array.isArray(priority) ? priority : [priority];
            filter.priority = { $in: priorityArray };
        }
        if (assignedTo && req.user?.role === 'admin') {
            const assignedToArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
            const hasUnassignedFilter = assignedToArray.includes(null) ||
                assignedToArray.includes('null') ||
                assignedToArray.includes('unassigned');
            const otherAssignees = assignedToArray.filter(id => id !== null &&
                id !== 'null' &&
                id !== 'unassigned');
            if (hasUnassignedFilter && otherAssignees.length === 0) {
                filter.assignedTo = { $in: [null, undefined] };
            }
            else if (hasUnassignedFilter && otherAssignees.length > 0) {
                filter.$or = [
                    { assignedTo: { $in: [null, undefined] } },
                    { assignedTo: { $in: otherAssignees } }
                ];
            }
            else {
                filter.assignedTo = { $in: assignedToArray };
            }
        }
        if (folder) {
            const folderArray = Array.isArray(folder) ? folder : [folder];
            const hasEmptyFilter = folderArray.includes('') || folderArray.includes('null') || folderArray.includes('undefined') || folderArray.includes('Uncategorized');
            const otherFolders = folderArray.filter(f => f !== '' && f !== 'null' && f !== 'undefined' && f !== 'Uncategorized');
            if (hasEmptyFilter && otherFolders.length === 0) {
                filter.$or = [
                    { folder: '' },
                    { folder: { $exists: false } },
                    { folder: null }
                ];
            }
            else if (hasEmptyFilter && otherFolders.length > 0) {
                filter.$or = [
                    { folder: '' },
                    { folder: { $exists: false } },
                    { folder: null },
                    { folder: { $in: otherFolders } }
                ];
            }
            else {
                filter.folder = { $in: folderArray };
            }
        }
        if (search) {
            const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchStr = search.trim();
            const isEmail = searchStr.includes('@');
            const isNumber = /^\d{6,}$/.test(searchStr.replace(/\D/g, '')) && !/[a-zA-Z]/.test(searchStr);
            if (isEmail || (!isNumber && /[a-zA-Z]/.test(searchStr))) {
                const searchRegex = new RegExp(escapeRegex(searchStr), 'i');
                const textOrConditions = [
                    { name: searchRegex },
                    { email: searchRegex },
                    { position: searchRegex }
                ];
                if (filter.$or) {
                    filter.$and = [
                        { $or: filter.$or },
                        { $or: textOrConditions }
                    ];
                    delete filter.$or;
                }
                else {
                    filter.$or = textOrConditions;
                }
            }
            else if (isNumber) {
                const digitsOnly = searchStr.replace(/\D/g, '');
                const phoneDigitsExpr = {
                    $replaceAll: {
                        input: {
                            $replaceAll: {
                                input: {
                                    $replaceAll: {
                                        input: {
                                            $replaceAll: {
                                                input: {
                                                    $replaceAll: {
                                                        input: "$phone",
                                                        find: "+",
                                                        replacement: ""
                                                    }
                                                },
                                                find: "-",
                                                replacement: ""
                                            }
                                        },
                                        find: " ",
                                        replacement: ""
                                    }
                                },
                                find: "(",
                                replacement: ""
                            }
                        },
                        find: ")",
                        replacement: ""
                    }
                };
                const phoneExpr = {
                    $expr: {
                        $regexMatch: {
                            input: phoneDigitsExpr,
                            regex: digitsOnly
                        }
                    }
                };
                if (filter.$or) {
                    filter.$and = [
                        { $or: filter.$or },
                        phoneExpr
                    ];
                    delete filter.$or;
                }
                else {
                    Object.assign(filter, phoneExpr);
                }
            }
        }
        if (dateRange) {
            try {
                const range = typeof dateRange === 'string' ? JSON.parse(dateRange) : dateRange;
                if (range.from && range.to) {
                    filter.createdAt = {
                        $gte: new Date(range.from),
                        $lte: new Date(range.to)
                    };
                }
            }
            catch (error) {
            }
        }
        const [leads, total] = await Promise.all([
            Lead_1.default.find(filter)
                .populate('assignedToUser', 'name email')
                .populate('assignedByUser', 'name email')
                .populate('notes.createdBy', 'name email')
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Lead_1.default.countDocuments(filter)
        ]);
        const totalPages = Math.ceil(total / limitNum);
        res.status(200).json({
            success: true,
            message: 'Leads retrieved successfully',
            data: leads,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    }
    catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve leads',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getLeads = getLeads;
const getLeadById = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead_1.default.findById(id)
            .populate('assignedToUser', 'name email')
            .populate('assignedByUser', 'name email')
            .populate('notes.createdBy', 'name email');
        if (!lead) {
            res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
            return;
        }
        if (req.user?.role !== 'admin' && String(lead.assignedTo) !== String(req.user?.userId)) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Lead retrieved successfully',
            data: lead
        });
    }
    catch (error) {
        console.error('Get lead by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve lead',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getLeadById = getLeadById;
const createLead = async (req, res) => {
    try {
        const leadData = req.body;
        const requiredFields = ['name', 'email', 'phone'];
        const missingFields = requiredFields.filter(field => !leadData[field]);
        if (missingFields.length > 0) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields',
                errors: [`Required fields: ${missingFields.join(', ')}`]
            });
            return;
        }
        const existingEmail = await Lead_1.default.findOne({ email: leadData.email.toLowerCase().trim() });
        if (existingEmail) {
            res.status(400).json({
                success: false,
                message: 'Duplicate lead detected',
                errors: [`A lead with email "${leadData.email}" already exists`],
                data: {
                    existingLead: {
                        _id: existingEmail._id,
                        name: existingEmail.name,
                        email: existingEmail.email,
                        phone: existingEmail.phone
                    }
                }
            });
            return;
        }
        const existingPhone = await Lead_1.default.findOne({ phone: leadData.phone.trim() });
        if (existingPhone) {
            res.status(400).json({
                success: false,
                message: 'Duplicate lead detected',
                errors: [`A lead with phone number "${leadData.phone}" already exists`],
                data: {
                    existingLead: {
                        _id: existingPhone._id,
                        name: existingPhone.name,
                        email: existingPhone.email,
                        phone: existingPhone.phone
                    }
                }
            });
            return;
        }
        const { notes, ...leadFields } = leadData;
        const lead = new Lead_1.default({
            ...leadFields,
            assignedBy: req.user?.userId
        });
        if (notes) {
            lead.notes.push({
                id: new mongoose_1.default.Types.ObjectId().toString(),
                content: notes,
                createdBy: new mongoose_1.default.Types.ObjectId(req.user?.userId || ''),
                createdAt: new Date()
            });
        }
        await lead.save();
        await lead.populate('assignedByUser', 'name email');
        res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            data: lead
        });
    }
    catch (error) {
        console.error('Create lead error:', error);
        const duplicateError = Lead_1.default.getDuplicateError(error);
        if (duplicateError) {
            res.status(400).json({
                success: false,
                message: 'Duplicate lead detected',
                errors: [duplicateError]
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create lead',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.createLead = createLead;
const updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const lead = await Lead_1.default.findById(id);
        if (!lead) {
            res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
            return;
        }
        if (req.user?.role !== 'admin' && String(lead.assignedTo) !== String(req.user?.userId)) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }
        if (updateData.email) {
            const existingEmail = await Lead_1.default.findOne({
                email: updateData.email.toLowerCase().trim(),
                _id: { $ne: id }
            });
            if (existingEmail) {
                res.status(400).json({
                    success: false,
                    message: 'Duplicate lead detected',
                    errors: [`A lead with email "${updateData.email}" already exists`],
                    data: {
                        existingLead: {
                            _id: existingEmail._id,
                            name: existingEmail.name,
                            email: existingEmail.email,
                            phone: existingEmail.phone
                        }
                    }
                });
                return;
            }
        }
        if (updateData.phone) {
            const existingPhone = await Lead_1.default.findOne({
                phone: updateData.phone.trim(),
                _id: { $ne: id }
            });
            if (existingPhone) {
                res.status(400).json({
                    success: false,
                    message: 'Duplicate lead detected',
                    errors: [`A lead with phone number "${updateData.phone}" already exists`],
                    data: {
                        existingLead: {
                            _id: existingPhone._id,
                            name: existingPhone.name,
                            email: existingPhone.email,
                            phone: existingPhone.phone
                        }
                    }
                });
                return;
            }
        }
        const allowedFields = ['name', 'email', 'phone', 'position', 'folder', 'source', 'status', 'priority'];
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                lead[field] = updateData[field];
            }
        });
        await lead.save();
        await lead.populate('assignedToUser', 'name email');
        await lead.populate('assignedByUser', 'name email');
        res.status(200).json({
            success: true,
            message: 'Lead updated successfully',
            data: lead
        });
    }
    catch (error) {
        console.error('Update lead error:', error);
        const duplicateError = Lead_1.default.getDuplicateError(error);
        if (duplicateError) {
            res.status(400).json({
                success: false,
                message: 'Duplicate lead detected',
                errors: [duplicateError]
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to update lead',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.updateLead = updateLead;
const deleteLead = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user?.role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
            return;
        }
        const lead = await Lead_1.default.findById(id);
        if (!lead) {
            res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
            return;
        }
        await Lead_1.default.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message: 'Lead deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete lead',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.deleteLead = deleteLead;
const assignLeads = async (req, res) => {
    try {
        const { leadIds, assignToUserId } = req.body;
        if (req.user?.role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
            return;
        }
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Lead IDs are required',
                errors: ['Please provide an array of lead IDs']
            });
            return;
        }
        if (!assignToUserId) {
            res.status(400).json({
                success: false,
                message: 'User ID is required',
                errors: ['Please provide a user ID to assign leads to']
            });
            return;
        }
        const assignToUser = await User_1.default.findById(assignToUserId);
        if (!assignToUser) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                errors: ['The specified user does not exist']
            });
            return;
        }
        const result = await Lead_1.default.updateMany({ _id: { $in: leadIds } }, {
            assignedTo: assignToUserId,
            assignedBy: req.user?.userId,
            updatedAt: new Date()
        });
        const updatedLeads = await Lead_1.default.find({ _id: { $in: leadIds } })
            .populate('assignedToUser', 'name email')
            .populate('assignedByUser', 'name email');
        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} leads assigned successfully`,
            data: updatedLeads
        });
    }
    catch (error) {
        console.error('Assign leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign leads',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.assignLeads = assignLeads;
const unassignLeads = async (req, res) => {
    try {
        const { leadIds } = req.body;
        if (req.user?.role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
            return;
        }
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Lead IDs are required',
                errors: ['Please provide an array of lead IDs']
            });
            return;
        }
        const result = await Lead_1.default.updateMany({ _id: { $in: leadIds } }, {
            $unset: {
                assignedTo: 1,
                assignedBy: 1
            },
            updatedAt: new Date()
        });
        const updatedLeads = await Lead_1.default.find({ _id: { $in: leadIds } })
            .populate('assignedToUser', 'name email')
            .populate('assignedByUser', 'name email');
        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} leads unassigned successfully`,
            data: updatedLeads
        });
    }
    catch (error) {
        console.error('Unassign leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unassign leads',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.unassignLeads = unassignLeads;
const bulkUpdateStatus = async (req, res) => {
    try {
        const { leadIds, status } = req.body;
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Lead IDs are required',
                errors: ['Please provide an array of lead IDs']
            });
            return;
        }
        if (!status || typeof status !== 'string' || status.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: 'Status is required',
                errors: ['Please provide a valid status']
            });
            return;
        }
        const result = await Lead_1.default.updateMany({ _id: { $in: leadIds } }, {
            $set: {
                status: status.trim(),
                updatedAt: new Date()
            }
        });
        const updatedLeads = await Lead_1.default.find({ _id: { $in: leadIds } })
            .populate('assignedToUser', 'name email')
            .populate('assignedByUser', 'name email');
        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} lead${result.modifiedCount !== 1 ? 's' : ''} updated to "${status}"`,
            data: updatedLeads
        });
    }
    catch (error) {
        console.error('Bulk update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update lead statuses',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.bulkUpdateStatus = bulkUpdateStatus;
const addNote = async (req, res) => {
    try {
        const { leadId, content } = req.body;
        if (!leadId || !content) {
            res.status(400).json({
                success: false,
                message: 'Lead ID and note content are required',
                errors: ['Please provide both lead ID and note content']
            });
            return;
        }
        if (content.trim().length < 1) {
            res.status(400).json({
                success: false,
                message: 'Note content cannot be empty',
                errors: ['Please provide valid note content']
            });
            return;
        }
        const lead = await Lead_1.default.findById(leadId);
        if (!lead) {
            res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
            return;
        }
        if (req.user?.role !== 'admin' && String(lead.assignedTo) !== String(req.user?.userId)) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }
        if (!req.user?.userId) {
            res.status(400).json({
                success: false,
                message: 'User ID is required',
                errors: ['Please provide a valid user ID']
            });
            return;
        }
        await lead.addNote(content.trim(), new mongoose_1.default.Types.ObjectId(req.user.userId));
        await lead.populate('assignedToUser', 'name email');
        await lead.populate('assignedByUser', 'name email');
        await lead.populate('notes.createdBy', 'name email');
        res.status(200).json({
            success: true,
            message: 'Note added successfully',
            data: lead
        });
    }
    catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add note',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.addNote = addNote;
const getMyLeads = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, source, priority, folder, search } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const filter = { assignedTo: req.user?.userId };
        if (status) {
            const statusArray = Array.isArray(status) ? status : [status];
            filter.status = { $in: statusArray };
        }
        if (source) {
            const sourceArray = Array.isArray(source) ? source : [source];
            filter.source = { $in: sourceArray };
        }
        if (priority) {
            const priorityArray = Array.isArray(priority) ? priority : [priority];
            filter.priority = { $in: priorityArray };
        }
        if (folder) {
            const folderArray = Array.isArray(folder) ? folder : [folder];
            const hasEmptyFilter = folderArray.includes('') || folderArray.includes('null') || folderArray.includes('undefined') || folderArray.includes('Uncategorized');
            const otherFolders = folderArray.filter(f => f !== '' && f !== 'null' && f !== 'undefined' && f !== 'Uncategorized');
            if (hasEmptyFilter && otherFolders.length === 0) {
                filter.$or = [
                    { folder: '' },
                    { folder: { $exists: false } },
                    { folder: null }
                ];
            }
            else if (hasEmptyFilter && otherFolders.length > 0) {
                filter.$or = [
                    { folder: '' },
                    { folder: { $exists: false } },
                    { folder: null },
                    { folder: { $in: otherFolders } }
                ];
            }
            else {
                filter.folder = { $in: folderArray };
            }
        }
        if (search) {
            const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchStr = search.trim();
            const isEmail = searchStr.includes('@');
            const isNumber = /^\d{6,}$/.test(searchStr.replace(/\D/g, '')) && !/[a-zA-Z]/.test(searchStr);
            if (isEmail || (!isNumber && /[a-zA-Z]/.test(searchStr))) {
                const searchRegex = new RegExp(escapeRegex(searchStr), 'i');
                const textOrConditions = [
                    { name: searchRegex },
                    { email: searchRegex },
                    { position: searchRegex }
                ];
                if (filter.$or) {
                    filter.$and = [
                        { $or: filter.$or },
                        { $or: textOrConditions }
                    ];
                    delete filter.$or;
                }
                else {
                    filter.$or = textOrConditions;
                }
            }
            else if (isNumber) {
                const digitsOnly = searchStr.replace(/\D/g, '');
                const phoneDigitsExpr = {
                    $replaceAll: {
                        input: {
                            $replaceAll: {
                                input: {
                                    $replaceAll: {
                                        input: {
                                            $replaceAll: {
                                                input: {
                                                    $replaceAll: {
                                                        input: "$phone",
                                                        find: "+",
                                                        replacement: ""
                                                    }
                                                },
                                                find: "-",
                                                replacement: ""
                                            }
                                        },
                                        find: " ",
                                        replacement: ""
                                    }
                                },
                                find: "(",
                                replacement: ""
                            }
                        },
                        find: ")",
                        replacement: ""
                    }
                };
                const phoneExpr = {
                    $expr: {
                        $regexMatch: {
                            input: phoneDigitsExpr,
                            regex: digitsOnly
                        }
                    }
                };
                if (filter.$or) {
                    filter.$and = [
                        { $or: filter.$or },
                        phoneExpr
                    ];
                    delete filter.$or;
                }
                else {
                    Object.assign(filter, phoneExpr);
                }
            }
        }
        const [leads, total] = await Promise.all([
            Lead_1.default.find(filter)
                .populate('assignedByUser', 'name email')
                .populate('notes.createdBy', 'name email')
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Lead_1.default.countDocuments(filter)
        ]);
        const totalPages = Math.ceil(total / limitNum);
        res.status(200).json({
            success: true,
            message: 'My leads retrieved successfully',
            data: leads,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    }
    catch (error) {
        console.error('Get my leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve your leads',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getMyLeads = getMyLeads;
const getDistinctFolders = async (req, res) => {
    try {
        const filter = {};
        if (req.user?.role !== 'admin') {
            filter.assignedTo = req.user?.userId;
        }
        const folders = await Lead_1.default.distinct('folder', {
            ...filter,
            folder: { $nin: ['', null], $exists: true }
        });
        folders.sort((a, b) => a.localeCompare(b));
        res.status(200).json({
            success: true,
            message: 'Distinct folders retrieved successfully',
            data: folders
        });
    }
    catch (error) {
        console.error('Get distinct folders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve distinct folders',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getDistinctFolders = getDistinctFolders;
const getMyLeadsStats = async (req, res) => {
    try {
        const filter = { assignedTo: req.user?.userId };
        const leads = await Lead_1.default.find(filter).lean();
        const total = leads.length;
        const newLeads = leads.filter(lead => lead.status === 'New').length;
        const inProgress = leads.filter(lead => ['Contacted', 'Interested', 'Follow-up', 'Qualified', 'Proposal Sent', 'Negotiating'].includes(lead.status)).length;
        const closed = leads.filter(lead => ['Sales Done', 'DNP'].includes(lead.status)).length;
        res.status(200).json({
            success: true,
            message: 'My leads stats retrieved successfully',
            data: { total, newLeads, inProgress, closed }
        });
    }
    catch (error) {
        console.error('Get my leads stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve your leads stats',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getMyLeadsStats = getMyLeadsStats;
const getFolderCounts = async (req, res) => {
    try {
        const baseFilter = {};
        if (req.user?.role !== 'admin') {
            baseFilter.assignedTo = req.user?.userId;
        }
        const folderCounts = await Lead_1.default.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $or: [{ $eq: ['$folder', ''] }, { $eq: ['$folder', null] }, { $not: ['$folder'] }] },
                            'Uncategorized',
                            '$folder'
                        ]
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);
        const folderStats = {};
        folderCounts.forEach(item => {
            folderStats[item._id] = item.count;
        });
        res.status(200).json({
            success: true,
            message: 'Folder counts retrieved successfully',
            data: folderStats
        });
    }
    catch (error) {
        console.error('Get folder counts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve folder counts',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getFolderCounts = getFolderCounts;
const importLeadsFromGoogleSheet = async (req, res) => {
    try {
        const { sheetUrl } = req.body;
        const result = await (0, lead_service_1.importLeadsFromGoogleSheetService)(sheetUrl);
        return res.status(200).json({
            success: true,
            message: 'Google Sheet processed successfully',
            ...result,
            note: 'Duplicate leads moved to duplicate collection'
        });
    }
    catch (error) {
        return (0, sendError_1.sendError)(res, error);
    }
};
exports.importLeadsFromGoogleSheet = importLeadsFromGoogleSheet;
//# sourceMappingURL=leadController.js.map