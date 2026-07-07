# BEHAVIOR
> Auto-generado por context-organizer.

## docker api
Logs con tail default, maneja empty/malformed JSON, reemplaza `\n`, restart/start/stop retornan bool, usa stderr si stdout vacío.

## api/exec
Ejecuta comando, throw en network failure o success=false.

## kubectl api
checkKubectlInstalled bool, getCurrentContext null on error, getDeployments parsea JSON, throw en namespace inválido.

## Security Hardening
Allow-list de comandos, bloqueo SSRF (loopback, RFC 1918, CGNAT, cloud metadata, DNS Rebinding, IPv6 local), neutralización de inyecciones (pipe, semicolon, backtick, redirection, command substitution), validación RFC 1123, reject path traversal y flag injection.

## api/seki
fetchPipelinesByEnvironment retorna pipelines por ambiente.

## XSS
Escapado HTML en highlighted code, log levels, search filters.

## terminalMiddleware
Upgrade handler, reject invalid context/namespace/container/resource/type.

## Hooks (usePortForward, usePortFree, useRepoPermission, useWebMCP)
Port forward/disconnect/error, free port o null, permisos desde JSON, tools registradas en mount.

## curlParser
Parser de state-machine: GET/POST, headers, query params, compact flags, escaped chars, line continuations, brackets en Seki URLs.

## diffEngine
Detección de lenguaje (JSON, JWT, JS, TS, CSS, HTML, Python, cURL), diff de arrays, sort keys recursivo.

## security utils
IPv4/IPv6, CGNAT, decimal/hex bypasses, cloud metadata, timeout handling.

## sekiToken utility
Token string o null, valida storage y JSON.

## Componentes (AIChatModal, FeedbackDialog, LogsViewer, BaseDialog, StatusCard, ContainerSearch, CommitsModal, ProjectSelector, PromoteDialog)
Renderizado, accesibilidad, focus rings, filtros, toggle, clipboard, AI summary, stepper.

## logUtils
Detección de niveles (kafka, bracket, ANSI), timestamps, highlight, multi-line grouping, strip ANSI.

## sekiAdapter
Transforma events/subevents, extrae error markdown, null en API errors.

## Seki Types
State values, pipeline event/data, TAG refType.

## extractRoutes
Dedup URLs, extrae de DEPLOY markdown, filtra internal K8s URLs.

## getPipelineStatusInfo
Detecta FAILED/SUCCESS de deploy events, fallback a last event, undefined para empty.

## Pulsar Build Monitor
Sistema de despliegue que reemplaza a Seki. Detecta repos Pulsar por workflow `pulsar-nx-build.yml`. Tag push (`v*.*.*`) = producción, commit push (`main`/`staging`) = staging. Monitorea creación de imágenes Docker (jobs "Build and Push Application"). Coexiste con Seki: renderiza null si el repo no es Pulsar. Fallback: si todas las imágenes están skipped, muestra el primer job no-imagen fallido (Validations, Golden Image). Polling 15s cuando hay runs `in_progress`.
