## hextiles-prototype (0.0.3-dev)

*Screenshot:*

![Screenshot](https://raw.github.com/joates/hextiles-prototype/master/img/screenshot.png)

You will need to pre-install the [three.js](http://threejs.org) library (r60 or better) and symlink it into the ```public``` folder so that the demo can find the files that it needs (see [index.html](public/index.html)).

* this is a single-player demo
* developer preview: _it's a place for me to play with new ideas_

**Use WASD or cursor keys to move around**

_Collisions are not implemented.. you can run on the water_

* Best performance on Chrome (solid 60FPS)
* Firefox peformance is poor (only ~20FPS)
* Safari is un-tested
* May or may not work on iPads (i haven't tried it)
* Probably won't work on other mobile devices (requires a WebGL renderer)
* just **use Chrome/Chromium**


### Getting started..

* get [node.js](http://nodejs.org)
* ```npm install hextiles-prototype```
* ```cd hextiles-prototype```
* type ```npm install``` to download dependency modules, _you only need to do this once_
* type ```npm start``` to start the server running
* visit ```http://localhost:8000``` in your browser to start the demo


### What is good about this demo..

* the tile generation code uses [simplex-noise](http://npmjs.org/package/simplex-noise), and a single blur pass, which is fast and produces _varied and tileable heightmaps_
* the tile data is streamed as a buffer onto the client
* javascript everywhere (the code is not too hard to understand)
* three.js is a great 3D scene rendering library
* all hextile geometries are VBO (Vertex Buffer Objects), they run directly on the GPU
* the lighting looks great (its Phong shaded, but without the specular highlights)
* camera follows the player (also camera position is smoothed as player turns)
* the 4 major compass points assist/force the player into alignment when they are within 5 degrees either side of N, S, W or E. (it came to me at the end of a 20-hour hacking session, only took a few minutes to implement & i didn't plan it at all, just coded it, ran a test and it worked really well)


### What could be improved..

* the terrain could be "smoothed out" or made more interesting by adding vertex-shader and fragment-shader code. (the hexagonal grid is really just the skeletal component of the landscape, it can be enhanced and look much more realistic with some development)
* code could be _a lot_ cleaner, ~550 LoC in the client.js file (this could probably be reduced to <300 LoC with some re-factoring)
* sound/audio, there isn't any!


MIT License included where applicable.
