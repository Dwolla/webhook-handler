import { log } from "@therockstorm/utils"
import { SendMessageBatchResult as BatchResult } from "aws-sdk/clients/sqs"
import pLimit from "p-limit"
import { Req, Res } from "."
import { concurrency } from "./config"
import { postHook } from "./postHook"
import { publishResults } from "./publishResults"

const limit = pLimit(concurrency())

export const sendHooks = async (reqs: Req[]): Promise<BatchResult[]> =>
  publishResults(await Promise.all(reqs.map((r) => limit<Req[], Res>(post, r))))

const post = (r: Req) => {
  if (r.requeue) {
    log(`Re-queuing message for id=${r.event.id}`)
    return Promise.resolve({ req: r })
  } else {
    return postHook(r)
  }
}
