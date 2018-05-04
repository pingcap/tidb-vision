const resolve = require("path").resolve;
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const url = require("url");
const publicPath = "";
const express = require("express");
const path = require("path");
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

let proxy = {}
if(process.env.PD_ENDPOINT) {
  console.log('PD_ENDPOINT: Using ', process.env.PD_ENDPOINT)
  proxy = {
    "/pd/api/v1": {
      target: 'http://'+process.env.PD_ENDPOINT,
      changeOrigin: true
    }
  }
} else {
  console.log('PD_ENDPOINT: Using default Mock Server')
  proxy = {
    "/pd/api/v1": {
      target: `http://localhost:${process.env.MOCK_PORT || 9000}`,
    }
  }
}

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
    new UglifyJSPlugin({
      uglifyOptions: {
        beautify: false,
        ecma: 6,
        sourceMap: false,
        mangle: false,
        compress: false,
        comments: false
      }
    }),
    // new webpack.optimize.CommonsChunkPlugin({
    //   names: ["vendor", "manifest"]
    // }),
    new webpack.EnvironmentPlugin({
      'NODE_ENV': 'dev',
      'REGION_BYTE_SIZE': '100663296' // default size
    }),
    new webpack.DefinePlugin({
      'API_URL': "'http://hardsets.dev'"
    }),
    new HtmlWebpackPlugin({
      template: "src/index.html"
    }),
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
      if(process.env.NODE_ENV="production") {
        app.use(
          "/",
          express.static(path.join(__dirname, "dist"))
        );
      }
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    proxy,
    historyApiFallback: {
      index: url.parse(options.dev ? "/assets/" : publicPath).pathname
    }
  },
  // devtool: options.dev ? "#eval-source-map" : "#source-map"
});
