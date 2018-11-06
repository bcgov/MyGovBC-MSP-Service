const https = require('https');
const stringify = require('json-stringify-safe');
const uuidv4 = require('uuid/v4');

const TARGET_USERNAME_PASSWORD = process.env.TARGET_USERNAME_PASSWORD || '';
const CACHE_REQ_USE_PROCESSDATE = (process.env.CACHE_REQ_USE_PROCESSDATE === 'true') || false;

let TARGET_URL = process.env.TARGET_URL || '';

if (TARGET_URL && TARGET_URL.length){
    // remove 'https' if it exists - but we need to keep it in process.env for the proxy
    TARGET_URL = TARGET_URL.replace('http://', '').replace('https://', '')
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

/**
 * Make a POST request to the given URL, using env var TARGET_URL as the base of the url.
 *
 * @param {string} url
 * @param {func} callback 
 * @param {func} errCallback
 */
function getJSON(url, callback, errCallback) {
    console.log(`getJSON -- ${TARGET_URL + url}`); // add timestamp?

    // If no error callback, just log it.
    if (!errCallback) errCallback = console.log;

    let reqBody = {
        clientName: 'ppiweb',
        uuid: `cache-${uuidv4()}`
    };

    if (CACHE_REQ_USE_PROCESSDATE){
        reqBody['processDate'] = getProcessDate();
    }

    reqBody = stringify(reqBody);

    const reqOptions = {
        hostname: TARGET_URL,
        agent: myAgent || https.globalAgent,
        method: 'POST',
        path: url,
        auth: TARGET_USERNAME_PASSWORD,
        timeout: 1000 * 30,
    }

    const req = https.request(reqOptions, res => {
        // console.log('statusCode:', res.statusCode);
        // console.log('headers:', res.headers);
        let output = '';

        res.on('data', (d) => {
            output += d;
        });

        res.on('end', function () {
            try {
                var obj = JSON.parse(output);
                // * FairPharmacare specific validation.
                // The integration service doesn't use HTTP status codes to
                // report status, instead it uses regStatusCode, and 0 is a
                // success. Sometimes the integration service is down and it
                // returns a generic JSON message, or even HTML.
                if (obj.regStatusCode && obj.regStatusCode === "0") {
                    callback(obj);
                }
                else {
                    errCallback({ error: "regStatusCode is not 0", response: obj });
                }
            } catch (error) {
                errCallback({ error: "Unable to parse JSON", response: output, exception: error });
            }
        });
    })

    req.on('error', (e) => {
        errCallback({ error: "Error on request" + e.message });
    });

    req.write(reqBody);
    req.end();
}


/**
 * Returns a string matching processDate for the current day
 * e.g. "20180101"
 */
function getProcessDate() {
    // Makes sure it's 2 digits, adds a leading 0 if necessary
    function pad(n) { return n < 10 ? `0${n}` : n };
    const today = new Date();
    return `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;
}


module.exports = {
    getJSON,
}
