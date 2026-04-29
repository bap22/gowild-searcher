# 🚀 Quick Start Guide

## 1-Minute Setup

```bash
cd /Users/brett/.openclaw/workspace/gowild-searcher
./setup.sh
```

## First Test Run

```bash
python3 test_search.py
```

This will:
- ✅ Verify configuration
- ✅ Test browser initialization
- ✅ Optionally run a quick search (3 airports)

## Run Your First Full Search

```bash
python3 gowild_searcher.py
```

This will:
- Search ~300 domestic airports
- Find all available GoWild fares
- Save report to `logs/gowild-YYYY-MM-DD.json`
- Send Slack notification with top deals

## Start Daily Automation

```bash
# Run in foreground (press Ctrl+C to stop)
python3 scheduler.py --start

# Or run as background service
pm2 start scheduler.py --name gowild -- --start
pm2 save
```

## What You'll Get

### Slack Notification Example

```
🎯 GoWild Fare Report - 2026-04-29

Found 15 GoWild fares

Top 10 Best Deals:
1. SLC → DEN: $49
   ⏰ Dep: 6:15 AM | Arr: 7:45 AM
   ✈️  Flight: F91234 (1h 30m)
   🔗 https://www.flyfrontier.com/...

2. SLC → LAS: $59
   ...

⚠️ GoWild Restrictions:
• Non-refundable and non-transferable
• Blackout dates may apply
• Fares subject to change
• Baggage fees apply separately
• Seat selection requires additional fee
• Changes/cancellations not permitted
```

### JSON Report

Saved to `logs/gowild-YYYY-MM-DD.json` with:
- Complete fare list (sorted by price)
- Flight details (times, numbers, duration)
- Direct booking links
- Search metadata

## Customize

Edit `config.json`:

```json
{
  "origin": "SLC",           // Change your home airport
  "returnDays": 2,           // Trip length
  "slack": {
    "channel": "@brett"      // Change Slack recipient
  }
}
```

## Troubleshooting

### "No module named 'playwright'"
```bash
python3 -m pip install playwright
python3 -m playwright install chromium
```

### "No fares found"
- GoWild fares are limited - try again tomorrow
- Check if Frontier.com is accessible
- Verify search dates in config

### "Slack notification failed"
- Ensure OpenClaw is running
- Check channel name in config.json
- Review logs for details

## Next Steps

1. ✅ Run `./setup.sh`
2. ✅ Run `python3 test_search.py`
3. ✅ Run `python3 gowild_searcher.py`
4. ✅ Set up daily scheduler with PM2
5. ✅ Enjoy daily GoWild deal reports!

---

**Full documentation**: See README.md
**Project summary**: See PROJECT_SUMMARY.md
