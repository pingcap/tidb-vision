const resolve = require("path").resolve;
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const url = require("url");
const publicPath = "";
const express = require("express");
const path = require("path");

module.exports = (options = {}) => ({
  entry: {
    vendor: "./src/vendor",
    index: "./src/main.js"
  },
  output: {
    path: resolve(__dirname, "dist"),
    filename: options.dev ? "[name].js" : "[name].js?[chunkhash]",
    chunkFilename: "[id].js?[chunkhash]",
    publicPath: options.dev ? "/assets/" : publicPath
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: ["vue-loader"]
      },
      {
        test: /\.js$/,
        use: ["babel-loader"],
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"]
      },
      {
        test: /\.(png|jpg|jpeg|gif|eot|ttf|woff|woff2|svg|svgz)(\?.+)?$/,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 10000
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      names: ["vendor", "manifest"]
    }),
    new HtmlWebpackPlugin({
      template: "src/index.html"
    })
  ],
  resolve: {
    alias: {
      "~": resolve(__dirname, "src")
    }
  },
  devServer: {
    host: "127.0.0.1",
    port: process.env.PORT || 8010,
    setup(app) {
      app.use(
        "/static/",
        express.static(path.join(__dirname, "src", "assets"))
      );
    },
    proxy: {
      "/api/": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        pathRewrite: {
          "^/api": ""
        }
      }
    },
    historyApiFallback: {
      index: url.parse(options.dev ? "/assets/" : publicPath).pathname
    }
  },
  devtool: options.dev ? "#eval-source-map" : "#source-map"
});
