import type { CampaignLevelDef, OptionalObjectiveKind } from './campaignLevels';

export type PerformanceGrade = 'C' | 'B' | 'A' | 'S';

export const GRADE_ORDER: Record<PerformanceGrade, number> = {
  C: 1,
  B: 2,
  A: 3,
  S: 4,
};

export interface PilotRankDef {
  rankIndex: number;
  title: string;
  minXp: number;
  unlockSummary: string;
  cosmeticId?: string;
  cosmeticName?: string;
  bonusMissileCapacity?: number;
  wingmanEffectivenessBonusPct?: number;
}

export interface CosmeticLiveryDef {
  id: string;
  name: string;
  requiredRankIndex: number;
  hullAccentHex: string;
  trimHex: string;
  description: string;
}

export const COSMETIC_LIVERIES: CosmeticLiveryDef[] = [
  {
    id: 'vanguard_standard',
    name: 'Vanguard Alloy',
    requiredRankIndex: 0,
    hullAccentHex: '#38bdf8',
    trimHex: '#e2e8f0',
    description: 'Standard Allied orbital interceptor titanium-ceramic finish.',
  },
  {
    id: 'vanguard_cobalt',
    name: 'Cobalt Interceptor',
    requiredRankIndex: 1,
    hullAccentHex: '#0ea5e9',
    trimHex: '#7dd3fc',
    description: 'Flight Cadet deep-orbital cobalt striping with luminous wingtip tracers.',
  },
  {
    id: 'solar_gold',
    name: 'Solar Vanguard',
    requiredRankIndex: 2,
    hullAccentHex: '#f59e0b',
    trimHex: '#fde68a',
    description: 'Pilot-rank gold heat-shield plating calibrated for high-energy combat.',
  },
  {
    id: 'crimson_striker',
    name: 'Crimson Ace',
    requiredRankIndex: 3,
    hullAccentHex: '#f43f5e',
    trimHex: '#fda4af',
    description: 'Squadron Ace crimson pursuit livery honored across Sector III.',
  },
  {
    id: 'obsidian_stealth',
    name: 'Obsidian Ghost',
    requiredRankIndex: 4,
    hullAccentHex: '#a78bfa',
    trimHex: '#cbd5e1',
    description: 'Elite Pilot low-albedo carbon-slate hull with violet sensor trim.',
  },
  {
    id: 'sovereign_hunter',
    name: 'Sovereign Hunter',
    requiredRankIndex: 5,
    hullAccentHex: '#10b981',
    trimHex: '#6ee7b7',
    description: 'Commander emerald-titanium fleet flagship command trim.',
  },
  {
    id: 'aether_legend',
    name: 'Aether Legend',
    requiredRankIndex: 6,
    hullAccentHex: '#fbbf24',
    trimHex: '#ffffff',
    description: 'Legendary gilded pearl-titanium livery awarded to saviors of Aether Prime.',
  },
  {
    id: 'extinction_apex',
    name: 'Extinction Apex',
    requiredRankIndex: 99,
    hullAccentHex: '#ef4444',
    trimHex: '#fbbf24',
    description: 'Black-ops crimson and gold trophy plating unlocked by completing the Extinction Campaign.',
  },
];

export const PILOT_RANKS: PilotRankDef[] = [
  {
    rankIndex: 0,
    title: 'Recruit',
    minXp: 0,
    unlockSummary: 'Standard Vanguard Starfighter Certification',
    cosmeticId: 'vanguard_standard',
    cosmeticName: 'Vanguard Alloy',
  },
  {
    rankIndex: 1,
    title: 'Flight Cadet',
    minXp: 600,
    unlockSummary: 'Unlocks Cobalt Interceptor hull livery',
    cosmeticId: 'vanguard_cobalt',
    cosmeticName: 'Cobalt Interceptor',
  },
  {
    rankIndex: 2,
    title: 'Pilot',
    minXp: 1600,
    unlockSummary: 'Unlocks Solar Vanguard livery & +10% Hangar credit efficiency',
    cosmeticId: 'solar_gold',
    cosmeticName: 'Solar Vanguard',
  },
  {
    rankIndex: 3,
    title: 'Squadron Ace',
    minXp: 3200,
    unlockSummary: 'Unlocks Crimson Ace livery & +2 starting missile pod capacity',
    cosmeticId: 'crimson_striker',
    cosmeticName: 'Crimson Ace',
    bonusMissileCapacity: 2,
  },
  {
    rankIndex: 4,
    title: 'Elite Pilot',
    minXp: 5500,
    unlockSummary: 'Unlocks Obsidian Ghost livery & Elite Ace Emblem',
    cosmeticId: 'obsidian_stealth',
    cosmeticName: 'Obsidian Ghost',
  },
  {
    rankIndex: 5,
    title: 'Commander',
    minXp: 8600,
    unlockSummary: 'Unlocks Sovereign Hunter livery & +10% Wingman fire cadence',
    cosmeticId: 'sovereign_hunter',
    cosmeticName: 'Sovereign Hunter',
    wingmanEffectivenessBonusPct: 10,
  },
  {
    rankIndex: 6,
    title: 'Legend',
    minXp: 12500,
    unlockSummary: 'Unlocks Aether Legend gilded livery & Fleet Legend Crest',
    cosmeticId: 'aether_legend',
    cosmeticName: 'Aether Legend',
    bonusMissileCapacity: 2,
    wingmanEffectivenessBonusPct: 15,
  },
];

export interface PilotRankProgress {
  currentRank: PilotRankDef;
  nextRank: PilotRankDef | null;
  xp: number;
  xpIntoCurrentRank: number;
  xpForNextRank: number;
  progressRatio: number;
  unlockedCosmetics: CosmeticLiveryDef[];
}

export function computePilotRankProgress(xp: number): PilotRankProgress {
  const safeXp = Math.max(0, Math.round(xp));
  let current = PILOT_RANKS[0];
  for (const r of PILOT_RANKS) {
    if (safeXp >= r.minXp) current = r;
  }
  const next = PILOT_RANKS[current.rankIndex + 1] ?? null;
  const xpIntoCurrentRank = safeXp - current.minXp;
  const xpForNextRank = next ? Math.max(1, next.minXp - current.minXp) : 1;
  const progressRatio = next
    ? Math.max(0, Math.min(1, xpIntoCurrentRank / xpForNextRank))
    : 1;

  return {
    currentRank: current,
    nextRank: next,
    xp: safeXp,
    xpIntoCurrentRank,
    xpForNextRank,
    progressRatio,
    unlockedCosmetics: COSMETIC_LIVERIES.filter(
      (c) => c.requiredRankIndex <= current.rankIndex,
    ),
  };
}

export interface CombatBonusCallout {
  id: number;
  label: string;
  points: number;
  tone: 'precision' | 'multikill' | 'evasion' | 'tactical' | 'ace';
  ttlSec: number;
}

export interface CombatScoreState {
  score: number;
  comboCount: number;
  comboMultiplier: number;
  comboTimerSec: number;
  comboMaxTimerSec: number;
  maxCombo: number;
  consecutiveHits: number;
  maxConsecutiveHits: number;
  missedShotsStreak: number;
  multiKillWindowSec: number;
  multiKillChain: number;
  multiKillsCount: number;
  closeRangeKills: number;
  nearMissCount: number;
  missilesEvaded: number;
  subsystemsDestroyed: number;
  acesDefeated: number;
  calloutSeq: number;
  activeCallout: CombatBonusCallout | null;
  calloutCooldownSec: number;
}

export const COMBO_DECAY_WINDOW_SEC = 6.8;
export const MULTI_KILL_WINDOW_SEC = 4.5;

export function createCombatScoreState(): CombatScoreState {
  return {
    score: 0,
    comboCount: 0,
    comboMultiplier: 1.0,
    comboTimerSec: 0,
    comboMaxTimerSec: COMBO_DECAY_WINDOW_SEC,
    maxCombo: 0,
    consecutiveHits: 0,
    maxConsecutiveHits: 0,
    missedShotsStreak: 0,
    multiKillWindowSec: 0,
    multiKillChain: 0,
    multiKillsCount: 0,
    closeRangeKills: 0,
    nearMissCount: 0,
    missilesEvaded: 0,
    subsystemsDestroyed: 0,
    acesDefeated: 0,
    calloutSeq: 0,
    activeCallout: null,
    calloutCooldownSec: 0,
  };
}

export function computeComboMultiplier(comboCount: number): number {
  if (comboCount <= 1) return 1.0;
  return Number(Math.min(4.0, 1.0 + (comboCount - 1) * 0.25).toFixed(2));
}

function emitCallout(
  state: CombatScoreState,
  label: string,
  points: number,
  tone: CombatBonusCallout['tone'],
  forcePriority = false,
): void {
  if (!forcePriority && state.calloutCooldownSec > 0) return;
  state.calloutSeq += 1;
  state.activeCallout = {
    id: state.calloutSeq,
    label,
    points,
    tone,
    ttlSec: 2.1,
  };
  state.calloutCooldownSec = forcePriority ? 0.6 : 1.15;
}

export function tickCombatScoreState(state: CombatScoreState, dt: number): void {
  if (state.comboTimerSec > 0) {
    state.comboTimerSec = Math.max(0, state.comboTimerSec - dt);
    if (state.comboTimerSec === 0) {
      state.comboCount = 0;
      state.comboMultiplier = 1.0;
    }
  }
  if (state.multiKillWindowSec > 0) {
    state.multiKillWindowSec = Math.max(0, state.multiKillWindowSec - dt);
    if (state.multiKillWindowSec === 0) {
      state.multiKillChain = 0;
    }
  }
  if (state.calloutCooldownSec > 0) {
    state.calloutCooldownSec = Math.max(0, state.calloutCooldownSec - dt);
  }
  if (state.activeCallout) {
    state.activeCallout.ttlSec -= dt;
    if (state.activeCallout.ttlSec <= 0) {
      state.activeCallout = null;
    }
  }
}

/**
 * Records a confirmed player weapon hit.
 * Rewards sustained accuracy (consecutive hits); sprays that miss do not build streak.
 */
export function recordCombatHit(
  state: CombatScoreState,
  params: { distanceMeters: number; isWeakPoint?: boolean },
): number {
  state.consecutiveHits += 1;
  state.missedShotsStreak = 0;
  if (state.consecutiveHits > state.maxConsecutiveHits) {
    state.maxConsecutiveHits = state.consecutiveHits;
  }

  let pts = 18;
  if (params.isWeakPoint) pts += 25;
  if (params.distanceMeters <= 360) pts += 8;

  // Precision streak milestone bonus every 5 consecutive hits
  if (state.consecutiveHits >= 5 && state.consecutiveHits % 5 === 0) {
    const streakBonus = Math.round(75 * state.comboMultiplier);
    pts += streakBonus;
    emitCallout(state, `PRECISION x${state.consecutiveHits}`, streakBonus, 'precision');
  }

  state.score += pts;
  if (state.comboCount > 0) {
    // Refresh a small slice of combo timer on accurate hits without inflating combo count endlessly
    state.comboTimerSec = Math.min(COMBO_DECAY_WINDOW_SEC, state.comboTimerSec + 0.9);
  }
  return pts;
}

/**
 * Records a player projectile expiring cleanly without hitting any target.
 * Breaks consecutive-hit streak and prevents spray-and-pray abuse from maintaining high multipliers.
 */
export function recordCombatMiss(state: CombatScoreState): void {
  state.consecutiveHits = 0;
  state.missedShotsStreak += 1;
  if (state.missedShotsStreak >= 5 && state.comboCount > 1) {
    state.comboCount = Math.max(1, state.comboCount - 1);
    state.comboMultiplier = computeComboMultiplier(state.comboCount);
    state.missedShotsStreak = 0;
  }
}

export function recordCombatKill(
  state: CombatScoreState,
  params: {
    shipClass: 'fighter' | 'medium' | 'capital';
    isEliteOrAce?: boolean;
    isLegendary?: boolean;
    distanceMeters: number;
  },
): number {
  state.comboCount += 1;
  state.comboMultiplier = computeComboMultiplier(state.comboCount);
  state.comboTimerSec = COMBO_DECAY_WINDOW_SEC;
  if (state.comboCount > state.maxCombo) {
    state.maxCombo = state.comboCount;
  }

  const base =
    params.shipClass === 'capital'
      ? 1100
      : params.shipClass === 'medium'
        ? 480
        : params.isLegendary
          ? 850
          : params.isEliteOrAce
            ? 340
            : 200;

  let total = Math.round(base * state.comboMultiplier);

  // Close-range dogfight bonus (< 340m)
  if (params.shipClass !== 'capital' && params.distanceMeters <= 340) {
    const closeBonus = Math.round(110 * state.comboMultiplier);
    total += closeBonus;
    state.closeRangeKills += 1;
    emitCallout(state, 'CLOSE-RANGE KILL', closeBonus, 'precision');
  }

  // Multi-kill chain bonus
  state.multiKillChain += 1;
  state.multiKillWindowSec = MULTI_KILL_WINDOW_SEC;
  if (state.multiKillChain >= 2) {
    const multiBonus = Math.round((140 + state.multiKillChain * 70) * state.comboMultiplier);
    total += multiBonus;
    state.multiKillsCount += 1;
    const tag =
      state.multiKillChain === 2
        ? 'DOUBLE KILL'
        : state.multiKillChain === 3
          ? 'TRIPLE KILL'
          : `MULTI-KILL x${state.multiKillChain}`;
    emitCallout(state, tag, multiBonus, 'multikill', true);
  }

  if (params.isLegendary) {
    state.acesDefeated += 1;
    emitCallout(state, 'LEGENDARY ACE DOWN', total, 'ace', true);
  } else if (params.shipClass === 'capital') {
    emitCallout(state, 'CAPITAL DESTROYED', total, 'ace', true);
  }

  state.score += total;
  return total;
}

export function recordSubsystemBreakScore(state: CombatScoreState): number {
  state.subsystemsDestroyed += 1;
  state.comboCount += 1;
  state.comboMultiplier = computeComboMultiplier(state.comboCount);
  state.comboTimerSec = COMBO_DECAY_WINDOW_SEC;
  if (state.comboCount > state.maxCombo) state.maxCombo = state.comboCount;

  const pts = Math.round(350 * state.comboMultiplier);
  state.score += pts;
  emitCallout(state, 'SUBSYSTEM DESTROYED', pts, 'tactical', true);
  return pts;
}

export function recordNearMissBonus(state: CombatScoreState): number {
  state.nearMissCount += 1;
  const pts = Math.round(95 * state.comboMultiplier);
  state.score += pts;
  if (state.comboCount > 0) {
    state.comboTimerSec = Math.min(COMBO_DECAY_WINDOW_SEC, state.comboTimerSec + 1.4);
  }
  emitCallout(state, 'NEAR-MISS EVASION', pts, 'evasion');
  return pts;
}

export function recordMissileEvadedBonus(state: CombatScoreState): number {
  state.missilesEvaded += 1;
  const pts = Math.round(145 * state.comboMultiplier);
  state.score += pts;
  if (state.comboCount > 0) {
    state.comboTimerSec = Math.min(COMBO_DECAY_WINDOW_SEC, state.comboTimerSec + 1.6);
  }
  emitCallout(state, 'MISSILE EVADED', pts, 'evasion', true);
  return pts;
}

/**
 * Heavy hull damage drops combo momentum so defensive piloting matters for S-rank runs.
 */
export function recordPlayerHullDamagePenalty(
  state: CombatScoreState,
  hullDamageAmount: number,
): void {
  if (hullDamageAmount <= 0) return;
  if (hullDamageAmount >= 10) {
    state.comboCount = 0;
    state.comboMultiplier = 1.0;
    state.comboTimerSec = 0;
  } else if (state.comboCount > 1) {
    state.comboCount = Math.max(1, state.comboCount - 1);
    state.comboMultiplier = computeComboMultiplier(state.comboCount);
  }
}

export interface LevelPerformanceInput {
  level: CampaignLevelDef;
  combatScore: number;
  shotsFired: number;
  shotsHit: number;
  kills: number;
  elapsedSec: number;
  hullRemainingPct: number;
  maxCombo: number;
  subsystemsDestroyed: number;
  protectedHpPct?: number | null;
  repairKitsUsed?: number;
  legendaryDefeated?: boolean;
  nearMissCount?: number;
  missilesEvaded?: number;
}

export interface LevelPerformanceResult {
  finalScore: number;
  grade: PerformanceGrade;
  accuracyPct: number;
  optionalCompleted: boolean;
  medalsEarned: string[];
  xpEarned: number;
  creditsEarned: number;
  breakdown: {
    combatScore: number;
    accuracyBonus: number;
    hullBonus: number;
    timeBonus: number;
    optionalBonus: number;
  };
}

export function evaluateOptionalObjective(
  kind: OptionalObjectiveKind,
  target: number,
  input: LevelPerformanceInput,
  accuracyPct: number,
): boolean {
  switch (kind) {
    case 'accuracy':
      return input.shotsFired >= 5 && accuracyPct >= target;
    case 'hull_above':
      return input.hullRemainingPct >= target;
    case 'time_under':
      return input.elapsedSec <= target;
    case 'combo_reach':
      return input.maxCombo >= target;
    case 'subsystems_destroyed':
      return input.subsystemsDestroyed >= target;
    case 'protect_hp':
      return (input.protectedHpPct ?? 0) >= target;
    case 'no_repair_kits':
      return (input.repairKitsUsed ?? 0) <= target;
    case 'defeat_ace':
      return Boolean(input.legendaryDefeated);
    default:
      return false;
  }
}

/**
 * Evaluates end-of-level performance into C / B / A / S grade, earned medals, XP & Credits.
 * Balanced so:
 * - C: Mission completed
 * - B: Solid combat fundamentals
 * - A: Strong accuracy, combo control, hull preservation or par pace
 * - S: High skill across score, accuracy, hull, pacing, and optional objective
 */
export function evaluateLevelPerformance(
  input: LevelPerformanceInput,
): LevelPerformanceResult {
  const accuracyPct =
    input.shotsFired > 0
      ? Math.min(100, Math.round((input.shotsHit / input.shotsFired) * 100))
      : 0;
  const optionalCompleted = evaluateOptionalObjective(
    input.level.optionalObjectiveKind,
    input.level.optionalObjectiveTarget,
    input,
    accuracyPct,
  );

  const accuracyBonus = Math.round(accuracyPct * 8);
  const hullBonus = Math.round(Math.max(0, Math.min(100, input.hullRemainingPct)) * 6.5);
  const parRatio = input.level.parTimeSec / Math.max(15, input.elapsedSec);
  const timeBonus = Math.round(Math.min(700, Math.max(0, (parRatio - 0.55) * 650)));
  const optionalBonus = optionalCompleted ? 650 : 0;

  const finalScore = Math.max(
    0,
    Math.round(input.combatScore + accuracyBonus + hullBonus + timeBonus + optionalBonus),
  );

  let grade: PerformanceGrade = 'C';
  if (finalScore >= input.level.gradeThresholds.S) {
    grade = 'S';
  } else if (finalScore >= input.level.gradeThresholds.A) {
    grade = 'A';
  } else if (finalScore >= input.level.gradeThresholds.B) {
    grade = 'B';
  }

  const medalsEarned: string[] = [];
  if (accuracyPct >= 55 && input.shotsFired >= 8) medalsEarned.push('Deadeye Marksman');
  if (input.hullRemainingPct >= 85) medalsEarned.push('Untouchable');
  if (input.elapsedSec <= input.level.parTimeSec) medalsEarned.push('Speed Ace');
  if (input.maxCombo >= 6) medalsEarned.push('Combo Virtuoso');
  if (optionalCompleted) medalsEarned.push('Tactical Master');
  if (input.subsystemsDestroyed >= 3) medalsEarned.push('Capital Breaker');
  if (input.legendaryDefeated) medalsEarned.push('Ace Hunter');
  if ((input.missilesEvaded ?? 0) >= 2 || (input.nearMissCount ?? 0) >= 3) {
    medalsEarned.push('Evasive Ghost');
  }

  const gradeMultiplier =
    grade === 'S' ? 1.45 : grade === 'A' ? 1.25 : grade === 'B' ? 1.1 : 1.0;
  const xpEarned = Math.round(
    input.level.rewards.baseXp * gradeMultiplier + (optionalCompleted ? 90 : 0),
  );
  const creditsEarned = Math.round(
    input.level.rewards.credits * gradeMultiplier + (optionalCompleted ? 60 : 0),
  );

  return {
    finalScore,
    grade,
    accuracyPct,
    optionalCompleted,
    medalsEarned,
    xpEarned,
    creditsEarned,
    breakdown: {
      combatScore: Math.round(input.combatScore),
      accuracyBonus,
      hullBonus,
      timeBonus,
      optionalBonus,
    },
  };
}

/**
 * Computes the incremental XP & Credits delta awarded when a player replays a level
 * and earns a strictly higher grade (e.g., B -> S), ensuring zero infinite farming.
 */
export function computeGradeImprovementBonus(
  level: CampaignLevelDef,
  previousBestGrade: PerformanceGrade | null,
  newGrade: PerformanceGrade,
): { xpDelta: number; creditsDelta: number } {
  const prevRank = previousBestGrade ? GRADE_ORDER[previousBestGrade] : 0;
  const nextRank = GRADE_ORDER[newGrade];
  if (nextRank <= prevRank) {
    return { xpDelta: 0, creditsDelta: 0 };
  }
  const steps = nextRank - prevRank;
  return {
    xpDelta: Math.round(level.rewards.baseXp * 0.22 * steps),
    creditsDelta: Math.round(level.rewards.credits * 0.22 * steps),
  };
}
