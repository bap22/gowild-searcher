# GoWild Fare Searcher

A Vercel-ready Next.js application for searching Frontier Airlines GoWild fares under $100.

![GoWild Searcher](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)
![Vercel](https://img.shields.io/badge/Vercel-Ready-black?logo=vercel)
![Node](https://img.shields.io/badge/Node-18+-green?logo=node.js)

## Features

- 🔍 Search GoWild fares from SLC or DEN
- 📅 Search today, tomorrow, or both dates
- 💰 Shows only fares under $100
- 🎨 Beautiful purple gradient UI
- ⚡ Optimized for Vercel's 60-second timeout
- 🔗 Direct booking links to flyfrontier.com

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Deploy to Vercel

#### Option 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts to complete deployment
```

#### Option 2: GitHub + Vercel Dashboard

1. Push this code to a GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js and deploy

#### Option 3: Vercel Dashboard Upload

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Drag and drop the `vercel-app` folder
4. Deploy

## Project Structure

```
vercel-app/
├── pages/
│   ├── index.js          # Main UI (search form + results)
│   └── api/
│       └── search.js     # API route for fare searches
├── lib/
│   └── gowild-api.js     # Frontier API client
├── package.json          # Dependencies
├── vercel.json           # Vercel configuration
└── README.md            # This file
```

## How It Works

1. **User Interface** (`pages/index.js`)
   - Clean, responsive UI with purple gradient theme
   - Origin selection (SLC/DEN)
   - Date range selection (today/tomorrow/both)
   - Real-time search results display

2. **API Route** (`pages/api/search.js`)
   - Accepts POST requests with search parameters
   - Validates input and handles errors
   - Calls the GoWild API client
   - Returns structured JSON response

3. **Frontier API Client** (`lib/gowild-api.js`)
   - Uses Frontier's mobile API endpoint
   - Searches all destinations in parallel batches
   - Filters for GoWild fares under $100
   - Includes booking URLs

## API Endpoint

### POST `/api/search`

**Request Body:**
```json
{
  "origin": "SLC",
  "dateRange": "both"
}
```

**Parameters:**
- `origin`: `"SLC"` or `"DEN"` (default: `"SLC"`)
- `dateRange`: `"today"`, `"tomorrow"`, or `"both"` (default: `"both"`)

**Response:**
```json
{
  "success": true,
  "fares": [
    {
      "origin": "SLC",
      "destination": "LAS",
      "route": "SLC → LAS",
      "price": 49,
      "displayPrice": "$49",
      "departureDate": "2024-01-15",
      "departureTime": "06:00",
      "arrivalTime": "07:30",
      "stops": 0,
      "flightNumber": "F123",
      "isGoWild": true,
      "bookingUrl": "https://www.flyfrontier.com/..."
    }
  ],
  "count": 1,
  "searchParams": {
    "origin": "SLC",
    "dateRange": "both",
    "dates": ["2024-01-15", "2024-01-16"]
  },
  "performance": {
    "elapsedMs": 3420,
    "datesSearched": 2
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Important Notes

### GoWild Fare Rules

- ✅ Valid only for flights departing **today or tomorrow**
- ✅ Base fare only (taxes & fees extra)
- ✅ Subject to availability
- ❌ Cannot be booked in advance
- ❌ Blackout dates may apply

### Performance Considerations

- Vercel functions have a **60-second timeout**
- The app searches destinations in parallel batches
- Each date search has a 25-second internal timeout
- Results are cached per request (no persistent caching)

### Rate Limiting

The app includes built-in rate limiting:
- Destinations searched in batches of 10
- Sequential batch processing
- Individual request timeouts prevent hanging

## Customization

### Add More Origins

Edit `pages/index.js` and `pages/api/search.js`:

```javascript
// Add more origin options
const validOrigins = ['SLC', 'DEN', 'LAS', 'MCO'];
```

### Change Price Threshold

Edit `lib/gowild-api.js`:

```javascript
// Change from $100 to another amount
if (price > 150 || price <= 0) {  // Changed to $150
  return null;
}
```

### Modify Destinations

Edit the `destinations` array in `lib/gowild-api.js` to add/remove airports.

## Troubleshooting

### No Results Found

- GoWild fares are limited and sell out quickly
- Try different origins or date ranges
- Search during off-peak hours
- Check if you're searching too far in advance

### Timeout Errors

- Vercel functions timeout after 60 seconds
- The app is optimized to complete within this limit
- If issues persist, reduce the number of destinations

### API Errors

- Frontier's API may be temporarily unavailable
- Mobile API signature may need updating
- Check browser console for detailed error messages

## Technologies Used

- **Next.js 14** - React framework
- **React 18** - UI library
- **Vercel** - Hosting platform
- **Node Fetch** - HTTP client
- **CSS-in-JS** - Styled-jsx for styling

## License

MIT License - feel free to use and modify!

## Disclaimer

This is an unofficial tool for searching Frontier GoWild fares. Not affiliated with Frontier Airlines. Fare availability and prices are subject to change. Always verify details on flyfrontier.com before booking.

---

**Built with ❤️ for budget travelers**
