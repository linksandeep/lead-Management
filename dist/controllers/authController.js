"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dangerReset = exports.logout = exports.changePassword = exports.updateProfile = exports.getMe = exports.register = exports.login = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email and password are required',
                errors: ['Please provide both email and password']
            });
            return;
        }
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                errors: ['Email or password is incorrect']
            });
            return;
        }
        if (!user.isActive) {
            res.status(401).json({
                success: false,
                message: 'Account is deactivated',
                errors: ['Please contact administrator to activate your account']
            });
            return;
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                errors: ['Email or password is incorrect']
            });
            return;
        }
        user.lastLogin = new Date();
        await user.save();
        const token = (0, auth_1.generateToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });
        const userResponse = user.toJSON();
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: userResponse,
                token
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.login = login;
const register = async (req, res) => {
    try {
        const { name, email, password, role = 'user' } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({
                success: false,
                message: 'All fields are required',
                errors: ['Please provide name, email, and password']
            });
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                success: false,
                message: 'Invalid email format',
                errors: ['Please provide a valid email address']
            });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({
                success: false,
                message: 'Password too weak',
                errors: ['Password must be at least 6 characters long']
            });
            return;
        }
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: 'User already exists',
                errors: ['An account with this email already exists']
            });
            return;
        }
        const user = new User_1.default({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            role
        });
        await user.save();
        const token = (0, auth_1.generateToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        });
        const userResponse = user.toJSON();
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: userResponse,
                token
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        if (error instanceof Error && error.message.includes('E11000')) {
            res.status(400).json({
                success: false,
                message: 'User already exists',
                errors: ['An account with this email already exists']
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.register = register;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const user = await User_1.default.findById(req.user.userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'User profile retrieved successfully',
            data: user
        });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve user profile',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const { name } = req.body;
        if (!name || name.trim().length < 2) {
            res.status(400).json({
                success: false,
                message: 'Invalid name',
                errors: ['Name must be at least 2 characters long']
            });
            return;
        }
        const user = await User_1.default.findById(req.user.userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        user.name = name.trim();
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({
                success: false,
                message: 'All fields are required',
                errors: ['Please provide current and new password']
            });
            return;
        }
        if (newPassword.length < 6) {
            res.status(400).json({
                success: false,
                message: 'Password too weak',
                errors: ['New password must be at least 6 characters long']
            });
            return;
        }
        const user = await User_1.default.findById(req.user.userId).select('+password');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            res.status(400).json({
                success: false,
                message: 'Invalid current password',
                errors: ['Current password is incorrect']
            });
            return;
        }
        user.password = newPassword;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.changePassword = changePassword;
const logout = async (_req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.logout = logout;
const dangerReset = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
            return;
        }
        const currentUserId = req.user.userId;
        const currentUserEmail = req.user.email;
        const currentUser = await User_1.default.findById(currentUserId);
        const systemUser = await User_1.default.findOne({ email: 'system@leadmanager.com' });
        if (!currentUser) {
            res.status(404).json({
                success: false,
                message: 'Current user not found'
            });
            return;
        }
        const Lead = mongoose_1.default.model('Lead');
        await Lead.deleteMany({});
        console.log('✅ All leads deleted');
        const usersToKeep = [currentUserId];
        if (systemUser) {
            usersToKeep.push(systemUser._id.toString());
        }
        const deleteResult = await User_1.default.deleteMany({
            _id: { $nin: usersToKeep }
        });
        console.log(`✅ ${deleteResult.deletedCount} users deleted (kept current user: ${currentUserEmail})`);
        res.status(200).json({
            success: true,
            message: `System reset completed successfully. Deleted all leads and ${deleteResult.deletedCount} users (kept current user).`,
            data: {
                leadsDeleted: 'all',
                usersDeleted: deleteResult.deletedCount,
                usersKept: usersToKeep.length
            }
        });
    }
    catch (error) {
        console.error('Danger reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform danger reset',
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        });
    }
};
exports.dangerReset = dangerReset;
//# sourceMappingURL=authController.js.map