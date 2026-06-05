'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { loadTheme, saveTheme } from '@/lib/storage';
import { ThemePreference } from '@/lib/types';

/**
 * ThemeToggle component for switching between light and dark modes.
 * Applies `dark` class to the document element and persists selection
 * via localStorage using saveTheme/loadTheme from lib/storage.ts.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>({ mode: 'dark' });

  // Load persisted theme on mount
  useEffect(() => {
    const saved = loadTheme();
    setTheme(saved);
    applyThemeToDocument(saved.mode);
  }, []);

  function applyThemeToDocument(mode: 'light' | 'dark') {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function handleToggle() {
    const newMode = theme.mode === 'dark' ? 'light' : 'dark';
    const newTheme: ThemePreference = { mode: newMode };
    setTheme(newTheme);
    saveTheme(newTheme);
    applyThemeToDocument(newMode);
  }

  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-mono text-foreground">Theme</span>
      <button
        onClick={handleToggle}
        aria-label={`Switch to ${theme.mode === 'dark' ? 'light' : 'dark'} mode`}
        className="relative flex items-center w-14 h-7 border border-border bg-background transition-colors"
      >
        <span
          className={`absolute top-0.5 left-0.5 flex items-center justify-center w-6 h-6 bg-foreground transition-transform ${
            theme.mode === 'dark' ? 'translate-x-7' : 'translate-x-0'
          }`}
        >
          {theme.mode === 'dark' ? (
            <Moon size={14} className="text-background" />
          ) : (
            <Sun size={14} className="text-background" />
          )}
        </span>
      </button>
    </div>
  );
}
