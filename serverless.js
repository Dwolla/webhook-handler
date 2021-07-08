const { serverless } = require("skripts/config")

module.exports = {
  ...serverless,
  custom: {
    ...serverless.custom,
    tags: {
      ...serverless.custom.tags,
      Project: "webhooks",
      Team: "growth",
      DeployJobUrl: "${env:BUILD_URL, 'n/a'}",
      "org.label-schema.vcs-url": "${env:GIT_URL, 'n/a'}",
      "org.label-schema.vcs-ref": "${env:GIT_COMMIT, 'n/a'}",
    },
  },
  functions: { func: { handler: "src/handler.handle" } },
}
