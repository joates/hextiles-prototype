
  // Hex_Geo.js
  // transforms heightmap data into a geometry of hexagonal cells.
  // by joates (Oct-2013)

  var Hexagon = require('./Hexagon.js')

  module.exports = function(hData, el) {  /*(heightmap, edge-length)*/
    var geometry = new THREE.Geometry()
      , size = Math.sqrt(hData.length)
      , hexes = []

    geometry.dynamic = true

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

    geometry = build_ramps(geometry, hexes, size)
    geometry = connect_hex_corners(geometry, hexes, size)
    geometry = connect_hex_edges(geometry, hexes, size)

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

  function build_ramps(geometry, hexes, size) {
    /**
     *  connect cells by sloping an edge.
     */
    var g  = geometry
      , min_neighbors = 3

    for (var y=0; y<size; y++) {
      for (var x=0; x<size; x++) {

        var h = hexes[x][y].z
        if (h > 2) {
          var n = hexes[x][y].get_neighbors()
            , slopeIndexes = []
            , slopeTotal = 0

          // duplicate 1st & last cells to emulate a circular list.
          //var d = n[n.length-1]; n.push(n[0]); n.unshift(d)

          for (var i=0; i<n.length; i++) {
            var nc = n[i]
            if (hexes[nc[0]] === undefined || hexes[nc[0]][nc[1]] === undefined) continue

            var h1 = hexes[nc[0]][nc[1]].z
            if (h1 === (h - 1)) { slopeIndexes.push(i) }
            if (slopeIndexes.length >= min_neighbors) {

              slopeTotal = slopeIndexes[slopeIndexes.length-1] - slopeIndexes[0]
              if (slopeTotal === (slopeIndexes.length - 1)) {

                // found a slope candidate !!
                //console.log('slope:' +slopeTotal, hexes[x][y], slopeIndexes)

                // prefer centered ramp positioning..
                var si = slopeIndexes.length === 3 ? slopeIndexes[1] : Math.floor(slopeIndexes[slopeIndexes.length-1] / 2 + (Math.random() < 0.5 ? 0 : 1))
                var nc = n[si]
                  , g1  = hexes[x][y].meshTop
                  , gc1 = hexes[x][y].meshTop.clone()
                  , gc2 = hexes[nc[0]][nc[1]].meshTop.clone()
                  , i1 = 7 * (y * size + x)

                for (var j=1, l=g1.vertices.length; j<l; j++) {
                  for (var k=1; k<l; k++) {
                    gc1.vertices[j].y = gc2.vertices[k].y
                    if (gc1.vertices[j].distanceTo(gc2.vertices[k]) < 40) {
                      g.vertices[i1+j].copy(gc1.vertices[j])
                      g1.vertices[j].copy(gc1.vertices[j])
                    }
                  }
                }

                slopeIndexes = [slopeIndexes.pop()]
              } else { slopeIndexes.shift() }

            }
          }
        }

      }
    }

    return geometry
  }

  function connect_hex_corners(geometry, hexes, size) {
    /**
     *  connect corner vertices of cells with similar heights.
     */
    var g  = geometry

    for (var hy=0; hy<size; hy++) {
      for (var hx=0; hx<size; hx++) {
        if (hexes[hx][hy].z > 0) {  /* ignore sea-level */

          var hn = hexes[hx][hy].get_neighbors()

          // duplicate 1st & last cells to emulate a circular list.
          var d = hn[hn.length-1]; hn.push(hn[0]); hn.unshift(d)

          for (var hnl=0; hnl<hn.length; hnl++) {

            if (hnl > 0) {
              var na = hn[hnl-1]
                , nb = hn[hnl]

              // check that the neighbor cells actually exist.
              if (hexes[na[0]] !== undefined && hexes[na[0]][na[1]] !== undefined &&
                  hexes[nb[0]] !== undefined && hexes[nb[0]][nb[1]] !== undefined) {

                var g0 = hexes[hx][hy].meshTop
                  , g1 = hexes[na[0]][na[1]].meshTop
                  , g2 = hexes[nb[0]][nb[1]].meshTop
                  , i0 = 7 * (hy * size + hx)
                  , i1 = 7 * (na[1] * size + na[0])
                  , i2 = 7 * (nb[1] * size + nb[0])
                  , ic = 6 * (hy * size + hx)

                for (var i=1, l=g0.vertices.length; i<l; i++) {
                  for (var j=1; j<l; j++) {
                    for (var k=1; k<l; k++) {
                      // test verts for equal elevation.
                      if (parseInt(g1.vertices[j].y) === parseInt(g0.vertices[i].y) &&
                          parseInt(g2.vertices[k].y) === parseInt(g0.vertices[i].y) ) {

                        // test verts for close proximity.
                        if (g1.vertices[j].distanceTo(g0.vertices[i]) < 25 &&
                            g2.vertices[k].distanceTo(g0.vertices[i]) < 25) {

                          // calculate centroid.
                          var vc = new THREE.Vector3()
                          vc.set(0, 0, 0)
                          vc.add(g0.vertices[i])
                          vc.add(g1.vertices[j])
                          vc.add(g2.vertices[k])
                          vc.divideScalar(3)

                          // merge vertices in main geometry.
                          g.vertices[i0+i].copy(vc)
                          g.vertices[i1+j].copy(vc)
                          g.vertices[i2+k].copy(vc)

                          // adjust vertices in each hexagon geometry.
                          g0.vertices[i].copy(vc)
                          g1.vertices[j].copy(vc)
                          g2.vertices[k].copy(vc)

                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return geometry
  }

  function connect_hex_edges(geometry, hexes, size) {
    var g  = geometry

    for (var hy=0; hy<size; hy++) {
      for (var hx=0; hx<size; hx++) {
        var h = hexes[hx][hy].z
        if (h > 0) {  /* ignore sea-level */

          var hn = hexes[hx][hy].get_neighbors()

          for (var hnl=0; hnl<hn.length; hnl++) {

            var n1 = hn[hnl]
            if (hexes[n1[0]] === undefined || hexes[n1[0]][n1[1]] === undefined) continue

            if (hexes[n1[0]][n1[1]].z === h) {

              var g0 = hexes[hx][hy].meshTop
                , g1 = hexes[n1[0]][n1[1]].meshTop
                , i0 = 7 * (hy * size + hx)
                , i1 = 7 * (n1[1] * size + n1[0])
                , ic = 6 * (hy * size + hx)

              for (var j=1, l=g0.vertices.length; j<l; j++) {
                for (var k=1; k<l; k++) {
                  if (g0.vertices[j].distanceTo(g1.vertices[k]) < 25) {

                    var vc = new THREE.Vector3(0, 0, 0)
                    vc.addVectors(g0.vertices[j], g1.vertices[k])
                    vc.divideScalar(2)

                    g.vertices[i0+j].copy(vc)
                    g0.vertices[j].copy(vc)
                    g1.vertices[k].copy(vc)
                  }
                }
              }
            }
          }
        }
      }
    }

    return geometry
  }



