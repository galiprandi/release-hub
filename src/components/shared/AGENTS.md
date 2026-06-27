# Componentes Compartidos (Shared)

## Architecture Standard
Todos los componentes en este directorio son reutilizables y contienen lógica de negocio compartida entre múltiples módulos (GitHub, Kubernetes, Docker, etc.).

### Listado de Componentes
- **EmptyState**: Visualización técnica para estados sin contenido.
- **LoadingSpinner**: Indicador de carga con soporte para etiquetas técnicas.
- **SettingsDialog**: Panel global de configuración (Tokens, Webhooks).
- **FeedbackDialog**: Sistema de captura de feedback con stepper.
- **AIChatModal**: Interfaz de asistente IA persistente.
- **AISummaryCard**: Tarjeta de resumen generativo para logs y eventos.
- **ProjectManagementDialog**: Gestión centralizada de colecciones de usuario.
- **ProjectSelector**: Control para asignar items a proyectos.
- **ItemProjectSelectionDialog**: Diálogo unificado de selección de proyectos para cualquier entidad (repos, deployments).
- **DisplayInfo**: Formateador de metadatos (fechas, autores).
- **IndustrialTabs**: Selector de pestañas estándar Industrial Resonance V2.
- **Terminal**: Emulador de terminal para sesiones locales y remotas.
- **LogsViewer**: Visor de logs con soporte de IA y autoscroll.

## Unificación de Selección de Proyectos
El componente `ItemProjectSelectionDialog` reemplaza las implementaciones duplicadas específicas de módulo. Soporta tipos `repo` y `deployment` de forma nativa, asegurando que la persistencia en `useUserCollections` se mantenga sincronizada.

### Uso Estándar
```tsx
<ItemProjectSelectionDialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  itemId={id}
  type="repo" // o "deployment"
/>
```

## Tipografía Resonance V2
Todas las etiquetas técnicas dentro de estos componentes deben utilizar estrictamente:
`text-[10px] font-bold uppercase tracking-wider`
