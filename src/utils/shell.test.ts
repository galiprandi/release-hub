import { describe, it, expect } from 'vitest';
import { quote } from './shell';

describe('shell utility', () => {
  describe('quote', () => {
    it('quotes empty string', () => {
      expect(quote('')).toBe("''");
    });

    it('does not quote safe strings', () => {
      expect(quote('hello')).toBe('hello');
      expect(quote('repo-name_123.v1')).toBe('repo-name_123.v1');
      expect(quote('org/repo')).toBe('org/repo');
    });

    it('quotes strings with spaces', () => {
      expect(quote('hello world')).toBe("'hello world'");
    });

    it('quotes strings with special characters', () => {
      expect(quote('hello;rm -rf /')).toBe("'hello;rm -rf /'");
      expect(quote('$(whoami)')).toBe("'$(whoami)'");
      expect(quote('`id`')).toBe("'`id`'");
      expect(quote('> /etc/passwd')).toBe("'> /etc/passwd'");
    });

    it('escapes single quotes correctly', () => {
      // O'Reilly -> 'O'\''Reilly'
      expect(quote("O'Reilly")).toBe("'O'\\''Reilly'");
    });

    it('handles multiple single quotes', () => {
      expect(quote("'a'b'")).toBe("''\\''a'\\''b'\\'''");
    });

    it('handles mixed characters', () => {
      expect(quote('search term "with quotes" & $others')).toBe("'search term \"with quotes\" & $others'");
    });
  });
});
