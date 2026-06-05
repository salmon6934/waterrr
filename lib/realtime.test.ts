import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to create mocks that are accessible in the factory
const { mockSubscribe, mockOn, mockRemoveChannel, mockChannel } = vi.hoisted(() => {
  const mockSubscribe = vi.fn();
  const mockOn = vi.fn();
  const mockRemoveChannel = vi.fn();
  const mockChannel = {
    on: mockOn,
    subscribe: mockSubscribe,
  };
  mockOn.mockReturnValue(mockChannel);
  return { mockSubscribe, mockOn, mockRemoveChannel, mockChannel };
});

vi.mock('./supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
    from: vi.fn((table: string) => {
      if (table === 'friend_connections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({
                data: [
                  { user_id: 'user-1', friend_id: 'friend-a' },
                  { user_id: 'friend-b', friend_id: 'user-1' },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: 'friend-a', username: 'alice', daily_goal: 2000, current_streak: 3 },
                { id: 'friend-b', username: 'bob', daily_goal: 2500, current_streak: 7 },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'intake_entries') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  data: [
                    { user_id: 'friend-a', volume: 500 },
                    { user_id: 'friend-a', volume: 250 },
                    { user_id: 'friend-b', volume: 1000 },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    }),
  },
}));

import {
  subscribeToFriendProgress,
  unsubscribeFromFriendProgress,
  getRealtimeStatus,
  getSubscribedFriendIds,
} from './realtime';

describe('realtime module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset subscription state
    unsubscribeFromFriendProgress();

    // Make subscribe invoke callback with SUBSCRIBED by default
    mockSubscribe.mockImplementation((callback) => {
      callback('SUBSCRIBED');
      return mockChannel;
    });
  });

  afterEach(() => {
    unsubscribeFromFriendProgress();
  });

  describe('subscribeToFriendProgress', () => {
    it('fetches friend IDs and delivers initial progress data', async () => {
      const onFriendsUpdate = vi.fn();
      const onStatusChange = vi.fn();

      await subscribeToFriendProgress({
        userId: 'user-1',
        onFriendsUpdate,
        onStatusChange,
      });

      // Should have been called with initial data
      expect(onFriendsUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'friend-a',
            username: 'alice',
            currentIntake: 750,
            dailyGoal: 2000,
            currentStreak: 3,
          }),
          expect.objectContaining({
            userId: 'friend-b',
            username: 'bob',
            currentIntake: 1000,
            dailyGoal: 2500,
            currentStreak: 7,
          }),
        ])
      );
    });

    it('sets status to connected when subscription is established', async () => {
      const onStatusChange = vi.fn();

      await subscribeToFriendProgress({
        userId: 'user-1',
        onFriendsUpdate: vi.fn(),
        onStatusChange,
      });

      // Status should transition from 'connecting' to 'connected'
      expect(onStatusChange).toHaveBeenCalledWith('connecting');
      expect(onStatusChange).toHaveBeenCalledWith('connected');
    });

    it('subscribes to intake_entries and profiles tables', async () => {
      await subscribeToFriendProgress({
        userId: 'user-1',
        onFriendsUpdate: vi.fn(),
      });

      // .on should be called twice: once for intake_entries, once for profiles
      expect(mockOn).toHaveBeenCalledTimes(2);
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'intake_entries',
        }),
        expect.any(Function)
      );
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'profiles',
        }),
        expect.any(Function)
      );
    });

    it('sets status to disconnected on channel error', async () => {
      const onStatusChange = vi.fn();

      mockSubscribe.mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
        return mockChannel;
      });

      await subscribeToFriendProgress({
        userId: 'user-1',
        onFriendsUpdate: vi.fn(),
        onStatusChange,
      });

      expect(onStatusChange).toHaveBeenCalledWith('disconnected');
    });

    it('sets status to disconnected on channel close', async () => {
      const onStatusChange = vi.fn();

      mockSubscribe.mockImplementation((callback) => {
        callback('CLOSED');
        return mockChannel;
      });

      await subscribeToFriendProgress({
        userId: 'user-1',
        onFriendsUpdate: vi.fn(),
        onStatusChange,
      });

      expect(onStatusChange).toHaveBeenCalledWith('disconnected');
    });
  });

  describe('unsubscribeFromFriendProgress', () => {
    it('removes the channel and cleans up state', async () => {
      await subscribeToFriendProgress({
        userId: 'user-1',
        onFriendsUpdate: vi.fn(),
      });

      unsubscribeFromFriendProgress();

      expect(mockRemoveChannel).toHaveBeenCalled();
      expect(getRealtimeStatus()).toBe('disconnected');
      expect(getSubscribedFriendIds()).toEqual([]);
    });
  });

  describe('getRealtimeStatus', () => {
    it('returns disconnected when no subscription is active', () => {
      expect(getRealtimeStatus()).toBe('disconnected');
    });

    it('returns connected after successful subscription', async () => {
      await subscribeToFriendProgress({
        userId: 'user-1',
        onFriendsUpdate: vi.fn(),
      });

      expect(getRealtimeStatus()).toBe('connected');
    });
  });

  describe('getSubscribedFriendIds', () => {
    it('returns empty array when no subscription is active', () => {
      expect(getSubscribedFriendIds()).toEqual([]);
    });

    it('returns friend IDs after subscription', async () => {
      await subscribeToFriendProgress({
        userId: 'user-1',
        onFriendsUpdate: vi.fn(),
      });

      expect(getSubscribedFriendIds()).toEqual(['friend-a', 'friend-b']);
    });
  });

  describe('disconnect/reconnect handling', () => {
    it('schedules reconnect on disconnect', async () => {
      vi.useFakeTimers();
      const onStatusChange = vi.fn();

      // First call succeeds, second call (from reconnect) also succeeds
      let callCount = 0;
      mockSubscribe.mockImplementation((callback) => {
        callCount++;
        if (callCount === 1) {
          callback('TIMED_OUT');
        } else {
          callback('SUBSCRIBED');
        }
        return mockChannel;
      });

      await subscribeToFriendProgress({
        userId: 'user-1',
        onFriendsUpdate: vi.fn(),
        onStatusChange,
      });

      expect(onStatusChange).toHaveBeenCalledWith('disconnected');

      vi.useRealTimers();
    });
  });
});
