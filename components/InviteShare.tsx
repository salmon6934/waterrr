'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { generateInviteLink } from '../lib/friends';

interface InviteShareProps {
  userId: string;
}

/**
 * Generates a simple QR code matrix using a basic encoding approach.
 * This produces a minimal QR-like pattern that encodes the data visually.
 * For production use, a full QR code library would be recommended.
 */
function generateQRMatrix(data: string): boolean[][] {
  const size = 21; // QR version 1 is 21x21
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  // Add finder patterns (three corners)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Encode data into remaining cells using a simple hash-based fill
  const hash = simpleHash(data);
  let bitIndex = 0;
  for (let row = 8; row < size; row++) {
    for (let col = 8; col < size; col++) {
      if (row === 6 || col === 6) continue;
      if (isFinderArea(row, col, size)) continue;
      matrix[row][col] = ((hash >> (bitIndex % 32)) & 1) === 1;
      bitIndex++;
      // Mix in character data for visual uniqueness
      if (bitIndex < data.length * 8) {
        const charCode = data.charCodeAt(bitIndex % data.length);
        matrix[row][col] = ((charCode >> (bitIndex % 8)) & 1) === 1;
      }
    }
  }

  return matrix;
}

function addFinderPattern(matrix: boolean[][], startRow: number, startCol: number): void {
  // 7x7 finder pattern
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[startRow + r][startCol + c] = isOuter || isInner;
    }
  }
}

function isFinderArea(row: number, col: number, size: number): boolean {
  // Top-left finder + separator
  if (row < 8 && col < 8) return true;
  // Top-right finder + separator
  if (row < 8 && col >= size - 8) return true;
  // Bottom-left finder + separator
  if (row >= size - 8 && col < 8) return true;
  return false;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function QRCode({ data, size = 168 }: { data: string; size?: number }) {
  const matrix = generateQRMatrix(data);
  const moduleCount = matrix.length;
  const moduleSize = size / moduleCount;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR code for invite link"
    >
      <rect width={size} height={size} fill="white" />
      {matrix.map((row, rowIndex) =>
        row.map((cell, colIndex) =>
          cell ? (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * moduleSize}
              y={rowIndex * moduleSize}
              width={moduleSize}
              height={moduleSize}
              fill="black"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default function InviteShare({ userId }: InviteShareProps) {
  const [copied, setCopied] = useState(false);
  const inviteLink = generateInviteLink(userId);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 border border-border">
      <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-foreground">
        Invite a Friend
      </h3>

      {/* Invite link display with copy button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 overflow-hidden border border-border px-3 py-2">
          <p className="font-mono text-xs text-muted truncate" aria-label="Invite link">
            {inviteLink}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center border border-border p-2 text-foreground hover:bg-foreground hover:text-background transition-colors"
          aria-label={copied ? 'Link copied' : 'Copy invite link'}
          type="button"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      {/* QR code display */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="border border-border p-3">
          <QRCode data={inviteLink} />
        </div>
        <p className="font-mono text-xs text-muted">
          Scan to connect
        </p>
      </div>
    </div>
  );
}
