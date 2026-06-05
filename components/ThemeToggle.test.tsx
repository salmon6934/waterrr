import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';

// Mock storage functions
vi.mock('@/lib/storage', () => ({
  loadTheme: vi.fn(() => ({ mode: 'dark' })),
  saveTheme: vi.fn(),
}));

import { loadTheme, saveTheme } from '@/lib/storage';

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  it('loads persisted theme on mount and applies dark class', () => {
    vi.mocked(loadTheme).mockReturnValue({ mode: 'dark' });
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('applies light theme when persisted preference is light', () => {
    vi.mocked(loadTheme).mockReturnValue({ mode: 'light' });
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles from dark to light on button click', () => {
    vi.mocked(loadTheme).mockReturnValue({ mode: 'dark' });
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(saveTheme).toHaveBeenCalledWith({ mode: 'light' });
  });

  it('toggles from light to dark on button click', () => {
    vi.mocked(loadTheme).mockReturnValue({ mode: 'light' });
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(saveTheme).toHaveBeenCalledWith({ mode: 'dark' });
  });

  it('has accessible aria-label indicating the opposite mode', () => {
    vi.mocked(loadTheme).mockReturnValue({ mode: 'dark' });
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
  });
});
