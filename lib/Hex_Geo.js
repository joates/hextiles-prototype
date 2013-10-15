
  // Hex_Geo.js
  // transforms heightmap data into a geometry of hexagonal cells.
  // by joates (Oct-2013)

  var Hexagon = require('./Hexagon.js')

  module.exports = function(hData, el) {  /*(heightmap, edge-length)*/
    var geometry = new THREE.Geometry()
      , size = Math.sqrt(hData.length)

    // Create some hexagons.
    for (var y=size-1; y>=0; y--) {
      for (var x=0; x<size; x++) {
        var i = y * size + x
          , hex = new Hexagon(x, y, el, hData[i])
          , g = hex.draw()
        THREE.GeometryUtils.merge(geometry, g)
      }
    }

    // Calculate per-vertex normals.
    geometry.computeFaceNormals()
    geometry.computeVertexNormals()

    return geometry
  }

