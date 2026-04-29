#!/usr/bin/env python3
"""
Quick test script to verify GoWild searcher setup
Tests only a few airports to validate functionality
"""

import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).parent
CONFIG_FILE = BASE_DIR / 'config.json'

with open(CONFIG_FILE) as f:
    config = json.load(f)

def test_browser():
    """Test that Playwright browser works"""
    print("🧪 Testing browser initialization...")
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Test navigation
            page.goto('https://www.flyfrontier.com/', timeout=30000)
            title = page.title()
            
            browser.close()
            
            if 'frontier' in title.lower():
                print("✅ Browser test passed!")
                return True
            else:
                print(f"⚠️  Unexpected page title: {title}")
                return False
                
    except Exception as e:
        print(f"❌ Browser test failed: {e}")
        return False


def test_config():
    """Test configuration file"""
    print("\n🧪 Testing configuration...")
    
    required_keys = ['origin', 'domesticAirports', 'slack', 'rateLimit']
    missing = [k for k in required_keys if k not in config]
    
    if missing:
        print(f"❌ Missing config keys: {missing}")
        return False
    
    if len(config['domesticAirports']) < 10:
        print(f"⚠️  Only {len(config['domesticAirports'])} airports configured (expected ~300)")
    
    print(f"✅ Configuration valid!")
    print(f"   Origin: {config['origin']}")
    print(f"   Airports: {len(config['domesticAirports'])}")
    print(f"   Slack: {'enabled' if config['slack']['enabled'] else 'disabled'}")
    return True


def test_quick_search():
    """Test search with just 3 airports"""
    print("\n🧪 Testing quick search (3 airports)...")
    
    try:
        # Import the searcher
        sys.path.insert(0, str(BASE_DIR))
        from gowild_searcher import FrontierSearcher, generate_report
        from datetime import datetime, timedelta
        
        # Test with 3 airports
        test_airports = config['domesticAirports'][:3]
        original_airports = config['domesticAirports']
        config['domesticAirports'] = test_airports
        
        today = datetime.now()
        depart = (today + timedelta(days=1)).strftime('%Y-%m-%d')
        return_date = (today + timedelta(days=3)).strftime('%Y-%m-%d')
        
        with FrontierSearcher() as searcher:
            fares = searcher.search_all_routes(depart, return_date)
        
        # Restore config
        config['domesticAirports'] = original_airports
        
        print(f"✅ Quick search completed!")
        print(f"   Found {len(fares)} fares")
        
        if fares:
            print(f"\n   Sample result:")
            sample = fares[0]
            print(f"   {sample['origin']} → {sample['destination']}: ${sample['price']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Quick search test failed: {e}")
        return False


def main():
    print("=" * 50)
    print("GoWild Searcher - Test Suite")
    print("=" * 50)
    
    results = []
    
    results.append(("Configuration", test_config()))
    results.append(("Browser", test_browser()))
    
    # Optional: run quick search test
    if input("\nRun quick search test? (y/n): ").lower().strip() == 'y':
        results.append(("Quick Search", test_quick_search()))
    
    print("\n" + "=" * 50)
    print("Test Results:")
    print("=" * 50)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {name}")
    
    all_passed = all(r[1] for r in results)
    
    if all_passed:
        print("\n🎉 All tests passed! Ready to run full search.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check configuration and dependencies.")
        return 1


if __name__ == '__main__':
    sys.exit(main())
