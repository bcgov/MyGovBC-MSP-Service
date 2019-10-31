const https = require('https'),
    http = require('http'),
    winston = require('winston'),
    jwt = require('jsonwebtoken'),
    stringify = require('json-stringify-safe'),
    express = require('express'),
    moment = require('moment');
var proxy = require('http-proxy-middleware');
const soap = require('easy-soap-request');
const soapRequest = require('./soapRequest.js');
const xmlConvert = require('xml-js');

//
// using Express
const app = express();

// Add status endpoint
app.get('/status', function (req, res) {
    res.send("OK");
});


app.get('/', function (req, res) {
    res.send("OK");
});

app.get('/zip', function (req, res) {

    const code = req.query.code;
    const url = soapRequest.zip.url;
    const sampleHeaders = soapRequest.zip.headers;
    const xml = soapRequest.zip.request.replace("$zipcode", code);

    res.setHeader('Content-Type', 'application/json');

    (async () => {
        try {
            const { response } = await soap({ url: url, headers: sampleHeaders, xml: xml, timeout: 5000 });
            const { headers, body, statusCode } = response;
            console.log(headers);
            console.log(statusCode);
            var result = xmlConvert.xml2json(body, { compact: true, spaces: 4 });
            res.send(result);
        } catch (err) {
            var result = xmlConvert.xml2json(err, { compact: true, spaces: 4 });
            res.send(result);
        }

    })();

});

// verbose replacement
function logProvider(provider) {
    const logger = winston;

    const myCustomProvider = {
        log: logger.log,
        debug: logger.debug,
        info: logSplunkInfo,
        warn: logger.warn,
        error: logSplunkError
    }
    return myCustomProvider;
}

if (process.env.USE_CONSOLE_LOG)
    winston.add(winston.transports.Console, {
        name: "CONSOLE_LOG",
        timestamp: true
    });

//
// Generate token for monitoring apps
//
if (process.env.USE_AUTH_TOKEN &&
    process.env.USE_AUTH_TOKEN == "true" &&
    process.env.AUTH_TOKEN_KEY &&
    process.env.AUTH_TOKEN_KEY.length > 0) {

    var monitoringToken = jwt.sign({
        data: { nonce: "status" }
    }, process.env.AUTH_TOKEN_KEY);
    logSplunkInfo("Monitoring token: " + monitoringToken);
}

//
// Node middleware method.  Fires before every path.
// Log request & check Auth Token. Strip cookies, etc
app.use('/', function (req, res, next) {

    /****
    logSplunkInfo("incoming: " + req.url);
    // Get authorization from browser
    const authHeaderValue = req.headers["x-authorization"];
    logSplunkInfo(" x-authorization: " + authHeaderValue);

    // Delete it because we add HTTP Basic later
    delete req.headers["x-authorization"];

    // Delete any attempts at cookies
    delete req.headers["cookie"];

    // Validate token if enabled
    if (process.env.USE_AUTH_TOKEN &&
        process.env.USE_AUTH_TOKEN == "true" &&
        process.env.AUTH_TOKEN_KEY &&
        process.env.AUTH_TOKEN_KEY.length > 0) {

        // Ensure we have a value
        if (!authHeaderValue) {
            denyAccess("missing header", res, req);
            return;
        }

        // Parse out the token
        const token = authHeaderValue.replace("Bearer ", "");

        let decoded = null;
        try {
            // Decode token
            decoded = jwt.verify(token, process.env.AUTH_TOKEN_KEY);
        } catch (err) {
            logSplunkError("jwt verify failed, x-authorization: " + authHeaderValue + "; err: " + err);
            denyAccess("jwt unverifiable", res, req);
            return;
        }

        // Ensure we have a nonce
        if (decoded == null ||
            decoded.data.nonce == null ||
            decoded.data.nonce.length < 1) {
            denyAccess("missing nonce", res, req);
            return;
        }

    }
***/
    // Token OK.  Pass thru to url path
    next();
});


let myAgent = null;
// Create new HTTPS.Agent for mutual TLS purposes
if (process.env.USE_MUTUAL_TLS &&
    process.env.USE_MUTUAL_TLS == "true") {

    const httpsAgentOptions = {
        key: new Buffer(process.env.MUTUAL_TLS_PEM_KEY_BASE64, 'base64'),
        passphrase: process.env.MUTUAL_TLS_PEM_KEY_PASSPHRASE,
        cert: new Buffer(process.env.MUTUAL_TLS_PEM_CERT, 'base64')
    };

    myAgent = new https.Agent(httpsAgentOptions);
}
//
// Create a HTTP Proxy server with a HTTPS target
//
const myProxy = proxy({
    target: process.env.TARGET_URL || "http://localhost:3000",
    agent: myAgent || http.globalAgent,
    secure: process.env.SECURE_MODE || false,
    keepAlive: true,
    changeOrigin: true,
    auth: process.env.TARGET_USERNAME_PASSWORD || "username:password",
    logLevel: 'info',
    logProvider: logProvider,

    //
    // Listen for the `error` event on `proxy`.
    //
    onError: function (err, req, res) {
        logSplunkError("proxy error: " + err + "; req.url: " + req.url + "; status: " + res.statusCode);
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });

        res.end('Error with proxy');
    },

    //
    // Listen for the `proxyRes` event on `proxy`.
    //
    onProxyRes: function (proxyRes, req, res) {
        winston.info('RAW Response from the target: ' + stringify(proxyRes.headers));

        // Delete set-cookie
        delete proxyRes.headers["set-cookie"];
    },

    //
    // Listen for the `proxyReq` event on `proxy`.
    //
    onProxyReq: function (proxyReq, req, res, options) {
        //winston.info('RAW proxyReq: ', stringify(proxyReq.headers));
        //    logSplunkInfo('RAW URL: ' + req.url + '; RAW headers: ', stringify(req.headers));
        //winston.info('RAW options: ', stringify(options));
    }
});

// Add in proxy AFTER authorization
app.use('/', myProxy);


//
// Init the SOAP address validation service
//
// var avDS = loopback.createDataSource('soap',
//     {
//         name: 'AddressValidationDS',
//         connector: 'loopback-connector-soap',
//         remotingEnabled: true,
//         url: 'https://addrvaltst.hlth.gov.bc.ca/AddrValidation/AddressValidation',
//         wsdl: 'https://addrvaltst.hlth.gov.bc.ca/AddrValidation/AddressValidation?wsdl',
//         wsdl_options: {
//             rejectUnauthorized: false,
//             strictSSL: false,
//             requestCert: true
//         },
//         operations: {
//             service: 'AddressValidation',
//             port: 'AddressValidationSoap',
//             operation: 'Process'
//         }
//     });


// Start express
app.listen(8080);
logSplunkInfo("Listening on port 8080");


/**
 * General deny access handler
 * @param message
 * @param res
 * @param req
 */
function denyAccess(message, res, req) {

    logSplunkError(message + " - access denied.  request: " + stringify(req.headers));

    res.writeHead(401);
    res.end();
}

function logSplunkError(message) {
    // log locally
    winston.error(message);
    if (process.env.USE_CONSOLE_LOG) {
        return;
    }

    const body = JSON.stringify({
        message: message
    })

    const options = {
        hostname: process.env.LOGGER_HOST,
        port: process.env.LOGGER_PORT,
        path: '/log',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Splunk ' + process.env.SPLUNK_AUTH_TOKEN,
            'Content-Length': Buffer.byteLength(body),
            'logsource': process.env.HOSTNAME,
            'timestamp': moment().format('DD-MMM-YYYY'),
            'program': 'msp-service',
            'serverity': 'error'
        }
    };

    const req = http.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log("Body chunk: " + JSON.stringify(chunk));
        });
        res.on('end', function () {
            console.log('End of chunks');
        });
    });

    req.on('error', function (e) {
        console.error("error sending to splunk-forwarder: " + e.message);
    });

    // write data to request body
    req.write(body);
    req.end();
}

function logSplunkInfo(message) {
    // log locally
    winston.info(message);
    if (process.env.USE_CONSOLE_LOG) {
        return;
    }

    const body = JSON.stringify({
        message: message
    })

    const options = {
        hostname: process.env.LOGGER_HOST,
        port: process.env.LOGGER_PORT,
        path: '/log',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Splunk ' + process.env.SPLUNK_AUTH_TOKEN,
            'Content-Length': Buffer.byteLength(body),
            'logsource': process.env.HOSTNAME,
            'timestamp': moment().format('DD-MMM-YYYY'),
            'method': 'MSP-Service - Pass Through',
            'program': 'msp-service',
            'serverity': 'info'
        }
    };

    const req = http.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log("Body chunk: " + JSON.stringify(chunk));
        });
        res.on('end', function () {
            console.log('End of chunks');
        });
    });

    req.on('error', function (e) {
        console.error("error sending to splunk-forwarder: " + e.message);
    });

    // write data to request body
    req.write(body);
    req.end();
}

logSplunkInfo('MyGovBC-MSP-Service server started on port 8080');



