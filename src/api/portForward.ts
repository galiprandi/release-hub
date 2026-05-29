import { apiExec } from '@/api/exec'
import { DEFAULT_START_PORT, DEFAULT_MAX_PORTS } from '@/config/portForward'

export interface PortForwardPayload {
  deployment: string
  namespace: string
  context?: string
  localPort: number
  remotePort: number
}

export interface ActivePortForward {
  deployment: string
  namespace: string
  context: string
  localPort: number
  remotePort: number
}

export async function startPortForward(payload: PortForwardPayload): Promise<{ success: boolean; error?: string }> {
  const response = await apiExec.post('/port-forward', payload)
  const data = response.data
  if (!data.success) {
    throw new Error(data.error || 'Port-forward failed')
  }
  return data
}

export async function stopPortForward(payload: Omit<PortForwardPayload, 'localPort' | 'remotePort'>): Promise<{ success: boolean; error?: string }> {
  const response = await apiExec.delete('/port-forward', { data: payload })
  return response.data
}

export async function getActivePortForwards(): Promise<ActivePortForward[]> {
  const response = await apiExec.get('/port-forward')
  return response.data.portForwards || []
}

export async function findFreePort(startPort = DEFAULT_START_PORT, max = DEFAULT_MAX_PORTS): Promise<number | null> {
  const response = await apiExec.get('/port-free', {
    params: { startPort, max },
  })
  return response.data.port ?? null
}
