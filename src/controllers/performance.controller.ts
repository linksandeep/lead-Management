import { Request, Response } from 'express';
  import { sendError } from '../utils/sendError';
import { fetchPerformanceTrend, fetchTeamPerformance } from '../service/performance.service';
export const getTeamPerformanceDashboard = async (req: Request, res: Response) => {
  try {
    const performanceData = await fetchTeamPerformance(req.query);
    
    res.status(200).json({
      success: true,
      message: 'Team performance data generated successfully',
      data: performanceData
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getUserPerformanceDashboard = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Get both the specific stats and the trend lines for the UI graph
    const [trend, teamStats] = await Promise.all([
      fetchPerformanceTrend(req.query, userId),
      fetchTeamPerformance({ ...req.query }) // Can be filtered to compare against team avg
    ]);

    const userStats = teamStats.find((s: any) => s.userId.toString() === userId);

    res.status(200).json({
      success: true,
      data: {
        overview: userStats || { totalLeads: 0, closedSales: 0, conversionRate: 0 },
        graphData: trend
      }
    });
  } catch (error) {
    return sendError(res, error);
  }
};