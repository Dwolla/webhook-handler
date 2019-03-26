export const now = () => new Date().toISOString()

export const epochMs = (): number => new Date().getTime()

export const epochMsTo = (date: string): number => Date.parse(date)
