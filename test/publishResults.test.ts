// import SQS from "aws-sdk/clients/sqs"
// import { Res } from "../src"
// import { partnerQueueUrl, resultQueueUrl, errorQueueUrl } from "../src/config"
// import { toResult, toRequeue, toError, partition } from "../src/mapper"
//
// jest.mock("aws-sdk/clients/sqs")
// jest.mock("../src/config")
// jest.mock("../src/mapper")
// jest.mock("../src/util")
// const sqs = jest.mocked(SQS)
// const toResultMock = jest.mocked(toResult)
// const toRequeueMock = jest.mocked(toRequeue)
// const toErrorMock = jest.mocked(toError)
// const partitionMock = jest.mocked(partition)
// const partnerQueueUrlMock = jest.mocked(partnerQueueUrl)
// const resultQueueUrlMock = jest.mocked(resultQueueUrl)
// const errorQueueUrlMock = jest.mocked(errorQueueUrl)
// const sendMessageBatch = jest.fn()
// const [PARTNER_URL, RESULT_URL, ERROR_URL] = ["url", "resultUrl", "errorUrl"]
// sqs.mockImplementationOnce(() => ({ sendMessageBatch }))
// partnerQueueUrlMock.mockReturnValue(PARTNER_URL)
// resultQueueUrlMock.mockReturnValue(RESULT_URL)
// errorQueueUrlMock.mockReturnValue(ERROR_URL)
//
// import { publishResults } from "../src/publishResults"
//
// describe("publishResults", () => {
//   afterEach(() => sendMessageBatch.mockReset())
//
//   it("sends message batch", async () => {
//     const rs = [{}] as Res[]
//     const result = [{ id: 1 }]
//     const requeue = [{ id: 2 }]
//     const resultEs = [{ id: 4 }]
//     const requeueEs = [{ id: 5 }]
//     const exp = { Successful: [{}], Failed: [] }
//     sendMessageBatch.mockReturnValue({ promise: () => exp })
//     partitionMock.mockReturnValue([result, requeue])
//     toResultMock.mockReturnValue(resultEs)
//     toRequeueMock.mockReturnValue(requeueEs)
//
//     expect(await publishResults(rs)).toEqual([exp, exp])
//
//     expect(partitionMock).toHaveBeenCalledWith(rs)
//     expect(toResultMock).toHaveBeenCalledWith(result)
//     expect(toRequeueMock).toHaveBeenCalledWith(requeue)
//     expect(sendMessageBatch).toHaveBeenCalledTimes(2)
//     expect(sendMessageBatch).toHaveBeenCalledWith({
//       Entries: requeueEs,
//       QueueUrl: PARTNER_URL,
//     })
//     expect(sendMessageBatch).toHaveBeenCalledWith({
//       Entries: resultEs,
//       QueueUrl: RESULT_URL,
//     })
//   })
//
//   it("try 3 times and then throw", async () => {
//     const id = "10"
//     const rs = [{ req: { event: { id } } }] as Res[]
//     const result = [{ id: 1 }]
//     const resultEs = [{ id: 2 }]
//     const errorEs = [{ Id: 3, MessageAttributes: [], MessageBody: "" }]
//     sendMessageBatch.mockReturnValue({
//       promise: () => ({ Failed: [{ Id: id }], Successful: [] }),
//     })
//     partitionMock.mockReturnValue([result, [], []])
//     toResultMock.mockReturnValue(resultEs)
//     toRequeueMock.mockReturnValue([])
//     toErrorMock.mockReturnValue(errorEs)
//
//     await expect(publishResults(rs)).rejects.toEqual(
//       new Error("Failed to send error batch")
//     )
//
//     const args = { Entries: resultEs, QueueUrl: RESULT_URL }
//
//     expect(partitionMock).toHaveBeenCalledWith(rs)
//     expect(toResultMock).toHaveBeenCalledWith(result)
//     expect(toErrorMock).toHaveBeenCalledWith(rs.map((e) => e.req))
//     expect(sendMessageBatch).toHaveBeenCalledTimes(4)
//     expect(sendMessageBatch).toHaveBeenCalledWith(args)
//     expect(sendMessageBatch).lastCalledWith({
//       Entries: errorEs,
//       QueueUrl: ERROR_URL,
//     })
//   })
// })
