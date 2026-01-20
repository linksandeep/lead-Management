"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeadMetrics = exports.getRecentActivity = exports.getLeadsBySource = exports.getLeadsByStatus = exports.getAdminDashboardStats = exports.getDashboardStats = void 0;
const Lead_1 = __importDefault(require("../models/Lead"));
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }
        const stats = await Lead_1.default.getLeadStats(userId);
        const averageResponseTime = 0;
        const leadsGrowth = 0;
        const dashboardStats = {
            ...stats,
            averageResponseTime,
            leadsGrowth,
            topPerformers: [],
            lastUpdated: new Date().toISOString()
        };
        res.status(200).json({
            success: true,
            message: 'Dashboard statistics retrieved successfully',
            data: dashboardStats
        });
    }
    catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve dashboard statistics',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getDashboardStats = getDashboardStats;
const getAdminDashboardStats = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
            return;
        }
        const leadStats = await Lead_1.default.getLeadStats();
        const topPerformers = await Lead_1.default.getTopPerformers();
        const currentDate = new Date();
        const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const [thisMonthLeads, lastMonthLeads] = await Promise.all([
            Lead_1.default.countDocuments({
                createdAt: { $gte: thisMonth }
            }),
            Lead_1.default.countDocuments({
                createdAt: {
                    $gte: lastMonth,
                    $lt: thisMonth
                }
            })
        ]);
        const leadsGrowth = lastMonthLeads > 0
            ? ((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100
            : thisMonthLeads > 0 ? 100 : 0;
        const averageResponseTime = 24;
        const dashboardStats = {
            ...leadStats,
            averageResponseTime,
            leadsGrowth,
            topPerformers,
            lastUpdated: new Date().toISOString()
        };
        res.status(200).json({
            success: true,
            message: 'Admin dashboard statistics retrieved successfully',
            data: dashboardStats
        });
    }
    catch (error) {
        console.error('Get admin dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve admin dashboard statistics',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getAdminDashboardStats = getAdminDashboardStats;
const getLeadsByStatus = async (req, res) => {
    try {
        const baseMatch = req.user?.role === 'admin' ? {} : { assignedTo: req.user?.userId };
        const leadsByStatus = await Lead_1.default.aggregate([
            { $match: baseMatch },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const total = leadsByStatus.reduce((sum, item) => sum + item.count, 0);
        const result = leadsByStatus.map(item => ({
            status: item._id,
            count: item.count,
            percentage: total > 0 ? (item.count / total) * 100 : 0
        }));
        res.status(200).json({
            success: true,
            message: 'Leads by status retrieved successfully',
            data: result
        });
    }
    catch (error) {
        console.error('Get leads by status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve leads by status',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getLeadsByStatus = getLeadsByStatus;
const getLeadsBySource = async (req, res) => {
    try {
        const baseMatch = req.user?.role === 'admin' ? {} : { assignedTo: req.user?.userId };
        const leadsBySource = await Lead_1.default.aggregate([
            { $match: baseMatch },
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const total = leadsBySource.reduce((sum, item) => sum + item.count, 0);
        const result = leadsBySource.map(item => ({
            source: item._id,
            count: item.count,
            percentage: total > 0 ? (item.count / total) * 100 : 0
        }));
        res.status(200).json({
            success: true,
            message: 'Leads by source retrieved successfully',
            data: result
        });
    }
    catch (error) {
        console.error('Get leads by source error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve leads by source',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getLeadsBySource = getLeadsBySource;
const getRecentActivity = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const limitNum = parseInt(limit, 10);
        const baseMatch = req.user?.role === 'admin' ? {} : { assignedTo: typeof req.user?.userId === 'string' ? new (require('mongoose')).Types.ObjectId(req.user.userId) : req.user?.userId };
        const recentLeads = await Lead_1.default.find(baseMatch)
            .populate('assignedTo', 'name email')
            .populate('assignedByUser', 'name email')
            .sort({ updatedAt: -1 })
            .limit(limitNum)
            .select('name status updatedAt assignedTo assignedByUser')
            .lean();
        const activities = recentLeads.map(lead => ({
            type: 'lead_update',
            description: `Lead "${lead.name}" status updated to ${lead.status}`,
            timestamp: lead.updatedAt,
            user: typeof lead.assignedTo === 'object' && lead.assignedTo && 'name' in lead.assignedTo
                ? lead.assignedTo.name
                : 'System'
        }));
        res.status(200).json({
            success: true,
            message: 'Recent activity retrieved successfully',
            data: activities
        });
    }
    catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve recent activity',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getRecentActivity = getRecentActivity;
const getLeadMetrics = async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        let dateFilter = {};
        const now = new Date();
        switch (period) {
            case '7d':
                dateFilter = {
                    createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
                };
                break;
            case '30d':
                dateFilter = {
                    createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
                };
                break;
            case '90d':
                dateFilter = {
                    createdAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
                };
                break;
            default:
                break;
        }
        const baseMatch = req.user?.role === 'admin' ? dateFilter : {
            ...dateFilter,
            assignedTo: req.user?.userId
        };
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [metrics, leadsThisWeek, leadsThisMonth] = await Promise.all([
            Lead_1.default.aggregate([
                { $match: baseMatch },
                {
                    $group: {
                        _id: null,
                        totalLeads: { $sum: 1 },
                        newLeads: {
                            $sum: { $cond: [{ $eq: ['$status', 'New'] }, 1, 0] }
                        },
                        contactedLeads: {
                            $sum: { $cond: [{ $eq: ['$status', 'Contacted'] }, 1, 0] }
                        },
                        qualifiedLeads: {
                            $sum: { $cond: [{ $eq: ['$status', 'Qualified'] }, 1, 0] }
                        },
                        salesDone: {
                            $sum: { $cond: [{ $eq: ['$status', 'Sales Done'] }, 1, 0] }
                        },
                        dnpLeads: {
                            $sum: { $cond: [{ $eq: ['$status', 'DNP'] }, 1, 0] }
                        },
                        avgLeadScore: { $avg: '$leadScore' }
                    }
                }
            ]),
            Lead_1.default.countDocuments({ ...baseMatch, createdAt: { $gte: startOfWeek } }),
            Lead_1.default.countDocuments({ ...baseMatch, createdAt: { $gte: startOfMonth } })
        ]);
        const result = metrics.length > 0 ? metrics[0] : {
            totalLeads: 0,
            newLeads: 0,
            contactedLeads: 0,
            qualifiedLeads: 0,
            salesDone: 0,
            dnpLeads: 0,
            avgLeadScore: 0
        };
        result.conversionRate = result.totalLeads > 0
            ? (result.salesDone / result.totalLeads) * 100
            : 0;
        res.status(200).json({
            success: true,
            message: 'Lead metrics retrieved successfully',
            data: {
                ...result,
                leadsThisWeek,
                leadsThisMonth,
                leadWon: result.closedWon
            }
        });
    }
    catch (error) {
        console.error('Get lead metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve lead metrics',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getLeadMetrics = getLeadMetrics;
//# sourceMappingURL=dashboardController.js.map