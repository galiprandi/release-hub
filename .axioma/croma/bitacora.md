# Croma - Bitácora de Refinamiento UI/UX

Bitácora de decisiones, experimentos y aprendizajes sobre la interfaz y experiencia de usuario de ReleaseHub.

## 2025-05-25 - Estandarización de Filtros e Industrial Resonance | Aprendizaje: La fragmentación de componentes de navegación (tabs vs filtros) genera inconsistencia visual y técnica. | Acción: Se evolucionó `FilterBar` para soportar variantes ('default', 'tabs') y metadatos (iconos, contadores), permitiendo su uso unificado en Dashboard y Fetcher.

## 2025-05-25 - Fetcher Clipboard Magic | Aprendizaje: Reducir la fricción inicial es clave para el "Time to Value". | Acción: Implementación de detección automática de comandos cURL en el portapapeles al entrar al módulo Fetcher, disparando el flujo de importación sin interacción manual.

## 2025-05-25 - Refactorización de Capa API Seki | Aprendizaje: Filtrar la lógica de transporte (AxiosResponse) hacia los componentes ensucia los tipos y la lógica de consumo. | Acción: Se refactorizaron los métodos de `api/seki.ts` para retornar `response.data` directamente, alineando el backend-for-frontend con una arquitectura más limpia.
