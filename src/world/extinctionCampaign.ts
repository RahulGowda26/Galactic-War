import type { DifficultyId } from './campaignConfig';
import type { CampaignLevelDef } from './campaignLevels';
import {
  ENEMY_FIGHTER_ROLES,
  type EnemyFighterRole,
  type EnemyFighterRoleConfig,
  type SpaceRegionId,
} from './spacePhysics';
import type { CampaignMissionDef, LevelCompletionRecord } from './strategicCampaign';

export type CampaignTrackId = 'original' | 'extinction';

export type ExtinctionOnlyEnemyRole =
  | 'phantom_interceptor'
  | 'hunter_drone'
  | 'disruptor_ship';

export type ExtinctionEnemyRole = EnemyFighterRole | ExtinctionOnlyEnemyRole;

export type ExtinctionEventKind =
  | 'asteroid_storm'
  | 'hyperspace_ambush'
  | 'orbital_kill_zone'
  | 'fleet_collapse'
  | 'emergency_extraction';

export type ExtinctionBossKind = 'mini_boss' | 'major_boss';

export type ExtinctionBossId =
  | 'executioner'
  | 'carrier_warden'
  | 'siege_breaker'
  | 'iron_revenant'
  | 'void_harvester'
  | 'sovereign_extinction';

export interface ExtinctionEnemyRoleConfig extends Omit<EnemyFighterRoleConfig, 'role'> {
  role: ExtinctionEnemyRole;
  isExtinctionExclusive: boolean;
}

export const EXTINCTION_ONLY_ROLES: Record<ExtinctionOnlyEnemyRole, ExtinctionEnemyRoleConfig> = {
  phantom_interceptor: {
    role: 'phantom_interceptor',
    shipClass: 'fighter',
    displayName: 'Phantom Interceptor',
    badge: 'STEALTH',
    baseHp: 118,
    baseShield: 68,
    speed: 220,
    damage: 11,
    fireCooldown: 1.45,
    tacticalSummary:
      'Stealth strike fighter using short cloak bursts to flank; decloaks on fire, hull hits, or close range.',
    isExtinctionExclusive: true,
  },
  hunter_drone: {
    role: 'hunter_drone',
    shipClass: 'fighter',
    displayName: 'Hunter Drone',
    badge: 'SWARM',
    baseHp: 54,
    baseShield: 26,
    speed: 238,
    damage: 6,
    fireCooldown: 1.55,
    tacticalSummary:
      'Autonomous pack hunter executing coordinated surrounding vectors; fragile individually.',
    isExtinctionExclusive: true,
  },
  disruptor_ship: {
    role: 'disruptor_ship',
    shipClass: 'medium',
    displayName: 'EW Disruptor Ship',
    badge: 'EW JAMMER',
    baseHp: 320,
    baseShield: 220,
    speed: 102,
    damage: 13,
    fireCooldown: 1.9,
    tacticalSummary:
      'Electronic warfare gunboat emitting timed sensor-jamming pulses and stabilizing allied shields.',
    isExtinctionExclusive: true,
  },
};

export function getAnyEnemyRoleConfig(role: string): ExtinctionEnemyRoleConfig {
  if (role in EXTINCTION_ONLY_ROLES) {
    return EXTINCTION_ONLY_ROLES[role as ExtinctionOnlyEnemyRole];
  }
  if (role in ENEMY_FIGHTER_ROLES) {
    const base = ENEMY_FIGHTER_ROLES[role as EnemyFighterRole];
    return { ...base, role: base.role, isExtinctionExclusive: false };
  }
  return { ...ENEMY_FIGHTER_ROLES.interceptor, isExtinctionExclusive: false };
}

export interface ExtinctionBattleStage {
  stageNumber: number;
  label: string;
  headline: string;
  enemyWaves: Partial<Record<ExtinctionEnemyRole, number>>;
  maxConcurrentHostiles: number;
  spawnBossOnEnter?: boolean;
  triggerEvents?: ExtinctionEventKind[];
  advanceWhen:
    | 'stage_cleared'
    | 'boss_phase_2'
    | 'boss_phase_3'
    | 'boss_defeated'
    | 'survival_elapsed'
    | 'extraction_reached';
}

export interface ExtinctionLevelDef extends CampaignLevelDef {
  campaignTrack: 'extinction';
  extinctionNumber: number; // 1..10
  bossId: ExtinctionBossId | null;
  bossKind: ExtinctionBossKind | null;
  bossTitle: string | null;
  extinctionEnemyMix: Partial<Record<ExtinctionEnemyRole, number>>;
  battleStages: ExtinctionBattleStage[];
  events: ExtinctionEventKind[];
  alliedFleetName?: string;
  alliedFleetCount?: number;
  extractionRequired?: boolean;
  extractionDistanceMeters?: number;
  isFinalExtinctionMission?: boolean;
}

export interface ExtinctionCampaignState {
  unlockedLevelIds: string[];
  completedLevelIds: string[];
  claimedRewardLevelIds: string[];
  currentLevelId: string;
  levelRecords: Record<string, LevelCompletionRecord>;
  defeatedBossIds: ExtinctionBossId[];
  extinctionCompleted: boolean;
  extinctionMedals: string[];
  stats: {
    totalKills: number;
    bossesDefeated: number;
    playTimeSec: number;
  };
}

export const EXTINCTION_OPERATION_ID = 'extinction_campaign_op';

export const EXTINCTION_CAMPAIGN_OPERATION: CampaignMissionDef = {
  id: EXTINCTION_OPERATION_ID,
  missionNumber: 1,
  isOptional: false,
  unlockAfterMission: 0,
  code: 'EXTINCTION',
  title: 'Extinction Campaign',
  subtitle: '10-Level Extreme Warfare Operational Command',
  theater: 'space',
  encounterTier: 'major',
  spaceRegionId: 'low_orbit',
  capitalShipOverride: null,
  briefingSummary:
    'Isolated high-threat campaign against covert Phantom wings, Swarm drones, Disruptor EW gunboats, and Sovereign Doomsday constructs.',
  commsTransmission:
    'COMMAND: All vanguard wings cleared for Extinction protocol. Expect ruthless multi-phase engagements.',
  intelNotes: 'Separate progression track from Original 31-level campaign; shares Hangar craft & upgrades.',
  enemyComposition: ['Phantom Interceptor', 'Hunter Drone', 'EW Disruptor Ship', 'Mini-Bosses', 'Major Bosses'],
  friendlyForces: 'Vanguard Special Operations Squadron & Allied Escorts',
  environmentalHazards: 'Asteroid Storms · Orbital Kill Zones · Hyperspace Ambushes',
  optionalObjective: 'Clear tactical precision targets in each Extinction operation',
  rewards: { salvage: 260, supplies: 80, intel: 60, fleetReadiness: 10 },
};

export const EXTINCTION_LEVELS: ExtinctionLevelDef[] = [
  {
    id: 'ext_l01',
    campaignTrack: 'extinction',
    operationId: EXTINCTION_OPERATION_ID,
    operationNumber: 1,
    levelIndexInOp: 1,
    globalLevelNumber: 1,
    extinctionNumber: 1,
    code: 'EXT · LVL 01',
    name: 'First Contact',
    subtitle: 'Protect Vanguard Recon Wing through asteroid ambush & break hostile elite lead',
    spaceRegionId: 'low_orbit',
    objectiveType: 'escort',
    objectiveBadge: 'EXTINCTION · ESCORT',
    briefing:
      'EXTINCTION L01: Unidentified Sovereign shock vanguard struck Vanguard Recon Wing near the outer asteroid lane. Shield our friendly transports, survive staged bomber waves, down the lead Ace fighter, and reach Emergency Extraction.',
    primaryObjectiveText: 'Eliminate shock waves & elite lead, protect allies, and reach Extraction Buoy',
    optionalObjectiveText: 'Preserve allied integrity above 65%',
    optionalObjectiveKind: 'protect_hp',
    optionalObjectiveTarget: 65,
    enemyIntel: 'Staged Interceptors, Siege Bombers, Armored Strikers + 1 Elite Strike Leader',
    threatLevel: 'high',
    isBossLevel: false,
    bossId: null,
    bossKind: null,
    bossTitle: null,
    estimatedMinutes: '5–6 min',
    successConditionText: 'Clear hostile strike stages, protect allied wing, and reach extraction',
    failureConditionText: 'Player spacecraft or protected allied wing destroyed',
    protectedEntityName: 'Vanguard Recon Wing',
    protectedMaxHp: 460,
    alliedFleetName: 'Vanguard Recon Wing',
    alliedFleetCount: 2,
    extractionRequired: true,
    extractionDistanceMeters: 1600,
    events: ['emergency_extraction'],
    enemyMix: { interceptor: 3, bomber: 2, heavy_fighter: 2, elite_ace: 1 },
    extinctionEnemyMix: { interceptor: 3, bomber: 2, heavy_fighter: 2, elite_ace: 1 },
    battleStages: [
      {
        stageNumber: 1,
        label: 'Stage I · Vanguard Ambush',
        headline: 'HOSTILE STRIKE WAVES APPROACHING RECON WING',
        enemyWaves: { interceptor: 3, bomber: 2 },
        maxConcurrentHostiles: 6,
        advanceWhen: 'stage_cleared',
      },
      {
        stageNumber: 2,
        label: 'Stage II · Heavy Breakthrough',
        headline: 'ARMORED STRIKERS & ELITE FIGHTER LEADER DETECTED',
        enemyWaves: { heavy_fighter: 2, elite_ace: 1 },
        maxConcurrentHostiles: 5,
        advanceWhen: 'stage_cleared',
      },
      {
        stageNumber: 3,
        label: 'Stage III · Emergency Extraction',
        headline: 'SECTOR HOT — BOOST TO EMERGENCY EXTRACTION BUOY',
        enemyWaves: {},
        maxConcurrentHostiles: 4,
        triggerEvents: ['emergency_extraction'],
        advanceWhen: 'extraction_reached',
      },
    ],
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 210,
    gradeThresholds: { B: 2900, A: 4300, S: 5800 },
    rewards: { salvage: 140, supplies: 50, intel: 35, fleetReadiness: 6, credits: 460, baseXp: 680 },
  },
  {
    id: 'ext_l02',
    campaignTrack: 'extinction',
    operationId: EXTINCTION_OPERATION_ID,
    operationNumber: 2,
    levelIndexInOp: 2,
    globalLevelNumber: 2,
    extinctionNumber: 2,
    code: 'EXT · LVL 02',
    name: 'Phantom Hunt',
    subtitle: 'Counter cloaking Phantom Interceptors & coordinated Hunter Drone Swarms',
    spaceRegionId: 'debris_belt',
    objectiveType: 'interception',
    objectiveBadge: 'EXTINCTION · STEALTH HUNT',
    briefing:
      'EXTINCTION L02: Deep belt telemetry picks up intermittent cloaked signatures — Phantom Interceptors supported by autonomous Hunter Drone packs. Track weapon flash/sensor shimmer and break the swarm.',
    primaryObjectiveText: 'Neutralize all Phantom Interceptors and Hunter Drone Swarms',
    optionalObjectiveText: 'Achieve at least 42% weapon accuracy',
    optionalObjectiveKind: 'accuracy',
    optionalObjectiveTarget: 42,
    enemyIntel: '5x Phantom Interceptors (Cloak), 10x Hunter Drones (Swarm), 2x Interceptors',
    threatLevel: 'high',
    isBossLevel: false,
    bossId: null,
    bossKind: null,
    bossTitle: null,
    estimatedMinutes: '5–7 min',
    successConditionText: 'Destroy all stealth hunters and swarm packs',
    failureConditionText: 'Player spacecraft destroyed',
    events: ['hyperspace_ambush'],
    enemyMix: { interceptor: 2 },
    extinctionEnemyMix: { phantom_interceptor: 5, hunter_drone: 10, interceptor: 2 },
    battleStages: [
      {
        stageNumber: 1,
        label: 'Stage I · Ghost Contacts',
        headline: 'CLOAKED PHANTOMS & DRONE VANGUARD INBOUND',
        enemyWaves: { phantom_interceptor: 2, hunter_drone: 5 },
        maxConcurrentHostiles: 8,
        advanceWhen: 'stage_cleared',
      },
      {
        stageNumber: 2,
        label: 'Stage II · Hyperspace Pack Ambush',
        headline: 'HYPERSPACE AMBUSH — SECOND SWARM & PHANTOM FLANKERS',
        enemyWaves: { phantom_interceptor: 3, hunter_drone: 5, interceptor: 2 },
        maxConcurrentHostiles: 10,
        triggerEvents: ['hyperspace_ambush'],
        advanceWhen: 'stage_cleared',
      },
    ],
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 215,
    gradeThresholds: { B: 3200, A: 4700, S: 6300 },
    rewards: { salvage: 165, supplies: 55, intel: 45, fleetReadiness: 6, credits: 520, baseXp: 760 },
  },
  {
    id: 'ext_l03',
    campaignTrack: 'extinction',
    operationId: EXTINCTION_OPERATION_ID,
    operationNumber: 3,
    levelIndexInOp: 3,
    globalLevelNumber: 3,
    extinctionNumber: 3,
    code: 'EXT · LVL 03',
    name: 'The Executioner',
    subtitle: 'Mini-Boss I: Defeat Rogue Strike Ace Vaelen Korr through all 3 combat phases',
    spaceRegionId: 'outer_frontier',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'MINI-BOSS I · EXECUTIONER',
    briefing:
      'EXTINCTION L03: Apex Sovereign assassin "The Executioner" operates a high-G strike frame with cloaked ambushers. Survive his Hunter pursuit, Predator missile barrages, and relentless Execution overdrive.',
    primaryObjectiveText: 'Defeat Mini-Boss The Executioner & escort screen',
    optionalObjectiveText: 'Finish with hull integrity above 55%',
    optionalObjectiveKind: 'hull_above',
    optionalObjectiveTarget: 55,
    enemyIntel: 'MINI-BOSS: The Executioner (3 Phases) + Phantoms & Interceptors',
    threatLevel: 'boss',
    isBossLevel: true,
    bossId: 'executioner',
    bossKind: 'mini_boss',
    bossTitle: 'Vaelen Korr · THE EXECUTIONER',
    estimatedMinutes: '5–7 min',
    successConditionText: 'Destroy The Executioner and clear active escorts',
    failureConditionText: 'Player spacecraft destroyed',
    events: ['hyperspace_ambush'],
    enemyMix: { elite_ace: 1, interceptor: 3 },
    extinctionEnemyMix: { elite_ace: 1, interceptor: 3, phantom_interceptor: 2 },
    battleStages: [
      {
        stageNumber: 1,
        label: 'Stage I · Sovereign Vanguard',
        headline: 'ELIMINATE SOVEREIGN VANGUARD TO DRAW OUT THE EXECUTIONER',
        enemyWaves: { interceptor: 2 },
        maxConcurrentHostiles: 4,
        spawnBossOnEnter: false,
        advanceWhen: 'stage_cleared',
      },
      {
        stageNumber: 2,
        label: 'Phase I · The Executioner Arrives',
        headline: 'MINI-BOSS CONTACT — THE EXECUTIONER LOCKED ON',
        enemyWaves: { interceptor: 1 },
        maxConcurrentHostiles: 5,
        spawnBossOnEnter: true,
        advanceWhen: 'boss_phase_2',
      },
      {
        stageNumber: 3,
        label: 'Phase II · Predator Overdrive',
        headline: 'EXECUTIONER ENTERING PREDATOR PHASE — FLANK SCREEN DEPLOYED',
        enemyWaves: { phantom_interceptor: 2 },
        maxConcurrentHostiles: 6,
        triggerEvents: ['hyperspace_ambush'],
        advanceWhen: 'boss_defeated',
      },
    ],
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 225,
    gradeThresholds: { B: 3600, A: 5300, S: 7100 },
    rewards: { salvage: 195, supplies: 65, intel: 55, fleetReadiness: 7, credits: 620, baseXp: 900 },
  },
  {
    id: 'ext_l04',
    campaignTrack: 'extinction',
    operationId: EXTINCTION_OPERATION_ID,
    operationNumber: 4,
    levelIndexInOp: 4,
    globalLevelNumber: 4,
    extinctionNumber: 4,
    code: 'EXT · LVL 04',
    name: 'War Machine',
    subtitle: 'Full capital warship assault against Dread-Cruiser Typhon-IX & EW screen',
    spaceRegionId: 'shattered_fleet',
    objectiveType: 'assault',
    objectiveBadge: 'EXTINCTION · WARSHIP ASSAULT',
    briefing:
      'EXTINCTION L04: Sovereign War Cruiser Typhon-IX anchors a heavy battle group in the Shattered Fleet Graveyard. Prioritize EW Disruptors, cripple capital shield/weapon batteries, and shatter the warship.',
    primaryObjectiveText: 'Disable subsystems & destroy Dread-Cruiser Typhon-IX',
    optionalObjectiveText: 'Destroy 4 or more capital ship subsystems',
    optionalObjectiveKind: 'subsystems_destroyed',
    optionalObjectiveTarget: 4,
    enemyIntel: 'War Cruiser Typhon-IX + Siege Bombers, Armored Strikers & Disruptor EW',
    threatLevel: 'extreme',
    isBossLevel: false,
    bossId: null,
    bossKind: null,
    bossTitle: null,
    estimatedMinutes: '6–8 min',
    successConditionText: 'Destroy 4 subsystems / sink Typhon-IX and eliminate escort screen',
    failureConditionText: 'Player spacecraft destroyed',
    events: ['asteroid_storm'],
    enemyMix: { heavy_fighter: 3, bomber: 3, interceptor: 2 },
    extinctionEnemyMix: { heavy_fighter: 3, bomber: 3, interceptor: 2, disruptor_ship: 1 },
    battleStages: [
      {
        stageNumber: 1,
        label: 'Stage I · Cruiser Screen',
        headline: 'DREAD-CRUISER TYPHON-IX ENGAGING AT BROADSIDE RANGE',
        enemyWaves: { heavy_fighter: 3, bomber: 2, disruptor_ship: 1 },
        maxConcurrentHostiles: 7,
        spawnBossOnEnter: true,
        advanceWhen: 'stage_cleared',
      },
      {
        stageNumber: 2,
        label: 'Stage II · Desperation Counterstrike',
        headline: 'CRUISER LAUNCHING RESERVES — ASTEROID STORM INBOUND',
        enemyWaves: { bomber: 1, interceptor: 2 },
        maxConcurrentHostiles: 6,
        triggerEvents: ['asteroid_storm'],
        advanceWhen: 'stage_cleared',
      },
    ],
    capitalShipOverride: { name: 'War Cruiser Typhon-IX', shipClass: 'assault_cruiser' },
    requiredSubsystems: 4,
    legendaryPilotId: null,
    parTimeSec: 250,
    gradeThresholds: { B: 4100, A: 5900, S: 7900 },
    rewards: { salvage: 210, supplies: 70, intel: 60, fleetReadiness: 7, credits: 680, baseXp: 980 },
  },
  {
    id: 'ext_l05',
    campaignTrack: 'extinction',
    operationId: EXTINCTION_OPERATION_ID,
    operationNumber: 5,
    levelIndexInOp: 5,
    globalLevelNumber: 5,
    extinctionNumber: 5,
    code: 'EXT · LVL 05',
    name: 'The Carrier Warden',
    subtitle: 'Mini-Boss II: Crush the mobile carrier & sever its active hangar bays',
    spaceRegionId: 'debris_belt',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'MINI-BOSS II · CARRIER WARDEN',
    briefing:
      'EXTINCTION L05: Heavy Assault Carrier Vex-Maw deploys finite Hunter Drone & Interceptor wings from armored port/starboard hangars. Sever its Hangar subsystem to permanently halt fighter launches, then finish the carrier.',
    primaryObjectiveText: 'Destroy Carrier Warden hangars, active wings, and flagship hull',
    optionalObjectiveText: 'Reach a x7 combat combo streak',
    optionalObjectiveKind: 'combo_reach',
    optionalObjectiveTarget: 7,
    enemyIntel: 'MINI-BOSS: Carrier Warden (3 Phases, Hangar-Gated Launches) + Drones & Bombers',
    threatLevel: 'boss',
    isBossLevel: true,
    bossId: 'carrier_warden',
    bossKind: 'mini_boss',
    bossTitle: 'Carrier Vex-Maw · CARRIER WARDEN',
    estimatedMinutes: '6–8 min',
    successConditionText: 'Destroy Carrier Warden and clear remaining launched wings',
    failureConditionText: 'Player spacecraft destroyed',
    events: ['hyperspace_ambush'],
    enemyMix: { interceptor: 2, bomber: 2 },
    extinctionEnemyMix: { interceptor: 2, bomber: 2, hunter_drone: 6, phantom_interceptor: 2 },
    battleStages: [
      {
        stageNumber: 1,
        label: 'Stage I · Carrier Recon Screen',
        headline: 'CLEAR RECON DRONE SCREEN TO FORCE CARRIER WARDEN EMERGENCE',
        enemyWaves: { hunter_drone: 3, interceptor: 2 },
        maxConcurrentHostiles: 6,
        spawnBossOnEnter: false,
        advanceWhen: 'stage_cleared',
      },
      {
        stageNumber: 2,
        label: 'Phase I · Fortress Launch',
        headline: 'CARRIER WARDEN VEX-MAW JUMPING IN — TARGET HANGAR BAY',
        enemyWaves: { hunter_drone: 2 },
        maxConcurrentHostiles: 7,
        spawnBossOnEnter: true,
        advanceWhen: 'boss_phase_2',
      },
      {
        stageNumber: 3,
        label: 'Phase II · Tactical Redeploy',
        headline: 'CARRIER WARDEN REDEPLOYING — HEAVY ORDNANCE SCREEN',
        enemyWaves: { bomber: 2, phantom_interceptor: 1 },
        maxConcurrentHostiles: 8,
        advanceWhen: 'boss_defeated',
      },
    ],
    capitalShipOverride: { name: 'Carrier Warden Vex-Maw', shipClass: 'assault_cruiser' },
    requiredSubsystems: 5,
    legendaryPilotId: null,
    parTimeSec: 265,
    gradeThresholds: { B: 4300, A: 6200, S: 8300 },
    rewards: { salvage: 240, supplies: 75, intel: 65, fleetReadiness: 8, credits: 760, baseXp: 1120 },
  },
  {
    id: 'ext_l06',
    campaignTrack: 'extinction',
    operationId: EXTINCTION_OPERATION_ID,
    operationNumber: 6,
    levelIndexInOp: 6,
    globalLevelNumber: 6,
    extinctionNumber: 6,
    code: 'EXT · LVL 06',
    name: 'Siege Breaker',
    subtitle: 'Mini-Boss III: Shatter armored bastion weak points under Disruptor EW interference',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'MINI-BOSS III · SIEGE BREAKER',
    briefing:
      'EXTINCTION L06: Heavily plated Siege Breaker advances behind twin EW Disruptor gunboats that scramble missile locks during active pulses. Neutralize Disruptor escorts, dodge telegraphed siege beams, and strike cracked weak points.',
    primaryObjectiveText: 'Neutralize Disruptor screen & destroy Siege Breaker',
    optionalObjectiveText: 'Complete without using a nanite repair kit',
    optionalObjectiveKind: 'no_repair_kits',
    optionalObjectiveTarget: 0,
    enemyIntel: 'MINI-BOSS: Siege Breaker (Weak Points + Telegraphed Barrage) + 2x EW Disruptors',
    threatLevel: 'boss',
    isBossLevel: true,
    bossId: 'siege_breaker',
    bossKind: 'mini_boss',
    bossTitle: 'Bastion Brute · SIEGE BREAKER',
    estimatedMinutes: '6–8 min',
    successConditionText: 'Destroy Siege Breaker and clear remaining Disruptor escorts',
    failureConditionText: 'Player spacecraft destroyed',
    events: ['orbital_kill_zone'],
    enemyMix: { heavy_fighter: 2, bomber: 2 },
    extinctionEnemyMix: { disruptor_ship: 2, heavy_fighter: 2, bomber: 2 },
    battleStages: [
      {
        stageNumber: 1,
        label: 'Stage I · Outrider Bastion',
        headline: 'BREAK OUTRIDER SCREEN TO TRIGGER SIEGE BREAKER ASSAULT',
        enemyWaves: { disruptor_ship: 1, heavy_fighter: 2 },
        maxConcurrentHostiles: 5,
        spawnBossOnEnter: false,
        triggerEvents: ['orbital_kill_zone'],
        advanceWhen: 'stage_cleared',
      },
      {
        stageNumber: 2,
        label: 'Phase I · Armored Advance',
        headline: 'SIEGE BREAKER BASTION BREACHING SECTOR — TARGET WEAK POINTS',
        enemyWaves: { disruptor_ship: 1, heavy_fighter: 1 },
        maxConcurrentHostiles: 6,
        spawnBossOnEnter: true,
        advanceWhen: 'boss_phase_2',
      },
      {
        stageNumber: 3,
        label: 'Phase II · Telegraphed Barrage',
        headline: 'SIEGE CANNON WINDUP DETECTED — EVADE TELEGRAPH LINE',
        enemyWaves: { bomber: 2 },
        maxConcurrentHostiles: 6,
        advanceWhen: 'boss_defeated',
      },
    ],
    capitalShipOverride: { name: 'Siege Breaker Bastion', shipClass: 'assault_cruiser' },
    requiredSubsystems: 5,
    legendaryPilotId: null,
    parTimeSec: 275,
    gradeThresholds: { B: 4600, A: 6600, S: 8800 },
    rewards: { salvage: 265, supplies: 85, intel: 70, fleetReadiness: 8, credits: 840, baseXp: 1240 },
  },
  {
    id: 'ext_l07',
    campaignTrack: 'extinction',
    operationId: EXTINCTION_OPERATION_ID,
    operationNumber: 7,
    levelIndexInOp: 7,
    globalLevelNumber: 7,
    extinctionNumber: 7,
    code: 'EXT · LVL 07',
    name: 'No Way Out',
    subtitle: 'Full-scale fleet ambush during asteroid storm — hold until extraction opens',
    spaceRegionId: 'shattered_fleet',
    objectiveType: 'survival',
    objectiveBadge: 'EXTINCTION · FLEET COLLAPSE',
    briefing:
      'EXTINCTION L07: Full Sovereign battle group sprung a hyperspace trap amid a rogue asteroid storm! Hold the line beside the damaged Vanguard 7th Taskforce through staged ambush waves until Emergency Extraction opens.',
    primaryObjectiveText: 'Survive 115s, defend allied Frigate Aegis, and escape at Extraction Zone',
    optionalObjectiveText: 'Preserve Allied Frigate Aegis above 50% hull',
    optionalObjectiveKind: 'protect_hp',
    optionalObjectiveTarget: 50,
    enemyIntel: 'Hyperspace Ambush + Corvettes, Phantoms, Hunter Drones & War Cruiser',
    threatLevel: 'extreme',
    isBossLevel: false,
    bossId: null,
    bossKind: null,
    bossTitle: null,
    estimatedMinutes: '6–8 min',
    successConditionText: 'Keep Frigate Aegis alive through 115s ambush & reach Emergency Extraction',
    failureConditionText: 'Player spacecraft destroyed or Allied Frigate Aegis lost',
    survivalDurationSec: 115,
    protectedEntityName: 'Vanguard Frigate Aegis',
    protectedMaxHp: 620,
    alliedFleetName: 'Vanguard 7th Taskforce',
    alliedFleetCount: 3,
    extractionRequired: true,
    extractionDistanceMeters: 1750,
    events: ['hyperspace_ambush', 'fleet_collapse', 'asteroid_storm', 'emergency_extraction'],
    enemyMix: { interceptor: 3, bomber: 2, heavy_fighter: 3, medium_warship: 1 },
    extinctionEnemyMix: {
      interceptor: 3,
      bomber: 2,
      heavy_fighter: 3,
      medium_warship: 1,
      phantom_interceptor: 2,
      hunter_drone: 5,
    },
    battleStages: [
      {
        stageNumber: 1,
        label: 'Stage I · Hyperspace Ambush',
        headline: 'FLEET COLLAPSE ALERT — HYPERSPACE SIGNATURES ENCIRCLING TASKFORCE',
        enemyWaves: { interceptor: 3, phantom_interceptor: 2, bomber: 2 },
        maxConcurrentHostiles: 9,
        triggerEvents: ['hyperspace_ambush', 'fleet_collapse'],
        advanceWhen: 'stage_cleared',
      },
      {
        stageNumber: 2,
        label: 'Stage II · Asteroid Storm Press',
        headline: 'ROGUE ASTEROID STORM INBOUND — HEAVY WARSHIPS CLOSING',
        enemyWaves: { heavy_fighter: 3, medium_warship: 1, hunter_drone: 5 },
        maxConcurrentHostiles: 10,
        triggerEvents: ['asteroid_storm'],
        advanceWhen: 'survival_elapsed',
      },
      {
        stageNumber: 3,
        label: 'Stage III · Emergency Extraction',
        headline: 'JUMP WINDOW OPEN — REACH EXTRACTION BEACON IMMEDIATELY',
        enemyWaves: {},
        maxConcurrentHostiles: 8,
        triggerEvents: ['emergency_extraction'],
        advanceWhen: 'extraction_reached',
      },
    ],
    capitalShipOverride: { name: 'Vanguard Blockader Oblivion', shipClass: 'frigate' },
    requiredSubsystems: 3,
    legendaryPilotId: null,
    parTimeSec: 235,
    gradeThresholds: { B: 4500, A: 6500, S: 8600 },
    rewards: { salvage: 280, supplies: 90, intel: 75, fleetReadiness: 9, credits: 910, baseXp: 1360 },
  },
  {
    id: 'ext_l08',
    campaignTrack: 'extinction',
    operationId: EXTINCTION_OPERATION_ID,
    operationNumber: 8,
    levelIndexInOp: 8,
    globalLevelNumber: 8,
    extinctionNumber: 8,
    code: 'EXT · LVL 08',
    name: 'Iron Revenant',
    subtitle: 'Major Boss I: Dismantle Dreadnought Iron Revenant from armored prow to reactor',
    spaceRegionId: 'outer_frontier',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'MAJOR BOSS I · DREADNOUGHT',
    briefing:
      'EXTINCTION L08: Colossal Dreadnought Iron Revenant blocks the Frontier hyperspace gate. Strip its frontal Iron Wall plating, break its broadside batteries and armored bridge, and trigger catastrophic Reactor Failure.',
    primaryObjectiveText: 'Break Iron Revenant armor plates & destroy its critical reactor',
    optionalObjectiveText: 'Defeat Iron Revenant in under 300 seconds',
    optionalObjectiveKind: 'time_under',
    optionalObjectiveTarget: 300,
    enemyIntel: 'MAJOR BOSS: Iron Revenant Dreadnought (3 Phases) + Heavy Escort Screen',
    threatLevel: 'boss',
    isBossLevel: true,
    bossId: 'iron_revenant',
    bossKind: 'major_boss',
    bossTitle: 'Dreadnought Leviathan · IRON REVENANT',
    estimatedMinutes: '7–9 min',
    successConditionText: 'Complete Reactor Failure destruction of Iron Revenant',
    failureConditionText: 'Player spacecraft destroyed',
    events: ['asteroid_storm'],
    enemyMix: { heavy_fighter: 3, bomber: 2, interceptor: 2 },
    extinctionEnemyMix: { heavy_fighter: 3, bomber: 2, interceptor: 2, disruptor_ship: 1 },
    battleStages: [
      {
        stageNumber: 1,
        label: 'Stage I · Iron Frontier Guard',
        headline: 'DESTROY FRONTIER HONOR GUARD TO EXPOSE IRON REVENANT APPROACH',
        enemyWaves: { heavy_fighter: 2, disruptor_ship: 1 },
        maxConcurrentHostiles: 5,
        spawnBossOnEnter: false,
        advanceWhen: 'stage_cleared',
      },
      {
        stageNumber: 2,
        label: 'Phase I · The Wall',
        headline: 'MAJOR BOSS ENGAGED — DREADNOUGHT IRON REVENANT WARPING IN',
        enemyWaves: { heavy_fighter: 1 },
        maxConcurrentHostiles: 6,
        spawnBossOnEnter: true,
        advanceWhen: 'boss_phase_2',
      },
      {
        stageNumber: 3,
        label: 'Phase II · Break the Armour',
        headline: 'PROW ARMOR FRACTURING — EVADE BROADSIDES & SHATTER SUBSYSTEMS',
        enemyWaves: { bomber: 2 },
        maxConcurrentHostiles: 6,
        triggerEvents: ['asteroid_storm'],
        advanceWhen: 'boss_phase_3',
      },
      {
        stageNumber: 4,
        label: 'Phase III · Reactor Failure',
        headline: 'REACTOR CONTAINMENT FAILING — STRIKE EXPOSED CORE & CLEAR BLAST',
        enemyWaves: { interceptor: 1 },
        maxConcurrentHostiles: 5,
        advanceWhen: 'boss_defeated',
      },
    ],
    capitalShipOverride: { name: 'Dreadnought Iron Revenant', shipClass: 'heavy_dreadnought' },
    requiredSubsystems: 5,
    legendaryPilotId: null,
    parTimeSec: 295,
    gradeThresholds: { B: 5100, A: 7200, S: 9600 },
    rewards: { salvage: 320, supplies: 100, intel: 85, fleetReadiness: 9, credits: 1050, baseXp: 1580 },
  },
  {
    id: 'ext_l09',
    campaignTrack: 'extinction',
    operationId: EXTINCTION_OPERATION_ID,
    operationNumber: 9,
    levelIndexInOp: 9,
    globalLevelNumber: 9,
    extinctionNumber: 9,
    code: 'EXT · LVL 09',
    name: 'Void Harvester',
    subtitle: 'Major Boss II: Sever 3 rotating Energy Cores on an alien mechanical construct',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'MAJOR BOSS II · VOID HARVESTER',
    briefing:
      'EXTINCTION L09: Non-human orbital construct Void Harvester channels an impenetrable central barrier through 3 independently armored Energy Cores. Destroy its Shield barrier, sever all 3 rotating Energy Cores during Core Hunt, and shatter its exposed nexus.',
    primaryObjectiveText: 'Sever all 3 Energy Cores & destroy Void Harvester in Collapse phase',
    optionalObjectiveText: 'Finish with hull integrity above 50%',
    optionalObjectiveKind: 'hull_above',
    optionalObjectiveTarget: 50,
    enemyIntel: 'MAJOR BOSS: Void Harvester (3 Energy Cores) + Hunter Drones, Phantoms & Disruptor',
    threatLevel: 'boss',
    isBossLevel: true,
    bossId: 'void_harvester',
    bossKind: 'major_boss',
    bossTitle: 'Mechanical Fortress · VOID HARVESTER',
    estimatedMinutes: '7–10 min',
    successConditionText: 'Destroy all 3 Energy Cores and shatter Void Harvester central nexus',
    failureConditionText: 'Player spacecraft destroyed',
    events: ['orbital_kill_zone', 'hyperspace_ambush'],
    enemyMix: { interceptor: 2 },
    extinctionEnemyMix: { hunter_drone: 8, phantom_interceptor: 2, disruptor_ship: 1 },
    battleStages: [
      {
        stageNumber: 1,
        label: 'Stage I · Construct Vanguard',
        headline: 'SHATTER CONSTRUCT VANGUARD TO UNSEAL VOID HARVESTER GATE',
        enemyWaves: { hunter_drone: 4, disruptor_ship: 1 },
        maxConcurrentHostiles: 6,
        spawnBossOnEnter: false,
        triggerEvents: ['orbital_kill_zone'],
        advanceWhen: 'stage_cleared',
      },
      {
        stageNumber: 2,
        label: 'Phase I · Shielded Construct',
        headline: 'VOID HARVESTER CONSTRUCT MATERIALIZING — STRIP CENTRAL BARRIERS',
        enemyWaves: { hunter_drone: 2 },
        maxConcurrentHostiles: 7,
        spawnBossOnEnter: true,
        advanceWhen: 'boss_phase_2',
      },
      {
        stageNumber: 3,
        label: 'Phase II · Core Hunt (3 Cores)',
        headline: 'ENERGY CORES EXPOSED ON ROTATING ARMS — SEVER ALL 3 CORES',
        enemyWaves: { hunter_drone: 2, phantom_interceptor: 1 },
        maxConcurrentHostiles: 7,
        triggerEvents: ['hyperspace_ambush'],
        advanceWhen: 'boss_phase_3',
      },
      {
        stageNumber: 4,
        label: 'Phase III · Collapse',
        headline: 'ALL 3 CORES DESTROYED — CONSTRUCT SHIELD COLLAPSED, FINISH NEXUS',
        enemyWaves: {},
        maxConcurrentHostiles: 6,
        advanceWhen: 'boss_defeated',
      },
    ],
    capitalShipOverride: { name: 'Void Harvester Construct', shipClass: 'heavy_dreadnought' },
    requiredSubsystems: 5,
    legendaryPilotId: null,
    parTimeSec: 310,
    gradeThresholds: { B: 5400, A: 7600, S: 10200 },
    rewards: { salvage: 360, supplies: 115, intel: 95, fleetReadiness: 10, credits: 1200, baseXp: 1800 },
  },
  {
    id: 'ext_l10',
    campaignTrack: 'extinction',
    operationId: EXTINCTION_OPERATION_ID,
    operationNumber: 10,
    levelIndexInOp: 10,
    globalLevelNumber: 10,
    extinctionNumber: 10,
    code: 'EXT · LVL 10',
    name: 'The Sovereign',
    subtitle: 'Campaign Finale: Destroy The Sovereign Mothership & outrun its 10-step collapse',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'FINALE · THE SOVEREIGN',
    briefing:
      'EXTINCTION FINALE: The Sovereign Omega Mothership awakens inside an Orbital Kill Zone. Break The Armada vanguard, survive The Sovereign Awakens broadsides & EW screen, pierce The Exposed Core, and survive its catastrophic 10-step collapse.',
    primaryObjectiveText: 'Destroy The Sovereign across all 3 phases & complete finale',
    optionalObjectiveText: 'Achieve a x8 combat combo streak in the final battle',
    optionalObjectiveKind: 'combo_reach',
    optionalObjectiveTarget: 8,
    enemyIntel: 'FINAL BOSS: The Sovereign Omega + Orbital Kill Zone + Full Alien Armada',
    threatLevel: 'boss',
    isBossLevel: true,
    isFinalExtinctionMission: true,
    bossId: 'sovereign_extinction',
    bossKind: 'major_boss',
    bossTitle: 'THE SOVEREIGN · EXTINCTION OMEGA',
    estimatedMinutes: '8–12 min',
    successConditionText: 'Destroy The Sovereign Exposed Core and survive finale collapse',
    failureConditionText: 'Player spacecraft destroyed',
    events: ['orbital_kill_zone', 'hyperspace_ambush', 'emergency_extraction'],
    enemyMix: { interceptor: 3, bomber: 2, heavy_fighter: 2, medium_warship: 1, elite_ace: 1 },
    extinctionEnemyMix: {
      interceptor: 3,
      bomber: 2,
      heavy_fighter: 2,
      medium_warship: 1,
      disruptor_ship: 1,
      phantom_interceptor: 2,
    },
    battleStages: [
      {
        stageNumber: 1,
        label: 'Stage I · Outer Armada Vanguard',
        headline: 'BREACH OUTER ARMADA SCREEN TO SUMMON THE SOVEREIGN OMEGA',
        enemyWaves: { interceptor: 3, bomber: 1, disruptor_ship: 1 },
        maxConcurrentHostiles: 6,
        spawnBossOnEnter: false,
        triggerEvents: ['orbital_kill_zone'],
        advanceWhen: 'stage_cleared',
      },
      {
        stageNumber: 2,
        label: 'Phase I · The Armada',
        headline: 'FINAL BOSS ARRIVING — THE SOVEREIGN OMEGA ENTERING BATTLEFIELD',
        enemyWaves: { interceptor: 2 },
        maxConcurrentHostiles: 7,
        spawnBossOnEnter: true,
        advanceWhen: 'boss_phase_2',
      },
      {
        stageNumber: 3,
        label: 'Phase II · The Sovereign Awakens',
        headline: 'PHASE II: THE SOVEREIGN AWAKENS — SUBSYSTEMS VULNERABLE',
        enemyWaves: { heavy_fighter: 2, phantom_interceptor: 1 },
        maxConcurrentHostiles: 8,
        triggerEvents: ['hyperspace_ambush'],
        advanceWhen: 'boss_phase_3',
      },
      {
        stageNumber: 4,
        label: 'Phase III · The Exposed Core',
        headline: 'PHASE III: CORE EXPOSED — OBLITERATE SOVEREIGN CITADEL REACTOR',
        enemyWaves: {},
        maxConcurrentHostiles: 6,
        advanceWhen: 'boss_defeated',
      },
    ],
    capitalShipOverride: { name: 'The Sovereign Omega', shipClass: 'sovereign_flagship' },
    requiredSubsystems: 5,
    legendaryPilotId: null,
    parTimeSec: 360,
    gradeThresholds: { B: 6000, A: 8600, S: 11500 },
    rewards: { salvage: 500, supplies: 150, intel: 120, fleetReadiness: 15, credits: 1650, baseXp: 2500 },
  },
];

export function getExtinctionLevelById(id: string): ExtinctionLevelDef | null {
  return EXTINCTION_LEVELS.find((l) => l.id === id) ?? null;
}

export function getNextExtinctionLevel(id: string): ExtinctionLevelDef | null {
  const idx = EXTINCTION_LEVELS.findIndex((l) => l.id === id);
  if (idx < 0 || idx + 1 >= EXTINCTION_LEVELS.length) return null;
  return EXTINCTION_LEVELS[idx + 1];
}

export function isExtinctionLevelUnlocked(params: {
  levelId: string;
  completedLevelIds: string[];
  unlockedLevelIds?: string[];
}): boolean {
  const lvl = getExtinctionLevelById(params.levelId);
  if (!lvl) return false;
  if (lvl.extinctionNumber === 1) return true;
  if (params.unlockedLevelIds?.includes(lvl.id)) return true;
  if (params.completedLevelIds.includes(lvl.id)) return true;
  const prev = EXTINCTION_LEVELS[lvl.extinctionNumber - 2];
  return prev ? params.completedLevelIds.includes(prev.id) : true;
}

export function computeUnlockedExtinctionLevelIds(params: {
  completedLevelIds: string[];
  existingUnlockedLevelIds?: string[];
}): string[] {
  const unlocked: string[] = [];
  for (const lvl of EXTINCTION_LEVELS) {
    if (
      isExtinctionLevelUnlocked({
        levelId: lvl.id,
        completedLevelIds: params.completedLevelIds,
        unlockedLevelIds: params.existingUnlockedLevelIds,
      })
    ) {
      unlocked.push(lvl.id);
    }
  }
  return unlocked;
}

export function createInitialExtinctionState(): ExtinctionCampaignState {
  return {
    unlockedLevelIds: ['ext_l01'],
    completedLevelIds: [],
    claimedRewardLevelIds: [],
    currentLevelId: 'ext_l01',
    levelRecords: {},
    defeatedBossIds: [],
    extinctionCompleted: false,
    extinctionMedals: [],
    stats: {
      totalKills: 0,
      bossesDefeated: 0,
      playTimeSec: 0,
    },
  };
}

export function normalizeExtinctionState(
  raw?: Partial<ExtinctionCampaignState> | null,
): ExtinctionCampaignState {
  const base = createInitialExtinctionState();
  if (!raw || typeof raw !== 'object') return base;

  const validLevelSet = new Set(EXTINCTION_LEVELS.map((l) => l.id));
  const validBossSet = new Set<ExtinctionBossId>([
    'executioner',
    'carrier_warden',
    'siege_breaker',
    'iron_revenant',
    'void_harvester',
    'sovereign_extinction',
  ]);

  const completedLevelIds = Array.isArray(raw.completedLevelIds)
    ? Array.from(new Set(raw.completedLevelIds.filter((id) => validLevelSet.has(id))))
    : [];
  const claimedRewardLevelIds = Array.isArray(raw.claimedRewardLevelIds)
    ? Array.from(
        new Set([
          ...raw.claimedRewardLevelIds.filter((id) => validLevelSet.has(id)),
          ...completedLevelIds,
        ]),
      )
    : [...completedLevelIds];
  const unlockedLevelIds = computeUnlockedExtinctionLevelIds({
    completedLevelIds,
    existingUnlockedLevelIds: Array.isArray(raw.unlockedLevelIds)
      ? raw.unlockedLevelIds.filter((id) => validLevelSet.has(id))
      : undefined,
  });
  const currentLevelId =
    typeof raw.currentLevelId === 'string' && validLevelSet.has(raw.currentLevelId)
      ? raw.currentLevelId
      : 'ext_l01';
  const defeatedBossIds = Array.isArray(raw.defeatedBossIds)
    ? Array.from(new Set(raw.defeatedBossIds.filter((b): b is ExtinctionBossId => validBossSet.has(b))))
    : [];

  return {
    unlockedLevelIds,
    completedLevelIds,
    claimedRewardLevelIds,
    currentLevelId,
    levelRecords:
      raw.levelRecords && typeof raw.levelRecords === 'object' ? { ...raw.levelRecords } : {},
    defeatedBossIds,
    extinctionCompleted: Boolean(raw.extinctionCompleted || completedLevelIds.includes('ext_l10')),
    extinctionMedals: Array.isArray(raw.extinctionMedals)
      ? Array.from(new Set(raw.extinctionMedals.filter((m) => typeof m === 'string')))
      : [],
    stats: {
      totalKills: Math.max(0, Math.round(Number(raw.stats?.totalKills ?? 0))),
      bossesDefeated: Math.max(0, Math.round(Number(raw.stats?.bossesDefeated ?? defeatedBossIds.length))),
      playTimeSec: Math.max(0, Math.round(Number(raw.stats?.playTimeSec ?? 0))),
    },
  };
}

export function validateExtinctionCatalog(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (EXTINCTION_LEVELS.length !== 10) {
    errors.push(`Expected 10 Extinction levels, got ${EXTINCTION_LEVELS.length}`);
  }
  const seenIds = new Set<string>();
  const miniBosses = new Set<string>();
  const majorBosses = new Set<string>();

  for (let i = 0; i < EXTINCTION_LEVELS.length; i++) {
    const lvl = EXTINCTION_LEVELS[i];
    if (seenIds.has(lvl.id)) errors.push(`Duplicate id ${lvl.id}`);
    seenIds.add(lvl.id);
    if (lvl.extinctionNumber !== i + 1) errors.push(`${lvl.id} has mismatched extinctionNumber`);
    if (lvl.battleStages.length === 0) errors.push(`${lvl.id} must have >= 1 battle stage`);
    for (const st of lvl.battleStages) {
      if (st.maxConcurrentHostiles > 14 || st.maxConcurrentHostiles <= 0) {
        errors.push(`${lvl.id} stage ${st.stageNumber} maxConcurrentHostiles out of bounds`);
      }
    }
    if (lvl.bossKind === 'mini_boss' && lvl.bossId) miniBosses.add(lvl.bossId);
    if (lvl.bossKind === 'major_boss' && lvl.bossId) majorBosses.add(lvl.bossId);
  }

  if (miniBosses.size !== 3) errors.push(`Expected 3 unique mini-bosses, found ${miniBosses.size}`);
  if (majorBosses.size !== 3) errors.push(`Expected 3 unique major bosses, found ${majorBosses.size}`);
  if (!EXTINCTION_LEVELS[9]?.isFinalExtinctionMission) {
    errors.push('L10 must be flagged as isFinalExtinctionMission');
  }
  return { valid: errors.length === 0, errors };
}

export function evaluateExtinctionEnding(extinction: ExtinctionCampaignState): {
  outcomeTitle: string;
  tier: 'mythic_apex' | 'vanguard_triumph' | 'hard_fought_survival';
  epilogue: string;
  statsSummary: {
    levelsCleared: number;
    bossesDefeated: number;
    sGrades: number;
    aGrades: number;
  };
} {
  const records = Object.values(extinction.levelRecords);
  const sGrades = records.filter((r) => r.bestGrade === 'S').length;
  const aGrades = records.filter((r) => r.bestGrade === 'A' || r.bestGrade === 'S').length;
  const cleared = extinction.completedLevelIds.length;
  const bosses = extinction.defeatedBossIds.length;

  if (sGrades >= 5 && bosses >= 6) {
    return {
      outcomeTitle: 'EXTINCTION PROTOCOL: TOTAL ANNIHILATION OF THE SOVEREIGN ARMADA',
      tier: 'mythic_apex',
      epilogue:
        'You shattered The Executioner, burned the Carrier Warden and Siege Breaker, dismantled Iron Revenant and Void Harvester core-by-core, and obliterated The Sovereign Omega before a single planet fell. Aether Prime enters a new golden era under your wing.',
      statsSummary: { levelsCleared: cleared, bossesDefeated: bosses, sGrades, aGrades },
    };
  }
  if (aGrades >= 4 || bosses >= 5) {
    return {
      outcomeTitle: 'EXTINCTION PROTOCOL: SOVEREIGN OMEGA SHATTERED',
      tier: 'vanguard_triumph',
      epilogue:
        'Against impossible odds — cloaked Phantoms, swarming Hunter packs, Disruptor electronic storms, and three mechanical colossi — Vanguard Squadron punched straight through The Sovereign core and saved the outer rim.',
      statsSummary: { levelsCleared: cleared, bossesDefeated: bosses, sGrades, aGrades },
    };
  }
  return {
    outcomeTitle: 'EXTINCTION PROTOCOL: DAWN BEYOND THE WRECKAGE',
    tier: 'hard_fought_survival',
    epilogue:
      'Scarred hulls and smoking reactors litter the Frontier, yet The Sovereign’s Omega core lies cold in the void. Every pilot who flew through Extinction bought humanity another century.',
    statsSummary: { levelsCleared: cleared, bossesDefeated: bosses, sGrades, aGrades },
  };
}

export function getExtinctionDifficultyLabel(_difficulty: DifficultyId): string {
  return 'EXTREME · EXTINCTION';
}

export function getExtinctionSpawnRegion(lvl: ExtinctionLevelDef): SpaceRegionId {
  return lvl.spaceRegionId;
}
