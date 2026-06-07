import { useEffect } from 'react';

/**
 * Hook to handle clicks outside of an element
 */
export function useClickOutside(ref: React.RefObject<HTMLElement | null>, callback: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback, enabled]);
}

/**
 * Hook to handle keyboard shortcuts
 */
export function useKeyboardShortcut(key: string, callback: (event: KeyboardEvent) => void, options: { ctrl?: boolean; meta?: boolean; mod?: boolean; enabled?: boolean } = {}) {
  const { ctrl = false, meta = false, mod = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      const matchKey = event.key.toLowerCase() === key.toLowerCase();
      const matchCtrl = !ctrl || event.ctrlKey;
      const matchMeta = !meta || event.metaKey;
      const matchMod = !mod || (event.ctrlKey || event.metaKey);

      if (matchKey && matchCtrl && matchMeta && matchMod) {
        callback(event);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, ctrl, meta, mod, enabled]);
}
