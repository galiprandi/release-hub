# Workflow: Actualizar Novedades del Sistema

**Objetivo:** Actualizar el archivo `NOVEDADES.md` con los últimos cambios del sistema en formato WhatsApp-compatible (texto plano con emojis, sin markdown syntax).

## Pasos a seguir

### 1. Obtener última fecha y commits pendientes

1. **Leer NOVEDADES.md** para identificar la última fecha documentada (línea con `🗓️`)

2. **Obtener commits desde la última fecha** usando MCP Git:
   ```
   - Tool: git/log
   - Parámetro: since = "fecha de la última entrada"
   ```

**Ejemplo:** Si la última entrada es `🗓️ 17 de Abril de 2026`, buscar commits **desde el 17 de abril** en adelante. **NO buscar fechas anteriores** (15, 14, 13, etc.) ya que esas ya están documentadas.

**IMPORTANTE:** Solo buscar commits de la última fecha documentada en adelante. Ignorar completamente fechas anteriores.

### 2. Agrupar commits por fecha

Los commits obtenidos pueden ser de distintas fechas (desde la última entrada en adelante). Por cada commit, extrae:
- **Fecha del commit:** Fecha en que llegó a main (no la fecha actual)
- **Tipo de cambio:** Feature, Fix, Mejora, Refactor, Docs
- **Área del sistema:** ¿Qué módulo afecta? (ej: Ventas, Productos, Clientes, Dashboard)
- **Impacto para el usuario:** ¿Qué problema resuelve o qué facilita?

**Filtrar commits:** Ignora commits que NO afecten al usuario final:
- ❌ Deployment scripts (`vercel-build`, `deploy`, `ci-cd`)
- ❌ Migraciones de base de datos (solo técnicas)
- ❌ Configuración interna (`eslint`, `tsconfig`, workflows)
- ❌ Refactors sin cambio visible

**Nota:** El Paso 1 trae commits desde la última fecha. Verificar que no haya duplicados con lo ya documentado.

**Importante:** Agrupa SOLO los cambios relevantes por fecha. Cada fecha distinta debe tener su propia entrada en el archivo.

### 3. Formatear para usuario final

**Reglas de redacción:**
- Usar lenguaje simple, sin tecnicismos ("API", "endpoint", "refactor" → traducir a conceptos del negocio)
- Enfocarse en el beneficio para el usuario, no en la implementación técnica
- Mencionar dónde se encuentra el cambio en la interfaz
- Usar verbos de acción: "Ahora puedes...", "Se agregó...", "Se corrigió..."

**Formato de salida (WhatsApp-compatible):**

Nuevo formato **inline** - cada novedad lleva su emoji de tipo:

```
🚀 Novedades del Sistema

🗓️ 17 de Abril de 2026
• ✨ Ventas Rápidas: El botón ahora dice "Registrar pago".
• 🎉 Clientes: Ahora puedes registrar pagos desde la ficha.

🗓️ 15 de Abril de 2026
• ✨ Clientes: Los nombres ahora se muestran con formato correcto.
• 🐛 Productos: Corrección en el cálculo de costos.
```

**Reglas de formato WhatsApp:**
- NO usar `**negrita**`, `## títulos`, ni markdown syntax
- Cada novedad es una línea con bullet: `• [emoji] [Área]: Descripción`
- Sin categorías agrupadas (no más "NUEVO" o "MEJORA" como headers)
- Emojis inline indican el tipo de cambio

**Emojis por tipo de cambio (inline):**
| Emoji | Tipo | Cuándo usar |
|-------|------|-------------|
| 🎉 | Nuevo feature | Funcionalidad completamente nueva que el usuario no tenía |
| ✨ | Mejora | Mejora sobre algo existente, UX más clara, refinamiento |
| 🐛 | Fix de bug | Corrección de error que afectaba al usuario |
| 🎨 | UI/Visual | Cambios visuales, colores, formato, tipografía |
| 🔍 | Filtro/Búsqueda | Nuevos filtros, búsquedas, vistas filtradas |
| ⚡ | Performance | Más rápido, menos carga, optimización |
| 🔒 | Seguridad | Autenticación, permisos, protección de datos |
| 📱 | Responsive | Mejoras en móvil o adaptación de pantallas |
| 📝 | Docs/Texto | Cambios en textos, ayuda, mensajes, labels |
| ♻️ | Refactor | Cambio interno sin afectar funcionalidad (evitar si es solo técnico) |

### 4. Ejemplos de conversión (formato inline)

❌ **Commit técnico:**
```
refactor: extract ProductForm to components/products/
```

✅ **Para usuario final (formato inline):**
```
🗓️ 17 de Abril de 2026
• ♻️ Productos: Mejoras internas en el formulario para mayor estabilidad.
```

❌ **Commit técnico:**
```
feat: add cost preview in cost update dialog
```

✅ **Para usuario final (formato inline):**
```
🗓️ 15 de Abril de 2026
• ✨ Actualización de Costos: Ahora puedes previsualizar el impacto de los cambios antes de aplicarlos.
```

❌ **Commit técnico:**
```
fix: resolve payment calculation rounding error
```

✅ **Para usuario final (formato inline):**
```
🗓️ 14 de Abril de 2026
• 🐛 Pagos: Corrección en el redondeo de totales al registrar pagos.
```

### 5. Guardar y actualizar

1. **Leer NOVEDADES.md actual** para mantener historial existente
2. **Identificar duplicados:** Comparar cada commit con el contenido existente. Si la novedad ya está documentada (misma funcionalidad/mejora), **ignorarla**.
3. **Identificar fechas nuevas:** Verificar qué fechas de los commits ya existen en el archivo
4. **Agregar entradas faltantes:**
   - Para cada fecha de commit que NO esté en el archivo, crear una nueva entrada
   - Insertar nuevas entradas al inicio (fechas más recientes primero)
   - Si una fecha ya existe pero tiene novedades nuevas, agregarlas a esa fecha
   - Si una novedad ya existe (aunque sea en otra fecha), NO duplicarla
5. **Preservar entradas anteriores** sin modificar
6. **Guardar archivo** con el formato final

**Ejemplo de estructura final:**
```
🚀 Novedades del Sistema

🗓️ 17 de Abril de 2026      ← Nueva entrada (commits recientes)
[contenido...]

🗓️ 15 de Abril de 2026      ← Nueva entrada (otros commits)
[contenido...]

🗓️ 10 de Abril de 2026      ← Ya existía, se preserva
[contenido...]
```

### 6. Si hay dudas

Si no comprendes un commit o su impacto en el negocio:
- **NO asumas** ni inventes
- **Pregunta al usuario:** "El commit 'X' menciona Y, pero no estoy seguro del impacto para el usuario final. ¿Podrías aclararme qué hace exactamente?"

---

**Nota final:** El resultado debe poder copiarse y pegarse directamente en WhatsApp. Usar texto plano con emojis - WhatsApp no respeta markdown syntax como **negritas** o ## títulos.
