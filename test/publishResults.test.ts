import SQS from "aws-sdk/clients/sqs"
import { Res } from "../src"
import * as config from "../src/config"
import * as mapper from "../src/mapper"

jest.mock("aws-sdk/clients/sqs")
jest.mock("../src/config")
jest.mock("../src/mapper")
jest.mock("../src/util")
const sqs = (SQS as unknown) as jest.Mock
const toResult = mapper.toResult as jest.Mock
const toRequeue = mapper.toRequeue as jest.Mock
const toError = mapper.toError as jest.Mock
const partition = mapper.partition as jest.Mock
const partnerQueueUrl = config.partnerQueueUrl as jest.Mock
const resultQueueUrl = config.resultQueueUrl as jest.Mock
const errorQueueUrl = config.errorQueueUrl as jest.Mock
const sendMessageBatch = jest.fn()
const [PARTNER_URL, RESULT_URL, ERROR_URL] = ["url", "resultUrl", "errorUrl"]
sqs.mockImplementationOnce(() => ({ sendMessageBatch }))
partnerQueueUrl.mockReturnValue(PARTNER_URL)
resultQueueUrl.mockReturnValue(RESULT_URL)
errorQueueUrl.mockReturnValue(ERROR_URL)

import { publishResults } from "../src/publishResults"

describe("publishResults", () => {
  afterEach(() => sendMessageBatch.mockReset())

  it("sends message batch", async () => {
    const rs = [{}] as Res[]
    const result = [{ id: 1 }]
    const requeue = [{ id: 2 }]
    const resultEs = [{ id: 4 }]
    const requeueEs = [{ id: 5 }]
    const exp = { Successful: [{}], Failed: [] }
    sendMessageBatch.mockReturnValue({ promise: () => exp })
    partition.mockReturnValue([result, requeue])
    toResult.mockReturnValue(resultEs)
    toRequeue.mockReturnValue(requeueEs)

    expect(await publishResults(rs)).toEqual([exp, exp])

    expect(partition).toHaveBeenCalledWith(rs)
    expect(toResult).toHaveBeenCalledWith(result)
    expect(toRequeue).toHaveBeenCalledWith(requeue)
    expect(sendMessageBatch).toHaveBeenCalledTimes(2)
    expect(sendMessageBatch).toHaveBeenCalledWith({
      Entries: requeueEs,
      QueueUrl: PARTNER_URL
    })
    expect(sendMessageBatch).toHaveBeenCalledWith({
      Entries: resultEs,
      QueueUrl: RESULT_URL
    })
  })

  it("try 3 times and then throw", async () => {
    const id = "10"
    const rs = [{ req: { event: { id } } }] as Res[]
    const result = [{ id: 1 }]
    const resultEs = [{ id: 2 }]
    const errorEs = [{ id: 3 }]
    sendMessageBatch.mockReturnValue({
      promise: () => ({ Failed: [{ Id: id }], Successful: [] })
    })
    partition.mockReturnValue([result, [], []])
    toResult.mockReturnValue(resultEs)
    toRequeue.mockReturnValue([])
    toError.mockReturnValue(errorEs)

    await expect(publishResults(rs)).rejects.toEqual(
      new Error("Failed to send error batch.")
    )

    const args = { Entries: resultEs, QueueUrl: RESULT_URL }

    expect(partition).toHaveBeenCalledWith(rs)
    expect(toResult).toHaveBeenCalledWith(result)
    expect(toError).toHaveBeenCalledWith(rs.map(e => e.req))
    expect(sendMessageBatch).toHaveBeenCalledTimes(4)
    expect(sendMessageBatch).toHaveBeenCalledWith(args)
    expect(sendMessageBatch).lastCalledWith({
      Entries: errorEs,
      QueueUrl: ERROR_URL
    })
  })
})
