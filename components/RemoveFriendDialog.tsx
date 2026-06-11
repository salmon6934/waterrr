'use client';

interface RemoveFriendDialogProps {
  username: string;
  onConfirm: () => void;
  onCancel: () => void;
  error: string | null;
  loading?: boolean;
}

/**
 * Confirmation dialog for removing a friend.
 * Displays the friend's username and asks for confirmation.
 * Shows an inline error message if removal fails.
 */
export default function RemoveFriendDialog({
  username,
  onConfirm,
  onCancel,
  error,
  loading = false,
}: RemoveFriendDialogProps) {
  return (
    <div className="border border-border p-4 font-mono bg-background">
      <p className="text-sm text-foreground mb-4">
        Remove <span className="font-bold">{username}</span> from friends?
      </p>

      {error && (
        <p className="text-sm text-red-500 mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="border border-border px-3 py-1 text-sm text-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Removing...' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="border border-border px-3 py-1 text-sm text-muted hover:bg-muted hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
