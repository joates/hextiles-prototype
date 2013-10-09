
  // Tile.js
  // by joates (Jul-2013)
  //
  // API:
  // var tile = new Tile.create(256).noise().blur()

  var noise = require('./Noise')
    , blur  = require('./Blur')
    , Tile  = function() { /* empty constructor */ }

  Tile.prototype = {

    size: function(_size) {
      var size = _size || 32
      this.data = new Buffer(size * size)
      return this
    },

    addNoise: function() {
      this.data = noise(this.data)
      return this
    },

    addBlur: function(sea_lvl) {
      this.data = blur(this.data, sea_lvl)
      return this
    }
  }

  Tile.prototype.fluidRatio = function() {
    var fluidCount = 0
      , size = this.data.length

    for (var i=0, l=size*size; i<l; i++) {
      fluidCount += parseInt(this.data[i]) === 0 ? 1 : 0
    }

    // integer percentage ratio
    return Math.floor(fluidCount / size * 100)
  }

  module.exports = Tile

