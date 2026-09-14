/*
    Standalone 3D force graph application rendered inside a WebView.
    Bundled by esbuild into src/components/generated/force-graph-html.js.
    Communicates with the React Native host via postMessage / onMessage.
*/

import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';


const COLORS = {
    background: 'rgb(38, 0, 68)',
    dream: 'rgb(220, 7, 167)',
    dimdream: 'rgba(220, 7, 167, 0.3)',
    tag: 'rgb(194, 247, 255)',
    dimtag: 'rgba(4, 200, 230, 0.3)',
    link: 'rgba(197, 197, 217, 0.15)',
    linkHighlight: 'rgba(220, 7, 167, 0.6)',
};

let graph = null;
let activeTag;
let activeNodeId;
let activeNodeTags = [];

function makeLabel(text, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 48;
    ctx.font = `${fontSize}px sans-serif`;
    const width = ctx.measureText(text).width;
    canvas.width = width + 16;
    canvas.height = fontSize + 16;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    return canvas;
}


// event handler for clicks on a node.  We reposition the camera to look at
// the clicked node and zoom
function handleNodeClick(node) {
        let distance;
        if (node.type === 'tag') {
            distance = 300;
            activeTag = node.name;
            activeNodeId = null;
            activeNodeTags = [];
        } else {
            activeTag = null;
            activeNodeId = node.id;
            activeNodeTags = node.tags.map((tag) => tag.tag);
            distance = 100;
        }
        // re-trigger the color function
        graph.nodeColor(graph.nodeColor());
        // https://github.com/vasturiano/3d-force-graph#render-control
        // center the camera on the node when clicked
        animating = true;
        graph.cameraPosition(
            { x: node.x, y: node.y, z: node.z + distance },
            { x: node.x, y: node.y, z: node.z },
            1000
        );
        const lookAt = { x: node.x, y: node.y, z: node.z };
        setTimeout(() => {
            graph.controls().target.set(lookAt.x, lookAt.y, lookAt.z);
            graph.controls().update();
            animating = false;
            gyroX = 0;
            gyroY = 0;
        }, 1050);
    // pass a message back to the react app so it can display a pop-over with
    // the transcript and a link to the detail page
    window.ReactNativeWebView?.postMessage(JSON.stringify({
        type: 'nodeClick',
        payload: { id: node.id, name: node.name, type: node.type, dreamId: node.dreamId, transcript: node.transcript, tags: node.tags }
    }));
}

function handleBackgroundClick() {
    activeTag = null;
    activeNodeId = null;
    activeNodeTags = [];
    graph.nodeColor(graph.nodeColor());
    window.ReactNativeWebView?.postMessage(JSON.stringify({
        type: 'backgroundClick'
    }));
}

// use the ForceGraph3D library to render a 3d graph of our dreams.
function renderGraph(graphData) {
    const el = document.getElementById('graph');

    if (!graph) {
        graph = ForceGraph3D()(el)
            .backgroundColor('rgba(0,0,0,0)')
            .showNavInfo(false)
            .nodeRelSize(5)
            .nodeVal(node => node.type === 'tag' ? 4 : 1)
            .nodeLabel(() => '')
            .nodeColor(node => {
                if (activeTag) {
                    if (node.type === 'tag') {
                        if (node.name !== activeTag) {
                            return COLORS.dimtag;
                        }
                    } else {
                        if (!node.tags?.some(tag => tag.tag === activeTag)) {
                            return COLORS.dimdream;
                        }
                    }
                    return node.type === 'tag' ? COLORS.tag : COLORS.dream;
                } else if (activeNodeId) {
                    if (node.type === 'dream') {
                        if (node.id != activeNodeId) {
                            return COLORS.dimdream;
                        }
                    } else {
                        if (!activeNodeTags.includes(node.name)) {
                            return COLORS.dimtag;
                        }
                    }
                }
                return node.type === 'tag' ? COLORS.tag : COLORS.dream;
            })
            .nodeOpacity(0.9)
            .nodeThreeObjectExtend(true)
            .nodeThreeObject(node => {
                const sprite = new THREE.Sprite(
                    new THREE.SpriteMaterial({
                        map: new THREE.CanvasTexture(
                            makeLabel(node.name, node.type === 'tag' ? COLORS.tag : '#fafafa')
                        ),
                        transparent: true,
                    })
                );
                const scale = node.type === 'tag' ? 24 : 18;
                sprite.scale.set(scale, scale * 0.35, 1);
                sprite.position.set(0, 14, 0);
                return sprite;
            })
            .linkColor(COLORS.link)
            .linkWidth(0.5)
            .linkOpacity(0.3)
            // https://github.com/vasturiano/3d-force-graph/blob/master/example/directional-links-particles/index.html
            .linkDirectionalParticles(2)
            .linkDirectionalParticleWidth(1.5)
            .linkDirectionalParticleSpeed(0.005)
            .linkDirectionalParticleColor(() => COLORS.dream)
            // dispatch click events to RN app
            .onBackgroundClick(handleBackgroundClick)
            .onNodeClick(handleNodeClick);
        
        const navInfo = el.querySelector('.graph-nav-info');
        if (navInfo) navInfo.style.display = 'none';

        const starCanvas = document.createElement('canvas');
        starCanvas.width = 2048;
        starCanvas.height = 2048;
        const starCount = 800;
        
        const ctx = starCanvas.getContext('2d');
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(0, 0, 2048, 2048);
        for (let i = 0; i < starCount; i++) {
            const x = Math.random() * 2048;
            const y = Math.random() * 2048;
            const r = Math.random() * 1.5 + 0.3;
            const a = Math.random() * 0.9 + 0.4;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 220, 255, ${a})`;
            ctx.fill();
        }
        graph.scene().background = new THREE.CanvasTexture(starCanvas);

        // add a bloom filter to make it look more "dreamy"
        // https://github.com/vasturiano/3d-force-graph/blob/master/example/bloom-effect/index.html
        const bloomPass = new UnrealBloomPass();
        bloomPass.strength = 0.1;
        bloomPass.radius = 0.5;
        bloomPass.threshold = 0.1;
        graph.postProcessingComposer().addPass(bloomPass);
        
        // apply an RGB shader that performs a tilt of the color channels
        const rgbPass = new ShaderPass(RGBShiftShader);
        rgbPass.uniforms['amount'].value = 0.003;
        graph.postProcessingComposer().addPass(rgbPass);
    }

    graph.graphData(graphData);

    // setTimeout(() => graph.zoomToFit(400, 40), 1500);
}

let gyroX = 0, gyroY = 0;
let touching = false;
let animating = false;

// Orbits the camera around whatever the user is looking at using the device
// gyroscope.  Reads gyroX/gyroY (sent as 'gyroscope' messages from React Native)
// and converts them to spherical-coordinate deltas on the camera's offset from
// the OrbitControls target.  Paused during touch interaction and click animations
// so it never fights with user input.
// Note: The strategy here is heavily inspired by Andreas Rohner:
// https://andreasrohner.at/posts/Web%20Development/JavaScript/Simple-orbital-camera-controls-for-THREE-js/
// see also:
// https://sbcode.net/threejs/orbit-controls/
function animateGyro() {
    if (!touching && !animating && graph && (Math.abs(gyroX) > 0.01 || Math.abs(gyroY) > 0.01)) {
        const controls = graph.controls();
        const camera = graph.camera();

        // The camera sits somewhere on an imaginary sphere around the target.
        // To orbit it, we convert its cartesian offset (x,y,z relative to
        // target) into spherical coordinates (radius, theta, phi):
        //   radius: distance from camera to target (stays constant)
        //   theta: horizontal angle around the y-axis (left/right orbit)
        //   phi: vertical angle from the y-axis (up/down orbit)
        // https://threejs.org/docs/#Spherical.setFromVector3
        const offset = camera.position.clone().sub(controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);

        // Tilting the phone changes the gyro values, which we apply as small
        // angle deltas.  gyroY maps to theta (horizontal tilt → horizontal
        // orbit) and gyroX maps to phi (forward/back tilt → vertical orbit).
        // The 0.02 multiplier controls sensitivity.
        spherical.theta += gyroY * 0.02;
        spherical.phi += gyroX * 0.02;

        // Clamp phi to [0.1, PI-0.1] so the camera can't flip over the poles,
        // which would cause a disorienting 180° snap.
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

        // Convert the adjusted spherical coordinates back to a cartesian
        // offset vector and reposition the camera at target + offset.
        // https://threejs.org/docs/#Vector3.setFromSpherical
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target).add(offset);
        camera.lookAt(controls.target);

        // Sync OrbitControls' internal state with our changes so that touch
        // interactions (drag, pinch) pick up from the right position.
        controls.update();
    }
    // recursively schedule another animation frame for this function
    requestAnimationFrame(animateGyro);
}
requestAnimationFrame(animateGyro);

document.addEventListener('pointerdown', () => touching = true);
document.addEventListener('pointerup', () => touching = false);

// this is the function that receives the message sent by our react component
// which contains the graph data
function handleMessage(event) {
    let data;
    try {
        data = JSON.parse(event.data);
    } catch {
        return;
    }
    if (data.type === 'setGraphData') {
        renderGraph(data.payload);
    }

    if (data.type === 'focusNode' && graph) {
        const node = graph.graphData().nodes.find(n => n.name === data.payload.name && n.type === data.payload.type);
        if (node) handleNodeClick(node);
    }

    if (data.type === 'zoomToFit' && graph) {
        graph.zoomToFit(400, 40);
    }

    if (data.type === 'gyroscope') {
        gyroX = data.payload.x;
        gyroY = data.payload.y;
    }
}

window.addEventListener('message', handleMessage);
document.addEventListener('message', handleMessage);

window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'ready' }));
