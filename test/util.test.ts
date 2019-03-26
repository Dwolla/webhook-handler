import { epochMs, epochMsTo, now } from "../src/util"

const toMins = (n: number) => Math.floor(n / 10000)

const toMinsStr = (s: string) => s.substring(0, 16)

test("now", () =>
  expect(toMinsStr(now())).toBe(toMinsStr(new Date().toISOString())))

test("epochMs", () =>
  expect(toMins(epochMs())).toBe(toMins(new Date().getTime())))

test("epochMsTo", () =>
  expect(epochMsTo("2018-01-01T12:34:56.789Z")).toBe(1514810096789))
