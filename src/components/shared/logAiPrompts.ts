import type { LogContext } from "./logPatterns";

const K8S_PROMPT_SUFFIX = "CONTEXTO K8S: Identifica específicamente CrashLoopBackOff, OOMKilled, ImagePullBackOff, LivenessProbeFailed, restart patterns, configmap/secret issues, y problemas de resource limits.";

const DOCKER_PROMPT_SUFFIX = "CONTEXTO DOCKER: Identifica específicamente exit codes non-zero, port binding failures, volume mount errors, OOMKilled, disk full, y problemas de network connectivity.";

const GENERIC_PROMPT_SUFFIX = "";

export function getContextualPrompt(context: LogContext): string {
  const base = 'Analiza los logs SOLO para identificar problemas. Si los logs están en formato JSON, extrae el mensaje de error y el nivel (level). REGLAS ESTRICTAS: 1) NO repitas los logs completos o en JSON, 2) NO menciones configuración, rutas, startup, Swagger, mapeo de controladores, debug info, 3) Solo reporta ERRORES, WARNINGS, EXCEPCIONES, TIMEOUTS, FALLOS DE CONEXIÓN en lenguaje natural, 4) Compliance: secretos expuestos, credenciales en texto plano. ESTRUCTURA EXACTA (máximo 4 líneas, texto plano): * Errores críticos: [descripción en lenguaje natural o "ninguno"] * Warnings: [descripción en lenguaje natural o "ninguno"] * Compliance: [problemas o "ninguno"] * Estado general: HEALTHY/DEGRADED/CRITICAL. NO agregues secciones adicionales. Usa minúsculas en las etiquetas.';
  const suffix = context === "k8s" ? K8S_PROMPT_SUFFIX : context === "docker" ? DOCKER_PROMPT_SUFFIX : GENERIC_PROMPT_SUFFIX;
  return `${base}\n\n${suffix}`;
}
