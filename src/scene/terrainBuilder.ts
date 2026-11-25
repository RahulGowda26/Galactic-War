import * as THREE from 'three';
import {
  CRATERS,
  WATER_LEVEL,
  WORLD_HORIZON_HALF,
  getRegionWeights,
  getTerrainHeight,
  getTerrainSlope,
  noise2D,
} from '../world/worldConfig';
import type { ProceduralTexturePack } from './textures';

export interface TerrainAndSkyResult {
  terrainMesh: THREE.Mesh;
  rockOutcrops: THREE.InstancedMesh;
  waterMesh: THREE.Mesh;
  skyGroup: THREE.Group;
  cloudLayer: THREE.Group;
  setSpaceBlend: (blend: number) => void;
  getLightningFlash: () => number;
  update: (elapsed: number) => void;
  dispose: () => void;
}

export function buildTerrainAndSky(
  tex: ProceduralTexturePack,
): TerrainAndSkyResult {
  const disposables: Array<{ dispose: () => void }> = [];

  // =========================================================================
  // 1. MULTI-BIOME 12.8km PLANETARY TERRAIN WITH SLOPE-BASED ROCK & DETAIL SHADER
  // =========================================================================
  const size = WORLD_HORIZON_HALF * 2;
  const segs = 230;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  const cCityConcrete = new THREE.Color(0x4f535a);
  const cRuinAsh = new THREE.Color(0x3f3c39);
  const cPlainsGrass = new THREE.Color(0x63634a);
  const cPlainsSoil = new THREE.Color(0x6b5c47);
  const cCliffRock = new THREE.Color(0x4b4f56);
  const cFleetScorch = new THREE.Color(0x2f2d2c);
  const cArrivalObsidian = new THREE.Color(0x22252d);
  const cVolcanicVein = new THREE.Color(0x6d341c);
  const cMountainSlate = new THREE.Color(0x4d5460);
  const cSnowRidge = new THREE.Color(0xa9b1bc);
  const cRiverBank = new THREE.Color(0x3a3d38);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getTerrainHeight(x, z);
    pos.setY(i, y);

    const w = getRegionWeights(x, z);
    const n1 = noise2D(x * 0.005, z * 0.005);
    const n2 = noise2D(x * 0.022 + 4.3, z * 0.022 - 2.1);
    const slope = getTerrainSlope(x, z, 18);

    // Rich biome base blend
    tmp.setRGB(0, 0, 0);
    const plainsMixR = THREE.MathUtils.lerp(cPlainsSoil.r, cPlainsGrass.r, n1);
    const plainsMixG = THREE.MathUtils.lerp(cPlainsSoil.g, cPlainsGrass.g, n1);
    const plainsMixB = THREE.MathUtils.lerp(cPlainsSoil.b, cPlainsGrass.b, n1);

    tmp.r +=
      cCityConcrete.r * w.crown_city +
      cRuinAsh.r * w.ruined_district +
      plainsMixR * w.war_plains +
      cFleetScorch.r * w.fallen_fleet +
      cArrivalObsidian.r * w.arrival_zone;
    tmp.g +=
      cCityConcrete.g * w.crown_city +
      cRuinAsh.g * w.ruined_district +
      plainsMixG * w.war_plains +
      cFleetScorch.g * w.fallen_fleet +
      cArrivalObsidian.g * w.arrival_zone;
    tmp.b +=
      cCityConcrete.b * w.crown_city +
      cRuinAsh.b * w.ruined_district +
      plainsMixB * w.war_plains +
      cFleetScorch.b * w.fallen_fleet +
      cArrivalObsidian.b * w.arrival_zone;

    // Micro dirt/gravel modulation so ground never looks flat
    const microTone = 0.84 + n2 * 0.32;
    tmp.multiplyScalar(microTone);

    // Slope-based exposed rocky cliffs & geological strata
    if (slope > 0.24) {
      const rockMask = Math.min(1, (slope - 0.24) * 2.1);
      tmp.lerp(cCliffRock, rockMask * 0.85);
    }

    // Impact crater scorch & rubble darkening
    for (let c = 0; c < CRATERS.length; c++) {
      const cr = CRATERS[c];
      const d = Math.hypot(x - cr.x, z - cr.z);
      if (d < cr.radius * 1.18) {
        const scorch = 1 - d / (cr.radius * 1.18);
        tmp.lerp(cFleetScorch, scorch * 0.72);
      }
    }

    // Restrained volcanic fissure veins on Arrival Zone plateau
    if (w.arrival_zone > 0.38 && n2 > 0.78) {
      tmp.lerp(cVolcanicVein, (n2 - 0.78) * 2.1 * w.arrival_zone);
    }

    // Natural damp riverbanks & riverbed
    if (y < WATER_LEVEL + 6.5) {
      tmp.lerp(cRiverBank, Math.min(1, (WATER_LEVEL + 6.5 - y) * 0.14));
    }

    // Distant planetary mountain strata & high snow peaks
    if (y > 145) {
      const mLerp = Math.min(1, (y - 145) / 170);
      tmp.lerp(cMountainSlate, mLerp * 0.82);
      if (y > 390 && slope < 0.58) {
        tmp.lerp(cSnowRidge, Math.min(0.74, (y - 390) / 360));
      }
    }

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  disposables.push(geo);

  // World-space multi-texture PBR terrain material via onBeforeCompile
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    normalMap: tex.terrainNormal,
    normalScale: new THREE.Vector2(0.72, 0.72),
    roughness: 0.96,
    metalness: 0.04,
  });

  terrainMat.onBeforeCompile = (shader) => {
    shader.uniforms.uEarthTex = { value: tex.terrainEarthAlbedo };
    shader.uniforms.uRockTex = { value: tex.terrainRockAlbedo };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPosT;
        varying vec3 vWorldNormT;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 wpT = modelMatrix * vec4(transformed, 1.0);
        vWorldPosT = wpT.xyz;
        vWorldNormT = normalize(mat3(modelMatrix) * objectNormal);`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uEarthTex;
        uniform sampler2D uRockTex;
        varying vec3 vWorldPosT;
        varying vec3 vWorldNormT;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 uvClose = vWorldPosT.xz * 0.028;
        vec2 uvMacro = vWorldPosT.xz * 0.0045;
        vec3 earthSample = mix(texture2D(uEarthTex, uvClose).rgb, texture2D(uEarthTex, uvMacro).rgb, 0.45);
        vec3 rockSample = mix(texture2D(uRockTex, uvClose * 0.85).rgb, texture2D(uRockTex, uvMacro * 1.1).rgb, 0.45);
        float slopeMask = smoothstep(0.72, 0.94, vWorldNormT.y);
        vec3 detailTex = mix(rockSample, earthSample, slopeMask);
        // Subtle strata lines on steep cliffs
        float strata = 0.92 + 0.08 * sin(vWorldPosT.y * 0.45 + vWorldPosT.x * 0.01);
        diffuseColor.rgb *= mix(vec3(0.62), detailTex * 1.65, 0.72) * mix(strata, 1.0, slopeMask);`,
      );
  };
  disposables.push(terrainMat);

  const terrainMesh = new THREE.Mesh(geo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.name = 'AetherPrimeTerrain';

  // =========================================================================
  // 2. INSTANCED GEOLOGICAL ROCK OUTCROPS & CLIFF FORMATIONS (320 formations)
  // =========================================================================
  const rockGeo = new THREE.DodecahedronGeometry(1, 1);
  // Facet rock vertices slightly for sharp craggy realism
  const rp = rockGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rp.count; i++) {
    const vx = rp.getX(i);
    const vy = rp.getY(i);
    const vz = rp.getZ(i);
    const jag = 0.78 + 0.44 * noise2D(vx * 3.1 + vy * 1.7, vz * 2.9 - vy * 2.1);
    rp.setXYZ(i, vx * jag, vy * jag * 0.72, vz * jag);
  }
  rockGeo.computeVertexNormals();
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x5d5c5a,
    map: tex.terrainRockAlbedo,
    normalMap: tex.terrainNormal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 0.94,
    metalness: 0.08,
  });
  disposables.push(rockGeo, rockMat);

  const rockCount = 320;
  const rockOutcrops = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  const dummy = new THREE.Object3D();
  const cTint = new THREE.Color();
  let rIdx = 0;
  for (let i = 0; i < rockCount; i++) {
    const a = ((i * 2.39996) % (Math.PI * 2));
    const rad = 520 + ((i * 37.3) % 2700);
    const rx = Math.cos(a) * rad;
    const rz = Math.sin(a) * rad;
    // Keep hero Crown City central avenues clean of boulders
    if (Math.hypot(rx + 1280, rz + 880) < 540) continue;
    const ry = getTerrainHeight(rx, rz);
    if (ry < WATER_LEVEL - 1) continue;

    const sx = 6 + (i % 7) * 4.5;
    const sy = 4 + (i % 5) * 3.6;
    const sz = 6 + ((i + 3) % 7) * 4.2;
    dummy.position.set(rx, ry + sy * 0.25 - 1.2, rz);
    dummy.rotation.set(((i * 0.3) % 0.5) - 0.25, a, ((i * 0.2) % 0.4) - 0.2);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    rockOutcrops.setMatrixAt(rIdx, dummy.matrix);

    const shade = 0.72 + ((i * 19) % 10) * 0.04;
    cTint.setRGB(shade, shade * 0.98, shade * 0.96);
    rockOutcrops.setColorAt(rIdx, cTint);
    rIdx++;
  }
  rockOutcrops.count = rIdx;
  rockOutcrops.instanceMatrix.needsUpdate = true;
  if (rockOutcrops.instanceColor) rockOutcrops.instanceColor.needsUpdate = true;
  rockOutcrops.computeBoundingSphere();

  // =========================================================================
  // 3. REALISTIC ANIMATED NORMAL-MAPPED AETHER RIVER WATER
  // =========================================================================
  const waterGeo = new THREE.PlaneGeometry(8200, 4600, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a4052,
    normalMap: tex.waterNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.14,
    metalness: 0.42,
    clearcoat: 0.92,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.55,
  });
  disposables.push(waterGeo, waterMat);

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, WATER_LEVEL, 280);
  waterMesh.receiveShadow = true;
  waterMesh.name = 'AetherRiver';

  // =========================================================================
  // 4. DARK STORM-INDIGO LIGHTNING INVASION SKY + SPACE ASCENT BLEND (Ref #1 & #3)
  // =========================================================================
  const skyGroup = new THREE.Group();
  skyGroup.name = 'AetherPrimeSky';

  const skyGeo = new THREE.SphereGeometry(8600, 36, 26);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-0.68, 0.34, -0.64).normalize() },
      uZenithColor: { value: new THREE.Color(0x091124) },
      uMidSkyColor: { value: new THREE.Color(0x162542) },
      uHorizonColor: { value: new THREE.Color(0x2d3a52) },
      uSunColor: { value: new THREE.Color(0x9fc2f0) },
      uStormTint: { value: new THREE.Color(0x0c1324) },
      uLightning: { value: 0.0 },
      uSpaceBlend: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldDir;
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uZenithColor;
      uniform vec3 uMidSkyColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform vec3 uStormTint;
      uniform float uLightning;
      uniform float uSpaceBlend;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }
      float fbm(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          s += a * vnoise(p);
          p *= 2.04;
          a *= 0.5;
        }
        return s;
      }

      void main() {
        vec3 d = normalize(vWorldDir);
        float elev = clamp(d.y, -0.1, 1.0);

        // Dark stormy indigo invasion gradient (Ref #1 & #3) with readable silver-blue rifts
        vec3 col = mix(uHorizonColor, uMidSkyColor, smoothstep(0.0, 0.25, elev));
        col = mix(col, uZenithColor, smoothstep(0.2, 0.85, elev));

        // Heavy storm front over Crown City & Arrival Citadel
        float stormSector = smoothstep(-0.2, 0.85, dot(normalize(vec2(d.x, d.z)), normalize(vec2(0.45, -0.88))));
        col = mix(col, uStormTint, stormSector * 0.5 * smoothstep(0.02, 0.52, elev));

        // Cold moonlight/storm break + warm city-fire horizon underglow
        float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunColor * pow(sunDot, 4.5) * 0.26;

        // Volumetric rolling dark storm clouds with electric lightning illumination
        if (d.y > 0.008) {
          vec2 drift = vec2(uTime * 0.0055, -uTime * 0.0028);
          vec2 cloudUv = d.xz / (d.y + 0.17) * 1.55 + drift;
          float base = fbm(cloudUv + vec2(2.4, -1.3));
          float detail = fbm(cloudUv * 2.5 - vec2(1.7, 3.2));
          float wisps = fbm(cloudUv * 4.8 + vec2(0.6, 1.9));
          float density = base * 0.56 + detail * 0.30 + wisps * 0.14;
          float cloudMask = smoothstep(0.36, 0.76, density) * smoothstep(0.008, 0.14, d.y);

          vec3 cloudShadow = vec3(0.04, 0.06, 0.12);
          vec3 cloudRift = vec3(0.28, 0.40, 0.64);
          // Lightning-illuminated rift pocket in the stormy sky
          vec2 boltCenter = vec2(-0.52, -0.68);
          float boltDist = length(normalize(d.xz) - normalize(boltCenter));
          float boltAura = exp(-boltDist * 3.8) * smoothstep(0.06, 0.42, d.y) * (0.42 + uLightning * 1.45);
          // Procedural forked lightning filament inside the rift
          float zig = (fbm(vec2(d.y * 14.0, uTime * 1.2)) - 0.5) * 0.12;
          float boltCore = exp(-abs(d.x + 0.48 + zig) * 42.0) * smoothstep(0.06, 0.38, d.y) * smoothstep(0.56, 0.24, d.y) * step(d.z, -0.1);
          float boltVis = boltCore * (0.35 + uLightning * 2.2);

          float lit = smoothstep(0.32, 0.78, detail * 0.75 + sunDot * 0.35 + boltAura * 0.85);
          vec3 cloudCol = mix(cloudShadow, cloudRift, lit);
          cloudCol += vec3(0.58, 0.78, 1.0) * boltAura * 0.75;
          col = mix(col, cloudCol, cloudMask * 0.88);
          col += vec3(0.86, 0.94, 1.0) * boltVis;
        }

        // Subtle warm firelight smoke haze hugging the burning city horizon
        float hazeBand = exp(-abs(d.y) * 11.5);
        vec3 hazeCol = mix(vec3(0.18, 0.21, 0.30), vec3(0.46, 0.22, 0.12), 0.32 * smoothstep(-0.3, 0.6, -d.z));
        col = mix(col, hazeCol, hazeBand * 0.62);

        float belowHorizon = smoothstep(0.03, -0.05, d.y);
        col = mix(col, vec3(0.07, 0.09, 0.14), belowHorizon);

        // Smooth transition to deep starry space during orbital ascent
        vec3 spaceCol = vec3(0.008, 0.014, 0.028);
        col = mix(col, spaceCol, clamp(uSpaceBlend, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  disposables.push(skyGeo, skyMat);
  skyGroup.add(new THREE.Mesh(skyGeo, skyMat));

  // Distant Planetary Moons (subtle realistic atmospheric veil — Ref #8)
  const moon1Geo = new THREE.SphereGeometry(420, 28, 24);
  const moon1Mat = new THREE.MeshStandardMaterial({
    color: 0xb6bec8,
    emissive: 0x263140,
    emissiveIntensity: 0.45,
    roughness: 0.92,
    metalness: 0.04,
    fog: false,
  });
  const moon1 = new THREE.Mesh(moon1Geo, moon1Mat);
  moon1.position.set(-4100, 2250, -4400);
  skyGroup.add(moon1);

  const moonRingGeo = new THREE.RingGeometry(540, 720, 52);
  const moonRingMat = new THREE.MeshBasicMaterial({
    color: 0xc2ccd8,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false,
  });
  const moonRing = new THREE.Mesh(moonRingGeo, moonRingMat);
  moonRing.position.copy(moon1.position);
  moonRing.rotation.set(Math.PI * 0.36, 0.25, -0.35);
  skyGroup.add(moonRing);

  const moon2Geo = new THREE.SphereGeometry(165, 20, 20);
  const moon2 = new THREE.Mesh(moon2Geo, moon1Mat);
  moon2.position.set(-3050, 1780, -4900);
  skyGroup.add(moon2);
  disposables.push(moon1Geo, moon1Mat, moonRingGeo, moonRingMat, moon2Geo);

  // =========================================================================
  // 5. LAYERED HIGH-ALTITUDE VOLUMETRIC CLOUD DECK BANKS
  // =========================================================================
  const cloudLayer = new THREE.Group();
  cloudLayer.name = 'VolumetricCloudBanks';
  const cloudGeo = new THREE.PlaneGeometry(1400, 560);
  const cloudMatDay = new THREE.MeshBasicMaterial({
    map: tex.smokeSprite,
    color: 0x9faab8,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const cloudMatStorm = new THREE.MeshBasicMaterial({
    map: tex.smokeSprite,
    color: 0x333c4a,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(cloudGeo, cloudMatDay, cloudMatStorm);

  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    const radius = 1650 + (i % 4) * 780;
    const isStormSide = Math.cos(angle) > 0 && Math.sin(angle) < 0.15;
    const m = new THREE.Mesh(cloudGeo, isStormSide ? cloudMatStorm : cloudMatDay);
    m.position.set(
      Math.cos(angle) * radius,
      780 + (i % 5) * 115,
      Math.sin(angle) * radius,
    );
    m.rotation.x = Math.PI * 0.48;
    m.rotation.z = angle;
    m.scale.set(1 + (i % 3) * 0.5, 1 + ((i + 1) % 3) * 0.35, 1);
    cloudLayer.add(m);
  }

  let currentLightning = 0;
  let currentSpaceBlend = 0;

  const setSpaceBlend = (blend: number) => {
    currentSpaceBlend = THREE.MathUtils.clamp(blend, 0, 1);
    skyMat.uniforms.uSpaceBlend.value = currentSpaceBlend;
    cloudLayer.visible = currentSpaceBlend < 0.88;
    cloudMatDay.opacity = 0.18 * (1 - currentSpaceBlend);
    cloudMatStorm.opacity = 0.28 * (1 - currentSpaceBlend);
  };

  const update = (elapsed: number) => {
    skyMat.uniforms.uTime.value = elapsed;
    // Periodic dramatic lightning strike bursts across the dark storm sky
    const cycle = elapsed % 7.5;
    const pulseA = Math.exp(-Math.pow((cycle - 1.2) * 14, 2));
    const pulseB = Math.exp(-Math.pow((cycle - 1.48) * 18, 2)) * 0.75;
    const pulseC = Math.exp(-Math.pow((cycle - 4.9) * 16, 2)) * 0.6;
    currentLightning = (pulseA + pulseB + pulseC) * (1 - currentSpaceBlend);
    skyMat.uniforms.uLightning.value = currentLightning;

    tex.waterNormal.offset.set(elapsed * 0.014, elapsed * 0.009);
    cloudLayer.rotation.y = elapsed * 0.0022;
  };

  return {
    terrainMesh,
    rockOutcrops,
    waterMesh,
    skyGroup,
    cloudLayer,
    setSpaceBlend,
    getLightningFlash: () => currentLightning,
    update,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
