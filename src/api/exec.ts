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

/**
 * Execute command with AI error processing
 * @param command - Bash command to execute
 * @param processErrorFn - Optional function to process errors with AI
 * @returns Promise with stdout and stderr
 * @throws Error if command fails (processed by AI if processErrorFn provided)
 */
export const runCommandWithAI = async (
  command: string,
  processErrorFn?: (error: Error | string) => Promise<string>
): Promise<ExecResponse> => {
  try {
    return await runCommand(command)
  } catch (err) {
    if (processErrorFn) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      const friendlyError = await processErrorFn(errorObj)
      throw new Error(friendlyError)
    }
    throw err
  }
}
