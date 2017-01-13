var https = require('https'),
    http  = require('http'),
    util  = require('util'),
    path  = require('path'),
    fs    = require('fs'),
    colors = require('colors'),
    httpProxy = require('http-proxy');

//
// Create a HTTP Proxy server with a HTTPS target
//
var proxy = httpProxy.createProxyServer({
    target: process.env.TARGET_URL,
    agent  : https.globalAgent,
    secure: true,
    headers: {
        host: process.env.TARGET_HEADER_HOST
    },
    auth: process.env.TARGET_USERNAME_PASSWORD
}).listen(8080);

//
// Listen for the `proxyRes` event on `proxy`.
//
proxy.on('proxyRes', function (proxyRes, req, res) {
    // CORS: TODO: remove this when proxied by nginx
    proxyRes.headers["Access-Control-Allow-Origin"] = "*";
    proxyRes.headers["Access-Control-Allow-Headers"] = "Content-Type";
});

// Listen for the `error` event on `proxy`.
proxy.on('error', function (err, req, res) {
    console.log("err: ", err);
});
// Listen for the `proxyReq` event on `proxy`.
proxy.on('proxyReq', function (err, req, res) {
    console.log("", req.method, req.headers.host, req.url, res.statusCode);
});

console.log('https proxy server started on port 8080'.green.bold);
