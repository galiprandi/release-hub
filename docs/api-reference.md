# Seki BFF API Reference

Documento de referencia de los endpoints expuestos por el BFF (Backend for Frontend) de Seki para el desarrollo de la interfaz web.

## Índice

- [Resumen](#resumen)
- [Endpoints por Módulo](#endpoints-por-módulo)
  - [Health](#health)
  - [Me (Usuario)](#me-usuario)
  - [Pipelines](#pipelines)
  - [Repositories](#repositories)
  - [Operations](#operations)
  - [Secrets](#secrets)
- [Análisis de Utilidad para Repo Dash](#análisis-de-utilidad-para-seki-web)

---

## Resumen

| Módulo | Endpoints | Autenticación | Prioridad para Web |
|--------|-----------|---------------|-------------------|
| Health | 2 | Público | Baja |
| Me | 2 | JWT | **Alta** |
| Pipelines | 2 | JWT | **Alta** |
| Repositories | 2 | JWT | **Alta** |
| Operations | 1 | JWT | Media |
| Secrets v1 | 2 | JWT | Media |
| Secrets v2 | 2 | JWT | Media |

---

## Endpoints por Módulo

### Health

Estado público del servicio.

| Método | Ruta | Descripción | Request | Response |
|--------|------|-------------|---------|----------|
| `GET` | `/health` | Estado de salud del servicio | - | `{ status: "UP" }` |
| `GET` | `/ping` | Ping simple para verificar disponibilidad | - | `"pong"` |

**Autenticación:** `@Public()` - No requiere autenticación

---

### Me (Usuario)

Gestión de información del usuario autenticado.

#### `GET /me`
Obtiene la información del usuario autenticado.

**Request:**
- Headers: `Authorization: Bearer <JWT>`

**Response:**
```typescript
{
  // UserInfo del JWT - estructura definida en @team_seki/nestjs-jwt-module
  primarysid: string;      // Email del usuario
  scopes: string[];        // Permisos del usuario (org:xxx, etc.)
  // ... otros campos del token JWT
}
```

**Relevancia para Web:** **Alta** - Necesario para mostrar información del usuario y validar permisos.

---

#### `GET /me/organizations`
Lista las organizaciones GitHub disponibles para el usuario.

**Request:**
- Headers: `Authorization: Bearer <JWT>`

**Response:**
```typescript
{
  offset: number;
  limit: number;
  total: number;
  items: Array<{
    name: string;
    description: string;
    // apikey omitido por seguridad
    avatar: string;  // URL del logo
  }>
}
```

**Filtrado aplicado:**
- Solo organizaciones donde el usuario tiene scope `org:{nombre}`
- Excluye organizaciones marcadas como `[deprecated]`

**Relevancia para Web:** **Alta** - Necesario para el selector de organizaciones y scope de productos.

---

### Pipelines

Gestión de pipelines de CI/CD.

Base: `/products/:organization/:name/pipelines`

#### `GET /products/:organization/:name/pipelines`
Lista todos los pipelines de un producto con paginación y filtros.

**Path Params:**
- `organization`: Nombre de la organización GitHub
- `name`: Nombre del producto/repositorio

**Query Params (IQueryParams):**
```typescript
{
  limit: number;           // Límite de resultados
  offset: number;          // Offset para paginación
  search?: string;        // Término de búsqueda
  filters?: object;        // Filtros MongoDB
  sort?: Record<string, 'asc' | 'desc'>;  // Ordenamiento
}
```

**Response:**
```typescript
{
  offset: number;
  limit: number;
  total: number;
  items: Array<IPipeline>  // Ver definición abajo
}
```

**Relevancia para Web:** **Alta** - Lista de deployments/pipelines del producto.

---

#### `GET /products/:organization/:name/pipelines/:commit/:tag?`
Obtiene un pipeline específico por commit (y tag opcional).

**Path Params:**
- `organization`: Nombre de la organización
- `name`: Nombre del producto
- `commit`: Hash del commit
- `tag`: (Opcional) Tag del release

**Response:** `IPipeline | null`

```typescript
interface IPipeline {
  state: 'IDLE' | 'STARTED' | 'FAILED' | 'WARN' | 'SUCCESS';
  created_at: string;
  updated_at: string;
  events: Array<IEvent>;
  git: {
    organization: string;
    product: string;
    commit: string;
    commit_message: string;
    commit_author: string;
    stage: 'production' | 'staging';
    event: 'commit' | 'tag';
    ref: string;
  };
}

interface IEvent {
  id: string;           // VA, DR, BS, GD, BG, CI, TS, CD
  label: {
    es: string;
    en: string;
    br: string;
  };
  state: 'IDLE' | 'STARTED' | 'FAILED' | 'WARN' | 'SUCCESS';
  created_at: string;
  updated_at: string;
  markdown: string;
  subevents: Array<ISubEvent>;
}

interface ISubEvent {
  id: string;
  label: string;
  state: 'IDLE' | 'STARTED' | 'FAILED' | 'WARN' | 'SUCCESS';
  created_at: string;
  updated_at: string;
  markdown: string;
}
```

**Pasos del pipeline (events):**
| ID | Nombre (ES) | Descripción |
|----|-------------|-------------|
| VA | Validación | Validación inicial del código |
| DR | Eliminación de recursos | Limpieza de recursos previos |
| BS | Imagen de dependencias | Build de imagen base con dependencias |
| GD | Imagen de proyectos | Build de imagen del proyecto |
| BG | Construcción | Build completo de la aplicación |
| CI | Infraestructura | Configuración de infraestructura |
| TS | Pruebas | Ejecución de tests |
| CD | Despliegue | Deploy a los entornos |

**Relevancia para Web:** **Alta** - Vista detallada del estado del deployment.

---

### Repositories

Gestión de repositorios GitHub.

Base: `/repositories/:organization`

#### `GET /repositories/:organization/:name/available`
Verifica si un nombre de repositorio está disponible.

**Path Params:**
- `organization`: Nombre de la organización
- `name`: Nombre propuesto del repositorio

**Response:** `boolean`
- `true`: El nombre está disponible (no existe o está vacío)
- `false`: El repositorio ya existe con contenido

**Relevancia para Web:** **Alta** - Validación en tiempo real al crear producto.

---

#### `POST /repositories/:organization/`
Crea un nuevo repositorio en GitHub.

**Path Params:**
- `organization`: Nombre de la organización

**Body (validado con Zod - Repository.Schema):**
```typescript
{
  name: string;           // Nombre del repositorio
  description: string;    // Descripción
  // Campos adicionales de IRepository según @seki/models
}
```

**Proceso interno:**
1. Verifica disponibilidad del nombre
2. Si no existe: Crea repo en GitHub con `visibility: internal`
3. Aplica topics: `seki-product`, `seki-flow`
4. Agrega al creador como colaborador con permiso `admin`

**Response:** `void` (201 Created) o error 409 si ya existe

**Relevancia para Web:** **Alta** - Creación de nuevos productos.

---

### Operations

Ejecución de comandos en el Control Plane.

Base: `/operations/:organization/:environment/:product`

#### `POST /operations/:organization/:environment/:product`
Ejecuta una operación en el control plane.

**Path Params:**
- `organization`: Nombre de la organización
- `environment`: `staging` | `production`
- `product`: Nombre del producto

**Body (IOperation):**
```typescript
{
  command: string;        // Comando a ejecutar
  command_args: {
    product: string;      // Inyectado automáticamente
    [key: string]: unknown;  // Argumentos adicionales
  }
}
```

**Response:** Respuesta del control plane (varía según comando)

**Manejo de errores:**
- Convierte `OPERATION_EXCEPTION` del control plane a excepción NestJS

**Relevancia para Web:** Media - Para operaciones administrativas (rollback, reconfiguración, etc.)

---

### Secrets

Gestión de secretos por producto y entorno.

#### Secrets v1 (Legacy)

Base: `/secrets`

**Nota:** La organización se resuelve automáticamente desde los scopes del usuario JWT.

##### `GET /secrets/:product/:environment`
Obtiene secretos de un producto/entorno.

**Path Params:**
- `product`: Nombre del producto
- `environment`: Nombre del entorno (`local`, `staging`, `production`)

**Query Params:**
- `keys`: Lista de claves separadas por coma (opcional). Si no se envía, se obtienen desde `secretsrc.json`

**Response:**
```typescript
Array<{
  header: { [key: string]: string };
  body: string;          // Contenido del secreto
  key: string;           // Nombre del archivo
  status: number;        // 200 o 404
}>
```

**Resolución de organización:**
1. Si el usuario tiene una sola org → usa esa
2. Si está en whitelist CENCOTECH → `cencosud-cencotech`
3. Default → `cencosud-xlabs`

---

##### `POST /secrets/:product/:environment/:key`
Crea/actualiza un secreto.

**Path Params:**
- `product`: Nombre del producto
- `environment`: Nombre del entorno
- `key`: Nombre del archivo/secreto

**Body:** Raw body (texto plano)

**Headers automáticos:**
- `x-meta-owner`: Email del usuario desde JWT
- `Content-Type: text/plain`

**Response:** `void`

---

#### Secrets v2

Base: `/v2/secrets/:organization/:product/:environment`

Versión mejorada que recibe la organización explícitamente.

##### `GET /v2/secrets/:organization/:product/:environment`
Obtiene secretos.

**Path Params:**
- `organization`: Nombre de la organización (convertida a lowercase)
- `product`: Nombre del producto
- `environment`: Nombre del entorno

**Query Params:**
- `keys`: Lista de claves separadas por coma (opcional)

**Response:** Mismo que v1

---

##### `POST /v2/secrets/:organization/:product/:environment/:key`
Crea/actualiza un secreto.

**Path Params:**
- `organization`: Nombre de la organización
- `product`: Nombre del producto
- `environment`: Nombre del entorno
- `key`: Nombre del archivo/secreto

**Body:** Raw body (texto plano)

**Headers:** Mismos que v1

---

## Análisis de Utilidad para Repo Dash

### Endpoints de Alta Prioridad (Implementar primero)

| Endpoint | Uso en Web | Prioridad |
|----------|-----------|-----------|
| `GET /me/organizations` | Selector de organización, filtro de productos | **Crítica** |
| `GET /me` | Perfil de usuario, permisos | **Alta** |
| `GET /products/:org/:name/pipelines` | Lista de deployments del producto | **Crítica** |
| `GET /products/:org/:name/pipelines/:commit` | Detalle de deployment | **Crítica** |
| `GET /repositories/:org/:name/available` | Validación al crear producto | **Alta** |
| `POST /repositories/:org/` | Crear nuevo producto | **Alta** |

### Endpoints de Media Prioridad

| Endpoint | Uso en Web | Prioridad |
|----------|-----------|-----------|
| `POST /operations/...` | Acciones administrativas (rollback, rebuild) | Media |
| `GET /v2/secrets/...` | Configuración de secretos del producto | Media |
| `POST /v2/secrets/...` | Actualizar secretos | Media |

### Endpoints de Baja Prioridad

| Endpoint | Uso en Web | Prioridad |
|----------|-----------|-----------|
| `GET /health`, `/ping` | Healthchecks, monitoreo | Baja |

### Notas de Implementación

1. **Autenticación:** Todos los endpoints protegidos usan JWT Bearer token mediante `@team_seki/nestjs-jwt-module`

2. **Errores comunes:**
   - `OrgNotSupportedException`: Organización no configurada en `githubrc.json`
   - `SecretNotFoundException`: Archivo de secrets no encontrado
   - `RepositoryAlreadyCreatedException`: Repo existe con contenido (409)
   - `OperationException`: Error del control plane
   - `PipelinesException`: Error al consultar pipelines

3. **Organizaciones soportadas:**
   Definidas en `githubrc.json` del BFF:
   - `cencosud-xlabs`
   - `cencosud-cencotech`
   - Otras configuradas por ambiente

4. **Versionado:**
   - Secrets v1 está en modo legacy con resolución automática de org
   - Secrets v2 es la versión actual recomendada
   - Todo el resto de endpoints son v1 implícito

---

*Documento generado el 6 Feb 2025 - Seki BFF API Reference*
