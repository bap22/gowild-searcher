import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    
    // Fetch results on mount
    fetchResults();
  }, []);

  async function fetchResults() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/results');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load results');
      }
      
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const latest = results?.latest;
  const flights = latest?.flights || [];
  const lastUpdated = latest?.lastUpdated ? new Date(latest.lastUpdated).toLocaleString() : 'Unknown';

  return (
    <>
      <Head>
        <title>GoWild Fare Finder</title>
        <meta name="description" content="Find Frontier GoWild fares under $100" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GoWild" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#667eea" />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <main style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>🎯 GoWild Fare Finder</h1>
          <p style={styles.subtitle}>Frontier GoWild fares under $100</p>
        </header>

        {loading ? (
          <div style={styles.loading}>Loading fares...</div>
        ) : error ? (
          <div style={styles.error}>
            <strong>Error:</strong> {error}
            <button onClick={fetchResults} style={styles.retryButton}>Retry</button>
          </div>
        ) : flights.length === 0 ? (
          <div style={styles.noResults}>
            <p>😕 No GoWild fares found right now.</p>
            <p>Check back later or try a different origin airport.</p>
          </div>
        ) : (
          <>
            <div style={styles.resultsHeader}>
              <h2 style={styles.resultsTitle}>{flights.length} GoWild Fares Found</h2>
              <p style={styles.resultsMeta}>
                From {latest?.origin || 'SLC'} • Updated: {lastUpdated}
              </p>
            </div>

            <div style={styles.flightList}>
              {flights.map((flight, idx) => (
                <div key={idx} style={styles.flightCard}>
                  <div style={styles.flightHeader}>
                    <span style={styles.route}>
                      {flight.origin} → {flight.destination}
                    </span>
                    <span style={styles.price}>${flight.price}</span>
                  </div>
                  <div style={styles.flightDetails}>
                    <span>📅 {new Date(flight.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span>⏰ {flight.depart_time}</span>
                    <span>{flight.stops === 0 ? '✈️ Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</span>
                  </div>
                  <a
                    href={flight.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.bookButton}
                  >
                    Book Now →
                  </a>
                </div>
              ))}
            </div>
          </>
        )}

        <footer style={styles.footer}>
          <p>GoWild fares are non-refundable and subject to availability.</p>
          <p>Searches run daily at 6 AM MT.</p>
        </footer>
      </main>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    color: 'white',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '10px',
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    fontSize: '1.1rem',
    opacity: 0.9,
  },
  loading: {
    textAlign: 'center',
    color: 'white',
    fontSize: '1.2rem',
    padding: '40px',
  },
  error: {
    maxWidth: '600px',
    margin: '0 auto 40px',
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    color: '#c00',
  },
  retryButton: {
    marginTop: '10px',
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '16px',
    color: '#666',
  },
  resultsHeader: {
    textAlign: 'center',
    marginBottom: '30px',
    color: 'white',
  },
  resultsTitle: {
    fontSize: '2rem',
    marginBottom: '10px',
  },
  resultsMeta: {
    fontSize: '1rem',
    opacity: 0.9,
  },
  flightList: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'grid',
    gap: '16px',
  },
  flightCard: {
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  flightHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  route: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#333',
  },
  price: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#667eea',
  },
  flightDetails: {
    display: 'flex',
    gap: '20px',
    marginBottom: '16px',
    color: '#666',
    fontSize: '0.95rem',
    flexWrap: 'wrap',
  },
  bookButton: {
    display: 'inline-block',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    marginTop: '60px',
    padding: '20px',
    color: 'white',
    opacity: 0.8,
    fontSize: '0.9rem',
  },
};
