import { log } from "@therockstorm/utils"
import { SQSMessageAttribute, SQSRecord } from "aws-lambda"
import {
  MessageBodyAttributeMap,
  SendMessageBatchRequestEntryList
} from "aws-sdk/clients/sqs"
import { Event, Header, IHttpReq, IHttpRes, Partitions, Req, Res } from "."
import { partnerQueueUrl } from "./config"
import { epochMs, epochMsTo, now } from "./util"

const PARTNER_QUEUE = partnerQueueUrl()
const [MINS, HRS] = [60 * 1000, 3600 * 1000]
const [MAX_RETRIES, MAX_BACKOFF] = [8, 72 * HRS]

export const retries: { [k: string]: number } = {
  1: 15 * MINS,
  2: HRS,
  3: 3 * HRS,
  4: 6 * HRS,
  5: 12 * HRS,
  6: 24 * HRS,
  7: 48 * HRS,
  8: MAX_BACKOFF
}

export const toReqs = (rs: SQSRecord[]): Req[] => {
  const toReq = (r: SQSRecord, event: Event): Req => {
    const toInt = (s: SQSMessageAttribute, max: number): number => {
      // @ts-ignore
      const i = s ? Math.min(parseInt(s.stringValue, 10), max) : 0
      return isNaN(i) ? 0 : i
    }
    const requeueUntil = toInt(
      r.messageAttributes.requeueUntil,
      epochMsTo(event.timestamp) + MAX_BACKOFF
    )

    return {
      event,
      requeue: epochMs() < requeueUntil,
      requeueUntil,
      retryCnt: toInt(r.messageAttributes.retryCnt, MAX_RETRIES)
    }
  }

  return rs.reduce(
    (acc, r) => {
      const e = JSON.parse(r.body)
      if (!acc.filter(a => a.event.id === e.id).length) acc.push(toReq(r, e))
      return acc
    },
    [] as Req[]
  )
}

export const toHttpReq = (
  body: string,
  headers: { [k: string]: string },
  reqTs: number,
  url: string
): IHttpReq => ({
  body: body || "",
  headers: toHeaders(headers),
  timestamp: toIso(reqTs),
  url: url || ""
})

export const toHttpRes = (resTs: number, code: number): IHttpRes => ({
  body: "",
  headers: [],
  statusCode: code || 0,
  timestamp: toIso(resTs)
})

export const partition = (rs: Res[]): Partitions => {
  const retry = (r: Res) =>
    r.req.retryCnt < 8 && (r.err || (r.httpRes && r.httpRes.statusCode >= 400))

  return rs.reduce(
    ([a, b], r): Partitions =>
      r.req.requeue ? [a, [...b, r]] : [[...a, r], retry(r) ? [...b, r] : b],
    [[], []] as Partitions
  )
}

export const toResult = (rs: Res[]): SendMessageBatchRequestEntryList =>
  rs && rs.length
    ? rs.map(r => ({
        Id: r.req.event.id,
        MessageBody: JSON.stringify({
          cause: r.err,
          id: r.req.event.id,
          request: r.httpReq,
          response: r.httpRes,
          retryCnt: r.req.retryCnt
        })
      }))
    : []

export const toRequeue = (rs: Res[]): SendMessageBatchRequestEntryList =>
  rs && rs.length
    ? rs.map(r => ({
        DelaySeconds: 900, // 15 mins
        Id: r.req.event.id,
        MessageAttributes: calcAttrs(r.req),
        MessageBody: JSON.stringify(r.req.event)
      }))
    : []

export const toError = (reqs: Req[]) =>
  reqs && reqs.length
    ? reqs.map(r => ({
        Id: r.event.id,
        MessageAttributes: attrs(r.retryCnt, r.requeueUntil),
        MessageBody: JSON.stringify(r.event)
      }))
    : []

const toIso = (n?: number) => (n ? new Date(n).toISOString() : now())

const toHeaders = (hs: any): Header[] =>
  hs ? Object.keys(hs).map((h: any) => ({ name: h, value: hs[h] })) : []

const calcAttrs = (r: Req) => {
  const rc = r.retryCnt + (r.requeue ? 0 : 1)
  const am = attrs(
    rc,
    r.requeue ? r.requeueUntil : epochMsTo(r.event.timestamp) + retries[rc] || 0
  )
  log(
    `id=${r.event.id}`,
    Object.keys(am)
      .map(k => `${k}=${am[k].StringValue}`)
      .join(" ")
  )
  return am
}

const attrs = (rc: number, ru: number): MessageBodyAttributeMap => ({
  partnerQueueUrl: { StringValue: PARTNER_QUEUE, DataType: "String" },
  requeueUntil: { StringValue: ru.toString(), DataType: "Number" },
  retryCnt: { StringValue: rc.toString(), DataType: "Number" }
})
