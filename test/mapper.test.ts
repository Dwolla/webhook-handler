import { SQSRecord } from "aws-lambda"
import { SendMessageBatchRequestEntryList } from "aws-sdk/clients/sqs"
import { Event, IHttpReq, IHttpRes, Req, Res } from "../src"
import { epochMs, epochMsTo, now } from "../src/util"
import {
  partition,
  retries,
  toHttpReq,
  toHttpRes,
  toReqs,
  toRequeue,
  toResult,
} from "../src/mapper"

jest.mock("../src/util")
const epochMsMock = jest.mocked(epochMs)
const epochMsToMock = jest.mocked(epochMsTo)
const nowMock = jest.mocked(now)

const NOW = "2018-12-26T16:44:38.633Z"

describe("toReqs", () => {
  const BODY = { id: "my-id", timestamp: NOW } as Event

  it("maps", () => {
    const exp: Req = {
      event: BODY,
      requeue: false,
      requeueUntil: 0,
      retryCnt: 0,
    }
    epochMsMock.mockReturnValue(0)

    expect(
      toReqs([
        {
          body: JSON.stringify(BODY),
          messageAttributes: {},
        } as SQSRecord,
      ]),
    ).toEqual([exp])
  })

  it("removes duplicates", () => {
    const exp: Req = {
      event: BODY,
      requeue: false,
      requeueUntil: 0,
      retryCnt: 0,
    }
    epochMsMock.mockReturnValue(0)

    expect(
      toReqs([
        {
          body: JSON.stringify(BODY),
          messageAttributes: {},
        },
        {
          body: JSON.stringify(BODY),
          messageAttributes: {},
        },
      ] as SQSRecord[]),
    ).toEqual([exp])
  })

  it("maps with attributes", () => {
    const exp: Req = {
      event: BODY,
      requeue: true,
      requeueUntil: 2,
      retryCnt: 1,
    }
    epochMsMock.mockReturnValue(1)
    epochMsToMock.mockReturnValue(0)

    expect(
      toReqs([
        // @ts-ignore
        {
          body: JSON.stringify(BODY),
          messageAttributes: {
            requeueUntil: { stringValue: exp.requeueUntil.toString() },
            retryCnt: { stringValue: exp.retryCnt.toString() },
          },
        } as SQSRecord,
      ]),
    ).toEqual([exp])
  })

  it("does not allow attributes over max values", () => {
    const exp: Req = {
      event: BODY,
      requeue: true,
      requeueUntil: 259200000,
      retryCnt: 8,
    }
    epochMsMock.mockReturnValue(1)
    epochMsToMock.mockReturnValue(0)

    expect(
      toReqs([
        // @ts-ignore
        {
          body: JSON.stringify(BODY),
          messageAttributes: {
            requeueUntil: { stringValue: (exp.requeueUntil + 1).toString() },
            retryCnt: { stringValue: (exp.retryCnt + 1).toString() },
          },
        } as SQSRecord,
      ]),
    ).toEqual([exp])
  })
})

describe("toHttpReq", () => {
  it("maps empty", () => {
    const exp: IHttpReq = {
      body: "",
      headers: [],
      timestamp: NOW,
      url: "",
    }
    nowMock.mockReturnValue(exp.timestamp)

    expect(
      toHttpReq(
        undefined as unknown as string,
        undefined as unknown as { [p: string]: string },
        undefined as unknown as number,
        undefined as unknown as string,
      ),
    ).toEqual(exp)
  })

  it("maps", () => {
    const d = new Date()
    const exp: IHttpReq = {
      body: "hi",
      headers: [
        { name: "a", value: "b" },
        { name: "c", value: "d" },
      ],
      timestamp: d.toISOString(),
      url: "https://www.example.com",
    }

    expect(
      toHttpReq(exp.body, { a: "b", c: "d" }, d.getTime(), exp.url),
    ).toEqual(exp)
  })
})

describe("toHttpRes", () => {
  it("maps empty", () => {
    const exp: IHttpRes = {
      body: "",
      headers: [],
      statusCode: 0,
      timestamp: NOW,
    }

    nowMock.mockReturnValue(exp.timestamp)

    expect(
      toHttpRes(undefined as unknown as number, undefined as unknown as number),
    ).toEqual(exp)
  })

  it("maps", () => {
    const d = new Date()
    const exp: IHttpRes = {
      body: "",
      headers: [],
      statusCode: 200,
      timestamp: d.toISOString(),
    }

    expect(toHttpRes(d.getTime(), exp.statusCode)).toEqual(exp)
  })
})

test("partition", () => {
  const requeue = { req: { requeue: true, retryCnt: 7 } } as Res
  const error = { req: { retryCnt: 7 }, err: "err" } as Res
  const failure = { req: { retryCnt: 7 }, httpRes: { statusCode: 400 } } as Res
  const maxAttempts = { req: { retryCnt: 8 }, err: "err" } as Res
  const success1 = { req: { retryCnt: 7 } } as Res
  const success2 = { req: { retryCnt: 7 }, httpRes: { statusCode: 399 } } as Res

  expect(
    partition([requeue, error, failure, maxAttempts, success1, success2]),
  ).toEqual([
    [error, failure, maxAttempts, success1, success2],
    [requeue, error, failure],
  ])
})

describe("toResult", () => {
  it("maps empty", () => {
    expect(toResult(undefined as unknown as Res[])).toEqual([])
    expect(toResult([] as Res[])).toEqual([])
  })

  it("maps", () => {
    const event1 = {
      cause: "err",
      id: "id1",
      request: { url: "url" },
      response: { statusCode: 200 },
      retryCnt: 1,
    }
    const event2 = { id: "id2" }
    const exp: SendMessageBatchRequestEntryList = [
      { Id: event1.id, MessageBody: JSON.stringify(event1) },
      { Id: event2.id, MessageBody: JSON.stringify(event2) },
    ]

    expect(
      toResult([
        {
          err: event1.cause,
          httpReq: event1.request,
          httpRes: event1.response,
          req: { event: { id: event1.id }, retryCnt: event1.retryCnt },
        },
        { req: { event: { id: event2.id } } },
      ] as Res[]),
    ).toEqual(exp)
  })
})

describe("toRequeue", () => {
  it("maps empty", () => {
    expect(toRequeue(undefined as unknown as Res[])).toEqual([])
    expect(toRequeue([] as Res[])).toEqual([])
  })

  it("maps", () => {
    const event1 = { id: "id1", timestamp: NOW }
    const event2 = { id: "id2", timestamp: NOW }
    const exp: SendMessageBatchRequestEntryList = [
      {
        DelaySeconds: 900,
        Id: event1.id,
        MessageAttributes: {
          partnerQueueUrl: {
            DataType: "String",
            StringValue: "partner.com",
          },
          requeueUntil: {
            DataType: "Number",
            StringValue: "900001",
          },
          retryCnt: {
            DataType: "Number",
            StringValue: "1",
          },
        },
        MessageBody: JSON.stringify(event1),
      },
      {
        DelaySeconds: 900,
        Id: event2.id,
        MessageAttributes: {
          partnerQueueUrl: {
            DataType: "String",
            StringValue: "partner.com",
          },
          requeueUntil: {
            DataType: "Number",
            StringValue: "2",
          },
          retryCnt: {
            DataType: "Number",
            StringValue: "0",
          },
        },
        MessageBody: JSON.stringify(event2),
      },
    ]
    epochMsToMock.mockReturnValue(1)

    expect(
      toRequeue([
        {
          req: {
            event: { id: event1.id, timestamp: event1.timestamp },
            requeue: false,
            requeueUntil: 1,
            retryCnt: 0,
          },
        },
        {
          req: {
            event: { id: event2.id, timestamp: event2.timestamp },
            requeue: true,
            requeueUntil: 2,
            retryCnt: 0,
          },
        },
      ] as Res[]),
    ).toEqual(exp)

    expect(epochMsToMock).toHaveBeenCalledWith(NOW)
  })
})

const [MINS, HRS] = [60 * 1000, 3600 * 1000]
test("retries", () => {
  expect(retries[0]).toBe(undefined)
  expect(retries[1]).toBe(15 * MINS)
  expect(retries[2]).toBe(HRS)
  expect(retries[3]).toBe(3 * HRS)
  expect(retries[4]).toBe(6 * HRS)
  expect(retries[5]).toBe(12 * HRS)
  expect(retries[6]).toBe(24 * HRS)
  expect(retries[7]).toBe(48 * HRS)
  expect(retries[8]).toBe(72 * HRS)
  expect(retries[9]).toBe(undefined)
})
