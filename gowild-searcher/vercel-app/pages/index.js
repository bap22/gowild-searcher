import { useState, useEffect } from 'react';
import Head from 'next/head';

/**
 * GoWild Fare Searcher - Main Page
 * Clean UI inspired by the1491club.com/search
 * Purple gradient theme with PWA support
 */

export default function Home() {
  const [origin, setOrigin] = useState('SLC');
  const [dateRange, setDateRange] = useState('both');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if user should see install prompt
    const hasBeenPrompted = localStorage.getItem('gowild-install-prompted');
    const lastPromptTime = localStorage.getItem('gowild-install-prompt-time');
    const now = Date.now();
    
    // Only show prompt once per 7 days
    if (!hasBeenPrompted || (lastPromptTime && now - parseInt(lastPromptTime) > 7 * 24 * 60 * 60 * 1000)) {
      // Android: listen for beforeinstallprompt
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallBanner(true);
        localStorage.setItem('gowild-install-prompted', 'true');
        localStorage.setItem('gowild-install-prompt-time', now.toString());
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    }
    
    deferredPrompt.clearPrompt();
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('gowild-install-prompted', 'true');
    localStorage.setItem('gowild-install-prompt-time', Date.now().toString());
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin,
          dateRange,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data);
    } catch (err) {
      setError(err.message || 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>GoWild Fare Searcher</title>
        <meta name="description" content="Find Frontier GoWild fares under $100" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Apple PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GoWild" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#667eea" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <main className="container">
        {/* PWA Install Banner */}
        {showInstallBanner && !isInstalled && (
          <div className="install-banner">
            <div className="banner-content">
              {isIOS ? (
                <>
                  <span className="banner-icon">📱</span>
                  <div className="banner-text">
                    <strong>Install GoWild</strong>
                    <p>Tap <span className="share-icon">⎋</span> then "Add to Home Screen"</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="banner-icon">✈️</span>
                  <div className="banner-text">
                    <strong>Install GoWild</strong>
                    <p>Get quick access to fare deals!</p>
                  </div>
                </>
              )}
            </div>
            <div className="banner-actions">
              {!isIOS && (
                <button onClick={handleInstallClick} className="install-button">
                  Install
                </button>
              )}
              <button onClick={dismissInstallBanner} className="dismiss-button">
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="header">
          <h1>🌟 GoWild Fare Searcher</h1>
          <p className="subtitle">Find Frontier GoWild fares under $100</p>
        </div>

        <div className="search-card">
          <form onSubmit={handleSearch} className="search-form">
            <div className="form-group">
              <label htmlFor="origin">Origin Airport</label>
              <select
                id="origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="select-input"
                disabled={loading}
              >
                <option value="SLC">Salt Lake City (SLC)</option>
                <option value="DEN">Denver (DEN)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dateRange">Travel Dates</label>
              <select
                id="dateRange"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="select-input"
                disabled={loading}
              >
                <option value="today">Today Only</option>
                <option value="tomorrow">Tomorrow Only</option>
                <option value="both">Today & Tomorrow</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="search-button"
              disabled={loading}
            >
              {loading ? (
                <span className="loading-spinner">Searching...</span>
              ) : (
                '🔍 Search for GoWild Availability'
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="error-card">
            <p className="error-message">❌ {error}</p>
          </div>
        )}

        {results && (
          <div className="results-section">
            <div className="results-header">
              <h2>Search Results</h2>
              <p className="results-meta">
                {results.count} fares found from {results.searchParams.origin} • 
                {results.performance?.elapsedMs ? ` ${results.performance.elapsedMs}ms` : ''}
              </p>
            </div>

            {results.fares.length === 0 ? (
              <div className="no-results">
                <p>😕 No GoWild fares found under $100 for your search criteria</p>
                <p className="hint">Try searching from a different origin or date range</p>
              </div>
            ) : (
              <div className="results-grid">
                {results.fares.map((fare, index) => (
                  <FareCard key={`${fare.route}-${fare.departureDate}-${index}`} fare={fare} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="info-section">
          <h3>ℹ️ About GoWild Fares</h3>
          <ul>
            <li>GoWild fares are Frontier&apos;s lowest-priced tickets</li>
            <li>Only valid for flights departing <strong>today or tomorrow</strong></li>
            <li>Prices shown are base fares (taxes & fees extra)</li>
            <li>Subject to availability and can change quickly</li>
          </ul>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        .header {
          text-align: center;
          color: white;
          margin-bottom: 2rem;
        }

        .header h1 {
          font-size: 2.5rem;
          margin: 0 0 0.5rem 0;
          font-weight: 700;
        }

        /* PWA Install Banner */
        .install-banner {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          max-width: 500px;
          margin: 0 auto 1.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .banner-icon {
          font-size: 2rem;
        }

        .banner-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .banner-text strong {
          color: #333;
          font-size: 1rem;
        }

        .banner-text p {
          color: #666;
          font-size: 0.85rem;
          margin: 0;
        }

        .share-icon {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-size: 0.9rem;
          margin: 0 0.25rem;
        }

        .banner-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .install-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 0.6rem 1.2rem;
          font-size: 0.95rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .install-button:hover {
          transform: translateY(-1px);
        }

        .dismiss-button {
          background: transparent;
          border: none;
          color: #999;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
        }

        .dismiss-button:hover {
          color: #666;
        }

        .subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
          margin: 0;
        }

        .search-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          max-width: 500px;
          margin: 0 auto 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .search-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #333;
          font-size: 0.9rem;
        }

        .select-input {
          padding: 0.75rem 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .select-input:hover {
          border-color: #667eea;
        }

        .select-input:focus {
          outline: none;
          border-color: #764ba2;
        }

        .search-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 0.5rem;
        }

        .search-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .search-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .loading-spinner {
          display: inline-block;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .error-card {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 8px;
          padding: 1rem;
          max-width: 500px;
          margin: 0 auto 2rem;
        }

        .error-message {
          color: #c00;
          margin: 0;
          font-weight: 500;
        }

        .results-section {
          max-width: 1200px;
          margin: 0 auto;
        }

        .results-header {
          color: white;
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .results-header h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.8rem;
        }

        .results-meta {
          margin: 0;
          opacity: 0.9;
          font-size: 0.95rem;
        }

        .no-results {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          color: #333;
        }

        .no-results p {
          margin: 0.5rem 0;
        }

        .hint {
          font-size: 0.9rem;
          opacity: 0.7;
        }

        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        .info-section {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 1.5rem;
          max-width: 800px;
          margin: 2rem auto 0;
          color: #333;
        }

        .info-section h3 {
          margin: 0 0 1rem 0;
          color: #667eea;
        }

        .info-section ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .info-section li {
          margin: 0.5rem 0;
          line-height: 1.5;
        }

        @media (max-width: 640px) {
          .container {
            padding: 1rem;
          }

          .header h1 {
            font-size: 1.8rem;
          }

          .search-card {
            padding: 1.5rem;
          }

          .results-grid {
            grid-template-columns: 1fr;
          }

          /* Mobile-optimized: Larger touch targets */
          .select-input {
            padding: 1rem 1.2rem;
            font-size: 1.1rem;
          }

          .search-button {
            padding: 1.2rem 2rem;
            font-size: 1.2rem;
          }

          /* Install banner mobile styles */
          .install-banner {
            flex-direction: column;
            padding: 0.75rem;
          }

          .banner-content {
            width: 100%;
          }

          .banner-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .install-button {
            padding: 0.75rem 1.5rem;
            font-size: 1rem;
          }

          /* Prevent zoom on double-tap */
          * {
            touch-action: manipulation;
          }

          /* Larger buttons for touch */
          button {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </>
  );
}

/**
 * Individual Fare Card Component
 */
function FareCard({ fare }) {
  const stopsText = fare.stops === 0 ? 'Nonstop' : `${fare.stops} stop${fare.stops > 1 ? 's' : ''}`;

  return (
    <div className="fare-card">
      <div className="fare-header">
        <div className="route">
          <span className="airport-code">{fare.origin}</span>
          <span className="arrow">→</span>
          <span className="airport-code">{fare.destination}</span>
        </div>
        <div className="price">{fare.displayPrice}</div>
      </div>

      <div className="fare-details">
        <div className="detail-row">
          <span className="detail-label">Date:</span>
          <span className="detail-value">{formatDate(fare.departureDate)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Time:</span>
          <span className="detail-value">{fare.departureTime}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Stops:</span>
          <span className="detail-value">{stopsText}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Flight:</span>
          <span className="detail-value">{fare.flightNumber}</span>
        </div>
      </div>

      <a 
        href={fare.bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="book-button"
      >
        Book on flyfrontier.com ↗
      </a>

      <style jsx>{`
        .fare-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .fare-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .fare-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #f0f0f0;
        }

        .route {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          font-size: 1.3rem;
          color: #333;
        }

        .airport-code {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 1.1rem;
        }

        .arrow {
          color: #999;
          font-size: 1rem;
        }

        .price {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1.4rem;
        }

        .fare-details {
          margin-bottom: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.35rem 0;
          font-size: 0.9rem;
        }

        .detail-label {
          color: #666;
          font-weight: 500;
        }

        .detail-value {
          color: #333;
          font-weight: 600;
        }

        .book-button {
          display: block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.2s;
        }

        .book-button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}

/**
 * Format date from YYYY-MM-DD to readable format
 */
function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}
