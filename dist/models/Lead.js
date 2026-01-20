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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const leadNoteSchema = new mongoose_1.Schema({
    id: {
        type: String,
        default: () => new mongoose_1.default.Types.ObjectId().toString()
    },
    content: {
        type: String,
        required: [true, 'Note content is required'],
        trim: true,
        maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });
const leadSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            'Please enter a valid email address'
        ]
    },
    phone: {
        type: String,
        required: [true, 'Phone is required'],
        trim: true,
        match: [
            /^[\+]?[\d\s\-\(\)\.]{7,25}$/,
            'Please enter a valid phone number'
        ]
    },
    position: {
        type: String,
        trim: true,
        maxlength: [100, 'Position cannot exceed 100 characters']
    },
    folder: {
        type: String,
        trim: true,
        maxlength: [100, 'Folder name cannot exceed 100 characters'],
        default: ''
    },
    source: {
        type: String,
        enum: ['Website', 'Social Media', 'Referral', 'Import', 'Manual', 'Cold Call', 'Email Campaign'],
        required: [true, 'Source is required'],
        default: 'Manual'
    },
    status: {
        type: String,
        default: 'New',
        required: true,
        trim: true,
        maxlength: [50, 'Status cannot exceed 50 characters']
    },
    priority: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        default: 'Medium',
        required: true
    },
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: [leadNoteSchema],
    leadScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 50
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ folder: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ updatedAt: -1 });
leadSchema.index({ createdAt: 1 });
leadSchema.index({ status: 1, assignedTo: 1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ priority: 1, status: 1 });
leadSchema.index({ folder: 1, status: 1 });
leadSchema.index({ folder: 1, assignedTo: 1 });
leadSchema.index({
    name: 'text',
    email: 'text',
    phone: 'text',
    position: 'text',
    folder: 'text'
});
leadSchema.virtual('assignedToUser', {
    ref: 'User',
    localField: 'assignedTo',
    foreignField: '_id',
    justOne: true
});
leadSchema.virtual('assignedByUser', {
    ref: 'User',
    localField: 'assignedBy',
    foreignField: '_id',
    justOne: true
});
leadSchema.methods.getNotesWithUsers = async function () {
    await this.populate('notes.createdBy', 'name email role');
    return this.notes.map((note) => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        createdBy: {
            id: note.createdBy._id,
            name: note.createdBy.name,
            email: note.createdBy.email,
            role: note.createdBy.role
        }
    }));
};
leadSchema.statics.getLeadStats = async function (userId) {
    const baseMatch = userId ? { assignedTo: userId } : {};
    const [totalLeads, newLeads, contactedLeads, qualifiedLeads, salesDone, dnpLeads, leadsThisMonth, leadsByStatus, leadsBySource, leadsByFolder] = await Promise.all([
        this.countDocuments(baseMatch),
        this.countDocuments({ ...baseMatch, status: 'New' }),
        this.countDocuments({ ...baseMatch, status: 'Contacted' }),
        this.countDocuments({ ...baseMatch, status: 'Qualified' }),
        this.countDocuments({ ...baseMatch, status: 'Sales Done' }),
        this.countDocuments({ ...baseMatch, status: 'DNP' }),
        this.countDocuments({
            ...baseMatch,
            createdAt: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
        }),
        this.aggregate([
            { $match: baseMatch },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        this.aggregate([
            { $match: baseMatch },
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        this.aggregate([
            { $match: { ...baseMatch, folder: { $ne: '' } } },
            { $group: { _id: '$folder', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ])
    ]);
    const conversionRate = totalLeads > 0 ? (salesDone / totalLeads) * 100 : 0;
    return {
        totalLeads,
        newLeads,
        contactedLeads,
        qualifiedLeads,
        salesDone,
        dnpLeads,
        conversionRate,
        leadsThisMonth,
        leadsByStatus: leadsByStatus.map(item => ({
            status: item._id,
            count: item.count,
            percentage: totalLeads > 0 ? (item.count / totalLeads) * 100 : 0
        })),
        leadsBySource: leadsBySource.map(item => ({
            source: item._id,
            count: item.count,
            percentage: totalLeads > 0 ? (item.count / totalLeads) * 100 : 0
        })),
        leadsByFolder: leadsByFolder.map(item => ({
            folder: item._id,
            count: item.count,
            percentage: totalLeads > 0 ? (item.count / totalLeads) * 100 : 0
        }))
    };
};
leadSchema.statics.getTopPerformers = async function () {
    return this.aggregate([
        {
            $match: {
                assignedTo: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: '$assignedTo',
                leadsAssigned: { $sum: 1 },
                leadsConverted: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'Sales Done'] }, 1, 0]
                    }
                }
            }
        },
        {
            $addFields: {
                conversionRate: {
                    $cond: [
                        { $gt: ['$leadsAssigned', 0] },
                        { $multiply: [{ $divide: ['$leadsConverted', '$leadsAssigned'] }, 100] },
                        0
                    ]
                }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: '$user'
        },
        {
            $project: {
                userId: '$_id',
                userName: '$user.name',
                leadsAssigned: 1,
                leadsConverted: 1,
                conversionRate: { $round: ['$conversionRate', 1] }
            }
        },
        {
            $sort: { conversionRate: -1, leadsConverted: -1 }
        },
        {
            $limit: 5
        }
    ]);
};
leadSchema.methods.addNote = function (content, createdBy) {
    this.notes.push({
        id: new mongoose_1.default.Types.ObjectId().toString(),
        content,
        createdBy,
        createdAt: new Date()
    });
    return this.save();
};
leadSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        const scoreMap = {
            'New': 20,
            'Contacted': 30,
            'Interested': 50,
            'Not Interested': 10,
            'Follow-up': 40,
            'Qualified': 70,
            'Proposal Sent': 80,
            'Negotiating': 90,
            'Sales Done': 100,
            'DNP': 5,
            'Wrong Number': 0
        };
        this.leadScore = scoreMap[this.status] || 50;
    }
    next();
});
leadSchema.index({ email: 1 }, { unique: true });
leadSchema.index({ phone: 1 }, { unique: true });
leadSchema.statics.findDuplicates = async function (email, phone, excludeId) {
    const query = {
        $or: [
            { email: email.toLowerCase().trim() },
            { phone: phone.trim() }
        ]
    };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    return this.find(query);
};
leadSchema.statics.getDuplicateError = function (error) {
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        const value = error.keyValue[field];
        if (field === 'email') {
            return `A lead with email "${value}" already exists`;
        }
        else if (field === 'phone') {
            return `A lead with phone number "${value}" already exists`;
        }
        return 'A lead with this information already exists';
    }
    return null;
};
const Lead = mongoose_1.default.model('Lead', leadSchema);
exports.default = Lead;
//# sourceMappingURL=Lead.js.map