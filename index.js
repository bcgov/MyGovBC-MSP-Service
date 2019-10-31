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

// Node middleware method.  Fires before every path.
// Log request , etc
app.use('/', function (req, res, next) {
    next();
});

// Start express
app.listen(8080);
console.log("Listening on port 8080");
