import axios from 'axios'

export const apiExec = axios.create({
  baseURL: '/local',
})

interface ExecResponse {
  stdout: string
  stderr: string
  success: boolean
  error?: string
}

/**
 * Execute any bash command via Vite dev server
 * @param command - Bash command to execute (e.g., 'ls -la', 'gh api repos/...')
 * @returns Promise with stdout and stderr
 * @throws Error if command fails (success: false)
 */
export const runCommand = async (command: string): Promise<ExecResponse> => {
  const response = await apiExec.post<ExecResponse>(
    '/exec',
    { command },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
  const data = response.data
  if (!data.success) {
    throw new Error(data.error || 'Command failed')
  }
  return data
}

