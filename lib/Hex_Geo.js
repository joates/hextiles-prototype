
  // Hex_Geo.js
  // transforms heightmap data into a geometry of hexagonal cells.
  // by joates (Oct-2013)

  var Hexagon = require('./Hexagon.js')

  module.exports = function(hData, el) {  /*(heightmap, edge-length)*/
    var geometry = new THREE.Geometry()
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
          var _n = hexes[x][y].get_neighbors()
          //var nSE = hexes[x][y].get_neighbors(true)
          for (var i=0; i<_n.length; i++) {

            if (i>2) {
              var nb = _n[i-1]
              var nc = _n[i]
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

// TODO: something slightly off in 3-way joined cells :(

                // 1a. merge the upper vertices. (side skirts are cloned from these later)
                g.vertices[i1+a1[0]] = g2.vertices[a2[0]]
                g.vertices[i2+a2[1]] = g1.vertices[a1[1]]

                //g.vertices[i1+a1[0]] = g1.vertices[a1[0]] = g2.vertices[a2[0]]
                //g.vertices[i2+a2[1]] = g2.vertices[a2[1]] = g1.vertices[a1[1]]

                /**
                // 1b. add 2 faces to cover the gap.
                var f1 = new THREE.Face3(i1+a1[1], i1+a1[0], i2+a2[0])
                f1.normal = new THREE.Vector3()
                //f1.color  = g.faces[ic].color
                f1.color  = new THREE.Color(0xffffff)
                g.faces.push(f1)

                var f2 = new THREE.Face3(i1+a1[1], i2+a2[0], i2+a2[1])
                f2.normal = new THREE.Vector3()
                //f2.color  = g.faces[ic].color
                f2.color  = new THREE.Color(0xffffff)
                g.faces.push(f2)
                */
              }

              /**
              // fill the tiny triangular gaps between connected cells.
              if (hexes[nb[0]] !== undefined && hexes[nb[0]][nb[1]] !== undefined) {

                if (hexes[nb[0]][nb[1]].z === h) {
                  var g3 = hexes[nb[0]][nb[1]].meshTop
                    , i3 = 7 * (nb[1] * size + nb[0])
                  for (var n=1, m=g3.vertices.length; n<m; n++) {
                    for (var j=1; j<m; j++) {
                      for (var k=1; k<m; k++) {
                        if (g3.vertices[n].distanceTo(g1.vertices[k]) < 20 &&
                            g3.vertices[n].distanceTo(g2.vertices[j]) < 20 &&
                            parseInt(g3.vertices[n].distanceTo(g1.vertices[k])) === parseInt(g3.vertices[n].distanceTo(g2.vertices[j])) &&
                            parseInt(g3.vertices[n].distanceTo(g1.vertices[k])) === parseInt(g2.vertices[j].distanceTo(g1.vertices[k])) ) {
                            //console.log('triangle:', g3.vertices[n].distanceTo(g1.vertices[k]), g3.vertices[n].distanceTo(g2.vertices[j]), g2.vertices[j].distanceTo(g1.vertices[k]) )

                            var f1 = new THREE.Face3(i1+k, i3+n, i2+j)
                            f1.normal = new THREE.Vector3()
                            f1.color  = g.faces[ic].color
                            g.faces.push(f1)
                        }
                      }
                    }
                  }
                }
              }
              */

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

                // prefer centered ramp positioning..
                var si = slopeIndexes.length === 3 ? slopeIndexes[1] : Math.floor(slopeIndexes[slopeIndexes.length-1] / 2 + (Math.random() < 0.5 ? 0 : 1))
                var nc = n[si]
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
                      g1.vertices[j].copy(gc2.vertices[k])
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

    // Add the hexagon skirts.
    for (var y=0; y<size; y++) {
      for (var x=0; x<size; x++) {
        var i = y * size + x
        var g = hexes[x][y].drawSkirts()
        THREE.GeometryUtils.merge(geometry, g)
      }
    }

    geometry.verticesNeedUpdate = true
    geometry.mergeVertices()

    // Calculate per-vertex normals.
    geometry.computeFaceNormals()
    geometry.computeVertexNormals()

    hexes.length = 0
    return geometry
  }

