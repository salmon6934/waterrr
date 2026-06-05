import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { canAccessFeature, Feature, generateInviteLink, parseInviteLink, getFriendsForUser } from './friends';
import { FriendConnection, UserProfile } from './types';

// Mock the supabase module at top level (hoisted by vitest).
// Pure functions (canAccessFeature, generateInviteLink, etc.) don't call supabase,
// so this mock only affects searchUsers used in Property 10.
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

/**
 * Property 9: Feature access respects authentication boundary
 * Validates: Requirements 7.4, 7.5
 */
describe('Property 9: Feature access respects authentication boundary', () => {
  const localFeatures: Feature[] = ['intake', 'reminders', 'theme'];
  const socialFeatures: Feature[] = ['friends', 'friend-progress'];

  it('local features are always accessible regardless of authentication state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...localFeatures),
        fc.boolean(),
        (feature, isAuthenticated) => {
          expect(canAccessFeature(feature, isAuthenticated)).toBe(true);
        }
      )
    );
  });

  it('social features are accessible only when authenticated', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...socialFeatures),
        (feature) => {
          expect(canAccessFeature(feature, true)).toBe(true);
        }
      )
    );
  });

  it('social features are not accessible when unauthenticated', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...socialFeatures),
        (feature) => {
          expect(canAccessFeature(feature, false)).toBe(false);
        }
      )
    );
  });
});

/**
 * Property 12: QR code invite link round-trip
 * Validates: Requirements 8.4, 8.5
 *
 * For any valid user ID, generating an invite link and then parsing that invite
 * link SHALL return the original user ID.
 */
describe('Property 12: QR code invite link round-trip', () => {
  it('generateInviteLink followed by parseInviteLink returns the original userId', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (userId) => {
          const link = generateInviteLink(userId);
          const parsed = parseInviteLink(link);
          expect(parsed).toBe(userId);
        }
      )
    );
  });

  it('parseInviteLink returns null for invalid/malformed links', () => {
    const invalidLinks = fc.oneof(
      // Completely invalid URLs
      fc.string().filter((s) => {
        try { new URL(s); return false; } catch { return true; }
      }),
      // Valid URLs but missing invite param
      fc.webUrl().map((url) => url),
      // Valid URL with empty invite param
      fc.webUrl().map((url) => `${url}?invite=`),
      // Valid URL with whitespace-only invite param
      fc.webUrl().map((url) => `${url}?invite=%20%20`)
    );

    fc.assert(
      fc.property(
        invalidLinks,
        (link) => {
          const result = parseInviteLink(link);
          expect(result).toBeNull();
        }
      )
    );
  });
});

/**
 * Property 11: Friend connection is symmetric
 * Validates: Requirements 8.3
 *
 * For any accepted friend connection between user A and user B,
 * user A SHALL appear in user B's friend list AND user B SHALL appear
 * in user A's friend list.
 */
describe('Property 11: Friend connection is symmetric', () => {
  /** Generator for a valid ISO date string within a safe range. */
  const isoDateArb = fc.integer({
    min: new Date('2020-01-01').getTime(),
    max: new Date('2030-01-01').getTime(),
  }).map((ts) => new Date(ts).toISOString());

  /** Generator for a valid FriendConnection with status 'accepted'. */
  const acceptedConnectionArb = fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    friendId: fc.uuid(),
    status: fc.constant('accepted' as const),
    createdAt: isoDateArb,
  }).filter((conn) => conn.userId !== conn.friendId);

  it('for any accepted connection A->B, A appears in B\'s friends and B appears in A\'s friends', () => {
    fc.assert(
      fc.property(
        acceptedConnectionArb,
        (connection) => {
          const connections: FriendConnection[] = [connection];
          const friendsOfA = getFriendsForUser(connections, connection.userId);
          const friendsOfB = getFriendsForUser(connections, connection.friendId);

          // A should see B as a friend
          expect(friendsOfA).toContain(connection.friendId);
          // B should see A as a friend
          expect(friendsOfB).toContain(connection.userId);
        }
      )
    );
  });

  it('symmetry holds for multiple accepted connections', () => {
    fc.assert(
      fc.property(
        fc.array(acceptedConnectionArb, { minLength: 1, maxLength: 20 }),
        fc.uuid(),
        (connections, queryUserId) => {
          const friends = getFriendsForUser(connections, queryUserId);

          // For every friend found, the reverse relationship should also hold
          for (const friendId of friends) {
            const reverseFriends = getFriendsForUser(connections, friendId);
            expect(reverseFriends).toContain(queryUserId);
          }
        }
      )
    );
  });

  it('pending connections do not create friend relationships', () => {
    const pendingConnectionArb = fc.record({
      id: fc.uuid(),
      userId: fc.uuid(),
      friendId: fc.uuid(),
      status: fc.constant('pending' as const),
      createdAt: isoDateArb,
    }).filter((conn) => conn.userId !== conn.friendId);

    fc.assert(
      fc.property(
        pendingConnectionArb,
        (connection) => {
          const connections: FriendConnection[] = [connection];
          const friendsOfA = getFriendsForUser(connections, connection.userId);
          const friendsOfB = getFriendsForUser(connections, connection.friendId);

          // Neither should see the other as a friend
          expect(friendsOfA).not.toContain(connection.friendId);
          expect(friendsOfB).not.toContain(connection.userId);
        }
      )
    );
  });
});

/**
 * Property 10: Username search returns only matching users
 * Validates: Requirements 8.1
 *
 * For any search query string and any dataset of user profiles, the search
 * results SHALL contain only profiles whose username contains the query as a
 * substring (case-insensitive). The current user is excluded from results.
 */
describe('Property 10: Username search returns only matching users', () => {
  // Lazy-import supabase mock
  let supabaseMock: any;

  beforeEach(async () => {
    const mod = await import('./supabase');
    supabaseMock = mod.supabase;
    vi.clearAllMocks();
  });

  /** Arbitrary for a user profile with a non-empty username. */
  const userProfileArb = fc.record({
    id: fc.uuid(),
    username: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    email: fc.emailAddress(),
    daily_goal: fc.integer({ min: 500, max: 5000 }),
    created_at: fc.integer({
      min: new Date('2020-01-01').getTime(),
      max: new Date('2030-01-01').getTime(),
    }).map((ts) => new Date(ts).toISOString()),
  });

  it('search results contain only profiles whose username contains the query (case-insensitive)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(userProfileArb, { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0),
        fc.uuid(),
        async (profiles, query, currentUserId) => {
          // Set up mocks: getUser returns the current user
          supabaseMock.auth.getUser.mockResolvedValue({
            data: { user: { id: currentUserId } },
          });

          // Simulate Supabase ilike filtering: return profiles where username
          // contains the query as a case-insensitive substring
          const ilikFiltered = profiles.filter((p) =>
            p.username.toLowerCase().includes(query.trim().toLowerCase())
          );

          const selectMock = vi.fn().mockReturnValue({
            ilike: vi.fn().mockResolvedValue({
              data: ilikFiltered,
              error: null,
            }),
          });
          supabaseMock.from.mockReturnValue({ select: selectMock });

          // Dynamic import to get the mocked version of searchUsers
          const { searchUsers } = await import('./friends');
          const results = await searchUsers(query);

          // Verify: every result's username must contain the query (case-insensitive)
          for (const result of results) {
            expect(
              result.username.toLowerCase().includes(query.trim().toLowerCase())
            ).toBe(true);
          }

          // Verify: the current user is excluded from results
          for (const result of results) {
            expect(result.id).not.toBe(currentUserId);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('empty or whitespace-only query returns no results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', '   ', '\t', '\n'),
        async (query) => {
          const { searchUsers } = await import('./friends');
          const results = await searchUsers(query);
          expect(results).toEqual([]);
        }
      ),
      { numRuns: 10 }
    );
  });
});
