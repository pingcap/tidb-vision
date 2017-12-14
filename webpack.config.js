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
    index: ['babel-polyfill', "./src/main.js"]
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
        use: [{
          loader: "babel-loader",
          query: {
            presets: [
              'es2015',
              'stage-0'
            ]
          }
        }],
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
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    proxy: {
      /*"/pd/api/v1": {
        target: "http://172.16.10.49:2379",
        changeOrigin: true,
        pathRewrite: {
          "^/api": ""
        }
      },*/
      "/pd/api/v1": {
        target: `http://localhost:${process.env.MOCK_PORT || 9000}`,
      }
    },
    historyApiFallback: {
      index: url.parse(options.dev ? "/assets/" : publicPath).pathname
    }
  },
  devtool: options.dev ? "#eval-source-map" : "#source-map"
});
