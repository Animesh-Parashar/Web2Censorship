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

  // Function to fetch current censorship state from Supabase
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
        // FIX: Escaped apostrophes for the string literal
        setMessage("Censorship setting not found in app_settings. Defaulting to INACTIVE. Please ensure a row with key='censor_bad_vibes' exists and RLS is disabled for 'app_settings'.");
        setCensorBadVibes(false); // Default to inactive if the row doesn't exist
      } else {
        // FIX: Escaped apostrophes for the string literal
        setMessage(`Failed to fetch current setting: ${error.message || 'Unknown error'}. Check Supabase settings/RLS for 'app_settings'.`);
        setCensorBadVibes(false); // Default to inactive on other errors too
      }
    } else {
      setCensorBadVibes(data?.value || false);
      setMessage(''); // Clear message on success
    }
    setLoading(false);
  }, []);

  // Effect to fetch state on component mount
  useEffect(() => {
    fetchCensorshipState(); // Always fetch on mount to get initial status
    setMessage('Please log in.'); // Set initial message
  }, [fetchCensorshipState]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password) { // Just checking if password field is non-empty for client-side display logic
      setLoggedIn(true);
      setMessage('Logged in! Control access will be validated on toggle action.');
      // No need to fetchCensorshipState here, as it's done on mount and Realtime keeps it updated.
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
        if (response.status === 401) {
            // FIX: Escaped apostrophes for the string literal
            setMessage(`Authentication failed. Incorrect password for admin. Error: ${errorData.error}.`);
        } else {
            // FIX: Escaped apostrophes for the string literal
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
                  {'\'Bad Vibes\' Censorship is:'} {/* FIX: Using string literal with escaped apostrophes, or using &apos; */}
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
            {/* Display messages for logged-in state operations */}
            {message && (
              <p className={`admin-message ${message.startsWith('Error') ? 'error-text' : 'info-text'}`}>
                {message}
              </p>
            )}
          </>
        )}
      </div>

      <p className="admin-info-text">
        {"This demonstrates how a central authority can 'change the code' (i.e., modify application behavior) in real-time by updating a configuration in the database, without requiring a redeployment."} {/* FIX: Escaped apostrophes */}
      </p>
    </div>
  );
}