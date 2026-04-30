# 📋 GoWild Searcher - Project Summary

## What Was Built

A production-ready Frontier Airlines GoWild fare searcher that automatically scans for deals daily and sends reports via Slack.

## Project Structure

```
gowild-searcher/
├── config.json                 # Configuration file
├── package.json                # Node.js dependencies
├── requirements.txt            # Python dependencies
├── README.md                   # User documentation
├── setup.sh                    # One-command setup script
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
│
├── src/                        # Node.js implementation
│   ├── searcher.js             # Main search script (Puppeteer)
│   ├── searcher-enhanced.js    # Enhanced version (Playwright)
│   └── scheduler.js            # Daily scheduler
│
├── gowild_searcher.py          # Python implementation (recommended)
├── scheduler.py                # Python scheduler
├── test_search.py              # Test suite
│
└── logs/                       # Output directory
    ├── search.log              # Application logs
    └── gowild-YYYY-MM-DD.json  # Daily reports
```

## Key Features

### 1. Dual Implementation
- **Python version** (recommended): More reliable, better error handling
- **Node.js version**: Alternative for Node environments

### 2. Automated Daily Searches
- Searches ~300 domestic US airports
- Departs tomorrow, returns +2 days (3-day trips)
- Runs at 6:00 AM Mountain Time
- Rate-limited to avoid blocking

### 3. Smart Reporting
- JSON reports saved to `logs/` directory
- Slack notifications with top 10 deals
- Clickable booking links
- GoWild fare restrictions included

### 4. Production-Ready
- Comprehensive error handling
- Debugging screenshots on failure
- Logging at multiple levels
- Multiple deployment options (PM2, systemd, cron)

## Configuration

Edit `config.json`:

```json
{
  "origin": "SLC",                    // Your home airport
  "returnDays": 2,                    // Trip length
  "domesticAirports": [...],          // 300+ airports
  "slack": {
    "enabled": true,
    "channel": "@brett"               // Slack recipient
  },
  "rateLimit": {
    "delayBetweenRequests": 2000,     // ms between requests
    "delayBetweenAirports": 5000      // ms between airports
  }
}
```

## Usage Examples

### Quick Test
```bash
./setup.sh
python3 test_search.py
```

### Daily Operation
```bash
# One-time search
python3 gowild_searcher.py

# Start scheduler (runs daily at 6 AM)
python3 scheduler.py --start

# Run as background service
pm2 start scheduler.py --name gowild -- --start
```

## Technical Details

### How It Works

1. **Browser Automation**: Uses Playwright/Puppeteer to control a headless browser
2. **Form Filling**: Automatically fills Frontier's search form with:
   - Origin airport (configurable)
   - Destination airport (iterates through list)
   - Departure date (tomorrow)
   - Return date (+2 days)
3. **Result Parsing**: Extracts GoWild fares from search results
4. **Report Generation**: Creates JSON report and Slack summary
5. **Notification**: Sends formatted report via OpenClaw message tool

### Anti-Detection Measures

- Realistic user agents
- Proper browser fingerprints
- Rate limiting between requests
- Human-like typing delays
- Proper headers and language settings

### GoWild Fare Restrictions

The tool automatically includes these warnings in reports:
- Non-refundable and non-transferable
- Blackout dates may apply
- Fares subject to change
- Baggage fees separate
- Seat selection costs extra
- No changes/cancellations

## Deployment Options

### Option 1: PM2 (Recommended)
```bash
pm2 start scheduler.py --name gowild -- --start
pm2 save
pm2 startup
```

### Option 2: Systemd
Create service file at `/etc/systemd/system/gowild-searcher.service`

### Option 3: Cron
```bash
0 6 * * * cd /path/to/gowild-searcher && python3 gowild_searcher.py
```

## Monitoring

### Logs
- Application logs: `logs/search.log`
- Scheduler logs: `logs/scheduler.log`
- Daily reports: `logs/gowild-YYYY-MM-DD.json`

### Error Handling
- Failed searches logged with details
- Debugging screenshots saved on errors
- Error notifications sent to Slack
- Graceful degradation on failures

## Customization

### Change Search Parameters
- Edit `returnDays` in config.json for different trip lengths
- Modify `domesticAirports` list to focus on specific regions
- Adjust `rateLimit` delays if needed

### Change Notification Channel
- Update `slack.channel` in config.json
- Can send to user, channel, or webhook

### Change Schedule
- Edit cron expression in scheduler.py
- Default: 6:00 AM daily (`0 6 * * *`)

## Troubleshooting

### No Fares Found
- GoWild fares are limited inventory
- Try different search dates
- Check if Frontier website is accessible

### Search Fails/Blocks
- Increase `delayBetweenAirports` in config
- Ensure not running multiple instances
- Check Frontier website for UI changes

### Slack Not Working
- Verify OpenClaw is running
- Check channel name/ID
- Review logs for errors

## Next Steps

1. ✅ Run setup: `./setup.sh`
2. ✅ Test configuration: `python3 test_search.py`
3. ✅ Run first search: `python3 gowild_searcher.py`
4. ✅ Start scheduler: `python3 scheduler.py --start`
5. ✅ Set up as service: `pm2 start scheduler.py --name gowild -- --start`

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review error messages in Slack
3. Verify configuration in `config.json`
4. Test with `test_search.py` first

---

**Built with**: Python, Playwright, Node.js (optional), OpenClaw
**License**: MIT
**Version**: 1.0.0
