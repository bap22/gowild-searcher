const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(process.cwd(), 'logs');

/**
 * Ensure logs directory exists
 */
function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Get all result files sorted by date (newest first)
 */
export function getAllResultFiles() {
  ensureLogsDir();
  
  try {
    const files = fs.readdirSync(LOGS_DIR)
      .filter(file => file.startsWith('gowild-') && file.endsWith('.json'))
      .sort((a, b) => {
        const dateA = a.match(/gowild-(\d{4}-\d{2}-\d{2})/)[1];
        const dateB = b.match(/gowild-(\d{4}-\d{2}-\d{2})/)[1];
        return new Date(dateB) - new Date(dateA);
      });
    
    return files;
  } catch (error) {
    console.error('Error reading logs directory:', error);
    return [];
  }
}

/**
 * Get results for a specific date
 */
export function getResultsByDate(dateStr) {
  const filePath = path.join(LOGS_DIR, `gowild-${dateStr}.json`);
  
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading results for ${dateStr}:`, error);
    return null;
  }
}

/**
 * Get most recent results
 */
export function getRecentResults(limit = 10) {
  const files = getAllResultFiles().slice(0, limit);
  const results = [];
  
  for (const file of files) {
    const data = getResultsByDate(file.replace('gowild-', '').replace('.json', ''));
    if (data) {
      results.push(data);
    }
  }
  
  return results;
}

/**
 * Save new results
 */
export function saveResults(report) {
  ensureLogsDir();
  
  const dateStr = report.searchDate || new Date().toISOString().split('T')[0];
  const filePath = path.join(LOGS_DIR, `gowild-${dateStr}.json`);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving results:', error);
    return false;
  }
}

/**
 * Get latest results
 */
export function getLatestResults() {
  const files = getAllResultFiles();
  if (files.length === 0) {
    return null;
  }
  
  return getResultsByDate(files[0].replace('gowild-', '').replace('.json', ''));
}
