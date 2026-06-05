'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { searchUsers, sendFriendRequest } from '@/lib/friends';
import { UserProfile } from '@/lib/types';

/**
 * Text input for searching users by username with search results list.
 * Allows sending friend requests to matching users.
 */
export default function FriendSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const users = await searchUsers(query.trim());
      setResults(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendRequest(userId: string) {
    try {
      await sendFriendRequest(userId);
      setSentRequests((prev) => new Set(prev).add(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    }
  }

  return (
    <div className="font-mono">
      {/* Search input */}
      <div className="flex border border-border">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by username..."
          className="flex-1 px-3 py-2 bg-background text-foreground text-sm placeholder:text-muted outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-3 py-2 border-l border-border bg-background text-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
          aria-label="Search users"
        >
          <Search size={16} />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-foreground mt-2">{error}</p>
      )}

      {/* Loading state */}
      {loading && (
        <p className="text-xs text-muted mt-2">Searching...</p>
      )}

      {/* Search results */}
      {results.length > 0 && (
        <ul className="mt-2 border border-border divide-y divide-border">
          {results.map((user) => (
            <li key={user.id} className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-foreground">{user.username}</span>
              {sentRequests.has(user.id) ? (
                <span className="text-xs text-muted">Sent</span>
              ) : (
                <button
                  onClick={() => handleSendRequest(user.id)}
                  className="text-xs border border-border px-2 py-1 bg-background text-foreground hover:bg-foreground hover:text-background transition-colors"
                >
                  Add
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* No results */}
      {!loading && results.length === 0 && query.trim() && !error && (
        <p className="text-xs text-muted mt-2">No users found</p>
      )}
    </div>
  );
}
