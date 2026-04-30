export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vercel serverless can't run Python scripts
    // Return instructions for running search locally
    return res.status(200).json({
      success: true,
      message: 'To run a manual search, execute locally:',
      instructions: {
        local: 'cd /Users/brett/.openclaw/workspace/gowild-searcher && python3 gowild_searcher.py',
        note: 'The search results will be saved to logs/ and committed to the repo. Vercel will automatically show updated results after the next deploy.',
        alternative: 'You can also set up GitHub Actions to trigger searches on demand (see README.md)'
      },
      automated: 'Daily searches run automatically at 6 AM MDT via the Python scheduler'
    });

  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({
      error: 'Search configuration error',
      details: error.message,
    });
  }
}
