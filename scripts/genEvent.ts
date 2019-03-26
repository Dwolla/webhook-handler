import { SQSEvent, SQSRecord } from "aws-lambda"
import { writeFileSync } from "fs"

const HOOK = {
  _links: {
    account: {
      href:
        "https://api.dwolla.com/accounts/11111111-8fe5-40b5-9be7-111111111111"
    },
    resource: {
      href:
        "https://api.dwolla.com/transfers/11111111-2559-e711-8102-111111111111"
    },
    self: {
      href: "https://api.dwolla.com/events/11111111-e6c5-41b7-99fe-111111111111"
    }
  },
  created: new Date().toISOString(),
  id: "11111111-e6c5-41b7-99fe-111111111111",
  resourceId: "11111111-2559-e711-8102-111111111111",
  timestamp: new Date().toISOString(),
  topic: "transfer_completed"
}

const CREATED_EVENT = (id: string) => ({
  body: JSON.stringify(HOOK),
  id,
  signatureSha256: "fake-sig",
  timestamp: new Date().toISOString(),
  topic: "transfer_completed",
  url: "https://hookb.in/wNyjXg9VXpU0w0V3BMnG"
})

const RECORD = (id: string): SQSRecord => ({
  attributes: {
    ApproximateFirstReceiveTimestamp: "1523232000001",
    ApproximateReceiveCount: "1",
    SenderId: "123456789012",
    SentTimestamp: "1523232000000"
  },
  awsRegion: "us-west-2",
  body: JSON.stringify(CREATED_EVENT(id)),
  eventSource: "aws:sqs",
  eventSourceARN: "arn:aws:sqs:us-west-2:123456789012:MyQueue",
  md5OfBody: "35du3f",
  messageAttributes: {
    // retryCnt: { stringValue: '1', dataType: 'Number' },
    // requeueUntil: { stringValue: '1545409898', dataType: 'Number' }
  },
  messageId: "11111111-b21e-4ac1-bd88-111111111111",
  receiptHandle: "MessageReceiptHandle"
})

const EVENT = (): SQSEvent => {
  const rs: SQSRecord[] = []
  for (let i = 0; i < 10; i++) {
    rs.push(RECORD(`id-${i}`))
  }
  return { Records: rs }
}

writeFileSync("./event.json", JSON.stringify(EVENT()))
