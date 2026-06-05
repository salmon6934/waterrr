'use client';

import { useState } from 'react';
import { isValidVolume } from '@/lib/intake';
import { MIN_VOLUME, MAX_VOLUME } from '@/lib/constants';

export interface CustomAddModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (volume: number) => void;
}

/**
 * Modal dialog with a numeric input for specifying a custom water volume.
 * Validates input is an integer between 1 and 5000 (inclusive).
 *
 * Validates: Requirements 1.3
 */
export default function CustomAddModal({ open, onClose, onAdd }: CustomAddModalProps) {
  const [value, setValue] = useState('');

  if (!open) return null;

  const parsed = Number(value);
  const valid = value !== '' && isValidVolume(parsed);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valid) {
      onAdd(parsed);
      setValue('');
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add custom volume"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-xs border border-border bg-background p-6">
        <h2 className="font-mono text-lg font-bold text-foreground mb-4">
          Custom Amount
        </h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="custom-volume" className="block font-mono text-sm text-muted mb-1">
            Volume (ml)
          </label>
          <input
            id="custom-volume"
            type="number"
            inputMode="numeric"
            min={MIN_VOLUME}
            max={MAX_VOLUME}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`${MIN_VOLUME}–${MAX_VOLUME}`}
            className="w-full border border-border bg-background text-foreground font-mono px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            autoFocus
          />

          {value !== '' && !valid && (
            <p className="font-mono text-xs text-muted mt-1">
              Enter a whole number between {MIN_VOLUME} and {MAX_VOLUME}
            </p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border bg-background text-foreground font-mono px-3 py-2 text-sm font-bold transition-colors hover:bg-foreground hover:text-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="flex-1 border border-border bg-foreground text-background font-mono px-3 py-2 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
