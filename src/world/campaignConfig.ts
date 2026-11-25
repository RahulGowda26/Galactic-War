import type { RegionId } from './worldConfig';

export type DifficultyId = 'story' | 'normal' | 'hard' | 'nightmare';

export type AlienClassKey =
  | 'dreadborn'
  | 'ravager_brute'
  | 'void_stalker'
  | 'aerial_reaver'
  | 'siege_guardian'
  | 'elite_guard';

export interface DifficultyProfile {
  id: DifficultyId;
  label: string;
  badge: string;
  description: string;
  aggression: number;
  accuracy: number;
  reactionTimeSec: number; // readable telegraph window
  coordination: number;
  reinforcementRate: number;
  incomingDamage: number;
  enemyHealth: number;
  resourceMultiplier: number;
  bossIntensity: number;
  // Phase 5 Fair Tactical Combat Limits
  maxSimultaneousShooters: number;
  playerShieldRegenRate: number;
  playerShieldDelaySec: number;
}

export const DIFFICULTY_PROFILES: Record<DifficultyId, DifficultyProfile> = {
  story: {
    id: 'story',
    label: 'Story',
    badge: 'STORY',
    description:
      'Narrative-first tactical combat with forgiving incoming damage, rapid shields, and generous med-stims.',
    aggression: 0.72,
    accuracy: 0.58,
    reactionTimeSec: 1.15,
    coordination: 0.35,
    reinforcementRate: 0.7,
    incomingDamage: 0.45,
    enemyHealth: 0.76,
    resourceMultiplier: 1.5,
    bossIntensity: 0.7,
    maxSimultaneousShooters: 2,
    playerShieldRegenRate: 30,
    playerShieldDelaySec: 2.6,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    badge: 'NORMAL',
    description:
      'Balanced strategic sci-fi combat — distinct enemy roles, fair attack windows, and tactical cover play.',
    aggression: 0.96,
    accuracy: 0.85,
    reactionTimeSec: 0.85,
    coordination: 0.65,
    reinforcementRate: 1.0,
    incomingDamage: 0.76,
    enemyHealth: 0.95,
    resourceMultiplier: 1.15,
    bossIntensity: 0.95,
    maxSimultaneousShooters: 3,
    playerShieldRegenRate: 24,
    playerShieldDelaySec: 3.1,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    badge: 'HARD',
    description:
      'Disciplined alien squads with aggressive flanking, heavier plasma fire, and tighter supplies.',
    aggression: 1.2,
    accuracy: 1.12,
    reactionTimeSec: 0.65,
    coordination: 0.86,
    reinforcementRate: 1.15,
    incomingDamage: 1.12,
    enemyHealth: 1.16,
    resourceMultiplier: 0.9,
    bossIntensity: 1.2,
    maxSimultaneousShooters: 3,
    playerShieldRegenRate: 19,
    playerShieldDelaySec: 3.7,
  },
  nightmare: {
    id: 'nightmare',
    label: 'Nightmare',
    badge: 'NIGHTMARE',
    description:
      'Lethal tactical warfare — smart enemy coordination, punishing mistakes, and scarce recovery, yet always fair.',
    aggression: 1.4,
    accuracy: 1.32,
    reactionTimeSec: 0.5,
    coordination: 0.98,
    reinforcementRate: 1.25,
    incomingDamage: 1.45,
    enemyHealth: 1.32,
    resourceMultiplier: 0.75,
    bossIntensity: 1.4,
    maxSimultaneousShooters: 4,
    playerShieldRegenRate: 15,
    playerShieldDelaySec: 4.3,
  },
};

export const DIFFICULTY_LIST: DifficultyProfile[] = [
  DIFFICULTY_PROFILES.story,
  DIFFICULTY_PROFILES.normal,
  DIFFICULTY_PROFILES.hard,
  DIFFICULTY_PROFILES.nightmare,
];

export type LevelObjectiveType =
  | 'defend_evacuation'
  | 'rescue_squad'
  | 'destroy_artillery'
  | 'disable_shield_generator'
  | 'eliminate_commanders'
  | 'defeat_sovereign';

export interface CampaignLevelConfig {
  index: number; // 1..6 ground theaters mapped cleanly by the 10-mission strategic campaign
  id: string;
  code: string;
  title: string;
  threatRating: string;
  encounterTier: 'easy' | 'standard' | 'difficult' | 'major';
  regionId: RegionId;
  encounterZone: string;
  objectiveType: LevelObjectiveType;
  objectiveTitle: string;
  objectiveSummary: string;
  spawnPos: [number, number, number];
  spawnYaw: number;
  combatCenter: [number, number];
  combatRadius: number;
  targetKills: number;
  maxActiveEnemies: number; // Phase 5 fair active cap (Easy 3-5, Standard 5-8, Difficult 8-12, Major 12-18)
  objectiveStructureCount: number;
  reinforcementWaves: number; // strictly scripted mission waves ONLY (never endless!)
  alliedCount: number;
  medStimsStart: number;
  hasSovereignBoss: boolean;
  roster: Record<AlienClassKey, number>;
}

/**
 * Phase 5 Rebalanced Ground Encounters:
 * Strictly structured tactical squads (Easy 4-5, Standard 6-8, Difficult 10-12, Major 14-16).
 * Eliminates unfair 40-enemy spam and continuous endless reinforcement waves.
 */
export const CAMPAIGN_LEVELS: CampaignLevelConfig[] = [
  {
    id: 'lvl1_crown_city',
    index: 1,
    code: 'OP 01',
    title: 'The Fall of Aether Prime',
    threatRating: 'EASY · 5 HOSTILES',
    encounterTier: 'easy',
    regionId: 'crown_city',
    encounterZone: 'Crown City Evacuation Streets',
    objectiveType: 'defend_evacuation',
    objectiveTitle: 'Secure the Crown City Evacuation Route',
    objectiveSummary:
      'Clear the Dreadborn vanguard squad and flanking Void Stalker alongside Vanguard-7 defenders.',
    spawnPos: [-1085, 22, -745],
    spawnYaw: -1.12,
    combatCenter: [-1035, -775],
    combatRadius: 88,
    targetKills: 5,
    maxActiveEnemies: 5,
    objectiveStructureCount: 0,
    reinforcementWaves: 0,
    alliedCount: 4,
    medStimsStart: 3,
    hasSovereignBoss: false,
    roster: {
      dreadborn: 4,
      ravager_brute: 0,
      void_stalker: 1,
      aerial_reaver: 0,
      siege_guardian: 0,
      elite_guard: 0,
    },
  },
  {
    id: 'lvl2_ruined_district',
    index: 2,
    code: 'OP 02',
    title: 'Broken Defences',
    threatRating: 'STANDARD · 7 HOSTILES',
    encounterTier: 'standard',
    regionId: 'ruined_district',
    encounterZone: 'The Collapsed District',
    objectiveType: 'rescue_squad',
    objectiveTitle: 'Rescue Trapped Vanguard Squad',
    objectiveSummary:
      'Eliminate flanking Void Stalkers and a heavy Ravager Brute pinning down Recon Squad Bravo.',
    spawnPos: [-308, 18, -356],
    spawnYaw: -0.52,
    combatCenter: [-250, -395],
    combatRadius: 96,
    targetKills: 7,
    maxActiveEnemies: 7,
    objectiveStructureCount: 0,
    reinforcementWaves: 1,
    alliedCount: 5,
    medStimsStart: 3,
    hasSovereignBoss: false,
    roster: {
      dreadborn: 3,
      ravager_brute: 1,
      void_stalker: 2,
      aerial_reaver: 1,
      siege_guardian: 0,
      elite_guard: 0,
    },
  },
  {
    id: 'lvl3_war_plains',
    index: 3,
    code: 'OP 03',
    title: 'The Lost Commander',
    threatRating: 'STANDARD · 8 HOSTILES',
    encounterTier: 'standard',
    regionId: 'war_plains',
    encounterZone: 'War Plains Artillery Ridge',
    objectiveType: 'destroy_artillery',
    objectiveTitle: 'Destroy Alien Plasma Artillery & Recover Codes',
    objectiveSummary:
      'Flank the Siege Guardian, neutralize the artillery guard squad, and destroy 2 plasma mortar pylons.',
    spawnPos: [1080, 32, 790],
    spawnYaw: 2.45,
    combatCenter: [1148, 845],
    combatRadius: 112,
    targetKills: 8,
    maxActiveEnemies: 8,
    objectiveStructureCount: 2,
    reinforcementWaves: 1,
    alliedCount: 5,
    medStimsStart: 3,
    hasSovereignBoss: false,
    roster: {
      dreadborn: 3,
      ravager_brute: 2,
      void_stalker: 1,
      aerial_reaver: 1,
      siege_guardian: 1,
      elite_guard: 0,
    },
  },
  {
    id: 'lvl4_fallen_fleet',
    index: 4,
    code: 'OP 07',
    title: 'The Counterattack',
    threatRating: 'DIFFICULT · 11 HOSTILES',
    encounterTier: 'difficult',
    regionId: 'fallen_fleet',
    encounterZone: 'Dreadnought Cordon & Shield Relays',
    objectiveType: 'disable_shield_generator',
    objectiveTitle: 'Disable the Alien Shield Generators',
    objectiveSummary:
      'Take down the Elite Commander coordinating the cordon, flank Siege Guardians, and destroy 2 shield relays.',
    spawnPos: [-740, 22, 1080],
    spawnYaw: 1.25,
    combatCenter: [-825, 1125],
    combatRadius: 118,
    targetKills: 11,
    maxActiveEnemies: 10,
    objectiveStructureCount: 2,
    reinforcementWaves: 1,
    alliedCount: 6,
    medStimsStart: 3,
    hasSovereignBoss: false,
    roster: {
      dreadborn: 3,
      ravager_brute: 2,
      void_stalker: 2,
      aerial_reaver: 1,
      siege_guardian: 2,
      elite_guard: 1,
    },
  },
  {
    id: 'lvl5_citadel_bastion',
    index: 5,
    code: 'OP 09',
    title: 'The Fall of the Citadel',
    threatRating: 'MAJOR · 14 HOSTILES',
    encounterTier: 'major',
    regionId: 'arrival_zone',
    encounterZone: 'Arrival Citadel Outer Bastion',
    objectiveType: 'eliminate_commanders',
    objectiveTitle: 'Breach Citadel Bastion & Destroy 3 Command Beacons',
    objectiveSummary:
      'Break through Elite Commanders and heavy Citadel guardians across structured assault checkpoints.',
    spawnPos: [920, 96, -1120],
    spawnYaw: -2.42,
    combatCenter: [998, -1198],
    combatRadius: 126,
    targetKills: 14,
    maxActiveEnemies: 12,
    objectiveStructureCount: 3,
    reinforcementWaves: 2,
    alliedCount: 6,
    medStimsStart: 3,
    hasSovereignBoss: false,
    roster: {
      dreadborn: 4,
      ravager_brute: 2,
      void_stalker: 2,
      aerial_reaver: 2,
      siege_guardian: 2,
      elite_guard: 2,
    },
  },
  {
    id: 'lvl6_last_stand',
    index: 6,
    code: 'OP 10 · FINAL',
    title: 'The Last Stand',
    threatRating: 'FINAL BOSS · THE SOVEREIGN',
    encounterTier: 'major',
    regionId: 'arrival_zone',
    encounterZone: 'Command Dais — Citadel Summit',
    objectiveType: 'defeat_sovereign',
    objectiveTitle: 'Defeat The Sovereign & End the Invasion',
    objectiveSummary:
      'Confront The Sovereign across 3 distinct tactical phases atop the obsidian Command Dais alongside surviving Vanguard allies.',
    spawnPos: [1062, 114, -1292],
    spawnYaw: -0.785,
    combatCenter: [1085, -1315],
    combatRadius: 118,
    targetKills: 10,
    maxActiveEnemies: 10,
    objectiveStructureCount: 0,
    reinforcementWaves: 2,
    alliedCount: 6,
    medStimsStart: 4,
    hasSovereignBoss: true,
    roster: {
      dreadborn: 3,
      ravager_brute: 1,
      void_stalker: 2,
      aerial_reaver: 2,
      siege_guardian: 1,
      elite_guard: 2,
    },
  },
];

export function getDifficultyProfile(id: DifficultyId): DifficultyProfile {
  return DIFFICULTY_PROFILES[id] ?? DIFFICULTY_PROFILES.normal;
}

export function getLevelConfig(levelIndex: number): CampaignLevelConfig {
  const clamped = Math.max(1, Math.min(CAMPAIGN_LEVELS.length, Math.round(levelIndex)));
  return CAMPAIGN_LEVELS[clamped - 1];
}

export function getTotalRosterCount(roster: Record<AlienClassKey, number>): number {
  return (
    roster.dreadborn +
    roster.ravager_brute +
    roster.void_stalker +
    roster.aerial_reaver +
    roster.siege_guardian +
    roster.elite_guard
  );
}

export interface ScaledEnemyCombatStats {
  maxHp: number;
  damage: number;
  fireCooldown: number;
  moveSpeed: number;
  flankChance: number;
  accuracySpread: number;
}

/**
 * Pure enemy combat scaling by both level tier (1..6) and difficulty profile.
 * Phase 5 balanced curve: tactical lethality without unfair bullet-sponge HP or instant melts.
 */
export function computeScaledEnemyStats(params: {
  baseHp: number;
  baseDamage: number;
  baseCooldown: number;
  baseSpeed: number;
  levelIndex: number;
  difficulty: DifficultyId;
}): ScaledEnemyCombatStats {
  const diff = getDifficultyProfile(params.difficulty);
  const levelTier = Math.max(0, Math.min(5, params.levelIndex - 1));
  const levelHpScale = 1 + levelTier * 0.065;
  const levelDmgScale = 1 + levelTier * 0.05;
  const levelSpeedScale = 1 + levelTier * 0.025;

  return {
    maxHp: Math.round(params.baseHp * levelHpScale * diff.enemyHealth),
    damage: Math.max(2, Math.round(params.baseDamage * levelDmgScale * diff.incomingDamage)),
    fireCooldown: Math.max(0.55, params.baseCooldown / (diff.aggression * (1 + levelTier * 0.03))),
    moveSpeed: params.baseSpeed * levelSpeedScale * (0.92 + diff.aggression * 0.08),
    flankChance: Math.min(0.92, 0.2 + diff.coordination * 0.42 + levelTier * 0.05),
    accuracySpread: Math.max(0.028, 0.14 / diff.accuracy),
  };
}

export interface LevelProgressInput {
  level: CampaignLevelConfig;
  killsInLevel: number;
  structuresDestroyed: number;
  sovereignDefeated: boolean;
}

export interface LevelProgressEvaluation {
  completed: boolean;
  progressPercent: number;
  statusLabel: string;
}

export function evaluateLevelProgress(input: LevelProgressInput): LevelProgressEvaluation {
  const { level, killsInLevel, structuresDestroyed, sovereignDefeated } = input;

  if (level.hasSovereignBoss) {
    const killRatio = Math.min(1, killsInLevel / Math.max(1, level.targetKills));
    const pct = sovereignDefeated ? 100 : Math.round(killRatio * 45);
    return {
      completed: sovereignDefeated,
      progressPercent: pct,
      statusLabel: sovereignDefeated
        ? 'THE SOVEREIGN DEFEATED — AETHER PRIME LIBERATED'
        : `DEFEAT THE SOVEREIGN (${killsInLevel} ESCORTS ELIMINATED)`,
    };
  }

  const killRatio = Math.min(1, killsInLevel / Math.max(1, level.targetKills));
  if (level.objectiveStructureCount > 0) {
    const structRatio = Math.min(1, structuresDestroyed / level.objectiveStructureCount);
    const pct = Math.round((killRatio * 0.55 + structRatio * 0.45) * 100);
    const done =
      killsInLevel >= level.targetKills &&
      structuresDestroyed >= level.objectiveStructureCount;
    return {
      completed: done,
      progressPercent: done ? 100 : Math.min(99, pct),
      statusLabel: `TARGETS ${structuresDestroyed}/${level.objectiveStructureCount} · HOSTILES ${Math.min(killsInLevel, level.targetKills)}/${level.targetKills}`,
    };
  }

  const done = killsInLevel >= level.targetKills;
  return {
    completed: done,
    progressPercent: done ? 100 : Math.round(killRatio * 100),
    statusLabel: `HOSTILES ELIMINATED ${Math.min(killsInLevel, level.targetKills)}/${level.targetKills}`,
  };
}
