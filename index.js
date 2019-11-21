const fs = require('fs');
const https = require('https');
const axios = require('axios');
const express = require('express');
const xmlConvert = require('xml-js');
const soap = require('easy-soap-request');
const soapRequest = require('./soapRequest.js');

const clientCert = base64Decode(process.env.MUTUAL_TLS_PEM_CERT);
const clientKey = base64Decode(process.env.MUTUAL_TLS_PEM_KEY_BASE64);

//
// using Express
const app = express();

// Add status endpoint
app.get('/status', function (req, res) {
    res.setHeader('Content-Type', 'text/plain');
    console.log("Cert:\n" + clientCert.slice(0, 100));
    console.log("Key:\n" + clientKey.slice(0, 100));
    res.write("Cert:\n" + clientCert.slice(0, 100) + "\n");
    res.write("Key:\n" + clientKey.slice(0, 100) + "\n");
    res.end();
});

app.get('/', function (req, res) {
    res.setHeader('Content-Type', 'text/plain');
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
            // console.log(headers);
            // console.log(statusCode);
            var result = xmlConvert.xml2json(body, { compact: true, spaces: 4 });
            res.send(result);
        } catch (err) {
            var result = xmlConvert.xml2json(err, { compact: true, spaces: 4 });
            res.send(result);
        }

    })();

});

app.get('/ip', function (req, res) {

    res.setHeader('Content-Type', 'text/plain');
    getIp()
        .then(rep => res.send(rep.data))
        .catch(err => res.send(err.message));
});

app.get('/test', function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    const url = soapRequest.address.url;
    axios_get(url)
        .then(resp => res.send(resp.data))
        .catch(err => { res.send(err.message); console.log(err.message); });
    return;
});

app.get('/address', function (req, res) {

    const address = req.query.address;
    const url = soapRequest.address.url;
    const myheaders = soapRequest.address.headers;
    const xml = soapRequest.address.request.replace("$address", address).replace("$country", "Canada");

    const agent = new https.Agent({
        rejectUnauthorized: false,
        cert: clientCert,
        key: clientKey,
    });

    const extraOpts = {
        httpsAgent: agent
    }

    res.setHeader('Content-Type', 'application/json');

    const opts = {
        url: url, headers: myheaders,
        xml: xml,
        timeout: 5000,
        extraOpts: extraOpts
    };

    const soapOpts = {
        url: url, headers: myheaders,
        xml: xml,
        timeout: 5000,
        extraOpts: extraOpts,
        checkServerIdentity: () => { return null; },
    };

    soap(soapOpts)
        .then(data => {
            const { headers, body, statusCode } = data.response;

            //console.log(headers);
            //console.log(statusCode);
            const result = xmlConvert.xml2json(body, { compact: true, spaces: 2, alwaysChildren: false });
            const json = JSON.parse(result);

            // This is a hack.  Need to parse more elegantly
            const processResult = json['S:Envelope']['S:Body'].ProcessResponse.ProcessResult;
            const dataSet = processResult.Results.Result.ResultDataSet.ResultData;

            const reply = { Address: [] }

            // If dataSet is an Array, we have multiple responses
            // console.log(dataSet.length)
            if (dataSet.length) {
                for (let address of dataSet) {
                    reply.Address.push(address.Address)
                }
            }
            else
                reply.Address.push(dataSet.Address);

            res.send(reply);
        })
        .catch(err => {
            const error = { "error": err.message || err };
            res.send(error); console.log(error);
        });
});

// Node middleware method.  Fires before every path.
// Log request , etc
app.use('/', function (req, res, next) {
    next();
});


// Start express
app.listen(8080);
console.log("Listening on port 8080");
// console.log("Cert: " + clientCert.slice(0, 100));
// console.log("Key: " + clientKey.slice(0, 100));


function axios_get(url, res) {

    const agent = new https.Agent({
        rejectUnauthorized: false,
        cert: clientCert,
        key: clientKey
    });

    const options = {
        method: 'get',
        url: url,
        httpsAgent: agent,
    };

    return axios(options);
}

function base64Decode(string) {
    if (!string)
        return "empty";
    let buffer = new Buffer.from(string, 'base64');
    return buffer.toString('ascii');
}

function getIp() {
    const url = "https://api6.ipify.org?format=json";
    return axios.get(url);
}

