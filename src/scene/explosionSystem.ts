import * as THREE from 'three';
import type { ProceduralTexturePack } from './textures';
import type { EnemyShipClass, SpaceWeaponId } from '../world/spacePhysics';
import { getWeaponImpactDebrisProfile } from '../world/weaponFeedback';
import {
  computeDebrisHeatFactor,
  DESTRUCTION_POOL_LIMITS,
  getShipDestructionProfile,
  type DestructionClass,
  type ShipDestructionProfile,
} from '../world/shipDestruction';

export interface WeaponImpactDebrisOptions {
  isShield?: boolean;
  targetClass?: EnemyShipClass;
  scale?: number;
  impactDir?: THREE.Vector3;
}

export interface ShipDestructionStageEvent {
  pos: THREE.Vector3;
  destructionClass: DestructionClass;
  isSecondary: boolean;
  kind: 'hull_rupture' | 'engine_failure' | 'weapon_deck' | 'bridge_core' | 'ion_discharge' | 'main_detonation';
  scale: number;
}

export interface ShipDestructionOptions {
  scale?: number;
  hullColorHex?: number;
  accentColorHex?: number;
  shipVelocity?: THREE.Vector3;
  onStageDetonation?: (evt: ShipDestructionStageEvent) => void;
}

export interface ExplosionSystemDiagnostics {
  activeExplosions: number;
  activeWeaponDebris: number;
  activeShipDestructions: number;
  activeByClass: Record<DestructionClass, number>;
  poolCapacity: {
    fighter: number;
    heavy: number;
    capital: number;
  };
}

export interface ExplosionSystem {
  group: THREE.Group;
  spawnExplosion: (
    pos: THREE.Vector3,
    scale?: number,
    options?: { isSpace?: boolean; colorHex?: number },
  ) => void;
  spawnShipDestruction: (
    pos: THREE.Vector3,
    destructionClass: DestructionClass,
    options?: ShipDestructionOptions,
  ) => void;
  spawnShieldRipple: (pos: THREE.Vector3, radius?: number, colorHex?: number) => void;
  spawnImpactSparks: (pos: THREE.Vector3, colorHex?: number, scale?: number) => void;
  spawnWeaponImpactDebris: (
    pos: THREE.Vector3,
    weapon: SpaceWeaponId,
    options?: WeaponImpactDebrisOptions,
  ) => void;
  getDiagnostics: () => ExplosionSystemDiagnostics;
  update: (dt: number) => void;
  dispose: () => void;
}

interface ActiveExplosion {
  active: boolean;
  age: number;
  duration: number;
  scale: number;
  isSpace: boolean;
  origin: THREE.Vector3;
  coreFlash: THREE.Sprite;
  shockwave: THREE.Mesh;
  light: THREE.PointLight;
  plumes: {
    sprite: THREE.Sprite;
    vel: THREE.Vector3;
    baseScale: number;
    isFire: boolean;
  }[];
  debris: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    rotVel: THREE.Vector3;
    baseScale: THREE.Vector3;
  }[];
}

interface ActiveShieldRipple {
  active: boolean;
  age: number;
  duration: number;
  baseRadius: number;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
}

interface ActiveSparkBurst {
  active: boolean;
  age: number;
  duration: number;
  flash: THREE.Sprite;
  sparkMat: THREE.MeshBasicMaterial;
  sparks: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
  }[];
}

interface ActiveWeaponDebrisBurst {
  active: boolean;
  age: number;
  duration: number;
  weapon: SpaceWeaponId;
  hasRing: boolean;
  ringMaxScale: number;
  flashBaseScale: number;
  flash: THREE.Sprite;
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  streakMat: THREE.MeshBasicMaterial;
  shardMat: THREE.MeshStandardMaterial;
  activeStreaks: number;
  streaks: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    baseScale: THREE.Vector3;
  }[];
  activeShards: number;
  shards: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    rotVel: THREE.Vector3;
    baseScale: THREE.Vector3;
  }[];
  activeSmokes: number;
  smokes: {
    sprite: THREE.Sprite;
    vel: THREE.Vector3;
    baseScale: number;
  }[];
}

interface ActiveShipDestruction {
  active: boolean;
  destructionClass: DestructionClass;
  profile: ShipDestructionProfile;
  age: number;
  scale: number;
  mainDetonated: boolean;
  origin: THREE.Vector3;
  baseVel: THREE.Vector3;
  secondaryFired: boolean[];
  onStageDetonation?: (evt: ShipDestructionStageEvent) => void;
  impactFlash: THREE.Sprite;
  mainFlash: THREE.Sprite;
  coreSphere: THREE.Mesh;
  coreMat: THREE.MeshBasicMaterial;
  shockwaves: {
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    delayOffset: number;
    maxRadiusScale: number;
  }[];
  smokes: {
    sprite: THREE.Sprite;
    vel: THREE.Vector3;
    baseScale: number;
    maxOpacity: number;
    isFireCore: boolean;
  }[];
  sparkMat: THREE.MeshBasicMaterial;
  sparks: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    baseScale: THREE.Vector3;
  }[];
  debrisMat: THREE.MeshStandardMaterial;
  parts: {
    mesh: THREE.Mesh;
    ember: THREE.Sprite;
    vel: THREE.Vector3;
    rotVel: THREE.Vector3;
    baseScale: THREE.Vector3;
    hasEmber: boolean;
  }[];
  light: THREE.PointLight | null;
}

/**
 * Pooled Multi-Layer Realistic Explosion, Class-Differentiated Multi-Stage Ship Destruction,
 * Shield Ripple, and Distinct 5-Weapon Impact Debris VFX System.
 * Zero per-frame geometry/material allocations; all resources disposed cleanly on unmount.
 */
export function buildExplosionSystem(tex: ProceduralTexturePack): ExplosionSystem {
  const group = new THREE.Group();
  group.name = 'MultiLayerExplosions';

  const MAX_POOL = 12;
  const PLUMES_PER_BLAST = 7;
  const DEBRIS_PER_BLAST = 10;

  const WEAPON_DEBRIS_POOL = 14;
  const MAX_STREAKS = 8;
  const MAX_SHARDS = 7;
  const MAX_SMOKES = 4;

  const ringGeo = new THREE.RingGeometry(0.89, 1.0, 32);
  const innerShockGeo = new THREE.RingGeometry(0.82, 1.0, 36);
  const fireballGeo = new THREE.IcosahedronGeometry(1.0, 2);
  const debrisGeo = new THREE.OctahedronGeometry(0.19, 0);
  const plateShardGeo = new THREE.BoxGeometry(0.38, 0.09, 0.54);

  // Procedural 3D separated spacecraft wreckage geometries (wings, engines, armor bulkheads)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(2.4, -0.45);
  wingShape.lineTo(1.75, -1.65);
  wingShape.lineTo(-0.3, -1.15);
  wingShape.closePath();
  const wingFragmentGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 1,
  });
  wingFragmentGeo.center();

  const engineNacelleGeo = new THREE.CylinderGeometry(0.42, 0.68, 2.1, 8);
  engineNacelleGeo.rotateX(Math.PI / 2);

  const armorBulkheadGeo = new THREE.BoxGeometry(1.35, 0.24, 1.85);

  const sharedDebrisMat = new THREE.MeshStandardMaterial({
    color: 0x2c2b2e,
    emissive: 0xc24814,
    emissiveIntensity: 0.52,
    roughness: 0.72,
    metalness: 0.65,
  });

  const shieldGeo = new THREE.SphereGeometry(1.0, 22, 16);
  const sparkGeo = new THREE.BoxGeometry(0.11, 0.11, 1.15);

  const disposableMats: THREE.Material[] = [sharedDebrisMat];
  const pool: ActiveExplosion[] = [];

  for (let i = 0; i < MAX_POOL; i++) {
    const coreMat = new THREE.SpriteMaterial({
      map: tex.glowSprite,
      color: 0xffeacc,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposableMats.push(coreMat);
    const coreFlash = new THREE.Sprite(coreMat);
    coreFlash.visible = false;
    group.add(coreFlash);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffb366,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposableMats.push(ringMat);
    const shockwave = new THREE.Mesh(ringGeo, ringMat);
    shockwave.visible = false;
    group.add(shockwave);

    const light = new THREE.PointLight(0xff8a36, 0, 55, 1.8);
    if (i < 4) {
      group.add(light);
    }

    const plumes: ActiveExplosion['plumes'] = [];
    for (let p = 0; p < PLUMES_PER_BLAST; p++) {
      const isFire = p < 3;
      const pMat = new THREE.SpriteMaterial({
        map: isFire ? tex.glowSprite : tex.smokeSprite,
        color: isFire ? 0xff7b28 : 0x242325,
        transparent: true,
        opacity: 0,
        blending: isFire ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
      });
      disposableMats.push(pMat);
      const sprite = new THREE.Sprite(pMat);
      sprite.visible = false;
      group.add(sprite);
      plumes.push({
        sprite,
        vel: new THREE.Vector3(),
        baseScale: 1,
        isFire,
      });
    }

    const debris: ActiveExplosion['debris'] = [];
    for (let d = 0; d < DEBRIS_PER_BLAST; d++) {
      const mesh = new THREE.Mesh(debrisGeo, sharedDebrisMat);
      mesh.visible = false;
      group.add(mesh);
      debris.push({
        mesh,
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        baseScale: new THREE.Vector3(1, 1, 1),
      });
    }

    pool.push({
      active: false,
      age: 0,
      duration: 2.2,
      scale: 1,
      isSpace: false,
      origin: new THREE.Vector3(),
      coreFlash,
      shockwave,
      light,
      plumes,
      debris,
    });
  }

  // Pooled shield impact ripples (6 slots)
  const ripplePool: ActiveShieldRipple[] = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x5cc8ff,
      transparent: true,
      opacity: 0,
      wireframe: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposableMats.push(mat);
    const mesh = new THREE.Mesh(shieldGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    ripplePool.push({
      active: false,
      age: 0,
      duration: 0.28,
      baseRadius: 5,
      mesh,
      mat,
    });
  }

  // Pooled generic impact spark bursts (8 slots, per-slot colored spark material)
  const sparkPool: ActiveSparkBurst[] = [];
  for (let i = 0; i < 8; i++) {
    const fMat = new THREE.SpriteMaterial({
      map: tex.glowSprite,
      color: 0xffd280,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffcf7a,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposableMats.push(fMat, sparkMat);
    const flash = new THREE.Sprite(fMat);
    flash.visible = false;
    group.add(flash);

    const sparks: ActiveSparkBurst['sparks'] = [];
    for (let s = 0; s < 6; s++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.visible = false;
      group.add(mesh);
      sparks.push({ mesh, vel: new THREE.Vector3() });
    }
    sparkPool.push({
      active: false,
      age: 0,
      duration: 0.42,
      flash,
      sparkMat,
      sparks,
    });
  }

  // Pooled distinct 5-weapon impact debris bursts (14 slots)
  const weaponDebrisPool: ActiveWeaponDebrisBurst[] = [];
  for (let i = 0; i < WEAPON_DEBRIS_POOL; i++) {
    const flashMat = new THREE.SpriteMaterial({
      map: tex.glowSprite,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7fe8ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0x9ceeff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x333942,
      emissive: 0xff7b29,
      emissiveIntensity: 0.9,
      roughness: 0.52,
      metalness: 0.78,
    });
    disposableMats.push(flashMat, ringMat, streakMat, shardMat);

    const flash = new THREE.Sprite(flashMat);
    flash.visible = false;
    group.add(flash);

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.visible = false;
    group.add(ring);

    const streaks: ActiveWeaponDebrisBurst['streaks'] = [];
    for (let s = 0; s < MAX_STREAKS; s++) {
      const mesh = new THREE.Mesh(sparkGeo, streakMat);
      mesh.visible = false;
      group.add(mesh);
      streaks.push({
        mesh,
        vel: new THREE.Vector3(),
        baseScale: new THREE.Vector3(1, 1, 1),
      });
    }

    const shards: ActiveWeaponDebrisBurst['shards'] = [];
    for (let d = 0; d < MAX_SHARDS; d++) {
      const geo = d % 2 === 0 ? plateShardGeo : debrisGeo;
      const mesh = new THREE.Mesh(geo, shardMat);
      mesh.visible = false;
      group.add(mesh);
      shards.push({
        mesh,
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        baseScale: new THREE.Vector3(1, 1, 1),
      });
    }

    const smokes: ActiveWeaponDebrisBurst['smokes'] = [];
    for (let p = 0; p < MAX_SMOKES; p++) {
      const sMat = new THREE.SpriteMaterial({
        map: tex.smokeSprite,
        color: 0x24242a,
        transparent: true,
        opacity: 0,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });
      disposableMats.push(sMat);
      const sprite = new THREE.Sprite(sMat);
      sprite.visible = false;
      group.add(sprite);
      smokes.push({
        sprite,
        vel: new THREE.Vector3(),
        baseScale: 1,
      });
    }

    weaponDebrisPool.push({
      active: false,
      age: 0,
      duration: 0.5,
      weapon: 'pulse',
      hasRing: false,
      ringMaxScale: 6,
      flashBaseScale: 2,
      flash,
      ring,
      ringMat,
      streakMat,
      shardMat,
      activeStreaks: 0,
      streaks,
      activeShards: 0,
      shards,
      activeSmokes: 0,
      smokes,
    });
  }

  // Class-partitioned pooled multi-stage ship destruction slots (Fighter / Heavy / Capital)
  const buildShipDestructionSlot = (
    cls: DestructionClass,
    withLight: boolean,
  ): ActiveShipDestruction => {
    const profile = getShipDestructionProfile(cls);

    const impactMat = new THREE.SpriteMaterial({
      map: tex.glowSprite,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mainMat = new THREE.SpriteMaterial({
      map: tex.glowSprite,
      color: 0xffedd0,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffb85c,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffd782,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x2e3540,
      emissive: 0xff6b1a,
      emissiveIntensity: 1.4,
      roughness: 0.55,
      metalness: 0.72,
    });
    disposableMats.push(impactMat, mainMat, coreMat, sparkMat, debrisMat);

    const impactFlash = new THREE.Sprite(impactMat);
    impactFlash.visible = false;
    group.add(impactFlash);

    const mainFlash = new THREE.Sprite(mainMat);
    mainFlash.visible = false;
    group.add(mainFlash);

    const coreSphere = new THREE.Mesh(fireballGeo, coreMat);
    coreSphere.visible = false;
    group.add(coreSphere);

    const shockwaves: ActiveShipDestruction['shockwaves'] = [];
    for (let s = 0; s < profile.shockwaveLayers; s++) {
      const swMat = new THREE.MeshBasicMaterial({
        color: s === 0 ? 0xffdfa8 : s === 1 ? 0xff7b28 : 0x56d8ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      disposableMats.push(swMat);
      const mesh = new THREE.Mesh(s === 0 ? innerShockGeo : ringGeo, swMat);
      mesh.visible = false;
      group.add(mesh);
      shockwaves.push({
        mesh,
        mat: swMat,
        delayOffset: s * 0.08,
        maxRadiusScale: profile.shockwaveMaxRadius * (0.72 + s * 0.24),
      });
    }

    const smokes: ActiveShipDestruction['smokes'] = [];
    for (let p = 0; p < profile.smokePuffCount; p++) {
      const isFireCore = p < Math.ceil(profile.smokePuffCount * 0.42);
      const pMat = new THREE.SpriteMaterial({
        map: isFireCore ? tex.glowSprite : tex.smokeSprite,
        color: isFireCore ? 0xff7e26 : 0x1e2026,
        transparent: true,
        opacity: 0,
        blending: isFireCore ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
      });
      disposableMats.push(pMat);
      const sprite = new THREE.Sprite(pMat);
      sprite.visible = false;
      group.add(sprite);
      smokes.push({
        sprite,
        vel: new THREE.Vector3(),
        baseScale: 1,
        maxOpacity: isFireCore ? 0.72 : profile.smokeMaxOpacity,
        isFireCore,
      });
    }

    const sparks: ActiveShipDestruction['sparks'] = [];
    for (let sp = 0; sp < profile.sparkCount; sp++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.visible = false;
      group.add(mesh);
      sparks.push({
        mesh,
        vel: new THREE.Vector3(),
        baseScale: new THREE.Vector3(1, 1, 1),
      });
    }

    const parts: ActiveShipDestruction['parts'] = [];
    const totalParts = profile.wingPartCount + profile.enginePartCount + profile.armorPlateCount;
    for (let d = 0; d < totalParts; d++) {
      const geo =
        d < profile.wingPartCount
          ? wingFragmentGeo
          : d < profile.wingPartCount + profile.enginePartCount
            ? engineNacelleGeo
            : armorBulkheadGeo;
      const mesh = new THREE.Mesh(geo, debrisMat);
      mesh.visible = false;
      group.add(mesh);

      const hasEmber = d < profile.emberTrailCount;
      const emberMat = new THREE.SpriteMaterial({
        map: tex.glowSprite,
        color: d % 3 === 0 ? 0xffb347 : 0xff5a1f,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      disposableMats.push(emberMat);
      const ember = new THREE.Sprite(emberMat);
      ember.visible = false;
      group.add(ember);

      parts.push({
        mesh,
        ember,
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        baseScale: new THREE.Vector3(1, 1, 1),
        hasEmber,
      });
    }

    let light: THREE.PointLight | null = null;
    if (withLight) {
      light = new THREE.PointLight(0xff8e3c, 0, profile.lightRangeMeters, 1.5);
      group.add(light);
    }

    return {
      active: false,
      destructionClass: cls,
      profile,
      age: 0,
      scale: 1,
      mainDetonated: false,
      origin: new THREE.Vector3(),
      baseVel: new THREE.Vector3(),
      secondaryFired: profile.secondaryDetonations.map(() => false),
      impactFlash,
      mainFlash,
      coreSphere,
      coreMat,
      shockwaves,
      smokes,
      sparkMat,
      sparks,
      debrisMat,
      parts,
      light,
    };
  };

  const shipDestructionPools: Record<DestructionClass, ActiveShipDestruction[]> = {
    fighter: [],
    heavy: [],
    capital: [],
  };
  let lightsRemaining: number = DESTRUCTION_POOL_LIMITS.maxDynamicLights;
  for (let i = 0; i < DESTRUCTION_POOL_LIMITS.capitalSlots; i++) {
    shipDestructionPools.capital.push(buildShipDestructionSlot('capital', lightsRemaining > 0));
    if (lightsRemaining > 0) lightsRemaining--;
  }
  for (let i = 0; i < DESTRUCTION_POOL_LIMITS.heavySlots; i++) {
    shipDestructionPools.heavy.push(buildShipDestructionSlot('heavy', lightsRemaining > 0));
    if (lightsRemaining > 0) lightsRemaining--;
  }
  for (let i = 0; i < DESTRUCTION_POOL_LIMITS.fighterSlots; i++) {
    shipDestructionPools.fighter.push(buildShipDestructionSlot('fighter', lightsRemaining > 0));
    if (lightsRemaining > 0) lightsRemaining--;
  }

  const allShipDestructionSlots: ActiveShipDestruction[] = [
    ...shipDestructionPools.capital,
    ...shipDestructionPools.heavy,
    ...shipDestructionPools.fighter,
  ];
  const shipDestructionCursors: Record<DestructionClass, number> = {
    fighter: 0,
    heavy: 0,
    capital: 0,
  };

  let cursor = 0;
  let rippleCursor = 0;
  let sparkCursor = 0;
  let weaponDebrisCursor = 0;

  // Pre-allocated math helpers — zero GC in spawn/update paths
  const tmpLook = new THREE.Vector3();
  const tmpConeDir = new THREE.Vector3();
  const tmpRefUp = new THREE.Vector3(0, 1, 0);
  const tmpAltUp = new THREE.Vector3(1, 0, 0);
  const tmpTanA = new THREE.Vector3();
  const tmpTanB = new THREE.Vector3();
  const tmpVec = new THREE.Vector3();
  const tmpStagePos = new THREE.Vector3();
  const tmpHotColor = new THREE.Color(0xffb85c);
  const tmpWarmColor = new THREE.Color(0xe64a19);
  const tmpColdColor = new THREE.Color(0x181a20);

  const spawnExplosion = (
    pos: THREE.Vector3,
    scale = 1.0,
    options?: { isSpace?: boolean; colorHex?: number },
  ) => {
    const slot = pool[cursor % MAX_POOL];
    cursor++;

    slot.active = true;
    slot.age = 0;
    slot.duration = Math.min(3.2, 1.55 + scale * 0.36);
    slot.scale = scale;
    slot.isSpace = Boolean(options?.isSpace);
    slot.origin.copy(pos);

    const flashColor = options?.colorHex ?? 0xffe4b8;
    slot.coreFlash.visible = true;
    slot.coreFlash.position.copy(pos);
    slot.coreFlash.scale.setScalar(2.1 * scale);
    (slot.coreFlash.material as THREE.SpriteMaterial).color.setHex(flashColor);
    (slot.coreFlash.material as THREE.SpriteMaterial).opacity = 0.95;

    slot.shockwave.visible = true;
    slot.shockwave.position.copy(pos);
    slot.shockwave.rotation.set(
      slot.isSpace ? Math.random() * Math.PI : -Math.PI / 2,
      slot.isSpace ? Math.random() * Math.PI : 0,
      0,
    );
    slot.shockwave.scale.setScalar(0.55 * scale);
    (slot.shockwave.material as THREE.MeshBasicMaterial).color.setHex(options?.colorHex ?? 0xffb366);
    (slot.shockwave.material as THREE.MeshBasicMaterial).opacity = 0.72;

    slot.light.position.copy(pos);
    slot.light.distance = 32 * Math.min(2.6, scale);
    slot.light.intensity = 18 * Math.min(2.2, scale);

    for (let i = 0; i < slot.plumes.length; i++) {
      const p = slot.plumes[i];
      const ang = (i / slot.plumes.length) * Math.PI * 2 + Math.random() * 0.6;
      const spread = (1.8 + Math.random() * 4.2) * scale;
      p.sprite.visible = true;
      p.sprite.position.set(
        pos.x + Math.cos(ang) * 0.45 * scale,
        pos.y + (slot.isSpace ? (Math.random() - 0.5) * 0.65 : 0.4) * scale,
        pos.z + Math.sin(ang) * 0.45 * scale,
      );
      p.vel.set(
        Math.cos(ang) * spread,
        slot.isSpace ? (Math.random() - 0.5) * spread * 1.4 : (2.6 + Math.random() * 4.5) * scale,
        Math.sin(ang) * spread,
      );
      p.baseScale = (p.isFire ? 2.6 + Math.random() * 1.5 : 3.8 + Math.random() * 2.4) * scale;
      p.sprite.scale.setScalar(p.baseScale * 0.52);
      const mat = p.sprite.material as THREE.SpriteMaterial;
      mat.color.setHex(p.isFire ? (i % 2 === 0 ? 0xff9230 : 0xe84d12) : 0x1c1b1d);
      mat.opacity = p.isFire ? 0.86 : 0.76;
    }

    for (let d = 0; d < slot.debris.length; d++) {
      const chunk = slot.debris[d];
      const theta = Math.random() * Math.PI * 2;
      const phi = slot.isSpace ? Math.acos(2 * Math.random() - 1) : 0.25 + Math.random() * 0.85;
      const spd = (11 + Math.random() * 20) * Math.sqrt(scale);
      chunk.mesh.visible = true;
      chunk.mesh.position.copy(pos);
      const sCap = Math.min(1.6, scale);
      chunk.baseScale.set(
        (0.45 + Math.random() * 1.1) * sCap,
        (0.22 + Math.random() * 0.45) * sCap,
        (0.65 + Math.random() * 1.35) * sCap,
      );
      chunk.mesh.scale.copy(chunk.baseScale);
      chunk.vel.set(
        Math.sin(phi) * Math.cos(theta) * spd,
        Math.cos(phi) * spd + (slot.isSpace ? 0 : 4.2),
        Math.sin(phi) * Math.sin(theta) * spd,
      );
      chunk.rotVel.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
      );
    }
  };

  const resetShipDestructionVisuals = (slot: ActiveShipDestruction) => {
    slot.impactFlash.visible = false;
    slot.mainFlash.visible = false;
    slot.coreSphere.visible = false;
    for (let s = 0; s < slot.shockwaves.length; s++) slot.shockwaves[s].mesh.visible = false;
    for (let p = 0; p < slot.smokes.length; p++) slot.smokes[p].sprite.visible = false;
    for (let sp = 0; sp < slot.sparks.length; sp++) slot.sparks[sp].mesh.visible = false;
    for (let d = 0; d < slot.parts.length; d++) {
      slot.parts[d].mesh.visible = false;
      slot.parts[d].ember.visible = false;
    }
    if (slot.light) slot.light.intensity = 0;
  };

  const triggerMainShipDetonation = (slot: ActiveShipDestruction) => {
    slot.mainDetonated = true;
    const p = slot.profile;
    const sc = slot.scale;
    const pos = slot.origin;

    slot.mainFlash.visible = true;
    slot.mainFlash.position.copy(pos);
    slot.mainFlash.scale.setScalar(p.mainBlastScale * 4.4 * sc);
    (slot.mainFlash.material as THREE.SpriteMaterial).opacity = 0.96;

    slot.coreSphere.visible = true;
    slot.coreSphere.position.copy(pos);
    slot.coreSphere.scale.setScalar(p.mainBlastScale * 1.35 * sc);
    slot.coreMat.color.setHex(0xfff0cc);
    slot.coreMat.opacity = 0.88;

    for (let s = 0; s < slot.shockwaves.length; s++) {
      const sw = slot.shockwaves[s];
      sw.mesh.visible = true;
      sw.mesh.position.copy(pos);
      if (s === 0) sw.mesh.rotation.set(Math.PI * 0.42, Math.random() * Math.PI, 0);
      else if (s === 1) sw.mesh.rotation.set(-Math.PI * 0.18, Math.random() * Math.PI, Math.PI * 0.35);
      else sw.mesh.rotation.set(Math.PI * 0.12, Math.random() * Math.PI, -Math.PI * 0.45);
      sw.mesh.scale.setScalar(p.mainBlastScale * 0.75 * sc);
      sw.mat.opacity = s === 0 ? 0.88 : 0.68;
    }

    if (slot.light) {
      slot.light.position.copy(pos);
      slot.light.distance = p.lightRangeMeters * sc;
      slot.light.intensity = p.lightPeakIntensity;
    }

    // Launch volumetric-looking fire/smoke plumes (controlled opacity so combat stays readable)
    for (let i = 0; i < slot.smokes.length; i++) {
      const sm = slot.smokes[i];
      const theta = (i / Math.max(1, slot.smokes.length)) * Math.PI * 2 + Math.random() * 0.55;
      const phi = Math.acos(2 * Math.random() - 1);
      const drift = (p.debrisMinSpeed * 0.32 + Math.random() * p.debrisMaxSpeed * 0.28) * sc;
      sm.sprite.visible = true;
      sm.sprite.position.set(
        pos.x + Math.sin(phi) * Math.cos(theta) * p.mainBlastScale * 1.1 * sc,
        pos.y + Math.cos(phi) * p.mainBlastScale * 0.85 * sc,
        pos.z + Math.sin(phi) * Math.sin(theta) * p.mainBlastScale * 1.1 * sc,
      );
      sm.vel.set(
        Math.sin(phi) * Math.cos(theta) * drift + slot.baseVel.x * 0.2,
        Math.cos(phi) * drift + slot.baseVel.y * 0.2,
        Math.sin(phi) * Math.sin(theta) * drift + slot.baseVel.z * 0.2,
      );
      sm.baseScale = (sm.isFireCore ? 5.2 + Math.random() * 3.0 : 8.5 + Math.random() * 5.2) * p.mainBlastScale * 0.42 * sc;
      sm.sprite.scale.setScalar(sm.baseScale * 0.55);
      const mat = sm.sprite.material as THREE.SpriteMaterial;
      mat.opacity = sm.maxOpacity;
    }

    // Launch incandescent spark burst
    slot.sparkMat.opacity = 0.96;
    for (let sp = 0; sp < slot.sparks.length; sp++) {
      const sk = slot.sparks[sp];
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const spd = (p.debrisMaxSpeed * 1.25 + Math.random() * p.debrisMaxSpeed * 1.15) * sc;
      sk.vel.set(
        Math.sin(phi) * Math.cos(theta) * spd + slot.baseVel.x * 0.25,
        Math.cos(phi) * spd + slot.baseVel.y * 0.25,
        Math.sin(phi) * Math.sin(theta) * spd + slot.baseVel.z * 0.25,
      );
      sk.mesh.visible = true;
      sk.mesh.position.copy(pos);
      tmpLook.copy(pos).add(sk.vel);
      sk.mesh.lookAt(tmpLook);
      const sparkThickness = (slot.destructionClass === 'capital' ? 2.4 : slot.destructionClass === 'heavy' ? 1.55 : 1.05) * sc;
      sk.baseScale.set(sparkThickness, sparkThickness, sparkThickness * (2.6 + Math.random() * 2.8));
      sk.mesh.scale.copy(sk.baseScale);
    }

    // Separate structural spacecraft wreckage (wings, engines, armor bulkheads) with burning ember trails
    slot.debrisMat.emissive.setHex(0xff7722);
    slot.debrisMat.emissiveIntensity = 1.65;
    const partSizeMult =
      (slot.destructionClass === 'capital' ? 4.8 : slot.destructionClass === 'heavy' ? 1.85 : 1.05) * sc;
    for (let d = 0; d < slot.parts.length; d++) {
      const part = slot.parts[d];
      const theta = (d / Math.max(1, slot.parts.length)) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const phi = Math.acos(2 * Math.random() - 1);
      const spd = (p.debrisMinSpeed + Math.random() * (p.debrisMaxSpeed - p.debrisMinSpeed)) * sc;
      const spawnRad = p.mainBlastScale * 1.2 * sc;
      part.mesh.visible = true;
      part.mesh.position.set(
        pos.x + Math.sin(phi) * Math.cos(theta) * spawnRad,
        pos.y + Math.cos(phi) * spawnRad,
        pos.z + Math.sin(phi) * Math.sin(theta) * spawnRad,
      );
      part.vel.set(
        Math.sin(phi) * Math.cos(theta) * spd + slot.baseVel.x * 0.35,
        Math.cos(phi) * spd + slot.baseVel.y * 0.35,
        Math.sin(phi) * Math.sin(theta) * spd + slot.baseVel.z * 0.35,
      );
      part.rotVel.set(
        (Math.random() - 0.5) * (slot.destructionClass === 'capital' ? 2.2 : 6.5),
        (Math.random() - 0.5) * (slot.destructionClass === 'capital' ? 2.2 : 6.5),
        (Math.random() - 0.5) * (slot.destructionClass === 'capital' ? 2.2 : 6.5),
      );
      part.baseScale.set(
        partSizeMult * (0.78 + Math.random() * 0.52),
        partSizeMult * (0.78 + Math.random() * 0.48),
        partSizeMult * (0.82 + Math.random() * 0.58),
      );
      part.mesh.scale.copy(part.baseScale);
      part.mesh.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);

      if (part.hasEmber) {
        part.ember.visible = true;
        part.ember.position.copy(part.mesh.position);
        part.ember.scale.setScalar(partSizeMult * 2.8);
        (part.ember.material as THREE.SpriteMaterial).opacity = 0.86;
      } else {
        part.ember.visible = false;
      }
    }

    slot.onStageDetonation?.({
      pos: pos.clone(),
      destructionClass: slot.destructionClass,
      isSecondary: false,
      kind: 'main_detonation',
      scale: p.mainBlastScale * sc,
    });
  };

  const spawnShipDestruction = (
    pos: THREE.Vector3,
    destructionClass: DestructionClass,
    options?: ShipDestructionOptions,
  ) => {
    const classPool = shipDestructionPools[destructionClass];
    const slot = classPool[shipDestructionCursors[destructionClass] % classPool.length];
    shipDestructionCursors[destructionClass]++;

    resetShipDestructionVisuals(slot);

    const profile = getShipDestructionProfile(destructionClass);
    const sc = Math.max(0.55, Math.min(2.2, options?.scale ?? 1.0));
    slot.active = true;
    slot.profile = profile;
    slot.age = 0;
    slot.scale = sc;
    slot.mainDetonated = false;
    slot.origin.copy(pos);
    if (options?.shipVelocity) {
      slot.baseVel.copy(options.shipVelocity);
    } else {
      slot.baseVel.set(0, 0, 0);
    }
    slot.onStageDetonation = options?.onStageDetonation;
    for (let i = 0; i < slot.secondaryFired.length; i++) {
      slot.secondaryFired[i] = false;
    }

    if (options?.hullColorHex !== undefined) {
      slot.debrisMat.color.setHex(options.hullColorHex);
    } else {
      slot.debrisMat.color.setHex(0x2f3744);
    }

    // Stage 1: Immediate localized bright impact flash & hull rupture spark cue
    slot.impactFlash.visible = true;
    slot.impactFlash.position.copy(pos);
    slot.impactFlash.scale.setScalar(profile.mainBlastScale * 2.2 * sc);
    (slot.impactFlash.material as THREE.SpriteMaterial).color.setHex(options?.accentColorHex ?? 0xfff5db);
    (slot.impactFlash.material as THREE.SpriteMaterial).opacity = 0.96;

    if (slot.light) {
      slot.light.position.copy(pos);
      slot.light.distance = profile.lightRangeMeters * 0.65 * sc;
      slot.light.intensity = profile.lightPeakIntensity * 0.52;
    }

    // Immediate hull rupture sparks on fighter/heavy kills
    if (destructionClass === 'fighter') {
      spawnImpactSparks(pos, 0xffd27a, 1.8 * sc);
    }
  };

  const spawnShieldRipple = (pos: THREE.Vector3, radius = 6, colorHex = 0x5cc8ff) => {
    const slot = ripplePool[rippleCursor % ripplePool.length];
    rippleCursor++;
    slot.active = true;
    slot.age = 0;
    slot.duration = 0.28;
    slot.baseRadius = Math.max(2, radius);
    slot.mesh.visible = true;
    slot.mesh.position.copy(pos);
    slot.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    slot.mesh.scale.setScalar(slot.baseRadius * 0.92);
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 0.62;
  };

  const spawnImpactSparks = (pos: THREE.Vector3, colorHex = 0xffc86b, scale = 1.0) => {
    const slot = sparkPool[sparkCursor % sparkPool.length];
    sparkCursor++;
    slot.active = true;
    slot.age = 0;
    slot.duration = 0.36;
    slot.sparkMat.color.setHex(colorHex);
    slot.sparkMat.opacity = 0.95;
    slot.flash.visible = true;
    slot.flash.position.copy(pos);
    slot.flash.scale.setScalar(2.4 * scale);
    (slot.flash.material as THREE.SpriteMaterial).color.setHex(colorHex);
    (slot.flash.material as THREE.SpriteMaterial).opacity = 0.92;

    for (let s = 0; s < slot.sparks.length; s++) {
      const sp = slot.sparks[s];
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const spd = (24 + Math.random() * 34) * Math.sqrt(Math.max(0.4, scale));
      sp.vel.set(
        Math.sin(phi) * Math.cos(theta) * spd,
        Math.cos(phi) * spd,
        Math.sin(phi) * Math.sin(theta) * spd,
      );
      sp.mesh.visible = true;
      sp.mesh.position.copy(pos);
      tmpLook.copy(pos).add(sp.vel);
      sp.mesh.lookAt(tmpLook);
      sp.mesh.scale.set(0.85 * scale, 0.85 * scale, (1.1 + Math.random() * 1.4) * scale);
    }
  };

  const spawnWeaponImpactDebris = (
    pos: THREE.Vector3,
    weapon: SpaceWeaponId,
    options?: WeaponImpactDebrisOptions,
  ) => {
    const profile = getWeaponImpactDebrisProfile(
      weapon,
      Boolean(options?.isShield),
      options?.targetClass ?? 'fighter',
    );
    const scaleMul = Math.max(0.45, Math.min(2.4, options?.scale ?? 1.0));
    const slot = weaponDebrisPool[weaponDebrisCursor % WEAPON_DEBRIS_POOL];
    weaponDebrisCursor++;

    slot.active = true;
    slot.age = 0;
    slot.duration = profile.durationSec;
    slot.weapon = weapon;
    slot.hasRing = profile.hasShockRing;
    slot.ringMaxScale = profile.ringMaxScale * scaleMul;
    slot.flashBaseScale = profile.flashScale * scaleMul;

    slot.flash.visible = true;
    slot.flash.position.copy(pos);
    slot.flash.scale.setScalar(slot.flashBaseScale);
    const flashMat = slot.flash.material as THREE.SpriteMaterial;
    flashMat.color.setHex(profile.flashColorHex);
    flashMat.opacity = 0.96;

    // Optional expanding shock / plasma splash / EMP disruptor ring
    slot.ring.visible = profile.hasShockRing;
    if (profile.hasShockRing) {
      slot.ring.position.copy(pos);
      if (options?.impactDir && options.impactDir.lengthSq() > 0.001) {
        tmpLook.copy(pos).add(options.impactDir);
        slot.ring.lookAt(tmpLook);
      } else {
        slot.ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      }
      slot.ring.scale.setScalar(0.65 * scaleMul);
      slot.ringMat.color.setHex(profile.ringColorHex);
      slot.ringMat.opacity = weapon === 'emp' ? 0.68 : 0.52;
    }

    // Build orthonormal cone basis for directional Rail Cannon spall ejecta
    const useCone = Boolean(profile.directionalCone && options?.impactDir && options.impactDir.lengthSq() > 0.001);
    if (useCone && options?.impactDir) {
      // Back-spall ejects outward opposite incoming slug direction (with slight spread)
      tmpConeDir.copy(options.impactDir).normalize().negate();
      const ref = Math.abs(tmpConeDir.y) > 0.85 ? tmpAltUp : tmpRefUp;
      tmpTanA.crossVectors(tmpConeDir, ref).normalize();
      tmpTanB.crossVectors(tmpConeDir, tmpTanA).normalize();
    }

    // 1. Ionized spark streaks / EMP electric arcs / Rail hyper-velocity tungsten spall
    slot.streakMat.color.setHex(profile.streakColorHex);
    slot.streakMat.opacity = 0.96;
    slot.activeStreaks = Math.min(MAX_STREAKS, profile.streakCount);
    for (let s = 0; s < MAX_STREAKS; s++) {
      const st = slot.streaks[s];
      if (s >= slot.activeStreaks) {
        st.mesh.visible = false;
        continue;
      }
      const spd =
        (profile.streakSpeedMin + Math.random() * (profile.streakSpeedMax - profile.streakSpeedMin)) *
        Math.sqrt(scaleMul);
      if (useCone) {
        const coneAng = Math.random() * Math.PI * 2;
        const coneSpread = 0.22 + Math.random() * 0.72;
        const axial = s < 2 ? -0.65 : 1.0; // 2 exit-side spall streaks + 6 entry spall cone
        tmpVec
          .copy(tmpConeDir)
          .multiplyScalar(axial)
          .addScaledVector(tmpTanA, Math.cos(coneAng) * coneSpread)
          .addScaledVector(tmpTanB, Math.sin(coneAng) * coneSpread)
          .normalize();
        st.vel.copy(tmpVec).multiplyScalar(spd);
      } else {
        const theta = (s / Math.max(1, slot.activeStreaks)) * Math.PI * 2 + Math.random() * 0.55;
        const phi = Math.acos(2 * Math.random() - 1);
        st.vel.set(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.cos(phi) * spd,
          Math.sin(phi) * Math.sin(theta) * spd,
        );
      }

      st.mesh.visible = true;
      st.mesh.position.copy(pos);
      tmpLook.copy(pos).add(st.vel);
      st.mesh.lookAt(tmpLook);
      const thick = weapon === 'emp' ? 0.82 : weapon === 'heavy_plasma' ? 1.85 : 1.35;
      st.baseScale.set(
        thick * scaleMul,
        thick * scaleMul,
        profile.streakLength * (1.15 + Math.random() * 0.85) * scaleMul,
      );
      st.mesh.scale.copy(st.baseScale);
    }

    // 2. Tumbling 3D hull armor plates / molten plasma slag / missile shrapnel
    slot.shardMat.color.setHex(profile.shardColorHex);
    slot.shardMat.emissive.setHex(profile.shardEmissiveHex);
    slot.shardMat.emissiveIntensity = profile.shardEmissiveIntensity;
    slot.activeShards = Math.min(MAX_SHARDS, profile.shardCount);
    for (let d = 0; d < MAX_SHARDS; d++) {
      const sh = slot.shards[d];
      if (d >= slot.activeShards) {
        sh.mesh.visible = false;
        continue;
      }
      const spd =
        (profile.shardSpeedMin + Math.random() * (profile.shardSpeedMax - profile.shardSpeedMin)) *
        Math.sqrt(scaleMul);
      if (useCone) {
        const coneAng = Math.random() * Math.PI * 2;
        const coneSpread = 0.35 + Math.random() * 0.85;
        tmpVec
          .copy(tmpConeDir)
          .addScaledVector(tmpTanA, Math.cos(coneAng) * coneSpread)
          .addScaledVector(tmpTanB, Math.sin(coneAng) * coneSpread)
          .normalize();
        sh.vel.copy(tmpVec).multiplyScalar(spd);
      } else {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        sh.vel.set(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.cos(phi) * spd,
          Math.sin(phi) * Math.sin(theta) * spd,
        );
      }
      sh.rotVel.set(
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
      );
      sh.mesh.visible = true;
      sh.mesh.position.copy(pos);
      const sBase = profile.shardScale * 1.75 * scaleMul;
      sh.baseScale.set(
        sBase * (0.75 + Math.random() * 0.9),
        sBase * (0.65 + Math.random() * 0.7),
        sBase * (0.85 + Math.random() * 1.15),
      );
      sh.mesh.scale.copy(sh.baseScale);
      sh.mesh.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    }

    // 3. Scorch smoke plumes (Heavy Plasma thermal soot & Missile detonation smoke)
    slot.activeSmokes = profile.hasSmokePlume ? Math.min(MAX_SMOKES, profile.smokeCount) : 0;
    for (let p = 0; p < MAX_SMOKES; p++) {
      const sm = slot.smokes[p];
      if (p >= slot.activeSmokes) {
        sm.sprite.visible = false;
        continue;
      }
      const ang = (p / Math.max(1, slot.activeSmokes)) * Math.PI * 2 + Math.random() * 0.7;
      const drift = (5.5 + Math.random() * 9.0) * scaleMul;
      sm.sprite.visible = true;
      sm.sprite.position.set(
        pos.x + Math.cos(ang) * 0.6 * scaleMul,
        pos.y + (Math.random() - 0.5) * 0.8 * scaleMul,
        pos.z + Math.sin(ang) * 0.6 * scaleMul,
      );
      sm.vel.set(
        Math.cos(ang) * drift,
        (Math.random() - 0.5) * drift,
        Math.sin(ang) * drift,
      );
      sm.baseScale = (2.2 + Math.random() * 1.6) * scaleMul;
      sm.sprite.scale.setScalar(sm.baseScale * 0.55);
      const smMat = sm.sprite.material as THREE.SpriteMaterial;
      smMat.color.setHex(profile.smokeColorHex);
      smMat.opacity = 0.74;
    }
  };

  const update = (dt: number) => {
    const safeDt = Math.min(dt, 0.05);
    for (let i = 0; i < pool.length; i++) {
      const ex = pool[i];
      if (!ex.active) continue;

      ex.age += safeDt;
      const t = ex.age / ex.duration;
      if (t >= 1) {
        ex.active = false;
        ex.coreFlash.visible = false;
        ex.shockwave.visible = false;
        ex.light.intensity = 0;
        for (const p of ex.plumes) p.sprite.visible = false;
        for (const d of ex.debris) d.mesh.visible = false;
        continue;
      }

      // 1. Sharp core flash decays in first 18%
      const flashAlpha = Math.max(0, 1 - t / 0.18);
      (ex.coreFlash.material as THREE.SpriteMaterial).opacity = flashAlpha * 0.92;
      ex.coreFlash.scale.setScalar((1.8 + t * 11) * ex.scale);
      ex.light.intensity = Math.max(0, (1 - t / 0.3) * 18 * Math.min(2.2, ex.scale));

      // 2. Thin shockwave pressure ring expands sharply
      const ringAlpha = Math.max(0, 1 - t / 0.38);
      ex.shockwave.scale.setScalar((0.6 + t * 22) * ex.scale);
      (ex.shockwave.material as THREE.MeshBasicMaterial).opacity = ringAlpha * 0.65;

      // 3. Fire-to-dark-smoke plumes
      const drag = Math.exp(-safeDt * 1.9);
      for (const p of ex.plumes) {
        p.sprite.position.addScaledVector(p.vel, safeDt);
        p.vel.multiplyScalar(drag);
        if (!ex.isSpace && !p.isFire) {
          p.vel.y += 1.6 * safeDt;
        }
        const grow = p.isFire ? 0.5 + t * 2.1 : 0.55 + t * 3.0;
        p.sprite.scale.setScalar(p.baseScale * grow);
        const mat = p.sprite.material as THREE.SpriteMaterial;
        if (p.isFire) {
          mat.opacity = Math.max(0, (1 - t / 0.52) * 0.88);
        } else {
          mat.opacity = t < 0.14 ? (t / 0.14) * 0.68 : Math.max(0, (1 - (t - 0.14) / 0.86) * 0.68);
        }
      }

      // 4. Tumbling angular hull/rock shards
      for (const d of ex.debris) {
        d.mesh.position.addScaledVector(d.vel, safeDt);
        if (!ex.isSpace) {
          d.vel.y -= 16.5 * safeDt;
        }
        d.mesh.rotation.x += d.rotVel.x * safeDt;
        d.mesh.rotation.y += d.rotVel.y * safeDt;
        d.mesh.rotation.z += d.rotVel.z * safeDt;
        const shrink = Math.max(0.01, 1 - t * 0.88);
        d.mesh.scale.copy(d.baseScale).multiplyScalar(shrink);
      }
    }

    for (let i = 0; i < ripplePool.length; i++) {
      const r = ripplePool[i];
      if (!r.active) continue;
      r.age += safeDt;
      const t = r.age / r.duration;
      if (t >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      r.mesh.scale.setScalar(r.baseRadius * (0.88 + t * 0.22));
      r.mat.opacity = (1 - t) * 0.18;
    }

    for (let i = 0; i < sparkPool.length; i++) {
      const sb = sparkPool[i];
      if (!sb.active) continue;
      sb.age += safeDt;
      const t = sb.age / sb.duration;
      if (t >= 1) {
        sb.active = false;
        sb.flash.visible = false;
        for (const s of sb.sparks) s.mesh.visible = false;
        continue;
      }
      (sb.flash.material as THREE.SpriteMaterial).opacity = Math.max(0, (1 - t / 0.45) * 0.9);
      sb.sparkMat.opacity = Math.max(0, (1 - t) * 0.95);
      for (const s of sb.sparks) {
        s.mesh.position.addScaledVector(s.vel, safeDt);
        s.mesh.scale.multiplyScalar(Math.max(0.75, 1 - safeDt * 2.2));
      }
    }

    // Update distinct 5-weapon impact debris bursts
    const debrisDrag = Math.exp(-safeDt * 1.45);
    for (let i = 0; i < weaponDebrisPool.length; i++) {
      const wb = weaponDebrisPool[i];
      if (!wb.active) continue;
      wb.age += safeDt;
      const t = wb.age / wb.duration;
      if (t >= 1) {
        wb.active = false;
        wb.flash.visible = false;
        wb.ring.visible = false;
        for (let s = 0; s < wb.activeStreaks; s++) wb.streaks[s].mesh.visible = false;
        for (let d = 0; d < wb.activeShards; d++) wb.shards[d].mesh.visible = false;
        for (let p = 0; p < wb.activeSmokes; p++) wb.smokes[p].sprite.visible = false;
        continue;
      }

      // Flash decay
      const flashAlpha = Math.max(0, 1 - t / 0.34);
      (wb.flash.material as THREE.SpriteMaterial).opacity = flashAlpha * 0.95;
      wb.flash.scale.setScalar(wb.flashBaseScale * (0.9 + t * 1.8));

      // Expanding ring (EMP disruptor wave, Plasma splash, Missile shockwave, Rail entry ring)
      if (wb.hasRing) {
        const ringT = wb.weapon === 'emp' ? Math.pow(t, 0.65) : Math.pow(t, 0.78);
        wb.ring.scale.setScalar(0.6 + ringT * wb.ringMaxScale);
        wb.ringMat.opacity = Math.max(0, (1 - t) * (wb.weapon === 'emp' ? 0.85 : 0.72));
      }

      // Streaks / Electric Arcs
      const empFlicker = wb.weapon === 'emp' ? 0.55 + 0.45 * Math.sin(wb.age * 78 + i) : 1.0;
      wb.streakMat.opacity = Math.max(0, (1 - t) * 0.95 * empFlicker);
      for (let s = 0; s < wb.activeStreaks; s++) {
        const st = wb.streaks[s];
        st.mesh.position.addScaledVector(st.vel, safeDt);
        st.vel.multiplyScalar(debrisDrag);
        const fadeScale = Math.max(0.12, 1 - t * 0.82);
        st.mesh.scale.set(
          st.baseScale.x * fadeScale,
          st.baseScale.y * fadeScale,
          st.baseScale.z * (wb.weapon === 'emp' ? 0.75 + 0.5 * empFlicker : fadeScale),
        );
      }

      // Tumbling 3D hull plates & molten slag shards (cool slightly as they fly)
      wb.shardMat.emissiveIntensity = Math.max(0.15, (1 - t * 0.75) * 1.45);
      for (let d = 0; d < wb.activeShards; d++) {
        const sh = wb.shards[d];
        sh.mesh.position.addScaledVector(sh.vel, safeDt);
        sh.mesh.rotation.x += sh.rotVel.x * safeDt;
        sh.mesh.rotation.y += sh.rotVel.y * safeDt;
        sh.mesh.rotation.z += sh.rotVel.z * safeDt;
        const shrink = Math.max(0.05, 1 - t * 0.78);
        sh.mesh.scale.copy(sh.baseScale).multiplyScalar(shrink);
      }

      // Smoke / scorch plumes
      for (let p = 0; p < wb.activeSmokes; p++) {
        const sm = wb.smokes[p];
        sm.sprite.position.addScaledVector(sm.vel, safeDt);
        sm.vel.multiplyScalar(debrisDrag);
        sm.sprite.scale.setScalar(sm.baseScale * (0.55 + t * 2.1));
        (sm.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, (1 - t) * 0.68);
      }
    }

    // Update multi-stage pooled ship destructions (Fighter / Heavy / Capital)
    const shipDrag = Math.exp(-safeDt * 0.68);
    const smokeDrag = Math.exp(-safeDt * 1.15);
    for (let i = 0; i < allShipDestructionSlots.length; i++) {
      const sd = allShipDestructionSlots[i];
      if (!sd.active) continue;

      sd.age += safeDt;
      const prof = sd.profile;

      if (sd.age >= prof.totalDurationSec) {
        sd.active = false;
        resetShipDestructionVisuals(sd);
        continue;
      }

      // 1. Initial localized impact flash
      if (sd.impactFlash.visible) {
        const fT = sd.age / Math.max(0.05, prof.initialFlashDurationSec);
        if (fT >= 1) {
          sd.impactFlash.visible = false;
        } else {
          (sd.impactFlash.material as THREE.SpriteMaterial).opacity = (1 - fT) * 0.96;
          sd.impactFlash.scale.setScalar(prof.mainBlastScale * (1.8 + fT * 4.5) * sd.scale);
        }
      }

      // 2. Staggered secondary subsystem / engine / weapon-deck / bridge detonations
      for (let s = 0; s < prof.secondaryDetonations.length; s++) {
        if (sd.secondaryFired[s]) continue;
        const spec = prof.secondaryDetonations[s];
        if (sd.age >= spec.delaySec) {
          sd.secondaryFired[s] = true;
          tmpStagePos.set(
            sd.origin.x + spec.offsetDir[0] * spec.offsetDist * sd.scale,
            sd.origin.y + spec.offsetDir[1] * spec.offsetDist * sd.scale,
            sd.origin.z + spec.offsetDir[2] * spec.offsetDist * sd.scale,
          );
          spawnExplosion(tmpStagePos, spec.scale * sd.scale, {
            isSpace: true,
            colorHex: spec.colorHex,
          });
          if (sd.light) {
            sd.light.position.copy(tmpStagePos);
            sd.light.intensity = prof.lightPeakIntensity * 0.62;
          }
          sd.onStageDetonation?.({
            pos: tmpStagePos.clone(),
            destructionClass: sd.destructionClass,
            isSecondary: true,
            kind: spec.kind,
            scale: spec.scale * sd.scale,
          });
        }
      }

      // 3. Trigger main plasma detonation & structural breakup on schedule
      if (!sd.mainDetonated && sd.age >= prof.mainBlastDelaySec) {
        triggerMainShipDetonation(sd);
      }

      if (!sd.mainDetonated) continue;

      const postAge = sd.age - prof.mainBlastDelaySec;
      const postDur = Math.max(0.5, prof.totalDurationSec - prof.mainBlastDelaySec);
      const t = Math.max(0, Math.min(1, postAge / postDur));

      // Main flash & incandescent expanding fireball cooling
      const mainFlashAlpha = Math.max(0, 1 - t / 0.24);
      (sd.mainFlash.material as THREE.SpriteMaterial).opacity = mainFlashAlpha * 0.96;
      sd.mainFlash.scale.setScalar(prof.mainBlastScale * (3.6 + t * 14.5) * sd.scale);

      const coreAlpha = Math.max(0, 1 - t / 0.38);
      sd.coreSphere.visible = coreAlpha > 0.01;
      if (sd.coreSphere.visible) {
        sd.coreSphere.scale.setScalar(prof.mainBlastScale * (1.4 + Math.pow(t, 0.55) * 8.2) * sd.scale);
        sd.coreMat.opacity = coreAlpha * 0.78;
        sd.coreMat.color.copy(tmpHotColor).lerp(tmpWarmColor, Math.min(1, t * 2.8));
      }

      if (sd.light) {
        sd.light.intensity = Math.max(0, (1 - t / 0.45) * prof.lightPeakIntensity);
      }

      // Layered expanding shockwave rings
      for (let s = 0; s < sd.shockwaves.length; s++) {
        const sw = sd.shockwaves[s];
        const swAge = postAge - sw.delayOffset;
        if (swAge < 0) {
          sw.mat.opacity = 0;
          continue;
        }
        const swDur = postDur * (0.42 + s * 0.12);
        const swT = Math.min(1, swAge / swDur);
        if (swT >= 1) {
          sw.mesh.visible = false;
        } else {
          sw.mesh.visible = true;
          sw.mesh.scale.setScalar(prof.mainBlastScale * 0.7 + Math.pow(swT, 0.62) * sw.maxRadiusScale * sd.scale);
          sw.mat.opacity = Math.max(0, (1 - swT) * (s === 0 ? 0.85 : 0.62));
        }
      }

      // Controlled-opacity smoke & plasma fire clouds
      for (let p = 0; p < sd.smokes.length; p++) {
        const sm = sd.smokes[p];
        sm.sprite.position.addScaledVector(sm.vel, safeDt);
        sm.vel.multiplyScalar(smokeDrag);
        const grow = sm.isFireCore ? 0.55 + Math.pow(t, 0.7) * 2.2 : 0.6 + Math.pow(t, 0.75) * 3.1;
        sm.sprite.scale.setScalar(sm.baseScale * grow);
        const mat = sm.sprite.material as THREE.SpriteMaterial;
        if (sm.isFireCore) {
          mat.opacity = Math.max(0, (1 - t / 0.48) * sm.maxOpacity);
        } else {
          const fadeIn = Math.min(1, t / 0.14);
          const fadeOut = Math.max(0, 1 - Math.max(0, t - 0.14) / 0.86);
          mat.opacity = fadeIn * fadeOut * sm.maxOpacity;
        }
      }

      // Sparks & incandescent streaks
      sd.sparkMat.opacity = Math.max(0, (1 - t / 0.58) * 0.95);
      for (let sp = 0; sp < sd.sparks.length; sp++) {
        const sk = sd.sparks[sp];
        if (t > 0.62) {
          sk.mesh.visible = false;
          continue;
        }
        sk.mesh.position.addScaledVector(sk.vel, safeDt);
        sk.vel.multiplyScalar(smokeDrag);
        const fade = Math.max(0.08, 1 - t / 0.62);
        sk.mesh.scale.set(sk.baseScale.x * fade, sk.baseScale.y * fade, sk.baseScale.z * fade);
      }

      // Separating 3D spacecraft parts (wings, engines, armor plates) with cooling heat curve & fading embers
      const heat = computeDebrisHeatFactor(postAge, postDur);
      sd.debrisMat.emissive.copy(tmpColdColor).lerp(tmpWarmColor, heat);
      sd.debrisMat.emissiveIntensity = heat * 1.6;
      const partFade = t > 0.72 ? Math.max(0.02, 1 - (t - 0.72) / 0.28) : 1.0;

      for (let d = 0; d < sd.parts.length; d++) {
        const part = sd.parts[d];
        part.mesh.position.addScaledVector(part.vel, safeDt);
        part.vel.multiplyScalar(shipDrag);
        part.mesh.rotation.x += part.rotVel.x * safeDt;
        part.mesh.rotation.y += part.rotVel.y * safeDt;
        part.mesh.rotation.z += part.rotVel.z * safeDt;
        part.mesh.scale.copy(part.baseScale).multiplyScalar(partFade);

        if (part.hasEmber && part.ember.visible) {
          // Offset ember slightly behind debris velocity vector to read like a burning trail
          part.ember.position
            .copy(part.mesh.position)
            .addScaledVector(part.vel, -0.045);
          (part.ember.material as THREE.SpriteMaterial).opacity = heat * 0.78;
          part.ember.scale.setScalar(Math.max(0.2, part.baseScale.x * (1.8 + (1 - heat) * 1.4) * heat));
          if (heat < 0.04) part.ember.visible = false;
        }
      }
    }
  };

  const getDiagnostics = (): ExplosionSystemDiagnostics => {
    let activeExplosions = 0;
    for (let i = 0; i < pool.length; i++) if (pool[i].active) activeExplosions++;
    let activeWeaponDebris = 0;
    for (let i = 0; i < weaponDebrisPool.length; i++) if (weaponDebrisPool[i].active) activeWeaponDebris++;
    const activeByClass: Record<DestructionClass, number> = {
      fighter: 0,
      heavy: 0,
      capital: 0,
    };
    for (let i = 0; i < allShipDestructionSlots.length; i++) {
      if (allShipDestructionSlots[i].active) {
        activeByClass[allShipDestructionSlots[i].destructionClass]++;
      }
    }
    return {
      activeExplosions,
      activeWeaponDebris,
      activeShipDestructions:
        activeByClass.fighter + activeByClass.heavy + activeByClass.capital,
      activeByClass,
      poolCapacity: {
        fighter: DESTRUCTION_POOL_LIMITS.fighterSlots,
        heavy: DESTRUCTION_POOL_LIMITS.heavySlots,
        capital: DESTRUCTION_POOL_LIMITS.capitalSlots,
      },
    };
  };

  return {
    group,
    spawnExplosion,
    spawnShipDestruction,
    spawnShieldRipple,
    spawnImpactSparks,
    spawnWeaponImpactDebris,
    getDiagnostics,
    update,
    dispose: () => {
      ringGeo.dispose();
      innerShockGeo.dispose();
      fireballGeo.dispose();
      debrisGeo.dispose();
      plateShardGeo.dispose();
      wingFragmentGeo.dispose();
      engineNacelleGeo.dispose();
      armorBulkheadGeo.dispose();
      shieldGeo.dispose();
      sparkGeo.dispose();
      for (const m of disposableMats) m.dispose();
    },
  };
}
