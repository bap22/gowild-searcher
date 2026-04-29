const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const winston = require('winston');
const { execSync } = require('child_process');

// Load configuration
const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Setup logging
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '..', config.logging.file) 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// GoWild fare restrictions to include in reports
const GOWILD_RESTRICTIONS = [
  "GoWild fares are non-refundable and non-transferable",
  "Blackout dates may apply - check specific flights",
  "Fares subject to change until booked",
  "Baggage fees apply separately",
  "Seat selection requires additional fee",
  "Changes/cancellations not permitted"
];

class FrontierSearcher {
  constructor() {
    this.browser = null;
    this.results = [];
  }

  async init() {
    logger.info('Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: config.browser.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });
    logger.info('Browser initialized');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }

  async searchRoute(origin, destination, departDate, returnDate) {
    const page = await this.browser.newPage();
    
    // Set realistic headers to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    try {
      // Navigate to Frontier's booking page
      logger.info(`Searching ${origin} → ${destination} for ${departDate}`);
      
      const searchUrl = `https://www.flyfrontier.com/travel/book/`;
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle2',
        timeout: config.browser.timeout 
      });

      // Wait for search form to load
      await page.waitForSelector('input[placeholder*="From"]', { timeout: 10000 });
      
      // Fill in origin
      await page.click('input[placeholder*="From"]');
      await page.keyboard.type(origin, { delay: 100 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Fill in destination
      await page.click('input[placeholder*="To"]');
      await page.keyboard.type(destination, { delay: 100 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Select dates (this may need adjustment based on actual UI)
      await page.click('input[placeholder*="Depart"]');
      await this.selectDate(page, departDate);
      await page.waitForTimeout(500);

      await page.click('input[placeholder*="Return"]');
      await this.selectDate(page, returnDate);
      await page.waitForTimeout(500);

      // Click search button
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for results to load
      await page.waitForSelector('.flight-result, .fare-display', { timeout: 15000 });

      // Look for GoWild fares
      const gowildFares = await this.extractGoWildFares(page, origin, destination, departDate, returnDate);
      
      return gowildFares;

    } catch (error) {
      logger.error(`Error searching ${origin} → ${destination}: ${error.message}`);
      return [];
    } finally {
      await page.close();
    }
  }

  async selectDate(page, dateStr) {
    // Implement date selection logic based on calendar UI
    // This is a placeholder - actual implementation depends on Frontier's calendar widget
    const [year, month, day] = dateStr.split('-');
    
    // Try to find and click the date in the calendar
    const dateSelector = `[data-date="${dateStr}"], .calendar-day[data-day="${day}"]`;
    try {
      await page.click(dateSelector);
    } catch (e) {
      // Fallback: try alternative selectors
      logger.warn(`Could not select date ${dateStr} directly, trying alternative methods`);
    }
  }

  async extractGoWildFares(page, origin, destination, departDate, returnDate) {
    const fares = [];

    // Extract fare information from the page
    const fareData = await page.evaluate(() => {
      const results = [];
      
      // Look for GoWild fare indicators
      const fareElements = document.querySelectorAll('.fare-option, .price-display, .gowild-fare');
      
      fareElements.forEach(el => {
        const text = el.textContent || '';
        const price = text.match(/\$?(\d+)/)?.[1];
        const isGoWild = text.toLowerCase().includes('gowild') || 
                        text.toLowerCase().includes('go wild') ||
                        el.className.toLowerCase().includes('gowild');
        
        if (isGoWild && price) {
          results.push({
            price: parseInt(price),
            isGoWild: true,
            text: text.trim()
          });
        }
      });

      return results;
    });

    // Also try to get flight details
    const flightDetails = await page.evaluate(() => {
      const flights = [];
      const flightElements = document.querySelectorAll('.flight-card, .flight-result');
      
      flightElements.forEach(el => {
        const text = el.textContent || '';
        const times = text.match(/(\d{1,2}:\d{2}\s*[AP]M)/g) || [];
        const flightNum = text.match(/(F9\d{3,4})/i)?.[0];
        
        if (times.length >= 2) {
          flights.push({
            departureTime: times[0],
            arrivalTime: times[1],
            flightNumber: flightNum || 'N/A',
            duration: text.match(/(\d+h\s*\d+m|\d+\s*hr)/i)?.[0] || 'N/A'
          });
        }
      });
      
      return flights;
    });

    // Combine fare and flight data
    fareData.forEach((fare, index) => {
      const flight = flightDetails[index] || {};
      const bookingUrl = `https://www.flyfrontier.com/travel/book/?origin=${origin}&destination=${destination}&depart=${departDate}&return=${returnDate}`;
      
      fares.push({
        origin,
        destination,
        departDate,
        returnDate,
        price: fare.price,
        departureTime: flight.departureTime || 'N/A',
        arrivalTime: flight.arrivalTime || 'N/A',
        flightNumber: flight.flightNumber || 'N/A',
        duration: flight.duration || 'N/A',
        bookingUrl,
        foundAt: new Date().toISOString()
      });
    });

    return fares;
  }

  async searchAllRoutes(departDate, returnDate) {
    const allFares = [];
    const origin = config.origin;

    logger.info(`Starting search for ${origin} to ${config.domesticAirports.length} airports`);

    for (let i = 0; i < config.domesticAirports.length; i++) {
      const destination = config.domesticAirports[i];
      
      if (destination === origin) continue; // Skip same airport

      logger.info(`[${i + 1}/${config.domesticAirports.length}] Searching ${origin} → ${destination}`);
      
      const fares = await this.searchRoute(origin, destination, departDate, returnDate);
      allFares.push(...fares);

      // Rate limiting
      if (i < config.domesticAirports.length - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, config.rateLimit.delayBetweenAirports)
        );
      }
    }

    return allFares;
  }
}

async function generateReport(fares) {
  const reportDate = new Date().toISOString().split('T')[0];
  const report = {
    generatedAt: new Date().toISOString(),
    searchDate: reportDate,
    totalFaresFound: fares.length,
    fares: fares.sort((a, b) => a.price - b.price),
    restrictions: GOWILD_RESTRICTIONS
  };

  // Save to log file
  const logDir = path.join(__dirname, '..', 'logs');
  await fs.mkdir(logDir, { recursive: true });
  
  const logFile = path.join(logDir, `gowild-${reportDate}.json`);
  await fs.writeFile(logFile, JSON.stringify(report, null, 2));

  // Generate human-readable summary
  let summary = `🎯 *GoWild Fare Report - ${reportDate}*\n\n`;
  summary += `Found *${fares.length}* GoWild fares\n\n`;

  if (fares.length > 0) {
    summary += `*Top 10 Best Deals:*\n`;
    fares.slice(0, 10).forEach((fare, i) => {
      summary += `${i + 1}. ${fare.origin} → ${fare.destination}: $${fare.price}\n`;
      summary += `   Dep: ${fare.departureTime} | Arr: ${fare.arrivalTime}\n`;
      summary += `   ${fare.bookingUrl}\n\n`;
    });
  } else {
    summary += `No GoWild fares found for today's search.\n`;
  }

  summary += `\n_GoWild fares are subject to restrictions and availability._`;

  return { report, summary };
}

async function sendSlackNotification(summary) {
  if (!config.slack.enabled) {
    logger.info('Slack notifications disabled');
    return;
  }

  try {
    // Use OpenClaw's message tool via exec
    const messageCmd = `openclaw message send --target "${config.slack.channel}" --message "${summary.replace(/"/g, '\\"')}"`;
    execSync(messageCmd, { stdio: 'inherit' });
    logger.info('Slack notification sent');
  } catch (error) {
    logger.error(`Failed to send Slack notification: ${error.message}`);
    
    // Fallback: try webhook if configured
    if (config.slack.webhookUrl) {
      try {
        await axios.post(config.slack.webhookUrl, {
          text: summary
        });
        logger.info('Slack notification sent via webhook');
      } catch (webhookError) {
        logger.error(`Webhook also failed: ${webhookError.message}`);
      }
    }
  }
}

async function main() {
  const searcher = new FrontierSearcher();
  
  try {
    await searcher.init();

    // Calculate dates
    const today = new Date();
    const departDate = new Date(today);
    departDate.setDate(departDate.getDate() + 1); // Tomorrow
    
    const returnDate = new Date(departDate);
    returnDate.setDate(returnDate.getDate() + config.returnDays);

    const formatDate = (date) => date.toISOString().split('T')[0];
    const departDateStr = formatDate(departDate);
    const returnDateStr = formatDate(returnDate);

    logger.info(`Searching for departures: ${departDateStr}, returns: ${returnDateStr}`);

    // Run search
    const fares = await searcher.searchAllRoutes(departDateStr, returnDateStr);
    
    // Generate and send report
    const { report, summary } = await generateReport(fares);
    
    logger.info(`Found ${fares.length} total GoWild fares`);
    
    await sendSlackNotification(summary);
    
    console.log(`\n✅ Search complete! Found ${fares.length} GoWild fares.`);
    console.log(`📊 Report saved to: logs/gowild-${formatDate(today)}.json`);
    
  } catch (error) {
    logger.error(`Search failed: ${error.message}`);
    console.error(`❌ Search failed: ${error.message}`);
    process.exit(1);
  } finally {
    await searcher.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { FrontierSearcher, generateReport, sendSlackNotification };
