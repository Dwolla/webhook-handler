const log = (...args: any[]): void => console.log(args)
const error = (...args: any[]): void => console.log("[error]", args)
const warn = (...args: any[]): void => console.log("[warn]", args)

export { log, error, warn }
