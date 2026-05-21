---
name: e2e-testing
description: Usarla para probar la aplicación e2e con Playwright MCP o CLI. MANTENER ACTUALIZADA con instrucciones que ahorren tiempo y eviten snapshots repetitivos y agregar nuevo coocimiento cuando navegues a nuevas secciones de la aplicación.
---

## Navegar a vista Queries

1. Navegar a `http://localhost:5173/queries` directamente
2. Usar `mcp4_browser_snapshot` para verificar que la vista cargó correctamente

## Probar modal de ImportQueryModal

1. Escribir un curl en el input "Importart cURL" (ref=e165):
   - Usar `mcp4_browser_type` con el curl a probar
   - Ejemplo: `curl https://api.github.com/repos/galiprandi/release-hub`
2. Hacer clic en el botón de enviar (ref=e166)
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
