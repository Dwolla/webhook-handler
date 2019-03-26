import { SQSEvent } from "aws-lambda"
import * as pr from "../src/publishResults"
import * as sh from "../src/sendHooks"

jest.mock("../src/sendHooks")
jest.mock("../src/publishResults")
const sendHooks = sh.sendHooks as jest.Mock
const sendErrorBatch = pr.sendErrorBatch as jest.Mock
import { handle } from "../src/handler"

describe("handler", () => {
  afterEach(() => sendErrorBatch.mockReset())

  it("calls sendHooks", async () => {
    await handle({
      Records: [{ body: "{}", messageAttributes: {} }]
    } as SQSEvent)

    expect(sendHooks).toHaveBeenCalled()
  })

  it("calls sendErrorBatch on error", async () => {
    const err = new Error()
    sendHooks.mockRejectedValue(err)

    await handle({
      Records: [{ body: "{}", messageAttributes: {} }]
    } as SQSEvent)

    expect(sendErrorBatch).toHaveBeenCalled()
  })

  it("throws if BATCH_ERROR", async () => {
    const err = new Error(pr.BATCH_ERROR)
    sendHooks.mockRejectedValue(err)

    await expect(
      handle({
        Records: [{ body: "{}", messageAttributes: {} }]
      } as SQSEvent)
    ).rejects.toBe(err)

    expect(sendErrorBatch).not.toHaveBeenCalled()
  })
})
