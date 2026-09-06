import { describe, it, expect } from 'vitest';
import { convertTimestamp } from '@/utils/timestamp';

describe('convertTimestamp', () => {
  it('converts unix seconds to ISO 8601', () => {
    const result = convertTimestamp(0, 'unix_seconds');
    expect(result.ok).toBe(true);
    expect(result.iso8601).toBe('1970-01-01T00:00:00.000Z');
    expect(result.unixMs).toBe(0);
  });

  it('converts unix milliseconds correctly', () => {
    const result = convertTimestamp(1000, 'unix_ms');
    expect(result.ok).toBe(true);
    expect(result.unixSeconds).toBe(1);
  });

  it('converts ISO 8601 back to unix seconds', () => {
    const result = convertTimestamp('2024-01-01T00:00:00.000Z', 'iso8601');
    expect(result.ok).toBe(true);
    expect(result.unixSeconds).toBe(1704067200);
  });

  it('round-trips through all three formats', () => {
    const start = convertTimestamp(1700000000, 'unix_seconds');
    expect(start.ok).toBe(true);
    const viaIso = convertTimestamp(start.iso8601!, 'iso8601');
    expect(viaIso.unixSeconds).toBe(1700000000);
  });

  it('reports an error for unparseable input', () => {
    const result = convertTimestamp('not a date', 'iso8601');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('reports an error for NaN numeric input', () => {
    const result = convertTimestamp('abc', 'unix_seconds');
    expect(result.ok).toBe(false);
  });
});
