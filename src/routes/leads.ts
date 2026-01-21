import { Router } from 'express';
import { 
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  assignLeads,
  unassignLeads,
  bulkUpdateStatus,
  addNote,
  getMyLeads,
  getMyLeadsStats,
  getDistinctFolders,
  getFolderCounts,
  importLeadsFromGoogleSheet,
  getDuplicateAndUncategorizedCounts,
  genRem,
  getMyReminders,
} from '../controllers/leadController';
import { 
  analyzeExcelFile,
  getSheetPreview,
  importWithMapping,
  getLeadFields
} from '../controllers/excelController';
import { uploadExcel, handleUploadError, validateFilePresence } from '../middleware/upload';
import { authenticateToken, requireAuth, requireAdmin } from '../middleware/auth';
import reminder from '../models/reminder';

const router = Router();

// All lead routes require authentication
router.use(authenticateToken, requireAuth);

// My leads endpoint (for users to see their assigned leads)
router.get('/my-leads', getMyLeads);
// My leads stats endpoint (for users to get stats for all their assigned leads)
router.get('/my-leads/stats', getMyLeadsStats);

// Get distinct folders for filtering
router.get('/folders', getDistinctFolders);
// Get folder counts for better performance
router.get('/folder-counts', getFolderCounts);
// Duplicate leads (admin only)
// router.get('/duplicates', requireAdmin, getLeadsDup);

// Lead assignment (admin only)
router.post('/assign', requireAdmin, assignLeads);
// Lead unassignment (admin only)
router.post('/unassign', requireAdmin, unassignLeads);
// Bulk update lead status
router.put('/bulk-status', bulkUpdateStatus);

// Add note to lead
router.post('/notes', addNote);

// Smart Excel import endpoints (admin only)
router.get('/import/fields', requireAdmin, getLeadFields);
router.post('/import/analyze', requireAdmin, uploadExcel, handleUploadError, validateFilePresence, analyzeExcelFile);
router.post('/import/preview', requireAdmin, uploadExcel, handleUploadError, validateFilePresence, getSheetPreview);
router.post('/import', requireAdmin, uploadExcel, handleUploadError, validateFilePresence, importWithMapping);
router.post('/import/google-sheet',requireAdmin, importLeadsFromGoogleSheet);

router.post("/reminders",genRem)
router.get('/myreminders', getMyReminders);
// CRUD operations
router.get('/', getLeads); // Get all leads (filtered by role)
router.get('/:id', getLeadById); // Get single lead
router.post('/', createLead); // Create new lead
router.put('/:id', updateLead); // Update lead
router.delete('/:id', requireAdmin, deleteLead); // Delete lead (admin only)
router.get("/counts/summary",getDuplicateAndUncategorizedCounts)


export default router;
