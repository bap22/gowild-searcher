import { getResultsByDate } from '../../lib/results.js';

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date, fare } = req.body || {};

  try {
    let results;
    let messageContent;

    if (date) {
      // Resend notification for specific date
      results = getResultsByDate(date);
      
      if (!results) {
        return res.status(404).json({
          error: 'Results not found',
          date,
        });
      }

      messageContent = formatSlackMessage(results);
    } else if (fare) {
      // Resend notification for specific fare
      messageContent = formatSingleFareMessage(fare);
    } else {
      // Get latest results
      const { getLatestResults } = await import('../../lib/results.js');
      results = getLatestResults();
      
      if (!results) {
        return res.status(404).json({
          error: 'No results found',
        });
      }

      messageContent = formatSlackMessage(results);
    }

    // Send to Slack via OpenClaw
    const config = require('../../config.json');
    const channel = config.slack?.channel || '@brett';
    
    // Escape the message for shell
    const escaped = messageContent
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
    
    const { exec } = require('child_process');
    const cmd = `openclaw message send --target "${channel}" --message "${escaped}"`;
    
    await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Slack notification sent',
      channel,
    });

  } catch (error) {
    console.error('Slack notification error:', error);
    return res.status(500).json({
      error: 'Failed to send Slack notification',
      details: error.message,
    });
  }
}

/**
 * Format full results for Slack
 */
function formatSlackMessage(report) {
  const { searchDate, totalFaresFound, fares, restrictions } = report;
  
  let summary = `🎯 *GoWild Fare Report - ${searchDate}*\n\n`;
  summary += `Found *${totalFaresFound}* GoWild fares\n\n`;
  
  if (fares && fares.length > 0) {
    summary += '*Top 10 Best Deals:*\n';
    fares.slice(0, 10).forEach((fare, i) => {
      summary += `${i + 1}. ${fare.origin} → ${fare.destination}: *$${fare.price}*\n`;
      summary += `   ⏰ Dep: ${fare.departureTime} | Arr: ${fare.arrivalTime}\n`;
      summary += `   ✈️  Flight: ${fare.flightNumber} (${fare.duration})\n`;
      summary += `   🔗 ${fare.bookingUrl}\n\n`;
    });
  } else {
    summary += '😕 No GoWild fares found for today\'s search.\n';
    summary += '_Try adjusting search dates or check back tomorrow._\n';
  }
  
  summary += '\n⚠️ *GoWild Restrictions:*\n';
  restrictions?.forEach(r => {
    summary += `• ${r}\n`;
  });
  
  return summary;
}

/**
 * Format single fare for Slack
 */
function formatSingleFareMessage(fare) {
  let message = `🎯 *GoWild Fare Alert*\n\n`;
  message += `${fare.origin} → ${fare.destination}\n`;
  message += `💰 *$${fare.price}*\n\n`;
  message += `📅 ${fare.departDate} → ${fare.returnDate}\n`;
  message += `⏰ Dep: ${fare.departureTime} | Arr: ${fare.arrivalTime}\n`;
  message += `✈️  Flight: ${fare.flightNumber} (${fare.duration})\n\n`;
  message += `🔗 ${fare.bookingUrl}\n\n`;
  message += `⚠️ GoWild fares are non-refundable and non-transferable`;
  
  return message;
}
