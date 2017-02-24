var https = require('https'),
  http = require('http'),
  util = require('util'),
  path = require('path'),
  fs = require('fs'),
  colors = require('colors'),
  winston = require('winston'),
  httpProxy = require('http-proxy'),
  jwt = require('jsonwebtoken');

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
  target: process.env.TARGET_URL,
  agent: myAgent || https.globalAgent,
  secure: process.env.SECURE_MODE,
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
  winston.info("err: ", err);
});
// Listen for the `proxyReq` event on `proxy`.
proxy.on('proxyReq', function (err, req, res) {

  // Log it
  winston.info("incoming: ", req.method, req.headers.host, req.url, res.statusCode, req.headers.authorization);

  // Get authorization from browser
  var authHeaderValue = req.headers.authorization;

  // Delete it because we add HTTP Basic later
  delete req.headers.authorization;


  // Log it
  winston.info("incoming post-authz: ", req.method, req.headers.host, req.url, res.statusCode, req.headers.authorization);


    // Validate token if enabled
  /* TODO: in-progres JWT verify
  if (process.env.USE_AUTH_TOKEN &&
      process.env.USE_AUTH_TOKEN == "true" &&
      process.env.AUTH_TOKEN_KEY &&
      process.env.AUTH_TOKEN_KEY.length > 0) {


    if (!authHeaderValue) {
      winston.error("missing Authorization header - access denied.");
    }
    //jwt.verify(token, secretOrPublicKey, [options]);
  }
  */
});

winston.info('https proxy server started on port 8080'.green.bold);
