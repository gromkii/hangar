/*
  NOTES

  DD = d + (min/60) + (sec/3600)
  [^0-9.A-Z]
  string.split(/[^0-9.A-Z]/g).filter(node => node !== "");
  yaw = z, pitch = y, row = x

  LLA -> ECEF
*/

(function() {
  'use strict';

  const WGS84_a = 6.3781370; // 6378137.0
  const WGS84_b = 6.356752314245; // 6356752.314245



  let camera, scene, renderer;
  let nodes = data;
  let controls;

  let marker = createMarker();
  let marker2 = createMarker();

  init();
  animate();

  let meshes = meshCreator();

  addMarkersToScene();

  function init() {

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10000 );
    camera.position.z = 5;

    controls = new THREE.OrbitControls(camera);

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

  }

  function animate() {

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  function meshCreator() {
    let count = nodes.length;
    let meshes = [];

    for (let i = 0; i < count; i++) {
      var obj = {};
      // Create new mesh using createMarker()
      obj.marker = createMarker();

      // call buildCoordiates to return lat, lng, alt.
      obj = {
        ...obj,
        ...buildCoordinates(nodes[i])
      };

      // create xyz coordinates based on lat, lng, alt. (ref = 0?)
      obj = {
        ...obj,
        ...topocentric_from_lla(obj.lat, obj.lng, obj.alt, 0, 0, 0)
      };
      meshes.push(obj);
    }

    return meshes;
  }

  function createMarker() {
    let geometry = new THREE.Geometry();

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

    let material = new THREE.MeshPhongMaterial({color: 0xffffff});
    material.wireframe = true;


    return new THREE.Mesh( geometry, material );
  }

  function ecef_from_lla(lat, lon, alt) {

    let a2 = Math.pow(WGS84_a, 2);
    let b2 = Math.pow(WGS84_b, 2);
    let lat1 = degreeToRadian(lat);
    let lon1 = degreeToRadian(lon);
    let L = 1.0 / Math.sqrt(a2 * Math.pow(Math.cos(lat1), 2) + b2 * Math.pow(Math.sin(lat1), 2))
    let x = (a2 * L + alt) * Math.cos(lat1) * Math.cos(lon1);
    let y = (a2 * L + alt) * Math.cos(lat1) * Math.sin(lon1);
    let z = (b2 * L + alt) * Math.sin(lat1);
    return {
      x: x,
      y: y,
      z: z
    };

  }

  function ecef_from_topocentric_transform(lat, lon, alt) {

    let xyz = ecef_from_lla(lat, lon, alt);
    let sa = Math.sin(degreeToRadian(lat));
    let ca = Math.cos(degreeToRadian(lat));
    let so = Math.sin(degreeToRadian(lon));
    let co = Math.cos(degreeToRadian(lon));

    return [- so, - sa * co, ca * co, xyz.x,
      co, - sa * so, ca * so, xyz.y,
      0,        ca,      sa, xyz.z,
      0,         0,       0, 1];
  }

  function topocentric_from_lla(lat, lon, alt, reflat, reflon, refalt) {

    let matrix = new Array(16);
    mat4.invert(matrix, ecef_from_topocentric_transform(reflat, reflon, refalt));

    let xyz = ecef_from_lla(lat, lon, alt);
    let tx = matrix[0] * xyz.x + matrix[1] * xyz.y + matrix[2] *  xyz.z + matrix[3];
    let ty = matrix[4] * xyz.x + matrix[5] * xyz.y + matrix[6] *  xyz.z + matrix[7];
    let tz = matrix[8] * xyz.x + matrix[9] * xyz.y + matrix[10] * xyz.z + matrix[11];
    return {
      x: tx,
      y: ty,
      z: tz
    };
  }

  function degreeToRadian(degree) {
    return glMatrix.toRadian(degree);
  }

  /**
   * Parse EXIF metadata into decimal degree format.
   * @param nodeString - GPSLatitude/GPSLongitude
   * @returns {decimalDegree: float}
   */
  function decimalDegreeConversion(nodeString) {
    let node = nodeString.split(/[^0-9.A-Z]/g).filter(node => node !== "");
    let decimalDegree = (Number(node[0]) + (Number(node[1])/60) + (Number(node[2])/3600));

    switch(node[3]) {
      case 'S':
      case 'W':
        decimalDegree *= -1;
        break;

      default:
        break;
    }

    return decimalDegree;
  }

  /**
   *
   * @param node
   * @returns {{lat: float, lng: float, alt: number}}
   */
  function buildCoordinates(node) {
    let lat = decimalDegreeConversion(node.GPSLatitude);
    let lng = decimalDegreeConversion(node.GPSLongitude);
    let alt = Number(node.GPSAltitude.split(' ')[0]);

    return {
      lat,
      lng,
      alt
    }
  }

  function addMarkersToScene() {
    meshes.map(mesh => {
      scene.add(mesh.marker);
      mesh.marker.position.set(mesh.x, mesh.y, mesh.z);
    });
  }
}());