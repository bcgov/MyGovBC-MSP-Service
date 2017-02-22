# MyGovBC-MSP-Service

A NodeJS based static proxy for MyGovBC-MSP user interface.

## Features:

1. Proxy to target base URL  
2. Replays body and query parameters
3. Adds HTTP Basic and Client Certificate Authentication
4. Logs to console
5. Utility to convert file like a PEM to base64 string `base64encode.js` for use in configuration

## Developer Prerequisites
* node@>=4.2.5
* npm@>=3.10.0 (note: not the default of node@4.2.5)
* GIT

## Configuration
All configuration is done via a user's shell environment variable and read in NodeJS via `process.env`

Name | Description
--- | --- 
TARGET_URL | Base URL to send HTTP request
TARGET_HEADER_HOST | Host header to send
TARGET_USERNAME_PASSWORD | For HTTP Basic the username:password
CORS_ORIGIN | Optional, if using CORS supply use domain name of the allowed origin
MUTUAL_TLS_PEM_KEY_BASE64 | A base64 encoded PEM key string
MUTUAL_TLS_PEM_KEY_PASSPHRASE | The passphrase for the above PEM key
MUTUAL_TLS_PEM_CERT | The client certificate for the above KEY in a base64 encoded PEM format
SECURE_MODE | Insecure mode allows untrusted targets.  Always `true` unless you are debugging
USE_MUTUAL_TLS | Turns on and off Mutual TLS to target.  Always `true` unless you are debugging
LOGSTASH_PORT | Optional, the port of LOGSTASH for winston logging. 