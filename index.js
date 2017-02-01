var https = require('https'),
    http  = require('http'),
    util  = require('util'),
    path  = require('path'),
    fs    = require('fs'),
    colors = require('colors'),
    httpProxy = require('http-proxy');

// Create new HTTPS.Agent for mutual TLS purposes
if (process.env.MUTUAL_TLS_PFX_BASE64 &&
    process.env.MUTUAL_TLS_PFX_BASE64.length > 0) {
    var httpsAgentOptions = {
        pfx: new Buffer(process.env.MUTUAL_TLS_PFX_BASE64, 'base64'),
        passphrase: process.env.MUTUAL_TLS_PFX_PASSWORD,
        cert: new Buffer(process.env.MUTUAL_TLS_CA_CER_BASE64, 'base64'),
    };

    var myAgent = new https.Agent(httpsAgentOptions);
}
//
// Create a HTTP Proxy server with a HTTPS target
//
var proxy = httpProxy.createProxyServer({
    target: process.env.TARGET_URL,
    agent  : myAgent || https.globalAgent,
    secure: true,
    headers: {
        host: process.env.TARGET_HEADER_HOST
    },
    auth: process.env.TARGET_USERNAME_PASSWORD
}).listen(8080);

//
// Listen for the `proxyRes` event on `proxy`.
//
if (process.env.CORS_ORIGIN &&
    process.env.CORS_ORIGIN.length > 0) {
    proxy.on('proxyRes', function (proxyRes, req, res) {
        proxyRes.headers["Access-Control-Allow-Origin"] = process.env.CORS_ORIGIN;
        proxyRes.headers["Access-Control-Allow-Headers"] = "Content-Type";
    });
}


// Listen for the `error` event on `proxy`.
proxy.on('error', function (err, req, res) {
    console.log("err: ", err);
});
// Listen for the `proxyReq` event on `proxy`.
proxy.on('proxyReq', function (err, req, res) {
    console.log("", req.method, req.headers.host, req.url, res.statusCode);
});

console.log('https proxy server started on port 8080'.green.bold);
