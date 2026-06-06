import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes GitHub repository names to prevent argument injection.
 * Format: org/repo
 */
export function sanitizeRepo(repo: string): string {
  if (!repo) {
    throw new Error('Repository name cannot be empty');
  }
  // Allow alphanumeric, -, _, ., /
  // Must start with alphanumeric and not contain ..
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(repo) || repo.includes('..')) {
    throw new Error(`Invalid repository name format: ${repo}`);
  }
  return repo;
}

/**
 * Sanitizes Git reference names (branches, tags) to prevent argument injection.
 */
export function sanitizeGitRef(ref: string): string {
  if (!ref) {
    throw new Error('Git reference cannot be empty');
  }
  // Disallow common shell metacharacters and suspicious patterns
  // RFC for git refs is complex, but for our CLI usage we can be strict
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(ref) || ref.includes('..') || ref.startsWith('-')) {
    throw new Error(`Invalid git reference format: ${ref}`);
  }
  return ref;
}
