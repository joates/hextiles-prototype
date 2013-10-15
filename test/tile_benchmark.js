
  var Tile = require('../lib/Tile.js')

  var iter = 1000
  var t, i, j, start, stop

  var x = 0
  start = process.hrtime()

  for (i=0; i<iter; ++i) {
    t = new Tile().size(16).addNoise().addBlur()
  }

  stop = process.hrtime(start)
  time = (stop[0]*1e9 + stop[1])/1e6
  console.log('1k tiles: '+time+' ms')

