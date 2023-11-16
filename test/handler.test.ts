import { SQSEvent } from "aws-lambda"
import { sendErrorBatch, BATCH_ERROR } from "../src/publishResults"
import { sendHooks } from "../src/sendHooks"
import { handle } from "../src/handler"

jest.mock("../src/sendHooks")
jest.mock("../src/publishResults")
const sendHooksMock = sendHooks as jest.Mock
const sendErrorBatchMock = sendErrorBatch as jest.Mock

describe("handler", () => {
  // afterEach(() => jest.resetAllMocks())

  it("calls sendHooks", async () => {
    await handle({
      Records: [{ body: "{}", messageAttributes: {} }],
    } as SQSEvent)

    expect(sendHooksMock).toHaveBeenCalled()
  })

  it("calls sendErrorBatch on error", async () => {
    const err = new Error()
    sendHooksMock.mockRejectedValue(err)

    await handle({
      Records: [{ body: "{}", messageAttributes: {} }],
    } as SQSEvent)

    expect(sendErrorBatchMock).toHaveBeenCalled()
  })

  it("throws if BATCH_ERROR", async () => {
    const err = new Error(BATCH_ERROR)
    sendHooksMock.mockRejectedValue(err)

    await expect(
      handle({
        Records: [{ body: "{}", messageAttributes: {} }],
      } as SQSEvent)
    ).rejects.toBe(err)

    expect(sendErrorBatchMock).not.toHaveBeenCalled()
  })
})
