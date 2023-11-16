import { URL } from "url"
import { Req } from "../src"
import { post } from "../src/http"
import { toHttpReq, toHttpRes } from "../src/mapper"
import { epochMs } from "../src/util"
import { postHook } from "../src/postHook"

jest.mock("http")
jest.mock("https")
jest.mock("../src/http")
jest.mock("../src/mapper")
jest.mock("../src/util")
const toHttpReqMock = jest.mocked(toHttpReq)
const toHttpResMock = jest.mocked(toHttpRes)
const postMock = jest.mocked(post)
const epochMsMock = jest.mocked(epochMs)

const START = new Date().getTime()
const END = START + 1000
const REQ = {
  event: {
    body: "bod",
    id: "id",
    signatureSha256: "sig",
    topic: "top",
    url: "https://www.example.com",
  },
} as Req

const headers = (req: Req, sig?: string) => ({
  "Content-Length": req.event.body.length.toString(),
  "Content-Type": "application/json",
  "User-Agent": "dwolla-webhooks/1.1",
  "X-Dwolla-Topic": req.event.topic,
  "X-Request-Signature-SHA-256": sig,
})

describe("postHook", () => {
  afterEach(() => {
    toHttpReqMock.mockReset()
    toHttpResMock.mockReset()
  })

  it("posts req and returns res", async () => {
    const res = {
      data: "",
      headers: {},
      statusCode: 200,
    }
    const exp = {
      httpReq: { body: "", headers: [], timestamp: "", url: "url" },
      httpRes: { body: "", headers: [], statusCode: 200, timestamp: "" },
      req: REQ,
    }
    toHttpReqMock.mockReturnValue(exp.httpReq)
    toHttpResMock.mockReturnValue(exp.httpRes)
    postMock.mockResolvedValue(res)
    epochMsMock.mockReturnValueOnce(START)
    epochMsMock.mockReturnValueOnce(END)

    const act = await postHook(exp.req)

    expectPostReq(REQ, REQ.event.signatureSha256)
    expect(toHttpReqMock).toHaveBeenCalledWith(
      REQ.event.body,
      headers(REQ, REQ.event.signatureSha256),
      START,
      REQ.event.url
    )
    expect(toHttpResMock).toHaveBeenCalledWith(END, res.statusCode)
    expect(act).toEqual(exp)
  })

  it("handles error", async () => {
    const err = { message: "msg" }
    const exp = {
      err: err.message,
      httpReq: { body: "", headers: [], timestamp: "", url: "url" },
      req: REQ,
    }
    toHttpReqMock.mockReturnValue(exp.httpReq)
    postMock.mockRejectedValue(err)
    epochMsMock.mockReturnValueOnce(START)

    await expect(postHook(exp.req)).resolves.toEqual(exp)

    expectPostReq(REQ, REQ.event.signatureSha256)
    expect(toHttpReqMock).toHaveBeenCalledWith(
      REQ.event.body,
      headers(REQ, REQ.event.signatureSha256),
      START,
      REQ.event.url
    )
  })

  it("sets signature to empty if not provided", async () => {
    postMock.mockResolvedValue({})
    const req = {
      event: { id: "i", url: REQ.event.url, topic: "t", body: "b" },
    } as Req

    await postHook(req)

    expectPostReq(req, "")
  })

  const expectPostReq = (req: Req, sig?: string) => {
    const url = new URL(req.event.url)
    expect(postMock).toHaveBeenCalledWith(req.event.body, {
      headers: headers(req, sig),
      hostname: url.hostname,
      method: "POST",
      path: url.pathname,
      port: url.port,
      protocol: url.protocol,
      timeout: 10000,
    })
  }
})
