import type { CapitalShipStatus, EnemyFighterRole, SpaceRegionId } from './spacePhysics';
import type { DifficultyId } from './campaignConfig';

export type CapitalShipClass = CapitalShipStatus['shipClass'];

export type LevelObjectiveType =
  | 'interception'
  | 'survival'
  | 'escort'
  | 'pursuit'
  | 'assault'
  | 'ambush'
  | 'time_attack'
  | 'boss_encounter'
  | 'defence';

export type OptionalObjectiveKind =
  | 'accuracy'
  | 'hull_above'
  | 'time_under'
  | 'combo_reach'
  | 'subsystems_destroyed'
  | 'protect_hp'
  | 'no_repair_kits'
  | 'defeat_ace';

export type LevelThreatRating = 'low' | 'moderate' | 'high' | 'extreme' | 'boss';

export interface LevelRewardBundle {
  salvage: number;
  supplies: number;
  intel: number;
  fleetReadiness: number;
  credits: number;
  baseXp: number;
}

export interface CampaignLevelDef {
  id: string;
  operationId: string;
  operationNumber: number;
  levelIndexInOp: number;
  globalLevelNumber: number;
  code: string;
  name: string;
  subtitle: string;
  spaceRegionId: SpaceRegionId;
  objectiveType: LevelObjectiveType;
  objectiveBadge: string;
  briefing: string;
  primaryObjectiveText: string;
  optionalObjectiveText: string;
  optionalObjectiveKind: OptionalObjectiveKind;
  optionalObjectiveTarget: number;
  enemyIntel: string;
  threatLevel: LevelThreatRating;
  isBossLevel: boolean;
  estimatedMinutes: string;
  successConditionText: string;
  failureConditionText: string;
  /** Optional time limit in seconds (base normal difficulty; scaled fairly for story/hard/nightmare). */
  timeLimitSec?: number;
  /** Optional survival timer in seconds (for survival objectives). */
  survivalDurationSec?: number;
  /** Escort / defence protected unit parameters. */
  protectedEntityName?: string;
  protectedMaxHp?: number;
  /** Interception / pursuit escape window. */
  escapingTargetsCount?: number;
  escapeTimerSec?: number;
  /** Tailored enemy roster for this level (spawned cleanly across encounter zones). */
  enemyMix: Partial<Record<EnemyFighterRole, number>>;
  /** Optional capital warship override (null = explicitly no capital ship on this level). */
  capitalShipOverride: { name: string; shipClass: CapitalShipClass } | null;
  /** Optional legendary ace pilot id from LEGENDARY_PILOTS (ace_korrath | ace_valkyr | ace_drex | ace_veyron). */
  legendaryPilotId?: string | null;
  /** Minimum subsystems required on capital ship when not a full-destroy flagship boss. */
  requiredSubsystems?: number;
  /** Target par time in seconds for A/S pacing calculation. */
  parTimeSec: number;
  /** Composite score thresholds for grades B, A, S (C = completed). */
  gradeThresholds: { B: number; A: number; S: number };
  rewards: LevelRewardBundle;
}

/**
 * All 10 existing Operations (OP 01–OP 10) subdivided into 31 handcrafted,
 * tightly paced space-combat levels (OP 01 has 4 progressive introductory levels;
 * OP 02–OP 10 have 3 distinct levels each). Every level faithfully aligns with
 * its parent Operation's sector, narrative arc, capital ships, and legendary aces.
 */
export const CAMPAIGN_LEVELS: CampaignLevelDef[] = [
  // =========================================================================
  // OP 01 — THE FALL OF AETHER PRIME ORBIT (4 Progressive Opening Levels)
  // =========================================================================
  {
    id: 'op01_l1',
    operationId: 'm1_fall_of_aether_prime_orbit',
    operationNumber: 1,
    levelIndexInOp: 1,
    globalLevelNumber: 1,
    code: 'OP 01 · LVL 1',
    name: 'First Flight: Orbital Scramble',
    subtitle: 'Clear the vanguard scout wing over Aether Prime',
    spaceRegionId: 'low_orbit',
    objectiveType: 'interception',
    objectiveBadge: 'INTERCEPTION',
    briefing:
      'Orbital defense buoys are lighting up along the twilight terminator. Launch from CSV Aegis and intercept the lead Sovereign reconnaissance wing before they transmit Crown City’s evacuation vectors.',
    primaryObjectiveText: 'Eliminate the 5 Sovereign scouts & light interceptors',
    optionalObjectiveText: 'Achieve at least 45% weapon accuracy',
    optionalObjectiveKind: 'accuracy',
    optionalObjectiveTarget: 45,
    enemyIntel: '3x Recon Scouts, 2x Light Interceptors',
    threatLevel: 'low',
    isBossLevel: false,
    estimatedMinutes: '3–4 min',
    successConditionText: 'Destroy all 5 hostile scouts before they escape orbital relay range',
    failureConditionText: 'Player spacecraft destroyed or scout telemetry escapes',
    escapingTargetsCount: 2,
    escapeTimerSec: 210,
    enemyMix: { scout: 3, interceptor: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 120,
    gradeThresholds: { B: 1400, A: 2250, S: 3100 },
    rewards: { salvage: 50, supplies: 20, intel: 15, fleetReadiness: 3, credits: 140, baseXp: 240 },
  },
  {
    id: 'op01_l2',
    operationId: 'm1_fall_of_aether_prime_orbit',
    operationNumber: 1,
    levelIndexInOp: 2,
    globalLevelNumber: 2,
    code: 'OP 01 · LVL 2',
    name: 'Hostile Contact: Debris Lane',
    subtitle: 'Engage a flanking fighter squadron amid satellite wreckage',
    spaceRegionId: 'low_orbit',
    objectiveType: 'ambush',
    objectiveBadge: 'AMBUSH',
    briefing:
      'Sovereign strike craft are using broken orbital rings for cover. Close inside effective cannon range, lead your shots through turning dogfights, and neutralize their ambush wing.',
    primaryObjectiveText: 'Eliminate the flanking fighter ambush wing (6 craft)',
    optionalObjectiveText: 'Reach a x4 combat combo streak',
    optionalObjectiveKind: 'combo_reach',
    optionalObjectiveTarget: 4,
    enemyIntel: '4x Interceptors, 2x Armored Strikers',
    threatLevel: 'low',
    isBossLevel: false,
    estimatedMinutes: '3–5 min',
    successConditionText: 'Neutralize all 6 hostile fighters in the orbital corridor',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { interceptor: 4, heavy_fighter: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 135,
    gradeThresholds: { B: 1750, A: 2650, S: 3650 },
    rewards: { salvage: 55, supplies: 25, intel: 15, fleetReadiness: 3, credits: 165, baseXp: 280 },
  },
  {
    id: 'op01_l3',
    operationId: 'm1_fall_of_aether_prime_orbit',
    operationNumber: 1,
    levelIndexInOp: 3,
    globalLevelNumber: 3,
    code: 'OP 01 · LVL 3',
    name: 'Evacuation Shield',
    subtitle: 'Escort Evacuation Transport Helios-4 out of low orbit',
    spaceRegionId: 'low_orbit',
    objectiveType: 'escort',
    objectiveBadge: 'ESCORT',
    briefing:
      'Civilian evacuation transport Helios-4 is accelerating toward jump point Alpha. Sovereign bombers are lining up torpedo runs on its engines — intercept every strike craft until Helios-4 clears orbit.',
    primaryObjectiveText: 'Destroy enemy bombers & keep Helios-4 hull intact',
    optionalObjectiveText: 'Keep Helios-4 above 70% structural integrity',
    optionalObjectiveKind: 'protect_hp',
    optionalObjectiveTarget: 70,
    enemyIntel: '3x Interceptors, 3x Siege Bombers, 1x Armored Striker',
    threatLevel: 'moderate',
    isBossLevel: false,
    estimatedMinutes: '4–5 min',
    successConditionText: 'Eliminate all attackers while Helios-4 survives',
    failureConditionText: 'Player spacecraft or Transport Helios-4 destroyed',
    protectedEntityName: 'Transport Helios-4',
    protectedMaxHp: 460,
    enemyMix: { interceptor: 3, bomber: 3, heavy_fighter: 1 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 150,
    gradeThresholds: { B: 2100, A: 3100, S: 4200 },
    rewards: { salvage: 65, supplies: 30, intel: 20, fleetReadiness: 4, credits: 195, baseXp: 320 },
  },
  {
    id: 'op01_l4',
    operationId: 'm1_fall_of_aether_prime_orbit',
    operationNumber: 1,
    levelIndexInOp: 4,
    globalLevelNumber: 4,
    code: 'OP 01 · LVL 4',
    name: 'Vanguard Breakthrough',
    subtitle: 'Break the orbital picket & repel Sovereign Assault Corvette',
    spaceRegionId: 'low_orbit',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'ELITE DUEL',
    briefing:
      'A Sovereign Assault Corvette and its Elite Squadron Leader have dropped into low orbit to seal Crown City’s exit lane. Break their escort screen and shatter the corvette to secure Sector I.',
    primaryObjectiveText: 'Destroy the Assault Corvette & its escort flight',
    optionalObjectiveText: 'Finish with at least 70% hull integrity',
    optionalObjectiveKind: 'hull_above',
    optionalObjectiveTarget: 70,
    enemyIntel: '3x Interceptors, 2x Armored Strikers, 1x Elite Ace, 1x Assault Corvette',
    threatLevel: 'high',
    isBossLevel: true,
    estimatedMinutes: '5–6 min',
    successConditionText: 'Eliminate the Assault Corvette and all escorts',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { interceptor: 3, heavy_fighter: 2, elite_ace: 1, medium_warship: 1 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 175,
    gradeThresholds: { B: 2500, A: 3700, S: 4950 },
    rewards: { salvage: 90, supplies: 35, intel: 25, fleetReadiness: 6, credits: 260, baseXp: 420 },
  },

  // =========================================================================
  // OP 02 — BROKEN ORBIT (3 Levels — Low Orbit Defense Platform Alpha)
  // =========================================================================
  {
    id: 'op02_l1',
    operationId: 'm2_broken_orbit',
    operationNumber: 2,
    levelIndexInOp: 1,
    globalLevelNumber: 5,
    code: 'OP 02 · LVL 1',
    name: 'Torpedo Intercept',
    subtitle: 'Cut off Sovereign bomber wings racing toward Platform Alpha',
    spaceRegionId: 'low_orbit',
    objectiveType: 'pursuit',
    objectiveBadge: 'PURSUIT',
    briefing:
      'Sovereign bombers and fast recon spotters are streaking across upper orbit toward Defense Platform Alpha. Run them down before they paint the station’s shield grid.',
    primaryObjectiveText: 'Pursue and destroy the 6 inbound strike raiders',
    optionalObjectiveText: 'Clear the strike wave within 145 seconds',
    optionalObjectiveKind: 'time_under',
    optionalObjectiveTarget: 145,
    enemyIntel: '3x Recon Scouts, 3x Interceptors',
    threatLevel: 'moderate',
    isBossLevel: false,
    estimatedMinutes: '3–5 min',
    successConditionText: 'Eliminate all raiders before targeting data escapes',
    failureConditionText: 'Player spacecraft destroyed or scouts escape',
    escapingTargetsCount: 2,
    escapeTimerSec: 215,
    enemyMix: { scout: 3, interceptor: 3 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 145,
    gradeThresholds: { B: 2050, A: 3050, S: 4100 },
    rewards: { salvage: 70, supplies: 25, intel: 20, fleetReadiness: 3, credits: 210, baseXp: 340 },
  },
  {
    id: 'op02_l2',
    operationId: 'm2_broken_orbit',
    operationNumber: 2,
    levelIndexInOp: 2,
    globalLevelNumber: 6,
    code: 'OP 02 · LVL 2',
    name: 'Platform Alpha Hold',
    subtitle: 'Defend Orbital Defense Platform Alpha from bomber saturation',
    spaceRegionId: 'low_orbit',
    objectiveType: 'defence',
    objectiveBadge: 'DEFENCE',
    briefing:
      'Defense Platform Alpha’s main shields are rebooting! Screen the station against Sovereign bomber and interceptor waves until its point-defense grid recovers.',
    primaryObjectiveText: 'Protect Defense Platform Alpha & defeat attacking wings',
    optionalObjectiveText: 'Keep Platform Alpha above 75% integrity',
    optionalObjectiveKind: 'protect_hp',
    optionalObjectiveTarget: 75,
    enemyIntel: '3x Interceptors, 3x Siege Bombers, 2x Armored Strikers',
    threatLevel: 'moderate',
    isBossLevel: false,
    estimatedMinutes: '4–5 min',
    successConditionText: 'Eliminate all attackers while Platform Alpha survives',
    failureConditionText: 'Player spacecraft or Platform Alpha destroyed',
    protectedEntityName: 'Platform Alpha',
    protectedMaxHp: 520,
    enemyMix: { interceptor: 3, bomber: 3, heavy_fighter: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 160,
    gradeThresholds: { B: 2250, A: 3350, S: 4500 },
    rewards: { salvage: 75, supplies: 30, intel: 25, fleetReadiness: 4, credits: 235, baseXp: 380 },
  },
  {
    id: 'op02_l3',
    operationId: 'm2_broken_orbit',
    operationNumber: 2,
    levelIndexInOp: 3,
    globalLevelNumber: 7,
    code: 'OP 02 · LVL 3',
    name: 'Siege Frigate Vor-02',
    subtitle: 'Cripple Alien Siege Frigate Vor-02 & unlock B-7 Hammerhead',
    spaceRegionId: 'low_orbit',
    objectiveType: 'assault',
    objectiveBadge: 'CAPITAL ASSAULT',
    briefing:
      'Alien Siege Frigate Vor-02 has closed to orbital bombardment range. Strip its shields with EMP, hammer exposed subsystems with Rail Cannon or Heavy Plasma, and break the siege.',
    primaryObjectiveText: 'Neutralize Siege Frigate Vor-02 & escort flight',
    optionalObjectiveText: 'Destroy at least 3 capital ship subsystems',
    optionalObjectiveKind: 'subsystems_destroyed',
    optionalObjectiveTarget: 3,
    enemyIntel: 'Siege Frigate Vor-02 + 3x Interceptors, 2x Armored Strikers, 1x Corvette',
    threatLevel: 'high',
    isBossLevel: true,
    estimatedMinutes: '5–7 min',
    successConditionText: 'Cripple or destroy Frigate Vor-02 and clear escorts',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { interceptor: 3, heavy_fighter: 2, medium_warship: 1 },
    capitalShipOverride: { name: 'Alien Siege Frigate Vor-02', shipClass: 'frigate' },
    requiredSubsystems: 3,
    legendaryPilotId: null,
    parTimeSec: 205,
    gradeThresholds: { B: 2900, A: 4200, S: 5600 },
    rewards: { salvage: 110, supplies: 40, intel: 30, fleetReadiness: 6, credits: 320, baseXp: 510 },
  },

  // =========================================================================
  // OP 03 — THE LOST FLEET (3 Levels — Shattered Fleet)
  // =========================================================================
  {
    id: 'op03_l1',
    operationId: 'm3_the_lost_fleet',
    operationNumber: 3,
    levelIndexInOp: 1,
    globalLevelNumber: 8,
    code: 'OP 03 · LVL 1',
    name: 'Graveyard Signal',
    subtitle: 'Intercept Sovereign scavengers hunting Seventh Fleet life-pods',
    spaceRegionId: 'shattered_fleet',
    objectiveType: 'interception',
    objectiveBadge: 'INTERCEPTION',
    briefing:
      'Distress beacons are pinging inside the CSV Valiant wreckage field. Sovereign hunter-killers are systematically sweeping rescue pods — eliminate them before they zero the beacons.',
    primaryObjectiveText: 'Eliminate the 7 Sovereign hunter-killers',
    optionalObjectiveText: 'Achieve at least 50% weapon accuracy',
    optionalObjectiveKind: 'accuracy',
    optionalObjectiveTarget: 50,
    enemyIntel: '3x Interceptors, 2x Siege Bombers, 2x Recon Scouts',
    threatLevel: 'moderate',
    isBossLevel: false,
    estimatedMinutes: '4–5 min',
    successConditionText: 'Destroy all hunter-killers before beacon window ends',
    failureConditionText: 'Player spacecraft destroyed or scouts escape',
    escapingTargetsCount: 2,
    escapeTimerSec: 210,
    enemyMix: { interceptor: 3, bomber: 2, scout: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 150,
    gradeThresholds: { B: 2300, A: 3450, S: 4600 },
    rewards: { salvage: 80, supplies: 30, intel: 25, fleetReadiness: 4, credits: 245, baseXp: 400 },
  },
  {
    id: 'op03_l2',
    operationId: 'm3_the_lost_fleet',
    operationNumber: 3,
    levelIndexInOp: 2,
    globalLevelNumber: 9,
    code: 'OP 03 · LVL 2',
    name: 'Rescue Frigate Defiance',
    subtitle: 'Escort Rescue Frigate Defiance out of the hulk graveyard',
    spaceRegionId: 'shattered_fleet',
    objectiveType: 'escort',
    objectiveBadge: 'ESCORT',
    briefing:
      'Rescue Frigate Defiance has recovered Flight Lead Harlan’s stranded pilots, but Sovereign corvettes are closing fast. Protect Defiance until its jump drive engages.',
    primaryObjectiveText: 'Protect Rescue Frigate Defiance & defeat attacking wings',
    optionalObjectiveText: 'Keep Defiance above 75% hull integrity',
    optionalObjectiveKind: 'protect_hp',
    optionalObjectiveTarget: 75,
    enemyIntel: '3x Interceptors, 2x Armored Strikers, 2x Bombers, 1x Assault Corvette',
    threatLevel: 'high',
    isBossLevel: false,
    estimatedMinutes: '5–6 min',
    successConditionText: 'Eliminate all hostile wings while Defiance survives',
    failureConditionText: 'Player spacecraft or Rescue Frigate Defiance destroyed',
    protectedEntityName: 'Rescue Frigate Defiance',
    protectedMaxHp: 540,
    enemyMix: { interceptor: 3, heavy_fighter: 2, bomber: 2, medium_warship: 1 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 175,
    gradeThresholds: { B: 2650, A: 3900, S: 5250 },
    rewards: { salvage: 90, supplies: 35, intel: 25, fleetReadiness: 5, credits: 280, baseXp: 450 },
  },
  {
    id: 'op03_l3',
    operationId: 'm3_the_lost_fleet',
    operationNumber: 3,
    levelIndexInOp: 3,
    globalLevelNumber: 10,
    code: 'OP 03 · LVL 3',
    name: 'Wreckage Ambush Clearance',
    subtitle: 'Clear the elite graveyard guard & unlock SR-4 Specter',
    spaceRegionId: 'shattered_fleet',
    objectiveType: 'survival',
    objectiveBadge: 'SURVIVAL',
    briefing:
      'Our recovery shuttles are pulling encrypted Sovereign telemetry from CSV Valiant’s black box. Hold the sector for 95 seconds — or wipe out the elite scavenger fleet!',
    primaryObjectiveText: 'Survive 95s or destroy the entire elite scavenger group',
    optionalObjectiveText: 'Complete with at least 65% hull remaining',
    optionalObjectiveKind: 'hull_above',
    optionalObjectiveTarget: 65,
    enemyIntel: '3x Interceptors, 2x Armored Strikers, 1x Elite Ace, 1x Assault Corvette',
    threatLevel: 'high',
    isBossLevel: true,
    estimatedMinutes: '5–6 min',
    successConditionText: 'Survive 95 seconds or eliminate all hostiles',
    failureConditionText: 'Player spacecraft destroyed',
    survivalDurationSec: 95,
    enemyMix: { interceptor: 3, heavy_fighter: 2, elite_ace: 1, medium_warship: 1 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 155,
    gradeThresholds: { B: 2950, A: 4300, S: 5750 },
    rewards: { salvage: 115, supplies: 40, intel: 35, fleetReadiness: 7, credits: 340, baseXp: 540 },
  },

  // =========================================================================
  // OP 04 — INTO THE DEBRIS BELT (3 Levels — Debris Belt + Korrath "Iron Fang")
  // =========================================================================
  {
    id: 'op04_l1',
    operationId: 'm4_into_the_debris_belt',
    operationNumber: 4,
    levelIndexInOp: 1,
    globalLevelNumber: 11,
    code: 'OP 04 · LVL 1',
    name: 'Silent Sweeper',
    subtitle: 'Time-critical strike against Sovereign sensor relays in the belt',
    spaceRegionId: 'debris_belt',
    objectiveType: 'time_attack',
    objectiveBadge: 'TIME ATTACK',
    briefing:
      'Sovereign recon patrols are mapping our hidden fleet muster from inside the Deep Asteroid Belt. Blitz through the rotating canyons and silence all 7 craft before the burst transmits.',
    primaryObjectiveText: 'Destroy all 7 recon patrols before the timer expires',
    optionalObjectiveText: 'Complete in under 135 seconds',
    optionalObjectiveKind: 'time_under',
    optionalObjectiveTarget: 135,
    enemyIntel: '4x Recon Scouts, 3x Interceptors',
    threatLevel: 'moderate',
    isBossLevel: false,
    estimatedMinutes: '3–4 min',
    successConditionText: 'Eliminate all 7 patrols before countdown hits zero',
    failureConditionText: 'Player spacecraft destroyed or time limit expired',
    timeLimitSec: 185,
    enemyMix: { scout: 4, interceptor: 3 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 130,
    gradeThresholds: { B: 2450, A: 3600, S: 4850 },
    rewards: { salvage: 85, supplies: 30, intel: 35, fleetReadiness: 4, credits: 265, baseXp: 430 },
  },
  {
    id: 'op04_l2',
    operationId: 'm4_into_the_debris_belt',
    operationNumber: 4,
    levelIndexInOp: 2,
    globalLevelNumber: 12,
    code: 'OP 04 · LVL 2',
    name: 'Canyon Crossfire',
    subtitle: 'Outmaneuver a coordinated heavy ambush in high-density rock',
    spaceRegionId: 'debris_belt',
    objectiveType: 'ambush',
    objectiveBadge: 'AMBUSH',
    briefing:
      'Sensors tripped a Sovereign kill-box! Heavy strikers and corvettes are closing from three vertical vectors. Use lateral boost rolls and asteroid shadows to dismantle them piece by piece.',
    primaryObjectiveText: 'Survive and eliminate the 8-craft ambush force',
    optionalObjectiveText: 'Reach a x5 combat combo streak',
    optionalObjectiveKind: 'combo_reach',
    optionalObjectiveTarget: 5,
    enemyIntel: '3x Interceptors, 3x Armored Strikers, 1x Bomber, 1x Assault Corvette',
    threatLevel: 'high',
    isBossLevel: false,
    estimatedMinutes: '4–6 min',
    successConditionText: 'Destroy every hostile craft in the ambush',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { interceptor: 3, heavy_fighter: 3, bomber: 1, medium_warship: 1 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 170,
    gradeThresholds: { B: 2700, A: 3950, S: 5300 },
    rewards: { salvage: 95, supplies: 35, intel: 35, fleetReadiness: 5, credits: 295, baseXp: 470 },
  },
  {
    id: 'op04_l3',
    operationId: 'm4_into_the_debris_belt',
    operationNumber: 4,
    levelIndexInOp: 3,
    globalLevelNumber: 13,
    code: 'OP 04 · LVL 3',
    name: 'Iron Fang Showdown',
    subtitle: 'Duel Legendary Ace Commander Korrath "Iron Fang"',
    spaceRegionId: 'debris_belt',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'ACE BOSS',
    briefing:
      'Belt Ambush Commander Korrath "Iron Fang" has entered the canyons personally. Expect aggressive flanking, decoy flares, and a Phase II overdrive burst through the boulders.',
    primaryObjectiveText: 'Defeat Legendary Ace Commander Korrath & escort flight',
    optionalObjectiveText: 'Finish the ace duel with at least 65% hull remaining',
    optionalObjectiveKind: 'hull_above',
    optionalObjectiveTarget: 65,
    enemyIntel: 'LEGENDARY ACE CMDR. KORRATH "IRON FANG" + 3x Interceptors, 2x Armored Strikers',
    threatLevel: 'boss',
    isBossLevel: true,
    estimatedMinutes: '5–7 min',
    successConditionText: 'Defeat Commander Korrath and clear his escort flight',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { interceptor: 3, heavy_fighter: 2 },
    capitalShipOverride: null,
    legendaryPilotId: 'ace_korrath',
    parTimeSec: 195,
    gradeThresholds: { B: 3100, A: 4550, S: 6100 },
    rewards: { salvage: 130, supplies: 40, intel: 45, fleetReadiness: 7, credits: 380, baseXp: 600 },
  },

  // =========================================================================
  // OP 05 — THE SHATTERED ARMADA (3 Levels — Shattered Fleet + Vex-04)
  // =========================================================================
  {
    id: 'op05_l1',
    operationId: 'm5_the_shattered_armada',
    operationNumber: 5,
    levelIndexInOp: 1,
    globalLevelNumber: 14,
    code: 'OP 05 · LVL 1',
    name: 'Convoy Gauntlet',
    subtitle: 'Escort Munitions Convoy Orion-9 to CSV Aegis',
    spaceRegionId: 'shattered_fleet',
    objectiveType: 'escort',
    objectiveBadge: 'ESCORT',
    briefing:
      'Heavy Freighter Orion-9 carries Rail Cannon capacitors critical for CSV Aegis’s counter-offensive. Screen its flanks against Sovereign bomber wings.',
    primaryObjectiveText: 'Protect Freighter Orion-9 & destroy hostile strike wings',
    optionalObjectiveText: 'Keep Freighter Orion-9 above 75% hull integrity',
    optionalObjectiveKind: 'protect_hp',
    optionalObjectiveTarget: 75,
    enemyIntel: '3x Bombers, 3x Interceptors, 2x Armored Strikers',
    threatLevel: 'high',
    isBossLevel: false,
    estimatedMinutes: '5–6 min',
    successConditionText: 'Clear all enemy strike craft while Orion-9 survives',
    failureConditionText: 'Player spacecraft or Freighter Orion-9 destroyed',
    protectedEntityName: 'Freighter Orion-9',
    protectedMaxHp: 560,
    enemyMix: { bomber: 3, interceptor: 3, heavy_fighter: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 175,
    gradeThresholds: { B: 2800, A: 4100, S: 5500 },
    rewards: { salvage: 100, supplies: 45, intel: 25, fleetReadiness: 5, credits: 310, baseXp: 490 },
  },
  {
    id: 'op05_l2',
    operationId: 'm5_the_shattered_armada',
    operationNumber: 5,
    levelIndexInOp: 2,
    globalLevelNumber: 15,
    code: 'OP 05 · LVL 2',
    name: 'Deadlock Drift',
    subtitle: 'Endure a three-angle encirclement while CSV Aegis repositions',
    spaceRegionId: 'shattered_fleet',
    objectiveType: 'survival',
    objectiveBadge: 'SURVIVAL',
    briefing:
      'Sovereign interceptors and elite aces have pinned Vanguard Squadron in the wreckage lane. Stay mobile, manage your weapon heat, and hold for 105 seconds until CSV Aegis opens broadsides.',
    primaryObjectiveText: 'Survive Sovereign encirclement for 105s or wipe the pack',
    optionalObjectiveText: 'Complete without using a repair kit',
    optionalObjectiveKind: 'no_repair_kits',
    optionalObjectiveTarget: 0,
    enemyIntel: '4x Interceptors, 2x Armored Strikers, 2x Elite Aces',
    threatLevel: 'high',
    isBossLevel: false,
    estimatedMinutes: '4–6 min',
    successConditionText: 'Survive 105 seconds or eliminate all ambush craft',
    failureConditionText: 'Player spacecraft destroyed',
    survivalDurationSec: 105,
    enemyMix: { interceptor: 4, heavy_fighter: 2, elite_ace: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 125,
    gradeThresholds: { B: 2950, A: 4300, S: 5750 },
    rewards: { salvage: 105, supplies: 40, intel: 30, fleetReadiness: 5, credits: 330, baseXp: 520 },
  },
  {
    id: 'op05_l3',
    operationId: 'm5_the_shattered_armada',
    operationNumber: 5,
    levelIndexInOp: 3,
    globalLevelNumber: 16,
    code: 'OP 05 · LVL 3',
    name: 'Cruiser Vex-04 Reckoning',
    subtitle: 'Shatter Alien Assault Cruiser Vex-04 & its bomber armada',
    spaceRegionId: 'shattered_fleet',
    objectiveType: 'assault',
    objectiveBadge: 'CAPITAL ASSAULT',
    briefing:
      'Alien Assault Cruiser Vex-04 is launching bomber waves straight at CSV Aegis. Destroy its Hangar Bay first to halt reinforcements, then tear down its shield grid and command hull.',
    primaryObjectiveText: 'Neutralize Assault Cruiser Vex-04 & escorts',
    optionalObjectiveText: 'Destroy at least 4 capital ship subsystems',
    optionalObjectiveKind: 'subsystems_destroyed',
    optionalObjectiveTarget: 4,
    enemyIntel: 'Assault Cruiser Vex-04 + 3x Interceptors, 2x Bombers, 1x Corvette',
    threatLevel: 'high',
    isBossLevel: true,
    estimatedMinutes: '6–7 min',
    successConditionText: 'Neutralize Assault Cruiser Vex-04 and clear escorts',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { interceptor: 3, bomber: 2, medium_warship: 1 },
    capitalShipOverride: { name: 'Alien Assault Cruiser Vex-04', shipClass: 'assault_cruiser' },
    requiredSubsystems: 3,
    legendaryPilotId: null,
    parTimeSec: 230,
    gradeThresholds: { B: 3450, A: 5000, S: 6650 },
    rewards: { salvage: 135, supplies: 50, intel: 35, fleetReadiness: 7, credits: 410, baseXp: 640 },
  },

  // =========================================================================
  // OP 06 — THE HIDDEN INSTALLATION (3 Levels — Outer Frontier + Valkyr-Null)
  // =========================================================================
  {
    id: 'op06_l1',
    operationId: 'm6_the_hidden_installation',
    operationNumber: 6,
    levelIndexInOp: 1,
    globalLevelNumber: 17,
    code: 'OP 06 · LVL 1',
    name: 'Perimeter Breach',
    subtitle: 'Blitz the cloaked Outer Frontier picket before alarm relays sync',
    spaceRegionId: 'outer_frontier',
    objectiveType: 'time_attack',
    objectiveBadge: 'TIME ATTACK',
    briefing:
      'Deep in the Outer Frontier, we have locked onto the Sovereign hidden relay network. Punch through the outer sentry ring in under 190 seconds before they purge prototype telemetry.',
    primaryObjectiveText: 'Eliminate all 8 perimeter sentries before countdown expires',
    optionalObjectiveText: 'Achieve at least 52% weapon accuracy',
    optionalObjectiveKind: 'accuracy',
    optionalObjectiveTarget: 52,
    enemyIntel: '3x Recon Scouts, 3x Armored Strikers, 2x Interceptors',
    threatLevel: 'high',
    isBossLevel: false,
    estimatedMinutes: '4–5 min',
    successConditionText: 'Destroy all 8 sentries before time limit expires',
    failureConditionText: 'Player spacecraft destroyed or time limit expired',
    timeLimitSec: 190,
    enemyMix: { scout: 3, heavy_fighter: 3, interceptor: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 145,
    gradeThresholds: { B: 2850, A: 4200, S: 5600 },
    rewards: { salvage: 105, supplies: 35, intel: 45, fleetReadiness: 5, credits: 340, baseXp: 540 },
  },
  {
    id: 'op06_l2',
    operationId: 'm6_the_hidden_installation',
    operationNumber: 6,
    levelIndexInOp: 2,
    globalLevelNumber: 18,
    code: 'OP 06 · LVL 2',
    name: 'Relay Courier Sweep',
    subtitle: 'Intercept fleeing data couriers across open deep space',
    spaceRegionId: 'outer_frontier',
    objectiveType: 'pursuit',
    objectiveBadge: 'PURSUIT',
    briefing:
      'Three armored data couriers just launched from the hidden installation! Catch them with Boost and disciplined Rail/Pulse bursts before they clear hyperspace range.',
    primaryObjectiveText: 'Intercept & destroy all 8 couriers and elite guards',
    optionalObjectiveText: 'Reach a x6 combat combo streak',
    optionalObjectiveKind: 'combo_reach',
    optionalObjectiveTarget: 6,
    enemyIntel: '3x Recon Scouts, 3x Interceptors, 2x Elite Aces',
    threatLevel: 'high',
    isBossLevel: false,
    estimatedMinutes: '4–6 min',
    successConditionText: 'Eliminate all couriers and escorts before escape window ends',
    failureConditionText: 'Player spacecraft destroyed or couriers escape',
    escapingTargetsCount: 3,
    escapeTimerSec: 210,
    enemyMix: { scout: 3, interceptor: 3, elite_ace: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 165,
    gradeThresholds: { B: 3050, A: 4450, S: 5950 },
    rewards: { salvage: 115, supplies: 40, intel: 50, fleetReadiness: 5, credits: 370, baseXp: 580 },
  },
  {
    id: 'op06_l3',
    operationId: 'm6_the_hidden_installation',
    operationNumber: 6,
    levelIndexInOp: 3,
    globalLevelNumber: 19,
    code: 'OP 06 · LVL 3',
    name: 'Phantom Signal & Patrol Cruiser Kar-09',
    subtitle: 'Defeat Ace Valkyr-Null & Patrol Cruiser Kar-09 (Unlocks X-01)',
    spaceRegionId: 'outer_frontier',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'ACE & WARSHIP',
    briefing:
      'Stealth Ace Valkyr-Null "Phantom Signal" is guarding Alien Patrol Cruiser Kar-09. Defeat Valkyr-Null and cripple Kar-09 to unlock the X-01 Sovereign Bane prototype!',
    primaryObjectiveText: 'Defeat Ace Valkyr-Null & Patrol Cruiser Kar-09',
    optionalObjectiveText: 'Finish with at least 60% hull integrity',
    optionalObjectiveKind: 'hull_above',
    optionalObjectiveTarget: 60,
    enemyIntel: 'LEGENDARY ACE VALKYR-NULL + Patrol Cruiser Kar-09 + 4x Escorts',
    threatLevel: 'boss',
    isBossLevel: true,
    estimatedMinutes: '6–8 min',
    successConditionText: 'Defeat Valkyr-Null, neutralize Cruiser Kar-09, and clear escorts',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { interceptor: 2, heavy_fighter: 2 },
    capitalShipOverride: { name: 'Alien Patrol Cruiser Kar-09', shipClass: 'assault_cruiser' },
    requiredSubsystems: 3,
    legendaryPilotId: 'ace_valkyr',
    parTimeSec: 245,
    gradeThresholds: { B: 3800, A: 5500, S: 7300 },
    rewards: { salvage: 150, supplies: 50, intel: 60, fleetReadiness: 8, credits: 460, baseXp: 720 },
  },

  // =========================================================================
  // OP 07 — COUNTERSTRIKE (3 Levels — Debris Belt + Bastion Destroyer Kael-7)
  // =========================================================================
  {
    id: 'op07_l1',
    operationId: 'm7_counterstrike',
    operationNumber: 7,
    levelIndexInOp: 1,
    globalLevelNumber: 20,
    code: 'OP 07 · LVL 1',
    name: 'Spearhead Charge',
    subtitle: 'Smash the forward corvette line in the Deep Asteroid Belt',
    spaceRegionId: 'debris_belt',
    objectiveType: 'interception',
    objectiveBadge: 'FLEET CLASH',
    briefing:
      'The rebuilt Vanguard Fleet is launching its counterstrike at full burn! Punch a breach through the Sovereign twin-corvette screen so our carriers can jump through.',
    primaryObjectiveText: 'Destroy the 2 Sovereign Corvettes & 6 escorts',
    optionalObjectiveText: 'Clear the breach in under 165 seconds',
    optionalObjectiveKind: 'time_under',
    optionalObjectiveTarget: 165,
    enemyIntel: '2x Assault Corvettes, 4x Interceptors, 2x Armored Strikers',
    threatLevel: 'high',
    isBossLevel: false,
    estimatedMinutes: '5–6 min',
    successConditionText: 'Destroy both corvettes and all escorts',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { medium_warship: 2, interceptor: 4, heavy_fighter: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 170,
    gradeThresholds: { B: 3150, A: 4600, S: 6150 },
    rewards: { salvage: 120, supplies: 45, intel: 35, fleetReadiness: 6, credits: 390, baseXp: 610 },
  },
  {
    id: 'op07_l2',
    operationId: 'm7_counterstrike',
    operationNumber: 7,
    levelIndexInOp: 2,
    globalLevelNumber: 21,
    code: 'OP 07 · LVL 2',
    name: 'Carrier Bulwark',
    subtitle: 'Defend Allied Command Carrier Aegis from bomber saturation runs',
    spaceRegionId: 'debris_belt',
    objectiveType: 'defence',
    objectiveBadge: 'DEFENCE',
    briefing:
      'Sovereign torpedo wings are diving straight at Carrier Aegis’s flight deck! Intercept bombers before release range and coordinate Vanguard Wing with [F1–F4].',
    primaryObjectiveText: 'Protect Carrier Aegis & eliminate attacking bomber squadrons',
    optionalObjectiveText: 'Keep Carrier Aegis above 75% hull integrity',
    optionalObjectiveKind: 'protect_hp',
    optionalObjectiveTarget: 75,
    enemyIntel: '4x Siege Bombers, 3x Interceptors, 2x Elite Aces',
    threatLevel: 'extreme',
    isBossLevel: false,
    estimatedMinutes: '5–6 min',
    successConditionText: 'Eliminate all attackers while Carrier Aegis survives',
    failureConditionText: 'Player spacecraft or Carrier Aegis destroyed',
    protectedEntityName: 'Carrier Aegis',
    protectedMaxHp: 620,
    enemyMix: { bomber: 4, interceptor: 3, elite_ace: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 185,
    gradeThresholds: { B: 3350, A: 4850, S: 6500 },
    rewards: { salvage: 125, supplies: 50, intel: 40, fleetReadiness: 6, credits: 420, baseXp: 650 },
  },
  {
    id: 'op07_l3',
    operationId: 'm7_counterstrike',
    operationNumber: 7,
    levelIndexInOp: 3,
    globalLevelNumber: 22,
    code: 'OP 07 · LVL 3',
    name: 'Bastion Destroyer Kael-7',
    subtitle: 'Shatter Sovereign Logistics Destroyer Kael-7 to open Sector V',
    spaceRegionId: 'debris_belt',
    objectiveType: 'assault',
    objectiveBadge: 'CAPITAL ASSAULT',
    briefing:
      'Bastion Destroyer Kael-7 anchors the Sovereign supply line through the Deep Asteroid Belt. Snipe its Shield Generator and Weapons Array from rock cover to clear the jump corridor.',
    primaryObjectiveText: 'Neutralize Bastion Destroyer Kael-7 & battle group',
    optionalObjectiveText: 'Complete without using a repair kit',
    optionalObjectiveKind: 'no_repair_kits',
    optionalObjectiveTarget: 0,
    enemyIntel: 'Bastion Destroyer Kael-7 + 3x Interceptors, 2x Armored Strikers, 1x Corvette',
    threatLevel: 'extreme',
    isBossLevel: true,
    estimatedMinutes: '6–8 min',
    successConditionText: 'Neutralize Bastion Destroyer Kael-7 and clear escorts',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { interceptor: 3, heavy_fighter: 2, medium_warship: 1 },
    capitalShipOverride: { name: 'Alien Bastion Destroyer Kael-7', shipClass: 'assault_cruiser' },
    requiredSubsystems: 3,
    legendaryPilotId: null,
    parTimeSec: 245,
    gradeThresholds: { B: 3900, A: 5650, S: 7500 },
    rewards: { salvage: 155, supplies: 55, intel: 45, fleetReadiness: 8, credits: 490, baseXp: 760 },
  },

  // =========================================================================
  // OP 08 — THE SOVEREIGN'S FRONTIER (3 Levels — Defense Zone + Archon Drex)
  // =========================================================================
  {
    id: 'op08_l1',
    operationId: 'm8_sovereigns_frontier',
    operationNumber: 8,
    levelIndexInOp: 1,
    globalLevelNumber: 23,
    code: 'OP 08 · LVL 1',
    name: 'Redline Entry',
    subtitle: 'Run the outer Sovereign defense perimeter against the clock',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'time_attack',
    objectiveBadge: 'TIME ATTACK',
    briefing:
      'Entering Sector V — The Sovereign’s Defence Zone. We have a 200-second sensor gap before orbital batteries recalibrate. Punch clean through their interceptor barrier.',
    primaryObjectiveText: 'Clear the 9-craft defense picket before timer expires',
    optionalObjectiveText: 'Reach a x6 combat combo streak',
    optionalObjectiveKind: 'combo_reach',
    optionalObjectiveTarget: 6,
    enemyIntel: '4x Interceptors, 3x Armored Strikers, 2x Elite Aces',
    threatLevel: 'extreme',
    isBossLevel: false,
    estimatedMinutes: '4–6 min',
    successConditionText: 'Destroy all 9 perimeter defenders before time limit expires',
    failureConditionText: 'Player spacecraft destroyed or time limit expired',
    timeLimitSec: 200,
    enemyMix: { interceptor: 4, heavy_fighter: 3, elite_ace: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 155,
    gradeThresholds: { B: 3300, A: 4800, S: 6400 },
    rewards: { salvage: 130, supplies: 45, intel: 45, fleetReadiness: 6, credits: 440, baseXp: 680 },
  },
  {
    id: 'op08_l2',
    operationId: 'm8_sovereigns_frontier',
    operationNumber: 8,
    levelIndexInOp: 2,
    globalLevelNumber: 24,
    code: 'OP 08 · LVL 2',
    name: 'Blockade Crucible',
    subtitle: 'Withstand elite hunter wings while breaching the orbital gate',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'survival',
    objectiveBadge: 'SURVIVAL',
    briefing:
      'Allied breaching corvettes are cutting through the frontier defense grid. Keep Sovereign interceptors and corvettes off their backs for 115 seconds!',
    primaryObjectiveText: 'Hold the gate corridor for 115s or eliminate all hostiles',
    optionalObjectiveText: 'Complete without using a repair kit',
    optionalObjectiveKind: 'no_repair_kits',
    optionalObjectiveTarget: 0,
    enemyIntel: '3x Interceptors, 2x Armored Strikers, 2x Elite Aces, 2x Corvettes',
    threatLevel: 'extreme',
    isBossLevel: false,
    estimatedMinutes: '5–6 min',
    successConditionText: 'Survive 115 seconds or wipe the blockade defense wing',
    failureConditionText: 'Player spacecraft destroyed',
    survivalDurationSec: 115,
    enemyMix: { interceptor: 3, heavy_fighter: 2, elite_ace: 2, medium_warship: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 135,
    gradeThresholds: { B: 3500, A: 5100, S: 6800 },
    rewards: { salvage: 140, supplies: 50, intel: 50, fleetReadiness: 6, credits: 470, baseXp: 720 },
  },
  {
    id: 'op08_l3',
    operationId: 'm8_sovereigns_frontier',
    operationNumber: 8,
    levelIndexInOp: 3,
    globalLevelNumber: 25,
    code: 'OP 08 · LVL 3',
    name: 'Crimson Lance & Dreadnought Oblivion',
    subtitle: 'Defeat Ace Archon Drex & Heavy Dreadnought Oblivion',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'ACE & DREADNOUGHT',
    briefing:
      'Archon Drex "Crimson Lance" leads Heavy Dreadnought Oblivion’s personal guard. Defeat Drex and dismantle Oblivion’s 5 major subsystems to break the frontier!',
    primaryObjectiveText: 'Defeat Ace Archon Drex & Heavy Dreadnought Oblivion',
    optionalObjectiveText: 'Destroy at least 4 Dreadnought subsystems',
    optionalObjectiveKind: 'subsystems_destroyed',
    optionalObjectiveTarget: 4,
    enemyIntel: 'LEGENDARY ACE ARCHON DREX + Heavy Dreadnought Oblivion + 4x Escorts',
    threatLevel: 'boss',
    isBossLevel: true,
    estimatedMinutes: '6–8 min',
    successConditionText: 'Defeat Archon Drex, neutralize Dreadnought Oblivion, and clear escorts',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { interceptor: 2, heavy_fighter: 2 },
    capitalShipOverride: {
      name: 'Sovereign Heavy Dreadnought Oblivion',
      shipClass: 'heavy_dreadnought',
    },
    requiredSubsystems: 3,
    legendaryPilotId: 'ace_drex',
    parTimeSec: 260,
    gradeThresholds: { B: 4200, A: 6050, S: 8050 },
    rewards: { salvage: 170, supplies: 60, intel: 55, fleetReadiness: 8, credits: 540, baseXp: 840 },
  },

  // =========================================================================
  // OP 09 — THE FALL OF THE CITADEL (3 Levels — Defense Zone + Malakor)
  // =========================================================================
  {
    id: 'op09_l1',
    operationId: 'm9_fall_of_the_citadel',
    operationNumber: 9,
    levelIndexInOp: 1,
    globalLevelNumber: 26,
    code: 'OP 09 · LVL 1',
    name: 'Citadel Relay Pursuit',
    subtitle: 'Hunt Sovereign command couriers coordinating the Citadel ring',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'pursuit',
    objectiveBadge: 'PURSUIT',
    briefing:
      'High-speed command relays are carrying orbital firing solutions to the Citadel bastion. Intercept every courier and elite guard before they link up with the inner ring.',
    primaryObjectiveText: 'Intercept & eliminate all 9 command couriers and guards',
    optionalObjectiveText: 'Achieve at least 55% weapon accuracy',
    optionalObjectiveKind: 'accuracy',
    optionalObjectiveTarget: 55,
    enemyIntel: '3x Recon Scouts, 3x Elite Aces, 3x Interceptors',
    threatLevel: 'extreme',
    isBossLevel: false,
    estimatedMinutes: '5–6 min',
    successConditionText: 'Destroy all couriers and guards before escape timer expires',
    failureConditionText: 'Player spacecraft destroyed or couriers escape',
    escapingTargetsCount: 3,
    escapeTimerSec: 215,
    enemyMix: { scout: 3, elite_ace: 3, interceptor: 3 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 175,
    gradeThresholds: { B: 3600, A: 5250, S: 7000 },
    rewards: { salvage: 145, supplies: 50, intel: 55, fleetReadiness: 6, credits: 500, baseXp: 780 },
  },
  {
    id: 'op09_l2',
    operationId: 'm9_fall_of_the_citadel',
    operationNumber: 9,
    levelIndexInOp: 2,
    globalLevelNumber: 27,
    code: 'OP 09 · LVL 2',
    name: 'Shieldbreaker Escort',
    subtitle: 'Escort Allied EMP Cruiser Tempest into Citadel firing range',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'escort',
    objectiveBadge: 'ESCORT',
    briefing:
      'EMP Cruiser Tempest is maneuvering to crack the Citadel bastion’s shield pylons. Protect Tempest from heavy bombers and elite corvettes.',
    primaryObjectiveText: 'Protect EMP Cruiser Tempest & destroy attacking wings',
    optionalObjectiveText: 'Keep Cruiser Tempest above 70% hull integrity',
    optionalObjectiveKind: 'protect_hp',
    optionalObjectiveTarget: 70,
    enemyIntel: '3x Bombers, 2x Assault Corvettes, 2x Elite Aces, 2x Armored Strikers',
    threatLevel: 'extreme',
    isBossLevel: false,
    estimatedMinutes: '5–7 min',
    successConditionText: 'Eliminate all attackers while Cruiser Tempest survives',
    failureConditionText: 'Player spacecraft or EMP Cruiser Tempest destroyed',
    protectedEntityName: 'EMP Cruiser Tempest',
    protectedMaxHp: 650,
    enemyMix: { bomber: 3, medium_warship: 2, elite_ace: 2, heavy_fighter: 2 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 195,
    gradeThresholds: { B: 3850, A: 5550, S: 7400 },
    rewards: { salvage: 155, supplies: 55, intel: 55, fleetReadiness: 7, credits: 530, baseXp: 820 },
  },
  {
    id: 'op09_l3',
    operationId: 'm9_fall_of_the_citadel',
    operationNumber: 9,
    levelIndexInOp: 3,
    globalLevelNumber: 28,
    code: 'OP 09 · LVL 3',
    name: 'Citadel Dreadnought Malakor',
    subtitle: 'Shatter Citadel Defense Dreadnought Malakor to expose Eternal Eclipse',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'assault',
    objectiveBadge: 'DREADNOUGHT',
    briefing:
      'Citadel Defense Dreadnought Malakor guards the inner stronghold ring. Destroy its Comms Array and Hangar Bay, dismantle its Royal Guard, and force the Sovereign Flagship out!',
    primaryObjectiveText: 'Neutralize Citadel Dreadnought Malakor & Royal Guard',
    optionalObjectiveText: 'Destroy all 5 Dreadnought subsystems',
    optionalObjectiveKind: 'subsystems_destroyed',
    optionalObjectiveTarget: 5,
    enemyIntel: 'Citadel Dreadnought Malakor + 3x Royal Elite Aces, 2x Armored Strikers, 1x Corvette',
    threatLevel: 'boss',
    isBossLevel: true,
    estimatedMinutes: '6–8 min',
    successConditionText: 'Neutralize Dreadnought Malakor and clear escorts',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { elite_ace: 3, heavy_fighter: 2, medium_warship: 1 },
    capitalShipOverride: {
      name: 'Citadel Defense Dreadnought Malakor',
      shipClass: 'heavy_dreadnought',
    },
    requiredSubsystems: 3,
    legendaryPilotId: null,
    parTimeSec: 265,
    gradeThresholds: { B: 4350, A: 6250, S: 8300 },
    rewards: { salvage: 185, supplies: 65, intel: 65, fleetReadiness: 9, credits: 600, baseXp: 920 },
  },

  // =========================================================================
  // OP 10 — THE LAST STAND (3 Climactic Finale Levels — Veyron & Eternal Eclipse)
  // =========================================================================
  {
    id: 'op10_l1',
    operationId: 'm10_the_last_stand',
    operationNumber: 10,
    levelIndexInOp: 1,
    globalLevelNumber: 29,
    code: 'OP 10 · LVL 1',
    name: 'The Final Gauntlet',
    subtitle: 'Break through the Eclipse Guard vanguard over burning Aether Prime',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'ambush',
    objectiveBadge: 'VANGUARD CLASH',
    briefing:
      'Every remaining ship in the Allied Fleet is committed. Smash through the Sovereign Royal Guard ambush to clear a direct firing lane to The Sovereign’s Flagship.',
    primaryObjectiveText: 'Destroy the 10-craft Sovereign Royal Guard vanguard',
    optionalObjectiveText: 'Reach a x7 combat combo streak',
    optionalObjectiveKind: 'combo_reach',
    optionalObjectiveTarget: 7,
    enemyIntel: '4x Elite Aces, 3x Armored Strikers, 2x Interceptors, 1x Assault Corvette',
    threatLevel: 'extreme',
    isBossLevel: false,
    estimatedMinutes: '5–7 min',
    successConditionText: 'Eliminate all 10 Royal Guard hostiles',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { elite_ace: 4, heavy_fighter: 3, interceptor: 2, medium_warship: 1 },
    capitalShipOverride: null,
    legendaryPilotId: null,
    parTimeSec: 195,
    gradeThresholds: { B: 4100, A: 5900, S: 7850 },
    rewards: { salvage: 175, supplies: 60, intel: 60, fleetReadiness: 8, credits: 580, baseXp: 900 },
  },
  {
    id: 'op10_l2',
    operationId: 'm10_the_last_stand',
    operationNumber: 10,
    levelIndexInOp: 2,
    globalLevelNumber: 30,
    code: 'OP 10 · LVL 2',
    name: 'Eclipse Duel: High Lord Veyron',
    subtitle: 'Defeat Supreme Ace High Lord Veyron "Eclipse Vanguard"',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'SUPREME ACE',
    briefing:
      'High Lord Veyron has launched in his Sovereign Crown-Blade to stop Commander Voss personally. Outfly the deadliest ace in the galaxy and clear the final lane to Eternal Eclipse.',
    primaryObjectiveText: 'Defeat Supreme Ace High Lord Veyron & Royal Wing',
    optionalObjectiveText: 'Finish the duel with at least 60% hull integrity',
    optionalObjectiveKind: 'hull_above',
    optionalObjectiveTarget: 60,
    enemyIntel: 'SUPREME ACE HIGH LORD VEYRON + 3x Elite Aces, 2x Armored Strikers',
    threatLevel: 'boss',
    isBossLevel: true,
    estimatedMinutes: '6–7 min',
    successConditionText: 'Defeat High Lord Veyron and his Royal Wing escorts',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { elite_ace: 3, heavy_fighter: 2 },
    capitalShipOverride: null,
    legendaryPilotId: 'ace_veyron',
    parTimeSec: 225,
    gradeThresholds: { B: 4550, A: 6550, S: 8700 },
    rewards: { salvage: 200, supplies: 65, intel: 70, fleetReadiness: 9, credits: 680, baseXp: 1050 },
  },
  {
    id: 'op10_l3',
    operationId: 'm10_the_last_stand',
    operationNumber: 10,
    levelIndexInOp: 3,
    globalLevelNumber: 31,
    code: 'OP 10 · LVL 3',
    name: 'The Last Stand: Eternal Eclipse',
    subtitle: 'Shatter the 3-Phase Sovereign Flagship Eternal Eclipse',
    spaceRegionId: 'sovereign_defense_zone',
    objectiveType: 'boss_encounter',
    objectiveBadge: 'FINAL BOSS',
    briefing:
      'This is it. Sovereign Flagship Eternal Eclipse is charging its orbital obliteration core. Strip its layered shields, annihilate all five tactical subsystems, and shatter the Command Bridge to liberate Aether Prime forever!',
    primaryObjectiveText: 'Destroy Sovereign Flagship Eternal Eclipse & final guard',
    optionalObjectiveText: 'Destroy all 5 Flagship subsystems before core collapse',
    optionalObjectiveKind: 'subsystems_destroyed',
    optionalObjectiveTarget: 5,
    enemyIntel: 'THE SOVEREIGN — ETERNAL ECLIPSE (3 PHASES) + 4x Royal Escorts + 1x Corvette',
    threatLevel: 'boss',
    isBossLevel: true,
    estimatedMinutes: '7–9 min',
    successConditionText: 'Completely destroy Sovereign Flagship Eternal Eclipse and escorts',
    failureConditionText: 'Player spacecraft destroyed',
    enemyMix: { elite_ace: 2, heavy_fighter: 2, medium_warship: 1 },
    capitalShipOverride: {
      name: 'THE SOVEREIGN — Flagship Eternal Eclipse',
      shipClass: 'sovereign_flagship',
    },
    requiredSubsystems: 5,
    legendaryPilotId: null,
    parTimeSec: 300,
    gradeThresholds: { B: 5200, A: 7400, S: 9800 },
    rewards: { salvage: 280, supplies: 100, intel: 100, fleetReadiness: 15, credits: 1000, baseXp: 1500 },
  },
];

export const CAMPAIGN_LEVEL_BY_ID: Record<string, CampaignLevelDef> = Object.fromEntries(
  CAMPAIGN_LEVELS.map((l) => [l.id, l]),
);

export function getLevelById(levelId: string | null | undefined): CampaignLevelDef | null {
  if (!levelId) return null;
  return CAMPAIGN_LEVEL_BY_ID[levelId] ?? null;
}

export function getLevelsForOperation(operationNumber: number): CampaignLevelDef[] {
  return CAMPAIGN_LEVELS.filter((l) => l.operationNumber === operationNumber).sort(
    (a, b) => a.levelIndexInOp - b.levelIndexInOp,
  );
}

export function getFirstLevelForOperation(operationNumber: number): CampaignLevelDef {
  return getLevelsForOperation(operationNumber)[0] ?? CAMPAIGN_LEVELS[0];
}

export function getFinalLevelForOperation(operationNumber: number): CampaignLevelDef {
  const levels = getLevelsForOperation(operationNumber);
  return levels[levels.length - 1] ?? CAMPAIGN_LEVELS[0];
}

export function isFinalLevelOfOperation(levelId: string): boolean {
  const lvl = getLevelById(levelId);
  if (!lvl) return false;
  const finalLvl = getFinalLevelForOperation(lvl.operationNumber);
  return finalLvl.id === lvl.id;
}

export function getNextLevel(levelId: string): CampaignLevelDef | null {
  const idx = CAMPAIGN_LEVELS.findIndex((l) => l.id === levelId);
  if (idx < 0 || idx >= CAMPAIGN_LEVELS.length - 1) return null;
  return CAMPAIGN_LEVELS[idx + 1];
}

export function getScaledLevelTimeLimitSec(
  level: CampaignLevelDef,
  difficulty: DifficultyId,
): number | null {
  if (!level.timeLimitSec) return null;
  const mult =
    difficulty === 'story'
      ? 1.3
      : difficulty === 'hard'
        ? 0.9
        : difficulty === 'nightmare'
          ? 0.82
          : 1.0;
  return Math.round(level.timeLimitSec * mult);
}

export function getScaledEscapeTimerSec(
  level: CampaignLevelDef,
  difficulty: DifficultyId,
): number | null {
  if (!level.escapeTimerSec) return null;
  const mult =
    difficulty === 'story'
      ? 1.3
      : difficulty === 'hard'
        ? 0.9
        : difficulty === 'nightmare'
          ? 0.82
          : 1.0;
  return Math.round(level.escapeTimerSec * mult);
}

export function isLevelUnlockedByProgress(params: {
  levelId: string;
  completedLevelIds: string[];
  completedMainMissions: number[];
  currentMissionNumber: number;
  unlockedLevelIds?: string[];
}): boolean {
  const lvl = getLevelById(params.levelId);
  if (!lvl) return false;
  if (lvl.globalLevelNumber === 1) return true;
  if (params.unlockedLevelIds?.includes(lvl.id)) return true;
  if (params.completedLevelIds.includes(lvl.id)) return true;

  // Backward-compatible migration: if player already completed this operation or reached a higher op
  if (params.completedMainMissions.includes(lvl.operationNumber)) return true;
  if (lvl.operationNumber < params.currentMissionNumber) return true;

  // Level 1 of the current unlocked operation is always accessible
  if (lvl.levelIndexInOp === 1 && lvl.operationNumber <= params.currentMissionNumber) {
    return true;
  }

  // Otherwise unlocked as soon as the immediately preceding global level is completed
  const prev = CAMPAIGN_LEVELS[lvl.globalLevelNumber - 2];
  if (!prev) return true;
  return (
    params.completedLevelIds.includes(prev.id) ||
    params.completedMainMissions.includes(prev.operationNumber)
  );
}

/**
 * Computes the complete, ordered list of unlocked level IDs from campaign progress
 * so unlockedLevelIds can be persisted authoritatively in the save file.
 */
export function computeUnlockedLevelIds(params: {
  completedLevelIds: string[];
  completedMainMissions: number[];
  currentMissionNumber: number;
  existingUnlockedLevelIds?: string[];
}): string[] {
  const unlocked: string[] = [];
  for (const lvl of CAMPAIGN_LEVELS) {
    if (
      isLevelUnlockedByProgress({
        levelId: lvl.id,
        completedLevelIds: params.completedLevelIds,
        completedMainMissions: params.completedMainMissions,
        currentMissionNumber: params.currentMissionNumber,
        unlockedLevelIds: params.existingUnlockedLevelIds,
      })
    ) {
      unlocked.push(lvl.id);
    }
  }
  return unlocked;
}

export function getOperationCompletionCounts(
  operationNumber: number,
  completedLevelIds: string[],
  completedMainMissions: number[],
): { completed: number; total: number } {
  const levels = getLevelsForOperation(operationNumber);
  if (completedMainMissions.includes(operationNumber)) {
    return { completed: levels.length, total: levels.length };
  }
  const done = levels.filter((l) => completedLevelIds.includes(l.id)).length;
  return { completed: done, total: levels.length };
}
