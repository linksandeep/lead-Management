import { Leave } from '../models/Leave';
import { Holiday } from '../models/Holiday';

export const HRService = {
    applyLeave: async (leaveData: any) => {
        const { user, startDate, endDate } = leaveData;
    
        // Manual check before Mongoose validation kicks in
        if (!user) {
          const error: any = new Error("User ID is required to process leave.");
          error.statusCode = 400;
          throw error;
        }
    
        const start = new Date(startDate);
        const end = new Date(endDate);
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    
        // This creates the document with the required 'user' field
        return await Leave.create({ 
          ...leaveData, 
          totalDays 
        });
      },

  updateLeaveStatus: async (id: string, status: string, adminId: string) => {
    const leave = await Leave.findByIdAndUpdate(
      id,
      { status, approvedBy: adminId },
      { new: true, runValidators: true }
    );
    
    if (!leave) {
      const error: any = new Error("Leave record not found");
      error.statusCode = 404;
      throw error;
    }
    return leave;
  },

  // Added missing method
  getPendingLeaves: async () => {
    return await Leave.find({ status: 'Pending' })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
  },

  addHoliday: async (holidayData: any) => {
    return await Holiday.create(holidayData);
  },

  // Added missing method
  getHolidays: async (year?: string) => {
    let query = {};
    if (year) {
      query = { date: { $regex: `^${year}` } };
    }
    return await Holiday.find(query).sort({ date: 1 });
  },

 
};