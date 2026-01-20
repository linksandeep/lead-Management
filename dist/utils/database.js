"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            bufferCommands: false,
        };
        await mongoose_1.default.connect(mongoUri, options);
        console.log('🚀 Connected to MongoDB successfully');
        mongoose_1.default.connection.on('connected', () => {
            console.log('📡 Mongoose connected to MongoDB');
        });
        mongoose_1.default.connection.on('error', (err) => {
            console.error('❌ Mongoose connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('📴 Mongoose disconnected from MongoDB');
        });
        process.on('SIGINT', async () => {
            try {
                await mongoose_1.default.connection.close();
                console.log('📴 MongoDB connection closed through app termination');
                process.exit(0);
            }
            catch (error) {
                console.error('❌ Error closing MongoDB connection:', error);
                process.exit(1);
            }
        });
    }
    catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    try {
        await mongoose_1.default.connection.close();
        console.log('📴 Disconnected from MongoDB');
    }
    catch (error) {
        console.error('❌ Error disconnecting from MongoDB:', error);
        throw error;
    }
};
exports.disconnectDatabase = disconnectDatabase;
exports.default = exports.connectDatabase;
//# sourceMappingURL=database.js.map