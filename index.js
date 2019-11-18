const fs = require('fs');
const https = require('https');
const express = require('express');
const xmlConvert = require('xml-js');
const soap = require('easy-soap-request');
const soapRequest = require('./soapRequest.js');

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
    const myheaders = soapRequest.zip.headers;
    const xml = soapRequest.zip.request.replace("$zipcode", code);

    res.setHeader('Content-Type', 'application/json');

    (async () => {
        try {
            const { response } = await soap({ url: url, headers: myheaders, xml: xml, timeout: 5000 });
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

app.get('/env', function (req, res) {
    res.setHeader('Content-Type', 'text/plain');
    const clientCert = process.env.MUTUAL_TLS_PEM_CERT;
    const clientKey = process.env.MUTUAL_TLS_PEM_KEY_BASE64;
    res.send (clientCert + "\n" + clientKey);
    return;

});

app.get('/address', function (req, res) {

    const address = req.query.address;
    const url = soapRequest.address.url;
    const myheaders = soapRequest.address.headers;
    const xml = soapRequest.address.request.replace("$address", address).replace("$country", "Canada");

    const clientCert = process.env.MUTUAL_TLS_PEM_CERT;
    const clientKey = process.env.MUTUAL_TLS_PEM_KEY_BASE64;

    const agent = new https.Agent({
        rejectUnauthorized: false,
        cert: clientCert,
		key: clientKey,
    });

    const extraOpts = {
        httpsAgent: agent
    }

   // res.setHeader('Content-Type', 'application/json');

    const opts = {
        url: url, headers: myheaders,
        xml: xml,
        timeout: 5000,
        extraOpts: extraOpts
    };

    (async () => {
        try {
            const { response } = await soap({
                url: url, headers: myheaders,
                xml: xml,
                timeout: 5000,
                extraOpts: extraOpts,
                checkServerIdentity: () => { return null; },
            });
            const { headers, body, statusCode } = response;
            console.log(headers);
            console.log(statusCode);
            var result = xmlConvert.xml2json(body, { compact: true, spaces: 2, alwaysChildren: false });
            res.send(result);
        } catch (err) {
            res.send(err);
        }

    })();

});

// Node middleware method.  Fires before every path.
// Log request , etc
app.use('/', function (req, res, next) {
    next();
});

// Start express
app.listen(8080);
console.log("Listening on port 8080");
