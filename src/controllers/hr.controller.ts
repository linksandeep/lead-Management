import { Request, Response } from 'express';
import { HRService } from '../service/hr.service';
import { sendError } from '../utils/sendError';

/**
 * Employees apply for their own leave.
 */
export const applyLeave = async (req: Request, res: Response) => {
    try {
      // RBAC: Take the ID from the token/session, not the request body
      const leaveData = {
        ...req.body,
        user: req.user?.userId // This ensures the 'user' path is populated
      };
  
      if (!leaveData.user) {
        const error: any = new Error("Authentication required: No user ID found.");
        error.statusCode = 401;
        throw error;
      }
  
      const leave = await HRService.applyLeave(leaveData); //
      return res.status(201).json({ 
        success: true, 
        message: 'Leave application submitted successfully',
        data: leave 
      });
    } catch (error: any) {
      return sendError(res, error); //
    }
  };

/**
 * RBAC: Only Admin can view all pending leaves.
 */
export const getPendingLeaves = async (req: Request, res: Response) => {
  try {
    // RBAC Check
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const pendingLeaves = await HRService.getPendingLeaves(); 
    return res.status(200).json({
      success: true,
      count: pendingLeaves.length,
      data: pendingLeaves
    });
  } catch (error: any) {
    console.error('Get pending leaves error:', error);
    return sendError(res, error, 500);
  }
};

/**
 * RBAC: Only Admin can approve/reject leaves.
 */
export const updateLeaveStatus = async (req: Request, res: Response) => {
  try {
    // RBAC Check
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can update leave status.'
      });
    }

    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.userId; // Use ID from authenticated user
    
    const leave = await HRService.updateLeaveStatus(id, status, adminId);
    return res.status(200).json({ 
      success: true, 
      message: `Leave status updated to ${status}`,
      data: leave 
    });
  } catch (error: any) {
    return sendError(res, error); 
  }
};

/**
 * RBAC: Only Admin can add company holidays.
 */
export const addHoliday = async (req: Request, res: Response) => {
  try {
    // RBAC Check
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required to add holidays.'
      });
    }

    const holiday = await HRService.addHoliday(req.body);
    return res.status(201).json({ 
      success: true, 
      message: 'Holiday added successfully',
      data: holiday 
    });
  } catch (error: any) {
    return sendError(res, error);
  }
};

/**
 * Public/Employee view of holidays.
 */
export const getHolidays = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const holidays = await HRService.getHolidays(year as string);
    return res.status(200).json({ 
      success: true, 
      data: holidays 
    });
  } catch (error: any) {
    return sendError(res, error, 500);
  }
};