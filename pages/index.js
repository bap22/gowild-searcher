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
  const [customDates, setCustomDates] = useState({
    departDate: '',
    returnDate: '',
  });

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
        body: JSON.stringify(customDates),
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Search completed successfully!', 'success');
        fetchData(); // Refresh data
      } else {
        showToast(`Search failed: ${data.error}`, 'error');
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

  function getTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  function getReturnDate() {
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 3); // +2 days from tomorrow
    return returnDate.toISOString().split('T')[0];
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
                <div className="date-inputs">
                  <div className="input-group">
                    <label>Departure Date</label>
                    <input
                      type="date"
                      value={customDates.departDate}
                      onChange={(e) => setCustomDates({ ...customDates, departDate: e.target.value })}
                      min={getTomorrow()}
                    />
                  </div>
                  <div className="input-group">
                    <label>Return Date</label>
                    <input
                      type="date"
                      value={customDates.returnDate}
                      onChange={(e) => setCustomDates({ ...customDates, returnDate: e.target.value })}
                      min={getReturnDate()}
                    />
                  </div>
                </div>

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
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleResendSlack(null)}
                            disabled={sendingSlack}
                          >
                            📬 Resend All
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Restrictions */}
                  <div className="restrictions">
                    <h3>⚠️ GoWild Restrictions</h3>
                    <ul>
                      {latestResults.restrictions?.map((restriction, i) => (
                        <li key={i}>{restriction}</li>
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

            {/* Quick Actions */}
            <div className="card" style={{ marginTop: '2rem' }}>
              <h2>⚡ Quick Actions</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  className="btn btn-success"
                  onClick={() => handleResendSlack(selectedDate)}
                  disabled={!selectedDate || sendingSlack}
                >
                  📬 Resend Latest to Slack
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={fetchData}
                  disabled={loading}
                >
                  🔄 Refresh Data
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className="card" style={{ marginTop: '2rem' }}>
              <h2>ℹ️ About</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                This dashboard searches Frontier Airlines for GoWild fares from your home airport to domestic US destinations.
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Automated searches run daily at 6:00 AM MT.
              </p>
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
