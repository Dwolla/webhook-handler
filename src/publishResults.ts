import { error, log, warn } from "./logger"
import SQS, {
  SendMessageBatchRequestEntryList as EntryList,
  SendMessageBatchResult as BatchRes,
} from "aws-sdk/clients/sqs"
import { Req, Res } from "."
import { errorQueueUrl, partnerQueueUrl, resultQueueUrl } from "./config"
import { partition, toError, toRequeue, toResult } from "./mapper"

export const BATCH_ERROR = "Failed to send error batch"

type Queue = Readonly<{ name: string; url: string }>
const [partnerQueue, resultQueue, errorQueue, sqs] = [
  { name: "partner", url: partnerQueueUrl() },
  { name: "result", url: resultQueueUrl() },
  { name: "error", url: errorQueueUrl() },
  new SQS({
    httpOptions: {
      // @ts-ignore
      sslEnabled: true,
      timeout: 5000, // Default of 120000 is > function timeout
    },
  }),
]

export const publishResults = async (
  rs: Res[],
  attempt = 1
): Promise<BatchRes[]> => {
  const [result, requeue] = partition(rs)
  return ([] as BatchRes[]).concat(
    ...(await Promise.all([
      sendBatch(resultQueue, toResult(result), rs, attempt),
      sendBatch(partnerQueue, toRequeue(requeue), rs, attempt),
    ]))
  )
}

export const sendErrorBatch = async (reqs: Req[]): Promise<BatchRes[]> =>
  sendBatch(errorQueue, toError(reqs), [], 1, true)

const sendBatch = async (
  q: Queue,
  es: EntryList,
  rs: Res[],
  attempt: number,
  throwOnErr = false
): Promise<BatchRes[]> => {
  let res: BatchRes = { Successful: [], Failed: [] }
  if (!es.length) return Promise.resolve([res])

  log(`Sending ${es.length} to ${q.url}`)
  try {
    res = await sqs.sendMessageBatch({ QueueUrl: q.url, Entries: es }).promise()
  } catch (e) {
    error("Throwing", e)
    throw e
  }

  if (res.Successful.length) {
    log(`Sent ${q.name}`, res.Successful.map((s) => s.Id).join(","))
  }
  if (res.Failed.length) {
    if (throwOnErr) throw new Error(BATCH_ERROR)

    warn(
      `Failed ${q.name}, attempt=${attempt}`,
      res.Failed.map((s) => JSON.stringify(s)).join("\n")
    )
    const reqs = rs.filter((r) =>
      res.Failed.map((f) => f.Id).includes(r.req.event.id)
    )
    return await (attempt < 3
      ? publishResults(reqs, attempt + 1)
      : sendErrorBatch(reqs.map((r) => r.req)))
  }

  return [res]
}
