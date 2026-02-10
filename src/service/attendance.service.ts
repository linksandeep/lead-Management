import mongoose from 'mongoose';
import { Attendance, IAttendance } from '../models/attendance.model';
import User from '../models/User';

// Configuration - Move these to your .env or a Settings model later
const COMPANY_LOCATION = {
  lat: 228.601220960871636, // Replace with your company latitude
  lng: 277.43365336008797 // Replace with your company longitude
};
const ALLOWED_RADIUS_METERS = 200; 

export const AttendanceService = {
  /**
   * Calculate distance between two points using Haversine Formula
   */
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Process Clock-In with Geofencing
   */
/**
   * Process Clock-In with Geofencing and Null Initialization
   */
// src/service/attendance.service.ts

  /**
   * Process Clock-In with Geofencing Bypass for WFH
   */
  clockIn: async (userId: string, lat: number, lng: number): Promise<IAttendance> => {
    // 1. Fetch the user's specific permissions
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // 2. Check Geofencing: Only calculate distance if WFH is NOT allowed
    if (!user.canWorkFromHome) {
      const distance = AttendanceService.calculateDistance(
        lat, lng, 
        COMPANY_LOCATION.lat, COMPANY_LOCATION.lng
      );

      // Enforce the ALLOWED_RADIUS_METERS (200m) limit
      if (distance > ALLOWED_RADIUS_METERS) {
        throw new Error(`Location restricted. You are ${Math.round(distance)}m away from the office.`);
      }
    } else {
      console.log(`Bypassing geofence for user: ${user.name} (WFH Active)`);
    }

    // 3. Prevent double Clock-In for the same day
    const today = new Date().toISOString().split('T')[0];
    const existingActive = await Attendance.findOne({ 
      user: userId, 
      date: today, 
      checkOut: null 
    });
    
    if (existingActive) {
      throw new Error('You are already clocked in.');
    }

    // 4. Create the attendance record
    const attendance = new Attendance({
      user: new mongoose.Types.ObjectId(userId),
      date: today,
      checkIn: new Date(),
      checkOut: null, // Critical for requireClockIn middleware
      location: { lat, lng },
      status: 'Present'
    });

    return await attendance.save();
  },

  /**
   * Process Clock-Out and Finalize Hours
   */
  clockOut: async (userId: string): Promise<IAttendance> => {
    const today = new Date().toISOString().split('T')[0];

    // Find the record where checkOut is null (active session)
    const record = await Attendance.findOne({ 
      user: userId, 
      date: today, 
      checkOut: null 
    });

    if (!record) {
      throw new Error('No active clock-in session found for today.');
    }

    record.checkOut = new Date();
    
    // Calculate total hours worked
    const diffInMs = record.checkOut.getTime() - record.checkIn.getTime();
    const hours = diffInMs / (1000 * 60 * 60);
    record.workHours = parseFloat(hours.toFixed(2));

    return await record.save();
  },

  /**
   * Get Paginated History
   */
  getAttendanceHistory: async (userId: string, page: number, limit: number) => {
    const skip = (page - 1) * limit;
    
    const [records, total] = await Promise.all([
      Attendance.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments({ user: userId })
    ]);

    return { records, total };
  },

  /**
   * Aggregate Data for Salary Slip
   */
  calculateMonthlyStats: async (userId: string, month: number, year: number) => {
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-31`;

    const stats = await Attendance.aggregate([
      { 
        $match: { 
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: startOfMonth, $lte: endOfMonth }
        } 
      },
      {
        $group: {
          _id: "$user",
          totalDays: { $sum: 1 },
          totalHours: { $sum: "$workHours" },
          averageHours: { $avg: "$workHours" }
        }
      }
    ]);

    return stats[0] || { totalDays: 0, totalHours: 0, averageHours: 0 };
  },

  getWorkHoursStats: async (userId: string, period: 'today' | 'monthly' | 'yearly') => {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    let startDate: Date;

    // Define the time range using native JS Dates
    if (period === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0); // Start of today
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
    } else {
      startDate = new Date(now.getFullYear(), 0, 1); // 1st of current year
    }

    const stats = await Attendance.aggregate([
      {
        $match: {
          user: userObjectId,
          // Match records where checkIn is between startDate and now
          checkIn: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: "$workHours" },
          count: { $sum: 1 } // Number of days worked in this period
        }
      }
    ]);

    // Return the aggregated data or default zeros if no records found
    return stats[0] || { totalHours: 0, count: 0 };
  }
};