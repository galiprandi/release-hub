import { vi } from 'vitest';

export const useAIPrompt = vi.fn(() => ({
  data: '',
  status: 'idle',
  prompt: vi.fn(),
  reset: vi.fn(),
  error: null,
  progress: null
}));

export const useAISummarize = vi.fn(() => ({
  data: '',
  status: 'idle',
  summarize: vi.fn(),
  reset: vi.fn(),
  error: null
}));

export const useAI = vi.fn(() => ({
  isAvailable: true,
  status: 'ready',
  apis: {}
}));

export const useDebounce = vi.fn((val) => val);
