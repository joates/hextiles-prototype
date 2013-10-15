
  var R, S, T, XM, YM
    , num_steps = 7
    , gs  = 0.010   /* gutter_stretch */
    , svs = 1.1    /* step_vertical_stretch */

  function Hexagon(column, row, _edgeLength, height) {
    this.column = column
    this.row    = row
    this.edgeLength = R = _edgeLength || 2

    S = 2 * R / Math.sqrt(3)
    T = S / 2
    XM = new THREE.Vector4(1/(2*R), -1/S,  1/R,     0  )
    YM = new THREE.Vector4(1/(2*R),  1/S, -1/(2*R), 1/S)

    var hexPosition = _to_hex(column, row, R)

    this.x = hexPosition.x
    this.y = hexPosition.y
    this.z = height

    //this.elevation
    //this.gutterWidth

    this.hasSkirts = height > 1

    //this.center = _to_hex( this.row, this.column, this.edgeLength )

    //var gridPosition = _to_grid( this.center.x, this.center.y, this.edgeLength )

    //this.gridX = gridPosition.x
    //this.gridY = gridPosition.y
  }

  Hexagon.prototype.draw = function() {

    //var hScale = this.z * 1.05 || 1   // hScale is elevation
    var hScale = this.z * (svs * 0.02 * this.edgeLength)

    var geometry  = new THREE.Geometry()
      , normal    = new THREE.Vector3()

    var c
      , color = [
      /* sea  */ //new THREE.Color().setRGB( 0.0,  0.2,  0.5 ),
      /* low  */ //new THREE.Color().setRGB( 0.2,  0.5,  0.2 ),
      /* mid  */ //new THREE.Color().setRGB( 0.3,  0.6,  0.3 ),
      /* high */ //new THREE.Color().setRGB( 0.4,  0.75,  0.4 ),

      /* 0_sea  */ //new THREE.Color().setRGB( 0.00, 0.20, 0.60 ),
      /* 1_low  */ //new THREE.Color().setRGB( 0.25, 0.50, 0.10 ),
      /* 2_low+ */ //new THREE.Color().setRGB( 0.28, 0.55, 0.10 ),
      /* 3_mid  */ //new THREE.Color().setRGB( 0.30, 0.65, 0.20 ),
      /* 4_mid+ */ //new THREE.Color().setRGB( 0.30, 0.75, 0.20 ),
      /* 5_high */ //new THREE.Color().setRGB( 0.40, 0.80, 0.30 ),
      /* 6_top  */ //new THREE.Color().setRGB( 0.70, 0.75, 0.60 ),

      /* 0_sea  */ new THREE.Color().setRGB( 0.00, 0.20, 0.60 ),
      /* 1_org  */ new THREE.Color().setRGB( 0.50, 0.35, 0.00 ),
      /* 2_yel  */ new THREE.Color().setRGB( 0.50, 0.50, 0.00 ),
      /* 3_gre1 */ new THREE.Color().setRGB( 0.25, 0.60, 0.10 ),
      /* 4_gre2 */ //new THREE.Color().setRGB( 0.35, 0.70, 0.15 ),
      /* 4_NULL */ new THREE.Color().setRGB( 0.77, 0.35, 0.09 ),
      /* 5_gre3 */ new THREE.Color().setRGB( 0.40, 0.80, 0.20 ),
      /* 6_wht  */ new THREE.Color().setRGB( 0.90, 0.90, 0.90 ),

      // Radioactive.
      /* 7_odd  */ //new THREE.Color().setRGB( 1.0, 1.0, 0.0 ),
      /* 8_even */ //new THREE.Color( 0x000000 )
      // Umbrella Corp.
      /* 7_odd  */ new THREE.Color().setRGB( 1.0, 0.0, 0.0 ),
      /* 8_even */ new THREE.Color( 0xffffff ),

      // edge skirts.
      /* 9_mocha */ //new THREE.Color().setRGB( 0.30, 0.25, 0.15 )
      /* 9_red_dirt */ new THREE.Color().setRGB( 0.50, 0.32, 0.10 )
      /* 9_red_fox  */ //new THREE.Color().setRGB( 0.77, 0.35, 0.09 )
    ]

    var numVerts = 0

    for (var i=0; i<=6; i++) {
      //var edgeExpand = 1.14

      // NOTE: hSize defines the amount of lateral expansion.
      var hSize = this.edgeLength * (1.16 - this.z * gs)

      var angle = 2 * Math.PI / 6 * (i + 0.5)
      x_i = this.x + hSize * Math.cos(angle)
      y_i = this.y + hSize * Math.sin(angle)

      if (i > 1) {
        // draw a triangle (THREE.Face3).
        geometry.vertices.push(new THREE.Vector3(x_i, y_i, this.z * hScale))

        //var c = this.z < 4 ? Math.floor(this.z) : i % 2 ? 4 : 5
        var c = this.z < num_steps ? Math.floor(this.z) : i % 2 ? num_steps+1 : num_steps

        var face = new THREE.Face3(
          0, numVerts-1, numVerts,
          normal, color[c]
        )

        geometry.faces.push(face)
        numVerts++
      } else if (i == 0) {
        // offset and add center vertex.
        var ox = x_i - hSize * Math.sqrt(3) * 0.5
        var oy = y_i - hSize / 2

        // lower OR raise the center vertex ?
        var h  = this.z == 0 ? -0.5 : (this.z * hScale + 0.5)

        geometry.vertices.push(new THREE.Vector3(ox, oy, h))
        numVerts++
      } else {
        // add the first corner vertex.
        geometry.vertices.push(new THREE.Vector3(x_i, y_i, this.z * hScale))
        numVerts++
      }
    }

    // add the last face.
    geometry.faces.push(
      new THREE.Face3(0, 6, 1, normal, c==num_steps?color[c+1]:color[c])
    )

    if (this.hasSkirts) {

      for (var i=1; i<=6; i++) {

        if (i > 1) {

          // draw a skirt (2x THREE.Face3).
          var j = geometry.vertices[i].clone()
          j.z = 0
          geometry.vertices.push(j)

          var skirt_t1 = new THREE.Face3(i, i-1, numVerts)
            , skirt_t2 = new THREE.Face3(i-1, numVerts-1, numVerts)
          skirt_t1.color = skirt_t2.color = color[9]

          geometry.faces.push(skirt_t1, skirt_t2)
          numVerts++

        } else {
          // add the first lower vertex.
          var j = geometry.vertices[i].clone()
          j.z = 0
          geometry.vertices.push(j)
          numVerts++
        }
      }

      // add the last skirt.
      var skirt_t1 = new THREE.Face3(1,  6, 7)
        , skirt_t2 = new THREE.Face3(6, 12, 7)
      skirt_t1.color = skirt_t2.color = color[9]

      geometry.faces.push(skirt_t1, skirt_t2)
    }

    // baked rotation
    var rotMat = new THREE.Matrix4().makeRotationX(- Math.PI / 2)
    geometry.applyMatrix(rotMat)

    // per-vertex normals.
    geometry.computeFaceNormals()
    //geometry.computeVertexNormals()
    //geometry.verticesNeedUpdate = true
    //geometry.elementsNeedUpdate = true
    geometry.normalsNeedUpdate  = true

    //return new THREE.Mesh(geometry, shaderMaterial)
    return geometry
  }

  function _to_grid(x, y, r) {

    //var scale = r / R
    var vec2  = new THREE.Vector2(x, y).multiplyScalar(r)
    var tmp2

    tmp2 = _floor_dot(vec2, XM)
    var hx = Math.floor((tmp2.x + tmp2.y + 2) / 3)

    tmp2 = _floor_dot(vec2, YM)
    var hy = Math.floor((tmp2.x + tmp2.y + 2) / 3)

    return new THREE.Vector2(hx, hy)
  }

  function _to_hex(hx, hy, r) {

    //var scale = r / R

    var gx = hx * (2 * R) + hy * R
      , gy = hy * (S + T)

    //return new THREE.Vector2(gx, gy).multiplyScalar(scale)
    return new THREE.Vector2(gx, gy)
  }

  function _floor_dot(v2, v4) {
    var j = Math.floor(v4.x * v2.x + v4.y * v2.y)
      , k = Math.floor(v4.z * v2.x + v4.w * v2.y)

    return new THREE.Vector2(j, k)
  }

  Hexagon.prototype.get_neighbors = function() {
    // in a pointy-top axial grid this returns the coordinates
    // of the 3 cells connected to the South & East edges.
    var neighbors = [ [-1, +1], [ 0, +1], [+1,  0] ]
      , r = []

    for (var i=0; i<3; i++) {
      var d = neighbors[i]
      r.push(new Array(this.column + d[0], this.row + d[1]))
    }

    return r
  }

  module.exports = Hexagon


