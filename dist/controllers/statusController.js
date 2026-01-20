"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatusOrder = exports.deleteStatus = exports.createStatus = exports.getStatuses = void 0;
const Status_1 = __importDefault(require("../models/Status"));
const Lead_1 = __importDefault(require("../models/Lead"));
const getStatuses = async (_req, res) => {
    try {
        const statuses = await Status_1.default.find().sort({ order: 1, createdAt: 1 });
        res.json({
            success: true,
            data: statuses
        });
    }
    catch (error) {
        console.error('Error fetching statuses:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statuses',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getStatuses = getStatuses;
const createStatus = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({
                success: false,
                message: 'Status name is required'
            });
            return;
        }
        const existingStatus = await Status_1.default.findOne({ name: name.trim() });
        if (existingStatus) {
            res.status(400).json({
                success: false,
                message: 'Status already exists'
            });
            return;
        }
        const highestOrder = await Status_1.default.findOne().sort({ order: -1 }).select('order');
        const newOrder = highestOrder ? highestOrder.order + 1 : 0;
        const status = await Status_1.default.create({
            name: name.trim(),
            isDefault: false,
            order: newOrder
        });
        res.status(201).json({
            success: true,
            message: 'Status created successfully',
            data: status
        });
    }
    catch (error) {
        console.error('Error creating status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createStatus = createStatus;
const deleteStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const status = await Status_1.default.findById(id);
        if (!status) {
            res.status(404).json({
                success: false,
                message: 'Status not found'
            });
            return;
        }
        if (status.isDefault) {
            res.status(400).json({
                success: false,
                message: 'Cannot delete default status'
            });
            return;
        }
        const leadsCount = await Lead_1.default.countDocuments({ status: status.name });
        if (leadsCount > 0) {
            res.status(400).json({
                success: false,
                message: `Cannot delete status. ${leadsCount} lead(s) are using this status. Please reassign them first.`
            });
            return;
        }
        await Status_1.default.findByIdAndDelete(id);
        res.json({
            success: true,
            message: 'Status deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteStatus = deleteStatus;
const updateStatusOrder = async (req, res) => {
    try {
        const { statuses } = req.body;
        if (!Array.isArray(statuses)) {
            res.status(400).json({
                success: false,
                message: 'Invalid input: statuses must be an array'
            });
            return;
        }
        const updatePromises = statuses.map(({ id, order }) => Status_1.default.findByIdAndUpdate(id, { order }, { new: true }));
        await Promise.all(updatePromises);
        res.json({
            success: true,
            message: 'Status order updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating status order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status order',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateStatusOrder = updateStatusOrder;
//# sourceMappingURL=statusController.js.map