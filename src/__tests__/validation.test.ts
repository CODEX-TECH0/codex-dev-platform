import { describe, expect, it } from 'vitest';
import { emailError, passwordError, projectError } from '../validation';
describe('input validation', () => { it('accepts safe credentials', () => { expect(emailError('dev@codex.tech')).toBe(''); expect(passwordError('SecurePass1')).toBe(''); }); it('rejects incomplete project names', () => expect(projectError('x')).not.toBe('')); });
