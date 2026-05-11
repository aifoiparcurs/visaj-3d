import * as THREE from "three";

const mount = document.querySelector("#visaj-stage");
if (!mount) {
  throw new Error('VISAJ: lipsește elementul cu id="visaj-stage" pentru animație.');
}

const startTime = performance.now();
const loopDuration = 13.5;
let animationFrameId = null;
let isStageVisible = true;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
camera.position.set(0, 0, 10);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);

const resizeObserver = new ResizeObserver(() => {
  fitRendererToMount();
});
resizeObserver.observe(mount);
window.addEventListener("resize", fitRendererToMount);
fitRendererToMount();

function fitRendererToMount() {
  const width = Math.max(1, Math.floor(mount.clientWidth));
  const height = Math.max(1, Math.floor(mount.clientHeight));
  const aspect = width / height;
  const viewHeight = aspect > 1 ? 4.65 : 6.15;
  const viewWidth = viewHeight * aspect;

  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

const intersectionObserver = new IntersectionObserver(
  (entries) => {
    const next = entries[0]?.isIntersecting ?? true;
    if (next === isStageVisible) return;
    isStageVisible = next;
    if (isStageVisible) {
      if (animationFrameId == null) {
        animationFrameId = requestAnimationFrame(animate);
      }
      return;
    }
    if (animationFrameId != null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  },
  { threshold: [0, 0.12, 0.25], rootMargin: "40px 0px 40px 0px" },
);
intersectionObserver.observe(mount);

const root = new THREE.Group();
scene.add(root);

const assets = {
  orbit: "/assets/orbit.png",
  a: "/assets/letter-a.png",
  i: "/assets/letter-i.png",
  j: "/assets/letter-j.png",
  s: "/assets/letter-s.png",
  v: "/assets/letter-v.png",
  technologies: "/assets/technologies.png",
};

const state = {
  orbit: null,
  left: null,
  center: null,
  right: null,
  technologies: null,
};

const orbitShape = {
  centerX: 0.11,
  centerY: 0.06,
  radiusX: 1.51,
  radiusY: 1.18,
  rotation: 0.46,
  loops: 2,
};

const logoScale = 6.6 / 1024;
const logoLetterHeight = 117 * logoScale;
const logoMetrics = {
  v: { width: 139 * logoScale, height: logoLetterHeight },
  i: { width: 25 * logoScale, height: logoLetterHeight },
  s: { width: 114 * logoScale, height: logoLetterHeight },
  a: { width: 146 * logoScale, height: logoLetterHeight },
  j: { width: 79 * logoScale, height: logoLetterHeight },
  orbit: { width: 470 * logoScale, height: 365 * logoScale },
};

const logoLayout = {
  letterY: (512 - 473) * logoScale,
  leftStartX: -0.28,
  leftClosedX: 0,
  leftSeparatedX: -0.48,
  centerStartX: (472.5 - 512) * logoScale,
  rightStartX: 0.28,
  rightClosedX: 0,
  rightSeparatedX: 0.42,
  vX: (291 - 512) * logoScale,
  iX: (385 - 512) * logoScale,
  sX: (472.5 - 512) * logoScale,
  aX: (609.5 - 512) * logoScale,
  jX: (752 - 512) * logoScale,
};

const ORBIT_PATH_OUTER_PAD = 1.7;
const ORBIT_RIGHT_PINCH = 0.08;
const ORBIT_RIGHT_ANGLE = orbitShape.rotation;
const ORBIT_VERTICAL_SQUASH = 0.78;
const ORBIT_START_AMOUNT = 1.383;
const ORBIT_REVOLUTIONS = 0.75;
const ORBIT_AMOUNT_TRAVEL = ORBIT_REVOLUTIONS / orbitShape.loops;
const ORBIT_LEFT_LINE_AMOUNT = findOrbitLineAmount(
  "left",
  ORBIT_START_AMOUNT - ORBIT_AMOUNT_TRAVEL + 0.12,
  ORBIT_START_AMOUNT - ORBIT_AMOUNT_TRAVEL - 0.12,
);
const ORBIT_RIGHT_LINE_AMOUNT = findOrbitLineAmount(
  "right",
  ORBIT_LEFT_LINE_AMOUNT,
  ORBIT_LEFT_LINE_AMOUNT - 0.15,
);

init();

async function init() {
  const [orbit, a, i, j, s, v, technologies] = await Promise.all([
    loadMaskedTexture(assets.orbit, "orbit"),
    loadMaskedTexture(assets.a, "letter"),
    loadMaskedTexture(assets.i, "letter"),
    loadMaskedTexture(assets.j, "letter"),
    loadMaskedTexture(assets.s, "letter"),
    loadMaskedTexture(assets.v, "letter"),
    loadMaskedTexture(assets.technologies, "letter"),
  ]);

  state.orbit = createPlane(orbit, logoMetrics.orbit.width, logoMetrics.orbit.height, 0.62);
  state.orbit.position.set(0.11, 0.06, -0.08);
  root.add(state.orbit);

  state.left = createLeftGroup({ a, i, v });
  state.center = createCenterGroup({ s });
  state.right = createRightGroup({ a, i, j });
  root.add(state.left.group, state.center.group, state.right.group);

  state.technologies = createTechnologiesPlane(technologies);
  root.add(state.technologies);

  setRenderOrder(state.left.group, 10);
  setRenderOrder(state.right.group, 10);
  setRenderOrder(state.orbit, 20);
  setRenderOrder(state.center.group, 30);
  setRenderOrder(state.technologies, 40);
  state.technologies.userData.depthMask.renderOrder = 5;
  state.technologies.userData.text.renderOrder = 40;
  setDepthTest(state.center.group, false);
  setDepthTest(state.technologies.userData.text, false);

  addAtmosphere();
  fitRendererToMount();
  animate();
}

function createTechnologiesPlane(texture) {
  const image = texture.userData.canvas;
  const planeWidth = image.width * logoScale;
  const planeHeight = image.height * logoScale;
  const group = new THREE.Group();
  const depthMask = createDepthMaskPlane(texture, planeWidth, planeHeight);
  const text = createPlane(texture, planeWidth, planeHeight, 0);
  depthMask.position.z = 0.002;
  text.position.z = 0;
  group.add(depthMask, text);
  group.position.set(-0.09, -0.484, 0);
  group.userData.depthMask = depthMask;
  group.userData.text = text;
  return group;
}

function createDepthMaskPlane(texture, width, height) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.02,
    colorWrite: false,
    depthWrite: true,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function createLeftGroup(textures) {
  const group = new THREE.Group();
  const v = createVisualPlane(textures.v, logoMetrics.v.width, logoMetrics.v.height, 0);
  const a = createVisualPlane(textures.a, logoMetrics.a.width, logoMetrics.a.height, 0);
  const i = createVisualPlane(textures.i, logoMetrics.i.width, logoMetrics.i.height, 0);

  v.position.set(logoLayout.vX, logoLayout.letterY, 0);
  a.position.set(logoLayout.vX, logoLayout.letterY, 0);
  i.position.set(logoLayout.iX, logoLayout.letterY, 0);
  a.geometry.scale(1, -1, 1);

  group.add(v, a, i);
  group.position.x = logoLayout.leftStartX;
  group.userData.visualCenterX = getCombinedCenterX([
    { x: logoLayout.vX, width: logoMetrics.a.width },
    { x: logoLayout.iX, width: logoMetrics.i.width },
  ]);
  group.userData.visualCenterY = logoLayout.letterY;

  return { group, v, a, i };
}

function createCenterGroup(textures) {
  const group = new THREE.Group();
  const sWidth = logoMetrics.s.width;
  const sHeight = logoMetrics.s.height;
  const s = createVisualPlane(textures.s, sWidth, sHeight, 0);
  const wTexture = createRoundedWTexture();
  const wHeight = sHeight * 0.48;
  const wWidth = wHeight * wTexture.userData.aspect;
  const w = createPlane(wTexture, wWidth, wHeight, 0);
  w.position.set(sWidth / 2 + wWidth / 2 + 0.025, -sHeight / 2 + wHeight / 2, 0.02);
  group.add(s, w);
  group.position.set(logoLayout.sX, logoLayout.letterY, 0);

  return { group, s, w };
}

function createRightGroup(textures) {
  const group = new THREE.Group();
  const a = createVisualPlane(textures.a, logoMetrics.a.width, logoMetrics.a.height, 0);
  const j = createVisualPlane(textures.j, logoMetrics.j.width, logoMetrics.j.height, 0);
  const i = createVisualPlane(textures.i, logoMetrics.i.width, logoMetrics.i.height, 0);

  const jBarX = (791 - 512) * logoScale;
  const iRightX = logoLayout.aX + (logoLayout.iX - logoLayout.vX);

  const jPivot = new THREE.Group();
  j.position.set(logoLayout.jX - jBarX, 0, 0);
  jPivot.position.set(jBarX, logoLayout.letterY, 0);
  jPivot.add(j);

  a.position.set(logoLayout.aX, logoLayout.letterY, 0);
  i.position.set(iRightX, logoLayout.letterY, 0);

  group.add(a, jPivot, i);
  group.position.x = logoLayout.rightStartX;
  group.userData.visualCenterX = getCombinedCenterX([
    { x: logoLayout.aX, width: logoMetrics.a.width },
    { x: iRightX, width: logoMetrics.i.width },
  ]);
  group.userData.visualCenterY = logoLayout.letterY;

  return { group, a, j, jPivot, jBarX, iRightX, i };
}

function getCombinedCenterX(items) {
  const bounds = items.reduce(
    (acc, item) => ({
      min: Math.min(acc.min, item.x - item.width / 2),
      max: Math.max(acc.max, item.x + item.width / 2),
    }),
    { min: Infinity, max: -Infinity },
  );

  return (bounds.min + bounds.max) / 2;
}

function addAtmosphere() {
  const geometry = new THREE.BufferGeometry();
  const count = 70;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 4.4;
    positions[i * 3 + 2] = -0.5;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffd95a,
    size: 0.018,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  root.add(points);
}

function animate() {
  if (!isStageVisible) {
    animationFrameId = null;
    return;
  }
  animationFrameId = requestAnimationFrame(animate);

  const elapsed = (performance.now() - startTime) / 1000;
  const t = elapsed % loopDuration;
  updateTimeline(t);

  renderer.render(scene, camera);
}

function updateTimeline(t) {
  const leftOrbitSettle = smoothRange(t, 0, 8);
  const leftOrbitRun = THREE.MathUtils.lerp(
    ORBIT_START_AMOUNT,
    ORBIT_LEFT_LINE_AMOUNT,
    leftOrbitSettle,
  );
  /** Dreapta (începe jos): ușor mai rapidă; ajunge pe linie puțin înaintea stângii. */
  const rightOrbitPhase1 = smoothRange(t, 0, 7.45);
  const rightAmountMid = THREE.MathUtils.lerp(
    ORBIT_START_AMOUNT,
    ORBIT_LEFT_LINE_AMOUNT,
    rightOrbitPhase1,
  );
  const rightOrbitPhase2 = smoothRange(t, 7.2, 7.92);
  const rightOrbitRun = THREE.MathUtils.lerp(
    rightAmountMid,
    ORBIT_RIGHT_LINE_AMOUNT,
    rightOrbitPhase2,
  );
  const rightPreMorphClose = smoothRange(t, 7.85, 8.38);
  const morph = 1 - smoothRange(t, 8.5, 10.5);
  const wFlipOut = smoothRange(t, 8.5, 9.85);
  const wEdgeOut = smoothRange(t, 9.85, 10.15);
  const closeProgress = smoothRange(t, 10.2, 11.5);
  const intro = 1 - closeProgress;
  const outro = smoothRange(t, 12.5, 13.5);

  const visibleLetters = 1 - outro;
  const finalHold = (1 - wEdgeOut) * (1 - outro);

  state.orbit.material.opacity = 0.62 * (1 - outro);
  setGroupOpacity(state.technologies, visibleLetters);

  state.left.group.visible = visibleLetters > 0.01;
  state.center.group.visible = visibleLetters > 0.01;
  state.right.group.visible = visibleLetters > 0.01;

  setGroupOpacity(state.left.group, visibleLetters);
  setGroupOpacity(state.center.group, visibleLetters);
  setGroupOpacity(state.right.group, visibleLetters);

  state.center.s.material.opacity = visibleLetters;
  state.center.w.material.opacity = visibleLetters * (1 - wEdgeOut);
  state.center.w.rotation.x = wFlipOut * (Math.PI / 2);

  const flipBlend = smoothRange(morph, 0.498, 0.502);

  state.left.v.material.opacity = visibleLetters * (1 - flipBlend);
  state.left.v.rotation.x = morph * Math.PI;
  state.left.a.material.opacity = visibleLetters * flipBlend;
  state.left.a.rotation.x = morph * Math.PI;

  const jProgress = clamp(morph / 0.5, 0, 1);
  state.right.jPivot.scale.x = THREE.MathUtils.lerp(1, 0.001, jProgress);
  state.right.jPivot.position.x = THREE.MathUtils.lerp(
    state.right.jBarX,
    state.right.iRightX,
    jProgress,
  );
  state.right.j.material.opacity = visibleLetters * (1 - flipBlend);

  const iProgress = clamp((morph - 0.5) / 0.5, 0, 1);
  state.right.i.rotation.y = -(Math.PI / 2) * (1 - iProgress);
  state.right.i.material.opacity = visibleLetters * flipBlend;

  state.left.group.position.set(
    THREE.MathUtils.lerp(logoLayout.leftClosedX, logoLayout.leftSeparatedX, intro),
    0,
    0,
  );
  state.right.group.position.set(
    THREE.MathUtils.lerp(logoLayout.rightClosedX, logoLayout.rightSeparatedX, intro),
    0,
    0,
  );
  state.center.group.position.set(logoLayout.centerStartX, logoLayout.letterY, 0);

  state.left.group.rotation.set(0, 0, 0);
  state.right.group.rotation.set(0, 0, 0);
  state.left.group.scale.setScalar(1);
  state.right.group.scale.setScalar(1);

  placeOnOrbit(state.left.group, leftOrbitRun, 0, closeProgress);
  const leftVisualCenter = state.left.group.position.x + state.left.group.userData.visualCenterX;
  const rightSymmetricX =
    2 * logoLayout.centerStartX - leftVisualCenter - state.right.group.userData.visualCenterX;
  placeOnOrbit(
    state.right.group,
    rightOrbitRun,
    0.5,
    closeProgress,
    rightPreMorphClose,
    rightSymmetricX,
  );

  const breathe = Math.sin(t * 1.25) * 0.018;
  state.center.group.scale.setScalar(1 + breathe * finalHold);
}

function placeOnOrbit(
  group,
  amount,
  offset,
  closeProgress = 0,
  preCloseProgress = 0,
  preCloseX = null,
) {
  const fromX = group === state.left.group ? logoLayout.leftSeparatedX : logoLayout.rightSeparatedX;
  const fromY = 0;
  const visualCenterX = group.userData.visualCenterX ?? 0;
  const visualCenterY = group.userData.visualCenterY ?? 0;

  const restingX = fromX + visualCenterX;
  const restingY = fromY + visualCenterY;
  const restingDX = restingX - orbitShape.centerX;
  const restingDY = restingY - orbitShape.centerY;
  const restingAngle = Math.atan2(restingDY, restingDX);
  const restingDistance = Math.sqrt(restingDX * restingDX + restingDY * restingDY);

  const sweep = amount * orbitShape.loops * Math.PI * 2;
  const currentAngle = restingAngle + sweep;

  const orbitDistance = ellipseRadialDistance(currentAngle);
  const enter = smoothRange(amount, 0, 0.14);
  const rightWeight = Math.pow(
    0.5 * (1 + Math.cos(currentAngle - ORBIT_RIGHT_ANGLE)),
    4,
  );
  const pathPad = ORBIT_PATH_OUTER_PAD - ORBIT_RIGHT_PINCH * rightWeight;
  const distance = THREE.MathUtils.lerp(
    restingDistance,
    orbitDistance * pathPad,
    enter,
  );

  const visualX = orbitShape.centerX + Math.cos(currentAngle) * distance;
  const visualY = orbitShape.centerY + Math.sin(currentAngle) * distance * ORBIT_VERTICAL_SQUASH;

  const depthPhase = (amount * orbitShape.loops + offset) % 1;
  const depth = Math.sin((depthPhase + 0.05) * Math.PI * 2);
  const scale = THREE.MathUtils.lerp(1, 0.9 + depth * 0.045, amount);

  const closedX = group === state.left.group ? logoLayout.leftClosedX : logoLayout.rightClosedX;
  let orbitX = visualX - visualCenterX * scale;
  let orbitY = visualY - visualCenterY * scale;
  let orbitZ = THREE.MathUtils.clamp(-0.118 + depth * 0.028, -0.156, -0.088);
  let orbitScale = scale;

  if (preCloseX !== null) {
    orbitX = THREE.MathUtils.lerp(orbitX, preCloseX, preCloseProgress);
    orbitY = THREE.MathUtils.lerp(orbitY, 0, preCloseProgress);
    orbitZ = THREE.MathUtils.lerp(orbitZ, 0, preCloseProgress);
    orbitScale = THREE.MathUtils.lerp(orbitScale, 1, preCloseProgress);
  }

  const finalScale = THREE.MathUtils.lerp(orbitScale, 1, closeProgress);

  group.position.x = THREE.MathUtils.lerp(orbitX, closedX, closeProgress);
  group.position.y = THREE.MathUtils.lerp(orbitY, 0, closeProgress);
  group.position.z = THREE.MathUtils.lerp(orbitZ, 0, closeProgress);
  group.rotation.z = 0;
  group.scale.setScalar(finalScale);
}

function findOrbitLineAmount(side, startAmount, minAmount) {
  const step = 0.0005;
  const offset = side === "left" ? 0 : 0.5;
  let bestAmount = startAmount;
  let bestDistance = Infinity;
  let previousAmount = startAmount;
  let previousY = getOrbitGroupY(side, startAmount, offset);

  for (let amount = startAmount - step; amount >= minAmount; amount -= step) {
    const y = getOrbitGroupY(side, amount, offset);
    const distance = Math.abs(y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestAmount = amount;
    }
    if (Math.sign(previousY) !== Math.sign(y)) {
      const mix = Math.abs(previousY) / (Math.abs(previousY) + Math.abs(y));
      return THREE.MathUtils.lerp(previousAmount, amount, mix);
    }
    previousAmount = amount;
    previousY = y;
  }

  return bestAmount;
}

function getOrbitGroupY(side, amount, offset) {
  const fromX = side === "left" ? logoLayout.leftSeparatedX : logoLayout.rightSeparatedX;
  const visualCenterX = getOrbitVisualCenterX(side);
  const visualCenterY = logoLayout.letterY;
  const restingX = fromX + visualCenterX;
  const restingY = visualCenterY;
  const restingDX = restingX - orbitShape.centerX;
  const restingDY = restingY - orbitShape.centerY;
  const restingAngle = Math.atan2(restingDY, restingDX);
  const restingDistance = Math.sqrt(restingDX * restingDX + restingDY * restingDY);
  const currentAngle = restingAngle + amount * orbitShape.loops * Math.PI * 2;
  const orbitDistance = ellipseRadialDistance(currentAngle);
  const enter = smoothRange(amount, 0, 0.14);
  const rightWeight = Math.pow(
    0.5 * (1 + Math.cos(currentAngle - ORBIT_RIGHT_ANGLE)),
    4,
  );
  const pathPad = ORBIT_PATH_OUTER_PAD - ORBIT_RIGHT_PINCH * rightWeight;
  const distance = THREE.MathUtils.lerp(restingDistance, orbitDistance * pathPad, enter);
  const visualY = orbitShape.centerY + Math.sin(currentAngle) * distance * ORBIT_VERTICAL_SQUASH;
  const depthPhase = (amount * orbitShape.loops + offset) % 1;
  const depth = Math.sin((depthPhase + 0.05) * Math.PI * 2);
  const scale = THREE.MathUtils.lerp(1, 0.9 + depth * 0.045, amount);
  return visualY - visualCenterY * scale;
}

function getOrbitVisualCenterX(side) {
  if (side === "left") {
    return getCombinedCenterX([
      { x: logoLayout.vX, width: logoMetrics.a.width },
      { x: logoLayout.iX, width: logoMetrics.i.width },
    ]);
  }

  const iRightX = logoLayout.aX + (logoLayout.iX - logoLayout.vX);
  return getCombinedCenterX([
    { x: logoLayout.aX, width: logoMetrics.a.width },
    { x: iRightX, width: logoMetrics.i.width },
  ]);
}

function ellipseRadialDistance(angle) {
  const localAngle = angle - orbitShape.rotation;
  const c = Math.cos(localAngle);
  const s = Math.sin(localAngle);
  return 1 / Math.sqrt(
    (c * c) / (orbitShape.radiusX * orbitShape.radiusX) +
    (s * s) / (orbitShape.radiusY * orbitShape.radiusY),
  );
}

function createPlane(texture, width, height, opacity = 1) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    premultipliedAlpha: texture.userData.premultiplied === true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  return mesh;
}

function createVisualPlane(texture, visualWidth, visualHeight, opacity = 1) {
  const bounds = texture.userData.visibleBounds ?? {
    left: -0.5,
    right: 0.5,
    top: 0.5,
    bottom: -0.5,
  };
  const visibleWidthRatio = bounds.right - bounds.left;
  const visibleHeightRatio = bounds.top - bounds.bottom;
  const planeWidth = visualWidth / visibleWidthRatio;
  const planeHeight = visualHeight / visibleHeightRatio;
  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  const visibleCenterX = ((bounds.left + bounds.right) / 2) * planeWidth;
  const visibleCenterY = ((bounds.top + bounds.bottom) / 2) * planeHeight;
  geometry.translate(-visibleCenterX, -visibleCenterY, 0);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    premultipliedAlpha: texture.userData.premultiplied === true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });

  return new THREE.Mesh(geometry, material);
}

async function loadTexture(src) {
  const texture = await new THREE.TextureLoader().loadAsync(src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

async function loadMaskedTexture(src, type) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);

  const w = canvas.width;
  const h = canvas.height;
  const frame = context.getImageData(0, 0, w, h);
  const pixels = frame.data;
  let hasTransparency = false;

  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] < 245) {
      hasTransparency = true;
      break;
    }
  }

  const alphaRaw = new Float32Array(w * h);
  for (let i = 0, j = 0; i < pixels.length; i += 4, j += 1) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const sourceAlpha = pixels[i + 3] / 255;
    const brightness = (r + g + b) / 3;

    let alpha = sourceAlpha;
    if (!hasTransparency) {
      alpha = type === "orbit"
        ? clamp((r + g - b * 1.35 - 105) / 205, 0, 1)
        : clamp((brightness - 4) / 30, 0, 1);
    }
    alphaRaw[j] = alpha;
  }

  const alphaShaped = shapeAlphaForPolish(alphaRaw, w, h);

  const tint = type === "orbit" ? [255, 216, 32] : [12, 13, 13];
  for (let i = 0, j = 0; i < pixels.length; i += 4, j += 1) {
    const a = alphaShaped[j];
    pixels[i]     = Math.round(tint[0] * a);
    pixels[i + 1] = Math.round(tint[1] * a);
    pixels[i + 2] = Math.round(tint[2] * a);
    pixels[i + 3] = Math.round(a * 255);
  }

  context.putImageData(frame, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.premultiplyAlpha = false;
  texture.userData.premultiplied = true;
  texture.userData.visibleBounds = getAlphaBounds(w, h, pixels);
  texture.userData.pixelBounds = getPixelAlphaBounds(w, h, pixels);
  texture.userData.canvas = canvas;
  texture.needsUpdate = true;
  return texture;
}

function shapeAlphaForPolish(alphaIn, w, h) {
  const kernel = [0.054, 0.244, 0.404, 0.244, 0.054];
  const tmp = new Float32Array(w * h);
  const blurred = new Float32Array(w * h);

  for (let y = 0; y < h; y += 1) {
    const rowStart = y * w;
    for (let x = 0; x < w; x += 1) {
      let sum = 0;
      let weightSum = 0;
      for (let k = -2; k <= 2; k += 1) {
        const xx = x + k;
        if (xx >= 0 && xx < w) {
          const wt = kernel[k + 2];
          sum += alphaIn[rowStart + xx] * wt;
          weightSum += wt;
        }
      }
      tmp[rowStart + x] = sum / weightSum;
    }
  }

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let sum = 0;
      let weightSum = 0;
      for (let k = -2; k <= 2; k += 1) {
        const yy = y + k;
        if (yy >= 0 && yy < h) {
          const wt = kernel[k + 2];
          sum += tmp[yy * w + x] * wt;
          weightSum += wt;
        }
      }
      blurred[y * w + x] = sum / weightSum;
    }
  }

  const out = new Float32Array(w * h);
  const sharpenAmount = 0.55;
  const lo = 0.045;
  const hi = 0.955;
  const range = hi - lo;
  for (let i = 0; i < out.length; i += 1) {
    const original = alphaIn[i];
    const soft = blurred[i];
    const enhanced = clamp(original + sharpenAmount * (original - soft), 0, 1);
    let a = clamp((enhanced - lo) / range, 0, 1);
    a = a * a * (3 - 2 * a);
    out[i] = a;
  }

  return out;
}

function createRoundedWTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  const strokeWidth = 105;
  const top = 110;
  const bottom = 402;
  const left = 130;
  const right = 638;
  const midTop = (left + right) / 2;
  const leftValley = left + (right - left) * 0.25;
  const rightValley = left + (right - left) * 0.75;

  context.strokeStyle = "#0c0d0d";
  context.lineWidth = strokeWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(leftValley, bottom);
  context.lineTo(midTop, top);
  context.lineTo(rightValley, bottom);
  context.lineTo(right, top);
  context.stroke();

  const croppedCanvas = cropCanvasToAlpha(canvas, 8);
  premultiplyCanvas(croppedCanvas);
  const texture = new THREE.CanvasTexture(croppedCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.premultiplyAlpha = false;
  texture.userData.premultiplied = true;
  texture.userData.aspect = croppedCanvas.width / croppedCanvas.height;
  texture.needsUpdate = true;
  return texture;
}

function premultiplyCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    data[i]     = Math.round(data[i] * a);
    data[i + 1] = Math.round(data[i + 1] * a);
    data[i + 2] = Math.round(data[i + 2] * a);
  }
  ctx.putImageData(frame, 0, 0);
}

function createTextTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0c0d0d";
  context.font = "900 340px Arial Black, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 270);

  const croppedCanvas = cropCanvasToAlpha(canvas, 8);
  const texture = new THREE.CanvasTexture(croppedCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.aspect = croppedCanvas.width / croppedCanvas.height;
  texture.needsUpdate = true;
  return texture;
}

function getAlphaBounds(width, height, pixels) {
  const bounds = getPixelAlphaBounds(width, height, pixels);

  if (!bounds) {
    return { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5 };
  }

  return {
    left: bounds.minX / width - 0.5,
    right: bounds.maxX / width - 0.5,
    top: 0.5 - bounds.minY / height,
    bottom: 0.5 - bounds.maxY / height,
  };
}

function getPixelAlphaBounds(width, height, pixels) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > 10) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function cropCanvasToAlpha(sourceCanvas, padding = 0) {
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = sourceCanvas;
  const pixels = sourceContext.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > 10) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return sourceCanvas;
  }

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = maxX - minX + 1;
  croppedCanvas.height = maxY - minY + 1;
  croppedCanvas
    .getContext("2d")
    .drawImage(
      sourceCanvas,
      minX,
      minY,
      croppedCanvas.width,
      croppedCanvas.height,
      0,
      0,
      croppedCanvas.width,
      croppedCanvas.height,
    );

  return croppedCanvas;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function setGroupOpacity(group, opacity) {
  group.traverse((child) => {
    if (child.material) {
      child.material.opacity = opacity;
    }
  });
}

function setRenderOrder(object, order) {
  object.renderOrder = order;
  object.traverse?.((child) => {
    child.renderOrder = order;
  });
}

function setDepthTest(object, depthTest) {
  object.traverse?.((child) => {
    if (child.material) {
      child.material.depthTest = depthTest;
    }
  });
  if (object.material) {
    object.material.depthTest = depthTest;
  }
}

function smoothRange(value, start, end) {
  const t = clamp((value - start) / (end - start), 0, 1);
  const smooth = t * t * (3 - 2 * t);
  return 0.7 * smooth + 0.3 * t;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

