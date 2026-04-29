# 🎯 Frontier GoWild Fare Searcher

Daily automated tool that searches Frontier Airlines for GoWild fares from your home airport to all domestic US destinations.

## Features

- ✅ Searches Frontier.com daily for GoWild fares
- ✅ **NEW: Web dashboard for manual searches and viewing results**
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
- ✅ **Vercel-compatible web interface**

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

### Option 3: Web Dashboard (Local Development)

```bash
cd gowild-searcher
npm install
npm run dev
# Open http://localhost:3000
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

### Web Dashboard

#### Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

#### Features

- **Manual Search Trigger**: Run searches on-demand with custom dates
- **View Latest Results**: See the most recent search results with flight details
- **Search History**: Browse past searches by date
- **Resend Slack Notifications**: Re-send any search results to Slack
- **Direct Booking Links**: Click through to Frontier to book immediately

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

## 🚀 Deploy to Vercel

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Python Installed**: Vercel supports Python serverless functions

### Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Next.js web interface"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   - No special environment variables needed
   - Python 3.x is available by default

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your app

5. **Access Dashboard**
   - Your dashboard will be live at `https://your-project.vercel.app`

### Important Notes

⚠️ **Vercel Serverless Limitations:**

- **Timeout**: API routes have a 60-second timeout (configured in `vercel.json`)
- **Filesystem**: Results are stored in the `logs/` directory and committed to the repo
- **Python Dependencies**: The Python searcher requires Playwright, which may need additional setup

### Alternative: Hybrid Approach

For production use, consider:

1. **Host the web UI on Vercel** (read-only access to results)
2. **Run the Python scheduler on a VPS/home server** (for actual searches)
3. **Sync results via GitHub commits** or a cloud storage service

Example workflow:
```bash
# After each search, commit results
git add logs/gowild-*.json
git commit -m "Add search results for $(date +%Y-%m-%d)"
git push
```

Vercel will auto-deploy and show the new results.

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

### Web Dashboard

Access at `http://localhost:3000` (local) or your Vercel URL:
- Real-time search results
- Historical data browser
- Manual search trigger
- Slack notification resend

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

### Web dashboard not loading

- Run `npm install` to install Next.js dependencies
- Check for errors in the browser console
- Ensure `logs/` directory exists and is readable

### Vercel deployment fails

- Check build logs in Vercel dashboard
- Ensure `next.config.js` and `vercel.json` are present
- Verify Node.js version compatibility (18+)

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

### Web Dashboard (Next.js)
- Built with Next.js 14 and React 18
- Serverless-compatible API routes
- Responsive design for mobile/desktop
- Real-time data fetching

### Anti-Detection
All versions implement:
- Realistic user agents and headers
- Rate limiting between requests
- Proper browser fingerprints
- Delays to mimic human behavior

## Project Structure

```
gowild-searcher/
├── pages/                  # Next.js pages
│   ├── index.js           # Main dashboard
│   └── api/               # API routes
│       ├── search.js      # Trigger manual search
│       ├── results.js     # Fetch results
│       └── slack.js       # Resend Slack notifications
├── lib/                    # Shared utilities
│   └── results.js         # Results file handling
├── styles/                 # CSS styles
│   └── globals.css        # Global styles
├── logs/                   # Search results (JSON)
├── gowild_searcher.py     # Python searcher
├── scheduler.py           # Python scheduler
├── config.json            # Configuration
├── package.json           # Node.js dependencies
├── next.config.js         # Next.js config
├── vercel.json            # Vercel deployment config
└── README.md              # This file
```

## License

MIT
