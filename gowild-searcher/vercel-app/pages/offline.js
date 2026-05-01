import { useState, useEffect } from 'react';
import Head from 'next/head';

/**
 * GoWild Fare Finder - Offline Page
 * Shown when user is offline
 */

export default function Offline() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (isOnline) {
      window.location.reload();
    }
  };

  return (
    <>
      <Head>
        <title>Offline - GoWild Fare Finder</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="container">
        <div className="offline-card">
          <div className="icon">✈️</div>
          <h1>You&apos;re Offline</h1>
          <p className="message">
            {isOnline 
              ? "You're back online! Click retry to refresh."
              : "Looks like you've lost your connection. Don't worry, you can still use some features."}
          </p>
          
          <button onClick={handleRetry} className="retry-button">
            🔄 Retry
          </button>
          
          <div className="offline-hints">
            <h3>What you can do:</h3>
            <ul>
              <li>View previously loaded search results</li>
              <li>Check your saved fares</li>
              <li>Explore the app interface</li>
            </ul>
            <p className="hint">Connect to the internet to search for new GoWild fares</p>
          </div>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        .offline-card {
          background: white;
          border-radius: 16px;
          padding: 2.5rem;
          max-width: 450px;
          width: 100%;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        h1 {
          color: #333;
          font-size: 1.8rem;
          margin: 0 0 1rem 0;
          font-weight: 700;
        }

        .message {
          color: #666;
          font-size: 1.1rem;
          margin: 0 0 1.5rem 0;
          line-height: 1.5;
        }

        .retry-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 1rem 2.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-bottom: 2rem;
        }

        .retry-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .retry-button:active {
          transform: translateY(0);
        }

        .offline-hints {
          text-align: left;
          background: #f8f9fa;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .offline-hints h3 {
          color: #667eea;
          margin: 0 0 1rem 0;
          font-size: 1rem;
        }

        .offline-hints ul {
          margin: 0 0 1rem 0;
          padding-left: 1.5rem;
          color: #555;
        }

        .offline-hints li {
          margin: 0.5rem 0;
          line-height: 1.4;
        }

        .hint {
          color: #888;
          font-size: 0.9rem;
          margin: 0;
          font-style: italic;
        }

        @media (max-width: 480px) {
          .offline-card {
            padding: 2rem 1.5rem;
          }

          h1 {
            font-size: 1.5rem;
          }

          .icon {
            font-size: 3rem;
          }
        }
      `}</style>
    </>
  );
}
