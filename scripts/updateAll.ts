import { error, log } from "../src/logger"
import Lambda, { InvocationResponse } from "aws-sdk/clients/lambda"
import { envVarRequired } from "../src/util"

const env = envVarRequired("ENVIRONMENT")
const region = process.env.AWS_REGION || "us-west-2"
const lam = new Lambda({ region })

const updateAll = async () => {
  try {
    const res = await invoke("updateCode")
    log(decode(res.LogResult))
  } catch (err) {
    exitWithErr(err)
  }
}

const invoke = async (fn: string) => {
  const isError = (r: InvocationResponse) =>
    !r.StatusCode ||
    r.StatusCode !== 200 ||
    r.FunctionError ||
    !r.Payload ||
    JSON.parse(r.Payload as string).statusCode !== 200

  const exit = (r: InvocationResponse) => {
    const l = decode(r.LogResult)
    delete r.LogResult
    exitWithErr(`${JSON.stringify(r, null, 2)}\n\n${l}`)
  }

  const res = await lam
    .invoke({
      FunctionName: `webhook-provisioner-${env}-${fn}`,
      LogType: "Tail",
    })
    .promise()
  if (isError(res)) exit(res)

  return res
}

const decode = (s?: string) => (s ? Buffer.from(s, "base64").toString() : "")

const exitWithErr = (err: string | Error): never => {
  error(err)
  return process.exit(1) // Fail CI job
}

updateAll()
