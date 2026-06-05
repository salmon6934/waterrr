import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuickAddButton from './QuickAddButton';

// Mock haptics to avoid native plugin calls in tests
vi.mock('@/lib/haptics', () => ({
  triggerQuickAddHaptic: vi.fn(),
}));

describe('QuickAddButton', () => {
  it('renders the volume label in ml', () => {
    render(<QuickAddButton volume={250} onAdd={() => {}} />);
    expect(screen.getByRole('button', { name: '250ml' })).toBeInTheDocument();
  });

  it('calls onAdd with the correct volume when tapped', () => {
    const onAdd = vi.fn();
    render(<QuickAddButton volume={350} onAdd={onAdd} />);

    fireEvent.click(screen.getByRole('button', { name: '350ml' }));

    expect(onAdd).toHaveBeenCalledWith(350);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('triggers haptic feedback on tap', async () => {
    const { triggerQuickAddHaptic } = await import('@/lib/haptics');
    const onAdd = vi.fn();
    render(<QuickAddButton volume={500} onAdd={onAdd} />);

    fireEvent.click(screen.getByRole('button', { name: '500ml' }));

    expect(triggerQuickAddHaptic).toHaveBeenCalled();
  });
});
