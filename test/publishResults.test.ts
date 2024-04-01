import SQS, {
  MessageBodyAttributeMap,
  SendMessageBatchRequestEntryList,
} from "aws-sdk/clients/sqs"
import { Res } from "../src"
import { partnerQueueUrl, resultQueueUrl, errorQueueUrl } from "../src/config"
import { toResult, toRequeue, toError, partition } from "../src/mapper"

jest.mock("aws-sdk/clients/sqs")
jest.mock("../src/config")
jest.mock("../src/mapper")
jest.mock("../src/util")
const sqs = jest.mocked(SQS)
const toResultMock = jest.mocked(toResult)
const toRequeueMock = jest.mocked(toRequeue)
const toErrorMock = jest.mocked(toError)
const partitionMock = jest.mocked(partition)
const partnerQueueUrlMock = jest.mocked(partnerQueueUrl)
const resultQueueUrlMock = jest.mocked(resultQueueUrl)
const errorQueueUrlMock = jest.mocked(errorQueueUrl)

const [PARTNER_URL, RESULT_URL, ERROR_URL] = ["url", "resultUrl", "errorUrl"]
//TODO: RC figure out a better mock for SQS
sqs.mockImplementation(() => {
  return { sendMessageBatch: sendMessageBatchMock } as unknown as SQS
})

const sendMessageBatchMock = jest.fn()

partnerQueueUrlMock.mockReturnValue(PARTNER_URL)
resultQueueUrlMock.mockReturnValue(RESULT_URL)
errorQueueUrlMock.mockReturnValue(ERROR_URL)

import { publishResults } from "../src/publishResults"

describe("publishResults", () => {
  beforeEach(() => {
    sqs.mockReset()
    sendMessageBatchMock.mockReset()
    jest.clearAllMocks()
  })
  afterEach(() => sendMessageBatchMock.mockReset())

  const generateEvent = (id: string): Readonly<Res> => {
    return {
      req: {
        event: {
          id: `Event Id ${id}`,
          url: "someExternalUrl",
          topic: "Topic",
          body: "{}",
          signatureSha256: "string",
          timestamp: Date.now().toString(),
        },
        requeue: false,
        requeueUntil: 0,
        retryCnt: 0,
      },
    }
  }

  const generateSendMessageBatchRequestEntryList = (
    req: Res[]
  ): SendMessageBatchRequestEntryList => {
    return req.map((r) => {
      return {
        DelaySeconds: 900,
        Id: r.req.event.id,
        MessageAttributes: undefined,
        MessageBody: JSON.stringify(r.req.event),
      }
    })
  }

  it("sends message batch", async () => {
    const rs = [{}] as Res[]
    const result: Res[] = [generateEvent("1")]
    const requeue = [generateEvent("2")]
    const resultEs: SendMessageBatchRequestEntryList =
      generateSendMessageBatchRequestEntryList(result)
    const requeueEs: SendMessageBatchRequestEntryList =
      generateSendMessageBatchRequestEntryList(requeue)
    const exp = { Successful: [{}], Failed: [] }
    sendMessageBatchMock.mockReturnValue({ promise: () => exp })
    partitionMock.mockReturnValue([result, requeue])
    toResultMock.mockReturnValue(resultEs)
    toRequeueMock.mockReturnValue(requeueEs)

    expect(await publishResults(rs)).toEqual([exp, exp])

    expect(partitionMock).toHaveBeenCalledWith(rs)
    expect(toResultMock).toHaveBeenCalledWith(result)
    expect(toRequeueMock).toHaveBeenCalledWith(requeue)
    expect(sendMessageBatchMock).toHaveBeenCalledTimes(2)
    expect(sendMessageBatchMock).toHaveBeenCalledWith({
      Entries: requeueEs,
      QueueUrl: PARTNER_URL,
    })
    expect(sendMessageBatchMock).toHaveBeenCalledWith({
      Entries: resultEs,
      QueueUrl: RESULT_URL,
    })
  })

  it("try 3 times and then throw", async () => {
    const id = "10"
    const rs = [{ req: { event: { id } } }] as Res[]
    const result = [generateEvent("1")]
    const resultEs = generateSendMessageBatchRequestEntryList(result)
    const errorEs = [
      {
        Id: id,
        MessageAttributes: {} as MessageBodyAttributeMap,
        MessageBody: "message body",
      },
    ]
    sendMessageBatchMock.mockReturnValue({
      promise: () => ({ Failed: [{ Id: id }], Successful: [] }),
    })
    partitionMock.mockReturnValue([result, []])
    toResultMock.mockReturnValue(resultEs)
    toRequeueMock.mockReturnValue([])
    toErrorMock.mockReturnValue(errorEs)

    await expect(publishResults(rs)).rejects.toEqual(
      new Error("Failed to send error batch")
    )

    const args = { Entries: resultEs, QueueUrl: RESULT_URL }

    expect(partition).toHaveBeenCalledWith(rs)
    expect(toResult).toHaveBeenCalledWith(result)
    expect(toError).toHaveBeenCalledWith(rs.map((e) => e.req))
    expect(sendMessageBatchMock).toHaveBeenCalledTimes(4)
    expect(sendMessageBatchMock).toHaveBeenCalledWith(args)
    expect(sendMessageBatchMock).lastCalledWith({
      Entries: errorEs,
      QueueUrl: ERROR_URL,
    })
  })
})
