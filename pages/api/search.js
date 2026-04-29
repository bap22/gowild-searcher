import { spawn } from 'child_process';
import path from 'path';

export const config = {
  api: {
    bodyParser: true,
    responseLimit: '10mb',
  },
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { departDate, returnDate } = req.body || {};

  try {
    // Get paths
    const basePath = process.cwd();
    const searcherScript = path.join(basePath, 'gowild_searcher.py');
    const pythonPath = process.env.PYTHON_PATH || 'python3';

    // Build command with optional date overrides
    let command = pythonPath;
    let args = [searcherScript];

    // Note: The Python script currently uses config for dates
    // We could extend it to accept CLI args in the future

    console.log('Starting manual search...', { departDate, returnDate });

    // Run the Python searcher
    const searchProcess = spawn(command, args, {
      cwd: basePath,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    searchProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Search output:', data.toString());
    });

    searchProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Search error:', data.toString());
    });

    // Wait for process to complete (with timeout)
    const timeout = 60000; // 60 seconds
    const exitCode = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        searchProcess.kill();
        resolve(-1);
      }, timeout);

      searchProcess.on('close', (code) => {
        clearTimeout(timer);
        resolve(code);
      });
    });

    if (exitCode !== 0) {
      console.error('Search failed with exit code:', exitCode);
      return res.status(500).json({
        error: 'Search failed',
        details: stderr || 'Unknown error',
      });
    }

    // Get the latest results
    const { getLatestResults } = await import('../../lib/results.js');
    const latestResults = getLatestResults();

    return res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      results: latestResults,
      output: stdout,
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      details: error.message,
    });
  }
}
