/**
 * POSIX-compatible shell argument escaping.
 * Wraps the argument in single quotes and escapes any existing single quotes.
 *
 * @param arg - The argument to escape
 * @returns The escaped argument
 */
export function quote(arg: string): string {
  if (arg === '') {
    return "''";
  }
  // Wrap in single quotes and replace ' with '\''
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

/**
 * Joins multiple arguments into a single command string, escaping each one.
 *
 * @param args - The arguments to join and escape
 * @returns The joined and escaped command string
 */
export function joinArgs(args: string[]): string {
  return args.map(quote).join(' ');
}
