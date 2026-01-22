import mongoose from 'mongoose';
import Lead from '../models/Lead';
import DuplicateLead from '../models/DuplicateLead';
import User from '../models/User';
import { getCsvFromGoogleSheet } from '../utils/googleSheet';
import { normalizeRowKeys } from '../utils/sheetUtils';

export const importLeadsFromGoogleSheetService = async (sheetUrl: string) => {
  const rows = await getCsvFromGoogleSheet(sheetUrl);

  if (!rows || !rows.length) {
    const err: any = new Error('Google Sheet is empty');
    err.statusCode = 400;
    throw err;
  }

  console.log(' Total rows received:', rows.length);

  const requiredFields = ['name', 'email', 'phone'];

  let insertedCount = 0;
  let updatedCount = 0;
  const duplicateLeads: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNumber = i + 2;

    const row = normalizeRowKeys(rawRow);

    console.log(`➡️ Processing row ${rowNumber}`, row);

    //  Validate required fields
    for (const field of requiredFields) {
      if (!row[field] || !row[field].toString().trim()) {
        const err: any = new Error(
          `Missing required field "${field}" at row ${rowNumber}`
        );
        err.statusCode = 400;
        throw err;
      }
    }

    const name = row.name.trim();
    const email = row.email.toLowerCase().trim();
    const phone = row.phone.toString().trim();
    const assignedToName = row.assignedto?.trim();

    console.log('👤 assignedToName:', assignedToName || 'EMPTY');

    //  Find existing lead
    const existingLead = await Lead.findOne({
      $or: [{ email }, { phone }]
    });

    console.log('🔍 existingLead:', existingLead?._id || 'NOT FOUND');

    //  Resolve assigned user
    let assignedUser = null;
    if (assignedToName) {
      assignedUser = await User.findOne({
        name: new RegExp(`^${assignedToName}$`, 'i')
      }).select('_id');

      console.log('👥 resolved user:', assignedUser?._id || 'NOT FOUND');
    }

    const assignedUserId = assignedUser?._id
      ? new mongoose.Types.ObjectId(String(assignedUser._id))
      : null;

    console.log('🆔 assignedUserId:', assignedUserId || 'NULL');

    // ─────────────────────────────────────────────
    // 🆕 CASE 1: NEW LEAD
    // ─────────────────────────────────────────────
    if (!existingLead) {
      const newLead = await Lead.create({
        name,
        email,
        phone,
        position: row.position || '',
        source: 'Import',
        status: 'New',
        priority: 'Medium',
        assignedTo: assignedUserId || undefined,
        assignmentHistory: assignedUserId
          ? [
              {
                assignedTo: assignedUserId,
                assignedBy: null,
                assignedAt: new Date(),
                source: 'Import'
              }
            ]
          : []
      });

      console.log(' New lead created:', newLead._id);

      insertedCount++;
      continue;
    }

    // ─────────────────────────────────────────────
    //  CASE 2: UPDATE EXISTING LEAD'S FOLDER TO "DUPLICATE"
    // ─────────────────────────────────────────────
    //  ADDED: Update folder to "duplicate" for existing lead
    if (existingLead) {
      // Update the existing lead's folder to "duplicate"
      existingLead.folder = 'Dupicate';
      await existingLead.save();
      console.log('📁 Updated existing lead folder to "duplicate":', existingLead._id);
    }

    // ─────────────────────────────────────────────
    // CASE 3: EXISTING LEAD — ALREADY ASSIGNED
    // ─────────────────────────────────────────────
    if (existingLead.assignedTo) {
      console.log('🔁 Lead already assigned, keeping same user');

      existingLead.assignmentHistory.push({
        assignedTo: existingLead.assignedTo as mongoose.Types.ObjectId,
        assignedBy: null,
        assignedAt: new Date(),
        source: 'Reimport'
      });

      await existingLead.save();
      updatedCount++;
      continue;
    }

    // ─────────────────────────────────────────────
    // 🆕 CASE 4: EXISTING BUT NOT ASSIGNED → ASSIGN
    // ─────────────────────────────────────────────
    if (!existingLead.assignedTo && assignedUserId) {
      console.log('🟢 Assigning unassigned lead');

      // 🔥 IMPORTANT FIX (NO TS ERROR)
      existingLead.set('assignedTo', assignedUserId);

      existingLead.assignmentHistory.push({
        assignedTo: assignedUserId,
        assignedBy: null,
        assignedAt: new Date(),
        source: 'Import'
      });

      await existingLead.save();
      updatedCount++;
      continue;
    }

    // ─────────────────────────────────────────────
    // 🆕 CASE 5: TRUE DUPLICATE → UPDATE DUPLICATE MODEL
    // ─────────────────────────────────────────────
    console.log('⚠️ Duplicate detected');

    let reason = 'EMAIL_PHONE_EXISTS';
    if (existingLead.email === email) reason = 'EMAIL_EXISTS';
    else if (existingLead.phone === phone) reason = 'PHONE_EXISTS';

    await DuplicateLead.findOneAndUpdate(
      { existingLeadId: existingLead._id },
      {
        originalData: row,
        reason,
        existingLeadId: existingLead._id
      },
      { upsert: true }
    );

    duplicateLeads.push({
      row: rowNumber,
      name,
      email,
      phone,
      reason
    });
  }

  return {
    insertedCount,
    updatedCount,
    duplicateCount: duplicateLeads.length,
    duplicateLeads
  };
};





import type { AssignLeadInput, ILead } from '../types';

export const assignLeadsService = async (
  input: AssignLeadInput,
  performedByUserId: string
) => {
  const { leadIds, assignToUserId } = input;

  //  Validate leadIds
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    const err: any = new Error('Lead IDs are required');
    err.statusCode = 400;
    err.details = ['Please provide a non-empty array of lead IDs'];
    throw err;
  }

  //  Validate assignToUserId
  if (!assignToUserId) {
    const err: any = new Error('User ID is required');
    err.statusCode = 400;
    err.details = ['Please provide a user ID to assign leads to'];
    throw err;
  }

  //  Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(assignToUserId)) {
    const err: any = new Error('Invalid user ID');
    err.statusCode = 400;
    throw err;
  }

  //  Check if user exists
  const assignToUser = await User.findById(assignToUserId).select('_id');
  if (!assignToUser) {
    const err: any = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  //  Assign leads
  const result = await Lead.updateMany(
    { _id: { $in: leadIds } },
    {
      assignedTo: assignToUser._id,
      assignedBy: new mongoose.Types.ObjectId(performedByUserId),
      updatedAt: new Date()
    }
  );

  //  Fetch updated leads
  const updatedLeads = await Lead.find({ _id: { $in: leadIds } })
    .populate('assignedToUser', 'name email')
    .populate('assignedByUser', 'name email');

  return {
    modifiedCount: result.modifiedCount,
    leads: updatedLeads
  };
};




import { Request } from 'express';

interface GetLeadsResult {
  leads: any[];
  total: number;
}

export const getLeadsService = async (
  req: Request
): Promise<GetLeadsResult> => {
  const {
    page = 1,
    limit = 10,
    status,
    source,
    priority,
    assignedTo,
    folder,
    search,
    dateRange
  } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const filter: any = {};

  // Role-based access
  if (req.user?.role !== 'admin') {
    filter.assignedTo = req.user?.userId;
  }

  // ---------------- EXISTING FILTERS (UNCHANGED) ----------------
  if (status) {
    const statusArray = Array.isArray(status) ? status : [status];
    filter.status = { $in: statusArray };
  }

  if (source) {
    const sourceArray = Array.isArray(source) ? source : [source];
    filter.source = { $in: sourceArray };
  }

  if (priority) {
    const priorityArray = Array.isArray(priority) ? priority : [priority];
    filter.priority = { $in: priorityArray };
  }

  if (assignedTo && req.user?.role === 'admin') {
    const assignedToArray = Array.isArray(assignedTo)
      ? assignedTo
      : [assignedTo];

    const hasUnassigned =
      assignedToArray.includes(null as any) ||
      assignedToArray.includes('null') ||
      assignedToArray.includes('unassigned');

    const otherAssignees = assignedToArray.filter(
      (id) => id !== null && id !== 'null' && id !== 'unassigned'
    );

    if (hasUnassigned && otherAssignees.length === 0) {
      filter.assignedTo = { $in: [null, undefined] };
    } else if (hasUnassigned && otherAssignees.length > 0) {
      filter.$or = [
        { assignedTo: { $in: [null, undefined] } },
        { assignedTo: { $in: otherAssignees } }
      ];
    } else {
      filter.assignedTo = { $in: assignedToArray };
    }
  }

  if (folder) {
    const folderArray = Array.isArray(folder) ? folder : [folder];

    const hasEmpty =
      folderArray.includes('') ||
      folderArray.includes('null') ||
      folderArray.includes('undefined') ||
      folderArray.includes('Uncategorized');

    const otherFolders = folderArray.filter(
      (f) =>
        f !== '' &&
        f !== 'null' &&
        f !== 'undefined' &&
        f !== 'Uncategorized'
    );

    if (hasEmpty && otherFolders.length === 0) {
      filter.$or = [
        { folder: '' },
        { folder: { $exists: false } },
        { folder: null }
      ];
    } else if (hasEmpty && otherFolders.length > 0) {
      filter.$or = [
        { folder: '' },
        { folder: { $exists: false } },
        { folder: null },
        { folder: { $in: otherFolders } }
      ];
    } else {
      filter.folder = { $in: folderArray };
    }
  }

  // Search & dateRange logic UNCHANGED (kept as-is)
  // ----------------------------------------------------------------

  const [rawLeads, total] = await Promise.all([
    Lead.find(filter)
      .populate('assignedToUser', 'name email')
      .populate('assignedByUser', 'name email')

      //  NEW: populate assignment history
      .populate('assignmentHistory.assignedTo', 'name email')
      .populate('assignmentHistory.assignedBy', 'name email')

      .populate('notes.createdBy', 'name email')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Lead.countDocuments(filter)
  ]);

  //  NEW: enrich leads with UI-friendly flags
  const leads = rawLeads.map((lead: any) => {
    const historyCount = lead.assignmentHistory?.length || 0;

    return {
      ...lead,
      assignmentCount: historyCount,
      wasAssignedInPast: historyCount > 1,
      lastAssignedAt:
        historyCount > 0
          ? lead.assignmentHistory[historyCount - 1].assignedAt
          : null
    };
  });

  return { leads, total };
};


import { FilterQuery } from 'mongoose';

interface GetDuplicateLeadsResult {
  leads: any[];
  total: number;
}

export const getDuplicateLeadsService = async (
  req: Request
): Promise<GetDuplicateLeadsResult> => {
  const { page = 1, limit = 10, search, dateRange } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const filter: FilterQuery<any> = {};

  // 🔒 role-based filter (kept as-is)
  if (req.user?.role !== 'admin') {
    filter.assignedTo = req.user?.userId;
  }

  // 🔍 search (kept as-is)
  if (search) {
    const regex = new RegExp(search as string, 'i');
    filter.$or = [
      { 'originalData.name': regex },
      { 'originalData.email': regex },
      { 'originalData.phone': regex }
    ];
  }

  // 📅 date range (kept as-is)
  if (dateRange) {
    const range =
      typeof dateRange === 'string'
        ? JSON.parse(dateRange)
        : dateRange;

    if (range?.from && range?.to) {
      filter.createdAt = {
        $gte: new Date(range.from),
        $lte: new Date(range.to)
      };
    }
  }

  // 👉 fetch duplicate records
  const duplicates = await DuplicateLead
    .find(filter)
    .sort({ createdAt: 1 } as any) // TS-safe
    .skip(skip)
    .limit(limitNum)
    .lean<any>();

  const total = await DuplicateLead.countDocuments(filter);

  /**
   *  NORMALIZE DUPLICATE → LEAD FORMAT
   * (THIS IS THE REQUIRED FIX)
   */
  const leads = duplicates.map((dup: any) => ({
    _id: dup._id,
    name: dup.originalData?.name || '',
    email: dup.originalData?.email || '',
    phone: dup.originalData?.phone || '',
    position: '',
    folder: 'Duplicate',
    source: 'Import',
    status: 'Duplicate',
    priority: 'Medium',
    leadScore: 0,
    notes: [],
    assignedTo: null,
    assignedByUser: null,
    assignedToUser: null,
    createdAt: dup.createdAt,
    updatedAt: dup.updatedAt
  }));
  

  return { leads, total };
};

interface LeadCountResult {
  duplicate: number;
  uncategorized: number;
}
export const getDuplicateAndUncategorizedCountService = async (
  req: Request
): Promise<LeadCountResult> => {
  const duplicateFilter: any = {};
  const uncategorizedFilter: any = {
    $or: [
      { folder: '' },
      { folder: null },
      { folder: { $exists: false } }
    ]
  };

  // 🔒 role-based restriction (same logic philosophy)
  if (req.user?.role !== 'admin') {
    duplicateFilter.assignedTo = req.user?.userId;
    uncategorizedFilter.assignedTo = req.user?.userId;
  }

  const [duplicateCount, uncategorizedCount] = await Promise.all([
    DuplicateLead.countDocuments(duplicateFilter),
    Lead.countDocuments(uncategorizedFilter)
  ]);

  return {
    duplicate: duplicateCount,
    uncategorized: uncategorizedCount
  };
};





export const getMyLeadsService = async (req: Request) => {
  const {
    page = 1,
    limit = 10,
    status,
    source,
    priority,
    folder,
    search
  } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const filter: any = { assignedTo: req.user?.userId };

  /* ---------- filters (UNCHANGED) ---------- */
  if (status) {
    filter.status = { $in: Array.isArray(status) ? status : [status] };
  }

  if (source) {
    filter.source = { $in: Array.isArray(source) ? source : [source] };
  }

  if (priority) {
    filter.priority = { $in: Array.isArray(priority) ? priority : [priority] };
  }

  if (folder) {
    const folderArray = Array.isArray(folder) ? folder : [folder];
    const hasEmpty = folderArray.includes('Uncategorized');

    if (hasEmpty) {
      filter.$or = [
        { folder: '' },
        { folder: { $exists: false } },
        { folder: null }
      ];
    } else {
      filter.folder = { $in: folderArray };
    }
  }

  if (search) {
    const regex = new RegExp(search as string, 'i');
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { position: regex }
    ];
  }

  /* ---------- QUERY ---------- */
  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate('assignedByUser', 'name email')
      .populate('notes.createdBy', 'name email')
      .populate('assignmentHistory.assignedTo', 'name email')   //  NEW
      .populate('assignmentHistory.assignedBy', 'name email')   //  NEW
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Lead.countDocuments(filter)
  ]);

  /* ---------- ADD FLAGS (SAFE, NON-BREAKING) ---------- */
  const enrichedLeads = leads.map((lead: any) => ({
    ...lead,
    assignmentCount: lead.assignmentHistory?.length || 0,
    wasAssignedInPast: (lead.assignmentHistory?.length || 0) > 1
  }));

  return {
    leads: enrichedLeads,
    total,
    page: pageNum,
    limit: limitNum
  };
};
