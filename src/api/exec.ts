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
 * Execute any bash command via Vite dev server.
 * Strictly enforces array-based arguments to prevent shell injection.
 * @param command - Bash command to execute as an array of arguments
 * @returns Promise with stdout and stderr
 * @throws Error if command fails (success: false) or if command is not an array
 */
export const runCommand = async (command: string[], stdin?: string): Promise<ExecResponse> => {
  if (!Array.isArray(command)) {
    throw new Error('Security violation: runCommand requires an array of arguments to prevent shell injection.')
  }

  const response = await apiExec.post<ExecResponse>(
    '/exec',
    { args: command, stdin },
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
