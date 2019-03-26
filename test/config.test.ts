const c = () => require("../src/config")

test("concurrency", () => expect(c().concurrency()).toBe(1))
test("partnerQueueUrl", () => expect(c().partnerQueueUrl()).toBe("partner.com"))
test("resultQueueUrl", () => expect(c().resultQueueUrl()).toBe("result.com"))
test("errorQueueUrl", () => expect(c().errorQueueUrl()).toBe("error.com"))
test("version", () => expect(c().version()).toBe("v1"))
