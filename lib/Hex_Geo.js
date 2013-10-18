
  // Hex_Geo.js
  // transforms heightmap data into a geometry of hexagonal cells.
  // by joates (Oct-2013)

  var Hexagon = require('./Hexagon.js')

  module.exports = function(hData, el) {  /*(heightmap, edge-length)*/
    var geometry = new THREE.Geometry({ dynamic: true })
      , size = Math.sqrt(hData.length)
      , hexes = []

    // Create some hexagons.
    for (var y=0; y<size; y++) {
      for (var x=0; x<size; x++) {
        var i = y * size + x
        if (hexes[x] === undefined) hexes[x] = []
        hexes[x][y] = new Hexagon(x, y, el, hData[i])
        var g = hexes[x][y].draw()
        THREE.GeometryUtils.merge(geometry, g)
      }
    }

    /**
     *  connect equal height cells together.
     */
    for (var y=0; y<size; y++) {
      for (var x=0; x<size; x++) {

        var h = hexes[x][y].z
        if (h > 1) {
          var n = hexes[x][y].get_neighbors(true)
          for (var i=0; i<n.length; i++) {
            var nc = n[i]
            if (hexes[nc[0]] === undefined || hexes[nc[0]][nc[1]] === undefined) continue

            var g  = geometry
              , g1 = hexes[x][y].meshTop
              , g2 = hexes[nc[0]][nc[1]].meshTop
              , i1 = 7 * (y * size + x)
              , i2 = 7 * (nc[1] * size + nc[0])
              , ic = 6 * (y * size + x)
              , a1 = []
              , a2 = []

            for (var j=1, l=g1.vertices.length; j<l; j++) {
              for (var k=1; k<l; k++) {
                if (Math.abs(g1.vertices[j].y - g2.vertices[k].y) < 10 &&
                    g1.vertices[j].distanceTo(g2.vertices[k]) < 40) {
                  a1.push(j)
                  a2.push(k)
                }
              }
            }

            if (a1.length === 2 && a2.length === 2) {
              var f1 = new THREE.Face3(i1+a1[1], i1+a1[0], i2+a2[0])
              f1.normal = new THREE.Vector3()
              f1.color  = g.faces[ic].color
              g.faces.push(f1)

              var f2 = new THREE.Face3(i1+a1[1], i2+a2[0], i2+a2[1])
              f2.normal = new THREE.Vector3()
              f2.color  = g.faces[ic].color
              g.faces.push(f2)
            }

          }
        }

      }
    }

    /**
     *  connect cells with 3 or more consecutive neighbor cells
     *  which are only 1-tier lower by sloping the higher cell.
     */
    for (var y=0; y<size; y++) {
      for (var x=0; x<size; x++) {

        var h = hexes[x][y].z
        if (h > 2) {
          var n = hexes[x][y].get_neighbors()
            , slopeIndexes = []
            , slopeTotal = 0
          for (var i=0; i<n.length; i++) {
            var nc = n[i]
            if (hexes[nc[0]] === undefined || hexes[nc[0]][nc[1]] === undefined) continue

            var h1 = hexes[nc[0]][nc[1]].z
            if (h1 === (h - 1)) { slopeIndexes.push(i) }
            if (slopeIndexes.length > 2) {

              slopeTotal = slopeIndexes[slopeIndexes.length-1] - slopeIndexes[0]
              if (slopeTotal === (slopeIndexes.length - 1)) {

                // found a slope candidate !!
                //console.log('slope:' +slopeTotal, hexes[x][y], slopeIndexes)
                var si = Math.floor(slopeIndexes.length * 0.5)
                var nc = n[slopeIndexes[si]]
                var g  = geometry
                  , g1  = hexes[x][y].meshTop
                  , gc1 = hexes[x][y].meshTop.clone()
                  , gc2 = hexes[nc[0]][nc[1]].meshTop.clone()
                  , i1 = 7 * (y * size + x)

                for (var j=1, l=g1.vertices.length; j<l; j++) {
                  for (var k=1; k<l; k++) {
                    gc1.vertices[j].y = gc2.vertices[k].y
                    if (gc1.vertices[j].distanceTo(gc2.vertices[k]) < 40) {
                      g.vertices[i1+j].copy(gc2.vertices[k])
                    }
                  }
                }

                break
              } else { slopeIndexes.shift() }

            }
          }
        }

      }
    }

    /**
    // Add the hexagon skirts.
    for (var y=size-1; y>=0; y--) {
      for (var x=0; x<size; x++) {
        var i = y * size + x
        var g = hexes[x][y].drawSkirts()
        THREE.GeometryUtils.merge(geometry, g)
      }
    }
    */

    geometry.verticesNeedUpdate = true

    // Calculate per-vertex normals.
    geometry.computeFaceNormals()
    geometry.computeVertexNormals()

    hexes.length = 0
    return geometry
  }

