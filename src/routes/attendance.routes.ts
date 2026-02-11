import { Router } from 'express';// Your existing TS auth middleware
import { authenticateToken, requireAuth } from '../middleware/auth';
import { clockIn, clockOut, getAttendanceStatus, getMonthlyReport, getMyAttendance, getWorkHours } from '../controllers/attendance.controller';

const router = Router();

// All lead routes require authentication
router.use(authenticateToken, requireAuth);

router.post(
  '/check-in', 
  
  clockIn
);

/**
 * @route   POST /api/attendance/check-out
 * @desc    Clock out and calculate daily work hours
 * @access  Private (User)
 */
router.post(
  '/check-out', 
  
  clockOut
);

/**
 * @route   GET /api/attendance/my-history
 * @desc    Get paginated attendance history for the logged-in user
 * @access  Private (User)
 */
router.get(
  '/my-history', 
  
  getMyAttendance
);


router.get('/getWorkHours',getWorkHours)
/**
 * @route   GET /api/attendance/monthly-report
 * @desc    Get total hours and days for salary calculation
 * @access  Private (User/Admin)
 */
router.get(
  '/monthly-report', 
  
  getMonthlyReport
);


router.get('/status', getAttendanceStatus);

export default router;