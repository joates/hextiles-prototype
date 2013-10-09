
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
    , cache_opts = { max: 25, dispose: function(key, n) { n.geometry.dispose(); scene.remove(n) } }
    , tile_cache = LRU(cache_opts)  // store most recently visited tiles.

  var R = 80
    , S = 2 * R / Math.sqrt(3)
    , T = S / 2
    , el = 2 * R  /* edge length */
    , XM = new THREE.Vector4(1/(2*R), -1/S,  1/R,     0  )
    , YM = new THREE.Vector4(1/(2*R),  1/S, -1/(2*R), 1/S)

  setTimeout(function() { domready(function() {
    socket = io.connect()

    ss(socket).on('tile', function(stream, pos) {
      //console.log(stream.toString())
      build_terrain(stream, pos.x, pos.y)
    })

    init()
    animate()

    // request some terrain tiles (initial 3x3 grid).
    for (var y=1; y>=-1; y--) {
      for (var x=-1; x<=1; x++) {
        socket.emit('tile', { x:x, y:y })
      }
    }

  })}, 0)

  // scene (3D).

  var scene
    , camera
    , renderer
    , container
    , stats
    , WIDTH
    , HEIGHT
    , clock = new THREE.Clock()
    , cameraTarget = new THREE.Vector3()
    , player
    , playerMesh
    , playerSkin = 11
    , playerOrigin = new THREE.Vector3()
    , playerControls = {
        moveLeft:  false, moveForward:  false, 
        moveRight: false, moveBackward: false }
    , fog = true
    , cell = { x:0, y:0 }
    , last_cell = cell

  function init() {
    WIDTH  = window.innerWidth
    HEIGHT = window.innerHeight

    scene = new THREE.Scene()
    if (fog) scene.fog = new THREE.Fog(0x00090f, 0, 2000, 8000)
    scene.add(player)

    // align to hex edge.
    //scene.applyMatrix(new THREE.Matrix4().makeRotationY(-Math.PI / 6))

    // lights.
    scene.add(new THREE.AmbientLight(0x20202f))
    var light = new THREE.DirectionalLight(0xffffff, 3.5)
    //light.position.set(0, 2, -1).normalize()
    light.position.set(-60, 200, -30)
    scene.add(light)

    // camera.
    camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.1, 10000)
    camera.position.set(-300, 100, -500)
    camera.lookAt(scene.position)

    // renderer.
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(WIDTH, HEIGHT)
    if (fog) renderer.setClearColor(scene.fog.color, 0.8)

    // FPS graph.
    stats = new Stats()
    stats.domElement.style.position = 'absolute'
    stats.domElement.style.top = '0px'
    stats.domElement.style.left = '0px'
    stats.domElement.style.zIndex = '99'
    document.body.appendChild(stats.domElement)

    container = document.createElement('div')
    container.appendChild(renderer.domElement)
    document.body.appendChild(container)

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

      // set initial player position.
      playerMesh.root.position.x = 0
      playerMesh.root.position.y = T * 1.2  /* TODO: not accurate */
      playerMesh.root.position.z = 0
    }

    baseCharacter.loadParts(configOgro)
  }

  function animate() {
    requestAnimationFrame(animate)
    update()
    render()
  }

  function update() {
    var delta = clock.getDelta()
    playerMesh.update(delta)

    cell = get_tile_coord(16)

    if (cell.x !== last_cell.x || cell.y !== last_cell.y)
      refresh_vbo(cell.x, cell.y)

    TWEEN.update()
    stats.update()

    // camera follows our player.
    var matrix = new THREE.Matrix4().copy(playerMesh.root.matrix)
    matrix.setPosition(playerOrigin)
    //var offset = new THREE.Vector3(0, 100, -300).applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 6)
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

    last_cell = cell
  }

  function render() {
    renderer.render(scene, camera)
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
    var g = Hex_Geo(data, el)
      , g = Hex_VBO(g)
      , m = new THREE.MeshPhongMaterial( {
        color: 0xaaaaaa, ambient: 0x332244,
        emissive: 0x004400, specular: 0x101020, shininess: 4,
        side: THREE.FrontSide, vertexColors: THREE.VertexColors })

    if (tx !==0 || ty !== 0) {
      var tSize = Math.sqrt(data.length)
        , pos = _to_hex(tx * 2 * tSize, ty * 2 * tSize)
      g.applyMatrix(new THREE.Matrix4().makeTranslation(pos.x, 0, -pos.y))
    }

    var mesh = new THREE.Mesh(g, m)
    mesh.frustumCulled = false
    mesh.visible = true

    var tile_id = tx.toString() + '_' + ty.toString()
    tile_cache.set(tile_id, mesh)
    scene_add_tile(tile_id)
  }

  function get_tile_coord(s) {
    var pos = playerMesh.root.position
      , grid = _to_grid(pos.x / el, pos.z / el, R)
    return new THREE.Vector2(Math.floor(grid.x / s), Math.floor(grid.y / s))
  }

  function refresh_vbo(cx, cy) {
    console.log('tile: '+(cx<0?cx:' '+cx)+', '+(cy<0?cy:' '+cy))

    // manage the tile cache.
    for (var sy=cy+2; sy>=cy-2; sy--) {
      for (var sx=cx-2; sx<=cx+2; sx++) {
        var tile_id = sx.toString() + '_' + sy.toString()
        // outer grid (5x5)
        if (! tile_cache.has(tile_id))
          // pre-fetch a tile that may be needed soon.
          socket.emit('tile', { x:sx, y:sy })

        // inner grid (3x3)
        // fetch tile directly from cache.
        if (sx > cx-2 && sx < cx+2 &&
            sy > cy-2 && sy < cy+2) scene_add_tile(tile_id)
      }
    }
  }

  function scene_add_tile(tile_id) {
    var tile = tile_cache.get(tile_id)
    if (tile !== undefined) {
      scene.add(tile)
      //console.log('added: %s', tile_id, tile)
    } else setTimeout(function() {
      scene_add_tile(tile_id)
    }, 10)
  }

