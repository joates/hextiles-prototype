
  // Noise.js - make some noise, quickly !
  // by joates (Jul-2013)

  var SimplexNoise = require('simplex-noise')

  // TODO: fluidRatio: (100 / 10) + distance_from_origin

  module.exports = function(buffer) {

    var size    = Math.sqrt(buffer.length)
      , simplex = new SimplexNoise(Math.random)

    for(var y = 0; y < size; y++) {
      for(var x = 0; x < size; x++) {
        var offset = x + (y * size)
        var value  = (simplex.noise2D(x, y) * 128) + 128
        value = Math.min(Math.floor(value), 255)
        buffer.write(String.fromCharCode(value), offset)
      }
    }

    return buffer
  }

