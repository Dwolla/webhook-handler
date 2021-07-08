import http, { RequestOptions } from "http"
import https from "https"
import { IHttp } from "."

export const post = (body: string, opts: RequestOptions): Promise<IHttp> =>
  new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout
    const res = (val: any) => {
      clearTimeout(timer)
      resolve(val)
    }
    const rej = (val: any) => {
      clearTimeout(timer)
      reject(val)
    }
    const fn = opts.protocol === "https:" ? https : http
    const req = fn.request(opts, (r) => {
      r.resume()
      res({ statusCode: r.statusCode })
    })
    if (opts.timeout) {
      timer = setTimeout(() => {
        req.abort()
        rej(new Error(`Exceeded ${opts.timeout}ms timeout`))
      }, opts.timeout)
    }
    req.on("error", (err) => (req.aborted ? null : rej(err)))
    req.end(body)
  })
