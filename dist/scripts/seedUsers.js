"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("../utils/database");
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
const seedUsers = async () => {
    try {
        console.log('🌱 Starting user seeding...');
        await (0, database_1.connectDatabase)();
        console.log('🗑️  Clearing existing users...');
        await User_1.default.deleteMany({});
        const adminUser = new User_1.default({
            name: 'Admin User',
            email: 'admin@leadmanager.com',
            password: 'admin123456',
            role: 'admin'
        });
        await adminUser.save();
        console.log('✅ Admin user created:', adminUser.email);
        const regularUser = new User_1.default({
            name: 'Regular User',
            email: 'user@leadmanager.com',
            password: 'user123456',
            role: 'user'
        });
        await regularUser.save();
        console.log('✅ Regular user created:', regularUser.email);
        console.log('\n🎉 User seeding completed successfully!');
        console.log('\n📝 Demo Credentials:');
        console.log('Admin: admin@leadmanager.com / admin123456');
        console.log('User:  user@leadmanager.com / user123456');
        const systemUser = await User_1.default.findOne({ email: 'system@leadmanager.com' });
        if (!systemUser) {
            const systemUserData = {
                name: 'System Import',
                email: 'system@leadmanager.com',
                password: 'systemPassword123!',
                role: 'admin',
                isActive: true
            };
            const newSystemUser = new User_1.default(systemUserData);
            await newSystemUser.save();
            console.log('✅ System user created for import operations');
        }
        else {
            console.log('✅ System user already exists');
        }
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding users:', error);
        process.exit(1);
    }
    finally {
        await (0, database_1.disconnectDatabase)();
        process.exit(0);
    }
};
seedUsers();
//# sourceMappingURL=seedUsers.js.map