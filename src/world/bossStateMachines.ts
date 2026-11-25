import type { ExtinctionBossId, ExtinctionBossKind } from './extinctionCampaign';

export interface HarvesterEnergyCoreState {
  id: 'core_alpha' | 'core_beta' | 'core_gamma';
  label: string;
  angleOffsetRad: number;
  hp: number;
  maxHp: number;
  destroyed: boolean;
}

export interface BossPhaseTransitionEvent {
  bossId: ExtinctionBossId;
  fromPhase: number;
  toPhase: number;
  phaseKey: string;
  phaseLabel: string;
  headline: string;
}

export interface BossStateMachine {
  bossId: ExtinctionBossId;
  bossKind: ExtinctionBossKind;
  bossName: string;
  phase: 1 | 2 | 3 | 4; // 1..3 active combat, 4 = defeated / meltdown
  phaseKey: string;
  phaseLabel: string;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  defeated: boolean;
  /** True ONLY when an explicit breakable mechanic protects main hull (always clears automatically!). */
  mainHullInvulnerable: boolean;
  invulnerableReason: string | null;
  damageResistanceMult: number; // <1 armored, 1 normal, >1 exposed critical window
  /** Telegraph attack cycle (used by Siege Breaker, Iron Revenant, Sovereign, Executioner). */
  telegraphActive: boolean;
  telegraphLabel: string | null;
  telegraphRemainingSec: number;
  telegraphCooldownSec: number;
  telegraphFiredCount: number;
  /** Carrier Warden hangar launch budget (halted immediately when hangarDestroyed is true). */
  hangarLaunchWavesUsed: number;
  hangarMaxLaunchWaves: number;
  hangarLaunchCooldownSec: number;
  /** Void Harvester 3 independent energy cores. */
  harvesterCores: HarvesterEnergyCoreState[];
  /** Sovereign 10-step collapse sequence progress (0..10). */
  meltdownActive: boolean;
  meltdownStep: number; // 0..10
  meltdownTimerSec: number;
  meltdownCompleted: boolean;
  elapsedSec: number;
  transitionCount: number;
}

const PHASE_LABELS: Record<ExtinctionBossId, Record<1 | 2 | 3 | 4, { key: string; label: string; headline: string }>> = {
  executioner: {
    1: { key: 'hunter', label: 'PHASE I · HUNTER', headline: 'THE EXECUTIONER INITIATES STALKING PASSES' },
    2: { key: 'predator', label: 'PHASE II · PREDATOR', headline: 'EXECUTIONER LOCKED — PREDATOR FLANK & MISSILE VOLLEYS' },
    3: { key: 'execution', label: 'PHASE III · EXECUTION', headline: 'EXECUTIONER IN FINAL OVERDRIVE — WATCH YOUR SIX!' },
    4: { key: 'defeated', label: 'DEFEATED', headline: 'THE EXECUTIONER DESTROYED' },
  },
  carrier_warden: {
    1: { key: 'fortress_launch', label: 'PHASE I · FORTRESS LAUNCH', headline: 'CARRIER WARDEN LAUNCHING FIGHTER SCREEN' },
    2: { key: 'tactical_redeploy', label: 'PHASE II · TACTICAL REDEPLOY', headline: 'CARRIER WARDEN REDEPLOYING ESCORT WINGS' },
    3: { key: 'overdrive', label: 'PHASE III · OVERDRIVE', headline: 'CARRIER WARDEN IN DESPERATION OVERDRIVE' },
    4: { key: 'defeated', label: 'DEFEATED', headline: 'CARRIER WARDEN SCUTTLED' },
  },
  siege_breaker: {
    1: { key: 'armored_advance', label: 'PHASE I · ARMORED ADVANCE', headline: 'SIEGE BREAKER ARMOR PLATING ENGAGED — HIT WEAK POINTS' },
    2: { key: 'telegraphed_barrage', label: 'PHASE II · TELEGRAPHED BARRAGE', headline: 'SIEGE BREAKER CHARGING SIEGE LANCE — EVADE TELEGRAPH' },
    3: { key: 'breach_exposed', label: 'PHASE III · BREACH EXPOSED', headline: 'SIEGE ARMOR CRACKED — WEAK POINT CORE WIDE OPEN' },
    4: { key: 'defeated', label: 'DEFEATED', headline: 'SIEGE BREAKER SHATTERED' },
  },
  iron_revenant: {
    1: { key: 'the_wall', label: 'PHASE I · THE WALL', headline: 'DREADNOUGHT IRON REVENANT FRONTAL WALL DEPLOYED' },
    2: { key: 'break_the_armour', label: 'PHASE II · BREAK THE ARMOUR', headline: 'PROW ARMOR FRACTURING — SHATTER BROADSIDE DECKS' },
    3: { key: 'reactor_failure', label: 'PHASE III · REACTOR FAILURE', headline: 'IRON REVENANT REACTOR CONTAINMENT COLLAPSING!' },
    4: { key: 'defeated', label: 'DEFEATED', headline: 'IRON REVENANT DREADNOUGHT DESTROYED' },
  },
  void_harvester: {
    1: { key: 'shielded', label: 'PHASE I · SHIELDED', headline: 'VOID HARVESTER OUTER BARRIER MATRIX ACTIVE' },
    2: { key: 'core_hunt', label: 'PHASE II · CORE HUNT (3 CORES)', headline: 'HARVESTER SHIELD BROKEN — DESTROY ALL 3 ROTATING ENERGY CORES' },
    3: { key: 'collapse', label: 'PHASE III · COLLAPSE', headline: 'ALL 3 CORES SHATTERED — CENTRAL HARVESTER NEXUS EXPOSED!' },
    4: { key: 'defeated', label: 'DEFEATED', headline: 'VOID HARVESTER CONSTRUCT OBLITERATED' },
  },
  sovereign_extinction: {
    1: { key: 'the_armada', label: 'PHASE I · THE ARMADA', headline: 'THE SOVEREIGN PROTECTED BY ARMADA SCREEN' },
    2: { key: 'sovereign_awakens', label: 'PHASE II · SOVEREIGN AWAKENS', headline: 'THE SOVEREIGN OMEGA AWAKENS — ALL WEAPON DECKS HOT' },
    3: { key: 'exposed_core', label: 'PHASE III · THE EXPOSED CORE', headline: 'SOVEREIGN CARAPACE OPEN — STRIKE THE EXPOSED CORE!' },
    4: { key: 'meltdown', label: 'FINALE · 10-STEP COLLAPSE', headline: 'THE SOVEREIGN REACTOR COLLAPSING — SURVIVE DETONATION SEQUENCE!' },
  },
};

export function createBossStateMachine(
  bossId: ExtinctionBossId,
  difficultyMult = 1.0,
): BossStateMachine {
  const scale = Math.max(0.75, Math.min(1.4, difficultyMult));
  const p1 = PHASE_LABELS[bossId][1];

  const base: BossStateMachine = {
    bossId,
    bossKind:
      bossId === 'executioner' || bossId === 'carrier_warden' || bossId === 'siege_breaker'
        ? 'mini_boss'
        : 'major_boss',
    bossName:
      bossId === 'executioner'
        ? 'The Executioner'
        : bossId === 'carrier_warden'
          ? 'Carrier Warden Vex-Maw'
          : bossId === 'siege_breaker'
            ? 'Siege Breaker Bastion'
            : bossId === 'iron_revenant'
              ? 'Dreadnought Iron Revenant'
              : bossId === 'void_harvester'
                ? 'Void Harvester Construct'
                : 'The Sovereign Omega',
    phase: 1,
    phaseKey: p1.key,
    phaseLabel: p1.label,
    hp: 900,
    maxHp: 900,
    shield: 450,
    maxShield: 450,
    defeated: false,
    mainHullInvulnerable: false,
    invulnerableReason: null,
    damageResistanceMult: 1.0,
    telegraphActive: false,
    telegraphLabel: null,
    telegraphRemainingSec: 0,
    telegraphCooldownSec: 7.5,
    telegraphFiredCount: 0,
    hangarLaunchWavesUsed: 0,
    hangarMaxLaunchWaves: 3,
    hangarLaunchCooldownSec: 6.0,
    harvesterCores: [],
    meltdownActive: false,
    meltdownStep: 0,
    meltdownTimerSec: 0,
    meltdownCompleted: false,
    elapsedSec: 0,
    transitionCount: 0,
  };

  switch (bossId) {
    case 'executioner':
      return {
        ...base,
        hp: Math.round(620 * scale),
        maxHp: Math.round(620 * scale),
        shield: Math.round(320 * scale),
        maxShield: Math.round(320 * scale),
        telegraphCooldownSec: 8.5,
      };
    case 'carrier_warden':
      return {
        ...base,
        hp: Math.round(980 * scale),
        maxHp: Math.round(980 * scale),
        shield: Math.round(540 * scale),
        maxShield: Math.round(540 * scale),
        hangarMaxLaunchWaves: 3,
        hangarLaunchCooldownSec: 5.5,
      };
    case 'siege_breaker':
      return {
        ...base,
        hp: Math.round(1080 * scale),
        maxHp: Math.round(1080 * scale),
        shield: Math.round(560 * scale),
        maxShield: Math.round(560 * scale),
        damageResistanceMult: 0.62,
        telegraphCooldownSec: 7.2,
      };
    case 'iron_revenant':
      return {
        ...base,
        hp: Math.round(1650 * scale),
        maxHp: Math.round(1650 * scale),
        shield: Math.round(920 * scale),
        maxShield: Math.round(920 * scale),
        damageResistanceMult: 0.65,
        telegraphCooldownSec: 6.8,
      };
    case 'void_harvester': {
      const coreHp = Math.round(280 * scale);
      return {
        ...base,
        hp: Math.round(1500 * scale),
        maxHp: Math.round(1500 * scale),
        shield: Math.round(780 * scale),
        maxShield: Math.round(780 * scale),
        harvesterCores: [
          { id: 'core_alpha', label: 'Alpha Energy Core', angleOffsetRad: 0, hp: coreHp, maxHp: coreHp, destroyed: false },
          { id: 'core_beta', label: 'Beta Energy Core', angleOffsetRad: (Math.PI * 2) / 3, hp: coreHp, maxHp: coreHp, destroyed: false },
          { id: 'core_gamma', label: 'Gamma Energy Core', angleOffsetRad: (Math.PI * 4) / 3, hp: coreHp, maxHp: coreHp, destroyed: false },
        ],
      };
    }
    case 'sovereign_extinction':
      return {
        ...base,
        hp: Math.round(2400 * scale),
        maxHp: Math.round(2400 * scale),
        shield: Math.round(1280 * scale),
        maxShield: Math.round(1280 * scale),
        telegraphCooldownSec: 6.2,
      };
  }
}

function withTransition(
  state: BossStateMachine,
  nextPhase: 1 | 2 | 3 | 4,
): { state: BossStateMachine; transition: BossPhaseTransitionEvent | null } {
  if (nextPhase <= state.phase) {
    return { state, transition: null };
  }
  const meta = PHASE_LABELS[state.bossId][nextPhase];
  const transition: BossPhaseTransitionEvent = {
    bossId: state.bossId,
    fromPhase: state.phase,
    toPhase: nextPhase,
    phaseKey: meta.key,
    phaseLabel: meta.label,
    headline: meta.headline,
  };
  return {
    state: {
      ...state,
      phase: nextPhase,
      phaseKey: meta.key,
      phaseLabel: meta.label,
      transitionCount: state.transitionCount + 1,
    },
    transition,
  };
}

export interface BossStepInput {
  dt: number;
  /** Sync external hull/shield/subsystems directly if driven by CapitalShipStatus in combat. */
  externalHull?: number;
  externalMaxHull?: number;
  externalShield?: number;
  destroyedSubsystemsCount?: number;
  hangarDestroyed?: boolean;
  armorPlatesRemaining?: number;
  activeEscortCount?: number;
  playerInRange?: boolean;
}

export interface BossStepResult {
  state: BossStateMachine;
  transition: BossPhaseTransitionEvent | null;
  spawnCarrierLaunchCount: number;
  telegraphAttackFired: boolean;
  meltdownStepTriggered: number | null; // 1..10
  meltdownFinishedNow: boolean;
}

/**
 * Advances any Extinction Mini-Boss or Major Boss state machine by one physics tick.
 * Enforces deterministic phase transitions, anti-softlock guards, finite carrier hangar
 * launches, Void Harvester 3-core rules, and Sovereign's 10-step finale collapse.
 */
export function stepBossStateMachine(
  prev: BossStateMachine,
  input: BossStepInput,
): BossStepResult {
  const safeDt = Math.max(0, Math.min(0.25, input.dt));
  let s: BossStateMachine = {
    ...prev,
    elapsedSec: prev.elapsedSec + safeDt,
  };

  if (input.externalHull !== undefined) s.hp = Math.max(0, input.externalHull);
  if (input.externalMaxHull !== undefined && input.externalMaxHull > 0) s.maxHp = input.externalMaxHull;
  if (input.externalShield !== undefined) s.shield = Math.max(0, input.externalShield);

  let transition: BossPhaseTransitionEvent | null = null;
  let spawnCarrierLaunchCount = 0;
  let telegraphAttackFired = false;
  let meltdownStepTriggered: number | null = null;
  let meltdownFinishedNow = false;

  // Handle post-defeat meltdown sequence (especially 10-step Sovereign Finale)
  if (s.defeated) {
    if (s.meltdownActive && !s.meltdownCompleted) {
      s.meltdownTimerSec += safeDt;
      const totalSteps = s.bossId === 'sovereign_extinction' ? 10 : 3;
      const stepDuration = s.bossId === 'sovereign_extinction' ? 0.52 : 0.7;
      const targetStep = Math.min(totalSteps, Math.floor(s.meltdownTimerSec / stepDuration) + 1);
      if (targetStep > s.meltdownStep) {
        s.meltdownStep = targetStep;
        meltdownStepTriggered = targetStep;
      }
      if (s.meltdownTimerSec >= totalSteps * stepDuration + 0.35) {
        s.meltdownActive = false;
        s.meltdownCompleted = true;
        meltdownFinishedNow = true;
      }
    }
    return {
      state: s,
      transition: null,
      spawnCarrierLaunchCount: 0,
      telegraphAttackFired: false,
      meltdownStepTriggered,
      meltdownFinishedNow,
    };
  }

  // Check defeat condition
  if (s.hp <= 0) {
    const t = withTransition(s, 4);
    transition = t.transition;
    s = {
      ...t.state,
      hp: 0,
      shield: 0,
      defeated: true,
      mainHullInvulnerable: false,
      invulnerableReason: null,
      telegraphActive: false,
      telegraphLabel: null,
      meltdownActive: s.bossId === 'sovereign_extinction' || s.bossKind === 'major_boss',
      meltdownStep: 0,
      meltdownTimerSec: 0,
      meltdownCompleted: false,
    };
    return {
      state: s,
      transition,
      spawnCarrierLaunchCount: 0,
      telegraphAttackFired: false,
      meltdownStepTriggered: null,
      meltdownFinishedNow: false,
    };
  }

  const hullRatio = s.hp / Math.max(1, s.maxHp);
  const subCount = input.destroyedSubsystemsCount ?? 0;

  // Per-boss explicit phase transitions & mechanics (max 1 step per call for deterministic UI announcements)
  if (s.bossId === 'executioner') {
    if (s.phase === 1 && hullRatio <= 0.66) {
      const t = withTransition(s, 2);
      s = t.state;
      transition = t.transition;
    } else if (s.phase === 2 && hullRatio <= 0.32) {
      const t = withTransition(s, 3);
      s = t.state;
      transition = t.transition;
    }
    s.damageResistanceMult = s.phase === 3 ? 1.15 : 1.0;
  } else if (s.bossId === 'carrier_warden') {
    if (s.phase === 1 && (hullRatio <= 0.64 || subCount >= 2 || Boolean(input.hangarDestroyed))) {
      const t = withTransition(s, 2);
      s = t.state;
      transition = t.transition;
    } else if (s.phase === 2 && (hullRatio <= 0.28 || Boolean(input.hangarDestroyed))) {
      const t = withTransition(s, 3);
      s = t.state;
      transition = t.transition;
    }

    // Bounded Hangar launching — strictly stopped when Hangar subsystem is destroyed or max waves reached!
    const canLaunchNow =
      !input.hangarDestroyed &&
      s.hangarLaunchWavesUsed < s.hangarMaxLaunchWaves &&
      (input.activeEscortCount ?? 0) < 6 &&
      (input.playerInRange ?? true);
    if (canLaunchNow) {
      s.hangarLaunchCooldownSec = Math.max(0, s.hangarLaunchCooldownSec - safeDt);
      if (s.hangarLaunchCooldownSec <= 0) {
        s.hangarLaunchWavesUsed += 1;
        s.hangarLaunchCooldownSec = s.phase === 1 ? 16 : 13;
        spawnCarrierLaunchCount = 2;
      }
    }
  } else if (s.bossId === 'siege_breaker') {
    const platesLeft = input.armorPlatesRemaining ?? 3;
    if (s.phase === 1 && (hullRatio <= 0.68 || subCount >= 1 || platesLeft <= 2)) {
      const t = withTransition(s, 2);
      s = { ...t.state, damageResistanceMult: 0.88 };
      transition = t.transition;
    } else if (s.phase === 2 && (hullRatio <= 0.32 || subCount >= 3 || platesLeft <= 0)) {
      const t = withTransition(s, 3);
      s = { ...t.state, damageResistanceMult: 1.45 };
      transition = t.transition;
    }
  } else if (s.bossId === 'iron_revenant') {
    if (s.phase === 1 && (hullRatio <= 0.66 || (input.armorPlatesRemaining ?? 3) <= 2)) {
      const t = withTransition(s, 2);
      s = { ...t.state, damageResistanceMult: 0.92 };
      transition = t.transition;
    } else if (s.phase === 2 && (hullRatio <= 0.28 || subCount >= 3)) {
      const t = withTransition(s, 3);
      s = { ...t.state, damageResistanceMult: 1.42 };
      transition = t.transition;
    }
  } else if (s.bossId === 'void_harvester') {
    const aliveCores = s.harvesterCores.filter((c) => !c.destroyed).length;
    if (s.phase === 1 && (s.shield <= 0 || hullRatio <= 0.85)) {
      const t = withTransition(s, 2);
      s = {
        ...t.state,
        mainHullInvulnerable: aliveCores > 0,
        invulnerableReason: aliveCores > 0 ? `${aliveCores} ENERGY CORES ACTIVE` : null,
      };
      transition = t.transition;
    } else if (s.phase === 2) {
      if (aliveCores === 0) {
        const t = withTransition(s, 3);
        s = {
          ...t.state,
          mainHullInvulnerable: false,
          invulnerableReason: null,
          damageResistanceMult: 1.65,
        };
        transition = t.transition;
      } else {
        s.mainHullInvulnerable = true;
        s.invulnerableReason = `DESTROY ${aliveCores} ENERGY CORE${aliveCores > 1 ? 'S' : ''}`;
      }
    } else if (s.phase === 3) {
      // Anti-softlock invariant: Phase 3 Collapse can NEVER re-enable central invulnerability
      s.mainHullInvulnerable = false;
      s.invulnerableReason = null;
      s.damageResistanceMult = 1.65;
    }
  } else if (s.bossId === 'sovereign_extinction') {
    if (s.phase === 1 && (hullRatio <= 0.68 || subCount >= 2)) {
      const t = withTransition(s, 2);
      s = { ...t.state, damageResistanceMult: 1.0 };
      transition = t.transition;
    } else if (s.phase === 2 && (hullRatio <= 0.34 || subCount >= 4)) {
      const t = withTransition(s, 3);
      s = { ...t.state, damageResistanceMult: 1.48 };
      transition = t.transition;
    }
  }

  // Telegraphed heavy attack timer (for Siege Breaker, Iron Revenant, Sovereign, Executioner)
  const usesTelegraph =
    s.bossId === 'siege_breaker' ||
    s.bossId === 'iron_revenant' ||
    s.bossId === 'sovereign_extinction' ||
    (s.bossId === 'executioner' && s.phase >= 2);

  if (usesTelegraph && (input.playerInRange ?? true)) {
    if (s.telegraphActive) {
      s.telegraphRemainingSec = Math.max(0, s.telegraphRemainingSec - safeDt);
      if (s.telegraphRemainingSec <= 0) {
        s.telegraphActive = false;
        s.telegraphLabel = null;
        s.telegraphCooldownSec = s.phase >= 3 ? 5.2 : 7.0;
        s.telegraphFiredCount += 1;
        telegraphAttackFired = true;
      }
    } else {
      s.telegraphCooldownSec = Math.max(0, s.telegraphCooldownSec - safeDt);
      if (s.telegraphCooldownSec <= 0) {
        s.telegraphActive = true;
        s.telegraphRemainingSec = 2.3;
        s.telegraphLabel =
          s.bossId === 'siege_breaker'
            ? 'SIEGE LANCE CHARGE'
            : s.bossId === 'iron_revenant'
              ? 'REVENANT BROADSIDE SALVO'
              : s.bossId === 'sovereign_extinction'
                ? 'OMEGA CITADEL BEAM'
                : 'EXECUTIONER LOCK VOLLEY';
      }
    }
  }

  return {
    state: s,
    transition,
    spawnCarrierLaunchCount,
    telegraphAttackFired,
    meltdownStepTriggered,
    meltdownFinishedNow,
  };
}

/**
 * Applies direct damage to Void Harvester's independent Energy Cores.
 * Automatically updates `mainHullInvulnerable` and core state cleanly.
 */
export function damageHarvesterCore(
  state: BossStateMachine,
  coreId: HarvesterEnergyCoreState['id'],
  damage: number,
): { state: BossStateMachine; coreDestroyedNow: boolean; allCoresDestroyed: boolean } {
  if (state.bossId !== 'void_harvester' || damage <= 0) {
    return { state, coreDestroyedNow: false, allCoresDestroyed: false };
  }

  let coreDestroyedNow = false;
  const nextCores = state.harvesterCores.map((core) => {
    if (core.id !== coreId || core.destroyed) return core;
    const nextHp = Math.max(0, core.hp - damage);
    if (nextHp <= 0) coreDestroyedNow = true;
    return {
      ...core,
      hp: nextHp,
      destroyed: nextHp <= 0,
    };
  });

  const aliveCores = nextCores.filter((c) => !c.destroyed).length;
  const allCoresDestroyed = aliveCores === 0;
  return {
    state: {
      ...state,
      harvesterCores: nextCores,
      mainHullInvulnerable: state.phase === 2 && !allCoresDestroyed,
      invulnerableReason:
        state.phase === 2 && !allCoresDestroyed
          ? `DESTROY ${aliveCores} ENERGY CORE${aliveCores > 1 ? 'S' : ''}`
          : null,
    },
    coreDestroyedNow,
    allCoresDestroyed,
  };
}

/**
 * Applies damage cleanly to a standalone boss (such as Mini-Boss 1 Executioner)
 * obeying shield absorption, resistance multiplier, and invulnerability guardrails.
 */
export function applyStandaloneBossDamage(
  state: BossStateMachine,
  rawDamage: number,
  options?: { isEmp?: boolean; isWeakPoint?: boolean },
): { state: BossStateMachine; shieldHit: boolean; killed: boolean } {
  if (state.defeated || rawDamage <= 0) {
    return { state, shieldHit: false, killed: false };
  }
  const effectiveDamage = Math.round(
    rawDamage * state.damageResistanceMult * (options?.isWeakPoint ? 1.3 : 1.0),
  );
  let shield = state.shield;
  let hp = state.hp;
  let shieldHit = false;

  if (shield > 0) {
    shieldHit = true;
    const shieldDmg = options?.isEmp ? effectiveDamage * 2.1 : effectiveDamage;
    const absorbed = Math.min(shield, shieldDmg);
    shield = Math.max(0, Math.round(shield - absorbed));
    const bleed = Math.max(0, effectiveDamage - absorbed);
    if (!state.mainHullInvulnerable && bleed > 0) {
      hp = Math.max(0, hp - Math.round(bleed * 0.45));
    }
  } else if (!state.mainHullInvulnerable) {
    hp = Math.max(0, hp - effectiveDamage);
  }

  return {
    state: { ...state, shield, hp },
    shieldHit,
    killed: hp <= 0,
  };
}
