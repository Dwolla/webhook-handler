import { SendMessageBatchResult } from "aws-sdk/clients/sqs"
import { Req, Res, Event } from "../src"
import { concurrency } from "../src/config"
import { postHook } from "../src/postHook"
import { publishResults } from "../src/publishResults"

jest.mock("../src/config")
jest.mock("../src/postHook")
jest.mock("../src/publishResults")
const postHookMock = postHook as jest.Mock
const publishResultsMock = publishResults as jest.Mock
const concurrencyMock = concurrency as jest.Mock
concurrencyMock.mockReturnValue(1)
import { sendHooks } from "../src/sendHooks"
const event: Event = {
  id: "id",
  url: "url",
  topic: "topic",
  body: "body",
  signatureSha256: "signature",
  timestamp: "timestamp",
}

describe("sendHooks", () => {
  afterEach(() => {
    postHookMock.mockReset()
    publishResultsMock.mockReset()
  })

  it("posts hook and publishes results", async () => {
    const req = [{ event } as Req, { event, retryCnt: 1 } as Req]
    const exp = [{ Successful: [], Failed: [] }] as SendMessageBatchResult[]
    const res = [{} as Res, { err: "err" } as Res]
    postHookMock.mockResolvedValueOnce(res[0])
    postHookMock.mockResolvedValueOnce(res[1])
    publishResultsMock.mockResolvedValue(exp)

    expect(await sendHooks(req)).toBe(exp)

    expect(postHookMock).toHaveBeenCalledTimes(2)
    expect(postHookMock).toHaveBeenCalledWith(req[0])
    expect(postHookMock).toHaveBeenCalledWith(req[1])
    expect(publishResultsMock).toHaveBeenCalledWith(res)
  })

  it("does not post hook if requeue", async () => {
    const exp = [{ Successful: [], Failed: [] }] as SendMessageBatchResult[]
    postHookMock.mockResolvedValue({} as Res)
    publishResultsMock.mockResolvedValue(exp)

    expect(await sendHooks([{ event, requeue: true } as Req])).toBe(exp)

    expect(postHookMock).not.toHaveBeenCalled()
  })
})
