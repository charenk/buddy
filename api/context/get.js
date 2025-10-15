/**
 * Get User Context API Endpoint
 * High-performance context retrieval with caching
 */

import { getUserContext, getUserDashboard } from '../../lib/auth.js';
import { getDefaultContext } from '../../lib/context.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId } = req.query;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user context
    const context = await getUserContext(userId);
    
    // Get dashboard data
    const dashboardData = await getUserDashboard(userId);

    if (!context) {
      // Return default context for new users
      const defaultContext = getDefaultContext();
      
      res.status(200).json({
        success: true,
        context: {
          response_style: defaultContext,
          custom_prompts: {},
          is_active: true
        },
        dashboard: dashboardData,
        isDefault: true
      });
      return;
    }

    res.status(200).json({
      success: true,
      context: {
        response_style: context.response_style,
        custom_prompts: context.custom_prompts,
        is_active: context.is_active
      },
      dashboard: dashboardData,
      isDefault: false
    });

  } catch (error) {
    console.error('Get context error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
