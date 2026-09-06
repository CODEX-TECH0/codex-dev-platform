import { describe, it, expect } from 'vitest';
import { diffLines } from '@/utils/diffLines';

describe('diffLines', () => {
  it('reports no changes for identical text', () => {
    const result = diffLines('a\nb\nc', 'a\nb\nc');
    expect(result.every((l) => l.type === 'same')).toBe(true);
    expect(result).toHaveLength(3);
  });

  it('detects a single added line', () => {
    const result = diffLines('a\nb', 'a\nb\nc');
    expect(result.filter((l) => l.type === 'added')).toEqual([{ type: 'added', text: 'c' }]);
    expect(result.filter((l) => l.type === 'removed')).toHaveLength(0);
  });

  it('detects a single removed line', () => {
    const result = diffLines('a\nb\nc', 'a\nc');
    expect(result.filter((l) => l.type === 'removed')).toEqual([{ type: 'removed', text: 'b' }]);
  });

  it('detects a full replacement', () => {
    const result = diffLines('old', 'new');
    expect(result).toEqual([
      { type: 'removed', text: 'old' },
      { type: 'added', text: 'new' }
    ]);
  });

  it('handles empty inputs', () => {
    expect(diffLines('', '')).toEqual([{ type: 'same', text: '' }]);
    expect(diffLines('a', '')).toEqual([
      { type: 'removed', text: 'a' },
      { type: 'added', text: '' }
    ]);
  });
});
