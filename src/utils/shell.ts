/**
 * Safely escape a string for use as a shell argument.
 *
 * Based on Python's shlex.quote() logic.
 * If the string is empty, returns empty quotes ''.
 * If the string contains only safe characters, returns it as is.
 * Otherwise, wraps it in single quotes and escapes any existing single quotes.
 */
export function quote(s: string): string {
  if (!s) {
    return "''";
  }

  // If there are no unsafe characters, we don't need to quote it.
  // Safe characters: alphanumeric, plus, comma, hyphen, period, forward slash, colon, underscore.
  const safeRegex = /^[\w+,./:_@-]+$/;
  if (safeRegex.test(s)) {
    return s;
  }

  // Wrap in single quotes and escape any single quotes already in the string.
  // ' → '\''
  return "'" + s.replace(/'/g, "'\\''") + "'";
}
