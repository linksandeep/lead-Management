"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Status_1 = __importDefault(require("../models/Status"));
const database_1 = __importDefault(require("../utils/database"));
dotenv_1.default.config();
const defaultStatuses = [
    { name: 'New', isDefault: true, order: 0 },
    { name: 'Contacted', isDefault: true, order: 1 },
    { name: 'Follow-up', isDefault: true, order: 2 },
    { name: 'Interested', isDefault: true, order: 3 },
    { name: 'Qualified', isDefault: true, order: 4 },
    { name: 'Proposal Sent', isDefault: true, order: 5 },
    { name: 'Negotiating', isDefault: true, order: 6 },
    { name: 'Sales Done', isDefault: true, order: 7 },
    { name: 'DNP', isDefault: true, order: 8 },
    { name: 'Not Interested', isDefault: true, order: 9 },
    { name: 'Wrong Number', isDefault: true, order: 10 }
];
async function seedStatuses() {
    try {
        await (0, database_1.default)();
        console.log('Connected to MongoDB');
        const existingStatuses = await Status_1.default.countDocuments();
        if (existingStatuses > 0) {
            console.log(`Statuses already exist (${existingStatuses} found). Skipping seed.`);
            await mongoose_1.default.connection.close();
            process.exit(0);
        }
        await Status_1.default.insertMany(defaultStatuses);
        console.log(`Successfully seeded ${defaultStatuses.length} default statuses`);
        await mongoose_1.default.connection.close();
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding statuses:', error);
        await mongoose_1.default.connection.close();
        process.exit(1);
    }
}
seedStatuses();
//# sourceMappingURL=seedStatuses.js.map