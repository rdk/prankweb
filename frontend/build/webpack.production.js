const path = require("path");
const {merge} = require("webpack-merge");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const common = require("./webpack.common");

module.exports = merge(common, {
  "mode": "production",
  "output": {
    "filename": path.join("assets", "bundle-[name]-[contenthash].js"),
  },
  "optimization": {
    "splitChunks": {
      "cacheGroups": {
        "commons": {
          "test": /[\\/]node_modules[\\/]/,
          "chunks": "all",
          "priority": 0,
          "filename": path.join("assets", "bundle-commons-[contenthash].js"),
        },
      },
    },
    "minimizer": [
      // https://github.com/terser/terser
      new TerserPlugin({
        "terserOptions": {
          "compress": {
            "ecma": 6,
          },
        },
      }),
    ],
  },
  "plugins": [
    new CleanWebpackPlugin({}),
    new MiniCssExtractPlugin({
      "filename": "assets/style-[contenthash].css",
    }),
    new CopyWebpackPlugin({
      "patterns": [{
        "from": path.join(__dirname, "..", "public", "assets"),
        "to": path.join(__dirname, "..", "dist", "assets"),
        "noErrorOnMissing": true,
      }],
    }),
  ],
});
