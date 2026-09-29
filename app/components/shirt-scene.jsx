"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./shirt-scene.module.css";
import ShirtPreview from "./shirt-preview";
import { DEFAULT_DESIGN } from "../lib/store";
import { artworkUrl, printOnSide } from "../lib/artwork";

const NECK = 0.35;
const TOP_WIDTH = 0.82;
const HEM = -1.08;
const clamp = THREE.MathUtils.clamp;
const smooth = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

// Each panel is a finely tessellated, curved cotton surface. The front and
// back meet at the shoulders while the neck, sleeve cuffs and hem stay open.
function bodyPoint(u, v, face = 1) {
  const topX = u * TOP_WIDTH;
  const neckline = Math.abs(topX) < NECK;
  const neckCurve = neckline ? Math.sqrt(1 - (topX / NECK) ** 2) : 0;
  const shoulderSlope = 0.065 * smooth((Math.abs(topX) - NECK) / (TOP_WIDTH - NECK));
  const topY = 1.29 - (face === 1 ? 0.36 : 0.105) * neckCurve - shoulderSlope;
  const width = 0.91 - v * 0.09 + Math.sin(v * Math.PI) * 0.018;
  const x = u * width;
  const hemWave = 0.025 * Math.sin(u * 8 + 0.7) * (1 - v) ** 7;
  const y = HEM + v * (topY - HEM) + hemWave;
  const sideShape = Math.sqrt(Math.max(0, 1 - Math.abs(u) ** 4));
  const depth = 0.055 + sideShape * (0.25 + 0.028 * Math.cos(v * Math.PI));
  const topDepth = 0.014 + neckCurve * 0.21;
  const shoulderBlend = smooth((1 - v) / 0.2);
  const drape =
    (0.043 * Math.sin(u * 13 + v * 2.8) + 0.013 * Math.sin(u * 24 - v * 4)) *
    Math.sin(Math.PI * v) *
    (0.3 + Math.abs(u) * 0.7);
  const underarmFold =
    0.032 * Math.sin((Math.abs(u) - v * 0.34) * 26) *
    Math.exp(-(((v - 0.66) / 0.18) ** 2)) *
    Math.abs(u) ** 5;
  const hemFold = 0.022 * Math.sin(u * 10 + 0.5) * (1 - v) ** 5 * (1 - u * u);
  const z = face * (THREE.MathUtils.lerp(topDepth, depth, shoulderBlend) + drape + underarmFold + hemFold);
  return new THREE.Vector3(x, y, z);
}

function sleevePoint(u, v, side, face = 1) {
  const attachment = bodyPoint(side, 0.65 + v * 0.35, face);
  const cuff = new THREE.Vector3(side * (1.40 + v * 0.26), 0.075 + v * 0.65, 0);
  const point = attachment.clone().lerp(cuff, u);
  const cuffDepth = 0.015 + 0.115 * Math.sin(v * Math.PI);
  const volume = 0.092 * Math.sin(v * Math.PI) * Math.sin(u * Math.PI);
  const fold = 0.012 * Math.sin(v * 13 + u * 4) * Math.sin(v * Math.PI) * Math.sin(u * Math.PI);
  point.z = THREE.MathUtils.lerp(attachment.z, face * cuffDepth, u) + face * (volume + fold);
  point.y += 0.012 * Math.sin(u * Math.PI) * Math.sin(v * 8);
  return point;
}

function panelGeometry(columns, rows, getPoint, reverse = false) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const v = row / rows;
      const point = getPoint(u, v);
      positions.push(point.x, point.y, point.z);
      uvs.push(u, v);
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      if (reverse) indices.push(a, d, b, a, c, d);
      else indices.push(a, b, d, a, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function fabricTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const pixels = context.createImageData(128, 128);
  // A deterministic weave keeps the material delicate and avoids noisy flicker.
  for (let y = 0; y < 128; y += 1) {
    for (let x = 0; x < 128; x += 1) {
      const offset = (y * 128 + x) * 4;
      const weave = (x % 3 === 0 ? 15 : 0) + (y % 3 === 0 ? 10 : 0);
      const grain = ((x * 13 + y * 19) % 11) - 5;
      pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = 150 + weave + grain;
      pixels.data[offset + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 10);
  return texture;
}

function pointAtXY(x, y, face) {
  let u = x / 0.87;
  let v = 0.65;
  for (let i = 0; i < 4; i += 1) {
    const top = bodyPoint(u, 1, face);
    v = (y - HEM) / (top.y - HEM);
    const width = 0.91 - v * 0.09 + Math.sin(v * Math.PI) * 0.018;
    u = x / width;
  }
  const point = bodyPoint(u, v, face);
  point.z += face * 0.004;
  return point;
}

function makeShirt() {
  const group = new THREE.Group();
  const weave = fabricTexture();
  const cloth = new THREE.MeshStandardMaterial({
    color: "#e8e3d9",
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
    bumpMap: weave,
    bumpScale: 0.0018,
  });
  const seam = new THREE.MeshStandardMaterial({ color: "#d6d0c5", roughness: 1 });
  const ink = new THREE.MeshBasicMaterial({
    color: "#ffffff", transparent: true, opacity: 0, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  const backInk = ink.clone();

  function mesh(geometry, material = cloth) {
    const item = new THREE.Mesh(geometry, material);
    group.add(item);
    return item;
  }

  function stitch(points, radius = 0.006, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
    mesh(new THREE.TubeGeometry(curve, Math.max(32, points.length * 2), radius, 6, closed), seam);
  }

  for (const face of [1, -1]) {
    mesh(panelGeometry(96, 76, (u, v) => bodyPoint(u * 2 - 1, v, face), face < 0));
    for (const side of [-1, 1]) {
      mesh(panelGeometry(36, 40, (u, v) => sleevePoint(u, v, side, face), side * face < 0));

      // The dropped shoulder stitch traces the natural armhole.
      stitch(Array.from({ length: 28 }, (_, i) => {
        const point = bodyPoint(side * 0.997, 0.65 + (i / 27) * 0.35, face);
        point.z += face * 0.005;
        return point;
      }), 0.0045);

      // A folded sleeve edge with two understated lines of stitching.
      for (const u of [0.955, 0.977]) {
        stitch(Array.from({ length: 26 }, (_, i) => {
          const point = sleevePoint(u, i / 25, side, face);
          point.z += face * 0.005;
          return point;
        }), 0.004);
      }
    }

    for (const v of [0.018, 0.039]) {
      stitch(Array.from({ length: 65 }, (_, i) => {
        const point = bodyPoint((i / 64) * 2 - 1, v, face);
        point.z += face * 0.004;
        return point;
      }), 0.0045);
    }
  }

  // Close the side seams below the sleeve; the remaining garment openings
  // deliberately expose the darker interior when the shirt is rotated.
  for (const side of [-1, 1]) {
    mesh(panelGeometry(8, 42, (u, v) => {
      const front = bodyPoint(side, v * 0.65, 1);
      const back = bodyPoint(side, v * 0.65, -1);
      const point = front.lerp(back, u);
      point.x += side * Math.sin(u * Math.PI) * 0.01;
      return point;
    }, side < 0));

    // Narrow shoulder and sleeve seams complete the volume.
    mesh(panelGeometry(12, 30, (u, v) => {
      const x = side * (NECK / TOP_WIDTH + v * (1 - NECK / TOP_WIDTH));
      return bodyPoint(x, 1, 1).lerp(bodyPoint(x, 1, -1), u);
    }, side > 0));
    for (const edge of [0, 1]) {
      mesh(panelGeometry(6, 32, (u, v) =>
        sleevePoint(v, edge, side, 1).lerp(sleevePoint(v, edge, side, -1), u),
      side * (edge ? 1 : -1) > 0));
    }

    const cuffLoop = [];
    for (let i = 0; i <= 32; i += 1) cuffLoop.push(sleevePoint(1, i / 32, side, 1));
    for (let i = 32; i >= 0; i -= 1) cuffLoop.push(sleevePoint(1, i / 32, side, -1));
    stitch(cuffLoop, 0.009, true);
  }

  const collar = [];
  for (let i = 0; i <= 64; i += 1) collar.push(bodyPoint(((i / 64) * 2 - 1) * NECK / TOP_WIDTH, 1, 1));
  for (let i = 64; i >= 0; i -= 1) collar.push(bodyPoint(((i / 64) * 2 - 1) * NECK / TOP_WIDTH, 1, -1));
  stitch(collar, 0.028, true);
  const collarStitch = collar.map((point) => new THREE.Vector3(point.x * 1.07, point.y - 0.037, point.z * 1.05));
  stitch(collarStitch, 0.006, true);

  const frontPrint = mesh(panelGeometry(38, 38, (u, v) => pointAtXY(-0.61 + u * 1.22, -0.38 + v * 1.22, 1)), ink);
  const backPrint = mesh(panelGeometry(38, 38, (u, v) => pointAtXY(-0.61 + u * 1.22, -0.38 + v * 1.22, -1), true), backInk);

  // A small woven label is tucked inside the back of the collar.
  const labelMaterial = new THREE.MeshStandardMaterial({ color: "#252622", roughness: 1, side: THREE.DoubleSide });
  const label = mesh(new THREE.PlaneGeometry(0.13, 0.07), labelMaterial);
  label.position.set(0, 1.08, -0.18);

  // Apply the same displacement to the fabric, stitching, and printed surface.
  // The neckline stays anchored; the lower fabric and sleeves can ripple.
  const uniforms = { clothTime: { value: 0 }, clothWind: { value: 0 }, clothKick: { value: 0 } };
  for (const material of [cloth, seam, ink, backInk]) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = `uniform float clothTime; uniform float clothWind; uniform float clothKick;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
        #include <begin_vertex>
        float freeCloth = max(1.0 - smoothstep(-1.1, 1.2, position.y), smoothstep(0.8, 1.65, abs(position.x)) * 0.7);
        transformed.z += (sin(position.y * 3.5 + position.x * 4.0 + clothTime * 3.0) * clothWind * 0.065 + clothKick * 0.13) * freeCloth;
        transformed.x += (sin(clothTime * 2.0 + position.y * 3.0) * clothWind * 0.025 + clothKick * 0.03) * freeCloth;
      `);
    };
  }
  const charm = new THREE.Group();
  group.add(charm);
  const metal = new THREE.MeshStandardMaterial({ color: "#dce2c6", metalness: 0.65, roughness: 0.3 });
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 20), metal);
  loop.position.y = -0.025;
  charm.add(loop);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 8), seam.clone());
  cord.position.y = -0.09;
  charm.add(cord);
  const tag = new THREE.Group();
  const tagBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.021), new THREE.MeshStandardMaterial({ color: "#c5cba9", roughness: 0.65 }));
  tagBody.position.y = -0.25;
  tag.add(tagBody);
  for (const x of [-0.029, 0.008, 0.032]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.065, 0.003), new THREE.MeshBasicMaterial({ color: "#303828" }));
    stripe.position.set(x, -0.25, 0.012);
    stripe.rotation.z = x > 0 ? (x > 0.02 ? -0.4 : 0.4) : 0;
    tag.add(stripe);
  }
  const orb = new THREE.Group();
  const planet = new THREE.Mesh(new THREE.SphereGeometry(0.067, 16, 12), metal);
  planet.position.y = -0.23;
  orb.add(planet);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 8, 32), metal);
  orbit.position.y = -0.23;
  orbit.rotation.set(0.4, -0.4, -0.4);
  orb.add(orbit);
  charm.add(tag, orb);
  return { group, cloth, seam, ink, backInk, frontPrint, backPrint, uniforms, charm, tag, orb };
}

export default function ShirtScene({ color = "#e8e3d9", design = DEFAULT_DESIGN, physics = { enabled: true, wind: 35, impulse: 0 }, autoRotate = true, view = "front", reducedMotion = false, viewResetKey = 0 }) {
  const host = useRef(null);
  const sceneState = useRef(null);
  const currentProps = useRef({ color, design, physics, autoRotate, view, reducedMotion });
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  currentProps.current = { color, design, physics, autoRotate, view, reducedMotion };

  useEffect(() => {
    const element = host.current;
    if (!element) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      setUnavailable(true);
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.className = styles.canvas;
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 40);
    camera.position.set(0, 0.05, 7.1);
    camera.lookAt(0, -0.05, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x555c68, 1.35));
    const key = new THREE.DirectionalLight(0xfff8ec, 3.15);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe4efff, 0.95);
    fill.position.set(4, 0.5, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 3);
    rim.position.set(-2, 3, -4);
    scene.add(rim);

    const shirt = makeShirt();
    scene.add(shirt.group);
    shirt.group.rotation.set(-0.045, -0.24, -0.055);
    const state = {
      ...shirt,
      targetRotation: currentProps.current.view === "back" ? Math.PI - 0.24 : -0.24,
      targetTilt: -0.045,
      dragging: false,
      lastInteraction: 0,
      active: true,
      alive: true, artworkVersion: 0, kick: 0, kickVelocity: 0, swing: 0, swingVelocity: 0,
    };
    sceneState.current = state;

    const updateColor = () => {
      const cotton = new THREE.Color(currentProps.current.color);
      state.cloth.color.copy(cotton);
      state.seam.color.copy(cotton).multiplyScalar(0.86);
    };
    state.updateColor = updateColor;
    updateColor();
    state.updateArtwork = () => {
      const props = currentProps.current;
      state.frontPrint.visible = printOnSide(props.design, false);
      state.backPrint.visible = printOnSide(props.design, true);
      state.charm.visible = props.design.charm !== "none";
      state.tag.visible = props.design.charm === "tag";
      state.orb.visible = props.design.charm === "orb";
      const version = ++state.artworkVersion;
      element.dataset.artwork = "loading";
      const images = ["front", "back"].map((side) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = artworkUrl(props.design[side], props.color);
      }));
      Promise.all(images).then(([front, back]) => {
        if (!state.alive || version !== state.artworkVersion) return;
        for (const [img, material, reversed] of [[front, state.ink, false], [back, state.backInk, true]]) {
          const texture = new THREE.Texture(img);
          texture.colorSpace = THREE.SRGBColorSpace;
          if (reversed) { texture.repeat.x = -1; texture.offset.x = 1; }
          texture.needsUpdate = true;
          material.map?.dispose();
          material.map = texture;
          material.opacity = 1;
          material.needsUpdate = true;
        }
        element.dataset.artwork = "ready";
      }).catch(() => { if (state.alive && version === state.artworkVersion) { setUnavailable(true); setReady(false); state.active = false; } });
    };
    state.updateArtwork();

    const resize = () => {
      const width = element.clientWidth || 500;
      const height = element.clientHeight || 560;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.position.z = Math.max(6.5, 3.85 / camera.aspect);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element);
    resize();

    let pointerX = 0;
    let pointerY = 0;
    let frame;
    let previousTime = 0;
    let time = 0;
    let clothTime = 0;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onDown = (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      state.dragging = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      state.lastInteraction = performance.now();
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = "true";
    };
    const onMove = (event) => {
      if (!state.dragging) return;
      const drag = clamp((event.clientX - pointerX) * 0.014, -0.8, 0.8);
      state.kickVelocity = clamp(state.kickVelocity + drag, -5, 5);
      state.swingVelocity = clamp(state.swingVelocity + drag * 2, -7, 7);
      state.targetRotation += (event.clientX - pointerX) * 0.011;
      state.targetTilt = clamp(state.targetTilt + (event.clientY - pointerY) * 0.004, -0.32, 0.32);
      pointerX = event.clientX;
      pointerY = event.clientY;
      state.lastInteraction = performance.now();
    };
    const onUp = (event) => {
      state.dragging = false;
      state.lastInteraction = performance.now();
      element.dataset.dragging = "false";
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    const onKey = (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) return;
      event.preventDefault();
      state.lastInteraction = performance.now();
      if (event.key === "ArrowLeft") state.targetRotation -= Math.PI / 8;
      if (event.key === "ArrowRight") state.targetRotation += Math.PI / 8;
      if (event.key === "ArrowUp") state.targetTilt = clamp(state.targetTilt - 0.1, -0.32, 0.32);
      if (event.key === "ArrowDown") state.targetTilt = clamp(state.targetTilt + 0.1, -0.32, 0.32);
      if (event.key === "Home") { state.targetRotation = -0.24; state.targetTilt = -0.045; }
      if (event.key !== "Home") { state.kickVelocity += 0.8; state.swingVelocity += 1.2; }
    };
    const onContextLost = (event) => {
      event.preventDefault();
      state.active = false;
      setReady(false);
      setUnavailable(true);
    };
    const intersectionObserver = new IntersectionObserver(([entry]) => { state.active = entry.isIntersecting; });
    intersectionObserver.observe(element);
    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);
    element.addEventListener("keydown", onKey);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);

    function render(now) {
      frame = requestAnimationFrame(render);
      const delta = Math.min((now - previousTime) / 1000 || 0, 0.04);
      previousTime = now;
      if (!state.active || document.hidden) return;
      const motion = !currentProps.current.reducedMotion && !motionPreference.matches;
      const dynamic = motion && currentProps.current.physics.enabled;
      const wind = dynamic ? currentProps.current.physics.wind / 100 : 0;
      if (dynamic) {
        clothTime += delta;
        state.kickVelocity += (-26 * state.kick - 6 * state.kickVelocity) * delta;
        state.kick = clamp(state.kick + state.kickVelocity * delta, -1.5, 1.5);
        state.swingVelocity += (-22 * state.swing - 3.2 * state.swingVelocity + Math.sin(clothTime * 2.3) * wind * 3) * delta;
        state.swing = clamp(state.swing + state.swingVelocity * delta, -0.9, 0.9);
      } else { state.kick = state.kickVelocity = state.swing = state.swingVelocity = 0; }
      shirt.uniforms.clothTime.value = clothTime;
      shirt.uniforms.clothWind.value = wind;
      shirt.uniforms.clothKick.value = state.kick;
      const attachment = pointAtXY(0.875, -0.54, 1);
      const freeCloth = 1 - smooth((-0.54 + 1.1) / 2.3);
      attachment.z += (Math.sin(-0.54 * 3.5 + attachment.x * 4 + clothTime * 3) * wind * 0.065 + state.kick * 0.13) * freeCloth;
      attachment.x += (Math.sin(clothTime * 2 - 0.54 * 3) * wind * 0.025 + state.kick * 0.03) * freeCloth;
      shirt.charm.position.copy(attachment);
      shirt.charm.rotation.z = 0.17 + state.swing;
      shirt.charm.rotation.x = dynamic ? Math.sin(clothTime * 1.7) * 0.1 * wind : 0;
      element.dataset.motion = dynamic ? "active" : "still";
      if (motion && currentProps.current.autoRotate) time += delta;
      if (motion && currentProps.current.autoRotate && !state.dragging && now - state.lastInteraction > 5000) {
        state.targetRotation += delta * 0.16;
      }
      const blend = motion ? 1 - Math.exp(-delta * 9) : 1;
      shirt.group.rotation.y = THREE.MathUtils.lerp(shirt.group.rotation.y, state.targetRotation, blend);
      shirt.group.rotation.x = THREE.MathUtils.lerp(shirt.group.rotation.x, state.targetTilt, blend);
      shirt.group.position.y = -0.11 + (motion ? Math.sin(time * 1.05) * 0.035 : 0);
      shirt.group.rotation.z = -0.055 + (motion ? Math.sin(time * 0.5) * 0.009 : 0);
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(render);
    setReady(true);

    return () => {
      state.alive = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
      element.removeEventListener("keydown", onKey);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      scene.traverse((item) => {
        if (item.geometry) geometries.add(item.geometry);
        if (item.material) {
          for (const material of Array.isArray(item.material) ? item.material : [item.material]) {
            materials.add(material);
            for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
          }
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      sceneState.current = null;
    };
  }, []);

  useEffect(() => { sceneState.current?.updateColor(); }, [color]);
  useEffect(() => { sceneState.current?.updateArtwork(); }, [design, color]);
  useEffect(() => {
    if (!physics.impulse || !physics.enabled || reducedMotion) return;
    const state = sceneState.current;
    if (state) { state.kickVelocity = 5; state.swingVelocity = 7; }
  }, [physics.impulse, physics.enabled, reducedMotion]);

  useEffect(() => {
    const state = sceneState.current;
    if (!state) return;
    const desired = view === "back" ? Math.PI - 0.24 : -0.24;
    const turns = Math.round((state.targetRotation - desired) / (Math.PI * 2));
    state.targetRotation = desired + turns * Math.PI * 2;
    state.targetTilt = -0.045;
    state.lastInteraction = performance.now();
  }, [view, viewResetKey]);

  return (
    <div
      ref={host}
      className={styles.scene}
      tabIndex={unavailable ? -1 : 0}
      role="img"
      aria-label={unavailable ? "Oversized Atelier IX T-shirt preview" : "Interactive 3D Atelier IX T-shirt. Drag or use arrow keys to rotate. Press Home to reset."}
      data-ready={ready}
    >
      {!ready && <div className={styles.fallback}><ShirtPreview color={color} design={design} back={view === "back"}/></div>}
    </div>
  );
}
