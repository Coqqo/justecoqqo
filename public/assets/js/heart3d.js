// A glossy, iridescent 3D heart that beats a little stronger as the donation grows.
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const heartShape = () => {
  const s = new THREE.Shape();
  s.moveTo(5, 5);
  s.bezierCurveTo(5, 5, 4, 0, 0, 0);
  s.bezierCurveTo(-6, 0, -6, 7, -6, 7);
  s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
  s.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
  s.bezierCurveTo(16, 7, 16, 0, 10, 0);
  s.bezierCurveTo(7, 0, 5, 5, 5, 5);
  return s;
};

export const mountHeart = (stage, { colors = ['#ff7ab6', '#a98bff'], reducedMotion = false } = {}) => {
  const canvas = stage.querySelector('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  const geometry = new THREE.ExtrudeGeometry(heartShape(), {
    depth: 3.2,
    bevelEnabled: true,
    bevelThickness: 2.6,
    bevelSize: 2.2,
    bevelSegments: 16,
    curveSegments: 64,
  });
  geometry.center();
  geometry.computeVertexNormals();

  // vertical gradient between the two colours, baked into the vertices
  const position = geometry.attributes.position;
  const bottom = new THREE.Color(colors[0]);
  const top = new THREE.Color(colors[1]);
  const vertexColors = new Float32Array(position.count * 3);
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const mixed = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const t = (position.getY(i) - min.y) / (max.y - min.y);
    mixed.copy(bottom).lerp(top, t);
    vertexColors.set([mixed.r, mixed.g, mixed.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.22,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 0.7,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [200, 520],
    sheen: 0.6,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color('#ffffff'),
    envMapIntensity: 1.1,
  });
  const heart = new THREE.Mesh(geometry, material);
  heart.rotation.z = Math.PI;
  const holder = new THREE.Group();
  holder.add(heart);
  holder.scale.setScalar(0.145);
  scene.add(holder);

  const key = new THREE.DirectionalLight('#ffffff', 1.4);
  key.position.set(-3, 4, 6);
  scene.add(key);

  let width = 1;
  let height = 1;
  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(stage);

  const pointer = new THREE.Vector2();
  window.addEventListener('pointermove', (event) => {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  });

  let strength = 0.5;
  let kick = 0;
  let t = 0;
  let last = performance.now();
  let visible = true;
  let frame = 0;

  const tick = (now) => {
    frame = 0;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    t += dt;
    kick = Math.max(0, kick - dt * 2.2);
    // heartbeat: two quick pulses, then a rest
    const phase = (t * (0.9 + strength * 0.5)) % 1;
    const beat = Math.exp(-((phase - 0.08) ** 2) / 0.002) + 0.6 * Math.exp(-((phase - 0.26) ** 2) / 0.002);
    const pulse = 1 + (reducedMotion ? 0 : beat * (0.04 + strength * 0.05)) + kick * 0.12;
    holder.scale.setScalar(0.145 * pulse);
    holder.rotation.y = (reducedMotion ? 0.35 : Math.sin(t * 0.6) * 0.45) + pointer.x * 0.35;
    holder.rotation.x = pointer.y * -0.25 + Math.sin(t * 0.4) * 0.08;
    holder.position.y = Math.sin(t * 0.9) * 0.08;
    renderer.render(scene, camera);
    if (visible) frame = requestAnimationFrame(tick);
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && !document.hidden;
    if (visible && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }).observe(stage);

  stage.classList.add('has-3d');
  frame = requestAnimationFrame(tick);

  return {
    /** amount in euros: a bigger donation, a stronger heartbeat */
    setAmount(euros) {
      strength = Math.min(1, Math.log10(Math.max(1, euros)) / Math.log10(100));
      kick = Math.min(1, kick + 0.8);
    },
  };
};
