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

  const WGS84_a = 6378137.0; // 6378137.0
  const WGS84_b = 6356752.314245; // 6356752.314245

  let camera, scene, renderer;
  let nodes = data;
  let controls;

  let meshes = meshCreator();

  init();
  animate();

  console.log(meshes[0]);
  console.log(meshes[1]);







  // TODO: Get a bounding box for array of markers, and zoome the camera to fit in there. 👍
  addMarkersToScene();

  function init() {

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, .01, 10000);

    let avg = getAveragePosition();

    camera.position.x = avg.x;
    camera.position.y = avg.y + 25;
    camera.position.z = avg.z - 25;

    controls = new THREE.OrbitControls(camera);

    controls.target.set(avg.x, avg.y, avg.z);

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    scene.background = new THREE.Color().setHSL( 0.6, 0, 1 );
    scene.fog = new THREE.Fog( scene.background, 1, 5000 );

    let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
    hemiLight.color.setHSL( 0.6, 1, 0.6 );
    hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
    hemiLight.position.set( 0, 50, 0 );
    scene.add( hemiLight );
    let hemiLightHelper = new THREE.HemisphereLightHelper( hemiLight, 10 );
    scene.add( hemiLightHelper );

    let dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    dirLight.color.setHSL( 0.1, 1, 0.95 );
    dirLight.position.set( -1, 1.75, 1 );
    dirLight.position.multiplyScalar( 30 );
    scene.add( dirLight );
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    var d = 50;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 3500;
    dirLight.shadow.bias = -0.0001;
    let dirLightHeper = new THREE.DirectionalLightHelper( dirLight, 10 )
    scene.add( dirLightHeper );


  }

  function animate() {

    requestAnimationFrame(animate);
    controls.update();
    render();
  }

  function render() {
    renderer.render(scene, camera);
  }

  /**
   * Creates a new array of objects with LLA and XYZ information based on DATA in nodes.
   * @returns {Array}
   */
  function meshCreator() {
    let count = nodes.length;
    let meshes = [];

    for (let i = 0; i < count; i++) {
      var obj = {};
      // Create new mesh using createMarker()
      obj.marker = createMarker();

      obj.marker.rotation.y = nodes[i].CameraPitch;
      obj.marker.rotation.z = nodes[i].CameraYaw;

      // call buildCoordiates to return lat, lng, alt.
      obj = {
        ...obj,
        ...buildCoordinates(nodes[i])
      };

      // create xyz coordinates based on lat, lng, alt. (ref = 0?)
      obj = {
        ...obj,
        ...ecef_from_lla(obj.lat, obj.lng, obj.alt, 0, 0, 0)
      };

      meshes.push(obj);
    }

    return meshes;
  }

  /**
   * Creates a new rectangular pyramid mesh.
   * @returns {Raycaster.params.Mesh|{}|*}
   */
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

    let material = new THREE.MeshPhongMaterial({color: 0xccee44});
    material.flatShading = true;


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
   * @returns {{decimalDegree: float}}
   */
  function decimalDegreeConversion(nodeString) {
    // parse nodeString (GPSLat/GPSLng)
    let node = nodeString.split(/[^0-9.A-Z]/g).filter(node => node !== "");

    // convert parsed + split array of strings into decimal degrees.
    let decimalDegree = (Number(node[0]) + (Number(node[1])/60) + (Number(node[2])/3600));

    // account for south of equator, west of 45th parralellelelellellelle
    // switch(node[3]) {
    //   case 'S':
    //   case 'W':
    //     decimalDegree *= -1;
    //     break;
    //
    //   default:
    //     break;
    // }

    return decimalDegree;
  }

  /**
   *
   * @param node
   * @returns {{lat: number, lng: number, alt: number}}
   */
  function buildCoordinates(node) {
    let lat = decimalDegreeConversion(node.GPSLatitude);
    let lng = decimalDegreeConversion(node.GPSLongitude);
    // let alt = Number(node.GPSAltitude.split(' ')[0]);
    let alt = Number(node.RelativeAltitude.replace('+', ''));

    return {
      lat,
      lng,
      alt
    }
  }

  /**
   * Map through meshes array, adding each marker to the scene, and sets position based on coords.
   * @returns void
   */
  function addMarkersToScene() {
    meshes.map(mesh => {
      scene.add(mesh.marker);
      mesh.marker.position.set(mesh.x, mesh.y, mesh.z);
    });
  }

  /**
   * Finds the average center coordinate for each of the meshes for better camera control.
   * @returns {{x: number, y: number, z: number}}
   */
  function getAveragePosition() {
    let x = 0, y = 0, z = 0;

    meshes.map(mesh => {
      x += mesh.x;
      y += mesh.y;
      z += mesh.z;
    });

    x /= meshes.length;
    y /= meshes.length;
    z /= meshes.length;

    return {
      x, y, z
    }
  }
}());