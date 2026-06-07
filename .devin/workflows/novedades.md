---
description: Actualizar NOVEDADES.md con cambios recientes en formato WhatsApp-compatible
---

# Workflow: Actualizar Novedades

1. Leer `NOVEDADES.md`, identificar última fecha (`🗓️`).
2. Obtener commits desde esa fecha (`git/log` MCP).
3. Filtrar commits relevantes (ignorar deploys, migraciones, config, refactors sin impacto visual).
4. Agrupar por fecha. Por commit: fecha, tipo, área, impacto usuario.
5. Formatear bullets: `• [emoji] [Área]: Descripción`.

**Emojis:**
| Emoji | Tipo |
|---|---|
| 🎉 | Nuevo feature |
| ✨ | Mejora |
| 🐛 | Fix |
| 🎨 | UI/Visual |
| ⚡ | Performance |
| 🔒 | Seguridad |

**Reglas:**
- Sin markdown (`**`, `##`). Texto plano con emojis.
- Enfocarse en beneficio usuario, no implementación técnica.
- Insertar fechas nuevas al inicio. No duplicar novedades existentes.
- Si hay dudas sobre impacto, preguntar al usuario.
