export const now = () => new Date().toISOString()

export const epochMs = (): number => new Date().getTime()

export const epochMsTo = (date: string): number => Date.parse(date)

export const envVarRequired = (name: string): string => {
  const envVar = process.env[name]
  if (envVar) {
    return envVar
  }
  throw new Error(`${name} required`)
}
