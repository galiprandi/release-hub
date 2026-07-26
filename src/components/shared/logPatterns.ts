export type LogContext = "k8s" | "docker" | "generic";

export interface DetectedPattern {
  pattern: string;
  category: "crash" | "resource" | "network" | "config" | "image";
  severity: "critical" | "warning" | "info";
  message: string;
  lineNumbers: number[];
}

// K8s-specific patterns
const K8S_PATTERNS: { regex: RegExp; pattern: DetectedPattern }[] = [
  { regex: /CrashLoopBackOff/i, pattern: { pattern: "CrashLoopBackOff", category: "crash", severity: "critical", message: "Pod en CrashLoopBackOff — reiniciando continuamente", lineNumbers: [] } },
  { regex: /OOMKilled/i, pattern: { pattern: "OOMKilled", category: "resource", severity: "critical", message: "Container killed por out-of-memory", lineNumbers: [] } },
  { regex: /ImagePullBackOff/i, pattern: { pattern: "ImagePullBackOff", category: "image", severity: "critical", message: "No se pudo pull la imagen del container", lineNumbers: [] } },
  { regex: /ErrImagePull/i, pattern: { pattern: "ErrImagePull", category: "image", severity: "critical", message: "Error al hacer pull de la imagen", lineNumbers: [] } },
  { regex: /LivenessProbeFailed/i, pattern: { pattern: "LivenessProbeFailed", category: "crash", severity: "warning", message: "Liveness probe falló — pod puede reiniciarse", lineNumbers: [] } },
  { regex: /ReadinessProbeFailed/i, pattern: { pattern: "ReadinessProbeFailed", category: "crash", severity: "warning", message: "Readiness probe falló — pod no recibe tráfico", lineNumbers: [] } },
  { regex: /Back-off restarting failed container/i, pattern: { pattern: "BackOffRestart", category: "crash", severity: "critical", message: "Container reiniciando después de fallo", lineNumbers: [] } },
  { regex: /failed to start container/i, pattern: { pattern: "ContainerStartFailed", category: "crash", severity: "critical", message: "Container no pudo iniciar", lineNumbers: [] } },
];

// Docker-specific patterns
const DOCKER_PATTERNS: { regex: RegExp; pattern: DetectedPattern }[] = [
  { regex: /exited with code [1-9]/i, pattern: { pattern: "NonZeroExit", category: "crash", severity: "critical", message: "Container salió con código de error", lineNumbers: [] } },
  { regex: /OOMKilled/i, pattern: { pattern: "OOMKilled", category: "resource", severity: "critical", message: "Container killed por out-of-memory", lineNumbers: [] } },
  { regex: /Cannot connect to the Docker daemon/i, pattern: { pattern: "DockerDaemonDown", category: "network", severity: "critical", message: "No se puede conectar al Docker daemon", lineNumbers: [] } },
  { regex: /bind: address already in use/i, pattern: { pattern: "PortBindingFailed", category: "network", severity: "critical", message: "Puerto en uso — no se puede bindear", lineNumbers: [] } },
  { regex: /no space left on device/i, pattern: { pattern: "DiskFull", category: "resource", severity: "critical", message: "Sin espacio en disco", lineNumbers: [] } },
  { regex: /permission denied/i, pattern: { pattern: "PermissionDenied", category: "config", severity: "warning", message: "Permiso denegado — verificar volumes/permissions", lineNumbers: [] } },
  { regex: /volume .* not found/i, pattern: { pattern: "VolumeNotFound", category: "config", severity: "warning", message: "Volume no encontrado", lineNumbers: [] } },
];

export function detectLogPatterns(logs: string, context: LogContext): DetectedPattern[] {
  const lines = logs.split("\n");
  const patterns = context === "k8s" ? K8S_PATTERNS : context === "docker" ? DOCKER_PATTERNS : [];
  const results: DetectedPattern[] = [];

  for (const { regex, pattern } of patterns) {
    const lineNumbers: number[] = [];
    lines.forEach((line, idx) => {
      if (regex.test(line)) lineNumbers.push(idx);
    });
    if (lineNumbers.length > 0) {
      results.push({ ...pattern, lineNumbers });
    }
  }

  return results.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function getCriticalPatternCount(patterns: DetectedPattern[]): number {
  return patterns.filter(p => p.severity === "critical").length;
}
