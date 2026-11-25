import type { EnemyFighterRole, EnemyShipClass } from './spacePhysics';
import type { ExtinctionEnemyRole } from './extinctionCampaign';
import type { CameraShakeMode } from './weaponFeedback';
import { getCameraShakeMultiplier } from './weaponFeedback';

export type DestructionClass = 'fighter' | 'heavy' | 'capital';

export interface SecondaryDetonationSpec {
  delaySec: number;
  offsetDir: [number, number, number]; // normalized-ish hull offset vector
  offsetDist: number;
  scale: number;
  colorHex: number;
  kind: 'hull_rupture' | 'engine_failure' | 'weapon_deck' | 'bridge_core' | 'ion_discharge';
}

export interface ShipDestructionProfile {
  destructionClass: DestructionClass;
  totalDurationSec: number;
  initialFlashDurationSec: number;
  mainBlastDelaySec: number;
  mainBlastScale: number;
  shockwaveLayers: number;
  shockwaveMaxRadius: number;
  smokePuffCount: number;
  smokeMaxOpacity: number; // controlled so explosions never blind the entire battlefield
  sparkCount: number;
  wingPartCount: number;
  enginePartCount: number;
  armorPlateCount: number;
  emberTrailCount: number;
  debrisMinSpeed: number;
  debrisMaxSpeed: number;
  lightPeakIntensity: number;
  lightRangeMeters: number;
  baseCameraShake: number; // capped & scaled by distance + accessibility shake mode
  cameraShakeRangeMeters: number;
  secondaryDetonations: SecondaryDetonationSpec[];
}

export const DESTRUCTION_POOL_LIMITS = {
  fighterSlots: 10,
  heavySlots: 6,
  capitalSlots: 2,
  maxDynamicLights: 4,
} as const;

export function classifyDestructionClass(
  shipClass: EnemyShipClass,
  role?: ExtinctionEnemyRole | EnemyFighterRole,
  isLegendary = false,
): DestructionClass {
  if (shipClass === 'capital') return 'capital';
  if (
    shipClass === 'medium' ||
    role === 'medium_warship' ||
    role === 'disruptor_ship' ||
    role === 'heavy_fighter' ||
    role === 'bomber' ||
    isLegendary
  ) {
    return 'heavy';
  }
  return 'fighter';
}

const FIGHTER_PROFILE: ShipDestructionProfile = {
  destructionClass: 'fighter',
  totalDurationSec: 2.65,
  initialFlashDurationSec: 0.16,
  mainBlastDelaySec: 0.11,
  mainBlastScale: 2.25,
  shockwaveLayers: 2,
  shockwaveMaxRadius: 34,
  smokePuffCount: 5,
  smokeMaxOpacity: 0.44,
  sparkCount: 14,
  wingPartCount: 2,
  enginePartCount: 1,
  armorPlateCount: 5,
  emberTrailCount: 6,
  debrisMinSpeed: 24,
  debrisMaxSpeed: 64,
  lightPeakIntensity: 24,
  lightRangeMeters: 110,
  baseCameraShake: 0.24,
  cameraShakeRangeMeters: 420,
  secondaryDetonations: [
    {
      delaySec: 0.0,
      offsetDir: [0, 0.2, 0.3],
      offsetDist: 3.5,
      scale: 1.0,
      colorHex: 0xfff3d1,
      kind: 'hull_rupture',
    },
  ],
};

const HEAVY_PROFILE: ShipDestructionProfile = {
  destructionClass: 'heavy',
  totalDurationSec: 3.85,
  initialFlashDurationSec: 0.22,
  mainBlastDelaySec: 0.62,
  mainBlastScale: 3.8,
  shockwaveLayers: 2,
  shockwaveMaxRadius: 68,
  smokePuffCount: 8,
  smokeMaxOpacity: 0.48,
  sparkCount: 22,
  wingPartCount: 3,
  enginePartCount: 2,
  armorPlateCount: 9,
  emberTrailCount: 10,
  debrisMinSpeed: 28,
  debrisMaxSpeed: 78,
  lightPeakIntensity: 36,
  lightRangeMeters: 210,
  baseCameraShake: 0.42,
  cameraShakeRangeMeters: 780,
  secondaryDetonations: [
    {
      delaySec: 0.0,
      offsetDir: [0.65, 0.25, -0.3],
      offsetDist: 10,
      scale: 1.5,
      colorHex: 0xffd78a,
      kind: 'hull_rupture',
    },
    {
      delaySec: 0.24,
      offsetDir: [-0.72, -0.15, 0.55],
      offsetDist: 14,
      scale: 1.85,
      colorHex: 0xff8c38,
      kind: 'weapon_deck',
    },
    {
      delaySec: 0.46,
      offsetDir: [0.1, -0.2, 0.92],
      offsetDist: 16,
      scale: 2.1,
      colorHex: 0x67e8f9,
      kind: 'engine_failure',
    },
  ],
};

const CAPITAL_PROFILE: ShipDestructionProfile = {
  destructionClass: 'capital',
  totalDurationSec: 7.4,
  initialFlashDurationSec: 0.35,
  mainBlastDelaySec: 4.35,
  mainBlastScale: 8.6,
  shockwaveLayers: 3,
  shockwaveMaxRadius: 310,
  smokePuffCount: 14,
  smokeMaxOpacity: 0.46,
  sparkCount: 32,
  wingPartCount: 4,
  enginePartCount: 4,
  armorPlateCount: 16,
  emberTrailCount: 16,
  debrisMinSpeed: 34,
  debrisMaxSpeed: 108,
  lightPeakIntensity: 68,
  lightRangeMeters: 620,
  baseCameraShake: 0.72,
  cameraShakeRangeMeters: 2400,
  secondaryDetonations: [
    {
      delaySec: 0.15,
      offsetDir: [-0.6, 0.25, -0.55],
      offsetDist: 62,
      scale: 2.8,
      colorHex: 0xffb35c,
      kind: 'hull_rupture',
    },
    {
      delaySec: 0.78,
      offsetDir: [0.7, 0.1, -0.2],
      offsetDist: 78,
      scale: 3.3,
      colorHex: 0xff7b28,
      kind: 'weapon_deck',
    },
    {
      delaySec: 1.45,
      offsetDir: [-0.55, -0.3, 0.45],
      offsetDist: 86,
      scale: 3.6,
      colorHex: 0xff6224,
      kind: 'weapon_deck',
    },
    {
      delaySec: 2.18,
      offsetDir: [0.22, -0.18, 0.92],
      offsetDist: 112,
      scale: 4.4,
      colorHex: 0x38bdf8,
      kind: 'ion_discharge',
    },
    {
      delaySec: 2.85,
      offsetDir: [-0.28, 0.12, 0.88],
      offsetDist: 108,
      scale: 4.1,
      colorHex: 0x67e8f9,
      kind: 'engine_failure',
    },
    {
      delaySec: 3.55,
      offsetDir: [0.0, 0.75, 0.35],
      offsetDist: 74,
      scale: 4.8,
      colorHex: 0xfff0c2,
      kind: 'bridge_core',
    },
  ],
};

export function getShipDestructionProfile(
  destructionClass: DestructionClass,
): ShipDestructionProfile {
  if (destructionClass === 'capital') return CAPITAL_PROFILE;
  if (destructionClass === 'heavy') return HEAVY_PROFILE;
  return FIGHTER_PROFILE;
}

/**
 * Computes distance-attenuated, accessibility-compliant explosion camera shake amplitude.
 * Strictly capped so even point-blank capital ship detonations never disorient the player.
 */
export function computeExplosionCameraShake(input: {
  destructionClass: DestructionClass;
  distanceMeters: number;
  shakeMode: CameraShakeMode;
  isSecondary?: boolean;
}): number {
  const accessMult = getCameraShakeMultiplier(input.shakeMode);
  if (accessMult <= 0) return 0;

  const profile = getShipDestructionProfile(input.destructionClass);
  const safeDist = Math.max(0, input.distanceMeters);
  if (safeDist >= profile.cameraShakeRangeMeters) return 0;

  const falloff = Math.pow(1 - safeDist / profile.cameraShakeRangeMeters, 1.45);
  const stageScale = input.isSecondary ? 0.42 : 1.0;
  const raw = profile.baseCameraShake * falloff * stageScale * accessMult;
  return Number(Math.min(0.68, Math.max(0, raw)).toFixed(4));
}

/**
 * Computes normalized cooling color temperature (1 = incandescent white-orange, 0 = dark cooled metal)
 * for debris fragments traveling through space.
 */
export function computeDebrisHeatFactor(ageSec: number, totalDurationSec: number): number {
  if (totalDurationSec <= 0) return 0;
  const t = Math.max(0, Math.min(1, ageSec / totalDurationSec));
  return Number(Math.pow(1 - t, 1.65).toFixed(4));
}
