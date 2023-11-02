import { error, log } from "../src/logger"
import { SQSEvent } from "aws-lambda"
import { readFileSync } from "fs"
import { createServer, IncomingMessage, ServerResponse } from "http"
import { handle } from "../src/handler"

const PORT = 8010
const FUNCS = [{ path: "/func", fn: (evt: SQSEvent) => handle(evt) }]

const writeRes = (body: object, res: ServerResponse): void => {
  res.writeHead(200, { "Content-Type": "application/json" })
  res.write(JSON.stringify(body))
  res.end()
}

const parsed = JSON.parse(readFileSync("./event.json", "utf8"))

const requestHandler = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  const url = req.url || "/"
  if (req.method === "POST") {
    let body = ""
    req.on("data", (data) => (body += data))
    req.on("end", async () => await handleReq(JSON.parse(body), url, res))
    return
  }

  return handleReq(parsed, url, res)
}

const handleReq = async (
  evt: SQSEvent,
  url: string,
  res: ServerResponse
): Promise<void> => {
  try {
    if (url === "/") {
      return writeRes(
        {
          body: `Visit ${FUNCS.map((f) => f.path).join(
            ", "
          )} to invoke the corresponding Lambda function. POST an event or use the default specified in server.ts with a GET.`,
          event: evt,
          statusCode: 200,
        },
        res
      )
    }
    const func = FUNCS.find((f) => f.path === url)
    return writeRes(
      func ? await func.fn(evt) : { statusCode: 400, body: "Path not found" },
      res
    )
  } catch (e) {
    error("handle err", e)
    return writeRes({ statusCode: 500, body: e.message }, res)
  }
}

createServer(requestHandler).listen(PORT, () =>
  log(`Listening at http://localhost:${PORT}...`)
)
