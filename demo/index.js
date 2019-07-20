var webglExists = (function () { try { var canvas = document.createElement('canvas'); return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')); } catch (e) { return false; } })(); // jscs:ignore

if (!webglExists) {
    alert('Your browser does not appear to support WebGL. You can try viewing this page anyway, but it may be slow and some things may not look as intended. Please try viewing on desktop Firefox or Chrome.');
}

if (/&?webgl=0\b/g.test(location.hash)) {
    webglExists = !confirm('Are you sure you want to disable WebGL on this page?');
    if (webglExists) {
        location.hash = '#';
    }
}

// Workaround: in Chrome, if a page is opened with window.open(),
// window.innerWidth and window.innerHeight will be zero.
if (window.innerWidth === 0) {
    window.innerWidth = parent.innerWidth;
    window.innerHeight = parent.innerHeight;
}

var camera, scene, renderer, clock, terrainScene, decoScene, lastOptions, controls = {}, skyDome, skyLight, sand, water; // jscs:ignore requireLineBreakAfterVariableAssignment
var INV_MAX_FPS = 1 / 100,
    frameDelta = 0,
    paused = true,
    mouseX = 0,
    mouseY = 0,
    useFPS = false;

function animate() {
    draw();

    frameDelta += clock.getDelta();
    while (frameDelta >= INV_MAX_FPS) {
        update(INV_MAX_FPS);
        frameDelta -= INV_MAX_FPS;
    }

    requestAnimationFrame(animate);
}

function startAnimating() {
    if (paused) {
        paused = false;
        controls.freeze = false;
        clock.start();
        requestAnimationFrame(animate);
    }
}

function stopAnimating() {
    paused = true;
    controls.freeze = true;
    clock.stop();
}

function setup() {
    setupThreeJS();
    setupWorld();
    setupTerrain();
    startAnimating();
}

function setupThreeJS() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x868293, 0.0007);

    renderer = webglExists ? new THREE.WebGLRenderer({ antialias: true }) : new THREE.CanvasRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('tabindex', -1);

    camera = new THREE.PerspectiveCamera(60, renderer.domElement.width / renderer.domElement.height, 1, 10000);
    scene.add(camera);
    camera.position.x = 449;
    camera.position.y = 311;
    camera.position.z = 376;
    camera.rotation.x = -52 * Math.PI / 180;
    camera.rotation.y = 35 * Math.PI / 180;
    camera.rotation.z = 37 * Math.PI / 180;

    clock = new THREE.Clock(false);
}

function setupWorld() {
    water = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(16384 + 1024, 16384 + 1024, 16, 16),
        new THREE.MeshLambertMaterial({ color: 0x006ba0, transparent: true, opacity: 0.6 })
    );
    water.position.y = -99;
    water.rotation.x = -0.5 * Math.PI;
    scene.add(water);

    skyLight = new THREE.DirectionalLight(0xe8bdb0, 1.5);
    skyLight.position.set(2950, 2625, -160); // Sun on the sky texture
    scene.add(skyLight);
    var light = new THREE.DirectionalLight(0xc3eaff, 0.75);
    light.position.set(-1, -0.5, -1);
    scene.add(light);
}

function after(vertices, options) {
    THREE.Terrain.Edges(
        vertices,
        options,
        false,
        50,
        THREE.Terrain.EaseIn
    );
}

function setupTerrain() {
    var loader = new THREE.TextureLoader();
    loader.load('demo/img/sand1.jpg', function (t1) {
        t1.wrapS = t1.wrapT = THREE.RepeatWrapping;
        sand = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(16384 + 1024, 16384 + 1024, 64, 64),
            new THREE.MeshLambertMaterial({ map: t1 })
        );
        loader.load('demo/img/grass1.jpg', function (t2) {
            loader.load('demo/img/stone1.jpg', function (t3) {
                loader.load('demo/img/snow1.jpg', function (t4) {
                    // t2.repeat.x = t2.repeat.y = 2;
                    blend = THREE.Terrain.generateBlendedMaterial([
                        { texture: t1 },
                        { texture: t2, levels: [-80, -35, 20, 50] },
                        { texture: t3, levels: [20, 50, 60, 85] },
                        { texture: t4, glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)' },
                        { texture: t3, glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2' }, // between 27 and 45 degrees
                    ]);
                    var s = 511;
                    var o = {
                        after: after,
                        easing: THREE.Terrain.Linear,
                        heightmap: customInfluences,
                        material: blend,
                        maxHeight: 100,
                        minHeight: -20,
                        steps: 1,
                        stretch: true,
                        turbulent: false,
                        useBufferGeometry: false,
                        xSize: 1024,
                        ySize: 1024,
                        xSegments: s,
                        ySegments: s,
                    };
                    terrainScene = THREE.Terrain(o);
                    scene.add(terrainScene);
                });
            });
        });
    });
    // skyDome.visible = sand.visible = water.visible = true;
};

window.addEventListener('resize', function () {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = renderer.domElement.width / renderer.domElement.height;
    camera.updateProjectionMatrix();
    fpsCamera.aspect = renderer.domElement.width / renderer.domElement.height;
    fpsCamera.updateProjectionMatrix();
    draw();
}, false);

function draw() {
    renderer.render(scene, camera);
}

function update(delta) {
    if (terrainScene) terrainScene.rotation.z = Date.now() * 0.0001;
}

document.addEventListener('mousemove', function (event) {
    if (!paused) {
        mouseX = event.pageX;
        mouseY = event.pageY;
    }
}, false);

function customInfluences(g, options) {
    var clonedOptions = {};
    for (var opt in options) {
        if (options.hasOwnProperty(opt)) {
            clonedOptions[opt] = options[opt];
        }
    }
    clonedOptions.maxHeight = options.maxHeight * 0.67;
    clonedOptions.minHeight = options.minHeight * 0.67;
    THREE.Terrain.DiamondSquare(g, clonedOptions);

    var radius = Math.min(options.xSize, options.ySize) * 0.4;
    THREE.Terrain.Influence(
        g, options,
        THREE.Terrain.Influences.Flat,
        0.5, 0.5,
        radius, 0,
        THREE.NormalBlending,
        THREE.Terrain.EaseInOut
    );

}
