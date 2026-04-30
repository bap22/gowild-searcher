/**
 * Enhanced Frontier GoWild Searcher
 * Uses Playwright for better reliability with modern websites
 * Includes fallback strategies and better error handling
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const { execSync } = require('child_process');

// Load configuration
const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Setup logging
const logDir = path.join(__dirname, '..', 'logs');
fs.mkdir(logDir, { recursive: true }).catch(() => {});

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

const GOWILD_RESTRICTIONS = [
  "GoWild fares are non-refundable and non-transferable",
  "Blackout dates may apply - check specific flights",
  "Fares subject to change until booked",
  "Baggage fees apply separately",
  "Seat selection requires additional fee",
  "Changes/cancellations not permitted"
];

class FrontierSearcherEnhanced {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  async init() {
    logger.info('Initializing Playwright browser...');
    
    this.browser = await chromium.launch({
      headless: config.browser.headless,
      args: [
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-sandbox'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/Denver'
    });

    logger.info('Browser initialized');
  }

  async close() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    logger.info('Browser closed');
  }

  async searchRoute(origin, destination, departDate, returnDate) {
    const page = await this.context.newPage();
    const fares = [];

    try {
      logger.info(`Searching ${origin} → ${destination} for ${departDate}`);

      // Navigate to Frontier
      await page.goto('https://www.flyfrontier.com/', {
        waitUntil: 'networkidle',
        timeout: config.browser.timeout
      });

      // Accept cookies if prompted
      try {
        await page.click('button:has-text("Accept"), button:has-text("Cookies")', { timeout: 3000 });
        await page.waitForTimeout(500);
      } catch (e) {
        // No cookie banner
      }

      // Navigate to booking page
      await page.goto('https://www.flyfrontier.com/travel/book/', {
        waitUntil: 'networkidle',
        timeout: config.browser.timeout
      });

      // Wait for booking form
      await page.waitForSelector('input[id*="origin"], input[placeholder*="From"], input[name*="origin"]', {
        timeout: 10000
      });

      // Fill origin
      const originInput = page.locator('input[id*="origin"], input[placeholder*="From"], input[name*="origin"]').first();
      await originInput.click();
      await originInput.fill(origin);
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Fill destination
      const destInput = page.locator('input[id*="destination"], input[placeholder*="To"], input[name*="destination"]').first();
      await destInput.click();
      await destInput.fill(destination);
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Select dates using date picker
      await this.selectDates(page, departDate, returnDate);

      // Click search
      const searchButton = page.locator('button[type="submit"], button:has-text("Search"), button:has-text("Find flights")').first();
      await searchButton.click();

      // Wait for results
      try {
        await page.waitForSelector('.fare, .flight, .price', { timeout: 20000 });
      } catch (e) {
        logger.warn(`No results found for ${origin} → ${destination}`);
        return [];
      }

      // Extract fares
      fares.push(...await this.extractFares(page, origin, destination, departDate, returnDate));

    } catch (error) {
      logger.error(`Error searching ${origin} → ${destination}: ${error.message}`);
      
      // Save screenshot for debugging
      try {
        await page.screenshot({ 
          path: path.join(logDir, `error-${origin}-${destination}.png`) 
        });
      } catch (e) {}
      
    } finally {
      await page.close();
    }

    return fares;
  }

  async selectDates(page, departDate, returnDate) {
    // Try to open date picker and select dates
    const departInput = page.locator('input[id*="depart"], input[placeholder*="Depart"], input[name*="depart"]').first();
    await departInput.click();
    
    // Wait for calendar
    await page.waitForTimeout(1000);
    
    // Try to select date from calendar
    const [year, month, day] = departDate.split('-');
    
    // Navigate calendar if needed
    try {
      const dateButton = page.locator(`[data-date="${departDate}"], button:has-text("${day}")`).first();
      await dateButton.click({ timeout: 3000 });
    } catch (e) {
      logger.warn(`Could not select depart date ${departDate}, using input`);
      await departInput.fill(departDate);
    }

    // Return date
    const returnInput = page.locator('input[id*="return"], input[placeholder*="Return"], input[name*="return"]').first();
    await returnInput.click();
    await page.waitForTimeout(1000);
    
    try {
      const [rYear, rMonth, rDay] = returnDate.split('-');
      const returnButton = page.locator(`[data-date="${returnDate}"], button:has-text("${rDay}")`).first();
      await returnButton.click({ timeout: 3000 });
    } catch (e) {
      await returnInput.fill(returnDate);
    }

    await page.waitForTimeout(500);
  }

  async extractFares(page, origin, destination, departDate, returnDate) {
    const fares = [];

    const extractedData = await page.evaluate(() => {
      const results = [];
      
      // Look for fare containers
      const fareContainers = document.querySelectorAll('[class*="fare"], [class*="price"], [class*="flight"]');
      
      fareContainers.forEach(container => {
        const text = container.textContent || '';
        
        // Check for GoWild indicators
        const isGoWild = /go\s*wild|gowild/i.test(text);
        
        if (!isGoWild) return;
        
        // Extract price
        const priceMatch = text.match(/\$?(\d{2,4})/);
        const price = priceMatch ? parseInt(priceMatch[1]) : null;
        
        if (!price) return;
        
        // Extract flight info
        const times = text.match(/(\d{1,2}:\d{2}\s*[AP]M)/g) || [];
        const flightNum = text.match(/(F9\d{3,4})/i)?.[0];
        const duration = text.match(/(\d+h\s*\d+m|\d+\s*hr\s*\d+\s*min)/i)?.[0];
        
        results.push({
          price,
          departureTime: times[0] || 'N/A',
          arrivalTime: times[1] || 'N/A',
          flightNumber: flightNum || 'N/A',
          duration: duration || 'N/A',
          rawText: text.substring(0, 200)
        });
      });
      
      return results;
    });

    // Build fare objects
    extractedData.forEach(data => {
      const bookingUrl = `https://www.flyfrontier.com/travel/book/?origin=${origin}&destination=${destination}&depart=${departDate}&return=${returnDate}`;
      
      fares.push({
        origin,
        destination,
        departDate,
        returnDate,
        price: data.price,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        flightNumber: data.flightNumber,
        duration: data.duration,
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
      
      if (destination === origin) continue;

      logger.info(`[${i + 1}/${config.domesticAirports.length}] ${origin} → ${destination}`);
      
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

  // Save report
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `gowild-${reportDate}.json`);
  await fs.writeFile(logFile, JSON.stringify(report, null, 2));

  // Generate summary
  let summary = `🎯 *GoWild Fare Report - ${reportDate}*\n\n`;
  summary += `Found *${fares.length}* GoWild fares\n\n`;

  if (fares.length > 0) {
    summary += `*Top 10 Best Deals:*\n`;
    fares.slice(0, 10).forEach((fare, i) => {
      summary += `${i + 1}. ${fare.origin} → ${fare.destination}: *$${fare.price}*\n`;
      summary += `   ⏰ Dep: ${fare.departureTime} | Arr: ${fare.arrivalTime}\n`;
      summary += `   ✈️  Flight: ${fare.flightNumber} (${fare.duration})\n`;
      summary += `   🔗 ${fare.bookingUrl}\n\n`;
    });
  } else {
    summary += `😕 No GoWild fares found for today's search.\n`;
    summary += `_Try adjusting search dates or check back tomorrow._\n`;
  }

  summary += `\n⚠️ *GoWild Restrictions:*\n`;
  GOWILD_RESTRICTIONS.forEach(r => summary += `• ${r}\n`);

  return { report, summary };
}

async function sendSlackNotification(summary) {
  if (!config.slack.enabled) {
    logger.info('Slack notifications disabled');
    return;
  }

  try {
    const escapedSummary = summary.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const cmd = `openclaw message send --target "${config.slack.channel}" --message "${escapedSummary}"`;
    execSync(cmd, { stdio: 'pipe' });
    logger.info('Slack notification sent');
  } catch (error) {
    logger.error(`Slack notification failed: ${error.message}`);
    console.log('Slack notification content:');
    console.log(summary);
  }
}

async function main() {
  const searcher = new FrontierSearcherEnhanced();
  
  try {
    await searcher.init();

    // Calculate dates
    const today = new Date();
    const departDate = new Date(today);
    departDate.setDate(departDate.getDate() + 1);
    
    const returnDate = new Date(departDate);
    returnDate.setDate(returnDate.getDate() + config.returnDays);

    const formatDate = (date) => date.toISOString().split('T')[0];
    const departDateStr = formatDate(departDate);
    const returnDateStr = formatDate(returnDate);

    logger.info(`Searching: ${departDateStr} → ${returnDateStr}`);

    const fares = await searcher.searchAllRoutes(departDateStr, returnDateStr);
    const { report, summary } = await generateReport(fares);
    
    logger.info(`Found ${fares.length} GoWild fares`);
    await sendSlackNotification(summary);
    
    console.log(`\n✅ Complete! Found ${fares.length} GoWild fares`);
    console.log(`📊 Report: logs/gowild-${formatDate(today)}.json`);
    
  } catch (error) {
    logger.error(`Search failed: ${error.message}`);
    console.error(`❌ Failed: ${error.message}`);
    process.exit(1);
  } finally {
    await searcher.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { FrontierSearcherEnhanced, generateReport, sendSlackNotification };
