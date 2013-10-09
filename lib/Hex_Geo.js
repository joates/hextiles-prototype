
  // Hex_Geo.js
  // transforms heightmap data into a geometry of hexagonal cells.
  // by joates (Oct-2013)

  var Hexagon = require('./Hexagon.js')

  module.exports = function(hData, el) {  /*(heightmap, edge-length)*/
    var geometry = new THREE.Geometry()
      , size = Math.sqrt(hData.length)

    // Create some hexagons.
    for (var y=0; y<size; y++) {
      for (var x=0; x<size; x++) {
        var i = x + (y * size)

        // NOTE: y-coord is flipped (by joates 06-Oct-2013)
        var hex = new Hexagon(x, size-y-1, el, hData[i])
        var g = hex.draw()
        THREE.GeometryUtils.merge(geometry, g)
      }
    }

    // Calculate per-vertex normals.
    geometry.computeFaceNormals()
    geometry.computeVertexNormals()

    return geometry
  }

