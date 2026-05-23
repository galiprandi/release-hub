---
name: e2e-testing
description: Usarla para probar la aplicación e2e con Playwright MCP o CLI. MANTENER ACTUALIZADA con instrucciones que ahorren tiempo y eviten snapshots repetitivos y agregar nuevo coocimiento cuando navegues a nuevas secciones de la aplicación.
---

## Navegar a vista Queries

1. Navegar a `http://localhost:5173/queries` directamente
2. Usar `mcp4_browser_snapshot` para verificar que la vista cargó correctamente

## Navegar a vista Dashboard (Repositorios)

1. Navegar a `http://localhost:5173/` directamente
2. Usar `mcp4_browser_snapshot` para verificar que la vista cargó correctamente
3. Verificar tabs de navegación (Favoritos, Proyectos)
4. Verificar tabla de repositorios por organización

## Navegar a vista Docker

1. Navegar a `http://localhost:5173/docker` directamente
2. Usar `mcp4_browser_snapshot` para verificar que la vista cargó correctamente
3. Verificar filtros (Todos, Running, Stopped, Exited)
4. Verificar botón "Recargar" en header actions

## Navegar a vista Fetcher

1. Navegar a `http://localhost:5173/fetcher` directamente
2. Usar `mcp4_browser_snapshot` para verificar que la vista cargó correctamente
3. Verificar input "Importar cURL" en header actions
4. Verificar filtros por método (Todos, GET, POST, PATCH, PUT)
5. Verificar tabla de historial de queries

## Navegar a vista Health Monitor

1. Navegar a `http://localhost:5173/health` directamente
2. Usar `mcp4_browser_snapshot` para verificar que la vista cargó correctamente
3. Verificar filtros por ambiente (Todos, Staging, Production, Con errores)
4. Verificar botones "Verificar todos" y "Verificar X" en header actions
5. Verificar InfoBanner expandible "Cómo funciona"

## Navegar a vista Kubernetes

1. Navegar a `http://localhost:5173/kubernetes` directamente
2. Usar `mcp4_browser_snapshot` para verificar que la vista cargó correctamente
3. Verificar input de búsqueda "Búsqueda de deployments... (Cmd+K)" en header
4. Si no hay favoritos, verificar empty state con botón "Buscar Deployments"
5. Probar búsqueda de deployments:
   - Hacer clic en el input de búsqueda (ref=e182)
   - Escribir texto para buscar (ej: "api" o "test")
   - Verificar que el dropdown se abra con resultados de todos los contextos
   - Verificar que cada resultado muestre: nombre, namespace, contexto, estado
   - Verificar botón de estrella para agregar a favoritos
6. Probar agregar a favoritos:
   - Hacer clic en el botón de estrella de un resultado
   - Verificar que el botón cambie a "Eliminar de favoritos"
   - Verificar que el deployment aparezca en la tabla principal
7. Probar eliminar de favoritos:
   - En la tabla de favoritos, hacer clic en el botón de estrella amarilla
   - Verificar que el deployment desaparezca de la tabla
8. Verificar que la búsqueda funciona en todos los contextos disponibles

## Probar modal de ImportQueryModal

1. Escribir un curl en el input "Importar cURL" (ref=e208):
   - Usar `mcp4_browser_type` con el curl a probar
   - Ejemplo: `curl https://api.github.com/repos/galiprandi/release-hub`
2. Hacer clic en el botón de enviar (ref=e209)
3. Verificar que el modal se abra con `mcp4_browser_snapshot`
4. Dentro del modal, hacer clic en el botón "Enviar" (ref=e305)
5. Verificar que el modal NO se cierre después de enviar
6. Verificar que la respuesta se muestre en el panel derecho
7. Cerrar el modal con el botón "Cerrar" (ref=e289)
8. Usar `mcp4_browser_close` para limpiar

## Patrones aprendidos

- **Memorizar estado en modales**: Cuando un modal se cierra inesperadamente después de acciones, memorizar el valor inicial del prop que controla la apertura (ej: `query.curl`) en un estado local para que no cambie durante la ejecución
- **Evitar refs durante render**: No acceder a `ref.current` durante el render, usar estado local en su lugar
- **Control de modal**: Usar `open={!!initialCurl}` donde `initialCurl` es el valor memorizado, en lugar de depender de props que cambian
- **Problemas de estado en parsing**: Cuando el parsing depende de un prop que cambia temporalmente (ej: `curl`), usar el valor memorizado para el parsing también: `const parsed = initialCurl ? parseCurlCommand(initialCurl) : null;` en lugar de `const parsed = curl ? parseCurlCommand(curl) : null;`
- **AppLayout pattern**: Todas las rutas principales usan AppLayout con sidebar, header sticky y contenido principal. El header acepta `headerActions` para botones específicos de cada ruta.
- **FilterBar pattern**: Usar FilterBar para filtros + búsqueda consistentes (docker, fetcher, health). Remover rightContent duplicado si se mueve a headerActions.

