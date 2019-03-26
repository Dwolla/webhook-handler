const con = parseInt(process.env.CONCURRENCY || "1", 10)
const pqu = process.env.PARTNER_QUEUE_URL || ""
const rqu = process.env.RESULT_QUEUE_URL || ""
const equ = process.env.ERROR_QUEUE_URL || ""
const ver = process.env.VERSION || ""

export const concurrency = (): number => con
export const partnerQueueUrl = (): string => pqu
export const resultQueueUrl = (): string => rqu
export const errorQueueUrl = (): string => equ
export const version = (): string => ver
