import { URL } from "url"
import { Req } from "../src"
import * as http from "../src/http"
import * as mapper from "../src/mapper"
import * as util from "../src/util"

jest.mock("http")
jest.mock("https")
jest.mock("../src/http")
jest.mock("../src/mapper")
jest.mock("../src/util")
const toHttpReq = mapper.toHttpReq as jest.Mock
const toHttpRes = mapper.toHttpRes as jest.Mock
const post = http.post as jest.Mock
const epochMs = util.epochMs as jest.Mock
import { postHook } from "../src/postHook"

const START = new Date().getTime()
const END = START + 1000
const REQ = {
  event: {
    body: "bod",
    id: "id",
    signatureSha256: "sig",
    topic: "top",
    url: "https://www.example.com"
  }
} as Req

const headers = (req: Req, sig?: string) => ({
  "Content-Length": req.event.body.length.toString(),
  "Content-Type": "application/json",
  "User-Agent": "dwolla-webhooks/1.1",
  "X-Dwolla-Topic": req.event.topic,
  "X-Request-Signature-SHA-256": sig
})

describe("postHook", () => {
  afterEach(() => {
    toHttpReq.mockReset()
    toHttpRes.mockReset()
  })

  it("posts req and returns res", async () => {
    const res = {
      data: "",
      headers: {},
      statusCode: 200
    }
    const exp = {
      httpReq: { url: "url" },
      httpRes: { statusCode: 200 },
      req: REQ
    }
    toHttpReq.mockReturnValue(exp.httpReq)
    toHttpRes.mockReturnValue(exp.httpRes)
    post.mockResolvedValue(res)
    epochMs.mockReturnValueOnce(START)
    epochMs.mockReturnValueOnce(END)

    const act = await postHook(exp.req)

    expectPostReq(REQ, REQ.event.signatureSha256)
    expect(toHttpReq).toHaveBeenCalledWith(
      REQ.event.body,
      headers(REQ, REQ.event.signatureSha256),
      START,
      REQ.event.url
    )
    expect(toHttpRes).toHaveBeenCalledWith(END, res.statusCode)
    expect(act).toEqual(exp)
  })

  it("handles error", async () => {
    const err = { message: "msg" }
    const exp = {
      err: err.message,
      httpReq: { url: "url" },
      req: REQ
    }
    toHttpReq.mockReturnValue(exp.httpReq)
    post.mockRejectedValue(err)
    epochMs.mockReturnValueOnce(START)

    await expect(postHook(exp.req)).resolves.toEqual(exp)

    expectPostReq(REQ, REQ.event.signatureSha256)
    expect(toHttpReq).toHaveBeenCalledWith(
      REQ.event.body,
      headers(REQ, REQ.event.signatureSha256),
      START,
      REQ.event.url
    )
  })

  it("sets signature to empty if not provided", async () => {
    post.mockResolvedValue({})
    const req = {
      event: { id: "i", url: REQ.event.url, topic: "t", body: "b" }
    } as Req

    await postHook(req)

    expectPostReq(req, "")
  })

  const expectPostReq = (req: Req, sig?: string) => {
    const url = new URL(req.event.url)
    expect(post).toHaveBeenCalledWith(req.event.body, {
      headers: headers(req, sig),
      hostname: url.hostname,
      method: "POST",
      path: url.pathname,
      port: url.port,
      protocol: url.protocol,
      timeout: 10000
    })
  }
})
