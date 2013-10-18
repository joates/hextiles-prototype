
  // Hex_VBO.js
  // loads a geometry into vertex buffers in GPU memory.
  // by joates (Oct-2013)

  function Hex_VBO(geo) {

    var geometry  = new THREE.BufferGeometry()
      , triangles = geo.faces.length
      , faces     = geo.faces
      , verts     = geo.vertices
      , chunkSize = 20000

    geometry.attributes = {
      index: {
        itemSize: 1,
        array: new Int16Array(triangles * 3),
        numItems: triangles * 3
      },
      position: {
        itemSize: 3,
        array: new Float32Array(triangles * 3 * 3),
        numItems: triangles * 3 * 3
      },
      normal: {
        itemSize: 3,
        array: new Float32Array(triangles * 3 * 3),
        numItems: triangles * 3 * 3
      },
      color: {
        itemSize: 3,
        array: new Float32Array(triangles * 3 * 3),
        numItems: triangles * 3 * 3
      }
    }

    var indices   = geometry.attributes.index.array
      , positions = geometry.attributes.position.array
      , normals   = geometry.attributes.normal.array
      , colors    = geometry.attributes.color.array

    for (var i=0; i<indices.length; i++) {
      indices[i] = i % (3 * chunkSize)
    }
                
    for (var i=0; i<triangles; i++) {

      var ai = faces[i].a
        , bi = faces[i].b
        , ci = faces[i].c

      positions[i * 9]     = verts[ai].x
      positions[i * 9 + 1] = verts[ai].y
      positions[i * 9 + 2] = verts[ai].z

      positions[i * 9 + 3] = verts[bi].x
      positions[i * 9 + 4] = verts[bi].y
      positions[i * 9 + 5] = verts[bi].z

      positions[i * 9 + 6] = verts[ci].x
      positions[i * 9 + 7] = verts[ci].y
      positions[i * 9 + 8] = verts[ci].z

      var vn = geo.faces[i].vertexNormals

      normals[i * 9]     = vn[0].x
      normals[i * 9 + 1] = vn[0].y
      normals[i * 9 + 2] = vn[0].z

      normals[i * 9 + 3] = vn[1].x
      normals[i * 9 + 4] = vn[1].y
      normals[i * 9 + 5] = vn[1].z

      normals[i * 9 + 6] = vn[2].x
      normals[i * 9 + 7] = vn[2].y
      normals[i * 9 + 8] = vn[2].z

      var vc = geo.faces[i].color

      colors[i * 9]     = vc.r
      colors[i * 9 + 1] = vc.g
      colors[i * 9 + 2] = vc.b

      colors[i * 9 + 3] = vc.r
      colors[i * 9 + 4] = vc.g
      colors[i * 9 + 5] = vc.b

      colors[i * 9 + 6] = vc.r
      colors[i * 9 + 7] = vc.g
      colors[i * 9 + 8] = vc.b
    }

    geometry.offsets = []

    var offsets = triangles / chunkSize

    for (var i=0; i<offsets; i++) {
      var offset = {
        start: i * chunkSize * 3,
        index: i * chunkSize * 3,
        count: Math.min(triangles - (i * chunkSize), chunkSize) * 3
      }
      geometry.offsets.push(offset)
    }
                
    geometry.computeBoundingSphere()

    return geometry
  }

  module.exports = Hex_VBO

