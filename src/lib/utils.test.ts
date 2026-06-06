import { describe, it, expect } from 'vitest';
import { sanitizeRepo, sanitizeGitRef } from './utils';

describe('utils sanitizers', () => {
  describe('sanitizeRepo', () => {
    it('should allow valid repository names', () => {
      expect(sanitizeRepo('org/repo')).toBe('org/repo');
      expect(sanitizeRepo('Cencosud-xlabs/release-hub')).toBe('Cencosud-xlabs/release-hub');
      expect(sanitizeRepo('user/my.repo_v1')).toBe('user/my.repo_v1');
    });

    it('should throw for empty repository name', () => {
      expect(() => sanitizeRepo('')).toThrow('Repository name cannot be empty');
    });

    it('should throw for invalid characters', () => {
      expect(() => sanitizeRepo('org/repo; rm -rf /')).toThrow('Invalid repository name format');
      expect(() => sanitizeRepo('org/repo && echo vuln')).toThrow('Invalid repository name format');
      expect(() => sanitizeRepo('org/repo > file')).toThrow('Invalid repository name format');
    });

    it('should throw for path traversal', () => {
      expect(() => sanitizeRepo('org/repo/../../etc/passwd')).toThrow('Invalid repository name format');
      expect(() => sanitizeRepo('..')).toThrow('Invalid repository name format');
    });

    it('should throw for flag injection', () => {
      expect(() => sanitizeRepo('-f')).toThrow('Invalid repository name format');
      expect(() => sanitizeRepo('--repo=org/repo')).toThrow('Invalid repository name format');
    });
  });

  describe('sanitizeGitRef', () => {
    it('should allow valid git refs', () => {
      expect(sanitizeGitRef('main')).toBe('main');
      expect(sanitizeGitRef('feature/security-hardening')).toBe('feature/security-hardening');
      expect(sanitizeGitRef('v1.0.0')).toBe('v1.0.0');
      expect(sanitizeGitRef('patch-1')).toBe('patch-1');
    });

    it('should throw for empty git ref', () => {
      expect(() => sanitizeGitRef('')).toThrow('Git reference cannot be empty');
    });

    it('should throw for suspicious patterns', () => {
      expect(() => sanitizeGitRef('main; rm -rf /')).toThrow('Invalid git reference format');
      expect(() => sanitizeGitRef('main && echo vuln')).toThrow('Invalid git reference format');
      expect(() => sanitizeGitRef('..')).toThrow('Invalid git reference format');
      expect(() => sanitizeGitRef('-f')).toThrow('Invalid git reference format');
    });
  });
});
