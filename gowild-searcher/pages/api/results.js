import { getLatestResults, getRecentResults, getResultsByDate, getAllResultFiles } from '../../lib/results.js';

export const config = {
  api: {
    responseLimit: '10mb',
  },
};

export default async function handler(req, res) {
  const { method, query } = req;

  try {
    switch (method) {
      case 'GET': {
        // Handle /api/results/:date
        if (query.date) {
          const results = getResultsByDate(query.date);
          
          if (!results) {
            return res.status(404).json({
              error: 'Results not found',
              date: query.date,
            });
          }
          
          return res.status(200).json(results);
        }
        
        // Handle /api/results?limit=N (default: 10)
        const limit = parseInt(query.limit || '10', 10);
        const recent = getRecentResults(limit);
        
        return res.status(200).json({
          results: recent,
          count: recent.length,
        });
      }

      case 'DELETE': {
        // Allow deleting specific date results
        if (!query.date) {
          return res.status(400).json({ error: 'Date parameter required' });
        }
        
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), 'logs', `gowild-${query.date}.json`);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          return res.status(200).json({ success: true, message: 'Results deleted' });
        }
        
        return res.status(404).json({ error: 'Results not found' });
      }

      default:
        res.setHeader('Allow', ['GET', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Results API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch results',
      details: error.message,
    });
  }
}
