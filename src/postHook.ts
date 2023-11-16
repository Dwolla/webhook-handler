import { log, warn } from "./logger"
import { URL } from "url"
import { Req, Res } from "."
import { post } from "./http"
import { toHttpReq, toHttpRes } from "./mapper"
import { epochMs } from "./util"

const postHook = async (req: Req): Promise<Res> => {
  const eUrl = req.event.url
  const eBody = req.event.body
  const msg = `id=${req.event.id} url=${eUrl}`
  const headers = {
    "Content-Length": eBody.length.toString(),
    "Content-Type": "application/json",
    "User-Agent": "dwolla-webhooks/1.1",
    "X-Dwolla-Topic": req.event.topic,
    "X-Request-Signature-SHA-256": req.event.signatureSha256 || "",
  }
  const start = epochMs()

  try {
    const url = new URL(eUrl)
    log(msg)

    const status = (
      await post(eBody, {
        headers,
        hostname: url.hostname,
        method: "POST",
        path: url.search ? `${url.pathname}${url.search}` : url.pathname,
        port: url.port,
        protocol: url.protocol,
        timeout: 10000,
      })
    ).statusCode

    log(`${msg} status=${status} successful=${status && status < 300}`)
    return {
      httpReq: toHttpReq(eBody, headers, start, eUrl),
      httpRes: status ? toHttpRes(epochMs(), status) : undefined,
      req,
    }
  } catch (err: any) {
    warn(`${msg} code=${err.code} message=${err.message}`, err)
    return {
      err: err.message,
      httpReq: toHttpReq(eBody, headers, start, eUrl),
      req,
    }
  }
}

export { postHook }
