
  // client.js
  // by joates (Oct-2013)

  // Hardcoded dependency on THREE (https://github.com/mrdoob/three.js)
  try {
    if (! THREE || parseInt(THREE.REVISION) < 60) throw new Error()
  } catch(err) {
    if ('undefined' == typeof(global)) {  // running in browser?
      console.log(err.stack)
      err.description =
        'You need to install the three.js library (r60 or better) and import the <script> ' +
        'in your index.html file BEFORE the game code <script> (bundle.js).'
      console.error(err.description)
    }
  }

  // websockets.

  var io = require('socket.io-client')
    , ss = require('socket.io-stream')
    , socket
    , domready = require('domready')
    , Hexagon = require('./lib/Hexagon.js')
    , Hex_Geo = require('./lib/Hex_Geo.js')
    , Hex_VBO = require('./lib/Hex_VBO.js')
    , LRU = require("lru-cache")
    , cache_opts = { max: 16, dispose: function(key, n) { n.geometry.dispose(); scene.remove(n) } }
    , tile_cache = LRU(cache_opts)  // store most recently visited tiles.
    , tile_fetch_queue = []
    , update_counter = 0

  var R = 80
    , S = 2 * R / Math.sqrt(3)
    , T = S / 2
    , el = 2 * R  /* edge length */
    , XM = new THREE.Vector4(1/(2*R), -1/S,  1/R,     0  )
    , YM = new THREE.Vector4(1/(2*R),  1/S, -1/(2*R), 1/S)

  setTimeout(function() { domready(function() {
    socket = io.connect()

    ss(socket).on('tile', function(stream, pos) {
      build_terrain(stream, pos.x, pos.y)
    })

    // initial terrain tile.
    socket.emit('tile', { x:0, y:0 })

    init()
    start()

    // prime the tile_cache (3x3 grid).
    for (var y=-1; y<=1; y++) {
      for (var x=-1; x<=1; x++) {
        if (x === 0 && y === 0) continue
        //socket.emit('tile', { x:x, y:y })
        tile_fetch_queue.push(x.toString()+'_'+y.toString())
      }
    }

  })}, 0)

  // scene (3D).

  var scene
    , camera
    , renderer
    , container
    , inset
    , inset_scene
    , inset_camera
    , inset_renderer
    , stats
    , WIDTH
    , HEIGHT
    , clock = new THREE.Clock()
    , cameraTarget = new THREE.Vector3()
    , playerMesh
    , playerSkin = 11
    , playerOrigin = new THREE.Vector3()
    , playerControls = {
        moveLeft:  false, moveForward:  false, 
        moveRight: false, moveBackward: false }
    , fog = true
    , cell = { x:0, y:0 }
    , last_cell = cell
    , tile = { x:0, y:0 }
    , last_tile = tile
    , quadrant = 0
    , last_dir = 0
    , heading_el
    , hData = []
    , playerPosY = 0
    , playerAdj

  function init() {
    WIDTH  = window.innerWidth
    HEIGHT = window.innerHeight

    scene = new THREE.Scene()
    if (fog) scene.fog = new THREE.Fog(0x00090f, 0, 2000, 8000)

    // lights.
    scene.add(new THREE.AmbientLight(0x20202f))
    var light = new THREE.DirectionalLight(0xffffff, 3.5)
    //light.position.set(0, 2, -1).normalize()
    light.position.set(-60, 200, -30)
    scene.add(light)

    // camera.
    camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.1, 10000)

    // renderer.
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(WIDTH, HEIGHT)
    if (fog) renderer.setClearColor(scene.fog.color, 0.8)

    // FPS graph.
    stats = new Stats()
    stats.domElement.style.position = 'absolute'
    stats.domElement.style.top = '6px'
    stats.domElement.style.left = '6px'
    stats.domElement.style.zIndex = '99'
    document.body.appendChild(stats.domElement)

    container = document.createElement('div')
    container.appendChild(renderer.domElement)
    document.body.appendChild(container)

    // inset compass.
    inset_scene = new THREE.Scene()
    inset = document.createElement('div')
    inset.style.position = 'absolute'
    inset.style.width  = '100px'
    inset.style.height = '40px'
    inset.style.top   = '16px'
    inset.style.right = '6px'
    inset.style.zIndex = '90'
    inset_renderer = new THREE.CanvasRenderer()
    inset_renderer.setSize(100, 40)
    inset.appendChild(inset_renderer.domElement)
    document.body.appendChild(inset)
    inset_camera = new THREE.PerspectiveCamera(50, 100 / 40, 1, 1000)
    inset_camera.up = camera.up // important!
    inset_scene.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 10, 0xbada55))

    // events.
    window.addEventListener('resize', onWindowResize, false)
    document.addEventListener('keydown', onKeyDown, false)
    document.addEventListener('keyup', onKeyUp, false);

    // CHARACTER
    var configOgro = {
      baseUrl: "/public/three.js/examples/models/animated/ogro/",
      body: "ogro-light.js",
      skins: [ "grok.jpg", "ogrobase.png", "arboshak.png",
        "ctf_r.png", "ctf_b.png", "darkam.png", "freedom.png",
        "gib.png", "gordogh.png", "igdosh.png", "khorne.png",
        "nabogro.png", "sharokh.png" ],
      weapons:  [ [ "weapon-light.js", "weapon.jpg" ] ],
      animations: {
        move: "run",
        idle: "stand",
        jump: "jump",
        attack: "attack",
        crouchMove: "cwalk",
        crouchIdle: "cstand",
        crouchAttach: "crattack"
      },
      walkSpeed: 350,
      crouchSpeed: 175
    }

    playerMesh = new THREE.MD2CharacterComplex()
    playerMesh.scale = 1
    // turn player to face hexagonal "North"
    playerMesh.bodyOrientation = Math.PI - Math.PI / 6
    playerMesh.controls = playerControls
    playerOrigin.copy(playerMesh.root.position)
    cameraTarget.copy(playerOrigin).setY(50)

    var baseCharacter = new THREE.MD2CharacterComplex()
    baseCharacter.scale = 1

    baseCharacter.onLoadComplete = function () {
      var cloneCharacter = playerMesh
      cloneCharacter.shareParts(baseCharacter)
      cloneCharacter.enableShadows(true)
      //cloneCharacter.setWeapon(0)
      cloneCharacter.setSkin(playerSkin)

      scene.add(cloneCharacter.root)

      var gyro = new THREE.Gyroscope()
      gyro.add(camera)

      playerMesh.root.add(gyro)
    }

    baseCharacter.loadParts(configOgro)

    // heading display.
    heading_el = document.createElement('div')
    heading_el.style.position  = 'absolute'
    heading_el.style.width = '100px'
    heading_el.style.top   = '6px'
    heading_el.style.right = '6px'
    heading_el.style.zIndex = '100'
    heading_el.style.font = 'normal 10px verdana'
    heading_el.style.textAlign = 'center'
    heading_el.style.color = '#CCC'
    document.body.appendChild(heading_el)
  }

  function start() {
    // wait for 1st tile.
    if (hData[0] !== undefined && hData[0][0] !== undefined) {
      // find highest central cell (on tile[0][0]).
      var hc  = high_cell()
      var pos = _to_hex(hc.x * 2, hc.y * 2)

      // set player start position (highest cell near x:7, y:7).
      playerMesh.root.position.x = pos.x
      playerMesh.root.position.z = -pos.y
      // set player elevation.
      var ty = hData[hc.x][hc.y]
      playerMesh.root.position.y = (ty * (ty * (1.1 * 0.02 * el))) + 24

      animate()  // now start the main loop
    } else setTimeout(function() { start() }, 10)
  }

  function animate() {
    requestAnimationFrame(animate)
    update()

    // inset compass.
    var ang = playerMesh.bodyOrientation + Math.PI / 6
    inset_camera.position.setX(Math.cos(ang))
    inset_camera.position.setZ(Math.sin(ang))
    inset_camera.position.setLength(150)
    inset_camera.position.setY(11)
    inset_camera.lookAt(inset_scene.position)

    render()
  }

  function update() {
    var ql = tile_fetch_queue.length
    if (update_counter % 16 === 0 && ql > 0) {
      tile = tile_fetch_queue.shift().split('_')
      socket.emit('tile', { x:parseInt(tile[0]), y:parseInt(tile[1]) })
      console.log('tile request: %s, %s [1 of %d]', tile[0], tile[1], ql)
    }

    var delta = clock.getDelta()
    playerMesh.update(delta)

    TWEEN.update()
    stats.update()

    cell = get_grid_coord(16, false)
    if (cell.x !== last_cell.x || cell.y !== last_cell.y) {
      var ty = hData[cell.x][cell.y]
      playerPosY = ty * (ty * (1.1 * 0.02 * el)) + 24
    }

    // player elevation adjustment.
    if (playerMesh.root.position.y !== playerPosY) {
      playerAdj = Math.abs(playerMesh.root.position.y - playerPosY) * 0.1
      if (Math.abs(playerMesh.root.position.y - playerPosY) < playerAdj)      
        playerMesh.root.position.y = playerPosY        // align
      else if (playerMesh.root.position.y < playerPosY)      
        playerMesh.root.position.y += playerAdj        // lift by 10%
      else if (playerMesh.root.position.y > playerPosY)      
        playerMesh.root.position.y -= playerAdj        // sink by 10%
    }

    // camera follows our player.
    var matrix = new THREE.Matrix4().copy(playerMesh.root.matrix)
    matrix.setPosition(playerOrigin)
    var offset = new THREE.Vector3(0, 100, -300)
    var cameraOffset = offset.applyMatrix4(matrix)

    // Create a smooth camera transition.
    new TWEEN.Tween(camera.position).to({
      x: cameraOffset.x,
      y: cameraOffset.y,
      z: cameraOffset.z }, 90)
    .interpolation(TWEEN.Interpolation.Bezier)
    .easing(TWEEN.Easing.Sinusoidal.InOut).start()

    // Set camera rotation.
    camera.lookAt(cameraTarget)

    // player heading.
    var q = playerMesh.root.quaternion
    // adjustment to calibrate hexagonal "North"
    var pVec = new THREE.Vector3(-1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6)
    pVec.applyQuaternion(q)
    heading = Math.atan2(pVec.z, pVec.x)
    heading *= 180 / Math.PI
    heading = heading > 0 ? heading : heading + 360
    heading = Math.floor(heading % 360)
    heading_el.innerText = heading + ' degree' + (heading == 1 ? '' : 's')

    quadrant = Math.floor(heading / 90) + 1  // range: 1-4
    if (quadrant !== last_dir ||
        cell.x !== last_cell.x || cell.y !== last_cell.y) {
      var t = get_grid_coord(16, true)
      tilemap_update(quadrant, t)
    }

    last_cell = cell
    last_dir  = quadrant

    update_counter++
  }

  function render() {
    renderer.render(scene, camera)
    inset_renderer.render(inset_scene, inset_camera)
  }

  function onWindowResize() {
    WIDTH  = window.innerWidth
    HEIGHT = window.innerHeight
    camera.aspect = WIDTH / HEIGHT
    camera.updateProjectionMatrix()
    renderer.setSize(WIDTH, HEIGHT)
  }

  function onKeyDown(event) {
    switch(event.which || event.keyCode) {

      case 38:  /*up*/
      case 87:  /*W*/
        playerControls.moveForward = true; break

      case 40:  /*down*/
      case 83:  /*S*/
        playerControls.moveBackward = true; break

      case 37:  /*left*/
      case 65:  /*A*/
        playerControls.moveLeft = true; break

      case 39:  /*right*/
      case 68:  /*D*/
        playerControls.moveRight = true; break
    }

    var pc = playerControls
    if (pc.moveForward || pc.moveLeft || pc.moveRight || pc.moveBackward) {
      cameraLookAround = false
    }
  }

  function onKeyUp (event) {
    switch(event.keyCode) {

      case 38: /*up*/
      case 87: /*W*/
               playerControls.moveForward = false; break

      case 40: /*down*/
      case 83: /*S*/
               playerControls.moveBackward = false; break

      case 37: /*left*/
      case 65: /*A*/
               playerControls.moveLeft = false; break

      case 39: /*right*/
      case 68: /*D*/
               playerControls.moveRight = false; break
    }
  }

  function _to_grid(x, y, r) {
    var vec2 = new THREE.Vector2(x, y).multiplyScalar(r)
      , tmp2 = _floor_dot(vec2, XM)
      , hx = Math.floor((tmp2.x + tmp2.y + 2) / 3)
      , tmp3 = _floor_dot(vec2, YM)
      , hy = Math.floor((tmp3.x + tmp3.y + 2) / 3)

    // adjustments to grid axis-alignment -> /_
    // added by joates (09-Oct-2013)
    hy = -hy  /* y-sign flipped */
    if (hy > 0) hx -= hy
    else hx += Math.abs(hy)

    return new THREE.Vector2(hx, hy)
  }

  function _to_hex(hx, hy, r) {
    var gx = hx * (2 * R) + hy * R
      , gy = hy * (S + T)
    return new THREE.Vector2(gx, gy)
  }

  function _floor_dot(v2, v4) {
    var j = Math.floor(v4.x * v2.x + v4.y * v2.y)
      , k = Math.floor(v4.z * v2.x + v4.w * v2.y)
    return new THREE.Vector2(j, k)
  }

  function build_terrain(data, tx, ty) {
    var ts = Math.floor(Math.sqrt(data.length))

    // store a heightmap.
    for (var j=0; j<ts; j++) {
      for (var i=0; i<ts; i++) {
        var ix  = tx * ts + i
          , iy  = ty * ts + j
          , idx =  j * ts + i
        if (hData[ix] === undefined) hData[ix] = []
        hData[ix][iy] = data[idx]
      }
    }

    var g = Hex_Geo(data, el)
      , g = Hex_VBO(g)
      , m = new THREE.MeshPhongMaterial( {
        color: 0xaaaaaa, ambient: 0x332244,
        emissive: 0x004400, specular: 0x101020, shininess: 4,
        side: THREE.FrontSide, vertexColors: THREE.VertexColors })

    if (tx !==0 || ty !== 0) {
      var pos = _to_hex(tx * 2 * ts, ty * 2 * ts)
      g.applyMatrix(new THREE.Matrix4().makeTranslation(pos.x, 0, -pos.y))
    }

    var mesh = new THREE.Mesh(g, m)
    mesh.frustumCulled = false
    mesh.visible = true

    var tile_id = tx.toString() + '_' + ty.toString()
    tile_cache.set(tile_id, mesh)
    //scene_add_tile(tile_id)
    scene.add(mesh)
  }

  function get_grid_coord(s, isTile) {
    var pos = playerMesh.root.position
      , grid = _to_grid(pos.x / el, pos.z / el, R)

    if (isTile !== false)
      return new THREE.Vector2(Math.floor(grid.x / s), Math.floor(grid.y / s))

    return new THREE.Vector2(grid.x, grid.y)
  }

  function refresh_vbo(c) {
    // TODO: deprecated
    /**
    console.log('tile: '+(c.x<0?c.x:' '+c.x)+', '+(c.y<0?c.y:' '+c.y))

    // manage the tile cache.
    for (var sy=c.y+2; sy>=c.y-2; sy--) {
      for (var sx=c.x-2; sx<=c.x+2; sx++) {
        // exclude the 4 outer corner tiles
        if (! (sy==c.y+2 && sx==c.x-2 || sx==c.x+2) ||
            ! (sy==c.y-2 && sx==c.x-2 || sx==c.x+2)) {
          var tile_id = sx.toString() + '_' + sy.toString()

          // outer grid (5x5)
          if (! tile_cache.has(tile_id))
            // pre-fetch a tile that may be needed soon.
            socket.emit('tile', { x:sx, y:sy })

        // inner grid (3x3)
        // fetch tile directly from cache.
        }
        if (sx > c.x-2 && sx < c.x+2 && sy > c.y-2 && sy < c.y+2) {
          scene_add_tile(tile_id)
        }
      }
    }
    */
  }

  function scene_add_tile(tile_id) {
    // TODO: deprecated
    /**
    var tile = tile_cache.get(tile_id)
    if (tile !== undefined) {
      scene.add(tile)
    } else setTimeout(function() {
      scene_add_tile(tile_id)
    }, Math.floor(Math.random() * 10) + 10)
    */
  }

  function high_cell() {
    var min = Infinity
      , max = -Infinity
      , s = []

    for (var y=6; y<=8; y++) {
      for (var x=6; x<=8; x++) {
        var h = hData[x][y]
        s.push(h)
        if (h > 0) {
          min = h < min ? h : min
          max = h > max ? h : max
        }
      }
    }

    if (s[4] === max)       // center cell
      return { x:7, y:7 }
    else if (s[3] === max)  // center left
      return { x:6, y:7 }
    else if (s[5] === max)  // center right
      return { x:8, y:7 }
    else if (s[1] === max)  // lower center
      return { x:7, y:6 }
    else if (s[7] === max)  // upper center
      return { x:7, y:8 }
    else if (s[6] === max)  // NW corner
      return { x:6, y:8 }
    else if (s[8] === max)  // NE corner
      return { x:8, y:8 }
    else if (s[0] === max)  // SW corner
      return { x:6, y:6 }
    else if (s[2] === max)  // SE corner
      return { x:8, y:6 }
  }

  function tilemap_update(q, tile) {
    var tx = tile.x
      , ty = tile.y
      , tids = []

    switch(q) {

      case 1:
        tids.push((tx).toString()  +'_'+(ty+1).toString())
        tids.push((tx+1).toString()+'_'+(ty+1).toString())
        tids.push((tx+1).toString()+'_'+(ty).toString())
        tids.forEach(function(id) {
          if (! tile_cache.has(id) && ! tile_queued(id))
            tile_fetch_queue.push(id)
        })
        break

      case 2:
        tids.push((tx+1).toString()+'_'+(ty).toString())
        tids.push((tx+1).toString()+'_'+(ty-1).toString())
        tids.push((tx).toString()  +'_'+(ty-1).toString())
        tids.forEach(function(id) {
          if (! tile_cache.has(id) && ! tile_queued(id))
            tile_fetch_queue.push(id)
        })
        break

      case 3:
        tids.push((tx).toString()  +'_'+(ty-1).toString())
        tids.push((tx-1).toString()+'_'+(ty-1).toString())
        tids.push((tx-1).toString()+'_'+(ty).toString())
        tids.forEach(function(id) {
          if (! tile_cache.has(id) && ! tile_queued(id))
            tile_fetch_queue.push(id)
        })
        break

      case 4:
        tids.push((tx-1).toString()+'_'+(ty).toString())
        tids.push((tx-1).toString()+'_'+(ty+1).toString())
        tids.push((tx).toString()  +'_'+(ty+1).toString())
        tids.forEach(function(id) {
          if (! tile_cache.has(id) && ! tile_queued(id))
            tile_fetch_queue.push(id)
        })
        break

    }
  }

  function tile_queued(tile_id) {
    return tile_fetch_queue[tile_id] !== undefined
  }

