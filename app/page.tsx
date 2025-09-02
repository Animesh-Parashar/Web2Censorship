// vibe-check/app/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Vibe {
  id: string;
  name: string;
  count: number;
}

export default function Home() {
  const [vibeCounts, setVibeCounts] = useState<Vibe[]>([]);
  const [overallVibe, setOverallVibe] = useState<string>('Checking the vibes...');
  const [loading, setLoading] = useState(true);

  const calculateOverallVibe = useCallback((counts: Vibe[]) => {
    if (!counts.length) return 'No vibes yet!';

    const goodVibes = counts.find(v => v.name.includes('Good Vibes'))?.count || 0;
    const neutralVibes = counts.find(v => v.name.includes('Neutral Vibes'))?.count || 0;
    const badVibes = counts.find(v => v.name.includes('Bad Vibes'))?.count || 0;

    const totalVotes = goodVibes + neutralVibes + badVibes;

    if (totalVotes === 0) return 'No votes yet!';

    const goodPercentage = (goodVibes / totalVotes) * 100;
    const badPercentage = (badVibes / totalVotes) * 100;

    if (goodPercentage > 60) {
      return '✨ Pure Good Vibes! ✨';
    } else if (goodPercentage > 30 && badPercentage < 20) {
      return '😌 Chill Vibes, mostly good.';
    } else if (badPercentage > 40) {
      return '😬 Some seriously bad vibes brewing...';
    } else if (badPercentage > 20) {
      return '🧐 Mixed vibes, lean negative.';
    } else {
      return '⚖️ Neutral vibes, balanced.';
    }
  }, []);

  useEffect(() => {
    const fetchInitialVibes = async () => {
      const { data, error } = await supabase.from('vibe_counts').select('*');
      if (error) {
        console.error('Error fetching initial vibes:', error);
      } else {
        setVibeCounts(data);
        setOverallVibe(calculateOverallVibe(data));
      }
      setLoading(false);
    };

    fetchInitialVibes();

    const channel = supabase
      .channel('vibe_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vibe_counts' },
        (_payload) => {
          supabase.from('vibe_counts').select('*').then(({ data, error }) => {
            if (error) console.error('Error re-fetching vibes:', error);
            else {
              setVibeCounts(data || []);
              setOverallVibe(calculateOverallVibe(data || []));
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calculateOverallVibe]);

  const handleVote = async (vibeName: string) => {
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vibeName }),
      });

      if (!response.ok) {
        console.error('Failed to vote:', response.statusText);
      } else {
        const data = await response.json();
        if (data.censored) {
          alert(`Your vote for "${vibeName}" was recorded, but policy prevented it from impacting the public counter. (Check console for server message)`);
        }
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  if (loading) {
    return (
      <div className="app-container loading-state">
        <p className="app-title loading-text">Loading Vibe Check...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Background blobs for aesthetic */}
      <div className="bg-blob"></div>
      <div className="bg-blob"></div>
      <div className="bg-blob"></div>

      <h1 className="app-title">Vibe Check</h1>
      <p className="app-subtitle">
        Vote on the current vibes, and see how they evolve in real-time!
      </p>

      <div className="vibe-grid">
        {vibeCounts
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((vibe) => (
            <div key={vibe.id} className="vibe-card">
              <h2 className="vibe-name">
                {vibe.name}
              </h2>
              <p className="vibe-count">
                {vibe.count}
              </p>
              <button
                onClick={() => handleVote(vibe.name)}
                className="vote-button"
              >
                Cast Your Vote!
              </button>
            </div>
          ))}
      </div>

      <div className="overall-vibe-container">
        <p className="overall-vibe-text">
          Overall Vibe: <span className="overall-vibe-value">{overallVibe}</span>
        </p>
      </div>

      <footer className="app-footer">
        <p>
          <span className="footer-note-title">Note on Centralization:</span> {'If \'Bad Vibes\' votes aren\'t'}
          {' changing the counter, it\'s not a bug. It\'s a feature demonstrating how a central authority (this app\'s backend)'}
          {' can control and censor information in Web2 environments by changing a configuration in real-time.'}
        </p>
        <p className="text-xs">
          (For the presenter: Access the admin panel at <a href="/admin" className="footer-admin-link">/admin</a> to toggle censorship.)
        </p>
      </footer>
    </div>
  );
}