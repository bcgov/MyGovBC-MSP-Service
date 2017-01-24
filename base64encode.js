var fs = require('fs');

/* util script to base64 encode a file */
var myArgs = process.argv.slice(2);

if (myArgs.length < 1) {
    console.log("No filename provided");
    process.exit(1);
}

var fileData = fs.readFileSync(myArgs[0]);

// Output to console base64 encoded data
console.log(Buffer.from(fileData).toString('base64'));

process.exit(0);