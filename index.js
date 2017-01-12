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
httpProxy.createProxyServer({
    target: 'https://t2mspde.maximusbc.ca',
    agent  : https.globalAgent,
    headers: {
        host: 't2mspde.maximusbc.ca'
    }
}).listen(8080);

console.log('https proxy server started on port 8080'.green.bold);
