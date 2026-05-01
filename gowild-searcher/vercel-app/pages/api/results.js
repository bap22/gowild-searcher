/**
 * API endpoint to fetch latest GoWild search results
 * Reads from GitHub repository (results are committed by Mac Mini cron job)
 */

export const config = {
  api: {
    responseLimit: '10mb',
  },
};

export default async function handler(req, res) {
  const { method, query } = req;

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to fetch from GitHub first
    const owner = 'bap22';
    const repo = 'gowild-searcher';
    const path = 'logs';
    
    const filesResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (filesResp.ok) {
      const files = await filesResp.json();
      const resultFiles = files
        .filter(f => f.name.startsWith('gowild-') && f.name.endsWith('.json'))
        .sort((a, b) => b.name.localeCompare(a.name));

      if (resultFiles.length > 0) {
        const latestFile = resultFiles[0];
        const contentResp = await fetch(latestFile.download_url);
        const latestResults = await contentResp.json();
        
        return res.status(200).json({
          latest: latestResults,
          lastUpdated: latestResults.search_time || new Date().toISOString(),
          source: 'github'
        });
      }
    }

    // Fallback to sample data if GitHub has no results
    console.log('No GitHub results, using sample data');
    const sampleData = require('../../data/sample-flights.json');
    
    return res.status(200).json({
      latest: sampleData,
      lastUpdated: sampleData.search_time,
      source: 'sample',
      note: 'This is sample data. Run a search on the Mac Mini to get real results.'
    });

  } catch (error) {
    console.error('Results API error:', error);
    // Even on error, return sample data
    const sampleData = require('../../data/sample-flights.json');
    return res.status(200).json({
      latest: sampleData,
      lastUpdated: sampleData.search_time,
      source: 'sample-fallback'
    });
  }
}
