import type { EnemyShipClass, SpaceWeaponId } from './spacePhysics';
import type { RailShakeSample } from './railImpactFx';

export type CameraShakeMode = 'full' | 'reduced' | 'off';

export interface Vec3Point {
  x: number;
  y: number;
  z: number;
}

export interface SpatialAudioResult {
  pan: number; // -1 (hard left) .. +1 (hard right)
  gain: number; // 0.08 .. 1.0 distance-attenuated gain multiplier
  lowpassHz: number; // subtle behind-camera high-frequency rolloff
  distanceMeters: number;
}

export interface WeaponImpactDebrisProfile {
  weapon: SpaceWeaponId;
  flashColorHex: number;
  flashScale: number;
  streakColorHex: number;
  streakCount: number;
  streakSpeedMin: number;
  streakSpeedMax: number;
  streakLength: number;
  shardColorHex: number;
  shardEmissiveHex: number;
  shardEmissiveIntensity: number;
  shardCount: number;
  shardSpeedMin: number;
  shardSpeedMax: number;
  shardScale: number;
  hasShockRing: boolean;
  ringColorHex: number;
  ringMaxScale: number;
  hasSmokePlume: boolean;
  smokeColorHex: number;
  smokeCount: number;
  directionalCone: boolean;
  durationSec: number;
}

export function isCameraShakeMode(value: unknown): value is CameraShakeMode {
  return value === 'full' || value === 'reduced' || value === 'off';
}

export function getCameraShakeMultiplier(mode: CameraShakeMode): number {
  if (mode === 'off') return 0;
  if (mode === 'reduced') return 0.38;
  return 1.0;
}

export function getDistortionAccessibilityMultiplier(mode: CameraShakeMode): number {
  if (mode === 'off') return 0;
  if (mode === 'reduced') return 0.45;
  return 1.0;
}

export function applyCameraShakeAccessibility(
  sample: RailShakeSample,
  mode: CameraShakeMode,
): RailShakeSample {
  const mult = getCameraShakeMultiplier(mode);
  if (mult <= 0 || !sample.active) {
    return {
      active: false,
      intensity: 0,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitchRad: 0,
      yawRad: 0,
      rollRad: 0,
      fovPunchDeg: 0,
    };
  }
  if (mult >= 0.999) return sample;
  return {
    active: true,
    intensity: Number((sample.intensity * mult).toFixed(4)),
    offsetX: sample.offsetX * mult,
    offsetY: sample.offsetY * mult,
    offsetZ: sample.offsetZ * mult,
    pitchRad: sample.pitchRad * mult,
    yawRad: sample.yawRad * mult,
    rollRad: sample.rollRad * mult,
    fovPunchDeg: sample.fovPunchDeg * mult,
  };
}

/**
 * Pure 3D spatial stereo panning and distance attenuation relative to camera/listener basis.
 * Computes signed lateral projection onto listenerRight for crisp left/right stereo cues,
 * smooth inverse-distance rolloff across the 80km space theater, and subtle rear-hemisphere
 * lowpass filtering so explosions and impacts behind the ship sound naturally positioned.
 */
export function computeSpatialAudioParams(
  listenerPos: Vec3Point,
  listenerRight: Vec3Point,
  listenerForward: Vec3Point,
  sourcePos: Vec3Point,
  maxRangeMeters = 2600,
): SpatialAudioResult {
  const dx = sourcePos.x - listenerPos.x;
  const dy = sourcePos.y - listenerPos.y;
  const dz = sourcePos.z - listenerPos.z;
  const dist = Math.hypot(dx, dy, dz);

  if (dist < 0.001) {
    return { pan: 0, gain: 1, lowpassHz: 18000, distanceMeters: 0 };
  }

  const invDist = 1 / dist;
  const nx = dx * invDist;
  const ny = dy * invDist;
  const nz = dz * invDist;

  // Normalize basis defensively
  const rLen = Math.hypot(listenerRight.x, listenerRight.y, listenerRight.z) || 1;
  const fLen = Math.hypot(listenerForward.x, listenerForward.y, listenerForward.z) || 1;

  const rightDot = (nx * listenerRight.x + ny * listenerRight.y + nz * listenerRight.z) / rLen;
  const fwdDot = (nx * listenerForward.x + ny * listenerForward.y + nz * listenerForward.z) / fLen;

  // Slightly compress near-zero pan within close range so point-blank hits feel centered and solid
  const closeBlend = Math.min(1, dist / 28);
  const pan = Math.max(-0.92, Math.min(0.92, rightDot * 0.92 * closeBlend));

  // Smooth distance attenuation floor of 0.10 so distant capital hits remain faintly audible
  const safeRange = Math.max(150, maxRangeMeters);
  const normDist = Math.min(1, dist / safeRange);
  const rolloff = 1 / (1 + Math.pow(normDist * 2.4, 1.55));
  const gain = Math.max(0.1, Math.min(1.0, rolloff));

  // Rear hemisphere subtle dulling (front: 18kHz, rear: ~4.2kHz) + distance air/hull dulling
  const rearFactor = fwdDot < 0 ? Math.min(1, -fwdDot) : 0;
  const lowpassHz = Math.round(
    Math.max(2200, 18000 - rearFactor * 11500 - normDist * 4800),
  );

  return {
    pan: Number(pan.toFixed(3)),
    gain: Number(gain.toFixed(3)),
    lowpassHz,
    distanceMeters: Math.round(dist),
  };
}

/**
 * Distinct, deterministic impact debris visual profiles for all 5 spacecraft weapon systems.
 * Guarantees each weapon produces unmistakable physical feedback on enemy hulls and shields:
 * - Pulse: crisp cyan-white ionized micro-sparks + fine hull chips
 * - Heavy Plasma: glowing molten amber/orange slag globules + scorch plume + thermal splash ring
 * - Missile: concussive high-explosive blast flash + jagged metallic shrapnel plates + dark smoke
 * - EMP: expanding violet-cyan ionized disruptor ring + crackling electric arc streaks
 * - Rail Cannon: directional hyper-velocity tungsten spall cone + white-hot sheared armor plates
 */
export function getWeaponImpactDebrisProfile(
  weapon: SpaceWeaponId,
  isShieldHit: boolean,
  targetClass: EnemyShipClass = 'fighter',
): WeaponImpactDebrisProfile {
  const classScale = targetClass === 'capital' ? 1.65 : targetClass === 'medium' ? 1.25 : 1.0;

  if (weapon === 'pulse') {
    return {
      weapon,
      flashColorHex: isShieldHit ? 0x72dcff : 0xccf4ff,
      flashScale: 1.75 * classScale,
      streakColorHex: isShieldHit ? 0x5cc8ff : 0x9ceeff,
      streakCount: isShieldHit ? 5 : 6,
      streakSpeedMin: 24,
      streakSpeedMax: 46,
      streakLength: 1.05 * classScale,
      shardColorHex: 0x4b5563,
      shardEmissiveHex: 0x38bdf8,
      shardEmissiveIntensity: isShieldHit ? 0.35 : 0.72,
      shardCount: isShieldHit ? 0 : 3,
      shardSpeedMin: 12,
      shardSpeedMax: 26,
      shardScale: 0.55 * classScale,
      hasShockRing: false,
      ringColorHex: 0x72dcff,
      ringMaxScale: 3.5 * classScale,
      hasSmokePlume: false,
      smokeColorHex: 0x1e2430,
      smokeCount: 0,
      directionalCone: false,
      durationSec: 0.34,
    };
  }

  if (weapon === 'heavy_plasma') {
    return {
      weapon,
      flashColorHex: 0xff9a3c,
      flashScale: 2.9 * classScale,
      streakColorHex: 0xffb84d,
      streakCount: 7,
      streakSpeedMin: 18,
      streakSpeedMax: 38,
      streakLength: 1.35 * classScale,
      shardColorHex: 0x3d2414,
      shardEmissiveHex: 0xff6a1a,
      shardEmissiveIntensity: 1.45,
      shardCount: isShieldHit ? 3 : 6,
      shardSpeedMin: 10,
      shardSpeedMax: 24,
      shardScale: 0.95 * classScale,
      hasShockRing: true,
      ringColorHex: 0xff7b29,
      ringMaxScale: 9.5 * classScale,
      hasSmokePlume: true,
      smokeColorHex: 0x331d14,
      smokeCount: 3,
      directionalCone: false,
      durationSec: 0.68,
    };
  }

  if (weapon === 'missile') {
    return {
      weapon,
      flashColorHex: 0xffd17a,
      flashScale: 3.6 * classScale,
      streakColorHex: 0xff8c38,
      streakCount: 8,
      streakSpeedMin: 28,
      streakSpeedMax: 58,
      streakLength: 1.6 * classScale,
      shardColorHex: 0x2d313a,
      shardEmissiveHex: 0xe85a1c,
      shardEmissiveIntensity: 0.95,
      shardCount: 7,
      shardSpeedMin: 18,
      shardSpeedMax: 42,
      shardScale: 1.15 * classScale,
      hasShockRing: true,
      ringColorHex: 0xffb35c,
      ringMaxScale: 13.5 * classScale,
      hasSmokePlume: true,
      smokeColorHex: 0x1d1e24,
      smokeCount: 4,
      directionalCone: false,
      durationSec: 0.82,
    };
  }

  if (weapon === 'emp') {
    return {
      weapon,
      flashColorHex: 0xb99cff,
      flashScale: 3.2 * classScale,
      streakColorHex: 0x8be9ff,
      streakCount: 8,
      streakSpeedMin: 22,
      streakSpeedMax: 52,
      streakLength: 2.15 * classScale,
      shardColorHex: 0x312e81,
      shardEmissiveHex: 0x9b7bff,
      shardEmissiveIntensity: 1.6,
      shardCount: 2,
      shardSpeedMin: 14,
      shardSpeedMax: 26,
      shardScale: 0.65 * classScale,
      hasShockRing: true,
      ringColorHex: 0x9b7bff,
      ringMaxScale: 18.0 * classScale,
      hasSmokePlume: false,
      smokeColorHex: 0x241d42,
      smokeCount: 0,
      directionalCone: false,
      durationSec: 0.62,
    };
  }

  // rail_cannon — hyper-velocity directional tungsten spall & white-hot sheared armor plates
  return {
    weapon: 'rail_cannon',
    flashColorHex: 0xe6faff,
    flashScale: 3.8 * classScale,
    streakColorHex: 0xc8f4ff,
    streakCount: 8,
    streakSpeedMin: 44,
    streakSpeedMax: 88,
    streakLength: 2.4 * classScale,
    shardColorHex: 0x2a2f3a,
    shardEmissiveHex: 0xff9230,
    shardEmissiveIntensity: 1.55,
    shardCount: 7,
    shardSpeedMin: 24,
    shardSpeedMax: 56,
    shardScale: 1.1 * classScale,
    hasShockRing: true,
    ringColorHex: 0x9ceeff,
    ringMaxScale: 12.5 * classScale,
    hasSmokePlume: !isShieldHit,
    smokeColorHex: 0x252830,
    smokeCount: isShieldHit ? 0 : 2,
    directionalCone: true,
    durationSec: 0.76,
  };
}

export interface ObstacleSphere {
  x: number;
  y: number;
  z: number;
  radius: number;
}

/**
 * Pure asteroid avoidance repulsion steering vector for enemy fighters so AI weaves
 * naturally around large/medium asteroids instead of clipping through rock geometry.
 */
export function computeAsteroidAvoidanceVector(
  actorPos: Vec3Point,
  obstacles: readonly ObstacleSphere[],
  clearanceMargin = 38,
): Vec3Point {
  let ax = 0;
  let ay = 0;
  let az = 0;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const safeDist = obs.radius + clearanceMargin;
    const dx = actorPos.x - obs.x;
    const dy = actorPos.y - obs.y;
    const dz = actorPos.z - obs.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq >= safeDist * safeDist) continue;
    const dist = Math.sqrt(distSq);
    if (dist < 0.001) {
      ay += 1;
      continue;
    }
    const weight = (safeDist - dist) / safeDist;
    const strength = weight * weight * 1.8;
    ax += (dx / dist) * strength;
    ay += (dy / dist) * strength;
    az += (dz / dist) * strength;
  }

  return { x: ax, y: ay, z: az };
}
