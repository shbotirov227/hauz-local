import { createServerOnlyFn } from '@tanstack/react-start'

type ServerEnv = {
  endpoint: string
  projectId: string
  apiKey: string
  functionId: string
  nodeEnv: string
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export const getServerEnv = createServerOnlyFn((): ServerEnv => {
  return {
    endpoint: readRequiredEnv('APPWRITE_ENDPOINT'),
    projectId: readRequiredEnv('APPWRITE_PROJECT_ID'),
    apiKey: readRequiredEnv('APPWRITE_API_KEY'),
    functionId: readRequiredEnv('APPWRITE_FUNCTION_ID'),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  }
})
