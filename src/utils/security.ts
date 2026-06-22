// Security Validation Patterns
export const VALIDATION = {
  // RFC 1123 DNS Subdomain: max 253 chars, labels max 63 chars
  k8sName:
    /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?(\.[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?)*$/,
  // RFC 1123 DNS Label: max 63 chars
  k8sNamespace: /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/,
  context: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/,
  dockerName: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/,
  resourceType: /^(pod|deployment|service|ingress)$/,
  scripts: /^(healthcheck|install|start|trigger-staging-redeploy|uninstall)$/,
  // Org/Repo pattern: alphanumeric start, can contain dots, underscores, hyphens, and one slash
  repository: /^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
};

export const SAFE_COMMANDS = [
  'gh',
  'kubectl',
  'docker',
  'curl',
  'lsof',
  'ls',
  'echo',
  'jq',
  'helm',
];

/**
 * SSRF Protection: Check if a hostname or IP is internal.
 */
export const isInternalAddress = (hostname: string): boolean => {
  let addr = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // Normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (addr.startsWith('::ffff:')) {
    addr = addr.slice(7);
  }

  if (
    addr === 'localhost' ||
    addr === '::1' ||
    addr === '::' ||
    addr === '0.0.0.0'
  )
    return true;
  if (addr.endsWith('.local') || addr.endsWith('.internal')) return true;

  // IPv4 Check with support for decimal, hex, and octal formats
  let ipv4Num: number | null = null;

  const parts = addr.split('.');
  if (parts.length >= 1 && parts.length <= 4) {
    const nums = parts.map((p) => {
      const pIsHex = /^0x[0-9a-f]+$/i.test(p);
      const pIsOctal = /^0[0-7]+$/.test(p);
      const pIsNumeric = /^[0-9]+$/.test(p);
      if (pIsHex) return parseInt(p, 16);
      if (pIsOctal) return parseInt(p, 8);
      if (pIsNumeric) return parseInt(p, 10);
      return NaN;
    });

    if (!nums.some((n) => Number.isNaN(n) || n < 0)) {
      if (nums.length === 1 && nums[0] <= 0xffffffff) {
        ipv4Num = nums[0] >>> 0;
      } else if (nums.length === 2) {
        // a.b -> a is 8 bits, b is 24 bits
        if (nums[0] <= 0xff && nums[1] <= 0xffffff) {
          ipv4Num = ((nums[0] << 24) | nums[1]) >>> 0;
        }
      } else if (nums.length === 3) {
        // a.b.c -> a is 8 bits, b is 8 bits, c is 16 bits
        if (nums[0] <= 0xff && nums[1] <= 0xff && nums[2] <= 0xffff) {
          ipv4Num = ((nums[0] << 24) | (nums[1] << 16) | nums[2]) >>> 0;
        }
      } else if (nums.length === 4) {
        if (
          nums[0] <= 0xff &&
          nums[1] <= 0xff &&
          nums[2] <= 0xff &&
          nums[3] <= 0xff
        ) {
          ipv4Num =
            ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
        }
      }
    }
  }

  if (ipv4Num !== null) {
    const p0 = (ipv4Num >>> 24) & 0xff;
    const p1 = (ipv4Num >>> 16) & 0xff;
    // Loopback (127.0.0.0/8)
    if (p0 === 127) return true;
    // RFC 1918 Private Space
    if (p0 === 10) return true;
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
    if (p0 === 192 && p1 === 168) return true;
    // Link-Local (169.254.0.0/16)
    if (p0 === 169 && p1 === 254) return true;
    // Shared Address Space / CGNAT (100.64.0.0/10)
    if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;
    // 0.0.0.0/8 (including 0.0.0.0)
    if (p0 === 0) return true;
  }

  // IPv6 Check (simple prefix checks)
  if (addr.includes(':')) {
    // Link-local (fe80::/10)
    if (
      addr.startsWith('fe8') ||
      addr.startsWith('fe9') ||
      addr.startsWith('fea') ||
      addr.startsWith('feb')
    )
      return true;
    // Unique Local (fc00::/7) -> fc00::/8 and fd00::/8
    if (addr.startsWith('fc') || addr.startsWith('fd')) return true;
  }

  // Cloud Metadata
  if (addr === 'metadata.google.internal' || addr === 'instance-data')
    return true;

  return false;
};
