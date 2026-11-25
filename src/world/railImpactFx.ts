/**
 * Pure decoupled math for high-caliber Rail Cannon hull-plate impact camera shake
 * and localized screen-space refractive shockwave distortion pulses.
 */

export type RailImpactTargetClass = 'fighter' | 'medium' | 'capital';

export interface RailImpactTriggerInput {
  distanceMeters: number;
  targetClass: RailImpactTargetClass;
  directHull: boolean;
  killed?: boolean;
  seed?: number;
}

export interface RailShakeState {
  active: boolean;
  age: number;
  duration: number;
  amplitude: number; // 0..1.4 scaled by distance & armor mass
  seed: number;
  dirX: number; // deterministic kick bias -1..1
  dirY: number;
}

export interface RailShakeSample {
  active: boolean;
  intensity: number; // 0..1 current envelope
  offsetX: number; // camera-local meters
  offsetY: number;
  offsetZ: number;
  pitchRad: number; // radians
  yawRad: number;
  rollRad: number;
  fovPunchDeg: number; // degrees
}

export interface RailDistortionPulse {
  id: number;
  worldX: number;
  worldY: number;
  worldZ: number;
  age: number;
  duration: number;
  strength: number; // UV displacement strength at peak
  maxRadius: number; // aspect-corrected screen UV radius
  thickness: number; // shockwave ring thickness in UV
  chromatic: number; // RGB split multiplier
}

export interface RailDistortionShaderParams {
  active: boolean;
  radius: number;
  thickness: number;
  intensity: number;
  progress: number;
  chromatic: number;
}

export function createInitialRailShakeState(): RailShakeState {
  return {
    active: false,
    age: 0,
    duration: 0.48,
    amplitude: 0,
    seed: 1.37,
    dirX: 1,
    dirY: 1,
  };
}

/**
 * Computes distance-attenuated, armor-weighted impulse amplitude for a high-caliber
 * rail cannon hull plate impact.
 */
export function computeRailImpactWeight(input: RailImpactTriggerInput): number {
  const classWeight =
    input.targetClass === 'capital'
      ? 1.15
      : input.targetClass === 'medium'
        ? 0.92
        : 0.72;
  const dist = Math.max(0, input.distanceMeters);
  const distAtten = Math.max(0.32, Math.min(1.0, 1 / (1 + Math.pow(dist / 1350, 1.15))));
  const hullBonus = input.directHull ? 1.18 : 0.92;
  const killBonus = input.killed ? 1.16 : 1.0;
  return Math.min(1.45, classWeight * distAtten * hullBonus * killBonus);
}

/**
 * Triggers or stacks a heavy procedural camera shake impulse when a Rail Cannon slug
 * slams into enemy armor plating.
 */
export function triggerRailImpactShake(
  prev: RailShakeState,
  input: RailImpactTriggerInput,
): RailShakeState {
  const weight = computeRailImpactWeight(input);
  const remainingEnergy = prev.active
    ? prev.amplitude * Math.pow(Math.max(0, 1 - prev.age / Math.max(0.05, prev.duration)), 1.6)
    : 0;
  const combinedAmp = Math.min(1.5, Math.max(weight, remainingEnergy * 0.55 + weight * 0.85));
  const nextSeed = input.seed ?? ((prev.seed * 7.31 + 1.93) % 100);
  const dirX = Math.sin(nextSeed * 12.7) >= 0 ? 1 : -1;
  const dirY = Math.cos(nextSeed * 8.3) >= 0 ? 1 : -1;

  return {
    active: true,
    age: 0,
    duration: input.targetClass === 'capital' ? 0.56 : 0.46,
    amplitude: combinedAmp,
    seed: nextSeed,
    dirX,
    dirY,
  };
}

/**
 * Advances and evaluates the multi-harmonic damped procedural camera shake.
 * Combines a crisp high-frequency metallic impact snap with a heavier low-frequency recoil rumble.
 */
export function stepRailImpactShake(
  state: RailShakeState,
  dt: number,
  isCockpit = false,
): { state: RailShakeState; sample: RailShakeSample } {
  if (!state.active || state.amplitude <= 0.001) {
    return {
      state: { ...state, active: false, amplitude: 0 },
      sample: {
        active: false,
        intensity: 0,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitchRad: 0,
        yawRad: 0,
        rollRad: 0,
        fovPunchDeg: 0,
      },
    };
  }

  const nextAge = state.age + Math.max(0, dt);
  if (nextAge >= state.duration) {
    return {
      state: { ...state, active: false, age: state.duration, amplitude: 0 },
      sample: {
        active: false,
        intensity: 0,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitchRad: 0,
        yawRad: 0,
        rollRad: 0,
        fovPunchDeg: 0,
      },
    };
  }

  const t = nextAge;
  const norm = t / state.duration;
  // Rapid attack (within 15ms) + heavy exponential decay for crisp kinetic weight
  const attack = Math.min(1, t / 0.015);
  const fastDecay = Math.exp(-t * 9.5);
  const lowDecay = Math.exp(-t * 4.8);
  const env = attack * Math.pow(1 - norm, 1.35) * state.amplitude;
  const cockpitScale = isCockpit ? 0.55 : 1.0;

  // Multi-harmonic oscillation (high-freq kinetic shock + low-freq structural rumble)
  const ph = state.seed * 6.2831;
  const snapX = Math.sin(t * 74.0 + ph) * fastDecay * 0.65;
  const rumbleX = Math.sin(t * 21.0 + ph * 0.5) * lowDecay * 0.45 * state.dirX;
  const snapY = Math.cos(t * 68.0 + ph * 1.3) * fastDecay * 0.72;
  const rumbleY = Math.cos(t * 17.5 + ph * 0.7) * lowDecay * 0.48 * state.dirY;
  const recoilZ = Math.sin(Math.min(Math.PI, t * 24.0)) * fastDecay;

  const offsetX = (snapX + rumbleX) * 0.62 * env * cockpitScale;
  const offsetY = (snapY + rumbleY) * 0.54 * env * cockpitScale;
  const offsetZ = recoilZ * 0.48 * env * cockpitScale;

  // Rotational kick (pitch/yaw/roll) felt strongly in both chase & cockpit views
  const pitchRad = (snapY * 0.016 + rumbleY * 0.012) * env * (isCockpit ? 0.85 : 1.0);
  const yawRad = (snapX * 0.014 + rumbleX * 0.01) * env * (isCockpit ? 0.85 : 1.0);
  const rollRad =
    (Math.sin(t * 38.0 + ph) * fastDecay * 0.022 + state.dirX * lowDecay * 0.012) *
    env *
    (isCockpit ? 0.82 : 1.0);

  // Brief kinetic FOV compression punch that snaps back smoothly
  const fovPunchDeg =
    (-1.85 * Math.sin(Math.min(Math.PI, t * 26.0)) * fastDecay +
      0.65 * Math.sin(Math.min(Math.PI, t * 11.0)) * lowDecay) *
    state.amplitude;

  return {
    state: {
      ...state,
      age: nextAge,
    },
    sample: {
      active: true,
      intensity: Math.min(1, env),
      offsetX,
      offsetY,
      offsetZ,
      pitchRad,
      yawRad,
      rollRad,
      fovPunchDeg,
    },
  };
}

let nextDistortionPulseId = 1;

/**
 * Spawns a localized refractive shockwave pulse anchored to the 3D enemy hull impact point.
 */
export function createRailDistortionPulse(
  worldPos: { x: number; y: number; z: number },
  input: RailImpactTriggerInput,
): RailDistortionPulse {
  const weight = computeRailImpactWeight(input);
  const maxRadius =
    input.targetClass === 'capital'
      ? 0.21
      : input.targetClass === 'medium'
        ? 0.165
        : 0.13;
  const distScale = Math.max(0.65, Math.min(1.12, 1.12 - input.distanceMeters / 3400));

  return {
    id: nextDistortionPulseId++,
    worldX: worldPos.x,
    worldY: worldPos.y,
    worldZ: worldPos.z,
    age: 0,
    duration: input.targetClass === 'capital' ? 0.5 : 0.42,
    strength: Math.min(0.028, 0.014 + weight * 0.011),
    maxRadius: maxRadius * distScale,
    thickness: input.targetClass === 'capital' ? 0.036 : input.targetClass === 'medium' ? 0.028 : 0.024,
    chromatic: Math.min(1.15, 0.52 + weight * 0.36),
  };
}

/**
 * Advances all active localized distortion pulses and keeps at most 2 most-recent pulses.
 */
export function stepRailDistortionPulses(
  pulses: RailDistortionPulse[],
  dt: number,
): RailDistortionPulse[] {
  const safeDt = Math.max(0, dt);
  const next: RailDistortionPulse[] = [];
  for (let i = 0; i < pulses.length; i++) {
    const p = pulses[i];
    const age = p.age + safeDt;
    if (age < p.duration) {
      next.push({ ...p, age });
    }
  }
  return next.slice(-2);
}

/**
 * Evaluates shader-ready shockwave ring radius, thickness, and intensity for a pulse.
 */
export function evaluateRailDistortionPulse(
  pulse: RailDistortionPulse,
): RailDistortionShaderParams {
  const progress = Math.max(0, Math.min(1, pulse.age / Math.max(0.05, pulse.duration)));
  if (progress >= 1) {
    return {
      active: false,
      radius: 0,
      thickness: pulse.thickness,
      intensity: 0,
      progress: 1,
      chromatic: 0,
    };
  }
  // Fast initial supersonic wavefront expansion slowing smoothly (easeOutCubic)
  const eased = 1 - Math.pow(1 - progress, 3);
  const radius = 0.014 + (pulse.maxRadius - 0.014) * eased;
  const thickness = pulse.thickness * (0.72 + 0.55 * progress);
  const envelope = Math.min(1, progress / 0.06) * Math.pow(1 - progress, 1.45);
  return {
    active: envelope > 0.002,
    radius,
    thickness,
    intensity: pulse.strength * envelope,
    progress,
    chromatic: pulse.chromatic * envelope,
  };
}
