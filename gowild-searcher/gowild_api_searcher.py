#!/usr/bin/env python3
"""
Frontier Airlines GoWild Fare Searcher
Uses signed mobile API for reliable searches (no browser automation)
"""

import json
import os
import sys
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
import requests
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64
import hashlib

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


class FrontierAPIClient:
    """Signed mobile API client for Frontier Airlines"""
    
    def __init__(self):
        self.session = requests.Session()
        self.api_config = config.get('api', {})
        
        # Initialize EC keys for signing
        self.private_key = ec.generate_private_key(ec.SECP256R1())
        self.public_key = self.private_key.public_key()
        pub_bytes = self.public_key.public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        self.key_id = base64.b64encode(hashlib.sha256(pub_bytes).digest()).decode()
        
    def _sign_request(self, endpoint: str, method: str, body_dict: Optional[Dict[str, Any]]) -> Dict[str, str]:
        """Sign request with ECDSA"""
        timestamp = str(int(time.time() * 1000))
        
        if body_dict:
            body_json = json.dumps(body_dict, separators=(',', ':'))
            body_hash = base64.b64encode(hashlib.sha256(body_json.encode()).digest()).decode()
        else:
            body_hash = base64.b64encode(hashlib.sha256(b"").digest()).decode()
        
        metadata = {
            "endpoint": endpoint,
            "method": method,
            "timestamp": timestamp,
            "body_hash": body_hash
        }
        metadata_json = json.dumps(metadata, separators=(',', ':'))
        metadata_hash_bytes = hashlib.sha256(metadata_json.encode()).digest()
        
        signature_bytes = self.private_key.sign(
            metadata_hash_bytes,
            ec.ECDSA(hashes.SHA256())
        )
        
        return {
            "x-signing-key-id": self.key_id,
            "x-signature": base64.b64encode(signature_bytes).decode(),
            "x-request-data": base64.b64encode(metadata_hash_bytes).decode(),
            "x-timestamp": timestamp,
            "x-device-id": self.api_config.get('headers', {}).get('device-id', ''),
        }
    
    def search_flights(self, origin: str, destination: str, date: str) -> List[Dict[str, Any]]:
        """Search for flights using signed mobile API"""
        endpoint = self.api_config.get('base_url', 'https://mtier.flyfrontier.com/flightavailabilityssv/FlightAvailabilitySimpleSearch')
        
        # Build request body
        json_template = self.api_config.get('json_template', {})
        body = json.loads(json.dumps(json_template).replace('{origin}', origin).replace('{destination}', destination).replace('{date}', date))
        
        # Build headers
        headers = {
            "Content-Type": "application/json",
            "Host": "mtier.flyfrontier.com",
            **self.api_config.get('headers', {})
        }
        
        # Add signing headers
        sign_headers = self._sign_request(endpoint, "POST", body)
        headers.update(sign_headers)
        
        try:
            timeout = self.api_config.get('timeout_seconds', 20)
            retries = self.api_config.get('retries', 3)
            backoff = self.api_config.get('backoff_seconds', 2.0)
            
            for attempt in range(retries):
                try:
                    logger.info(f"API request: {origin} → {destination} for {date} (attempt {attempt + 1}/{retries})")
                    
                    response = self.session.post(
                        endpoint,
                        json=body,
                        headers=headers,
                        timeout=timeout
                    )
                    
                    if response.status_code == 200:
                        return self._parse_response(response.json(), origin, destination, date)
                    elif response.status_code in [403, 429]:
                        logger.warning(f"Rate limited or blocked: {response.status_code}")
                        if attempt < retries - 1:
                            time.sleep(backoff * (attempt + 1))
                            continue
                        return []
                    else:
                        logger.error(f"API error: {response.status_code} - {response.text[:200]}")
                        return []
                        
                except requests.exceptions.Timeout:
                    logger.warning(f"Request timeout for {origin} → {destination}")
                    if attempt < retries - 1:
                        time.sleep(backoff * (attempt + 1))
                        continue
                    return []
                except requests.exceptions.RequestException as e:
                    logger.error(f"Request failed: {e}")
                    return []
            
            return []
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    def _parse_response(self, data: Dict[str, Any], origin: str, destination: str, date: str) -> List[Dict[str, Any]]:
        """Parse API response and extract GoWild fares"""
        flights = []
        
        try:
            # Navigate the response structure
            availability = data.get('flightAvailabilityResponseModel', {})
            itineraries = availability.get('itineraries', [])
            
            for itin in itineraries:
                segments = itin.get('segments', [])
                if not segments:
                    continue
                
                # Extract fare information
                fares = itin.get('fares', [])
                gowild_fares = [f for f in fares if f.get('fareType') == 'GoWild' or f.get('fareFamily') == 'GoWild']
                
                if not gowild_fares:
                    continue
                
                for fare in gowild_fares:
                    price = fare.get('totalFare', fare.get('baseFare', 0))
                    
                    # Check if it's actually a GoWild fare (very low price)
                    if price > 100:  # GoWild fares should be very cheap
                        continue
                    
                    flight_info = {
                        'origin': origin,
                        'destination': destination,
                        'date': date,
                        'depart_time': segments[0].get('departureTime', '?'),
                        'arrive_time': segments[-1].get('arrivalTime', '?'),
                        'stops': len(segments) - 1,
                        'price': price,
                        'booking_url': f"https://www.flyfrontier.com/travel/book/?o1={origin}&d1={destination}&dd1={date}%2000:00:00&adt=1&ftype=GW",
                        'raw': itin
                    }
                    flights.append(flight_info)
                    logger.info(f"Found GoWild fare: {origin} → {destination} on {date} for ${price}")
            
        except Exception as e:
            logger.error(f"Error parsing response: {e}")
        
        return flights


def send_slack_notification(message: str):
    """Send notification to Slack using OpenClaw"""
    try:
        # Method 1: Try OpenClaw CLI first
        import subprocess
        
        # Escape the message for shell
        escaped_message = message.replace('"', '\\"').replace('\n', '\\n')
        
        # Send via OpenClaw CLI
        cmd = f'openclaw message send --target="@brett" --message="{escaped_message}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            logger.info("Slack notification sent via OpenClaw CLI")
            return
        
        # Method 2: Fall back to writing a file for Vercel/dashboard to pick up
        logger.warning("OpenClaw CLI not available, writing notification file")
        notification_file = LOG_DIR / f"slack-notification-{datetime.now().strftime('%Y%m%d-%H%M%S')}.txt"
        with open(notification_file, 'w') as f:
            f.write(message)
        logger.info(f"Notification written to {notification_file}")
            
    except Exception as e:
        logger.error(f"Error sending Slack notification: {e}")
        # Write to file as fallback
        try:
            notification_file = LOG_DIR / f"slack-notification-fallback-{datetime.now().strftime('%Y%m%d-%H%M%S')}.txt"
            with open(notification_file, 'w') as f:
                f.write(message)
            logger.info(f"Notification written to fallback file: {notification_file}")
        except:
            pass


def search_all_routes():
    """Search all configured routes for GoWild fares"""
    client = FrontierAPIClient()
    
    origin = config.get('origin', 'SLC')
    airports = config.get('domesticAirports', [])
    search_days = config.get('searchDays', 3)
    
    all_flights = []
    
    # Calculate search dates
    today = datetime.now()
    dates_to_search = [(today + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, search_days + 1)]
    
    logger.info(f"Starting GoWild search from {origin} for {len(airports)} airports on {len(dates_to_search)} dates")
    
    for date in dates_to_search:
        for airport in airports:
            if airport == origin:
                continue
                
            flights = client.search_flights(origin, airport, date)
            all_flights.extend(flights)
            
            # Rate limiting between requests
            delay = config.get('rateLimit', {}).get('delayBetweenAirports', 1000) / 1000.0
            time.sleep(delay)
    
    return all_flights


def format_slack_message(flights: List[Dict[str, Any]]) -> str:
    """Format search results for Slack"""
    if not flights:
        return "🎯 *GoWild Search Results*\n\nNo GoWild fares found today. Keep looking! ✈️"
    
    # Sort by price
    flights.sort(key=lambda x: x.get('price', 999))
    
    # Group by destination
    by_dest = {}
    for f in flights:
        dest = f['destination']
        if dest not in by_dest:
            by_dest[dest] = []
        by_dest[dest].append(f)
    
    lines = [
        "🎯 *GoWild Fares Found!*",
        f"Total: {len(flights)} fares to {len(by_dest)} destinations",
        "",
        "*Top Deals:*",
    ]
    
    # Show top 10 best deals
    for i, flight in enumerate(flights[:10], 1):
        lines.append(f"{i}. {flight['origin']} → {flight['destination']} - ${flight['price']} ({flight['date']})")
    
    lines.append("")
    lines.append("📋 _Full details in logs/_")
    lines.append("")
    lines.append("_GoWild fares are non-refundable. Book fast!_")
    
    return "\n".join(lines)


def main():
    """Main entry point"""
    logger.info("=" * 60)
    logger.info("Starting GoWild API Search")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    # Search all routes
    flights = search_all_routes()
    
    # Save results
    results_file = LOG_DIR / f"gowild-{datetime.now().strftime('%Y-%m-%d')}.json"
    with open(results_file, 'w') as f:
        json.dump({
            'search_time': datetime.now().isoformat(),
            'origin': config.get('origin', 'SLC'),
            'flights': flights,
            'count': len(flights)
        }, f, indent=2)
    
    logger.info(f"Search complete: {len(flights)} fares found in {time.time() - start_time:.1f}s")
    
    # Send Slack notification if enabled
    if config.get('slack', {}).get('enabled', True):
        message = format_slack_message(flights)
        send_slack_notification(message)
    
    return len(flights)


if __name__ == '__main__':
    sys.exit(0 if main() >= 0 else 1)
