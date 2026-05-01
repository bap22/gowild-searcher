#!/usr/bin/env python3
"""
Scrape GoWild fares from the1491club.com
This is a fallback since Frontier's API is blocked
"""

import json
import sys
import time
import logging
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

# Setup paths
BASE_DIR = Path(__file__).parent
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / 'scrape-1491.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def scrape_1491_club(origin='SLC'):
    """Scrape GoWild fares from the1491club.com"""
    logger.info(f"Scraping the1491club.com for GoWild fares from {origin}")
    
    flights = []
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            )
            page = context.new_page()
            
            # Navigate to the1491club search page
            logger.info("Navigating to the1491club.com/search...")
            page.goto('https://www.the1491club.com/search', wait_until='networkidle', timeout=60000)
            
            # Wait for search results to load
            page.wait_for_selector('[data-testid*="flight"]', timeout=30000)
            
            # Extract flight data from the page
            flights_data = page.evaluate('''() => {
                const flights = [];
                const flightCards = document.querySelectorAll('[data-testid*="flight"]');
                
                flightCards.forEach(card => {
                    try {
                        const route = card.querySelector('[data-testid*="route"]')?.textContent || '';
                        const price = card.querySelector('[data-testid*="price"]')?.textContent || '';
                        const date = card.querySelector('[data-testid*="date"]')?.textContent || '';
                        const time = card.querySelector('[data-testid*="time"]')?.textContent || '';
                        const stops = card.querySelector('[data-testid*="stops"]')?.textContent || '';
                        
                        if (route && price) {
                            flights.push({
                                route: route.trim(),
                                price: price.trim(),
                                date: date.trim(),
                                time: time.trim(),
                                stops: stops.trim()
                            });
                        }
                    } catch (e) {
                        console.error('Error parsing flight:', e);
                    }
                });
                
                return flights;
            }''')
            
            logger.info(f"Found {len(flights_data)} flights on the1491club")
            
            # Convert to our format
            for f in flights_data:
                try:
                    # Parse route (e.g., "SLC → DEN")
                    parts = f['route'].split('→')
                    if len(parts) != 2:
                        continue
                    
                    origin_code = parts[0].strip()
                    dest_code = parts[1].strip()
                    
                    # Parse price (e.g., "$29")
                    price_str = f['price'].replace('$', '').replace(',', '')
                    price = int(float(price_str))
                    
                    flights.append({
                        'origin': origin_code,
                        'destination': dest_code,
                        'date': f['date'],
                        'depart_time': f['time'],
                        'stops': 0 if 'Nonstop' in f.get('stops', '') else 1,
                        'price': price,
                        'booking_url': f"https://www.flyfrontier.com/travel/book/?o1={origin_code}&d1={dest_code}&dd1={datetime.now().strftime('%Y-%m-%d')}%2000:00:00&adt=1&ftype=GW"
                    })
                except Exception as e:
                    logger.warning(f"Failed to parse flight: {e}")
            
            browser.close()
            
    except Exception as e:
        logger.error(f"Scraping failed: {e}")
    
    return flights


def save_results(flights, origin='SLC'):
    """Save results to JSON file"""
    today = datetime.now().strftime('%Y-%m-%d')
    results_file = LOG_DIR / f'gowild-{today}.json'
    
    results = {
        'search_time': datetime.now().isoformat(),
        'origin': origin,
        'flights': flights,
        'count': len(flights),
        'source': 'the1491club.com'
    }
    
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"Saved {len(flights)} flights to {results_file}")
    return results_file


def send_slack_notification(flights):
    """Send Slack notification with results"""
    if not flights:
        message = "🎯 GoWild Search Results\\n\\nNo GoWild fares found right now."
    else:
        # Sort by price
        flights.sort(key=lambda x: x['price'])
        
        message = f"🎯 *GoWild Fares Found!*\\n\\n"
        message += f"Total: {len(flights)} fares\\n\\n"
        message += "*Top Deals:*\\n"
        
        for i, flight in enumerate(flights[:10], 1):
            message += f"{i}. {flight['origin']} → {flight['destination']} - ${flight['price']}\\n"
        
        message += "\\n_Full details in the app!_"
    
    try:
        import subprocess
        cmd = f'openclaw message send --target="@brett" --message="{message}"'
        subprocess.run(cmd, shell=True, capture_output=True, timeout=30)
        logger.info("Slack notification sent")
    except Exception as e:
        logger.error(f"Failed to send Slack: {e}")


def main():
    logger.info("=" * 60)
    logger.info("Starting GoWild scrape from the1491club.com")
    logger.info("=" * 60)
    
    # Scrape flights
    flights = scrape_1491_club('SLC')
    
    # Save results
    if flights:
        save_results(flights, 'SLC')
        send_slack_notification(flights)
        logger.info(f"✅ Complete! Found {len(flights)} GoWild fares")
        return 0
    else:
        logger.warning("⚠️ No flights found")
        return 1


if __name__ == '__main__':
    sys.exit(main())
