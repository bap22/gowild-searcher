import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export const config = {
  api: {
    bodyParser: true,
    responseLimit: '5mb',
  },
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { origin, dates, immediate } = req.body || {};

    // On Vercel, we can't run long Python scripts due to timeout
    // But we can provide instructions and trigger via GitHub Actions webhook
    
    if (process.env.VERCEL) {
      // Running on Vercel
      return res.status(200).json({
        success: true,
        mode: 'vercel',
        message: 'Manual search triggered via instructions below',
        instructions: {
          local: 'cd /Users/brett/.openclaw/workspace/gowild-searcher && python3 gowild_api_searcher.py',
          vercel_note: 'Vercel serverless functions have a 60s timeout - too short for full searches',
          workflow: 'Search results are generated locally and committed to GitHub. Vercel auto-deploys to show latest results.',
          tip: 'Check logs/ directory for latest search results'
        }
      });
    }

    // Running locally - can execute Python script
    if (immediate) {
      try {
        const { stdout, stderr } = await execPromise(
          'python3 gowild_api_searcher.py',
          { 
            cwd: process.cwd(),
            timeout: 300000, // 5 minute timeout
            env: { ...process.env }
          }
        );

        return res.status(200).json({
          success: true,
          mode: 'local',
          output: stdout,
          error: stderr || null,
          message: 'Search completed successfully'
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
          stdout: error.stdout,
          stderr: error.stderr
        });
      }
    }

    // Default: return instructions
    return res.status(200).json({
      success: true,
      message: 'To run a manual search, execute locally:',
      instructions: {
        local: 'cd /Users/brett/.openclaw/workspace/gowild-searcher && python3 gowild_api_searcher.py',
        note: 'Results saved to logs/ and auto-synced to Vercel via GitHub commits',
        automated: 'Daily searches run automatically at 6 AM MDT via cron'
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({
      error: 'Search configuration error',
      details: error.message,
    });
  }
}
