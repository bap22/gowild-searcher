const cron = require('node-cron');
const { execSync } = require('child_process');
const path = require('path');
const winston = require('winston');
const fs = require('fs').promises;

// Load configuration
const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Setup logging
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '..', config.logging.file) 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class GoWildScheduler {
  constructor() {
    this.job = null;
    this.isRunning = false;
  }

  async runSearch() {
    if (this.isRunning) {
      logger.warn('Search already in progress, skipping');
      return;
    }

    this.isRunning = true;
    logger.info('Starting scheduled GoWild search...');

    try {
      const searcherPath = path.join(__dirname, 'searcher.js');
      execSync(`node "${searcherPath}"`, {
        stdio: 'inherit',
        timeout: 3600000 // 1 hour timeout
      });
      logger.info('Scheduled search completed successfully');
    } catch (error) {
      logger.error(`Scheduled search failed: ${error.message}`);
      
      // Send error notification
      try {
        const errorMsg = `❌ *GoWild Search Failed*\n\nError: ${error.message}\nTime: ${new Date().toISOString()}`;
        execSync(`openclaw message send --target "${config.slack.channel}" --message "${errorMsg.replace(/"/g, '\\"')}"`);
      } catch (notifyError) {
        logger.error(`Failed to send error notification: ${notifyError.message}`);
      }
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    // Schedule to run daily at 6:00 AM Mountain Time
    // Cron format: second minute hour day month weekday
    // Using 0 6 * * * for 6 AM daily
    this.job = cron.schedule('0 6 * * *', () => {
      this.runSearch();
    }, {
      timezone: 'America/Denver',
      scheduled: true
    });

    logger.info('GoWild scheduler started - runs daily at 6:00 AM MDT');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      logger.info('GoWild scheduler stopped');
    }
  }

  async runNow() {
    logger.info('Running immediate search...');
    await this.runSearch();
  }
}

// CLI interface
async function main() {
  const scheduler = new GoWildScheduler();
  const args = process.argv.slice(2);

  if (args.includes('--start') || args.includes('-s')) {
    scheduler.start();
    console.log('✅ Scheduler started. Press Ctrl+C to stop.');
    
    // Keep process running
    process.on('SIGINT', () => {
      scheduler.stop();
      console.log('\n👋 Scheduler stopped');
      process.exit(0);
    });
    
  } else if (args.includes('--run-now') || args.includes('-r')) {
    await scheduler.runNow();
    scheduler.stop();
    
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
GoWild Fare Scheduler

Usage:
  node scheduler.js [options]

Options:
  --start, -s      Start the daily scheduler (runs at 6 AM MDT)
  --run-now, -r    Run search immediately
  --help, -h       Show this help message

To run as a background service, consider using:
  - nohup: nohup node scheduler.js --start &
  - systemd: Create a service file
  - pm2: pm2 start scheduler.js --name gowild -- --start
    `);
  } else {
    // Default: run once
    await scheduler.runNow();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { GoWildScheduler };
