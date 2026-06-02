# Directivas de Producto - ReleaseHub

## Visión

ReleaseHub es una aplicación web **stateless** para visualizar pipelines CI/CD y gestionar releases GitHub sin clonación local de repositorios.

## Decisiones de Producto

- Todas las operaciones sobre repositorios se realizarán exclusivamente a través de la API de GitHub, sin requerir ni modificar la versión clonada de los repositorios que el usuario puede tener en su equipo. De esta manera, se evita cualquier posibilidad de pérdida de cambios que el usuario puede estar trabajando localmente.

- El color principal de la marca de ReleaseHub será el amarillo #F59E0B, utilizado tanto en el favicon como en todo el diseño de la aplicación. Esto ayudará a diferenciarnos claramente de otras aplicaciones GitHub en la barra de navegación del navegador de Github.

- **Monitoreo Unificado**: Adopción de una arquitectura de monitoreo único para todos los proveedores de CI/CD. El sistema debe ser capaz de detectar automáticamente el proveedor y mostrar el estado del pipeline de forma consistente e interactiva, maximizando el valor para el desarrollador al centralizar el feedback de despliegue.

- **Visibilidad Omnipresente de Salud**: El estado de salud de los servicios debe ser una métrica de primer nivel, accesible directamente desde el dashboard de repositorios para minimizar la fricción y el "Time to Value" en la detección de incidencias.

- **Asistencia Inteligente Ubicua**: Integración de un asistente AI local basado en Gemini Nano para proporcionar soporte contextual, resúmenes técnicos y ayuda interactiva sin que los datos salgan del navegador del usuario.
