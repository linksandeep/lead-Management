import Lead from '../models/Lead';
import DuplicateLead from '../models/DuplicateLead';
import { getCsvFromGoogleSheet } from '../utils/googleSheet';
import { normalizeRowKeys } from '../utils/sheetUtils'; 

export const importLeadsFromGoogleSheetService = async (sheetUrl: string) => {
  const rows = await getCsvFromGoogleSheet(sheetUrl);

  if (!rows || !rows.length) {
    const err: any = new Error('Google Sheet is empty');
    err.statusCode = 400;
    throw err;
  }

  const requiredFields = ['name', 'email', 'phone'];

  const insertedLeads = [];
  const duplicateLeads = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNumber = i + 2; // header + 1-based index

    // ✅ Normalize headers (KEY STEP)
    const row = normalizeRowKeys(rawRow);

    // ✅ Validate required fields
    for (const field of requiredFields) {
      if (!row[field] || !row[field].toString().trim()) {
        const err: any = new Error(
          `Missing required field "${field}" at row ${rowNumber}`
        );
        err.statusCode = 400;
        err.details = { row: rowNumber, field };
        throw err;
      }
    }

    const email = row.email.toLowerCase().trim();
    const phone = row.phone.toString().trim();

    // ✅ Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const err: any = new Error(`Invalid email format at row ${rowNumber}`);
      err.statusCode = 400;
      err.details = { row: rowNumber, email };
      throw err;
    }

    // ✅ Duplicate check
    const existingLead = await Lead.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingLead) {
      let reason = 'EMAIL_PHONE_EXISTS';
      if (existingLead.email === email) reason = 'EMAIL_EXISTS';
      else if (existingLead.phone === phone) reason = 'PHONE_EXISTS';

      await DuplicateLead.create({
        originalData: row,
        reason,
        existingLeadId: existingLead._id
      });

      duplicateLeads.push({
        row: rowNumber,
        name: row.name,
        email,
        phone,
        reason
      });

      continue;
    }

    // ✅ Insert lead
    const lead = await Lead.create({
      name: row.name.trim(),
      email,
      phone,
      position: row.position || '',
      source: 'Import',
      status: 'New',
      priority: 'Medium'
    });

    insertedLeads.push(lead);
  }

  return {
    insertedCount: insertedLeads.length,
    duplicateCount: duplicateLeads.length,
    duplicateLeads
  };
};
