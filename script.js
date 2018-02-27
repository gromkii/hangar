(function() {
  'use strict';

  var camera, scene, renderer;
  var geometry, material, mesh;
  var nodes = data;
  var meshses = [];



  init();
  animate();
  logger();

  function init() {

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
    camera.position.z = 5;

    scene = new THREE.Scene();

    var geometry = new THREE.Geometry();

    geometry.vertices = [
      new THREE.Vector3( 0, 0, 0 ),
      new THREE.Vector3( 0, 1, 0 ),
      new THREE.Vector3( 1, 1, 0 ),
      new THREE.Vector3( 1, 0, 0 ),
      new THREE.Vector3( 0.5, 0.5, 1 )
    ];

    geometry.faces = [
      new THREE.Face3( 0, 1, 2 ),
      new THREE.Face3( 0, 2, 3 ),
      new THREE.Face3( 1, 0, 4 ),
      new THREE.Face3( 2, 1, 4 ),
      new THREE.Face3( 3, 2, 4 ),
      new THREE.Face3( 0, 3, 4 )
    ];

    material = new THREE.MeshNormalMaterial();

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

  }

  function animate() {

    requestAnimationFrame( animate );
    renderer.render( scene, camera );

    mesh.rotation.x += 0.01;
    mesh.rotation.z += 0.01;
    mesh.rotation.y += 0.01;

  }

  function meshCreator() {

  }
}());