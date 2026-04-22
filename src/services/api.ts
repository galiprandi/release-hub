import type { Product } from '@/types/api'

const API_URL = import.meta.env.VITE_SEKI_API_URL || 'https://seki-bff-api.cencosudx.com'

class ApiError extends Error {
  status?: number
  response?: Response

  constructor(message: string, status?: number, response?: Response) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.response = response
  }
}

async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  token: string
): Promise<Response> {
  const headers = new Headers({
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US',
    Authorization: `bearer ${token}`,
    ...options.headers,
  })

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new ApiError(
      `HTTP error! status: ${response.status}`,
      response.status,
      response
    )
  }

  return response
}

export async function getProductPipeline(
  org: string,
  project: string,
  pipelineId: string,
  token: string
): Promise<Product> {
  const url = `${API_URL}/products/${org}/${project}/pipelines/${pipelineId}`
  const response = await fetchWithAuth(url, {}, token)
  return response.json()
}

export async function getPipelines(
  org: string,
  project: string,
  token: string
): Promise<Product> {
  const url = `${API_URL}/products/${org}/${project}/pipelines`
  const response = await fetchWithAuth(url, {}, token)
  return response.json()
}

export { ApiError }
