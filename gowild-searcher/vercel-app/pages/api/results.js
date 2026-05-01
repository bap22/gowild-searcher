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
    // Fetch latest results from GitHub
    const owner = 'bap22';
    const repo = 'gowild-searcher';
    const path = 'logs';
    
    // Get list of result files from GitHub
    const filesResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!filesResp.ok) {
      throw new Error('Failed to fetch results from GitHub');
    }

    const files = await filesResp.json();
    
    // Filter for gowild-*.json files
    const resultFiles = files
      .filter(f => f.name.startsWith('gowild-') && f.name.endsWith('.json'))
      .sort((a, b) => b.name.localeCompare(a.name)); // Newest first

    if (resultFiles.length === 0) {
      return res.status(404).json({
        error: 'No search results found',
        message: 'Run a search first to generate results',
      });
    }

    // Get latest result
    const latestFile = resultFiles[0];
    const contentResp = await fetch(latestFile.download_url);
    const latestResults = await contentResp.json();

    // Get recent history (up to 10 files)
    const recentResults = [];
    for (const file of resultFiles.slice(0, 10)) {
      try {
        const resp = await fetch(file.download_url);
        const data = await resp.json();
        recentResults.push({
          searchDate: file.name.replace('gowild-', '').replace('.json', ''),
          ...data,
        });
      } catch (e) {
        console.error(`Failed to load ${file.name}:`, e.message);
      }
    }

    return res.status(200).json({
      latest: latestResults,
      history: recentResults,
      count: resultFiles.length,
      lastUpdated: latestResults.search_time || new Date().toISOString(),
    });

  } catch (error) {
    console.error('Results API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch results',
      details: error.message,
      fallback: 'Results are fetched from GitHub. Make sure searches are running on the Mac Mini.',
    });
  }
}
