import { error, log } from "@therockstorm/utils"
import { SQSEvent } from "aws-lambda"
import { SendMessageBatchResult as BatchRes } from "aws-sdk/clients/sqs"
import "source-map-support/register"
import { name } from "../package.json"
import { version } from "./config"
import { toReqs } from "./mapper"
import { BATCH_ERROR, sendErrorBatch } from "./publishResults"
import { sendHooks } from "./sendHooks"

const v = version()

export const handle = async (evt: SQSEvent): Promise<BatchRes[]> => {
  log(`v=${v} ${JSON.stringify(evt)}`)
  const rs = toReqs(evt.Records)
  try {
    return await sendHooks(rs)
  } catch (err) {
    error(name, err)
    if (err.message !== BATCH_ERROR) return await sendErrorBatch(rs)
    else throw err // Batch won't be deleted from queue and will be retried
  }
}
