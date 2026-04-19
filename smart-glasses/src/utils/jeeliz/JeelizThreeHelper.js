/*
  Helper for Three.js — modernized for Three.js r152+
  Adapted from the original Jeeliz helper to work with ES modules
  and modern Three.js APIs.
  
  VIDEO RENDERING STRATEGY:
  Instead of injecting the Jeeliz GL video texture into Three.js's internal
  texture system (which breaks across Three.js versions), we draw the video
  background as a raw WebGL fullscreen quad BEFORE Three.js renders the 3D scene.
  Three.js renders with alpha:true so the 3D objects composite on top.
*/
import * as THREE from 'three';
import JEELIZFACEFILTER from './jeelizFaceFilter.js';

const JeelizThreeHelper = (function () {
  // internal settings:
  const _settings = {
    rotationOffsetX: 0.0,
    pivotOffsetYZ: [0.2, 0.6],
    detectionThreshold: 0.8,
    detectionHysteresis: 0.02,
    cameraMinVideoDimFov: 35
  };

  // private vars:
  let _threeRenderer = null,
    _threeScene = null,
    _threeTranslation = null;

  let _maxFaces = -1,
    _isMultiFaces = false,
    _detectCallback = null,
    _isSeparateThreeCanvas = false,
    _faceFilterCv = null,
    _videoElement = null,
    _isDetected = false,
    _scaleW = 1,
    _canvasAspectRatio = -1;

  const _threeCompositeObjects = [];

  let _gl = null,
    _glVideoTexture = null;

  let _videoTransformMat2 = null;

  // Raw GL video rendering vars:
  let _glShpVideo = null,
    _glShpVideoMatUniformPointer = null,
    _glVertexBuffer = null,
    _glIndexBuffer = null;


  // private funcs:
  function destroy() {
    _threeCompositeObjects.splice(0);
    if (_glShpVideo && _gl) {
      _gl.deleteProgram(_glShpVideo);
      _glShpVideo = null;
    }
    if (_glVertexBuffer && _gl) {
      _gl.deleteBuffer(_glVertexBuffer);
      _glVertexBuffer = null;
    }
    if (_glIndexBuffer && _gl) {
      _gl.deleteBuffer(_glIndexBuffer);
      _glIndexBuffer = null;
    }
  }


  function create_threeCompositeObjects() {
    for (let i = 0; i < _maxFaces; ++i) {
      const threeCompositeObject = new THREE.Object3D();
      threeCompositeObject.frustumCulled = false;
      threeCompositeObject.visible = false;
      _threeCompositeObjects.push(threeCompositeObject);
      _threeScene.add(threeCompositeObject);
    }
  }


  function compile_shader(source, type, typeString) {
    const glShader = _gl.createShader(type);
    _gl.shaderSource(glShader, source);
    _gl.compileShader(glShader);
    if (!_gl.getShaderParameter(glShader, _gl.COMPILE_STATUS)) {
      console.error("ERROR IN " + typeString + " SHADER: " + _gl.getShaderInfoLog(glShader));
      return null;
    }
    return glShader;
  }


  function create_videoScreen() {
    const videoScreenVertexShaderSource = `
      attribute vec2 position;
      uniform mat2 videoTransformMat2;
      varying vec2 vUV;
      void main(void){
        gl_Position = vec4(position, 0., 1.);
        vUV = 0.5 + videoTransformMat2 * position;
      }`;
    const videoScreenFragmentShaderSource = `
      precision lowp float;
      uniform sampler2D samplerVideo;
      varying vec2 vUV;
      void main(void){
        gl_FragColor = texture2D(samplerVideo, vUV);
      }`;

    // Compile shader program for raw GL video rendering
    const glShaderVertex = compile_shader(videoScreenVertexShaderSource, _gl.VERTEX_SHADER, 'VERTEX');
    const glShaderFragment = compile_shader(videoScreenFragmentShaderSource, _gl.FRAGMENT_SHADER, 'FRAGMENT');

    _glShpVideo = _gl.createProgram();
    _gl.attachShader(_glShpVideo, glShaderVertex);
    _gl.attachShader(_glShpVideo, glShaderFragment);

    // Bind attribute location before linking
    _gl.bindAttribLocation(_glShpVideo, 0, 'position');

    _gl.linkProgram(_glShpVideo);

    if (!_gl.getProgramParameter(_glShpVideo, _gl.LINK_STATUS)) {
      console.error('Video shader link error:', _gl.getProgramInfoLog(_glShpVideo));
      return;
    }

    const samplerVideo = _gl.getUniformLocation(_glShpVideo, 'samplerVideo');
    _glShpVideoMatUniformPointer = _gl.getUniformLocation(_glShpVideo, 'videoTransformMat2');

    // Set sampler to texture unit 0
    _gl.useProgram(_glShpVideo);
    _gl.uniform1i(samplerVideo, 0);

    // Create vertex buffer for fullscreen quad
    _glVertexBuffer = _gl.createBuffer();
    _gl.bindBuffer(_gl.ARRAY_BUFFER, _glVertexBuffer);
    _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), _gl.STATIC_DRAW);

    // Create index buffer
    _glIndexBuffer = _gl.createBuffer();
    _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _glIndexBuffer);
    _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), _gl.STATIC_DRAW);

    console.log('INFO: Video screen shader compiled and linked successfully');
  } //end create_videoScreen()


  function draw_video() {
    if (!_glShpVideo || !_glVideoTexture) return;

    // Save GL state that Three.js might care about
    _gl.useProgram(_glShpVideo);

    // Disable depth for background
    _gl.disable(_gl.DEPTH_TEST);
    _gl.depthMask(false);

    // Bind video texture
    _gl.activeTexture(_gl.TEXTURE0);
    _gl.bindTexture(_gl.TEXTURE_2D, _glVideoTexture);

    // Set transform matrix
    _gl.uniformMatrix2fv(_glShpVideoMatUniformPointer, false, _videoTransformMat2);

    // Bind geometry
    _gl.bindBuffer(_gl.ARRAY_BUFFER, _glVertexBuffer);
    _gl.enableVertexAttribArray(0);
    _gl.vertexAttribPointer(0, 2, _gl.FLOAT, false, 0, 0);

    _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _glIndexBuffer);

    // Draw the fullscreen quad
    _gl.drawElements(_gl.TRIANGLES, 6, _gl.UNSIGNED_SHORT, 0);

    // Re-enable depth for Three.js scene
    _gl.enable(_gl.DEPTH_TEST);
    _gl.depthMask(true);
  }


  function detect(detectState) {
    _threeCompositeObjects.forEach(function (threeCompositeObject, i) {
      _isDetected = threeCompositeObject.visible;
      const ds = detectState[i];
      if (_isDetected && ds.detected < _settings.detectionThreshold - _settings.detectionHysteresis) {
        // DETECTION LOST
        if (_detectCallback) _detectCallback(i, false);
        threeCompositeObject.visible = false;
      } else if (!_isDetected && ds.detected > _settings.detectionThreshold + _settings.detectionHysteresis) {
        // FACE DETECTED
        if (_detectCallback) _detectCallback(i, true);
        threeCompositeObject.visible = true;
      }
    });
  }


  function update_poses(ds, threeCamera) {
    const halfTanFOVX = Math.tan(threeCamera.aspect * threeCamera.fov * Math.PI / 360);

    _threeCompositeObjects.forEach(function (threeCompositeObject, i) {
      if (!threeCompositeObject.visible) return;
      const detectState = ds[i];

      const cz = Math.cos(detectState.rz), sz = Math.sin(detectState.rz);

      // relative width of the detection window:
      const W = detectState.s * _scaleW;

      // distance between the front face of the cube and the camera:
      const DFront = 1 / (2 * W * halfTanFOVX);

      // D is the distance between the center of the unit cube and the camera:
      const D = DFront + 0.5;

      // coords in 2D of the center of the detection window in the viewport:
      const xv = detectState.x * _scaleW;
      const yv = detectState.y * _scaleW;

      // coords in 3D of the center of the cube (in the view coordinates system):
      const z = -D;
      const x = xv * D * halfTanFOVX;
      const y = yv * D * halfTanFOVX / _canvasAspectRatio;

      // set position before pivot:
      threeCompositeObject.position.set(-sz * _settings.pivotOffsetYZ[0], -cz * _settings.pivotOffsetYZ[0], -_settings.pivotOffsetYZ[1]);

      // set rotation and apply it to position:
      threeCompositeObject.rotation.set(detectState.rx + _settings.rotationOffsetX, detectState.ry, detectState.rz, "ZYX");
      threeCompositeObject.position.applyEuler(threeCompositeObject.rotation);

      // add translation part:
      _threeTranslation.set(x, y + _settings.pivotOffsetYZ[0], z + _settings.pivotOffsetYZ[1]);
      threeCompositeObject.position.add(_threeTranslation);
    });
  }


  //public methods:
  const that = {
    init: function (spec, detectCallback) {
      destroy();

      _maxFaces = spec.maxFacesDetected;
      _glVideoTexture = spec.videoTexture;
      _videoTransformMat2 = spec.videoTransformMat2;
      _gl = spec.GL;
      _faceFilterCv = spec.canvasElement;
      _isMultiFaces = (_maxFaces > 1);
      _videoElement = spec.videoElement;

      // enable 2 canvas mode if necessary:
      let threeCanvas = null;
      if (spec.threeCanvasId) {
        _isSeparateThreeCanvas = true;
        threeCanvas = document.getElementById(spec.threeCanvasId);
        threeCanvas.setAttribute('width', _faceFilterCv.width);
        threeCanvas.setAttribute('height', _faceFilterCv.height);
      } else {
        threeCanvas = _faceFilterCv;
      }

      if (typeof (detectCallback) !== 'undefined') {
        _detectCallback = detectCallback;
      }

      // init THREE.JS context — share the same GL context
      // alpha: true so Three.js clears to transparent, letting the video show through
      _threeRenderer = new THREE.WebGLRenderer({
        context: (_isSeparateThreeCanvas) ? null : _gl,
        canvas: threeCanvas,
        alpha: true,
        preserveDrawingBuffer: true
      });

      // Make Three.js clear to transparent so video background shows through
      _threeRenderer.setClearColor(0x000000, 0);
      _threeRenderer.autoClear = false;

      _threeScene = new THREE.Scene();
      _threeTranslation = new THREE.Vector3();

      create_threeCompositeObjects();
      create_videoScreen();

      // handle device orientation change:
      window.addEventListener('orientationchange', function () {
        setTimeout(JEELIZFACEFILTER.resize, 1000);
      }, false);

      const returnedDict = {
        videoMesh: null, // no longer using a Three.js video mesh
        renderer: _threeRenderer,
        scene: _threeScene
      };
      if (_isMultiFaces) {
        returnedDict.faceObjects = _threeCompositeObjects;
      } else {
        returnedDict.faceObject = _threeCompositeObjects[0];
      }
      return returnedDict;
    },


    detect: function (detectState) {
      const ds = (_isMultiFaces) ? detectState : [detectState];
      detect(ds);
    },


    get_isDetected: function () {
      return _isDetected;
    },


    render: function (detectState, threeCamera) {
      if (!threeCamera) return; // guard against null camera during init

      const ds = (_isMultiFaces) ? detectState : [detectState];

      // update detection states then poses:
      detect(ds);
      update_poses(ds, threeCamera);

      // Reset Three.js state since Jeeliz has been using the GL context
      _threeRenderer.state.reset();

      // Step 1: Draw video background using raw GL
      _gl.viewport(0, 0, _faceFilterCv.width, _faceFilterCv.height);
      draw_video();

      // Step 2: Reset Three.js state again after our raw GL calls
      _threeRenderer.state.reset();

      // Step 3: Render Three.js scene (3D glasses) on top with transparent background
      _threeRenderer.clear(false, true, true); // clear only depth and stencil, not color
      _threeRenderer.render(_threeScene, threeCamera);
    },


    sortFaces: function (bufferGeometry, axis, isInv) {
      const axisOffset = { X: 0, Y: 1, Z: 2 }[axis.toUpperCase()];
      const sortWay = (isInv) ? -1 : 1;

      const nFaces = bufferGeometry.index.count / 3;
      const faces = new Array(nFaces);
      for (let i = 0; i < nFaces; ++i) {
        faces[i] = [bufferGeometry.index.array[3 * i], bufferGeometry.index.array[3 * i + 1], bufferGeometry.index.array[3 * i + 2]];
      }

      const aPos = bufferGeometry.attributes.position.array;
      const centroids = faces.map(function (face) {
        return [
          (aPos[3 * face[0]] + aPos[3 * face[1]] + aPos[3 * face[2]]) / 3,
          (aPos[3 * face[0] + 1] + aPos[3 * face[1] + 1] + aPos[3 * face[2] + 1]) / 3,
          (aPos[3 * face[0] + 2] + aPos[3 * face[1] + 2] + aPos[3 * face[2] + 2]) / 3,
          face
        ];
      });

      centroids.sort(function (ca, cb) {
        return (ca[axisOffset] - cb[axisOffset]) * sortWay;
      });

      centroids.forEach(function (centroid, centroidIndex) {
        const face = centroid[3];
        bufferGeometry.index.array[3 * centroidIndex] = face[0];
        bufferGeometry.index.array[3 * centroidIndex + 1] = face[1];
        bufferGeometry.index.array[3 * centroidIndex + 2] = face[2];
      });
    },


    get_threeVideoTexture: function () {
      return null; // no longer using Three.js video texture
    },


    apply_videoTexture: function (threeMesh) {
      // No-op: video is now drawn via raw GL, no Three.js texture injection needed
    },


    // create an occluder:
    create_threejsOccluder: function (occluderURL, callback) {
      const occluderMesh = new THREE.Mesh();
      new THREE.BufferGeometryLoader().load(occluderURL, function (occluderGeometry) {
        const mat = new THREE.ShaderMaterial({
          vertexShader: THREE.ShaderLib.basic.vertexShader,
          fragmentShader: "precision lowp float;\n void main(void){\n gl_FragColor=vec4(1.,0.,0.,1.);\n }",
          uniforms: THREE.ShaderLib.basic.uniforms,
          colorWrite: false
        });

        occluderMesh.renderOrder = -1;
        occluderMesh.material = mat;
        occluderMesh.geometry = occluderGeometry;
        if (typeof (callback) !== 'undefined' && callback) callback(occluderMesh);
      });
      return occluderMesh;
    },


    set_pivotOffsetYZ: function (pivotOffset) {
      _settings.pivotOffsetYZ = pivotOffset;
    },


    create_camera: function (zNear, zFar) {
      const threeCamera = new THREE.PerspectiveCamera(1, 1, (zNear) ? zNear : 0.1, (zFar) ? zFar : 100);
      that.update_camera(threeCamera);
      return threeCamera;
    },


    update_camera: function (threeCamera) {
      if (!_threeRenderer) {
        return;
      }

      // compute aspectRatio:
      const canvasElement = _threeRenderer.domElement;
      const cvw = canvasElement.width;
      const cvh = canvasElement.height;
      _canvasAspectRatio = cvw / cvh;

      // compute vertical field of view:
      const vw = _videoElement.videoWidth;
      const vh = _videoElement.videoHeight;
      const videoAspectRatio = vw / vh;
      const fovFactor = (vh > vw) ? (1.0 / videoAspectRatio) : 1.0;
      const fov = _settings.cameraMinVideoDimFov * fovFactor;
      console.log('INFO in JeelizThreeHelper - update_camera(): Estimated vertical video FoV is', fov);

      // compute X and Y offsets in pixels:
      let scale = 1.0;
      if (_canvasAspectRatio > videoAspectRatio) {
        scale = cvw / vw;
      } else {
        scale = cvh / vh;
      }
      const cvws = vw * scale, cvhs = vh * scale;
      const offsetX = (cvws - cvw) / 2.0;
      const offsetY = (cvhs - cvh) / 2.0;
      _scaleW = cvw / cvws;

      // apply parameters:
      threeCamera.aspect = _canvasAspectRatio;
      threeCamera.fov = fov;
      console.log('INFO in JeelizThreeHelper.update_camera(): camera vertical estimated FoV is', fov, 'deg');
      threeCamera.setViewOffset(cvws, cvhs, offsetX, offsetY, cvw, cvh);
      threeCamera.updateProjectionMatrix();

      // update drawing area:
      _threeRenderer.setSize(cvw, cvh, false);
      _threeRenderer.setViewport(0, 0, cvw, cvh);
    },


    resize: function (w, h, threeCamera) {
      _threeRenderer.domElement.width = w;
      _threeRenderer.domElement.height = h;
      JEELIZFACEFILTER.resize();
      if (threeCamera) {
        that.update_camera(threeCamera);
      }
    }
  };
  return that;
})();

export default JeelizThreeHelper;
