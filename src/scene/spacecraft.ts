import * as THREE from 'three';
import { PLAYABLE_SHIPS, type PlayableShipId } from '../world/spacePhysics';
import type { WorldMaterialLibrary } from './materials';

export type SpaceCameraMode = 'chase' | 'cockpit';

export interface CosmeticLiveryVisual {
  id: string;
  hullAccentHex: string;
  trimHex: string;
}

export interface ValkyrieSpacecraft {
  root: THREE.Group;
  setShipClass: (shipId: PlayableShipId) => void;
  getShipClass: () => PlayableShipId;
  setCosmeticLivery: (livery: CosmeticLiveryVisual | null) => void;
  setLandingGear: (deployed: number) => void;
  setThrustLevel: (thrustNorm: number, boosting: boolean, supercruise?: boolean) => void;
  setDamageVisuals: (hullRatio: number, engineRatio?: number) => void;
  addCameraShake: (amount: number) => void;
  setShakeMultiplier: (mult: number) => void;
  setViewMode: (mode: SpaceCameraMode) => void;
  getViewMode: () => SpaceCameraMode;
  setExteriorShowcaseOverride: (forceExterior: boolean) => void;
  getMuzzleWorldPositions: (leftOut: THREE.Vector3, rightOut: THREE.Vector3) => void;
  updateVisuals: (dt: number, elapsed: number, pitchInput: number, rollInput: number) => void;
  updateCamera: (
    camera: THREE.PerspectiveCamera,
    dt: number,
    boosting: boolean,
    supercruise?: boolean,
    obstacles?: ReadonlyArray<{ x: number; y: number; z: number; radius: number }>,
    snapCamera?: boolean,
  ) => void;
  dispose: () => void;
}

interface ThrusterAssembly {
  outerPlume: THREE.Mesh;
  innerCore: THREE.Mesh;
  innerGlowRing: THREE.Mesh;
  plasmaParticles: THREE.Points;
  heatDistortionParticles: THREE.Points;
  baseScale: number;
}

/**
 * Normalizes ExtrudeGeometry UVs cleanly to a realistic panel-scale (eliminating
 * raw world-unit micro-tiling & vertical brick stripes on extruded edges).
 */
function normalizePlateUVs(geo: THREE.BufferGeometry, repeatScale = 0.24): void {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const norm = geo.attributes.normal as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  if (!pos || !norm || !uv) return;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ay = Math.abs(norm.getY(i));
    const ax = Math.abs(norm.getX(i));
    if (ay >= 0.55) {
      uv.setXY(i, x * repeatScale, z * repeatScale);
    } else if (ax >= 0.55) {
      uv.setXY(i, z * repeatScale, y * repeatScale);
    } else {
      uv.setXY(i, x * repeatScale, y * repeatScale);
    }
  }
  uv.needsUpdate = true;
}

interface FuselageSection {
  z: number;
  halfWidth: number;
  topY: number;
  bottomY: number;
  chineY: number;
  deckFrac?: number;
  bellyFrac?: number;
}

/**
 * Builds a true sculpted 8-facet stealth aerospace fuselage lofted smoothly along Z
 * with exact unshifted coordinates and continuous planar UVs (zero slab walls, zero floating gaps).
 */
function createLoftedAerospaceFuselage(
  sections: FuselageSection[],
  uvScale = 0.22,
): THREE.BufferGeometry {
  const ringPts = 8;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s];
    const hw = Math.max(0.015, sec.halfWidth);
    const df = sec.deckFrac ?? 0.52;
    const bf = sec.bellyFrac ?? 0.44;
    const dw = hw * df;
    const bw = hw * bf;

    // 8-point aerodynamic stealth cross-section (clockwise looking from nose toward stern)
    const ring: [number, number][] = [
      [0, sec.topY], // 0: dorsal ridge center
      [dw, sec.topY - (sec.topY - sec.chineY) * 0.22], // 1: starboard upper shoulder
      [hw, sec.chineY], // 2: starboard sharp stealth chine
      [bw, sec.bottomY + (sec.chineY - sec.bottomY) * 0.22], // 3: starboard lower bevel
      [0, sec.bottomY], // 4: ventral keel center
      [-bw, sec.bottomY + (sec.chineY - sec.bottomY) * 0.22], // 5: port lower bevel
      [-hw, sec.chineY], // 6: port sharp stealth chine
      [-dw, sec.topY - (sec.topY - sec.chineY) * 0.22], // 7: port upper shoulder
    ];

    for (let k = 0; k < ringPts; k++) {
      const [x, y] = ring[k];
      positions.push(x, y, sec.z);
      uvs.push((k / ringPts) * 2.4, sec.z * uvScale);
    }
  }

  for (let s = 0; s < sections.length - 1; s++) {
    const rowA = s * ringPts;
    const rowB = (s + 1) * ringPts;
    for (let k = 0; k < ringPts; k++) {
      const kn = (k + 1) % ringPts;
      const a0 = rowA + k;
      const a1 = rowA + kn;
      const b0 = rowB + k;
      const b1 = rowB + kn;
      indices.push(a0, a1, b1);
      indices.push(a0, b1, b0);
    }
  }

  // Cap front (section 0, facing -Z) & stern (last section, facing +Z)
  const frontCenterIdx = positions.length / 3;
  const s0 = sections[0];
  positions.push(0, (s0.topY + s0.bottomY) * 0.5, s0.z);
  uvs.push(0.5, 0.5);
  for (let k = 0; k < ringPts; k++) {
    const kn = (k + 1) % ringPts;
    indices.push(frontCenterIdx, kn, k);
  }

  const backCenterIdx = positions.length / 3;
  const sLast = sections[sections.length - 1];
  const lastRow = (sections.length - 1) * ringPts;
  positions.push(0, (sLast.topY + sLast.bottomY) * 0.5, sLast.z);
  uvs.push(0.5, 0.5);
  for (let k = 0; k < ringPts; k++) {
    const kn = (k + 1) % ringPts;
    indices.push(backCenterIdx, lastRow + k, lastRow + kn);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper to create a sculpted beveled horizontal plate/wing extruded along Y from an (X, Z) polygon.
 */
function createBeveledHorizontalPlate(
  pointsXZ: [number, number][],
  thickness: number,
  bevelSize = 0.08,
  bevelThickness = 0.06,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(pointsXZ[0][0], -pointsXZ[0][1]);
  for (let i = 1; i < pointsXZ.length; i++) {
    shape.lineTo(pointsXZ[i][0], -pointsXZ[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize,
    bevelThickness,
  });
  // Rotate so shape X stays X, shape Y becomes -Z (forward), extrude depth becomes +Y
  geo.rotateX(-Math.PI / 2);
  geo.center();
  geo.computeVertexNormals();
  normalizePlateUVs(geo, 0.22);
  return geo;
}

/**
 * Helper to create a sculpted vertical fin/stabilizer extruded along X from a (Z, Y) profile.
 */
function createBeveledVerticalFin(
  pointsZY: [number, number][],
  thickness: number,
  bevelSize = 0.03,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(pointsZY[0][0], pointsZY[0][1]);
  for (let i = 1; i < pointsZY.length; i++) {
    shape.lineTo(pointsZY[i][0], pointsZY[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize,
    bevelThickness: bevelSize,
  });
  geo.rotateY(Math.PI / 2);
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * Custom GLSL shader for realistic tapered plasma engine exhaust plumes with shock-diamond modulation.
 * Zero flat white circles — smooth radial falloff, lengthwise fade, and subtle plasma turbulence.
 */
function createPlasmaPlumeMaterial(
  coreColorHex: number,
  outerColorHex: number,
  isInnerCore: boolean,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uThrust: { value: 0.45 },
      uCoreColor: { value: new THREE.Color(coreColorHex) },
      uOuterColor: { value: new THREE.Color(outerColorHex) },
      uIsInner: { value: isInnerCore ? 1.0 : 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uThrust;
      uniform vec3 uCoreColor;
      uniform vec3 uOuterColor;
      uniform float uIsInner;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        // vUv.y = 1.0 at wide nozzle throat (z = 0), 0.0 at pointed tail tip (z = +length)
        float axial = clamp(vUv.y, 0.0, 1.0);
        // Smooth feather at both tail tip (0.0) and nozzle lip (1.0) so ZERO hard circular edges ever appear
        float tipFade = smoothstep(0.0, 0.34, axial) * pow(axial, mix(1.35, 1.05, uIsInner));
        float rootSoft = smoothstep(1.0, 0.88, axial);
        // Soft fresnel radial falloff so cylinder silhouettes look volumetric from every camera angle
        float ndv = abs(dot(normalize(vNormal), normalize(vViewDir)));
        float edgeSoft = pow(clamp(ndv, 0.0, 1.0), mix(1.65, 1.05, uIsInner));

        // Subtle Mach shock-diamond bands streaming aft
        float wave = 0.84 + 0.16 * sin((1.0 - axial) * 22.0 - uTime * 34.0);
        float flicker = 0.94 + 0.06 * sin(uTime * 52.0 + vUv.x * 6.2831);

        vec3 col = mix(uOuterColor, uCoreColor, pow(axial, 1.25) * (0.55 + 0.45 * uIsInner));
        float intensity = (0.38 + 0.9 * uThrust) * wave * flicker;
        float alpha = tipFade * rootSoft * edgeSoft * mix(0.68, 0.94, uIsInner) * clamp(0.30 + uThrust * 0.82, 0.0, 1.0);
        gl_FragColor = vec4(col * intensity, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Layer 1: Multi-layered GPU-driven white-blue core plasma exhaust particle stream.
 * Streams high-velocity plasma particles aft with Mach shock-diamond pinching and soft radial gaussian glow.
 */
function createPlasmaStreamGeometry(particleCount = 54): THREE.BufferGeometry {
  const positions = new Float32Array(particleCount * 3);
  const phases = new Float32Array(particleCount);
  const seeds = new Float32Array(particleCount);
  const radials = new Float32Array(particleCount * 2);

  for (let i = 0; i < particleCount; i++) {
    const ang = ((i * 2.399963) % (Math.PI * 2));
    const r = Math.sqrt(((i * 0.6180339) % 1.0)) * 0.28;
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    phases[i] = i / particleCount;
    seeds[i] = ((i * 19.73) % 1.0);
    radials[i * 2] = Math.cos(ang) * r;
    radials[i * 2 + 1] = Math.sin(ang) * r;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aRadial', new THREE.BufferAttribute(radials, 2));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 5.5), 9.0);
  return geo;
}

function createPlasmaStreamMaterial(
  coreHex: number,
  midHex: number,
  outerHex: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uThrust: { value: 0.45 },
      uBoost: { value: 0.0 },
      uCoreColor: { value: new THREE.Color(coreHex) },
      uMidColor: { value: new THREE.Color(midHex) },
      uOuterColor: { value: new THREE.Color(outerHex) },
    },
    vertexShader: `
      attribute float aPhase;
      attribute float aSeed;
      attribute vec2 aRadial;
      uniform float uTime;
      uniform float uThrust;
      uniform float uBoost;
      varying float vAge;
      varying float vSeed;

      void main() {
        float flowSpeed = mix(1.9, 4.6, clamp(uThrust, 0.0, 1.5)) + uBoost * 1.4;
        float age = fract(aPhase + uTime * flowSpeed);
        vAge = age;
        vSeed = aSeed;

        float streamLen = mix(2.2, 6.8, clamp(uThrust, 0.0, 1.5)) + uBoost * 2.4;
        // Mach shock-diamond radial pinch along the core stream
        float diamondPinch = 0.56 + 0.44 * abs(sin(age * 12.566 - uTime * 8.0));
        float spread = mix(0.52, 0.96, pow(age, 1.1)) * diamondPinch;
        float jitter = (aSeed - 0.5) * 0.09 * age * (1.0 + uBoost * 0.65);

        vec3 localPos = vec3(
          aRadial.x * spread + sin(uTime * 16.0 + aSeed * 18.0) * jitter,
          aRadial.y * spread + cos(uTime * 15.0 + aSeed * 21.0) * jitter,
          0.74 + age * streamLen
        );

        vec4 mvPos = modelViewMatrix * vec4(localPos, 1.0);
        float baseSize = mix(28.0, 52.0, clamp(uThrust, 0.0, 1.4)) * (1.0 + uBoost * 0.38);
        float ageScale = mix(1.22, 0.34, pow(age, 0.88)) * (0.8 + aSeed * 0.4);
        gl_PointSize = clamp((baseSize * ageScale) / max(1.0, -mvPos.z), 2.0, 72.0);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uCoreColor;
      uniform vec3 uMidColor;
      uniform vec3 uOuterColor;
      uniform float uThrust;
      uniform float uBoost;
      varying float vAge;
      varying float vSeed;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d2 = dot(uv, uv);
        if (d2 > 0.25) discard;

        // Soft volumetric plasma kernel — bright white-blue core with smooth radial halo
        float core = exp(-d2 * 26.0);
        float halo = exp(-d2 * 8.8);
        float fadeIn = smoothstep(0.0, 0.07, vAge);
        float fadeOut = pow(1.0 - vAge, 1.22);

        vec3 col = mix(uCoreColor, uMidColor, smoothstep(0.05, 0.45, vAge));
        col = mix(col, uOuterColor, smoothstep(0.42, 0.95, vAge));
        col += uCoreColor * core * (0.78 + uBoost * 0.58);

        float alpha = (core * 0.92 + halo * 0.48) * fadeIn * fadeOut * clamp(0.45 + uThrust * 0.55 + uBoost * 0.35, 0.0, 1.2);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/**
 * Layer 2: Trailing thermal heat-distortion shimmer wake behind the plasma core.
 * Renders cohesive, soft turbulent thermal vapor wisps with wavy refractive shimmer and warm-cyan dispersion.
 */
function createHeatDistortionMaterial(tintHex: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uThrust: { value: 0.45 },
      uBoost: { value: 0.0 },
      uTint: { value: new THREE.Color(tintHex) },
    },
    vertexShader: `
      attribute float aPhase;
      attribute float aSeed;
      attribute vec2 aRadial;
      uniform float uTime;
      uniform float uThrust;
      uniform float uBoost;
      varying float vAge;
      varying float vSeed;

      void main() {
        float flowSpeed = mix(1.35, 2.95, clamp(uThrust, 0.0, 1.5)) + uBoost * 0.95;
        float age = fract(aPhase + uTime * flowSpeed);
        vAge = age;
        vSeed = aSeed;

        float trailLen = mix(3.4, 8.4, clamp(uThrust, 0.0, 1.5)) + uBoost * 3.2;
        float swayAmp = (0.06 + age * 0.28) * (1.0 + uBoost * 0.45);
        float waveX = sin(uTime * 11.5 + age * 8.5 + aSeed * 12.56) * swayAmp;
        float waveY = cos(uTime * 9.8 + age * 7.8 + aSeed * 15.7) * swayAmp;

        vec3 localPos = vec3(
          aRadial.x * (0.75 + age * 1.15) + waveX,
          aRadial.y * (0.75 + age * 1.15) + waveY,
          1.25 + age * trailLen
        );

        vec4 mvPos = modelViewMatrix * vec4(localPos, 1.0);
        float size = mix(36.0, 74.0, clamp(uThrust, 0.0, 1.5)) * (0.68 + age * 0.92) * (1.0 + uBoost * 0.35);
        gl_PointSize = clamp(size / max(1.0, -mvPos.z), 4.0, 82.0);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uThrust;
      uniform float uBoost;
      uniform vec3 uTint;
      varying float vAge;
      varying float vSeed;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d2 = dot(uv, uv);
        if (d2 > 0.25) discard;

        // Smooth Gaussian thermal cloud — zero hard rings or bubbles, modulated by wavy heat shimmer
        float softCloud = exp(-d2 * 13.5) * smoothstep(0.25, 0.05, d2);
        float shimmerWave = 0.72 + 0.28 * sin(uv.y * 15.0 - uTime * 18.0 + vSeed * 16.0 + uv.x * 7.0)
                                        * cos(uv.x * 12.0 + uTime * 13.0 + vSeed * 9.0);
        float axialEnv = smoothstep(0.0, 0.16, vAge) * pow(1.0 - vAge, 1.45);

        // Subtle refractive heat-haze tint (cool ionized plasma -> warm amber thermal shimmer in wake)
        vec3 warmShimmer = vec3(0.92, 0.68, 0.44);
        vec3 col = mix(uTint, warmShimmer, smoothstep(0.28, 0.92, vAge) * (0.32 + uBoost * 0.22));
        float alpha = softCloud * shimmerWave * axialEnv * (0.14 + uThrust * 0.16 + uBoost * 0.14);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/**
 * AAA SCULPTED PLAYABLE SPACECRAFT SYSTEM (5 DISTINCT AEROSPACE SILHOUETTES)
 * Inspired by realistic stealth starfighter engineering:
 * - Sculpted multi-layer beveled fuselages, swept delta/forward wings, recessed vents & panel seams
 * - Tinted faceted glass canopy with interior pilot silhouette
 * - Recessed metallic LatheGeometry exhaust nozzles + custom GLSL layered plasma plumes (zero glowing white discs!)
 * - 90% Battlefield / 10% Cockpit view with slim lower coaming & ultra-thin canopy rails
 * - Progressive visible combat damage states (scorch, sparks, smoke, thruster sputter)
 */
export function buildValkyrieSpacecraft(mats: WorldMaterialLibrary): ValkyrieSpacecraft {
  const root = new THREE.Group();
  root.name = 'Vanguard_Playable_Spacecraft';

  const geos: THREE.BufferGeometry[] = [];
  const localMats: THREE.Material[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    localMats.push(m);
    return m;
  };

  const exteriorRoot = new THREE.Group();
  exteriorRoot.name = 'Spacecraft_ExteriorRoot';
  // Uniform 1.42x visual scale so all 5 player spacecraft classes feel substantial & finely readable in chase view
  exteriorRoot.scale.setScalar(1.42);
  root.add(exteriorRoot);

  const trackedHullMats: Array<{ mat: THREE.MeshPhysicalMaterial; baseColor: THREE.Color }> = [];
  const trackedTrimMats: Array<{ mat: THREE.MeshStandardMaterial; baseColor: THREE.Color }> = [];
  const tmpAccentColor = new THREE.Color();
  const tmpTrimColor = new THREE.Color();
  const tmpStealthColor = new THREE.Color(0x1f2433);

  // Shared realistic aerospace materials derived from our machined PBR hull pack
  const makeHullVariant = (tintHex: number, metalness = 0.78, roughness = 0.36) => {
    const mat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: tintHex,
        map: mats.playerHullPrimary.map,
        normalMap: mats.playerHullPrimary.normalMap,
        normalScale: new THREE.Vector2(0.95, 0.95),
        roughnessMap: mats.playerHullPrimary.roughnessMap,
        roughness,
        metalness,
        clearcoat: 0.26,
        clearcoatRoughness: 0.28,
        envMapIntensity: 1.25,
      }),
    );
    trackedHullMats.push({ mat, baseColor: new THREE.Color(tintHex) });
    return mat;
  };

  const makeMilitaryTrimMat = (hex: number) => {
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        color: hex,
        map: mats.playerHullPrimary.map,
        normalMap: mats.playerHullPrimary.normalMap,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughness: 0.44,
        metalness: 0.52,
        envMapIntensity: 0.95,
      }),
    );
    trackedTrimMats.push({ mat, baseColor: new THREE.Color(hex) });
    return mat;
  };

  const canopyGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x15283a,
      roughness: 0.06,
      metalness: 0.24,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.85,
      depthWrite: false,
    }),
  );

  const canopyHudGlassMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38d9a9,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );

  const darkRecessMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0e1218,
      roughness: 0.84,
      metalness: 0.45,
    }),
  );

  const navRedMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xe6453c }),
  );
  const navGreenMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x2fc78c }),
  );
  const navWhiteMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xc2d4ea }),
  );

  const leftMuzzle = new THREE.Object3D();
  const rightMuzzle = new THREE.Object3D();
  leftMuzzle.position.set(-4.15, 1.46, -4.1);
  rightMuzzle.position.set(4.15, 1.46, -4.1);
  root.add(leftMuzzle, rightMuzzle);

  // Shared LatheGeometry machined thruster nozzle bell (recessed turbine cavity + vectoring petals)
  const nozzleOuterGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.54, 0.0),
        new THREE.Vector2(0.60, 0.34),
        new THREE.Vector2(0.55, 0.86),
        new THREE.Vector2(0.42, 1.32),
        new THREE.Vector2(0.36, 1.28),
        new THREE.Vector2(0.45, 0.84),
        new THREE.Vector2(0.47, 0.12),
      ],
      20,
    ),
  );
  nozzleOuterGeo.rotateX(Math.PI / 2);

  // Tapered open-ended plasma cones oriented strictly AFT (+Z):
  // rotateX(-PI/2) puts radiusTop (wide, vUv.y = 1.0) at z = 0 (nozzle throat)
  // and radiusBottom (pointed tip, vUv.y = 0.0) at z = +length (far aft).
  const outerPlumeGeo = trackGeo(new THREE.CylinderGeometry(0.35, 0.014, 3.9, 20, 8, true));
  outerPlumeGeo.rotateX(-Math.PI / 2);
  outerPlumeGeo.translate(0, 0, 1.95);

  const innerPlumeGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.008, 2.5, 16, 6, true));
  innerPlumeGeo.rotateX(-Math.PI / 2);
  innerPlumeGeo.translate(0, 0, 1.25);

  const turbineRingGeo = trackGeo(new THREE.TorusGeometry(0.30, 0.036, 10, 20));
  const petalGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.035, 0.56));
  const navLensGeo = trackGeo(new THREE.SphereGeometry(0.052, 8, 6));
  navLensGeo.scale(0.75, 0.52, 1.45);

  const outerPlumeMat = trackMat(createPlasmaPlumeMaterial(0xbdeeff, 0x1e88e5, false));
  const innerPlumeMat = trackMat(createPlasmaPlumeMaterial(0xf2fbff, 0x5cc8ff, true));
  const plasmaStreamGeo = trackGeo(createPlasmaStreamGeometry(54));
  const heatDistortionGeo = trackGeo(createPlasmaStreamGeometry(34));
  const plasmaStreamMat = trackMat(createPlasmaStreamMaterial(0xf5fbff, 0x6cd4ff, 0x1d7fe8));
  const heatDistortionMat = trackMat(createHeatDistortionMaterial(0x7cc8ff));
  const turbineGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x56c8ff,
      transparent: true,
      opacity: 0.72,
    }),
  );

  // Layer 3: Dynamic engine exhaust lights — tail bounce + dorsal-aft boost fuselage illumination
  const engineLight = new THREE.PointLight(0x4cb8ff, 3.0, 20, 1.75);
  engineLight.position.set(0, 1.65, 5.35);
  exteriorRoot.add(engineLight);

  // Dedicated dynamic boost illumination light casting plasma glow across rear dorsal hull,
  // engine nacelles, and canted stabilizers during Boost / Supercruise
  const boostFuselageLight = new THREE.PointLight(0x7cd4ff, 0.85, 16, 1.55);
  boostFuselageLight.position.set(0, 3.15, 2.25);
  exteriorRoot.add(boostFuselageLight);

  const allThrusters: ThrusterAssembly[] = [];
  const navStrobes: THREE.Mesh[] = [];

  const attachRealisticThruster = (
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
    scale = 1.0,
  ) => {
    const mount = new THREE.Group();
    mount.position.set(x, y, z);
    mount.scale.setScalar(scale);

    // Outer machined titanium nozzle shell
    const nozzle = new THREE.Mesh(nozzleOuterGeo, mats.thrusterNozzleMetal);
    mount.add(nozzle);

    // 8 articulated exterior vectoring actuator petals around nozzle exhaust collar
    for (let p = 0; p < 8; p++) {
      const ang = (p / 8) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, mats.playerHullDarkComposite);
      petal.position.set(Math.cos(ang) * 0.49, Math.sin(ang) * 0.49, 0.96);
      petal.rotation.z = ang + Math.PI / 2;
      petal.rotation.x = 0.16;
      mount.add(petal);
    }

    // Deep dark recessed turbine chamber backplate (stops hollow see-through, zero white disc!)
    const recessBack = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.39, 0.39, 0.14, 16)),
      darkRecessMat,
    );
    recessBack.rotation.x = Math.PI / 2;
    recessBack.position.z = 0.24;
    mount.add(recessBack);

    // Recessed turbine stator vanes inside nozzle
    for (let b = 0; b < 6; b++) {
      const spoke = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.68, 0.04, 0.05)),
        mats.thrusterNozzleMetal,
      );
      spoke.position.z = 0.36;
      spoke.rotation.z = (b / 6) * Math.PI;
      mount.add(spoke);
    }

    // Heat-tinted internal annular glow ring recessed deep inside nozzle throat
    const innerGlowRing = new THREE.Mesh(turbineRingGeo, turbineGlowMat);
    innerGlowRing.position.z = 0.46;
    mount.add(innerGlowRing);

    // Subtle inner throat glow plumes anchored inside nozzle + multi-layered particle exhaust system
    const outerPlume = new THREE.Mesh(outerPlumeGeo, outerPlumeMat);
    outerPlume.position.z = 0.88;
    mount.add(outerPlume);

    const innerCore = new THREE.Mesh(innerPlumeGeo, innerPlumeMat);
    innerCore.position.z = 0.80;
    mount.add(innerCore);

    // Layer 1: High-velocity core white-blue plasma particle stream
    const plasmaParticles = new THREE.Points(plasmaStreamGeo, plasmaStreamMat);
    plasmaParticles.frustumCulled = false;
    plasmaParticles.renderOrder = 3;
    mount.add(plasmaParticles);

    // Layer 2: Trailing thermal heat-distortion shimmer wake
    const heatDistortionParticles = new THREE.Points(heatDistortionGeo, heatDistortionMat);
    heatDistortionParticles.frustumCulled = false;
    heatDistortionParticles.renderOrder = 2;
    mount.add(heatDistortionParticles);

    parent.add(mount);
    allThrusters.push({
      outerPlume,
      innerCore,
      innerGlowRing,
      plasmaParticles,
      heatDistortionParticles,
      baseScale: scale,
    });
  };

  /**
   * Builds a sculpted faceted cockpit canopy with recessed tub, HUD combiner, pilot seat, and helmet silhouette.
   */
  const addSculptedCanopy = (
    parent: THREE.Group,
    zPos: number,
    yPos: number,
    lengthScale = 1.0,
    widthScale = 1.0,
  ) => {
    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(0, yPos, zPos);

    // Recessed cockpit tub + beveled rim coaming
    const tub = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.18 * widthScale, 0.34, 3.05 * lengthScale)),
      darkRecessMat,
    );
    tub.position.y = -0.14;
    canopyGroup.add(tub);

    // Interior optical HUD glass pane ahead of pilot
    const hudGlass = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.32 * widthScale, 0.22)),
      canopyHudGlassMat,
    );
    hudGlass.position.set(0, 0.16, -0.58 * lengthScale);
    hudGlass.rotation.x = -0.32;
    canopyGroup.add(hudGlass);

    // Pilot headrest + armored ejection seat + flight helmet silhouette visible through tinted glass
    const seatBack = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.46, 0.56, 0.16)),
      mats.playerHullDarkComposite,
    );
    seatBack.position.set(0, 0.14, 0.55 * lengthScale);
    seatBack.rotation.x = -0.18;
    canopyGroup.add(seatBack);

    const pilotShoulders = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.5, 0.24, 0.28)),
      mats.playerHullDarkComposite,
    );
    pilotShoulders.position.set(0, 0.04, 0.24 * lengthScale);
    canopyGroup.add(pilotShoulders);

    const pilotHelmet = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.16, 12, 10)),
      mats.playerHullPrimary,
    );
    pilotHelmet.position.set(0, 0.28, 0.2 * lengthScale);
    canopyGroup.add(pilotHelmet);

    const pilotVisor = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.13, 10, 8)),
      mats.kaelHelmetVisor,
    );
    pilotVisor.position.set(0, 0.28, 0.12 * lengthScale);
    canopyGroup.add(pilotVisor);

    // Faceted stealth bubble canopy glass (sleek tapered profile, proper renderOrder)
    const glassGeo = trackGeo(new THREE.SphereGeometry(0.68, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.54));
    glassGeo.scale(0.95 * widthScale, 0.84, 2.55 * lengthScale);
    const glass = new THREE.Mesh(glassGeo, canopyGlassMat);
    glass.position.set(0, -0.02, -0.05);
    glass.renderOrder = 2;
    canopyGroup.add(glass);

    // Machined metallic canopy frame arches & side sills
    const archBow = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.64 * widthScale, 0.045, 8, 16, Math.PI)),
      mats.playerHullDarkComposite,
    );
    archBow.position.set(0, 0.02, -0.68 * lengthScale);
    archBow.rotation.x = 0.26;
    canopyGroup.add(archBow);

    const midBow = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.65 * widthScale, 0.036, 8, 16, Math.PI)),
      mats.playerHullDarkComposite,
    );
    midBow.position.set(0, 0.03, 0.06 * lengthScale);
    canopyGroup.add(midBow);

    const rearBow = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.62 * widthScale, 0.05, 8, 16, Math.PI)),
      mats.playerHullDarkComposite,
    );
    rearBow.position.set(0, 0.02, 0.85 * lengthScale);
    rearBow.rotation.x = -0.22;
    canopyGroup.add(rearBow);

    parent.add(canopyGroup);
  };

  /**
   * Builds a multi-barrel integrated aerospace autocannon / laser hardpoint.
   */
  const addWeaponHardpoint = (
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
    length = 2.6,
    dualBarrel = false,
  ) => {
    const wp = new THREE.Group();
    wp.position.set(x, y, z);

    const shroud = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32, 0.24, length * 0.54)),
      mats.playerHullDarkComposite,
    );
    shroud.position.z = length * 0.14;
    wp.add(shroud);

    const pylonStrut = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.22, length * 0.36)),
      mats.thrusterNozzleMetal,
    );
    pylonStrut.position.set(0, 0.16, length * 0.14);
    wp.add(pylonStrut);

    const offsets = dualBarrel ? [-0.075, 0.075] : [0];
    const barrelGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.052, length, 8));
    barrelGeo.rotateX(Math.PI / 2);
    const tipGeo = trackGeo(new THREE.CylinderGeometry(0.054, 0.054, 0.22, 8));
    tipGeo.rotateX(Math.PI / 2);

    for (const ox of offsets) {
      const barrel = new THREE.Mesh(barrelGeo, mats.thrusterNozzleMetal);
      barrel.position.set(ox, 0, -length * 0.34);
      wp.add(barrel);

      const brake = new THREE.Mesh(tipGeo, mats.weaponGunmetal);
      brake.position.set(ox, 0, -length * 0.82);
      wp.add(brake);
    }

    parent.add(wp);
  };

  // Sleek recessed aerodynamic nav lenses (ZERO floating white boxes!)
  const addNavStrobe = (parent: THREE.Group, x: number, y: number, z: number, side: 'L' | 'R' | 'T') => {
    const mat = side === 'L' ? navRedMat : side === 'R' ? navGreenMat : navWhiteMat;
    const lamp = new THREE.Mesh(navLensGeo, mat);
    lamp.position.set(x, y, z);
    parent.add(lamp);
    navStrobes.push(lamp);
  };

  // =========================================================================
  // BUILD ALL 5 SCULPTED PLAYABLE SPACECRAFT SILHOUETTES
  // =========================================================================
  const shipGroups: Record<PlayableShipId, THREE.Group> = {
    light_interceptor: new THREE.Group(),
    heavy_fighter: new THREE.Group(),
    strike_bomber: new THREE.Group(),
    recon_craft: new THREE.Group(),
    advanced_prototype: new THREE.Group(),
  };

  // -------------------------------------------------------------------------
  // 1. VX-94 VALKYRIE — Sculpted Lofted Stealth Starfighter (Zero floating parts!)
  // Exact unshifted Z coordinates: sharp nosecone at z = -7.25 -> twin nozzles at z = +4.0
  // -------------------------------------------------------------------------
  {
    const g = shipGroups.light_interceptor;
    g.name = 'Ship_VX94_Valkyrie';
    const hullMain = trackMat(mats.playerHullPrimary.clone());
    trackedHullMats.push({ mat: hullMain, baseColor: hullMain.color.clone() });
    const hullDark = mats.playerHullDarkComposite;
    const hullCrimson = trackMat(mats.playerHullCrimsonTrim.clone());
    trackedTrimMats.push({ mat: hullCrimson, baseColor: hullCrimson.color.clone() });

    // 1. Seamless sculpted 8-facet stealth fuselage lofted from razor nosecone to stern
    const fuselageGeo = trackGeo(
      createLoftedAerospaceFuselage([
        { z: -7.25, halfWidth: 0.05, topY: 1.56, bottomY: 1.48, chineY: 1.52, deckFrac: 0.4, bellyFrac: 0.4 },
        { z: -5.85, halfWidth: 0.56, topY: 1.76, bottomY: 1.32, chineY: 1.50, deckFrac: 0.48, bellyFrac: 0.45 },
        { z: -3.65, halfWidth: 1.18, topY: 2.02, bottomY: 1.14, chineY: 1.48, deckFrac: 0.56, bellyFrac: 0.52 },
        { z: -1.10, halfWidth: 1.66, topY: 2.18, bottomY: 1.06, chineY: 1.48, deckFrac: 0.62, bellyFrac: 0.58 },
        { z: 1.75, halfWidth: 1.74, topY: 2.12, bottomY: 1.10, chineY: 1.48, deckFrac: 0.64, bellyFrac: 0.60 },
        { z: 3.55, halfWidth: 1.44, topY: 1.94, bottomY: 1.22, chineY: 1.50, deckFrac: 0.68, bellyFrac: 0.64 },
        { z: 4.10, halfWidth: 1.18, topY: 1.84, bottomY: 1.28, chineY: 1.52, deckFrac: 0.72, bellyFrac: 0.68 },
      ]),
    );
    g.add(new THREE.Mesh(fuselageGeo, hullMain));

    // 2. Sculpted dark composite dorsal spine fairing & cooling louvre ridge
    const spineGeo = trackGeo(
      createLoftedAerospaceFuselage([
        { z: -1.05, halfWidth: 0.52, topY: 2.34, bottomY: 2.04, chineY: 2.14, deckFrac: 0.55 },
        { z: 0.85, halfWidth: 0.84, topY: 2.38, bottomY: 2.02, chineY: 2.15, deckFrac: 0.62 },
        { z: 2.85, halfWidth: 0.66, topY: 2.22, bottomY: 1.90, chineY: 2.02, deckFrac: 0.60 },
        { z: 3.85, halfWidth: 0.36, topY: 1.96, bottomY: 1.76, chineY: 1.84, deckFrac: 0.50 },
      ]),
    );
    g.add(new THREE.Mesh(spineGeo, hullDark));

    // 3. Recessed nose radar radome collar & flush military squadron chevron stripe
    const radomeTip = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.18, 0.88, 8)),
      hullDark,
    );
    radomeTip.rotation.x = -Math.PI / 2;
    radomeTip.position.set(0, 1.52, -7.25);
    g.add(radomeTip);

    // Pitot sensor probe firmly seated INSIDE the radome tip (zero floating gap!)
    const pitot = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.022, 0.055, 1.15, 8)),
      mats.thrusterNozzleMetal,
    );
    pitot.rotation.x = Math.PI / 2;
    pitot.position.set(0, 1.52, -7.75);
    g.add(pitot);

    const noseStripeGeo = trackGeo(
      createBeveledHorizontalPlate(
        [
          [0, -5.6],
          [0.34, -4.35],
          [0.58, -3.15],
          [0.30, -3.15],
          [0, -4.55],
          [-0.30, -3.15],
          [-0.58, -3.15],
          [-0.34, -4.35],
        ],
        0.05,
        0.015,
        0.015,
      ),
    );
    const noseStripe = new THREE.Mesh(noseStripeGeo, hullCrimson);
    noseStripe.position.set(0, 1.85, -4.35);
    noseStripe.rotation.x = -0.115;
    g.add(noseStripe);

    // 4. Sculpted swept delta wings seamlessly rooted inside fuselage flanks (zero gaps)
    const rightWingGeo = trackGeo(
      createBeveledHorizontalPlate(
        [
          [0.0, -2.55],
          [1.65, -1.60],
          [4.65, 0.78],
          [4.95, 2.02],
          [3.75, 2.38],
          [1.20, 1.72],
          [0.0, 2.22],
        ],
        0.18,
        0.05,
        0.045,
      ),
    );
    const rightWing = new THREE.Mesh(rightWingGeo, hullMain);
    rightWing.position.set(3.42, 1.48, 0.45);
    rightWing.rotation.z = -0.045;
    g.add(rightWing);

    const leftWing = rightWing.clone();
    leftWing.scale.x = -1;
    leftWing.position.x = -3.42;
    leftWing.rotation.z = 0.045;
    g.add(leftWing);

    // Layered dark composite wing root fairings, angled intakes, tail fins, hardpoints & nozzles
    const cuffGeo = trackGeo(
      createBeveledHorizontalPlate(
        [
          [0, -1.55],
          [2.25, 0.25],
          [2.15, 1.25],
          [0, 0.95],
        ],
        0.08,
        0.025,
        0.02,
      ),
    );
    for (const s of [-1, 1]) {
      const cuff = new THREE.Mesh(cuffGeo, hullDark);
      cuff.position.set(s * 2.48, 1.62, 0.52);
      if (s < 0) cuff.scale.x = -1;
      g.add(cuff);

      const stripe = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.95, 0.04, 0.34)),
        hullCrimson,
      );
      stripe.position.set(s * 3.85, 1.59, 1.25);
      stripe.rotation.y = s * -0.52;
      g.add(stripe);

      // Sleek beveled lateral engine intake nacelles integrated into fuselage chine
      const intakeNacelleGeo = trackGeo(
        createLoftedAerospaceFuselage([
          { z: -2.25, halfWidth: 0.34, topY: 1.76, bottomY: 1.18, chineY: 1.46, deckFrac: 0.72 },
          { z: -0.60, halfWidth: 0.44, topY: 1.84, bottomY: 1.14, chineY: 1.48, deckFrac: 0.76 },
          { z: 2.35, halfWidth: 0.48, topY: 1.84, bottomY: 1.16, chineY: 1.48, deckFrac: 0.78 },
          { z: 3.75, halfWidth: 0.42, topY: 1.78, bottomY: 1.22, chineY: 1.50, deckFrac: 0.76 },
        ]),
      );
      const intakeNacelle = new THREE.Mesh(intakeNacelleGeo, hullMain);
      intakeNacelle.position.set(s * 1.42, 0, 0);
      g.add(intakeNacelle);

      const intakeCavity = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.46, 0.40, 0.24)),
        darkRecessMat,
      );
      intakeCavity.position.set(s * 1.42, 1.47, -2.22);
      g.add(intakeCavity);

      // Canted twin stealth tail stabilizers seated cleanly on engine nacelles
      const finGeo = trackGeo(
        createBeveledVerticalFin(
          [
            [-1.35, 0],
            [0.85, 0],
            [1.45, 1.65],
            [0.45, 1.65],
          ],
          0.10,
          0.025,
        ),
      );
      const fin = new THREE.Mesh(finGeo, hullDark);
      fin.position.set(s * 1.72, 2.36, 2.55);
      fin.rotation.z = s * -0.34;
      g.add(fin);

      // Wingtip sensor pods + nav strobes
      const tipPod = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.22, 0.20, 1.62)),
        hullDark,
      );
      tipPod.position.set(s * 5.75, 1.40, 1.65);
      g.add(tipPod);
      addNavStrobe(g, s * 5.88, 1.42, 1.35, s < 0 ? 'L' : 'R');

      // Integrated 4-gun layout: inner chine cannons solidly rooted in fuselage shoulders + underwing dual cannons
      addWeaponHardpoint(g, s * 1.18, 1.28, -2.35, 2.15, false);
      addWeaponHardpoint(g, s * 3.55, 1.32, 0.15, 2.45, true);

      // Twin recessed vectoring thruster nozzles aligned cleanly with stern twin nacelles
      attachRealisticThruster(g, s * 0.92, 1.52, 3.45, 1.05);
    }

    // Additional VX-94 Valkyrie aerospace detailing: ventral ordnance keel, recessed heat vents,
    // dorsal comms blade antenna, nose IRST optical pod, and rear elevator control surfaces
    const ventralKeelGeo = trackGeo(
      createLoftedAerospaceFuselage([
        { z: -4.45, halfWidth: 0.38, topY: 1.24, bottomY: 1.02, chineY: 1.12, deckFrac: 0.72 },
        { z: -1.40, halfWidth: 0.72, topY: 1.16, bottomY: 0.90, chineY: 1.02, deckFrac: 0.74 },
        { z: 2.05, halfWidth: 0.68, topY: 1.18, bottomY: 0.94, chineY: 1.04, deckFrac: 0.72 },
        { z: 3.40, halfWidth: 0.42, topY: 1.26, bottomY: 1.08, chineY: 1.16, deckFrac: 0.65 },
      ]),
    );
    g.add(new THREE.Mesh(ventralKeelGeo, hullDark));

    // Nose IRST electro-optical sensor turret (subtle recessed ball ahead of canopy)
    const irstHousing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.14, 0.22, 10)),
      hullDark,
    );
    irstHousing.position.set(0, 1.98, -3.72);
    g.add(irstHousing);
    const irstLens = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.095, 10, 8)),
      mats.kaelHelmetVisor,
    );
    irstLens.position.set(0, 2.04, -3.75);
    g.add(irstLens);

    // Swept dorsal comms blade antenna & recessed radiator vent slats
    const commsBlade = new THREE.Mesh(
      trackGeo(
        createBeveledVerticalFin(
          [
            [-0.42, 0],
            [0.32, 0],
            [0.52, 0.56],
            [0.14, 0.56],
          ],
          0.045,
          0.012,
        ),
      ),
      hullDark,
    );
    commsBlade.position.set(0, 2.52, 1.25);
    g.add(commsBlade);

    for (let v = 0; v < 4; v++) {
      const ventSlat = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.86, 0.045, 0.16)),
        darkRecessMat,
      );
      ventSlat.position.set(0, 2.36 - v * 0.035, 1.85 + v * 0.34);
      g.add(ventSlat);
    }

    // Rear horizontal stabilators + wing flap trim strips + intake splitter plates
    const elevGeo = trackGeo(
      createBeveledHorizontalPlate(
        [
          [0, -0.55],
          [1.62, 0.28],
          [1.46, 0.92],
          [0, 0.72],
        ],
        0.09,
        0.025,
        0.02,
      ),
    );
    for (const s of [-1, 1]) {
      const elev = new THREE.Mesh(elevGeo, hullDark);
      elev.position.set(s * 2.18, 1.48, 3.25);
      elev.rotation.z = s * -0.06;
      if (s < 0) elev.scale.x = -1;
      g.add(elev);

      // Recessed metallic intake splitter vane inside each lateral air intake
      const splitter = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.05, 0.36, 0.48)),
        mats.thrusterNozzleMetal,
      );
      splitter.position.set(s * 1.42, 1.47, -2.18);
      g.add(splitter);

      // Subtle dark aileron trailing-edge trim along wings
      const aileron = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.15, 0.05, 0.24)),
        hullDark,
      );
      aileron.position.set(s * 3.82, 1.49, 2.12);
      aileron.rotation.y = s * -0.22;
      g.add(aileron);
    }

    addSculptedCanopy(g, -2.25, 2.02, 1.02, 0.94);
    addNavStrobe(g, 0, 2.39, 2.95, 'T');
  }

  // -------------------------------------------------------------------------
  // 2. A-12 IRONCLAD — Sculpted Lofted Twin-Boom Armored Heavy Gunship
  // -------------------------------------------------------------------------
  {
    const g = shipGroups.heavy_fighter;
    g.name = 'Ship_A12_Ironclad';
    const hullMain = makeHullVariant(0x636f7d, 0.82, 0.38);
    const hullDark = mats.playerHullDarkComposite;
    const trimAmber = makeMilitaryTrimMat(0xa6631c);

    // Sculpted wide armored lofted central fuselage
    const coreGeo = trackGeo(
      createLoftedAerospaceFuselage([
        { z: -5.85, halfWidth: 0.42, topY: 1.72, bottomY: 1.24, chineY: 1.48, deckFrac: 0.62 },
        { z: -4.20, halfWidth: 1.42, topY: 2.14, bottomY: 1.06, chineY: 1.50, deckFrac: 0.68 },
        { z: -1.10, halfWidth: 1.98, topY: 2.30, bottomY: 0.98, chineY: 1.52, deckFrac: 0.72 },
        { z: 2.40, halfWidth: 2.02, topY: 2.24, bottomY: 1.04, chineY: 1.52, deckFrac: 0.72 },
        { z: 4.05, halfWidth: 1.38, topY: 1.96, bottomY: 1.20, chineY: 1.52, deckFrac: 0.74 },
      ]),
    );
    g.add(new THREE.Mesh(coreGeo, hullMain));

    // Armored dorsal spine cowling
    const dorsalGeo = trackGeo(
      createLoftedAerospaceFuselage([
        { z: -1.25, halfWidth: 0.86, topY: 2.54, bottomY: 2.16, chineY: 2.32, deckFrac: 0.66 },
        { z: 1.65, halfWidth: 1.12, topY: 2.52, bottomY: 2.14, chineY: 2.30, deckFrac: 0.70 },
        { z: 3.45, halfWidth: 0.72, topY: 2.22, bottomY: 1.96, chineY: 2.08, deckFrac: 0.64 },
      ]),
    );
    g.add(new THREE.Mesh(dorsalGeo, hullDark));

    for (const s of [-1, 1]) {
      // Sculpted lofted armored weapon/engine booms
      const boomGeo = trackGeo(
        createLoftedAerospaceFuselage([
          { z: -5.85, halfWidth: 0.34, topY: 1.72, bottomY: 1.26, chineY: 1.50, deckFrac: 0.64 },
          { z: -3.20, halfWidth: 0.76, topY: 1.96, bottomY: 1.08, chineY: 1.50, deckFrac: 0.70 },
          { z: 2.60, halfWidth: 0.84, topY: 1.98, bottomY: 1.10, chineY: 1.50, deckFrac: 0.74 },
          { z: 3.75, halfWidth: 0.68, topY: 1.88, bottomY: 1.20, chineY: 1.50, deckFrac: 0.74 },
        ]),
      );
      const boom = new THREE.Mesh(boomGeo, hullMain);
      boom.position.set(s * 2.85, 0, 0);
      g.add(boom);

      // Armored bridge fairing linking booms solidly to central fuselage
      const bridgeFairing = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.65, 0.56, 3.85)),
        hullDark,
      );
      bridgeFairing.position.set(s * 1.95, 1.52, 0.35);
      g.add(bridgeFairing);

      const trimStrip = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.42, 0.08, 4.6)),
        trimAmber,
      );
      trimStrip.position.set(s * 2.85, 1.99, -0.4);
      g.add(trimStrip);

      // Stubby heavy-lift armored wings
      const wing = new THREE.Mesh(
        trackGeo(
          createBeveledHorizontalPlate(
            [
              [0, -1.4],
              [2.65, -0.3],
              [2.85, 1.4],
              [0, 1.65],
            ],
            0.30,
            0.07,
            0.05,
          ),
        ),
        hullDark,
      );
      wing.position.set(s * 4.55, 1.48, 0.75);
      if (s < 0) wing.scale.x = -1;
      g.add(wing);

      const tailFin = new THREE.Mesh(
        trackGeo(
          createBeveledVerticalFin(
            [
              [-1.1, 0],
              [0.9, 0],
              [1.2, 1.85],
              [0.1, 1.85],
            ],
            0.16,
          ),
        ),
        hullDark,
      );
      tailFin.position.set(s * 2.85, 2.58, 2.65);
      g.add(tailFin);

      addWeaponHardpoint(g, s * 2.85, 1.32, -5.4, 3.1, true);
      addWeaponHardpoint(g, s * 4.95, 1.38, -0.4, 2.6, false);
      addNavStrobe(g, s * 5.95, 1.5, 1.2, s < 0 ? 'L' : 'R');
      attachRealisticThruster(g, s * 2.85, 1.5, 3.35, 1.2);
    }

    attachRealisticThruster(g, 0, 1.55, 3.65, 1.05);
    addSculptedCanopy(g, -2.4, 2.28, 0.92, 1.12);
  }

  // -------------------------------------------------------------------------
  // 3. B-7 HAMMERHEAD — Sculpted Heavy Anti-Capital Strike Bomber
  // -------------------------------------------------------------------------
  {
    const g = shipGroups.strike_bomber;
    g.name = 'Ship_B7_Hammerhead';
    const hullMain = makeHullVariant(0x5a6359, 0.72, 0.44);
    const hullDark = mats.playerHullDarkComposite;
    const trimHazard = makeMilitaryTrimMat(0xb45309);

    // Sculpted lofted heavy fuselage with armored forward hammerhead ordnance bay
    const hullGeo = trackGeo(
      createLoftedAerospaceFuselage([
        { z: -5.45, halfWidth: 2.35, topY: 1.98, bottomY: 1.14, chineY: 1.54, deckFrac: 0.78 },
        { z: -3.20, halfWidth: 2.85, topY: 2.18, bottomY: 1.02, chineY: 1.54, deckFrac: 0.76 },
        { z: -1.40, halfWidth: 1.95, topY: 2.28, bottomY: 0.98, chineY: 1.54, deckFrac: 0.72 },
        { z: 2.50, halfWidth: 2.28, topY: 2.24, bottomY: 1.02, chineY: 1.56, deckFrac: 0.74 },
        { z: 4.35, halfWidth: 1.68, topY: 2.02, bottomY: 1.18, chineY: 1.56, deckFrac: 0.76 },
      ]),
    );
    g.add(new THREE.Mesh(hullGeo, hullMain));

    const bombBaySpine = new THREE.Mesh(
      trackGeo(
        createLoftedAerospaceFuselage([
          { z: -1.6, halfWidth: 1.05, topY: 2.54, bottomY: 2.18, chineY: 2.34, deckFrac: 0.70 },
          { z: 2.8, halfWidth: 1.25, topY: 2.50, bottomY: 2.14, chineY: 2.30, deckFrac: 0.72 },
          { z: 4.1, halfWidth: 0.85, topY: 2.18, bottomY: 1.94, chineY: 2.06, deckFrac: 0.68 },
        ]),
      ),
      hullDark,
    );
    g.add(bombBaySpine);

    // Broad swept heavy ordnance wings + underslung torpedo bays
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(
        trackGeo(
          createBeveledHorizontalPlate(
            [
              [0, -1.8],
              [4.2, 0.2],
              [4.4, 2.1],
              [0, 2.2],
            ],
            0.34,
            0.08,
            0.06,
          ),
        ),
        hullMain,
      );
      wing.position.set(s * 3.85, 1.52, 0.9);
      if (s < 0) wing.scale.x = -1;
      g.add(wing);

      const pod = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.56, 0.62, 4.8, 12)),
        hullDark,
      );
      pod.rotation.x = Math.PI / 2;
      pod.position.set(s * 3.55, 0.94, -0.35);
      g.add(pod);

      const podBand = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.59, 0.59, 0.48, 12)),
        trimHazard,
      );
      podBand.rotation.x = Math.PI / 2;
      podBand.position.set(s * 3.55, 0.94, -1.55);
      g.add(podBand);

      addWeaponHardpoint(g, s * 2.55, 1.52, -4.85, 2.6, true);
      addNavStrobe(g, s * 6.0, 1.55, 1.9, s < 0 ? 'L' : 'R');
      attachRealisticThruster(g, s * 1.48, 1.5, 4.05, 1.18);
    }

    attachRealisticThruster(g, 0, 1.62, 4.18, 1.28);
    addSculptedCanopy(g, -2.15, 2.30, 0.96, 1.18);
  }

  // -------------------------------------------------------------------------
  // 4. SR-4 SPECTER — Sculpted Lofted Stealth Recon Craft
  // -------------------------------------------------------------------------
  {
    const g = shipGroups.recon_craft;
    g.name = 'Ship_SR4_Specter';
    const hullMain = makeHullVariant(0x3a4654, 0.84, 0.30);
    const hullDark = mats.playerHullDarkComposite;
    const trimTeal = makeMilitaryTrimMat(0x1f6e5c);

    const needleGeo = trackGeo(
      createLoftedAerospaceFuselage([
        { z: -8.65, halfWidth: 0.04, topY: 1.58, bottomY: 1.50, chineY: 1.54, deckFrac: 0.42 },
        { z: -5.40, halfWidth: 0.54, topY: 1.78, bottomY: 1.34, chineY: 1.52, deckFrac: 0.50 },
        { z: -1.40, halfWidth: 1.16, topY: 2.04, bottomY: 1.18, chineY: 1.52, deckFrac: 0.56 },
        { z: 2.40, halfWidth: 1.38, topY: 1.98, bottomY: 1.22, chineY: 1.52, deckFrac: 0.62 },
        { z: 4.10, halfWidth: 0.96, topY: 1.82, bottomY: 1.32, chineY: 1.52, deckFrac: 0.68 },
      ]),
    );
    g.add(new THREE.Mesh(needleGeo, hullMain));

    // Dorsal stealth sensor keel
    const sensorFin = new THREE.Mesh(
      trackGeo(
        createBeveledVerticalFin(
          [
            [-1.8, 0],
            [1.6, 0],
            [2.1, 1.35],
            [-0.4, 1.1],
          ],
          0.12,
        ),
      ),
      hullDark,
    );
    sensorFin.position.set(0, 2.36, 1.65);
    g.add(sensorFin);

    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(
        trackGeo(
          createBeveledHorizontalPlate(
            [
              [0, -1.6],
              [5.4, 1.85],
              [5.1, 2.45],
              [0, 1.35],
            ],
            0.16,
            0.05,
            0.04,
          ),
        ),
        hullMain,
      );
      wing.position.set(s * 3.4, 1.52, 0.8);
      if (s < 0) wing.scale.x = -1;
      g.add(wing);

      const stripe = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.6, 0.04, 0.25)),
        trimTeal,
      );
      stripe.position.set(s * 3.4, 1.64, 1.15);
      stripe.rotation.y = s * -0.56;
      g.add(stripe);

      addWeaponHardpoint(g, s * 1.18, 1.34, -3.9, 2.4, false);
      addNavStrobe(g, s * 6.0, 1.52, 2.3, s < 0 ? 'L' : 'R');
      attachRealisticThruster(g, s * 0.72, 1.54, 3.6, 0.94);
    }

    addSculptedCanopy(g, -2.55, 1.98, 1.15, 0.84);
  }

  // -------------------------------------------------------------------------
  // 5. X-01 SOVEREIGN BANE — Sculpted Lofted Forward-Swept Prototype
  // -------------------------------------------------------------------------
  {
    const g = shipGroups.advanced_prototype;
    g.name = 'Ship_X01_SovereignBane';
    const hullMain = makeHullVariant(0x232d3f, 0.88, 0.26);
    const hullDark = mats.playerHullDarkComposite;
    const trimSteel = makeMilitaryTrimMat(0x2f5f9e);

    const bodyGeo = trackGeo(
      createLoftedAerospaceFuselage([
        { z: -7.65, halfWidth: 0.05, topY: 1.58, bottomY: 1.48, chineY: 1.52, deckFrac: 0.42 },
        { z: -4.85, halfWidth: 0.76, topY: 1.88, bottomY: 1.24, chineY: 1.52, deckFrac: 0.54 },
        { z: -1.35, halfWidth: 1.66, topY: 2.18, bottomY: 1.08, chineY: 1.52, deckFrac: 0.62 },
        { z: 2.35, halfWidth: 1.88, topY: 2.12, bottomY: 1.12, chineY: 1.52, deckFrac: 0.66 },
        { z: 4.25, halfWidth: 1.34, topY: 1.92, bottomY: 1.26, chineY: 1.54, deckFrac: 0.72 },
      ]),
    );
    g.add(new THREE.Mesh(bodyGeo, hullMain));

    // Sculpted lofted dorsal precision rail-cannon accelerator spine
    const railSpine = new THREE.Mesh(
      trackGeo(
        createLoftedAerospaceFuselage([
          { z: -1.45, halfWidth: 0.36, topY: 2.40, bottomY: 2.08, chineY: 2.22, deckFrac: 0.56 },
          { z: 1.55, halfWidth: 0.48, topY: 2.42, bottomY: 2.06, chineY: 2.22, deckFrac: 0.60 },
          { z: 3.85, halfWidth: 0.32, topY: 2.12, bottomY: 1.86, chineY: 1.98, deckFrac: 0.52 },
        ]),
      ),
      hullDark,
    );
    g.add(railSpine);

    for (const s of [-1, 1]) {
      // Forward-swept experimental stealth wings
      const fwdWing = new THREE.Mesh(
        trackGeo(
          createBeveledHorizontalPlate(
            [
              [0, 1.85],
              [4.75, -1.65],
              [4.45, -2.55],
              [0, -0.35],
            ],
            0.2,
            0.05,
            0.05,
          ),
        ),
        hullMain,
      );
      fwdWing.position.set(s * 3.7, 1.52, 0.25);
      if (s < 0) fwdWing.scale.x = -1;
      g.add(fwdWing);

      // Forward canards
      const canard = new THREE.Mesh(
        trackGeo(
          createBeveledHorizontalPlate(
            [
              [0, -0.65],
              [1.55, 0.15],
              [1.35, 0.72],
              [0, 0.55],
            ],
            0.12,
            0.03,
            0.03,
          ),
        ),
        trimSteel,
      );
      canard.position.set(s * 1.65, 1.56, -3.55);
      if (s < 0) canard.scale.x = -1;
      g.add(canard);

      const vFin = new THREE.Mesh(
        trackGeo(
          createBeveledVerticalFin(
            [
              [-1.2, 0],
              [0.9, 0],
              [1.5, 1.82],
              [0.4, 1.82],
            ],
            0.12,
          ),
        ),
        hullDark,
      );
      vFin.position.set(s * 1.55, 2.48, 2.85);
      vFin.rotation.z = s * -0.4;
      g.add(vFin);

      addWeaponHardpoint(g, s * 1.45, 1.28, -4.4, 2.8, true);
      addWeaponHardpoint(g, s * 5.25, 1.46, -1.6, 2.6, false);
      addNavStrobe(g, s * 5.95, 1.52, -1.5, s < 0 ? 'L' : 'R');
      attachRealisticThruster(g, s * 1.15, 1.52, 3.85, 1.04);
    }

    attachRealisticThruster(g, 0, 1.62, 4.05, 1.15);
    addSculptedCanopy(g, -2.35, 2.04, 1.05, 0.96);
  }

  for (const id of Object.keys(shipGroups) as PlayableShipId[]) {
    exteriorRoot.add(shipGroups[id]);
    shipGroups[id].visible = id === 'light_interceptor';
  }

  // =========================================================================
  // PROGRESSIVE COMBAT DAMAGE VISUALS (Scorch plates, sparks, engine smoke)
  // =========================================================================
  const damageGroup = new THREE.Group();
  damageGroup.name = 'Spacecraft_DamageFX';
  exteriorRoot.add(damageGroup);

  const scorchMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x100e0d,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  const scorchGeo = trackGeo(new THREE.PlaneGeometry(1.65, 1.25));
  const scorchLeft = new THREE.Mesh(scorchGeo, scorchMat);
  scorchLeft.rotation.x = -Math.PI / 2;
  scorchLeft.position.set(-1.35, 2.06, -0.35);
  const scorchRight = new THREE.Mesh(scorchGeo, scorchMat);
  scorchRight.rotation.x = -Math.PI / 2;
  scorchRight.position.set(1.55, 1.72, 0.85);
  damageGroup.add(scorchLeft, scorchRight);

  const damageSparks: { mesh: THREE.Mesh; offset: THREE.Vector3; phase: number }[] = [];
  const sparkMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffb347,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const sparkGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.08, 0.55));
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(sparkGeo, sparkMat);
    m.visible = false;
    damageGroup.add(m);
    damageSparks.push({
      mesh: m,
      offset: new THREE.Vector3(
        (i % 2 === 0 ? -1 : 1) * (1.2 + (i % 3) * 0.6),
        1.65 + (i % 2) * 0.25,
        -0.5 + i * 0.45,
      ),
      phase: i * 1.15,
    });
  }

  // Trailing engine damage smoke puffs when engineIntegrity < 72% or hull < 48%
  const smokeMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x262c36,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
  );
  const smokeGeo = trackGeo(new THREE.DodecahedronGeometry(0.42, 1));
  const damageSmoke: Array<{ mesh: THREE.Mesh; offset: THREE.Vector3; phase: number }> = [];
  for (let i = 0; i < 6; i++) {
    const sm = new THREE.Mesh(smokeGeo, smokeMat);
    sm.visible = false;
    damageGroup.add(sm);
    damageSmoke.push({
      mesh: sm,
      offset: new THREE.Vector3((i % 2 === 0 ? -1 : 1) * 1.35, 1.38, 3.6),
      phase: i / 6,
    });
  }

  // =========================================================================
  // 90% BATTLEFIELD / 10% COCKPIT RIG (Ultra-Clean Aerospace Fighter Canopy)
  // Camera sits at (0, 2.38, -2.02). Everything is strictly kept to the bottom ~10%
  // glare-shield edge and razor-thin outer frame rails so >= 90% of viewport is pure space!
  // =========================================================================
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'Spacecraft_Cockpit90_10';
  cockpitGroup.visible = false;
  root.add(cockpitGroup);

  const frameMetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x161b23,
      roughness: 0.42,
      metalness: 0.82,
    }),
  );
  const coamingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0d1117,
      roughness: 0.72,
      metalness: 0.48,
    }),
  );
  const avionicsGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x4cc9f0,
      transparent: true,
      opacity: 0.62,
    }),
  );
  const avionicsAmberMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.52,
    }),
  );

  // Slim matte glare-shield coaming tucked low at bottom ~9% of 60° vertical FOV
  // At distance dz = 1.65m ahead of cam (z = -3.67), bottom of 60° FOV is y = 2.38 - 1.65*tan(30°) = 1.43.
  // Placing top of coaming at y = 1.59 means coaming occupies ONLY bottom ~8.5% of screen!
  const lowerCoaming = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.35, 0.22, 0.72)),
    coamingMat,
  );
  lowerCoaming.position.set(0, 1.48, -3.68);
  lowerCoaming.rotation.x = 0.08;
  cockpitGroup.add(lowerCoaming);

  // Beveled central HUD combiner housing + ultra-subtle optical combiner glass (~8.5% height)
  const hudCombinerBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.56, 0.056, 0.32)),
    frameMetalMat,
  );
  hudCombinerBase.position.set(0, 1.58, -3.65);
  cockpitGroup.add(hudCombinerBase);

  const hudOpticalGlassMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38d9c0,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const hudOpticalGlass = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.46, 0.13)),
    hudOpticalGlassMat,
  );
  hudOpticalGlass.position.set(0, 1.66, -3.58);
  hudOpticalGlass.rotation.x = -0.34;
  cockpitGroup.add(hudOpticalGlass);

  for (const s of [-1, 1]) {
    const hudBracket = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.016, 0.135, 0.018)),
      mats.thrusterNozzleMetal,
    );
    hudBracket.position.set(s * 0.235, 1.66, -3.58);
    hudBracket.rotation.x = -0.34;
    cockpitGroup.add(hudBracket);
  }

  // Subtle recessed micro-avionics status light bars & tactical bezel along bottom glare-shield lip
  const leftStatusBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.42, 0.014, 0.015)),
    avionicsGlowMat,
  );
  leftStatusBar.position.set(-0.58, 1.56, -3.32);
  cockpitGroup.add(leftStatusBar);

  const rightStatusBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.42, 0.014, 0.015)),
    avionicsAmberMat,
  );
  rightStatusBar.position.set(0.58, 1.56, -3.32);
  cockpitGroup.add(rightStatusBar);

  // Razor-thin angled canopy A-pillar rails near outer viewport edges (keeps >= 90% open space!)
  const pillarGeo = trackGeo(new THREE.BoxGeometry(0.03, 1.82, 0.048));
  const pillarClampGeo = trackGeo(new THREE.BoxGeometry(0.052, 0.09, 0.068));
  for (const s of [-1, 1]) {
    const pillar = new THREE.Mesh(pillarGeo, frameMetalMat);
    pillar.position.set(s * 1.52, 2.35, -3.28);
    pillar.rotation.z = s * 0.22;
    pillar.rotation.x = -0.34;
    cockpitGroup.add(pillar);

    const clamp = new THREE.Mesh(pillarClampGeo, mats.thrusterNozzleMetal);
    clamp.position.set(s * 1.38, 1.84, -3.44);
    cockpitGroup.add(clamp);
  }

  // Very subtle upper canopy brow rim at top edge (barely grazes top 2% of frame for cockpit authenticity)
  const upperBrow = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.48, 0.042, 0.14)),
    frameMetalMat,
  );
  upperBrow.position.set(0, 3.24, -3.12);
  cockpitGroup.add(upperBrow);

  // Retractable landing gear struts (preserved for compatibility)
  const gearGroup = new THREE.Group();
  const gearMat = mats.thrusterNozzleMetal;
  const strutGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 1.15, 8));
  const gearOffsets: [number, number, number][] = [
    [0, 0.65, -3.2],
    [-1.75, 0.65, 1.5],
    [1.75, 0.65, 1.5],
  ];
  for (const [gx, gy, gz] of gearOffsets) {
    const strut = new THREE.Mesh(strutGeo, gearMat);
    strut.position.set(gx, gy, gz);
    gearGroup.add(strut);
  }
  gearGroup.visible = false;
  exteriorRoot.add(gearGroup);

  // =========================================================================
  // STATE & SMOOTH CINEMATIC CAMERA
  // =========================================================================
  let activeShipId: PlayableShipId = 'light_interceptor';
  let viewMode: SpaceCameraMode = 'chase';
  let thrustLevel = 0.4;
  let isBoosting = false;
  let isSupercruise = false;
  let hullRatioState = 1.0;
  let engineRatioState = 1.0;
  let shakeTrauma = 0;
  let shakeMultiplier = 1.0;
  let visualRollLag = 0;
  let visualPitchLag = 0;

  const smoothCamPos = new THREE.Vector3();
  const smoothLookAt = new THREE.Vector3();
  const smoothUp = new THREE.Vector3(0, 1, 0);
  let camInitialized = false;

  const tmpOffset = new THREE.Vector3();
  const tmpTarget = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();
  const tmpDesiredPos = new THREE.Vector3();
  const tmpShipQuat = new THREE.Quaternion();

  let exteriorShowcaseOverride = false;

  const updateShipVisibility = () => {
    const showExt = exteriorShowcaseOverride || viewMode === 'chase';
    exteriorRoot.visible = showExt;
    cockpitGroup.visible = !showExt;
    for (const id of Object.keys(shipGroups) as PlayableShipId[]) {
      shipGroups[id].visible = showExt && id === activeShipId;
    }
  };

  const setExteriorShowcaseOverride = (forceExterior: boolean) => {
    if (exteriorShowcaseOverride === forceExterior) return;
    exteriorShowcaseOverride = forceExterior;
    updateShipVisibility();
  };

  const setShipClass = (shipId: PlayableShipId) => {
    activeShipId = shipId;
    const spec = PLAYABLE_SHIPS[shipId];
    // Multi-layered propulsion plasma & boost fuselage bounce color tuning per spacecraft class
    if (shipId === 'heavy_fighter' || shipId === 'strike_bomber') {
      outerPlumeMat.uniforms.uOuterColor.value.setHex(0xe87924);
      outerPlumeMat.uniforms.uCoreColor.value.setHex(0xffe7b8);
      innerPlumeMat.uniforms.uOuterColor.value.setHex(0xf59e0b);
      plasmaStreamMat.uniforms.uCoreColor.value.setHex(0xfff6e5);
      plasmaStreamMat.uniforms.uMidColor.value.setHex(0xffb454);
      plasmaStreamMat.uniforms.uOuterColor.value.setHex(0xe05d19);
      heatDistortionMat.uniforms.uTint.value.setHex(0xffa94d);
      turbineGlowMat.color.setHex(0xffb454);
      engineLight.color.setHex(0xff9e3b);
      boostFuselageLight.color.setHex(0xffb35c);
    } else if (shipId === 'recon_craft') {
      outerPlumeMat.uniforms.uOuterColor.value.setHex(0x0ea5a0);
      outerPlumeMat.uniforms.uCoreColor.value.setHex(0xccfbf1);
      innerPlumeMat.uniforms.uOuterColor.value.setHex(0x2dd4bf);
      plasmaStreamMat.uniforms.uCoreColor.value.setHex(0xf0fdfa);
      plasmaStreamMat.uniforms.uMidColor.value.setHex(0x5eead4);
      plasmaStreamMat.uniforms.uOuterColor.value.setHex(0x0d9488);
      heatDistortionMat.uniforms.uTint.value.setHex(0x5eead4);
      turbineGlowMat.color.setHex(0x5eead4);
      engineLight.color.setHex(0x34d399);
      boostFuselageLight.color.setHex(0x5eead4);
    } else {
      outerPlumeMat.uniforms.uOuterColor.value.setHex(0x1d7fe8);
      outerPlumeMat.uniforms.uCoreColor.value.setHex(0xcbeeff);
      innerPlumeMat.uniforms.uOuterColor.value.setHex(0x58c4ff);
      plasmaStreamMat.uniforms.uCoreColor.value.setHex(0xf5fbff);
      plasmaStreamMat.uniforms.uMidColor.value.setHex(0x6cd4ff);
      plasmaStreamMat.uniforms.uOuterColor.value.setHex(0x1d7fe8);
      heatDistortionMat.uniforms.uTint.value.setHex(0x7cc8ff);
      turbineGlowMat.color.setHex(0x6cd4ff);
      engineLight.color.setHex(spec.accentColorHex);
      boostFuselageLight.color.setHex(0x88dcff);
    }
    updateShipVisibility();
  };

  const setCosmeticLivery = (livery: CosmeticLiveryVisual | null) => {
    if (!livery || livery.id === 'vanguard_standard') {
      for (const entry of trackedHullMats) {
        entry.mat.color.copy(entry.baseColor);
      }
      for (const entry of trackedTrimMats) {
        entry.mat.color.copy(entry.baseColor);
      }
      return;
    }
    tmpAccentColor.set(livery.hullAccentHex);
    tmpTrimColor.set(livery.trimHex);
    const isStealth = livery.id === 'obsidian_stealth';
    for (const entry of trackedHullMats) {
      entry.mat.color.copy(entry.baseColor);
      if (isStealth) {
        entry.mat.color.lerp(tmpStealthColor, 0.48);
      } else {
        entry.mat.color.lerp(tmpTrimColor, 0.16);
      }
    }
    for (const entry of trackedTrimMats) {
      entry.mat.color.copy(entry.baseColor).lerp(tmpAccentColor, 0.78);
    }
  };

  const setViewMode = (mode: SpaceCameraMode) => {
    viewMode = mode;
    camInitialized = false;
    updateShipVisibility();
  };

  const updateVisuals = (dt: number, elapsed: number, pitchInput: number, rollInput: number) => {
    const safeDt = Math.min(dt, 0.05);
    // Rapid, smooth trauma decay ensures camera shake is strictly short-lived for meaningful impacts
    shakeTrauma = Math.max(0, shakeTrauma - safeDt * 4.8);

    // Controlled visual ship banking based on turning direction and speed (decoupled from camera follow position)
    const targetRollLag = THREE.MathUtils.clamp(-rollInput * 0.12, -0.18, 0.18);
    const targetPitchLag = THREE.MathUtils.clamp(pitchInput * 0.06, -0.11, 0.11);
    const lagLerp = 1 - Math.exp(-safeDt * 7.5);
    visualRollLag += (targetRollLag - visualRollLag) * lagLerp;
    visualPitchLag += (targetPitchLag - visualPitchLag) * lagLerp;

    if (viewMode === 'chase') {
      exteriorRoot.rotation.z = visualRollLag;
      exteriorRoot.rotation.x = visualPitchLag;
    } else {
      exteriorRoot.rotation.set(0, 0, 0);
    }

    // Dynamic multi-layered plasma particle exhaust + heat distortion + boost fuselage lighting
    const effectiveThrust = isSupercruise
      ? 1.55
      : isBoosting
        ? 1.28
        : Math.max(0.2, thrustLevel);
    const boostFactor = isSupercruise ? 1.25 : isBoosting ? 1.0 : Math.max(0, (thrustLevel - 0.72) * 0.65);

    outerPlumeMat.uniforms.uTime.value = elapsed;
    outerPlumeMat.uniforms.uThrust.value = effectiveThrust * 0.78;
    innerPlumeMat.uniforms.uTime.value = elapsed;
    innerPlumeMat.uniforms.uThrust.value = effectiveThrust * 0.92;
    plasmaStreamMat.uniforms.uTime.value = elapsed;
    plasmaStreamMat.uniforms.uThrust.value = effectiveThrust;
    plasmaStreamMat.uniforms.uBoost.value = boostFactor;
    heatDistortionMat.uniforms.uTime.value = elapsed;
    heatDistortionMat.uniforms.uThrust.value = effectiveThrust;
    heatDistortionMat.uniforms.uBoost.value = boostFactor;

    const lengthMult = isSupercruise
      ? 1.85
      : isBoosting
        ? 1.42
        : 0.36 + thrustLevel * 0.72;
    const widthMult = isSupercruise ? 1.08 : isBoosting ? 1.02 : 0.76 + thrustLevel * 0.18;

    for (let i = 0; i < allThrusters.length; i++) {
      const t = allThrusters[i];
      // Asymmetrical thruster sputter when engine integrity is damaged
      const sputter =
        engineRatioState < 0.65 && i % 2 === 1
          ? 0.45 + 0.55 * Math.max(0, Math.sin(elapsed * 26 + i * 2.1))
          : 1.0;
      const pulse = (0.94 + Math.sin(elapsed * 32 + i * 1.3) * 0.06) * sputter;
      t.outerPlume.scale.set(widthMult * 0.84, widthMult * 0.84, lengthMult * 0.78 * pulse);
      t.innerCore.scale.set(widthMult * 0.78, widthMult * 0.78, lengthMult * 0.84 * pulse);
      t.innerGlowRing.scale.setScalar(0.92 + 0.16 * Math.min(1.4, effectiveThrust) * sputter);
      t.plasmaParticles.scale.set(1, 1, sputter);
      t.heatDistortionParticles.scale.set(1, 1, 0.75 + 0.25 * sputter);
    }

    const flicker = 0.92 + Math.sin(elapsed * 34) * 0.08;
    engineLight.intensity = (2.1 + effectiveThrust * 4.4 + boostFactor * 4.5) * flicker;
    // Dynamic plasma bounce lighting onto the rear dorsal fuselage, nacelles & stabilizers during boost
    boostFuselageLight.intensity = (0.55 + effectiveThrust * 0.85 + boostFactor * 7.8) * flicker;
    boostFuselageLight.distance = 13 + boostFactor * 9.5;
    turbineGlowMat.opacity = Math.min(0.98, 0.38 + effectiveThrust * 0.46);

    // Subtle wingtip aviation strobe blink
    const strobeOn = Math.sin(elapsed * 4.4) > 0.72;
    for (const lamp of navStrobes) {
      lamp.visible = strobeOn;
    }

    // Progressive visible combat damage states (scorch & electrical sparks)
    const dmgIntensity = Math.max(0, 1 - hullRatioState / 0.72);
    scorchMat.opacity = dmgIntensity * 0.72;
    if (dmgIntensity > 0.18 && viewMode === 'chase') {
      sparkMat.opacity = Math.min(0.95, dmgIntensity * 1.15);
      for (const sp of damageSparks) {
        const cycle = (elapsed * 4.2 + sp.phase) % 1.0;
        sp.mesh.visible = cycle < 0.24 * dmgIntensity;
        if (sp.mesh.visible) {
          sp.mesh.position.set(
            sp.offset.x + Math.sin(elapsed * 24 + sp.phase) * 0.22,
            sp.offset.y + cycle * 0.65,
            sp.offset.z + cycle * 1.4,
          );
          sp.mesh.rotation.set(cycle * 6, sp.phase, cycle * 4);
        }
      }
    } else {
      for (const sp of damageSparks) sp.mesh.visible = false;
    }

    const smokeSeverity = Math.max(
      engineRatioState < 0.74 ? (0.74 - engineRatioState) / 0.74 : 0,
      hullRatioState < 0.5 ? (0.5 - hullRatioState) / 0.5 : 0,
    );
    if (smokeSeverity > 0.04 && viewMode === 'chase') {
      smokeMat.opacity = Math.min(0.62, 0.24 + smokeSeverity * 0.42);
      for (let i = 0; i < damageSmoke.length; i++) {
        const sm = damageSmoke[i];
        const cycle = (elapsed * (1.25 + smokeSeverity * 0.85) + sm.phase) % 1.0;
        sm.mesh.visible = true;
        sm.mesh.position.set(
          sm.offset.x + Math.sin(elapsed * 5.2 + i) * cycle * 0.9,
          sm.offset.y + cycle * 0.65,
          sm.offset.z + cycle * (5.8 + thrustLevel * 4.5),
        );
        sm.mesh.scale.setScalar((0.55 + cycle * 2.1) * (0.75 + smokeSeverity * 0.6));
      }
    } else {
      for (const sm of damageSmoke) sm.mesh.visible = false;
    }
  };

  let cameraElapsed = 0;
  const updateCamera = (
    camera: THREE.PerspectiveCamera,
    dt: number,
    boosting: boolean,
    supercruise = false,
    obstacles?: ReadonlyArray<{ x: number; y: number; z: number; radius: number }>,
    snapCamera = false,
  ) => {
    const safeDt = Math.min(dt, 0.05);
    cameraElapsed += safeDt;
    root.updateMatrixWorld(true);
    tmpShipQuat.copy(root.quaternion);

    // Subtle cinematic FOV shift for boost / supercruise (60° chase base frames larger 1.42x ship with full wing clearance)
    const targetFov =
      viewMode === 'cockpit'
        ? supercruise
          ? 70
          : boosting
            ? 65
            : 60
        : supercruise
          ? 74
          : boosting
            ? 66
            : 60;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * (snapCamera ? 1 : 1 - Math.exp(-safeDt * 6.5));
      camera.updateProjectionMatrix();
    }

    // Restrained, smooth camera impact impulse only for meaningful events (zero continuous white-noise vibration)
    const shakeMag =
      shakeTrauma * shakeTrauma * shakeMultiplier * (viewMode === 'cockpit' ? 0.06 : 0.14);
    const shakeOsc = cameraElapsed * 28;
    const sx = shakeMag > 0.0005 ? Math.sin(shakeOsc) * shakeMag : 0;
    const sy = shakeMag > 0.0005 ? Math.cos(shakeOsc * 1.25) * (shakeMag * 0.75) : 0;

    if (viewMode === 'cockpit') {
      // Stable Cockpit view locked cleanly to pilot eye position with smooth impact deflection
      tmpDesiredPos.set(sx * 0.25, 2.38 + sy * 0.25, -2.02).applyQuaternion(tmpShipQuat).add(root.position);
      tmpTarget.set(0, 2.36, -65).applyQuaternion(tmpShipQuat).add(root.position);
      tmpUp.set(0, 1, 0).applyQuaternion(tmpShipQuat);

      camera.position.copy(tmpDesiredPos);
      camera.up.copy(tmpUp);
      camera.lookAt(tmpTarget);
      return;
    }

    // Stable Cinematic Third-Person Chase Camera:
    // Centered along ship centerline without sudden horizontal camera snapping during turns
    const pullBack = supercruise ? 23.5 : boosting ? 21.2 : 19.4;
    const heightOffset = supercruise ? 6.1 : 5.55;
    tmpOffset.set(sx, heightOffset + sy, pullBack).applyQuaternion(tmpShipQuat);
    tmpDesiredPos.copy(root.position).add(tmpOffset);

    // Smooth asteroid anti-clipping pull-in so chase camera never embeds inside nearby boulders
    if (obstacles && obstacles.length > 0) {
      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        const minClear = obs.radius + 3.8;
        const dx = tmpDesiredPos.x - obs.x;
        const dy = tmpDesiredPos.y - obs.y;
        const dz = tmpDesiredPos.z - obs.z;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < minClear * minClear) {
          // Pull camera cleanly forward toward ship silhouette to clear rock surface
          const pullAlpha = Math.max(0.38, Math.sqrt(dSq) / minClear);
          tmpDesiredPos.lerpVectors(root.position, tmpDesiredPos, pullAlpha);
        }
      }
    }

    tmpTarget.set(0, 2.2, -52).applyQuaternion(tmpShipQuat).add(root.position);
    tmpUp.set(0, 1, 0).applyQuaternion(tmpShipQuat);

    if (!camInitialized || snapCamera) {
      smoothCamPos.copy(tmpDesiredPos);
      smoothLookAt.copy(tmpTarget);
      smoothUp.copy(tmpUp);
      camInitialized = true;
    } else {
      const posAlpha = 1 - Math.exp(-safeDt * 9.5);
      const lookAlpha = 1 - Math.exp(-safeDt * 12.0);
      smoothCamPos.lerp(tmpDesiredPos, posAlpha);
      smoothLookAt.lerp(tmpTarget, lookAlpha);
      smoothUp.lerp(tmpUp, posAlpha).normalize();
    }

    camera.position.copy(smoothCamPos);
    camera.up.copy(smoothUp);
    camera.lookAt(smoothLookAt);
  };

  return {
    root,
    setShipClass,
    getShipClass: () => activeShipId,
    setCosmeticLivery,
    setLandingGear: (deployed: number) => {
      gearGroup.visible = deployed > 0.05;
      gearGroup.scale.y = Math.max(0.05, deployed);
    },
    setThrustLevel: (thrustNorm: number, boosting: boolean, supercruise = false) => {
      thrustLevel = Math.max(0, Math.min(1, thrustNorm));
      isBoosting = boosting;
      isSupercruise = supercruise;
    },
    setDamageVisuals: (hullRatio: number, engineRatio = 1.0) => {
      hullRatioState = Math.max(0, Math.min(1, hullRatio));
      engineRatioState = Math.max(0, Math.min(1, engineRatio));
    },
    addCameraShake: (amount: number) => {
      if (shakeMultiplier <= 0) return;
      // Controlled, comfortable camera feedback: scaled so normal combat remains readable
      const scaled = amount * 0.42;
      shakeTrauma = Math.min(1.0, shakeTrauma + scaled);
    },
    setShakeMultiplier: (mult: number) => {
      shakeMultiplier = Math.max(0, Math.min(1, mult));
      if (shakeMultiplier <= 0) shakeTrauma = 0;
    },
    setViewMode,
    getViewMode: () => viewMode,
    setExteriorShowcaseOverride,
    getMuzzleWorldPositions: (leftOut: THREE.Vector3, rightOut: THREE.Vector3) => {
      root.updateMatrixWorld(true);
      leftMuzzle.getWorldPosition(leftOut);
      rightMuzzle.getWorldPosition(rightOut);
    },
    updateVisuals,
    updateCamera,
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of localMats) m.dispose();
    },
  };
}
