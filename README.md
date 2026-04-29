# 🎯 Frontier GoWild Fare Searcher

Daily automated tool that searches Frontier Airlines for GoWild fares from your home airport to all domestic US destinations.

## Features

- ✅ Searches Frontier.com daily for GoWild fares
- ✅ Two implementations: Python (recommended) or Node.js
- ✅ Configurable origin airport (default: SLC)
- ✅ Searches ~300 domestic US airports
- ✅ Round-trip searches (depart tomorrow, return +2 days)
- ✅ Filters for GoWild fare availability only
- ✅ Generates detailed reports with flight details, times, and prices
- ✅ Includes clickable booking links
- ✅ Sends daily reports via Slack
- ✅ Rate-limited to avoid blocking
- ✅ Logs all searches for history tracking

## Quick Start

### Option 1: Python (Recommended)

```bash
cd gowild-searcher
./setup.sh
python3 gowild_searcher.py
```

### Option 2: Node.js

```bash
cd gowild-searcher
npm install
npm run search
```

## Configuration

Edit `config.json` to customize:

```json
{
  "origin": "SLC",              // Your home airport
  "searchDays": 3,               // How many days to search
  "returnDays": 2,               // Trip length (depart + return days)
  "domesticAirports": [...],     // List of airports to search
  "slack": {
    "enabled": true,
    "channel": "@brett"          // Slack channel/user for notifications
  },
  "rateLimit": {
    "delayBetweenRequests": 2000,  // ms between requests
    "delayBetweenAirports": 5000   // ms between airport searches
  }
}
```

## Usage

### Python Version

#### One-time Search

```bash
python3 gowild_searcher.py
```

#### Start Daily Scheduler

```bash
python3 scheduler.py --start
```

Runs daily at **6:00 AM Mountain Time**.

#### Run Immediate Search

```bash
python3 scheduler.py --run-now
```

### Node.js Version

#### One-time Search

```bash
npm run search
# or
node src/searcher.js
```

#### Start Daily Scheduler

```bash
npm run schedule
# or
node src/scheduler.js --start
```

## Running as a Service

### Using PM2 (Python - Recommended)

```bash
pip install pm2
pm2 start scheduler.py --name gowild -- --start
pm2 save
pm2 startup
```

### Using PM2 (Node.js)

```bash
npm install -g pm2
pm2 start src/scheduler.js --name gowild -- --start
pm2 save
pm2 startup
```

### Using systemd

Create `/etc/systemd/system/gowild-searcher.service`:

```ini
[Unit]
Description=Frontier GoWild Fare Searcher
After=network.target

[Service]
Type=simple
User=brett
WorkingDirectory=/Users/brett/.openclaw/workspace/gowild-searcher
ExecStart=/usr/local/bin/node src/scheduler.js --start
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable gowild-searcher
sudo systemctl start gowild-searcher
```

### Using cron

Add to crontab (`crontab -e`):

```bash
# Python version - Run daily at 6 AM
0 6 * * * cd /Users/brett/.openclaw/workspace/gowild-searcher && python3 gowild_searcher.py

# Node.js version
0 6 * * * cd /Users/brett/.openclaw/workspace/gowild-searcher && node src/scheduler.js --run-now
```

## Output

### Slack Notifications

Daily reports include:
- Total GoWild fares found
- Top 10 best deals with prices
- Flight times and details
- Direct booking links

### Log Files

Search results are saved to `logs/gowild-YYYY-MM-DD.json` with full details.

## GoWild Fare Restrictions

⚠️ **Important:** GoWild fares come with restrictions:

- Non-refundable and non-transferable
- Blackout dates may apply
- Fares subject to change until booked
- Baggage fees apply separately
- Seat selection requires additional fee
- Changes/cancellations not permitted

Always verify restrictions on Frontier's website before booking.

## Troubleshooting

### No fares found

- GoWild fares are limited and may not be available daily
- Try adjusting search dates in config
- Check if Frontier's website is accessible

### Search fails/blocks

- Increase `delayBetweenAirports` in config
- Ensure you're not running multiple instances
- Check if Frontier has updated their website

### Slack notifications not working

- Verify OpenClaw is running and authenticated
- Check Slack channel name/ID in config
- Review logs for error messages

## Technical Notes

### Python Version (Recommended)
- Uses Playwright for browser automation
- More reliable with modern websites
- Better error handling and debugging
- Requires Python 3.8+

### Node.js Version
- Uses Puppeteer for browser automation
- Good alternative if Python not available
- Requires Node.js 18+

### Anti-Detection
Both versions implement:
- Realistic user agents and headers
- Rate limiting between requests
- Proper browser fingerprints
- Delays to mimic human behavior

## License

MIT
