
  // server.js
  // by joates (Oct-2013)

  var server = require('http').createServer(handler)
    , io = require('socket.io').listen(server)
    , ss = require('socket.io-stream')
    , fs = require('fs')
    , Tile = require('./lib/Tile.js')
    , tile_map = []
    , re = new RegExp('\.js$', 'i')

  io.set('log level', 0)   // quiet mode.
  server.listen(8000)     // start http service.

  // process incoming requests.
  function handler(req, res) {
    if (req.url == '/') req.url = '/public/index.html'
    else if (re.test(req.url))
      res.setHeader('Content-Type', 'application/javascript')
    var rs = fs.createReadStream(__dirname + req.url)
    rs.pipe(res)
  }

  // socket.io event handlers.
  io.sockets.on('connection', function(client) {

    client.on('tile', function(data) {
      var tx = data.x || 0, ty = data.y || 0
      if (tile_map[tx] === undefined) tile_map[tx] = []
      if (tile_map[tx][ty] === undefined)
        tile_map[tx][ty] = new Tile().size(16).addNoise().addBlur()
      // send tile data (heightmap stream).
      ss(client).emit('tile', tile_map[tx][ty].data, { x:tx, y:ty })
    })

    client.on('disconnect', function() {
      console.log('   end')
    })

  })

