import { SendMessageBatchResult } from "aws-sdk/clients/sqs"
import { Req, Res } from "../src"
import * as config from "../src/config"
import * as ph from "../src/postHook"
import * as pr from "../src/publishResults"

jest.mock("../src/config")
jest.mock("../src/postHook")
jest.mock("../src/publishResults")
const postHook = ph.postHook as jest.Mock
const publishResults = pr.publishResults as jest.Mock
const concurrency = config.concurrency as jest.Mock
concurrency.mockReturnValue(1)
import { sendHooks } from "../src/sendHooks"

describe("sendHooks", () => {
  afterEach(() => {
    postHook.mockReset()
    publishResults.mockReset()
  })

  it("posts hook and publishes results", async () => {
    const req = [{} as Req, { retryCnt: 1 } as Req]
    const exp = [{ Successful: [], Failed: [] }] as SendMessageBatchResult[]
    const res = [{} as Res, { err: "err" } as Res]
    postHook.mockResolvedValueOnce(res[0])
    postHook.mockResolvedValueOnce(res[1])
    publishResults.mockResolvedValue(exp)

    expect(await sendHooks(req)).toBe(exp)

    expect(postHook).toHaveBeenCalledTimes(2)
    expect(postHook).toHaveBeenCalledWith(req[0])
    expect(postHook).toHaveBeenCalledWith(req[1])
    expect(publishResults).toHaveBeenCalledWith(res)
  })

  it("does not post hook if requeue", async () => {
    const exp = [{ Successful: [], Failed: [] }] as SendMessageBatchResult[]
    postHook.mockResolvedValue({} as Res)
    publishResults.mockResolvedValue(exp)

    expect(await sendHooks([{ requeue: true } as Req])).toBe(exp)

    expect(postHook).not.toHaveBeenCalled()
  })
})
