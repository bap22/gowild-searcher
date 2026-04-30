import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [latestResults, setLatestResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sendingSlack, setSendingSlack] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchInstructions, setSearchInstructions] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch latest results
      const resultsRes = await fetch('/api/results?limit=1');
      const resultsData = await resultsRes.json();
      if (resultsData.results && resultsData.results.length > 0) {
        setLatestResults(resultsData.results[0]);
        setSelectedDate(resultsData.results[0].searchDate);
      }

      // Fetch history
      const historyRes = await fetch('/api/results?limit=10');
      const historyData = await historyRes.json();
      setHistory(historyData.results || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load data', 'error');
    }
  }

  async function handleManualSearch() {
    setSearching(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (res.ok) {
        setSearchInstructions(data.instructions);
        showToast('See instructions below', 'info');
      } else {
        showToast(`Error: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Search error:', error);
      showToast('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  }

  async function handleResendSlack(date = null) {
    setSendingSlack(true);
    try {
      const res = await fetch('/api/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: date || selectedDate }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(`Slack notification sent to ${data.channel}`, 'success');
      } else {
        showToast(`Failed to send: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Slack error:', error);
      showToast('Failed to send Slack notification', 'error');
    } finally {
      setSendingSlack(false);
    }
  }

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  }

  return (
    <>
      <Head>
        <title>GoWild Searcher Dashboard</title>
        <meta name="description" content="Frontier GoWild Fare Searcher" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎯</text></svg>" />
      </Head>

      <div className="container">
        <header className="header">
          <h1>🎯 GoWild Searcher</h1>
          <p>Frontier Airlines GoWild Fare Tracker</p>
        </header>

        <div className="dashboard">
          {/* Main Content */}
          <div>
            {/* Search Controls */}
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h2>🔍 Manual Search</h2>
              
              <div className="search-controls">
                <button
                  className="btn btn-primary"
                  onClick={handleManualSearch}
                  disabled={searching}
                >
                  {searching ? (
                    <>
                      <span className="loading-spinner"></span>
                      Searching...
                    </>
                  ) : (
                    <>🚀 Run Search</>
                  )}
                </button>
              </div>

              {searchInstructions && (
                <div className="search-instructions" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <h3 style={{ marginBottom: '1rem', color: '#60a5fa' }}>📋 How to Run a Manual Search</h3>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    Due to Vercel's serverless architecture, searches must be run locally where Python is installed.
                  </p>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#fbbf24' }}>Run this command:</strong>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <code style={{ flex: 1, padding: '0.75rem', background: '#1f2937', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.875rem', color: '#10b981' }}>
                        {searchInstructions.local}
                      </code>
                      <button
                        className="btn btn-secondary"
                        onClick={() => copyToClipboard(searchInstructions.local)}
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {searchInstructions.note}
                    </p>
                  </div>

                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#60a5fa' }}>⏰ Automated Searches:</strong>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {searchInstructions.automated}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Latest Results */}
            <div className="card">
              <h2>
                📊 Latest Results
                {latestResults && (
                  <span className="status-badge status-success">
                    {latestResults.searchDate}
                  </span>
                )}
              </h2>

              {loading ? (
                <div className="loading">
                  <span className="loading-spinner"></span>
                  Loading...
                </div>
              ) : latestResults ? (
                <>
                  {/* Stats */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{latestResults.totalFaresFound}</div>
                      <div className="stat-label">Fares Found</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">
                        ${latestResults.fares?.length > 0 ? Math.min(...latestResults.fares.map(f => f.price)) : 'N/A'}
                      </div>
                      <div className="stat-label">Best Price</div>
                    </div>
                  </div>

                  {/* Fare List */}
                  <div className="fare-list">
                    {latestResults.fares?.slice(0, 10).map((fare, index) => (
                      <div key={index} className="fare-card">
                        <div className="fare-header">
                          <div className="fare-route">
                            {fare.origin} → {fare.destination}
                          </div>
                          <div className="fare-price">${fare.price}</div>
                        </div>

                        <div className="fare-details">
                          <div className="fare-detail">
                            <span>📅</span>
                            <span>{fare.departDate}</span>
                          </div>
                          <div className="fare-detail">
                            <span>⏰</span>
                            <span>{fare.departureTime} - {fare.arrivalTime}</span>
                          </div>
                          <div className="fare-detail">
                            <span>✈️</span>
                            <span>{fare.flightNumber}</span>
                          </div>
                          <div className="fare-detail">
                            <span>⏱️</span>
                            <span>{fare.duration}</span>
                          </div>
                        </div>

                        <div className="fare-actions">
                          <a
                            href={fare.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                          >
                            🔗 Book Now
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="card-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-success"
                      onClick={() => handleResendSlack(null)}
                      disabled={sendingSlack}
                    >
                      📬 Send Latest to Slack
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={fetchData}
                      disabled={loading}
                    >
                      🔄 Refresh
                    </button>
                  </div>

                  {/* Restrictions */}
                  <div className="restrictions" style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                    <h3 style={{ marginBottom: '0.5rem', color: '#fbbf24' }}>⚠️ GoWild Restrictions</h3>
                    <ul style={{ fontSize: '0.875rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>
                      {latestResults.restrictions?.map((restriction, i) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>{restriction}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <p>No results yet. Run your first search!</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Search History */}
            <div className="card">
              <h2>📜 Search History</h2>
              
              {history.length > 0 ? (
                <div className="history-list">
                  {history.map((result, index) => (
                    <div
                      key={index}
                      className={`history-item ${selectedDate === result.searchDate ? 'active' : ''}`}
                      onClick={() => setSelectedDate(result.searchDate)}
                    >
                      <span className="history-date">{formatDate(result.searchDate)}</span>
                      <span className="history-count">{result.totalFaresFound} fares</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No search history</p>
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="card" style={{ marginTop: '2rem' }}>
              <h2>ℹ️ About</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                This dashboard displays Frontier Airlines GoWild fares from your home airport to domestic US destinations.
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <strong>Automated searches:</strong> Daily at 6:00 AM MT via Python scheduler
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <strong>Manual searches:</strong> Run locally and commit results to GitHub
              </p>
            </div>

            {/* GitHub Link */}
            <div className="card" style={{ marginTop: '2rem' }}>
              <h2>🔗 Links</h2>
              <a
                href="https://github.com/bap22/gowild-searcher"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ display: 'block', textAlign: 'center' }}
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
