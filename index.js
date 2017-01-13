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
    target: 'https://t2mspde.maximusbc.ca',
    agent  : https.globalAgent,
    headers: {
        host: 't2mspde.maximusbc.ca'
    }
}).listen(8080);

//
// Listen for the `proxyRes` event on `proxy`.
//
proxy.on('proxyRes', function (proxyRes, req, res) {
    // Allow all origins: TODO: remove this when proxied by nginx
    proxyRes.headers["Access-Control-Allow-Origin"] = "*";
});

// Listen for the `error` event on `proxy`.
proxy.on('error', function (err, req, res) {
    console.log("err: ", err);
});
// Listen for the `proxyReq` event on `proxy`.
proxy.on('proxyReq', function (err, req, res) {
    console.log("", req.method, req.headers.host, req.url);
});

console.log('https proxy server started on port 8080'.green.bold);
