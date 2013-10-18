
  // build.js
  // by joates (Oct-2013)

  var fs = require('fs')
    , ws = fs.createWriteStream('./public/main.js')
    , browserify = require('browserify')
    , b = browserify()

  // add client-side code & write output.
  b.add('./client.js')
  b.bundle().pipe(ws)

