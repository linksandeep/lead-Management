// import mongoose from 'mongoose';
// import Lead from '../models/Lead';

// // Helper to calculate date ranges based on user selection
// export const getCriteriaDateRange = (query: any) => {
//   const { year, month, week, startDate, endDate } = query;
//   const now = new Date();
//   let start = new Date(now.getFullYear(), 0, 1);
//   let end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

//   if (startDate && endDate) {
//     return { $gte: new Date(startDate), $lte: new Date(endDate) };
//   }

//   if (year) {
//     const y = parseInt(year);
//     if (month) {
//       const m = parseInt(month) - 1; // JS months are 0-11
//       start = new Date(y, m, 1);
//       end = new Date(y, m + 1, 0, 23, 59, 59);
//     } else {
//       start = new Date(y, 0, 1);
//       end = new Date(y, 12, 0, 23, 59, 59);
//     }
//   }

//   // Logic for specific week of the current year
//   if (week) {
//     const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
//     const days = (parseInt(week) - 1) * 7;
//     start = new Date(firstDayOfYear.setDate(firstDayOfYear.getDate() + days));
//     end = new Date(new Date(start).setDate(start.getDate() + 6));
//   }

//   return { $gte: start, $lte: end };
// };

// // Function to get activity/performance across the whole team
// export const fetchTeamPerformance = async (filters: any) => {
//   const dateRange = getCriteriaDateRange(filters);

//   return await Lead.aggregate([
//     { $match: { createdAt: dateRange } },
//     {
//       $group: {
//         _id: '$assignedTo',
//         totalLeads: { $sum: 1 },
//         closedSales: { $sum: { $cond: [{ $eq: ['$status', 'Sales Done'] }, 1, 0] } },
//         qualifiedLeads: { $sum: { $cond: [{ $eq: ['$status', 'Qualified'] }, 1, 0] } },
//         revenuePotential: { $sum: '$leadScore' }
//       }
//     },
//     {
//       $lookup: {
//         from: 'users',
//         localField: '_id',
//         foreignField: '_id',
//         as: 'user'
//       }
//     },
//     { $unwind: '$user' },
//     {
//       $project: {
//         _id: 0,
//         userId: '$_id',
//         name: '$user.name',
//         totalLeads: 1,
//         closedSales: 1,
//         conversionRate: {
//           $cond: [{ $gt: ['$totalLeads', 0] }, { $multiply: [{ $divide: ['$closedSales', '$totalLeads'] }, 100] }, 0]
//         },
//         efficiencyScore: { $divide: ['$revenuePotential', '$totalLeads'] }
//       }
//     },
//     { $sort: { closedSales: -1 } }
//   ]);
// };

// // Function to get trend data for graphs
// export const fetchPerformanceTrend = async (filters: any, userId?: string) => {
//   const dateRange = getCriteriaDateRange(filters);
//   const match: any = { createdAt: dateRange };
  
//   if (userId) match.assignedTo = new mongoose.Types.ObjectId(userId);

//   return await Lead.aggregate([
//     { $match: match },
//     {
//       $group: {
//         _id: {
//           $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
//         },
//         count: { $sum: 1 },
//         won: { $sum: { $cond: [{ $eq: ['$status', 'Sales Done'] }, 1, 0] } }
//       }
//     },
//     { $sort: { "_id": 1 } }
//   ]);
// };