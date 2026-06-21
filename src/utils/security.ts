/**
 * Security validation patterns and utilities.
 * Consolidates RFC 1123 DNS standards and SSRF protection logic.
 */

export const VALIDATION = {
  // RFC 1123 DNS Subdomain: max 253 chars, labels max 63 chars
  k8sName: /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?(\.[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?)*$/,
  // RFC 1123 DNS Label: max 63 chars
  k8sNamespace: /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/,
  context: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/,
  dockerName: /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/,
  resourceType: /^(pod|deployment|service|ingress)$/,
  scripts: /^(healthcheck|install|start|trigger-staging-redeploy|uninstall)$/,
};

export const SAFE_COMMANDS = ["gh", "kubectl", "docker", "curl"];

/**
 * Checks if a hostname or IP address refers to an internal network.
 * Used for SSRF protection.
 */
export const isInternalAddress = (hostname: string): boolean => {
  let addr = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // Normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (addr.startsWith("::ffff:")) {
    addr = addr.slice(7);
  }

  if (
    addr === "localhost" ||
    addr === "::1" ||
    addr === "::" ||
    addr === "0.0.0.0"
  )
    return true;
  if (addr.endsWith(".local") || addr.endsWith(".internal")) return true;

  // Handle decimal/hex IPv4 bypasses
  if (/^(0x[0-9a-f]+|[0-9]+)$/i.test(addr)) {
    try {
      const val = BigInt(addr);
      if (val <= 0xffffffffn) {
        const p0 = Number((val >> 24n) & 0xffn);
        const p1 = Number((val >> 16n) & 0xffn);
        const p2 = Number((val >> 8n) & 0xffn);
        const p3 = Number(val & 0xffn);
        addr = `${p0}.${p1}.${p2}.${p3}`;
      }
    } catch {
      // Not a valid big int, continue with normal flow
    }
  }

  // IPv4 Check
  const parts = addr.split(".").map(Number);
  if (parts.length === 4 && !parts.some(Number.isNaN)) {
    const [p0, p1] = parts;
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
  }

  // IPv6 Check (simple prefix checks)
  if (addr.includes(":")) {
    // Link-local (fe80::/10)
    if (
      addr.startsWith("fe8") ||
      addr.startsWith("fe9") ||
      addr.startsWith("fea") ||
      addr.startsWith("feb")
    )
      return true;
    // Unique Local (fc00::/7) -> fc00::/8 and fd00::/8
    if (addr.startsWith("fc") || addr.startsWith("fd")) return true;
  }

  // Cloud Metadata
  if (addr === "metadata.google.internal" || addr === "instance-data")
    return true;

  return false;
};
