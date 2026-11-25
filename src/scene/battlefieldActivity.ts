import * as THREE from 'three';
import { getTerrainHeight } from '../world/worldConfig';
import type { ProceduralTexturePack } from './textures';
import type { WorldMaterialLibrary } from './materials';

export interface BattlefieldActivitySystem {
  root: THREE.Group;
  update: (elapsed: number, dt: number, cameraPos: THREE.Vector3) => void;
  setParticleScale: (scale: number) => void;
  dispose: () => void;
}

interface AircraftUnit {
  group: THREE.Group;
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  altitude: number;
  speed: number;
  phase: number;
  bankStrength: number;
}

interface HoverTrafficUnit {
  mesh: THREE.Group;
  axis: 'x' | 'z';
  lanePos: number;
  alt: number;
  minRange: number;
  maxRange: number;
  speed: number;
  dir: 1 | -1;
  offset: number;
}

interface GroundConvoyUnit {
  mesh: THREE.Group;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  speed: number;
  phase: number;
}

interface DistantTracer {
  mesh: THREE.Mesh;
  start: THREE.Vector3;
  end: THREE.Vector3;
  period: number;
  phase: number;
}

interface DistantExplosion {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  basePos: THREE.Vector3;
  period: number;
  phase: number;
}

/**
 * Living 8km Planetary War Atmosphere:
 * - Flying alien interceptors & human atmospheric fighters
 * - Moving Crown City hover-vehicles along elevated skyways
 * - Moving military ground convoys across War Plains & Crown City border
 * - Wind-drifting volumetric smoke plumes & localized flickering fires
 * - Sweeping defensive searchlights (Ref #7)
 * - Distant anti-aircraft tracers & orbital artillery explosions
 */
export function buildBattlefieldActivity(
  tex: ProceduralTexturePack,
  mats: WorldMaterialLibrary,
  fireAnchors: THREE.Vector3[],
  smokeAnchors: THREE.Vector3[],
  onDistantExplosion?: () => void,
): BattlefieldActivitySystem {
  const root = new THREE.Group();
  root.name = 'BattlefieldActivity_8km';

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

  // =========================================================================
  // 1. FLYING COMBAT AIRCRAFT & ALIEN INTERCEPTORS ACROSS 8KM SKYSPACE
  // =========================================================================
  const aircrafts: AircraftUnit[] = [];
  const jetBodyGeo = trackGeo(new THREE.ConeGeometry(1.6, 13.5, 6));
  jetBodyGeo.rotateX(Math.PI / 2);
  const jetWingGeo = trackGeo(new THREE.BoxGeometry(13.0, 0.4, 3.8));
  const alienCraftGeo = trackGeo(new THREE.OctahedronGeometry(4.2, 0));

  for (let i = 0; i < 16; i++) {
    const isAlien = i % 2 === 0;
    const g = new THREE.Group();

    if (isAlien) {
      const hull = new THREE.Mesh(alienCraftGeo, mats.alienObsidian);
      hull.scale.set(2.2, 0.45, 1.35);
      g.add(hull);
      const glow = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(1.4, 8, 6)),
        mats.alienEnergyAmber,
      );
      glow.position.set(0, -0.3, 3.2);
      g.add(glow);
    } else {
      const body = new THREE.Mesh(jetBodyGeo, mats.militaryArmor);
      g.add(body);
      const wings = new THREE.Mesh(jetWingGeo, mats.cityTrimSteel);
      wings.position.set(0, 0, 1.2);
      g.add(wings);
      const thruster = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.95, 8, 6)),
        mats.cityCyanAccent,
      );
      thruster.position.set(0, 0, 6.8);
      g.add(thruster);
    }

    root.add(g);
    aircrafts.push({
      group: g,
      centerX: (i % 4 - 1.5) * 820,
      centerZ: (Math.floor(i / 4) - 1.5) * 760,
      radiusX: 520 + (i % 5) * 240,
      radiusZ: 460 + ((i + 2) % 5) * 210,
      altitude: 165 + (i % 6) * 52,
      speed: (isAlien ? 0.11 : 0.16) * (i % 2 === 0 ? 1 : -1),
      phase: i * 1.15,
      bankStrength: isAlien ? 0.28 : 0.42,
    });
  }

  // =========================================================================
  // 2. MOVING CROWN CITY HOVER-TRAFFIC (Ref #2 — Elevated Skyway Life)
  // =========================================================================
  const hoverTraffic: HoverTrafficUnit[] = [];
  const hoverHullGeo = trackGeo(new THREE.BoxGeometry(2.6, 1.1, 6.2));
  const hoverHeadGeo = trackGeo(new THREE.BoxGeometry(2.0, 0.3, 0.3));
  const hoverTailMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xff4632 }));
  const hoverHeadMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xdff5ff }));

  for (let i = 0; i < 22; i++) {
    const car = new THREE.Group();
    const hull = new THREE.Mesh(hoverHullGeo, i % 3 === 0 ? mats.cityTowerSilver : mats.weaponGunmetal);
    car.add(hull);
    const headL = new THREE.Mesh(hoverHeadGeo, hoverHeadMat);
    headL.position.set(0, 0, -3.15);
    car.add(headL);
    const tailL = new THREE.Mesh(hoverHeadGeo, hoverTailMat);
    tailL.position.set(0, 0, 3.15);
    car.add(tailL);
    root.add(car);

    const axis = i % 2 === 0 ? 'x' : 'z';
    const dir = i % 4 < 2 ? 1 : -1;
    hoverTraffic.push({
      mesh: car,
      axis,
      lanePos: axis === 'x' ? -845 + (i % 6) * 48 : -1140 + (i % 6) * 52,
      alt: 36 + (i % 4) * 28,
      minRange: axis === 'x' ? -1850 : -1480,
      maxRange: axis === 'x' ? -680 : -440,
      speed: 32 + (i % 5) * 11,
      dir,
      offset: (i * 97) % 900,
    });
  }

  // =========================================================================
  // 3. MOVING GROUND MILITARY TRANSPORT CONVOYS
  // =========================================================================
  const convoys: GroundConvoyUnit[] = [];
  const convoyBodyGeo = trackGeo(new THREE.BoxGeometry(4.0, 2.5, 9.2));
  const convoySpecs: Array<[number, number, number, number]> = [
    [-1065, -700, -540, -490],
    [-1052, -735, -525, -520],
    [880, 810, 1460, 1020],
    [910, 855, 1490, 1065],
    [-760, 1090, -520, 740],
  ];

  convoySpecs.forEach(([sx, sz, ex, ez], idx) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(convoyBodyGeo, mats.militaryArmor);
    body.position.y = 1.65;
    body.castShadow = true;
    g.add(body);
    const lightBar = new THREE.Mesh(hoverHeadGeo, hoverHeadMat);
    lightBar.position.set(0, 1.9, 4.7);
    g.add(lightBar);
    root.add(g);

    convoys.push({
      mesh: g,
      startX: sx,
      startZ: sz,
      endX: ex,
      endZ: ez,
      speed: 0.032 + (idx % 3) * 0.008,
      phase: idx * 0.23,
    });
  });

  // =========================================================================
  // 4. VOLUMETRIC RISING SMOKE PLUMES & LOCALIZED FLICKERING FIRES
  // =========================================================================
  const smokeMat = trackMat(
    new THREE.SpriteMaterial({
      map: tex.smokeSprite,
      color: 0x3b3f46,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );

  const smokeSprites: Array<{
    sprite: THREE.Sprite;
    anchor: THREE.Vector3;
    phase: number;
    maxRise: number;
    baseScale: number;
  }> = [];

  const clampedSmokeAnchors = smokeAnchors.slice(0, 28);
  for (let i = 0; i < clampedSmokeAnchors.length; i++) {
    const anchor = clampedSmokeAnchors[i];
    for (let layer = 0; layer < 4; layer++) {
      const sp = new THREE.Sprite(smokeMat);
      root.add(sp);
      smokeSprites.push({
        sprite: sp,
        anchor,
        phase: (i * 0.31 + layer * 0.25) % 1,
        maxRise: 46 + (i % 4) * 22,
        baseScale: 16 + (i % 3) * 8,
      });
    }
  }

  const fireMat = trackMat(
    new THREE.SpriteMaterial({
      map: tex.glowSprite,
      color: 0xff9a3c,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const fireSprites: Array<{ sprite: THREE.Sprite; anchor: THREE.Vector3; phase: number }> = [];
  const clampedFireAnchors = fireAnchors.slice(0, 24);
  for (let i = 0; i < clampedFireAnchors.length; i++) {
    const sp = new THREE.Sprite(fireMat);
    sp.position.copy(clampedFireAnchors[i]);
    sp.scale.set(9.5, 13.5, 1);
    root.add(sp);
    fireSprites.push({ sprite: sp, anchor: clampedFireAnchors[i], phase: i * 1.4 });
  }

  // 4 localized warm dynamic point lights near key hero fires (keeps FPS fast!)
  const firePointLights: Array<{ light: THREE.PointLight; phase: number }> = [];
  const heroFireSpots = clampedFireAnchors.slice(0, 4);
  heroFireSpots.forEach((p, idx) => {
    const pl = new THREE.PointLight(0xff7d2c, 16, 65, 1.8);
    pl.position.set(p.x, p.y + 4, p.z);
    root.add(pl);
    firePointLights.push({ light: pl, phase: idx * 2.1 });
  });

  // =========================================================================
  // 5. SWEEPING ANTI-AIR SEARCHLIGHTS (Ref #7 — Stormy War-Front Atmosphere)
  // =========================================================================
  const beamGeo = trackGeo(new THREE.ConeGeometry(28, 340, 14, 1, true));
  beamGeo.translate(0, 170, 0);
  const beamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x9ec8e8,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const searchlights: Array<{ pivot: THREE.Group; baseYaw: number; speed: number; phase: number }> = [];
  const beamSites: Array<[number, number]> = [
    [-1180, -820],
    [-920, -680],
    [-260, -340],
    [1020, 740],
    [-750, 1110],
    [940, -1120],
  ];

  beamSites.forEach(([bx, bz], idx) => {
    const gy = getTerrainHeight(bx, bz);
    const pivot = new THREE.Group();
    pivot.position.set(bx, gy + 4, bz);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.z = 0.28;
    pivot.add(beam);
    root.add(pivot);
    searchlights.push({
      pivot,
      baseYaw: idx * 1.05,
      speed: 0.24 + (idx % 3) * 0.09,
      phase: idx * 1.7,
    });
  });

  // =========================================================================
  // 6. DISTANT ANTI-AIRCRAFT TRACERS & BATTLEFIELD ARTILLERY EXPLOSIONS
  // =========================================================================
  const distTracerGeo = trackGeo(new THREE.CylinderGeometry(0.45, 0.45, 38, 5));
  distTracerGeo.rotateX(Math.PI / 2);
  const distTracerMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffb35c,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const tracers: DistantTracer[] = [];
  const tracerArcs: Array<[[number, number, number], [number, number, number]]> = [
    [[1020, 48, 740], [1240, 320, -1480]],
    [[1220, 46, 910], [1160, 290, -1290]],
    [[-240, 42, -390], [640, 260, -1120]],
    [[1280, 295, -1460], [-140, 34, -460]],
    [[980, 280, -1240], [1180, 42, 710]],
    [[-1080, 52, -740], [120, 240, -680]],
  ];

  tracerArcs.forEach(([s, e], idx) => {
    const mesh = new THREE.Mesh(distTracerGeo, distTracerMat);
    root.add(mesh);
    tracers.push({
      mesh,
      start: new THREE.Vector3(...s),
      end: new THREE.Vector3(...e),
      period: 3.4 + idx * 0.7,
      phase: idx * 0.85,
    });
  });

  const expGeo = trackGeo(new THREE.SphereGeometry(14, 12, 10));
  const expMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff9a38,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const explosions: DistantExplosion[] = [];
  const expCoords: Array<[number, number]> = [
    [-120, -520],
    [1340, 860],
    [-980, 1180],
  ];
  expCoords.forEach(([ex, ez], idx) => {
    const gy = getTerrainHeight(ex, ez);
    const mesh = new THREE.Mesh(expGeo, expMat.clone());
    mesh.position.set(ex, gy + 12, ez);
    mesh.visible = false;
    const light = new THREE.PointLight(0xff842c, 0, 160, 1.5);
    light.position.set(ex, gy + 24, ez);
    root.add(mesh, light);
    explosions.push({
      mesh,
      light,
      basePos: new THREE.Vector3(ex, gy + 12, ez),
      period: 9.5 + idx * 3.7,
      phase: idx * 3.1,
    });
  });

  // =========================================================================
  // 7. FLOATING ATMOSPHERIC ASH & EMBER DUST FIELD
  // =========================================================================
  const emberCount = 260;
  const emberPos = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3] = (Math.random() - 0.5) * 260;
    emberPos[i * 3 + 1] = Math.random() * 68;
    emberPos[i * 3 + 2] = (Math.random() - 0.5) * 260;
  }
  const emberGeo = trackGeo(new THREE.BufferGeometry());
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberMat = trackMat(
    new THREE.PointsMaterial({
      color: 0xffad5c,
      size: 0.85,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const emberPoints = new THREE.Points(emberGeo, emberMat);
  root.add(emberPoints);

  let particleScale = 1.0;
  let lastExplosionSound = 0;

  const update = (elapsed: number, dt: number, cameraPos: THREE.Vector3) => {
    const safeDt = Math.min(dt, 0.05);

    // 1. Aircraft flight paths with realistic banking
    for (let i = 0; i < aircrafts.length; i++) {
      const a = aircrafts[i];
      const t = elapsed * a.speed + a.phase;
      const x = a.centerX + Math.cos(t) * a.radiusX;
      const z = a.centerZ + Math.sin(t) * a.radiusZ;
      const y = a.altitude + Math.sin(t * 2.1) * 18;
      const dx = -Math.sin(t) * a.radiusX * a.speed;
      const dz = Math.cos(t) * a.radiusZ * a.speed;
      a.group.position.set(x, y, z);
      a.group.rotation.y = Math.atan2(dx, dz) + Math.PI;
      a.group.rotation.z = Math.sin(t) * a.bankStrength;
    }

    // 2. Crown City hover traffic along skyways
    for (let i = 0; i < hoverTraffic.length; i++) {
      const h = hoverTraffic[i];
      const span = h.maxRange - h.minRange;
      const travel = ((elapsed * h.speed + h.offset) % span);
      const val = h.dir > 0 ? h.minRange + travel : h.maxRange - travel;
      if (h.axis === 'x') {
        h.mesh.position.set(val, h.alt + Math.sin(elapsed * 2.2 + i) * 0.4, h.lanePos);
        h.mesh.rotation.y = h.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        h.mesh.position.set(h.lanePos, h.alt + Math.sin(elapsed * 2.2 + i) * 0.4, val);
        h.mesh.rotation.y = h.dir > 0 ? Math.PI : 0;
      }
    }

    // 3. Ground military transport convoys
    for (let i = 0; i < convoys.length; i++) {
      const c = convoys[i];
      const cycle = (elapsed * c.speed + c.phase) % 2;
      const t = cycle <= 1 ? cycle : 2 - cycle;
      const cx = THREE.MathUtils.lerp(c.startX, c.endX, t);
      const cz = THREE.MathUtils.lerp(c.startZ, c.endZ, t);
      const gy = getTerrainHeight(cx, cz);
      c.mesh.position.set(cx, gy, cz);
      const dirX = cycle <= 1 ? c.endX - c.startX : c.startX - c.endX;
      const dirZ = cycle <= 1 ? c.endZ - c.startZ : c.startZ - c.endZ;
      c.mesh.rotation.y = Math.atan2(dirX, dirZ);
    }

    // 4. Wind-blown smoke plumes
    for (let i = 0; i < smokeSprites.length; i++) {
      const s = smokeSprites[i];
      const visible = i < Math.floor(smokeSprites.length * particleScale);
      s.sprite.visible = visible;
      if (!visible) continue;
      const cycle = (elapsed * 0.095 + s.phase) % 1;
      const rise = cycle * s.maxRise;
      const driftX = cycle * 24 + Math.sin(elapsed * 0.6 + i) * 4;
      const driftZ = cycle * 12;
      s.sprite.position.set(s.anchor.x + driftX, s.anchor.y + rise, s.anchor.z + driftZ);
      const sc = s.baseScale * (0.65 + cycle * 1.9);
      s.sprite.scale.set(sc, sc, 1);
    }

    // 5. Flickering fires & localized point lights
    for (let i = 0; i < fireSprites.length; i++) {
      const f = fireSprites[i];
      const flicker = 0.85 + Math.sin(elapsed * 11 + f.phase) * 0.18 + Math.cos(elapsed * 17 + f.phase) * 0.1;
      f.sprite.scale.set(9.2 * flicker, 13.5 * flicker, 1);
    }
    for (let i = 0; i < firePointLights.length; i++) {
      const fl = firePointLights[i];
      fl.light.intensity = 14 + Math.sin(elapsed * 13 + fl.phase) * 5.5;
    }

    // 6. Sweeping searchlights
    for (let i = 0; i < searchlights.length; i++) {
      const sl = searchlights[i];
      sl.pivot.rotation.y = sl.baseYaw + Math.sin(elapsed * sl.speed + sl.phase) * 0.95;
    }

    // 7. Distant tracers
    for (let i = 0; i < tracers.length; i++) {
      const tr = tracers[i];
      const t = ((elapsed + tr.phase) % tr.period) / tr.period;
      if (t < 0.42) {
        const u = t / 0.42;
        tr.mesh.visible = true;
        tr.mesh.position.lerpVectors(tr.start, tr.end, u);
        tr.mesh.lookAt(tr.end);
      } else {
        tr.mesh.visible = false;
      }
    }

    // 8. Distant artillery explosions
    for (let i = 0; i < explosions.length; i++) {
      const ex = explosions[i];
      const localT = (elapsed + ex.phase) % ex.period;
      if (localT < 0.85) {
        const u = localT / 0.85;
        ex.mesh.visible = true;
        const sc = 0.5 + u * 3.4;
        ex.mesh.scale.setScalar(sc);
        (ex.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.82;
        ex.light.intensity = (1 - u) * 32;
        if (localT < 0.07 && elapsed - lastExplosionSound > 3.5) {
          lastExplosionSound = elapsed;
          onDistantExplosion?.();
        }
      } else {
        ex.mesh.visible = false;
        ex.light.intensity = 0;
      }
    }

    // 9. Camera-following atmospheric ash & embers
    emberPoints.position.set(cameraPos.x, Math.max(0, cameraPos.y - 16), cameraPos.z);
    const posAttr = emberGeo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < emberCount; i++) {
      const iy = i * 3 + 1;
      arr[iy] += (1.2 + (i % 5) * 0.35) * safeDt;
      if (arr[iy] > 68) arr[iy] = 0;
    }
    posAttr.needsUpdate = true;
  };

  return {
    root,
    update,
    setParticleScale: (scale) => {
      particleScale = THREE.MathUtils.clamp(scale, 0.35, 1.0);
    },
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of localMats) m.dispose();
      for (const ex of explosions) (ex.mesh.material as THREE.Material).dispose();
    },
  };
}
