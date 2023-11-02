# webhook-handler

An AWS Lambda function that POSTs Dwolla webhook `Events` to partner APIs and sends the result to SQS. If the API doesn't return as expected, the `Event` is requeued and retried via our [backoff schedule](https://docs.dwolla.com/#webhook-subscriptions). For details, see the [GitPitch Deck](https://gitpitch.com/dwolla/webhook-handler).

## Setup

- Clone the repository and run `npm install`
- Ensure your [AWS credentials are available](https://serverless.com/framework/docs/providers/aws/guide/credentials/)
- Deploy with `ENVIRONMENT=your-env DEPLOYMENT_BUCKET=your-bucket npm run deploy`
- Export `PARTNER_QUEUE_URL`, `RESULT_QUEUE_URL`, and `ERROR_QUEUE_URL` with the queue URLs created in AWS.

## Developing

- Run tests, `npm test`
- Invoke locally by editing `genEvent.ts` to your liking, running `npm run start`, and browsing to the localhost port logged.

## Node version Upgrade

Remove dependency on:

- [ ] @therockstorm/utils
  - [x] Logger
  - [x] Env Variable
- [ ] Skripts
  - [ ] Webpack
  - [ ] Husky
  - [ ] EsLint
  - [ ] Serverless
