/**
 * Unit tests for haptic feedback helpers.
 * Tests verify that haptic functions call correct Capacitor APIs
 * and gracefully handle web/fallback environments.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @capacitor/haptics before importing the module under test
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
  NotificationType: {
    Success: 'SUCCESS',
    Warning: 'WARNING',
    Error: 'ERROR',
  },
}));

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { triggerQuickAddHaptic, triggerGoalCompletionHaptic } from './haptics';

describe('haptics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('triggerQuickAddHaptic', () => {
    it('should call Haptics.impact with Light style', async () => {
      await triggerQuickAddHaptic();
      expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
    });

    it('should call Haptics.impact exactly once', async () => {
      await triggerQuickAddHaptic();
      expect(Haptics.impact).toHaveBeenCalledTimes(1);
    });

    it('should not throw when Haptics.impact rejects', async () => {
      vi.mocked(Haptics.impact).mockRejectedValueOnce(new Error('Not available'));
      await expect(triggerQuickAddHaptic()).resolves.toBeUndefined();
    });
  });

  describe('triggerGoalCompletionHaptic', () => {
    it('should call Haptics.notification with Success type', async () => {
      await triggerGoalCompletionHaptic();
      expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });
    });

    it('should call Haptics.notification exactly once', async () => {
      await triggerGoalCompletionHaptic();
      expect(Haptics.notification).toHaveBeenCalledTimes(1);
    });

    it('should not throw when Haptics.notification rejects', async () => {
      vi.mocked(Haptics.notification).mockRejectedValueOnce(new Error('Not available'));
      await expect(triggerGoalCompletionHaptic()).resolves.toBeUndefined();
    });
  });
});
