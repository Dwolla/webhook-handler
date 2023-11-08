const { serverless } = require("skripts/config")

module.exports = {
  cfnRole: process.env.SKRIPTS_CFN_ROLE || null,
  custom: {
    tags: {
      Creator: "serverless",
      Environment: "${self:provider.stage}",
      Project: "webhooks",
      Team: "growth",
      DeployJobUrl: "${env:BUILD_URL, 'n/a'}",
      "org.label-schema.vcs-url": "${env:GIT_URL, 'n/a'}",
      "org.label-schema.vcs-ref": "${env:GIT_COMMIT, 'n/a'}",
    },
  },
  frameworkVersion: ">=1.0.0 <3.0.0",
  provider: {
    deploymentBucket: process.env.SKRIPTS_DEPLOYMENT_BUCKET
      ? {
          name: process.env.SKRIPTS_DEPLOYMENT_BUCKET,
          serverSideEncryption: "AES256",
        }
      : null,
    environment: { AWS_NODEJS_CONNECTION_REUSE_ENABLED: 1 },
    lambdaHashingVersion: "20201221",
    logRetentionInDays: 365,
    memorySize: 128,
    name: "aws",
    region: "us-west-2",
    runtime: "nodejs16.x",
    stackTags: "${self:custom.tags}",
    stage: "${opt:stage, env:STAGE, env:ENVIRONMENT}",
    tags: "${self:custom.tags}",
    timeout: 10,
  },
  package: { individually: true },
  plugins: ["serverless-iam-roles-per-function", "serverless-webpack"],
  service: "${file(./package.json):name}",
  vpc:
    process.env.SKRIPTS_VPC_SECURITY_GROUPS && process.env.SKRIPTS_VPC_SUBNETS
      ? {
          securityGroupIds: process.env.SKRIPTS_VPC_SECURITY_GROUPS.split(","),
          subnetIds: process.env.SKRIPTS_VPC_SUBNETS.split(","),
        }
      : null,
  functions: { func: { handler: "src/handler.handle" } },
}
