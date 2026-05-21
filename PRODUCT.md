# Directivas de Producto - ReleaseHub

## Visión

ReleaseHub es una aplicación web **stateless** para visualizar pipelines CI/CD y gestionar releases GitHub sin clonación local de repositorios.

## Prioridad Activa

- **Fetcher Module**: Desarrollar un módulo estandarizado para obtener datos de múltiples fuentes (APIs, bases de datos, archivos) con un flujo de datos consistente y optimizado.

## Decisiones de Producto

- Todas las operaciones sobre repositorios se realizarán exclusivamente a través de la API de GitHub, sin requerir ni modificar la versión clonada de los repositorios que el usuario puede tener en su equipo. De esta manera, se evita cualquier posibilidad de pérdida de cambios que el usuario puede estar trabajando localmente.

- El color principal de la marca de ReleaseHub será el amarillo #F59E0B, utilizado tanto en el favicon como en todo el diseño de la aplicación. Esto ayudará a diferenciarnos claramente de otras aplicaciones GitHub en la barra de navegación del navegador de Github.
*(Espacio reservado para directivas globales del equipo de producto.)*
