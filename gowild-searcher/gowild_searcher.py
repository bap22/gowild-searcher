#!/usr/bin/env python3
"""
Frontier Airlines GoWild Fare Searcher
Python implementation using Playwright for reliable web scraping
"""

import json
import os
import sys
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import requests

# Setup paths
BASE_DIR = Path(__file__).parent
CONFIG_FILE = BASE_DIR / 'config.json'
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# Load config
with open(CONFIG_FILE) as f:
    config = json.load(f)

# Setup logging
logging.basicConfig(
    level=getattr(logging, config['logging']['level'].upper(), logging.INFO),
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / 'search.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = config.get('retry', {}).get('maxRetries', 3)
BASE_DELAY = config.get('retry', {}).get('baseDelay', 5000)  # ms
MAX_DELAY = config.get('retry', {}).get('maxDelay', 30000)  # ms
TIMEOUT = config.get('browser', {}).get('timeout', 60000)  # Increased default to 60s

GOWILD_RESTRICTIONS = [
    "GoWild fares are non-refundable and non-transferable",
    "Blackout dates may apply - check specific flights",
    "Fares subject to change until booked",
    "Baggage fees apply separately",
    "Seat selection requires additional fee",
    "Changes/cancellations not permitted"
]


class FrontierSearcher:
    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
    
    def __enter__(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=config.get('browser', {}).get('headless', True),
            args=[
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-gpu'
            ]
        )
        self.context = self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        self.page = self.context.new_page()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
    
    def search_route(self, origin, destination, depart_date, return_date, attempt=1):
        """Search for GoWild fares on a specific route with retry logic"""
        fares = []
        
        try:
            logger.info(f"Searching {origin} → {destination} for {depart_date} (attempt {attempt}/{MAX_RETRIES})")
            
            # Navigate to Frontier with increased timeout
            self.page.goto('https://www.flyfrontier.com/travel/book/', 
                          wait_until='networkidle',
                          timeout=TIMEOUT)
            
            # Wait for form to load
            self.page.wait_for_selector('input[placeholder*="From"], input[name*="origin"]', timeout=15000)
            
            # Try to fill the form
            try:
                # Fill origin
                origin_input = self.page.locator('input[placeholder*="From"], input[name*="origin"]').first
                origin_input.click()
                origin_input.fill(origin)
                self.page.wait_for_timeout(1000)
                self.page.keyboard.press('Enter')
                self.page.wait_for_timeout(500)
                
                # Fill destination
                dest_input = self.page.locator('input[placeholder*="To"], input[name*="destination"]').first
                dest_input.click()
                dest_input.fill(destination)
                self.page.wait_for_timeout(1000)
                self.page.keyboard.press('Enter')
                self.page.wait_for_timeout(500)
                
                # Select dates
                self._select_dates(depart_date, return_date)
                
                # Search
                search_btn = self.page.locator('button[type="submit"], button:has-text("Search")').first
                search_btn.click()
                
                # Wait for results with longer timeout
                try:
                    self.page.wait_for_selector('.fare, .price, .flight', timeout=30000)
                except PlaywrightTimeout:
                    logger.warning(f"No results for {origin} → {destination}")
                    return []
                
                # Extract fares
                fares = self._extract_fares(origin, destination, depart_date, return_date)
                
            except Exception as e:
                error_msg = f"Error filling form for {origin} → {destination}: {e}"
                logger.error(error_msg)
                raise  # Re-raise to trigger retry
                
        except Exception as e:
            error_msg = f"Error searching {origin} → {destination}: {e}"
            logger.error(error_msg)
            
            # Save screenshot for debugging
            try:
                self.page.screenshot(path=str(LOG_DIR / f'error-{origin}-{destination}-attempt{attempt}.png'))
            except:
                pass
            
            # Retry logic with exponential backoff
            if attempt < MAX_RETRIES:
                delay = min(BASE_DELAY * (2 ** (attempt - 1)), MAX_DELAY)
                logger.info(f"Retrying {origin} → {destination} in {delay/1000:.1f}s...")
                self.page.wait_for_timeout(delay)
                return self.search_route(origin, destination, depart_date, return_date, attempt + 1)
            else:
                logger.error(f"Max retries reached for {origin} → {destination}, skipping")
        
        return fares
    
    def _select_dates(self, depart_date, return_date):
        """Select departure and return dates"""
        try:
            # Click depart date field
            depart_input = self.page.locator('input[placeholder*="Depart"], input[name*="depart"]').first
            depart_input.click()
            self.page.wait_for_timeout(1000)
            
            # Try to select from calendar
            try:
                date_btn = self.page.locator(f'[data-date="{depart_date}"]').first
                date_btn.click(timeout=3000)
            except:
                # Fallback: type the date
                depart_input.fill(depart_date)
            
            # Return date
            return_input = self.page.locator('input[placeholder*="Return"], input[name*="return"]').first
            return_input.click()
            self.page.wait_for_timeout(1000)
            
            try:
                date_btn = self.page.locator(f'[data-date="{return_date}"]').first
                date_btn.click(timeout=3000)
            except:
                return_input.fill(return_date)
            
            self.page.wait_for_timeout(500)
            
        except Exception as e:
            logger.warning(f"Could not select dates: {e}")
    
    def _extract_fares(self, origin, destination, depart_date, return_date):
        """Extract GoWild fares from search results"""
        fares = []
        
        extracted = self.page.evaluate('''() => {
            const results = [];
            const containers = document.querySelectorAll('[class*="fare"], [class*="price"], [class*="flight"]');
            
            containers.forEach(el => {
                const text = el.textContent || '';
                const isGoWild = /go\\s*wild|gowild/i.test(text);
                
                if (!isGoWild) return;
                
                const priceMatch = text.match(/\\$?(\\d{2,4})/);
                const price = priceMatch ? parseInt(priceMatch[1]) : null;
                
                if (!price) return;
                
                const times = text.match(/(\\d{1,2}:\\d{2}\\s*[AP]M)/g) || [];
                const flightNum = text.match(/(F9\\d{3,4})/i);
                const duration = text.match(/(\\d+h\\s*\\d+m|\\d+\\s*hr)/i);
                
                results.push({
                    price,
                    departureTime: times[0] || 'N/A',
                    arrivalTime: times[1] || 'N/A',
                    flightNumber: flightNum ? flightNum[0] : 'N/A',
                    duration: duration ? duration[0] : 'N/A'
                });
            });
            
            return results;
        }''')
        
        for data in extracted:
            booking_url = f"https://www.flyfrontier.com/travel/book/?origin={origin}&destination={destination}&depart={depart_date}&return={return_date}"
            fares.append({
                'origin': origin,
                'destination': destination,
                'departDate': depart_date,
                'returnDate': return_date,
                'price': data['price'],
                'departureTime': data['departureTime'],
                'arrivalTime': data['arrivalTime'],
                'flightNumber': data['flightNumber'],
                'duration': data['duration'],
                'bookingUrl': booking_url,
                'foundAt': datetime.now().isoformat()
            })
        
        return fares
    
    def search_all_routes(self, depart_date, return_date):
        """Search all configured routes with rate limiting and error recovery"""
        all_fares = []
        origin = config['origin']
        airports = config['domesticAirports']
        failed_routes = []
        
        logger.info(f"Starting search: {origin} to {len(airports)} airports")
        logger.info(f"Timeout: {TIMEOUT/1000}s, Max retries: {MAX_RETRIES}, Base delay: {BASE_DELAY/1000}s")
        
        for i, destination in enumerate(airports):
            if destination == origin:
                continue
            
            logger.info(f"[{i+1}/{len(airports)}] {origin} → {destination}")
            
            fares = self.search_route(origin, destination, depart_date, return_date)
            
            if fares:
                logger.info(f"  ✓ Found {len(fares)} fare(s)")
                all_fares.extend(fares)
            else:
                failed_routes.append(f"{origin}→{destination}")
            
            # Rate limiting with randomization to avoid detection
            if i < len(airports) - 1:
                base_delay = config.get('rateLimit', {}).get('delayBetweenAirports', 8000)
                # Add 20-50% randomization to delay
                import random
                jitter = random.uniform(0.2, 0.5)
                delay = base_delay * (1 + jitter)
                logger.debug(f"  Waiting {delay/1000:.1f}s before next search...")
                time.sleep(delay / 1000)
        
        if failed_routes:
            logger.warning(f"Failed routes: {', '.join(failed_routes)}")
        
        logger.info(f"Search complete: {len(all_fares)} total fares from {len(airports)-len(failed_routes)-1} successful routes")
        
        return all_fares


def generate_report(fares):
    """Generate report and save to file"""
    report_date = datetime.now().strftime('%Y-%m-%d')
    
    report = {
        'generatedAt': datetime.now().isoformat(),
        'searchDate': report_date,
        'totalFaresFound': len(fares),
        'fares': sorted(fares, key=lambda x: x['price']),
        'restrictions': GOWILD_RESTRICTIONS
    }
    
    # Save JSON report
    log_file = LOG_DIR / f'gowild-{report_date}.json'
    with open(log_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Generate summary
    summary = f"🎯 *GoWild Fare Report - {report_date}*\n\n"
    summary += f"Found *{len(fares)}* GoWild fares\n\n"
    
    if fares:
        summary += "*Top 10 Best Deals:*\n"
        for i, fare in enumerate(fares[:10], 1):
            summary += f"{i}. {fare['origin']} → {fare['destination']}: *${fare['price']}*\n"
            summary += f"   ⏰ Dep: {fare['departureTime']} | Arr: {fare['arrivalTime']}\n"
            summary += f"   ✈️  Flight: {fare['flightNumber']} ({fare['duration']})\n"
            summary += f"   🔗 {fare['bookingUrl']}\n\n"
    else:
        summary += "😕 No GoWild fares found for today's search.\n"
        summary += "_Try adjusting search dates or check back tomorrow._\n"
    
    summary += "\n⚠️ *GoWild Restrictions:*\n"
    for r in GOWILD_RESTRICTIONS:
        summary += f"• {r}\n"
    
    return report, summary


def send_slack_notification(summary):
    """Send notification to Slack via OpenClaw"""
    if not config.get('slack', {}).get('enabled', True):
        logger.info("Slack notifications disabled")
        return
    
    try:
        channel = config.get('slack', {}).get('channel', '@brett')
        escaped = summary.replace('"', '\\"').replace('\n', '\\n')
        cmd = f'openclaw message send --target "{channel}" --message "{escaped}"'
        os.system(cmd)
        logger.info("Slack notification sent")
    except Exception as e:
        logger.error(f"Slack notification failed: {e}")
        print("\nSlack notification content:")
        print(summary)


def main():
    """Main entry point"""
    # Calculate dates
    today = datetime.now()
    depart_date = (today + timedelta(days=1)).strftime('%Y-%m-%d')
    return_days = config.get('returnDays', 2)
    return_date = (today + timedelta(days=1 + return_days)).strftime('%Y-%m-%d')
    
    logger.info(f"Searching: {depart_date} → {return_date}")
    
    with FrontierSearcher() as searcher:
        fares = searcher.search_all_routes(depart_date, return_date)
    
    report, summary = generate_report(fares)
    
    logger.info(f"Found {len(fares)} GoWild fares")
    send_slack_notification(summary)
    
    print(f"\n✅ Complete! Found {len(fares)} GoWild fares")
    print(f"📊 Report: {LOG_DIR}/gowild-{today.strftime('%Y-%m-%d')}.json")


if __name__ == '__main__':
    main()
