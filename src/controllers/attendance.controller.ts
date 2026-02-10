import { Request, Response } from 'express';
import { AttendanceService } from '../service/attendance.service';
import { sendError } from '../utils/sendError';
import { Attendance } from '../models/attendance.model';

/**
 * Handle User Clock-In
 * Validates location and creates an attendance record
 */
/**
 * Handle User Clock-In
 */
export const clockIn = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lat, lng } = req.body;
      const userId = req.user?.userId;
  
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
  
      if (lat === undefined || lng === undefined) {
        res.status(400).json({
          success: false,
          message: 'Location data is required'
        });
        return;
      }
  
      const data = await AttendanceService.clockIn(userId.toString(), lat, lng);
  
      res.status(201).json({
        success: true,
        message: 'Clocked in successfully',
        data
      });
    } catch (error: any) {
      console.error('Clock-in error:', error);
      sendError(res, error, 400);
    }
  };
  
  /**
   * Handle User Clock-Out
   */
  export const clockOut = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
  
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
  
      const data = await AttendanceService.clockOut(userId.toString());
  
      res.status(200).json({
        success: true,
        message: 'Clocked out successfully',
        data
      });
    } catch (error: any) {
      console.error('Clock-out error:', error);
      sendError(res, error, 400);
    }
  };
  
  /**
   * Get Current Status for UI State & Lockdown
   */
  export const getAttendanceStatus = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const todayStr = new Date().toISOString().split('T')[0];
  
      // Check for today's active record (source of truth)
      const activeSession = await Attendance.findOne({
        user: userId,
        date: todayStr,
        checkOut: null 
      });
  
      res.status(200).json({
        success: true,
        data: {
          isClockedIn: !!activeSession, 
          checkInTime: activeSession ? activeSession.checkIn : null
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error checking status" });
    }
  };

/**
 * Get Attendance History for a user
 * Supports pagination similar to your getLeads method
 */
export const getMyAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);

    const { records, total } = await AttendanceService.getAttendanceHistory(
      userId!.toString(),
      page,
      limit
    );

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: 'Attendance records retrieved successfully',
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    sendError(res, error, 500);
  }
};

/**
 * Get Monthly Report for Salary Slip
 * Aggregates total hours worked in a month
 */
export const getMonthlyReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query; // e.g., ?month=02&year=2026
    const userId = req.user?.userId;

    if (!month || !year) {
      res.status(400).json({ success: false, message: 'Month and Year are required' });
      return;
    }

    const stats = await AttendanceService.calculateMonthlyStats(
      userId!.toString(),
      Number(month),
      Number(year)
    );

    res.status(200).json({
      success: true,
      message: 'Monthly attendance stats retrieved',
      data: stats
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};

export const getWorkHours = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      // Get period from query, default to 'today'
      const period = (req.query.period as 'today' | 'monthly' | 'yearly') || 'today';
  
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
  
      const stats = await AttendanceService.getWorkHoursStats(userId.toString(), period);
  
      res.status(200).json({
        success: true,
        message: `Work hours for ${period} retrieved`,
        data: {
          period,
          totalHours: stats.totalHours,
          daysCount: stats.count
        }
      });
    } catch (error) {
      sendError(res, error, 500);
    }
  };

//   export const getAttendanceStatus = async (req: Request, res: Response) => {
//     try {
//       const userId = req.user?.userId;
//       // Use the YYYY-MM-DD string format to match your Service logic
//       const todayStr = new Date().toISOString().split('T')[0];
  
//       // Look for a record today where checkOut is strictly NULL
//       const activeSession = await Attendance.findOne({
//         user: userId,
//         date: todayStr,
//         checkOut: null // Matches the updated Model default
//       });
  
//       res.status(200).json({
//         success: true,
//         data: {
//           isClockedIn: !!activeSession, 
//           checkInTime: activeSession ? activeSession.checkIn : null
//         }
//       });
//     } catch (error) {
//       res.status(500).json({ success: false, message: "Error checking status" });
//     }
//   };