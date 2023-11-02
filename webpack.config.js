const slsw = require("serverless-webpack")
module.exports = {
  devtool: "source-map",
  entry: slsw.lib.entries,
  mode: slsw.lib.webpack.isLocal ? "development" : "production",
  module: { rules: [{ test: /\.tsx?$/, loader: "ts-loader" }] },
  performance: { hints: false },
  resolve: { extensions: [".js", ".jsx", ".json", ".ts", ".tsx"] },
  target: "node",
}
