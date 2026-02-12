import mongoose from 'mongoose';
import { Attendance, IAttendance } from '../models/attendance.model';
import User from '../models/User';

// Configuration - Move these to your .env or a Settings model later
const COMPANY_LOCATION = {
  lat: 28.601220960871636, // Replace with your company latitude
  lng: 77.43365336008797 // Replace with your company longitude
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
   * /**
   * Process Clock-Out with Geofencing and WFH Bypass
   */
  clockOut: async (userId: string, lat: number, lng: number): Promise<IAttendance> => {
    // 1. Fetch user to check WFH permissions
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // 2. Geofencing check: Only enforce if WFH is NOT allowed
    if (!user.canWorkFromHome) {
      // Use your existing calculateDistance logic
      const distance = AttendanceService.calculateDistance(
        lat, lng, 
        COMPANY_LOCATION.lat, COMPANY_LOCATION.lng
      );

      // Enforce the 200m office radius
      if (distance > ALLOWED_RADIUS_METERS) {
        throw new Error(`Location restricted. You must be at the office to clock out. You are ${Math.round(distance)}m away.`);
      }
    }

    const today = new Date().toISOString().split('T')[0];

    // 3. Find the active session for today (where checkOut is null)
    const record = await Attendance.findOne({ 
      user: userId, 
      date: today, 
      checkOut: null 
    });

    if (!record) {
      throw new Error('No active clock-in session found for today.');
    }

    // 4. Update the record with current time
    record.checkOut = new Date();
    
    // 5. Calculate total hours worked
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
  },
  generateAdminReport: async (from: string, to: string, page: number, limit: number, period?: string) => {
    const todayStr = new Date().toLocaleDateString('en-CA'); 
    let query: any = {};

    if (period === 'today') {
        query.date = todayStr;
    } else if (from && to) {
        query.date = { $gte: String(from).trim(), $lte: String(to).trim() };
    }

    const records = await Attendance.find(query)
        .populate('user', 'name email')
        .sort({ date: -1, checkIn: 1 })
        .lean();

    const dateGroups: any = {};
    // Map to store: { total: number, autoLogout: number }
    const userStats: Map<string, { total: number, auto: number }> = new Map();

    records.forEach((r: any) => {
        const uId = r.user?._id?.toString() || 'unknown';
        const uName = r.user?.name || 'Unknown User';
        const rDate = r.date;
        
        let co = r.checkOut;
        let wh = Number(r.workHours) || 0;
        let isAutoLogout = false;

        // --- 🚀 AUTO-LOGOUT LOGIC ---
        if (!co && rDate < todayStr) {
            wh = 8.0; 
            co = "Auto-Closed (8h)";
            isAutoLogout = true;
        }

        // --- 1. GROUP BY DATE (Daily View) ---
        if (!dateGroups[rDate]) dateGroups[rDate] = {};
        if (!dateGroups[rDate][uId]) {
            dateGroups[rDate][uId] = {
                userName: uName,
                userEmail: r.user?.email || 'N/A',
                date: rDate,
                totalWorkHours: 0,
                lastCheckOut: co || "Active",
                sessions: []
            };
        }

        const userDay = dateGroups[rDate][uId];
        userDay.totalWorkHours = Number((userDay.totalWorkHours + wh).toFixed(2));
        userDay.lastCheckOut = co || "Active";
        userDay.sessions.push({
            checkIn: r.checkIn,
            checkOut: co || "Active",
            hours: wh,
            isAutoClosed: isAutoLogout
        });

        // --- 2. SUM TO GRAND TOTALS ---
        const stats = userStats.get(uId) || { total: 0, auto: 0 };
        stats.total = Number((stats.total + wh).toFixed(2));
        if (isAutoLogout) {
            stats.auto = Number((stats.auto + 8.0).toFixed(2));
        }
        userStats.set(uId, stats);
    });

    // --- PAGINATION ON DATES ---
    const allSortedDates = Object.keys(dateGroups).sort().reverse();
    const startIndex = (page - 1) * limit;
    const paginatedDates = allSortedDates.slice(startIndex, startIndex + limit);

    const paginatedReport: any = {};
    paginatedDates.forEach(date => {
        paginatedReport[date] = Object.values(dateGroups[date]);
    });

    // --- PREPARE SUMMARY WITH AUTO-LOGOUT HOURS ---
// --- PREPARE SUMMARY WITH AUTO-LOGOUT HOURS ---
const summary = Array.from(userStats.keys()).map(id => {
    const sample = records.find(rec => (rec.user?._id?.toString() || rec.user?.toString()) === id);
    const stats = userStats.get(id);
    
    // 🚀 FIX: Type cast 'sample.user' as 'any' to access '.name' without errors
    const userObj = sample?.user as any; 

    return {
        userName: userObj?.name || 'Unknown',
        totalHoursInRange: stats?.total || 0,
        autoLogoutHours: stats?.auto || 0
    };
}).sort((a, b) => b.totalHoursInRange - a.totalHoursInRange);

    return {
        report: paginatedReport,
        userGrandTotals: summary,
        pagination: {
            totalDates: allSortedDates.length,
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(allSortedDates.length / limit)
        }
    };
}
}