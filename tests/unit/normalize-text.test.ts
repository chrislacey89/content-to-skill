import { describe, it, expect } from 'vitest';
import { normalizeText } from '../../scripts/chunk_document.js';

describe('normalizeText', () => {
  it('returns empty string for null/undefined', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText('')).toBe('');
  });

  it('replaces CRLF with LF', () => {
    expect(normalizeText('line1\r\nline2')).toBe('line1\nline2');
  });

  it('replaces non-breaking spaces with regular spaces', () => {
    expect(normalizeText('hello\u00a0world')).toBe('hello world');
  });

  it('trims trailing whitespace from each line', () => {
    expect(normalizeText('hello   \nworld  ')).toBe('hello\nworld');
  });

  it('collapses 3+ blank lines to 2', () => {
    expect(normalizeText('a\n\n\n\nb')).toBe('a\n\nb');
    expect(normalizeText('a\n\n\n\n\n\nb')).toBe('a\n\nb');
  });

  it('preserves double blank lines', () => {
    expect(normalizeText('a\n\nb')).toBe('a\n\nb');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('returns already-normalized text unchanged', () => {
    const text = 'hello\n\nworld';
    expect(normalizeText(text)).toBe(text);
  });
});
