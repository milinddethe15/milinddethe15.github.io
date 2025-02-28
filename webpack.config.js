const path = require("path");

module.exports = {
  entry: "./assets/js/custom.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "static/js"),
  },
  mode: "production",
  resolve: {
    extensions: [".js"],
  },
};
