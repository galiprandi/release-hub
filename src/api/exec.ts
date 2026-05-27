import axios from 'axios'
import { joinArgs } from '@/utils/shell'

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
 * @param command - Bash command to execute (as string or array of args)
 * @param stdin - Optional string to pass to the command's standard input
 * @returns Promise with stdout and stderr
 * @throws Error if command fails (success: false)
 */
export const runCommand = async (command: string | string[], stdin?: string): Promise<ExecResponse> => {
  const finalCommand = Array.isArray(command) ? joinArgs(command) : command

  const response = await apiExec.post<ExecResponse>(
    '/exec',
    { command: finalCommand, stdin },
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
