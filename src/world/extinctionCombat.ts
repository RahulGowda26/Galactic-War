import type { EnemyRoleFlightProfile, Vec3 } from './combatExpansion';
import type { ExtinctionBattleStage, ExtinctionEventKind } from './extinctionCampaign';

// ============================================================================
// 1. EXTINCTION ENEMY FLIGHT PROFILES (Catchable, bounded physical turn rates)
// ============================================================================

export const EXTINCTION_FLIGHT_PROFILES: Record<
  'phantom_interceptor' | 'hunter_drone' | 'disruptor_ship',
  EnemyRoleFlightProfile
> = {
  phantom_interceptor: {
    cruiseSpeed: 184,
    boostSpeed: 266,
    maxAccel: 155,
    maxTurnRadPerSec: 2.08,
    turnResponsiveness: 2.6,
    preferredRangeMin: 180,
    preferredRangeMax: 780,
    breakAwayDistance: 120,
    maxDisengageRange: 1120,
    strafeAmplitude: 145,
    verticalAmplitude: 96,
    bankMaxRad: 1.12,
    maxBoostDurationSec: 2.5,
    boostCooldownSec: 4.5,
    evasionCooldownSec: 3.1,
    recoveryDurationSec: 1.25,
  },
  hunter_drone: {
    cruiseSpeed: 192,
    boostSpeed: 268,
    maxAccel: 168,
    maxTurnRadPerSec: 2.25,
    turnResponsiveness: 2.9,
    preferredRangeMin: 165,
    preferredRangeMax: 680,
    breakAwayDistance: 105,
    maxDisengageRange: 1050,
    strafeAmplitude: 120,
    verticalAmplitude: 86,
    bankMaxRad: 1.15,
    maxBoostDurationSec: 2.2,
    boostCooldownSec: 4.4,
    evasionCooldownSec: 3.0,
    recoveryDurationSec: 1.1,
  },
  disruptor_ship: {
    cruiseSpeed: 94,
    boostSpeed: 128,
    maxAccel: 62,
    maxTurnRadPerSec: 0.92,
    turnResponsiveness: 1.25,
    preferredRangeMin: 460,
    preferredRangeMax: 1060,
    breakAwayDistance: 230,
    maxDisengageRange: 1180,
    strafeAmplitude: 90,
    verticalAmplitude: 42,
    bankMaxRad: 0.34,
    maxBoostDurationSec: 2.0,
    boostCooldownSec: 5.8,
    evasionCooldownSec: 5.2,
    recoveryDurationSec: 1.6,
  },
};

export const MAX_ACTIVE_HUNTER_DRONES = 12;

// ============================================================================
// 2. PHANTOM INTERCEPTOR STEALTH / CLOAK RULES
// ============================================================================

export interface PhantomCloakState {
  cloaked: boolean;
  cloakRemainingSec: number;
  cooldownRemainingSec: number;
  visualOpacity: number; // 0.16 when cloaked, 1.0 when revealed
  missileLockable: boolean;
  shimmerPhase: number;
}

export const PHANTOM_MAX_CLOAK_SEC = 4.5;
export const PHANTOM_CLOAK_COOLDOWN_SEC = 5.4;
export const PHANTOM_PROXIMITY_REVEAL_METERS = 260;
export const PHANTOM_LOCK_BLEED_METERS = 285;

export function createPhantomCloakState(startCloaked = true): PhantomCloakState {
  return {
    cloaked: startCloaked,
    cloakRemainingSec: startCloaked ? PHANTOM_MAX_CLOAK_SEC : 0,
    cooldownRemainingSec: startCloaked ? 0 : PHANTOM_CLOAK_COOLDOWN_SEC * 0.6,
    visualOpacity: startCloaked ? 0.16 : 1.0,
    missileLockable: !startCloaked,
    shimmerPhase: 0,
  };
}

export function stepPhantomCloak(
  prev: PhantomCloakState,
  input: {
    dt: number;
    distanceToPlayerMeters: number;
    justFired: boolean;
    tookDamage: boolean;
    empStunned: boolean;
  },
): { state: PhantomCloakState; decloakedNow: boolean; recloakedNow: boolean } {
  const safeDt = Math.max(0, Math.min(0.25, input.dt));
  let cloaked = prev.cloaked;
  let cloakRemainingSec = prev.cloakRemainingSec;
  let cooldownRemainingSec = prev.cooldownRemainingSec;
  let decloakedNow = false;
  let recloakedNow = false;

  const forcedReveal =
    input.justFired ||
    input.tookDamage ||
    input.empStunned ||
    input.distanceToPlayerMeters <= PHANTOM_PROXIMITY_REVEAL_METERS;

  if (cloaked) {
    cloakRemainingSec = Math.max(0, cloakRemainingSec - safeDt);
    if (forcedReveal || cloakRemainingSec <= 0) {
      cloaked = false;
      cloakRemainingSec = 0;
      cooldownRemainingSec = PHANTOM_CLOAK_COOLDOWN_SEC;
      decloakedNow = true;
    }
  } else {
    cooldownRemainingSec = Math.max(0, cooldownRemainingSec - safeDt);
    if (
      cooldownRemainingSec <= 0 &&
      !forcedReveal &&
      input.distanceToPlayerMeters > PHANTOM_PROXIMITY_REVEAL_METERS + 120
    ) {
      cloaked = true;
      cloakRemainingSec = PHANTOM_MAX_CLOAK_SEC;
      recloakedNow = true;
    }
  }

  const shimmerPhase = (prev.shimmerPhase + safeDt * 6.2) % (Math.PI * 2);
  const pulse = 0.05 * Math.sin(shimmerPhase);
  const visualOpacity = cloaked ? Math.max(0.14, 0.18 + pulse) : 1.0;
  const missileLockable = !cloaked || input.distanceToPlayerMeters <= PHANTOM_LOCK_BLEED_METERS;

  return {
    state: {
      cloaked,
      cloakRemainingSec,
      cooldownRemainingSec,
      visualOpacity,
      missileLockable,
      shimmerPhase,
    },
    decloakedNow,
    recloakedNow,
  };
}

// ============================================================================
// 3. HUNTER DRONE SWARM COORDINATOR
// ============================================================================

export function computeHunterDroneSwarmVector(input: {
  dronePos: Vec3;
  swarmIndex: number;
  swarmCount: number;
  playerPos: Vec3;
  neighborPositions: Vec3[];
  elapsedSec: number;
}): Vec3 {
  const count = Math.max(1, input.swarmCount);
  const angleOffset = (input.swarmIndex / count) * Math.PI * 2 + input.elapsedSec * 0.55;
  const surroundRadius = 240 + (input.swarmIndex % 2) * 70;
  const elev = Math.sin(angleOffset * 1.5 + input.swarmIndex) * 95;

  const targetX = input.playerPos.x + Math.cos(angleOffset) * surroundRadius;
  const targetY = input.playerPos.y + elev;
  const targetZ = input.playerPos.z + Math.sin(angleOffset) * surroundRadius;

  let steerX = targetX - input.dronePos.x;
  let steerY = targetY - input.dronePos.y;
  let steerZ = targetZ - input.dronePos.z;

  // Separation force prevents multiple drones from occupying identical space
  const sepRadius = 78;
  for (let i = 0; i < input.neighborPositions.length; i++) {
    const nb = input.neighborPositions[i];
    const dx = input.dronePos.x - nb.x;
    const dy = input.dronePos.y - nb.y;
    const dz = input.dronePos.z - nb.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > 0.1 && d < sepRadius) {
      const weight = ((sepRadius - d) / sepRadius) * 210;
      steerX += (dx / d) * weight;
      steerY += (dy / d) * weight;
      steerZ += (dz / d) * weight;
    }
  }

  const len = Math.hypot(steerX, steerY, steerZ) || 1;
  return { x: steerX / len, y: steerY / len, z: steerZ / len };
}

// ============================================================================
// 4. DISRUPTOR SHIP TIMED ELECTRONIC WARFARE
// ============================================================================

export interface DisruptorFieldState {
  active: boolean;
  phaseTimerSec: number;
  cooldownSec: number;
}

export const DISRUPTOR_PULSE_DURATION_SEC = 2.4;
export const DISRUPTOR_PULSE_COOLDOWN_SEC = 5.2;
export const DISRUPTOR_EW_RANGE_METERS = 1150;
export const DISRUPTOR_SHIELD_SUPPORT_RANGE_METERS = 950;

export function createDisruptorFieldState(): DisruptorFieldState {
  return {
    active: false,
    phaseTimerSec: 0,
    cooldownSec: 2.8,
  };
}

export function stepDisruptorField(
  prev: DisruptorFieldState,
  input: {
    dt: number;
    alive: boolean;
    empStunned: boolean;
    distanceToPlayerMeters: number;
  },
): { state: DisruptorFieldState; pulseTriggered: boolean } {
  const safeDt = Math.max(0, Math.min(0.25, input.dt));
  if (!input.alive || input.empStunned) {
    return {
      state: { active: false, phaseTimerSec: 0, cooldownSec: DISRUPTOR_PULSE_COOLDOWN_SEC * 0.5 },
      pulseTriggered: false,
    };
  }

  if (prev.active) {
    const rem = Math.max(0, prev.phaseTimerSec - safeDt);
    if (rem <= 0) {
      return {
        state: {
          active: false,
          phaseTimerSec: 0,
          cooldownSec: DISRUPTOR_PULSE_COOLDOWN_SEC,
        },
        pulseTriggered: false,
      };
    }
    return {
      state: { active: true, phaseTimerSec: rem, cooldownSec: 0 },
      pulseTriggered: false,
    };
  }

  const nextCd = Math.max(0, prev.cooldownSec - safeDt);
  if (nextCd <= 0 && input.distanceToPlayerMeters <= DISRUPTOR_EW_RANGE_METERS) {
    return {
      state: {
        active: true,
        phaseTimerSec: DISRUPTOR_PULSE_DURATION_SEC,
        cooldownSec: 0,
      },
      pulseTriggered: true,
    };
  }

  return {
    state: { active: false, phaseTimerSec: 0, cooldownSec: nextCd },
    pulseTriggered: false,
  };
}

export interface AggregateEwEffect {
  ewActive: boolean;
  lockSpeedMultiplier: number; // strictly bounded >= 0.35 (never permanent lock!)
  reticleJitterPx: number; // strictly bounded <= 5px
  alliedShieldRegenPerSec: number;
  activePulseCount: number;
}

export function evaluateAggregateDisruptorEw(
  activePulseDistances: number[],
): AggregateEwEffect {
  let inRangeCount = 0;
  for (let i = 0; i < activePulseDistances.length; i++) {
    if (activePulseDistances[i] <= DISRUPTOR_EW_RANGE_METERS) {
      inRangeCount += 1;
    }
  }
  if (inRangeCount === 0) {
    return {
      ewActive: false,
      lockSpeedMultiplier: 1.0,
      reticleJitterPx: 0,
      alliedShieldRegenPerSec: 0,
      activePulseCount: 0,
    };
  }
  return {
    ewActive: true,
    lockSpeedMultiplier: inRangeCount > 1 ? 0.35 : 0.48,
    reticleJitterPx: Math.min(5, 2.5 + inRangeCount * 1.1),
    alliedShieldRegenPerSec: 4.5,
    activePulseCount: inRangeCount,
  };
}

// ============================================================================
// 5. FLEET FORMATION & SQUAD COORDINATION
// ============================================================================

export type FleetCoordinationOrder =
  | 'pincer_left'
  | 'pincer_right'
  | 'bomber_screen'
  | 'ew_anchor'
  | 'swarm_surround'
  | 'regroup';

export function computeFleetFormationOrder(input: {
  role: string;
  squadSlot: number;
  aliveAlliesCount: number;
  lowHullRatio: number;
  playerForward: Vec3;
  playerRight: Vec3;
  playerPos: Vec3;
}): { order: FleetCoordinationOrder; flankAnchor: Vec3 } {
  if (input.lowHullRatio < 0.25 && input.aliveAlliesCount > 1 && input.role !== 'hunter_drone') {
    const dir = input.squadSlot % 2 === 0 ? -1 : 1;
    return {
      order: 'regroup',
      flankAnchor: {
        x: input.playerPos.x + input.playerRight.x * dir * 480 + input.playerForward.x * 260,
        y: input.playerPos.y + 90,
        z: input.playerPos.z + input.playerRight.z * dir * 480 + input.playerForward.z * 260,
      },
    };
  }

  if (input.role === 'hunter_drone') {
    return {
      order: 'swarm_surround',
      flankAnchor: { ...input.playerPos },
    };
  }

  if (input.role === 'disruptor_ship') {
    return {
      order: 'ew_anchor',
      flankAnchor: {
        x: input.playerPos.x + input.playerForward.x * 680 + input.playerRight.x * 240,
        y: input.playerPos.y + 110,
        z: input.playerPos.z + input.playerForward.z * 680 + input.playerRight.z * 240,
      },
    };
  }

  if (input.role === 'bomber' || input.role === 'heavy_fighter') {
    return {
      order: 'bomber_screen',
      flankAnchor: {
        x: input.playerPos.x + input.playerForward.x * 520,
        y: input.playerPos.y + (input.squadSlot % 2 === 0 ? 70 : -70),
        z: input.playerPos.z + input.playerForward.z * 520,
      },
    };
  }

  const side = input.squadSlot % 2 === 0 ? -1 : 1;
  return {
    order: side < 0 ? 'pincer_left' : 'pincer_right',
    flankAnchor: {
      x: input.playerPos.x + input.playerRight.x * side * 340 + input.playerForward.x * 160,
      y: input.playerPos.y + (input.squadSlot % 3 - 1) * 65,
      z: input.playerPos.z + input.playerRight.z * side * 340 + input.playerForward.z * 160,
    },
  };
}

// ============================================================================
// 6. CONTROLLED STAGED BATTLE DIRECTOR & SPECIAL MISSION EVENTS
// ============================================================================

export interface BattleDirectorState {
  currentStageIndex: number; // 0-based
  totalStages: number;
  stages: ExtinctionBattleStage[];
  spawnedStageIndices: number[];
  totalWaveHostilesSpawned: number;
  stageElapsedSec: number;
  activeEvents: ExtinctionEventKind[];
  completed: boolean;
}

export function createBattleDirector(stages: ExtinctionBattleStage[]): BattleDirectorState {
  return {
    currentStageIndex: 0,
    totalStages: stages.length,
    stages,
    spawnedStageIndices: stages.length > 0 ? [0] : [],
    totalWaveHostilesSpawned: 0,
    stageElapsedSec: 0,
    activeEvents: stages[0]?.triggerEvents ? [...stages[0].triggerEvents] : [],
    completed: stages.length === 0,
  };
}

export function stepBattleDirector(
  prev: BattleDirectorState,
  input: {
    dt: number;
    aliveHostiles: number;
    bossPhase: number; // 0 if none, 1..3 active, 4 defeated
    bossDefeated: boolean;
    survivalElapsedMet: boolean;
    extractionReached: boolean;
  },
): {
  state: BattleDirectorState;
  advancedToStage: ExtinctionBattleStage | null;
  spawnWave: Partial<Record<string, number>> | null;
  triggeredEvents: ExtinctionEventKind[];
} {
  if (prev.completed || prev.stages.length === 0) {
    return { state: prev, advancedToStage: null, spawnWave: null, triggeredEvents: [] };
  }

  const curStage = prev.stages[prev.currentStageIndex];
  const stageElapsedSec = prev.stageElapsedSec + Math.max(0, Math.min(0.25, input.dt));

  let conditionMet = false;
  switch (curStage.advanceWhen) {
    case 'stage_cleared':
      conditionMet = input.aliveHostiles <= 0 && stageElapsedSec >= 0.4;
      break;
    case 'boss_phase_2':
      conditionMet = input.bossPhase >= 2 || input.bossDefeated;
      break;
    case 'boss_phase_3':
      conditionMet = input.bossPhase >= 3 || input.bossDefeated;
      break;
    case 'boss_defeated':
      conditionMet = input.bossDefeated && input.aliveHostiles <= 0;
      break;
    case 'survival_elapsed':
      conditionMet = input.survivalElapsedMet;
      break;
    case 'extraction_reached':
      conditionMet = input.extractionReached;
      break;
  }

  if (!conditionMet) {
    return {
      state: { ...prev, stageElapsedSec },
      advancedToStage: null,
      spawnWave: null,
      triggeredEvents: [],
    };
  }

  const nextIdx = prev.currentStageIndex + 1;
  if (nextIdx >= prev.stages.length) {
    return {
      state: { ...prev, stageElapsedSec: 0, completed: true },
      advancedToStage: null,
      spawnWave: null,
      triggeredEvents: [],
    };
  }

  const nextStage = prev.stages[nextIdx];
  const alreadySpawned = prev.spawnedStageIndices.includes(nextIdx);
  const rawWave = alreadySpawned || input.bossDefeated ? {} : nextStage.enemyWaves;
  const availableSlots = Math.max(0, nextStage.maxConcurrentHostiles - input.aliveHostiles);

  // Enforce strict per-stage concurrent hostiles ceiling cleanly
  const clampedWave: Partial<Record<string, number>> = {};
  let budget = availableSlots;
  let added = 0;
  for (const [role, count] of Object.entries(rawWave)) {
    if (!count || count <= 0 || budget <= 0) continue;
    const take = Math.min(count, budget);
    clampedWave[role] = take;
    budget -= take;
    added += take;
  }

  const triggeredEvents = nextStage.triggerEvents ? [...nextStage.triggerEvents] : [];
  const mergedEvents = Array.from(new Set([...prev.activeEvents, ...triggeredEvents]));

  return {
    state: {
      ...prev,
      currentStageIndex: nextIdx,
      spawnedStageIndices: alreadySpawned
        ? prev.spawnedStageIndices
        : [...prev.spawnedStageIndices, nextIdx],
      totalWaveHostilesSpawned: prev.totalWaveHostilesSpawned + added,
      stageElapsedSec: 0,
      activeEvents: mergedEvents,
      completed: false,
    },
    advancedToStage: nextStage,
    spawnWave: added > 0 ? clampedWave : null,
    triggeredEvents,
  };
}

export interface OrbitalKillZonePylon {
  id: string;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  telegraphChargeSec: number; // 0..2.4s before firing
  cooldownSec: number;
  firingActiveSec: number;
}

export function createOrbitalKillZonePylons(count = 3, maxHp = 180): OrbitalKillZonePylon[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `okz_pylon_${idx + 1}`,
    hp: maxHp,
    maxHp,
    destroyed: false,
    telegraphChargeSec: 0,
    cooldownSec: 3.5 + idx * 1.4,
    firingActiveSec: 0,
  }));
}

export function stepOrbitalKillZonePylon(
  pylon: OrbitalKillZonePylon,
  dt: number,
  playerInZone: boolean,
): { pylon: OrbitalKillZonePylon; beamFiredThisStep: boolean; telegraphActive: boolean } {
  if (pylon.destroyed) {
    return { pylon, beamFiredThisStep: false, telegraphActive: false };
  }
  const safeDt = Math.max(0, Math.min(0.25, dt));
  let { telegraphChargeSec, cooldownSec, firingActiveSec } = pylon;
  let beamFiredThisStep = false;

  if (firingActiveSec > 0) {
    firingActiveSec = Math.max(0, firingActiveSec - safeDt);
  } else if (telegraphChargeSec > 0) {
    telegraphChargeSec += safeDt;
    if (telegraphChargeSec >= 2.2) {
      telegraphChargeSec = 0;
      firingActiveSec = 0.8;
      cooldownSec = 5.5;
      beamFiredThisStep = true;
    }
  } else {
    cooldownSec = Math.max(0, cooldownSec - safeDt);
    if (cooldownSec <= 0 && playerInZone) {
      telegraphChargeSec = 0.05;
    }
  }

  return {
    pylon: {
      ...pylon,
      telegraphChargeSec,
      cooldownSec,
      firingActiveSec,
    },
    beamFiredThisStep,
    telegraphActive: telegraphChargeSec > 0,
  };
}
