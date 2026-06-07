'use client';

import { motion } from 'framer-motion';
import { triggerQuickAddHaptic } from '@/lib/haptics';

export interface QuickAddButtonProps {
  volume: number;
  onAdd: (volume: number) => void;
}

/**
 * Tappable button that adds a predefined volume of water.
 * Triggers haptic feedback on tap and invokes the onAdd callback.
 * Animates with a scale pulse on press.
 */
export default function QuickAddButton({ volume, onAdd }: QuickAddButtonProps) {
  const handleTap = () => {
    triggerQuickAddHaptic();
    onAdd(volume);
  };

  return (
    <motion.button
      type="button"
      onClick={handleTap}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className="border border-border bg-background text-foreground font-mono px-4 py-3 text-sm font-bold transition-colors hover:bg-foreground hover:text-background active:bg-foreground active:text-background"
    >
      {volume}ml
    </motion.button>
  );
}
