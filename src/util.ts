const now = () => new Date().toISOString()

const epochMs = (): number => new Date().getTime()

const epochMsTo = (date: string): number => Date.parse(date)

const envVarRequired = (name: string): string => {
  const envVar = process.env[name]
  if (envVar) {
    return envVar
  }
  throw new Error(`${name} required`)
}

export { now, epochMs, epochMsTo, envVarRequired }
