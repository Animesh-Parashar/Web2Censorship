// vibe-check/app/admin/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [censorBadVibes, setCensorBadVibes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchCensorshipState = useCallback(async () => {
    setLoading(true);
    setMessage('Fetching current censorship status...');

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'censor_bad_vibes')
      .single();

    if (error) {
      console.error('Error fetching censorship state from Supabase:', error);
      console.error('Supabase error object:', error);

      if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
        setMessage("Censorship setting not found in app_settings. Defaulting to INACTIVE. Please ensure a row with key='censor_bad_vibes' exists and RLS is disabled for 'app_settings'.");
        setCensorBadVibes(false);
      } else {
        setMessage(`Failed to fetch current setting: ${error.message || 'Unknown error'}. Check Supabase settings/RLS for 'app_settings'.`);
        setCensorBadVibes(false);
      }
    } else {
      setCensorBadVibes(data?.value || false);
      setMessage('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Only fetch state *after* login, or if already logged in (e.g., from a fresh browser session with local state, though we don't have that here)
    // The previous structure was fine if loggedIn was managed via localStorage or similar.
    // For this demo, let's make it simpler: fetch the state first, but disable controls until login.
    fetchCensorshipState(); // Fetch initial state on mount

    if (!loggedIn) {
        setMessage('Please log in.'); // Initial message before login
    }
  }, [fetchCensorshipState, loggedIn]); // Add loggedIn here to re-evaluate message after login

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD_LOCAL) { // If you want to test this locally and quickly
        setLoggedIn(true);
        setMessage('Logged in! Now you can control the vibes.');
        // After successful login, refresh the censorship state if needed
        fetchCensorshipState(); // This is already called on initial render, so might not be strictly needed, but ensures fresh data.
    } else if (password) {
      setLoggedIn(true); // For demo, let's assume a non-empty password means "trying to log in" for the toggle API
      setMessage('Attempting login...');
      // In a real app, this would be an API call to verify the password.
      // For this demo, the password check happens on the server *when toggling*.
      // We'll proceed to the control panel but keep buttons disabled until the server confirms a toggle.
      setMessage('Logged in! Control access will be validated on toggle action.');
      fetchCensorshipState();
    } else {
      setMessage('Please enter a password.');
    }
  };


  const toggleCensorship = async () => {
    if (!loggedIn) {
      setMessage('Please log in to toggle censorship.');
      return;
    }

    setLoading(true);
    setMessage('Updating setting...');
    try {
      const response = await fetch('/api/admin/toggle-censorship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, newState: !censorBadVibes }),
      });

      if (response.ok) {
        const data = await response.json();
        setCensorBadVibes(data.newState);
        setMessage(`Censorship is now ${data.newState ? 'ON' : 'OFF'}. Vibe status updated instantly!`);
      } else {
        const errorData = await response.json();
        // Check if the error is due to unauthorized password (401)
        if (response.status === 401) {
            setMessage(`Authentication failed. Incorrect password for admin. Error: ${errorData.error}`);
        } else {
            setMessage(`Error: ${errorData.error || 'Failed to update setting.'}`);
        }
        console.error('API Error:', errorData);
      }
    } catch (error) {
      setMessage(`Network error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Network error toggling censorship:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <h1 className="app-title">
        Vibe Check Admin Control
      </h1>
      <p className="app-subtitle">
        Toggle the "Bad Vibes" censorship. This demonstrates the power of a central authority to instantly modify platform behavior.
      </p>

      <div className="admin-control-card">
        {!loggedIn ? ( // Show login form if not logged in
          <form onSubmit={handleLogin} className="admin-form">
            <h1>Admin Login</h1>
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-input"
              required
            />
            <button
              type="submit"
              className="admin-login-button"
            >
              Login
            </button>
            {message && <p className="admin-message">{message}</p>}
          </form>
        ) : ( // Show controls if logged in
          <>
            <h2>Censorship Status</h2>
            {loading ? (
              <p className="admin-status-text">Loading status...</p>
            ) : (
              <>
                <p className="admin-status-text">
                  "Bad Vibes" Censorship is: {/* FIX: Changed to double quotes */}
                  <span className={`status-value ${censorBadVibes ? 'active' : 'inactive'}`}>
                    {censorBadVibes ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </p>
                <button
                  onClick={toggleCensorship}
                  className={`admin-toggle-button ${censorBadVibes ? 'active-button' : 'inactive-button'}`}
                  disabled={loading} // Only loading, not !loggedIn, as loggedIn is now the parent check
                >
                  {censorBadVibes ? 'Deactivate Censorship' : 'Activate Censorship'}
                </button>
              </>
            )}
            {message && (
              <p className={`admin-message ${message.startsWith('Error') ? 'error-text' : 'info-text'}`}>
                {message}
              </p>
            )}
          </>
        )}
      </div>

      <p className="admin-info-text">
        {"This demonstrates how a central authority can 'change the code' (i.e., modify application behavior) in real-time by updating a configuration in the database, without requiring a redeployment."} {/* FIX: Changed to double quotes */}
      </p>
    </div>
  );
}