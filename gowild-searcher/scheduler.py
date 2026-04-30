#!/usr/bin/env python3
"""
GoWild Fare Scheduler
Runs the searcher daily at scheduled times
"""

import schedule
import time
import logging
import subprocess
import sys
from pathlib import Path
from datetime import datetime

# Setup paths
BASE_DIR = Path(__file__).parent
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / 'scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def run_search():
    """Run the GoWild searcher"""
    logger.info("Starting scheduled GoWild search...")
    
    try:
        searcher_script = BASE_DIR / 'gowild_searcher.py'
        result = subprocess.run(
            [sys.executable, str(searcher_script)],
            capture_output=True,
            text=True,
            timeout=3600  # 1 hour timeout
        )
        
        if result.returncode == 0:
            logger.info("Scheduled search completed successfully")
            if result.stdout:
                logger.info(result.stdout)
        else:
            logger.error(f"Search failed: {result.stderr}")
            send_error_notification(result.stderr)
            
    except subprocess.TimeoutExpired:
        logger.error("Search timed out after 1 hour")
        send_error_notification("Search timed out")
    except Exception as e:
        logger.error(f"Search failed: {e}")
        send_error_notification(str(e))


def send_error_notification(error_msg):
    """Send error notification to Slack"""
    try:
        from gowild_searcher import send_slack_notification
        
        error_summary = f"❌ *GoWild Search Failed*\n\nError: {error_msg}\nTime: {datetime.now().isoformat()}"
        send_slack_notification(error_summary)
    except Exception as e:
        logger.error(f"Failed to send error notification: {e}")


def start_scheduler():
    """Start the daily scheduler"""
    # Schedule for 6:00 AM daily
    schedule.every().day.at("06:00").do(run_search)
    
    logger.info("Scheduler started - runs daily at 6:00 AM")
    logger.info("Press Ctrl+C to stop")
    
    # Run initial search
    logger.info("Running initial search...")
    run_search()
    
    # Keep running
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='GoWild Fare Scheduler')
    parser.add_argument('--start', '-s', action='store_true', help='Start daily scheduler')
    parser.add_argument('--run-now', '-r', action='store_true', help='Run search immediately')
    
    args = parser.parse_args()
    
    if args.start:
        start_scheduler()
    elif args.run_now:
        run_search()
    else:
        # Default: run once
        run_search()
