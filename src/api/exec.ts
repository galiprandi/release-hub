import axios from 'axios'

const apiExec = axios.create({
  baseURL: '/local',
})

interface ExecResponse {
  stdout: string
  stderr: string
}

/**
 * Execute any bash command via Vite dev server
 * @param command - Bash command to execute (e.g., 'ls -la', 'gh api repos/...')
 * @returns Promise with stdout and stderr
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
  return response.data
}
