import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CustomAddModal from './CustomAddModal';

describe('CustomAddModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <CustomAddModal open={false} onClose={() => {}} onAdd={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the modal when open is true', () => {
    render(<CustomAddModal open={true} onClose={() => {}} onAdd={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Volume (ml)')).toBeInTheDocument();
  });

  it('disables the Add button when input is empty', () => {
    render(<CustomAddModal open={true} onClose={() => {}} onAdd={() => {}} />);
    const addBtn = screen.getByRole('button', { name: 'Add' });
    expect(addBtn).toBeDisabled();
  });

  it('disables the Add button for invalid volumes', () => {
    render(<CustomAddModal open={true} onClose={() => {}} onAdd={() => {}} />);
    const input = screen.getByLabelText('Volume (ml)');

    fireEvent.change(input, { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

    fireEvent.change(input, { target: { value: '5001' } });
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

    fireEvent.change(input, { target: { value: '3.5' } });
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('enables the Add button for valid volumes', () => {
    render(<CustomAddModal open={true} onClose={() => {}} onAdd={() => {}} />);
    const input = screen.getByLabelText('Volume (ml)');

    fireEvent.change(input, { target: { value: '100' } });
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
  });

  it('calls onAdd with parsed volume and closes on submit', () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(<CustomAddModal open={true} onClose={onClose} onAdd={onAdd} />);

    const input = screen.getByLabelText('Volume (ml)');
    fireEvent.change(input, { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledWith(750);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation hint for invalid input', () => {
    render(<CustomAddModal open={true} onClose={() => {}} onAdd={() => {}} />);
    const input = screen.getByLabelText('Volume (ml)');

    fireEvent.change(input, { target: { value: '9999' } });
    expect(screen.getByText(/Enter a whole number between 1 and 5000/)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<CustomAddModal open={true} onClose={onClose} onAdd={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('accepts boundary values 1 and 5000', () => {
    const onAdd = vi.fn();
    const { rerender } = render(
      <CustomAddModal open={true} onClose={() => {}} onAdd={onAdd} />
    );
    const input = screen.getByLabelText('Volume (ml)');

    fireEvent.change(input, { target: { value: '1' } });
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();

    fireEvent.change(input, { target: { value: '5000' } });
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
  });
});
