var https = require('https'),
    http = require('http'),
    util = require('util'),
    path = require('path'),
    fs = require('fs'),
    colors = require('colors'),
    winston = require('winston'),
    httpProxy = require('http-proxy'),
    jwt = require('jsonwebtoken'),
    url = require('url'),
    stringify = require('json-stringify-safe');

if (process.env.SYSLOG_PORT) {
    require('winston-syslog').Syslog
    winston.add(winston.transports.Syslog, {
        host: 'logstash',
        port: process.env.SYSLOG_PORT,
        protocol: 'udp4',
        localhost: require('os').hostname()
    })
}

// Create new HTTPS.Agent for mutual TLS purposes
if (process.env.USE_MUTUAL_TLS &&
    process.env.USE_MUTUAL_TLS == "true") {
    var httpsAgentOptions = {
        key: new Buffer(process.env.MUTUAL_TLS_PEM_KEY_BASE64, 'base64'),
        passphrase: process.env.MUTUAL_TLS_PEM_KEY_PASSPHRASE,
        cert: new Buffer(process.env.MUTUAL_TLS_PEM_CERT, 'base64')
    };

    var myAgent = new https.Agent(httpsAgentOptions);
}
//
// Create a HTTP Proxy server with a HTTPS target
//
var proxy = httpProxy.createProxyServer({
    target: process.env.TARGET_URL || "http://localhost:3000",
    agent: myAgent || http.globalAgent,
    secure: process.env.SECURE_MODE || false,
    headers: {
        host: process.env.TARGET_HEADER_HOST || "localhost",
    },
    auth: process.env.TARGET_USERNAME_PASSWORD || "username:password"
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
    winston.info("err: ", err);
    res.writeHead(500);
    res.end();
});

// Listen for the `start` event on `proxy`.
proxy.on('start', function (req, res) {

    // Log it
    winston.info("incoming: ", req.method, req.headers.host, req.url, res.statusCode, req.headers.authorization);

    // Get authorization from browser
    var authHeaderValue = req.headers.authorization;

    // Delete it because we add HTTP Basic later
    delete req.headers.authorization;

    // Validate token if enabled
    if (process.env.USE_AUTH_TOKEN &&
        process.env.USE_AUTH_TOKEN == "true" &&
        process.env.AUTH_TOKEN_KEY &&
        process.env.AUTH_TOKEN_KEY.length > 0) {

        // Ensure we have a value
        if (!authHeaderValue) {
            denyAccess("missing header", proxy, res, req);
            return;
        }

        // Parse out the token
        var token = authHeaderValue.replace("Bearer ", "");

        var decoded = null;
        try {
            // Decode token
            decoded = jwt.verify(token, process.env.AUTH_TOKEN_KEY);
        } catch (err) {
            denyAccess("jwt unverifiable", proxy, res, req);
            return;
        }

        // Ensure we have a nonce
        if (decoded == null ||
            decoded.data.nonce == null ||
            decoded.data.nonce.length < 1) {
            denyAccess("missing nonce", proxy, res, req);
            return;
        }

        // Check against the resource URL
        // typical URL:
        //    /MSPDESubmitApplication/2ea5e24c-705e-f7fd-d9f0-eb2dd268d523?programArea=enrolment
        var pathname = url.parse(req.url).pathname;
        var pathnameParts = pathname.split("/");

        // find the noun(s)
        var nounIndex = pathnameParts.indexOf("MSPDESubmitAttachment");
        if (nounIndex < 0) {
            nounIndex = pathnameParts.indexOf("MSPDESubmitApplication");
        }

        if (nounIndex < 0 ||
            pathnameParts.length < nounIndex + 2) {
            denyAccess("missing noun or resource id", proxy, res, req);
            return;
        }

        // Finally, check that resource ID against the nonce
        if (pathnameParts[nounIndex + 1] != decoded.data.nonce) {
            denyAccess("resource id and nonce are not equal: " + pathnameParts[nounIndex + 1] + "; " + decoded.data.nonce, proxy, res);
            return;
        }

        // OK its valid let it pass thru this event


    }
});

function denyAccess(message, proxy, res, req) {

    winston.error(message + " - access denied.  request: " + stringify(req));

    // Hook
    proxy.on('proxyReq', function (proxyReq, req, res, options) {

        // Abort the outbound proxy request
        proxyReq.abort();
    });
    res.writeHead(401);
    res.end();
}

winston.info('https proxy server started on port 8080'.green.bold);
