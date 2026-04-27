import axios from 'axios'
import type { PipelineStatusResponse } from './seki.type'

// Helper to serialize params with bracket notation for nested objects
const serializeParams = (params: Record<string, unknown>): string => {
  const parts: string[] = []

  const encode = (key: string, value: unknown) => {
    if (value === null || value === undefined) return

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Nested object - use bracket notation
      Object.entries(value).forEach(([subKey, subValue]) => {
        encode(`${key}[${subKey}]`, subValue)
      })
    } else if (Array.isArray(value)) {
      // Array
      value.forEach((item, index) => {
        encode(`${key}[${index}]`, item)
      })
    } else {
      // Primitive value
      parts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      )
    }
  }

  Object.entries(params).forEach(([key, value]) => {
    encode(key, value)
  })

  return parts.join('&')
}

// Helper to get token from localStorage or fallback to env
const getToken = (): string => {
  const storedToken = localStorage.getItem('seki_api_token')
  if (storedToken) return storedToken
  return import.meta.env.VITE_SEKI_API_TOKEN || ''
}

export const apiSeki = axios.create({
  baseURL: '/api',
  headers: {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  },
  paramsSerializer: {
    serialize: serializeParams,
  },
})

// Add request interceptor to dynamically set Authorization header
apiSeki.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `bearer ${token}`
  }

  // Deshabilitar ETag caching temporalmente para depurar
  // // Agregar If-None-Match si hay un ETag guardado para esta URL
  // if (config.url) {
  //   const cacheKey = `etag_${config.url}`
  //   const cachedEtag = localStorage.getItem(cacheKey)
  //   if (cachedEtag) {
  //     config.headers['If-None-Match'] = cachedEtag
  //   }
  // }

  return config
})

// Add response interceptor to handle ETag caching
// Deshabilitado completamente para evitar que el navegador use ETags cacheados
// apiSeki.interceptors.response.use(
//   (response) => {
//     // Guardar ETag si está presente en la respuesta
//     const etag = response.headers['etag']
//     if (etag) {
//       // Guardar en localStorage usando la URL como clave
//       const cacheKey = `etag_${response.config.url}`
//       localStorage.setItem(cacheKey, etag)
//     }
//     return response
//   },
//   (error) => {
//     return Promise.reject(error)
//   }
// )

/**
 * Fetch pipeline status for specific commit
 */
export const fetchPipeline = (product: string, commit: string) => {
  const [org, name] = product.split('/')
  return apiSeki.get<PipelineStatusResponse>(
    `/products/${org}/${name}/pipelines/${commit}`
  )
}

/**
 * Fetch pipeline status for specific commit with optional tag
 * Used for production pipelines that have both commit and tag
 */
export const fetchPipelineWithTag = (
  product: string, // organization/product
  commit: string,
  tag: string
) => {
  const [org, name] = product.split('/')
  return apiSeki.get<PipelineStatusResponse>(
    `/products/${org}/${name}/pipelines/${commit}/${tag}`
  )
}

interface PipelinesListResponse {
  offset: number
  limit: number
  total: number
  items: PipelineStatusResponse[]
}

/**
 * List pipelines for a product with optional filters
 */
export const listPipelines = (
  product: string,
  params?: {
    limit?: number
    offset?: number
    filters?: Record<string, unknown>
    sort?: Record<string, 'asc' | 'desc'>
  }
) => {
  return apiSeki.get<PipelinesListResponse>(`/products/${product}/pipelines`, {
    params,
  })
}

/**
 * Fetch latest pipeline for a specific stage (staging/production)
 * Filters by git.stage and returns the most recent
 */
export const fetchLatestPipeline = async (
  product: string,
  stage: 'staging' | 'production',
  event?: 'commit' | 'tag'
) => {
  const filters: Record<string, unknown> = {
    'git.stage': stage,
  }
  if (event) {
    filters['git.event'] = event
  }

  const response = await listPipelines(product, {
    limit: 1,
    sort: { updated_at: 'desc' },
    filters,
  })

  if (response.data.items.length === 0) {
    return null
  }

  return response.data.items[0]
}
