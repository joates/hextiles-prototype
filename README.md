## hextiles-prototype (0.0.3-dev)

*Screenshot:*

![Screenshot](https://raw.github.com/joates/hextiles-prototype/master/img/screenshot.png)

You will need to pre-install the [three.js](http://threejs.org) library (r60 or better) and symlink it into the ```public``` folder so that the demo can find the files that it needs (see [index.html](public/index.html)).

* this is a single-player demo
* developer preview: _it's a place for me to play with new ideas_

### Getting started..

* get [node.js](http://nodejs.org)
* ```npm install hextiles-prototype```
* ```cd hextiles-prototype```
* type ```npm install``` to download dependency modules, _you only need to do this once_
* type ```npm start``` to start the server running
* visit ```http://localhost:8000``` in your browser to start the demo

**Use WASD or cursor keys to move around**

* Best performance on Chrome (solid 60FPS)
* Firefox peformance is poor (only ~20FPS)
* Safari is un-tested

May or may not work on iPads (i haven't tried it)

Probably won't work on other mobile devices (requires a WebGL renderer)

_Collisions are not implemented.. you can run on the water_
