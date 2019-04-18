const https = require('https');
const stringify = require('json-stringify-safe');
const uuidv4 = require('uuid/v4');
const {timestamp} = require('./timestamp');
const { logSplunkInfo, logSplunkError } = require("./logSplunk");

const tls = require('tls');
tls.DEFAULT_ECDH_CURVE = "auto";

const TARGET_USERNAME_PASSWORD = process.env.TARGET_USERNAME_PASSWORD || '';
const CACHE_REQ_USE_PROCESSDATE = (process.env.CACHE_REQ_USE_PROCESSDATE === 'true') || false;
const CACHE_UUID_NAME = process.env.CACHE_UUID_NAME || 'uuid';


/**
 * Bypass any errors due to invalid certs (e.g. out of date SSL certs, or malformed certs).
 * This should ONLY BE USED DURING DEVELOPMENT WHEN CERTS ARE DOWN!
 */
if (process.env.BYPASS_INVALID_TLS && process.env.BYPASS_INVALID_TLS === 'bypass'){
    logSplunkInfo('BYPASSING ALL TLS CERTIFICATE CHECKS. THIS SHOULD BE FOR DEVELOPMENT ONLY!');
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
}


// tls.DEFAULT_ECDH_CURV

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
 * @param {int} retryCount - max amount of times to retry request if it failed.
 */
function getJSON(url, callback, errCallback, retryCount=3) {
    const uuid = `cache-${uuidv4()}`
    let hasRetried = false; // Can retry once per function invocation. If one request causes two errors, it will only retry once.
    logSplunkInfo({message: `getJSON -- ${TARGET_URL + url}`, time: timestamp(new Date()), uuid }); 


    // If no error callback, log it.
    if (!errCallback) errCallback = logSplunkError;

    let reqBody = {
        clientName: process.env.CLIENT_NAME,
        
        // // TODO - This was called just 'uuid' in FPC. Document change? Put behind new env variable?
        // eventUUID: uuid,
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

    if (CACHE_UUID_NAME){
        let headers = {};
        headers[CACHE_UUID_NAME] = uuid;
        reqOptions.headers = headers;
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
                if (obj.statusCode && obj.statusCode === "0") {
                    callback(obj);
                }
                else {
                    // will only be invoked once as it's on the 'end' event, so we don't need to check hasRetried
                    errCallback({ error: `statusCode is not 0 for ${TARGET_URL + url}`, response: obj, uuid, time: timestamp(new Date()) });
                    retry();
                }
            } catch (error) {
                // will only be invoked once as it's on the 'end' event, so we don't need to check hasRetried
                errCallback({ error: `Unable to parse JSON for ${TARGET_URL + url}`, response: output, exception: error, uuid, time: timestamp(new Date()) });
                retry();
            }
        });
    })

    req.on('error', (e) => {
        console.log('Request error', e);

        // Even if multiple errors fire, we only want to retry a max of once.
        if (!hasRetried){
            errCallback({ error: `Error on request for ${TARGET_URL + url}`, exception: e, uuid, time: timestamp(new Date()) });
            retry();
        }
    });

    req.write(reqBody);
    req.end();

    /**
     * Retries the getJSON request, while decrementing the retryCount.
     */
    function retry() {
        hasRetried = true;
        // console.log(`RETRY CALLED. Count=${retryCount}, hasRetried=${hasRetried}`)
        const RETRY_DELAY = 1000 * 10; //in ms
        if (retryCount > 0) {
            logSplunkError(`retrying failed getJSON for ${TARGET_URL + url} - retries left: ${retryCount}`);
            setTimeout(() => {
                getJSON(url, callback, errCallback, --retryCount);
            }, RETRY_DELAY)
        }
        else {
            errCallback({error: `out of retry attempts for getJSON for ${TARGET_URL + url}`})
        }
    }
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
