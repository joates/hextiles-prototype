
  // Blur.js
  // by joates (Jul-2013)

  var linspace = require('./linspace.js')

  module.exports = function(buffer, sea_level) {

    var size   = Math.sqrt(buffer.length)
      , radius = 1
      , data   = []

    // TODO: sea level adjustment (decreasing land density).

    var num_tiers = 8
      , sl  = sea_level || 2.0
      , min = Infinity
      , max = -Infinity

    sl = Math.min(Math.max(sl, 1.0), 5.0).toFixed(2)

// DEBUG
//console.log('   sea: +'+(sl*10).toFixed(1)+' metres')

    // duplicate the buffer as an array because need
    // to access untainted values for radial averaging.
    for (var i=0, l=size*size; i<l; i++) {
      var val = parseInt(buffer[i])
      min = val < min ? val : min
      max = val > max ? val : max
      data.push(val)
    }
    //console.log('   [min: '+min+', max: '+max+']')

    // uniform linear scaled sampling frequency.
    var ls = linspace(max, min, num_tiers + 4)
      , sum = ls.reduce(function(pv, cv) { return pv + cv }, 0)
      , unit = (max - min) / sum
    ls.forEach(function(item, idx) {
      ls[idx] = item * unit
    })

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var offset = x + (y * size)
          , count  = total = 0

        for (var ky = -radius; ky <= radius; ++ky) {
          for (var kx = -radius; kx <= radius; ++kx) {
            if ( (x >= radius && y >= radius) &&
                 (x < size-radius && y < size-radius) ) {
              total += data[ x + kx + ((y + ky) * size) ] * 0.8
            } else {
              // TODO: 
              // attempt to lower all the edge values but also
              // mix up land & sea cells so the edge is less obvious.

              //total += data[ x + ((y + ky) * size) ] * 0.6
              var edge_cell = data[ x + (y * size) ] * 0.6
              if (Math.random() > 0.2) { total += edge_cell }
            }
            count++
          }
        }

        // average.
        total = total / count

        var range_start
          , range_end = min
          , step = (max - min) / num_tiers

        // assign this cell to a 'tier'.
        for (var n=0; n<num_tiers; n++) {

          // frequency uniform.
          //range_start = range_end
          //range_end   = range_start + (n * step)

          // frequency scaled.
          range_start = range_end
          range_end   = range_start + ls[n]

          if (total > range_start && total <= range_end) {
            total = n
            if (total < sl * 2) {
              if (Math.random() < 0.4 + (sl * 0.09))
                total = 0  // sea!
            }
            break
          }
        }

        // fix for '1_org' cells (they only ever spawn on an edge !!)
        total = parseInt(total) == 1 ? 2 : parseInt(total)

        // clamp.
        total = Math.min(Math.max(total, 0), num_tiers - 2)

        buffer.write(String.fromCharCode(total), offset)
      }
    }

    return buffer
  }

