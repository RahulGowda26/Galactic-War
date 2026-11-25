import type { DifficultyId } from './campaignConfig';
import type { PlayableShipId, SpaceRegionId } from './spacePhysics';
import { UPGRADE_TRADE_OFF_MODULES, type TradeOffModuleId } from './combatExpansion';
import {
  computeUnlockedLevelIds,
  getFirstLevelForOperation,
  getLevelById,
  getNextLevel,
  isFinalLevelOfOperation,
} from './campaignLevels';
import {
  COSMETIC_LIVERIES,
  GRADE_ORDER,
  computeGradeImprovementBonus,
  computePilotRankProgress,
  evaluateLevelPerformance,
  type PerformanceGrade,
} from './combatScoring';
import {
  CAMPAIGN_SAVE_KEY,
  clearCampaignFromAllLayers,
  hasCampaignProgression,
  isCandidateFresher,
  readCampaignFromIndexedDb,
  readCampaignFromSyncLayers,
  writeCampaignToAllLayers,
  type CampaignSaveLayerStatus,
} from './campaignSaveService';
import {
  EXTINCTION_CAMPAIGN_OPERATION,
  computeUnlockedExtinctionLevelIds,
  createInitialExtinctionState,
  getExtinctionLevelById,
  getNextExtinctionLevel,
  normalizeExtinctionState,
  type CampaignTrackId,
  type ExtinctionBossId,
  type ExtinctionCampaignState,
  type ExtinctionLevelDef,
} from './extinctionCampaign';

export type CampaignTheater = 'space';

export type SpaceChassisConfigId = 'interceptor' | 'gunship' | 'striker';

export interface CampaignResources {
  salvage: number;
  supplies: number;
  intel: number;
  fleetReadiness: number; // 0..100
}

export interface SpaceLoadout {
  selectedShipId: PlayableShipId;
  unlockedShips: PlayableShipId[];
  chassisConfig: SpaceChassisConfigId; // compatibility alias derived from ship
  pulseLevel: number; // 1..3
  plasmaLevel: number; // 1..3
  empLevel: number; // 1..3
  railLevel: number; // 1..3
  missileCapacity: number; // 12..24
  countermeasureLevel: number; // 1..3
  shieldLevel: number; // 1..3
  engineLevel: number; // 1..3
  alliedSupportLevel: number; // 1..3
  shipHullCondition: number; // 40..100
  ownedModules: TradeOffModuleId[];
  equippedModules: TradeOffModuleId[];
}

export interface StrategicDecisionChoice {
  id: string;
  label: string;
  shortTitle: string;
  summary: string;
  immediateEffect: string;
  longTermConsequence: string;
  resourceDelta: Partial<CampaignResources>;
  epilogueText: string;
}

export interface StrategicDecisionDef {
  id: 'dec_fleet_vs_platform' | 'dec_rescue_vs_supply' | 'dec_comms_vs_carrier';
  afterMissionNumber: number;
  title: string;
  briefing: string;
  choiceA: StrategicDecisionChoice;
  choiceB: StrategicDecisionChoice;
}

export interface CampaignMissionDef {
  id: string;
  missionNumber: number; // 1..10 for main, 101..103 for optional
  isOptional: boolean;
  unlockAfterMission: number;
  code: string;
  title: string;
  subtitle: string;
  theater: CampaignTheater;
  encounterTier: 'easy' | 'standard' | 'difficult' | 'major';
  spaceRegionId: SpaceRegionId;
  capitalShipOverride?: {
    name: string;
    shipClass: 'frigate' | 'assault_cruiser' | 'heavy_dreadnought' | 'sovereign_flagship';
  } | null;
  briefingSummary: string;
  commsTransmission: string;
  intelNotes: string;
  enemyComposition: string[];
  friendlyForces: string;
  environmentalHazards: string;
  optionalObjective: string;
  rewards: CampaignResources;
  decisionAfterId?: StrategicDecisionDef['id'];
  isFinalMission?: boolean;
}

export interface CampaignStats {
  totalSpaceKills: number;
  capitalSubsystemsDestroyed: number;
  capitalShipsDestroyed: number;
  distanceTraveledKm: number;
  missionsCompletedCount: number;
  optionalOpsCompletedCount: number;
  decisionsMadeCount: number;
  playTimeSec: number;
  legendaryPilotsDefeated?: number;
  wingmenDisabledTotal?: number;
}

export interface CampaignDecisionEffects {
  extraAlliedFighters: number;
  enemyReinforcementReduction: number; // 0..0.35
  capitalShipShieldReduction: number; // 0..0.3
  sovereignFlagshipWeakenedPct: number; // 0..0.18
  extraRepairKits: number;
  revealedIntelBonus: boolean;
}

export interface LevelCompletionRecord {
  levelId: string;
  bestScore: number;
  bestGrade: PerformanceGrade;
  bestAccuracyPct: number;
  bestTimeSec: number;
  optionalCompleted: boolean;
  completions: number;
  highestRewardedGrade: PerformanceGrade;
}

export interface PilotProgressState {
  xp: number;
  credits: number;
  rankIndex: number;
  medals: string[];
  unlockedCosmetics: string[];
  activeCosmeticId: string;
}

export type MissionFailureCause =
  | 'enemy_fire'
  | 'asteroid_collision'
  | 'time_expired'
  | 'escort_destroyed'
  | 'target_escaped';

export interface MissionRunSummary {
  missionId: string;
  missionCode: string;
  missionTitle: string;
  missionSubtitle: string;
  isOptional: boolean;
  isFinalMission: boolean;
  elapsedSec: number;
  spaceKills: number;
  subsystemsDestroyed: number;
  capitalShipsDestroyed: number;
  shotsFired: number;
  shotsHit: number;
  accuracyPct: number;
  hullRemainingPct: number;
  distanceTraveledKm: number;
  firstClear: boolean;
  rewardsGranted: CampaignResources;
  newlyUnlockedShips: PlayableShipId[];
  nextMissionId: string | null;
  pendingDecisionId: StrategicDecisionDef['id'] | null;
  // Level-based progression & grading telemetry
  levelId?: string;
  levelCode?: string;
  levelName?: string;
  score?: number;
  grade?: PerformanceGrade;
  previousBestScore?: number;
  isNewBestScore?: boolean;
  optionalCompleted?: boolean;
  optionalObjectiveText?: string;
  medalsEarned?: string[];
  xpEarned?: number;
  creditsEarned?: number;
  previousRankTitle?: string;
  newRankTitle?: string;
  rankedUp?: boolean;
  rankUnlockSummary?: string;
  nextLevelId?: string | null;
  campaignTrack?: CampaignTrackId;
  bossDefeatedId?: ExtinctionBossId | null;
  maxCombo?: number;
  scoreBreakdown?: {
    combatScore: number;
    accuracyBonus: number;
    hullBonus: number;
    timeBonus: number;
    optionalBonus: number;
  };
}

export interface MissionFailureSummary {
  missionId: string;
  missionCode: string;
  missionTitle: string;
  regionLabel: string;
  shipName: string;
  elapsedSec: number;
  spaceKills: number;
  subsystemsDestroyed: number;
  hostilesRemaining: number;
  cause: MissionFailureCause;
  levelId?: string;
  levelCode?: string;
  levelName?: string;
}

export interface CampaignState {
  version: number;
  difficulty: DifficultyId;
  currentMissionNumber: number; // 1..10
  completedMainMissions: number[];
  completedOptionalIds: string[];
  claimedRewardMissionIds: string[];
  // Level-based campaign progression (non-destructively added to v2 saves)
  currentLevelId: string;
  completedLevelIds: string[];
  unlockedLevelIds: string[];
  claimedRewardLevelIds: string[];
  levelRecords: Record<string, LevelCompletionRecord>;
  pilotProgress: PilotProgressState;
  discoveredRegions: SpaceRegionId[];
  resources: CampaignResources;
  spaceLoadout: SpaceLoadout;
  decisions: Partial<Record<StrategicDecisionDef['id'], string>>;
  pendingDecisionId: StrategicDecisionDef['id'] | null;
  stats: CampaignStats;
  campaignCompleted: boolean;
  activeCampaignTrack?: CampaignTrackId;
  extinctionState?: ExtinctionCampaignState;
  saveRevision?: number;
  savedAtIso: string;
}

export const CAMPAIGN_STORAGE_KEY = CAMPAIGN_SAVE_KEY;

export const STRATEGIC_DECISIONS: Record<StrategicDecisionDef['id'], StrategicDecisionDef> = {
  dec_fleet_vs_platform: {
    id: 'dec_fleet_vs_platform',
    afterMissionNumber: 3,
    title: 'STRATEGIC DILEMMA I — ORBITAL CORRIDOR',
    briefing:
      'Vanguard 4th Cruiser Group is pinned under orbital fire in Aether Prime Orbit while an Alien Orbital Siege Platform charges its planetary lance. We only have jump-fuel to strike one target before the window closes.',
    choiceA: {
      id: 'save_allied_fleet',
      label: 'Escort Vanguard 4th Cruiser Group',
      shortTitle: 'Save Allied Fleet',
      summary: 'Break the alien blockade around damaged friendly cruisers to preserve fleet strength.',
      immediateEffect: '+18 Fleet Readiness · +30 Supplies',
      longTermConsequence:
        '+2 Allied Wingmen join orbital battles & CSV Aegis receives heavy cruiser escorts.',
      resourceDelta: { fleetReadiness: 18, supplies: 30 },
      epilogueText:
        'Vanguard 4th Cruiser Group survived the orbital breakout and anchored the liberation armada above Aether Prime.',
    },
    choiceB: {
      id: 'destroy_weapons_platform',
      label: 'Destroy Alien Orbital Siege Platform',
      shortTitle: 'Destroy Siege Platform',
      summary: 'Strike the planetary lance station directly to cripple Sovereign orbital firepower.',
      immediateEffect: '+170 Salvage · +35 Intel',
      longTermConsequence:
        'Reduces enemy fighter reinforcements by 25% in Missions 5–9 and weakens Capital Ship shields by 20%.',
      resourceDelta: { salvage: 170, intel: 35, fleetReadiness: -8 },
      epilogueText:
        'Destroying the Orbital Siege Platform saved Crown City from planetary bombardment and crippled the Sovereign forward fleet.',
    },
  },
  dec_rescue_vs_supply: {
    id: 'dec_rescue_vs_supply',
    afterMissionNumber: 6,
    title: 'STRATEGIC DILEMMA II — DEEP BELT CRISIS',
    briefing:
      'Long-range scanners picked up Captain Harlan’s stranded pilot wing drifting inside the Deep Asteroid Belt at the exact moment an unguarded Vanguard munitions freighter entered alien salvage range.',
    choiceA: {
      id: 'rescue_stranded_pilots',
      label: 'Rescue Stranded Pilot Squadron',
      shortTitle: 'Rescue Pilots',
      summary: 'Divert recovery shuttles to pull veteran Vanguard pilots from the asteroid graveyard.',
      immediateEffect: '+16 Fleet Readiness · +25 Intel',
      longTermConsequence:
        '+2 Veteran Allied Wingmen fly alongside Commander Kael Voss in Missions 7–10.',
      resourceDelta: { fleetReadiness: 16, intel: 25 },
      epilogueText:
        'Captain Harlan’s rescued flight wing flew point during the Sovereign Bastion breach, saving dozens of allied craft.',
    },
    choiceB: {
      id: 'secure_supply_convoy',
      label: 'Secure Heavy Munitions Freighter',
      shortTitle: 'Secure Supplies',
      summary: 'Recover railgun capacitors, nanite repair pods, and titanium alloy for the Hangar.',
      immediateEffect: '+250 Salvage · +95 Supplies',
      longTermConsequence:
        '+1 Extra Nanite Repair Kit on every sortie & abundant Hangar upgrade resources.',
      resourceDelta: { salvage: 250, supplies: 95, fleetReadiness: -6 },
      epilogueText:
        'The recovered munitions freighter armed the Vanguard Hangar with experimental Rail Cannons that broke the Dreadnought blockade.',
    },
  },
  dec_comms_vs_carrier: {
    id: 'dec_comms_vs_carrier',
    afterMissionNumber: 8,
    title: 'STRATEGIC DILEMMA III — CITADEL APPROACH',
    briefing:
      'As the Vanguard armada breaches the Sovereign’s Defence Zone, our flagship carrier CSV Aegis takes heavy plasma broadsides while the Sovereign’s Orbital Command Relay drops its cloak for 90 seconds.',
    choiceA: {
      id: 'destroy_enemy_comms',
      label: 'Destroy Sovereign Comms Relay',
      shortTitle: 'Destroy Comms Relay',
      summary: 'Blind the Sovereign’s fleet-wide neural coordination network before the final assault.',
      immediateEffect: '+50 Intel · +140 Salvage',
      longTermConsequence:
        'Weakens the Sovereign Flagship Eternal Eclipse by 16% and disrupts enemy fighter formations in OP 09–10.',
      resourceDelta: { intel: 50, salvage: 140, fleetReadiness: -10 },
      epilogueText:
        'Severing the Sovereign’s Orbital Command Relay shattered alien fleet coordination the instant Eternal Eclipse fell.',
    },
    choiceB: {
      id: 'protect_allied_carrier',
      label: 'Defend Flagship CSV Aegis',
      shortTitle: 'Protect Allied Carrier',
      summary: 'Form an interceptor screen around CSV Aegis so its orbital railguns survive for The Last Stand.',
      immediateEffect: '+22 Fleet Readiness · +65 Supplies',
      longTermConsequence:
        'CSV Aegis survives intact, deploying +2 Wingmen and orbital repair support in OP 09 & OP 10.',
      resourceDelta: { fleetReadiness: 22, supplies: 65 },
      epilogueText:
        'CSV Aegis weathered the Sovereign’s Defence Zone intact, delivering decisive broadside cover as Kael Voss ended the war.',
    },
  },
};

export const MAIN_CAMPAIGN_MISSIONS: CampaignMissionDef[] = [
  {
    id: 'm1_fall_of_aether_prime_orbit',
    missionNumber: 1,
    isOptional: false,
    unlockAfterMission: 0,
    code: 'OP 01',
    title: 'The Fall of Aether Prime Orbit',
    subtitle: 'Planetary Evacuation Corridor — Low Orbit',
    theater: 'space',
    encounterTier: 'easy',
    spaceRegionId: 'low_orbit',
    capitalShipOverride: null,
    briefingSummary:
      'The Sovereign’s invasion armada has entered high orbit above Aether Prime. Launch in your starfighter, master flight controls and long-distance cruise, and defend the orbital evacuation corridor.',
    commsTransmission:
      'CSV AEGIS: "Commander Voss, Crown City transports are lifting off under fire. Clear the evacuation lanes!"',
    intelNotes:
      'Use [1] Pulse Cannons against fast Interceptors and [V] Supercruise to cross the 15 km orbital zone rapidly.',
    enemyComposition: ['Void Interceptors', 'Alien Recon Scouts', 'Distributed Patrol Zones'],
    friendlyForces: 'CSV Aegis Carrier + Orbital Evacuation Shuttles + 3 Allied Wingmen',
    environmentalHazards: 'Sparse satellite debris above Aether Prime’s illuminated atmosphere.',
    optionalObjective: 'Intercept the Alien Recon Scout before it signals reinforcements.',
    rewards: { salvage: 130, supplies: 50, intel: 25, fleetReadiness: 6 },
  },
  {
    id: 'm2_broken_orbit',
    missionNumber: 2,
    isOptional: false,
    unlockAfterMission: 1,
    code: 'OP 02',
    title: 'Broken Orbit',
    subtitle: 'Orbital Defense Platform Alpha',
    theater: 'space',
    encounterTier: 'standard',
    spaceRegionId: 'low_orbit',
    capitalShipOverride: {
      name: 'Alien Siege Frigate Vor-02',
      shipClass: 'frigate',
    },
    briefingSummary:
      'Enemy Siege Bombers and an Alien Frigate are attacking Orbital Defense Platform Alpha. Fly across Sector I to intercept the attack wings and disable the frigate’s weapon batteries.',
    commsTransmission:
      'PLATFORM ALPHA: "Shields at 40%! Hostile bombers incoming from high orbit — requesting Vanguard intercept!"',
    intelNotes:
      'Target the Siege Frigate’s Shield Generator and Weapon Batteries with [Tab]. Unlocks the B-7 Hammerhead Strike Bomber.',
    enemyComposition: ['Siege Bombers', 'Void Interceptors', 'Alien Siege Frigate Vor-02'],
    friendlyForces: 'Orbital Defense Platform Alpha + Allied Interceptor Wing',
    environmentalHazards: 'Orbital debris lanes and hostile bomber torpedo salvos.',
    optionalObjective: 'Destroy at least 2 subsystems on Frigate Vor-02.',
    rewards: { salvage: 165, supplies: 60, intel: 30, fleetReadiness: 7 },
  },
  {
    id: 'm3_the_lost_fleet',
    missionNumber: 3,
    isOptional: false,
    unlockAfterMission: 2,
    code: 'OP 03',
    title: 'The Lost Fleet',
    subtitle: 'Wreckage Graveyard & Distress Signals',
    theater: 'space',
    encounterTier: 'standard',
    spaceRegionId: 'shattered_fleet',
    capitalShipOverride: null,
    briefingSummary:
      'Jump into Sector II — The Shattered Front. Traverse kilometers of torn capital ship hulks, answer emergency distress beacons from stranded Vanguard pilots, and recover Sovereign fleet telemetry.',
    commsTransmission:
      'DISTRESS BEACON 07: "This is Flight Lead Harlan — we are pinned inside the CSV Valiant wreckage field!"',
    intelNotes:
      'Use long-range Supercruise to travel between separated wreckage zones. Unlocks the SR-4 Specter Recon Craft.',
    enemyComposition: ['Scavenger Interceptors', 'Armored Gunships', 'Recon Scouts'],
    friendlyForces: 'Stranded Escape Pods + Automated Repair Beacon',
    environmentalHazards: 'Drifting capital ship hull plates and unstable wreckage fields.',
    optionalObjective: 'Complete the sector sweep with hull integrity above 65%.',
    rewards: { salvage: 195, supplies: 70, intel: 40, fleetReadiness: 8 },
    decisionAfterId: 'dec_fleet_vs_platform',
  },
  {
    id: 'm4_into_the_debris_belt',
    missionNumber: 4,
    isOptional: false,
    unlockAfterMission: 3,
    code: 'OP 04',
    title: 'Into the Debris Belt',
    subtitle: 'Rotating Asteroid Corridors & Mining Sector',
    theater: 'space',
    encounterTier: 'standard',
    spaceRegionId: 'debris_belt',
    capitalShipOverride: null,
    briefingSummary:
      'Pursue fleeing Sovereign scouts into the Deep Asteroid Belt. Navigate narrow rotating rock corridors, use towering asteroids to break enemy missile locks, and dismantle hostile patrol rings.',
    commsTransmission:
      'VANGUARD INTEL: "Dense silicate fields ahead, Commander. Watch your proximity radar and use the rocks for cover."',
    intelNotes:
      'Dense asteroid fields block enemy homing missiles and radar locks. Keep Countermeasures [R] and Nanite Repair [H] ready.',
    enemyComposition: ['Void Interceptors', 'Recon Scouts', 'Armored Gunships', 'Elite Ace Scout'],
    friendlyForces: 'Orbital Repair Beacon near Mining Rig 04',
    environmentalHazards: 'Dense tumbling iron-silicate boulders and narrow asteroid canyons.',
    optionalObjective: 'Break an enemy missile lock using asteroid cover or countermeasures.',
    rewards: { salvage: 225, supplies: 75, intel: 40, fleetReadiness: 8 },
  },
  {
    id: 'm5_the_shattered_armada',
    missionNumber: 5,
    isOptional: false,
    unlockAfterMission: 4,
    code: 'OP 05',
    title: 'The Shattered Armada',
    subtitle: 'Major Fleet Battle — Assault Cruiser Vex-04',
    theater: 'space',
    encounterTier: 'difficult',
    spaceRegionId: 'shattered_fleet',
    capitalShipOverride: {
      name: 'Alien Assault Cruiser Vex-04',
      shipClass: 'assault_cruiser',
    },
    briefingSummary:
      'An Alien Assault Cruiser and bomber armada have moved into The Shattered Front to finish off CSV Aegis. Coordinate with allied fighters, strip cruiser shields with EMP, and destroy its Hangar and Weapon Batteries.',
    commsTransmission:
      'CSV AEGIS: "All wings launch! Cruiser Vex-04 is launching bombers — neutralize its Hangar and Shield Generator!"',
    intelNotes:
      'Destroying the Fighter Hangar halts enemy reinforcements; destroying the Comms Array degrades enemy fighter accuracy.',
    enemyComposition: ['Assault Cruiser Vex-04 (5 Subsystems)', 'Siege Bombers', 'Armored Gunships', 'Elite Ace'],
    friendlyForces: 'Flagship Carrier CSV Aegis + Full Allied Wingman Squadron',
    environmentalHazards: 'Capital ship crossfire and drifting frigate hulks.',
    optionalObjective: 'Destroy 3 subsystems on Assault Cruiser Vex-04.',
    rewards: { salvage: 260, supplies: 85, intel: 45, fleetReadiness: 10 },
  },
  {
    id: 'm6_the_hidden_installation',
    missionNumber: 6,
    isOptional: false,
    unlockAfterMission: 5,
    code: 'OP 06',
    title: 'The Hidden Installation',
    subtitle: 'Outer Frontier Deep-Space Comms Array',
    theater: 'space',
    encounterTier: 'difficult',
    spaceRegionId: 'outer_frontier',
    capitalShipOverride: {
      name: 'Alien Patrol Cruiser Kar-09',
      shipClass: 'assault_cruiser',
    },
    briefingSummary:
      'Venture into the vast, quiet reaches of The Outer Frontier past ringed gas giants and distant moons. Locate the Sovereign’s hidden communications network and cripple Patrol Cruiser Kar-09.',
    commsTransmission:
      'VANGUARD INTEL: "Long-range silence out here, Commander. Engage Supercruise [V] to reach the hidden relay coordinates."',
    intelNotes:
      'SR-4 Specter or upgraded engines excel across Outer Frontier distances. Completing OP 06 unlocks the X-01 Sovereign Bane Prototype!',
    enemyComposition: ['Alien Patrol Cruiser Kar-09', 'Recon Scouts', 'Interceptors', 'Elite Ace'],
    friendlyForces: 'Deep-Space Recon Support Drone',
    environmentalHazards: 'Vast open travel corridors and deep-space ambush patrols.',
    optionalObjective: 'Destroy the Cruiser Comms Array first to disrupt patrol coordination.',
    rewards: { salvage: 290, supplies: 95, intel: 60, fleetReadiness: 10 },
    decisionAfterId: 'dec_rescue_vs_supply',
  },
  {
    id: 'm7_counterstrike',
    missionNumber: 7,
    isOptional: false,
    unlockAfterMission: 6,
    code: 'OP 07',
    title: 'Counterstrike',
    subtitle: 'Deep Asteroid Belt — Orbital Defense Bastion',
    theater: 'space',
    encounterTier: 'difficult',
    spaceRegionId: 'debris_belt',
    capitalShipOverride: {
      name: 'Alien Bastion Destroyer Kael-7',
      shipClass: 'assault_cruiser',
    },
    briefingSummary:
      'Launch the Vanguard fleet counterstrike into the Deep Asteroid Belt. Shatter the Sovereign’s fortified logistics destroyer and clear the jump corridor toward the enemy defence zone.',
    commsTransmission:
      'COMMANDER VOSS: "No more retreating. Prepare your Hangar loadout — we break their supply line today."',
    intelNotes:
      'Bring [5] Precision Rail Cannon or B-7 Hammerhead to snipe Bastion Destroyer subsystems from asteroid cover.',
    enemyComposition: ['Bastion Destroyer Kael-7', 'Elite Ace Squadron', 'Armored Gunships'],
    friendlyForces: 'Vanguard Counterstrike Wing + Repair Beacon',
    environmentalHazards: 'Dense rotating rock corridors and heavy destroyer plasma barrages.',
    optionalObjective: 'Destroy Bastion Destroyer Kael-7 with at least 1 Repair Kit unused.',
    rewards: { salvage: 310, supplies: 100, intel: 55, fleetReadiness: 11 },
  },
  {
    id: 'm8_sovereigns_frontier',
    missionNumber: 8,
    isOptional: false,
    unlockAfterMission: 7,
    code: 'OP 08',
    title: "The Sovereign's Frontier",
    subtitle: 'Outer Defence Ring — Heavy Dreadnought Oblivion',
    theater: 'space',
    encounterTier: 'major',
    spaceRegionId: 'sovereign_defense_zone',
    capitalShipOverride: {
      name: 'Sovereign Heavy Dreadnought Oblivion',
      shipClass: 'heavy_dreadnought',
    },
    briefingSummary:
      'Lead the combined Vanguard armada into Sector V — The Sovereign’s Defence Zone. Fight through elite patrols and dismantle Heavy Dreadnought Oblivion’s 5 major subsystems.',
    commsTransmission:
      'THE SOVEREIGN: "Your fragile species dares approach my bastion? My Dreadnoughts will turn your fleet to ash."',
    intelNotes:
      'Combine [4] EMP Disruptor with [5] Rail Cannon & [2] Heavy Plasma to systematically dismantle Shields, Weapons, Engines, Comms, and Hangar.',
    enemyComposition: ['Heavy Dreadnought Oblivion (5 Subsystems)', 'Royal Elite Aces', 'Siege Bombers'],
    friendlyForces: 'Flagship CSV Aegis + Full Allied Fighter Armada',
    environmentalHazards: 'Orbital fortification pylons, heavy flak crossfire, and shattered hull debris.',
    optionalObjective: 'Destroy at least 4 Dreadnought subsystems.',
    rewards: { salvage: 350, supplies: 115, intel: 65, fleetReadiness: 12 },
    decisionAfterId: 'dec_comms_vs_carrier',
  },
  {
    id: 'm9_fall_of_the_citadel',
    missionNumber: 9,
    isOptional: false,
    unlockAfterMission: 8,
    code: 'OP 09',
    title: 'The Fall of the Citadel',
    subtitle: 'Sovereign Orbital Stronghold Breach',
    theater: 'space',
    encounterTier: 'major',
    spaceRegionId: 'sovereign_defense_zone',
    capitalShipOverride: {
      name: 'Citadel Defense Dreadnought Malakor',
      shipClass: 'heavy_dreadnought',
    },
    briefingSummary:
      'Assault the Sovereign’s massive orbital stronghold. Break through the Royal Elite Guard squadron, shatter the Citadel defense ring, and force the Sovereign’s personal flagship into open battle.',
    commsTransmission:
      'CSV AEGIS: "Orbital fortress shields are fracturing! Push through the bastion ring — the Sovereign’s flagship is powering up!"',
    intelNotes:
      'Upgrade your shields, engines, and Rail Cannon in the Hangar before deploying. Eliminate Elite Aces before committing to close Dreadnought runs.',
    enemyComposition: ['Citadel Dreadnought Malakor', '3 Royal Elite Aces', 'Armored Gunships', 'Bombers'],
    friendlyForces: 'All Surviving Vanguard Squadrons (Scaled by Strategic Decisions)',
    environmentalHazards: 'Dense orbital fortress bastion ring and heavy capital ship barrages.',
    optionalObjective: 'Eliminate all Royal Elite Aces.',
    rewards: { salvage: 390, supplies: 130, intel: 75, fleetReadiness: 12 },
  },
  {
    id: 'm10_the_last_stand',
    missionNumber: 10,
    isOptional: false,
    unlockAfterMission: 9,
    code: 'OP 10 · FINAL',
    title: 'The Last Stand',
    subtitle: "Confrontation with The Sovereign's Flagship — Eternal Eclipse",
    theater: 'space',
    encounterTier: 'major',
    spaceRegionId: 'sovereign_defense_zone',
    capitalShipOverride: {
      name: 'THE SOVEREIGN — Flagship Eternal Eclipse',
      shipClass: 'sovereign_flagship',
    },
    briefingSummary:
      'The decisive final battle for Aether Prime. Lead humanity’s remaining armada against The Sovereign’s colossal command ship Eternal Eclipse, dismantle its 5 core systems across 3 escalating combat phases, and end the war forever.',
    commsTransmission:
      'COMMANDER KAEL VOSS: "All Vanguard wings, lock weapons on Eternal Eclipse. For Aether Prime — this ends now!"',
    intelNotes:
      '3-Phase Flagship Boss Battle: Collapse Shields & Hangar first, cripple Weapon Batteries & Comms, then shatter Eternal Eclipse’s core hull. Your Strategic Decisions directly bolster allied fighters and weaken Sovereign shields.',
    enemyComposition: ['THE SOVEREIGN — Eternal Eclipse (3-Phase Flagship)', 'Royal Ace Guard', 'Siege Bombers'],
    friendlyForces: 'United Vanguard Liberation Fleet & CSV Aegis',
    environmentalHazards: 'Massive orbital debris storm, capital broadsides, and flagship missile barrages.',
    optionalObjective: 'Destroy The Sovereign’s Flagship Eternal Eclipse and liberate Aether Prime.',
    rewards: { salvage: 550, supplies: 180, intel: 120, fleetReadiness: 20 },
    isFinalMission: true,
  },
];

export const OPTIONAL_CAMPAIGN_MISSIONS: CampaignMissionDef[] = [
  {
    id: 'opt_salvage_run',
    missionNumber: 101,
    isOptional: true,
    unlockAfterMission: 2,
    code: 'OPT A',
    title: 'Salvage Run: Shattered Hulls',
    subtitle: 'The Shattered Front — Titanium Recovery',
    theater: 'space',
    encounterTier: 'easy',
    spaceRegionId: 'shattered_fleet',
    capitalShipOverride: null,
    briefingSummary:
      'Recover high-grade titanium plating and plasma coils from a drifting Vanguard cruiser before alien scavengers strip the hull.',
    commsTransmission:
      'SALVAGE DRONE 04: "High-yield hull plating located in Sector II — light alien patrol inbound."',
    intelNotes: 'Light interceptor screen guarding rich salvage crates. Non-repeatable tactical op.',
    enemyComposition: ['4 Scavenger Interceptors', '1 Armored Gunship'],
    friendlyForces: 'Autonomous Salvage Drone',
    environmentalHazards: 'Slowly rotating frigate wreckage.',
    optionalObjective: 'Clear all scavengers for maximum Salvage payout.',
    rewards: { salvage: 280, supplies: 45, intel: 20, fleetReadiness: 6 },
  },
  {
    id: 'opt_intercept_relay',
    missionNumber: 102,
    isOptional: true,
    unlockAfterMission: 4,
    code: 'OPT B',
    title: 'Blackout: Outer Frontier Relay',
    subtitle: 'Outer Frontier — Deep Recon Strike',
    theater: 'space',
    encounterTier: 'standard',
    spaceRegionId: 'outer_frontier',
    capitalShipOverride: {
      name: 'Alien Relay Frigate Zyr-08',
      shipClass: 'frigate',
    },
    briefingSummary:
      'Ambush an alien reconnaissance flotilla in the Outer Frontier to decrypt Sovereign jump codes and boost Campaign Intelligence.',
    commsTransmission:
      'VANGUARD INTEL: "Stop the Recon Scouts before they jump — decrypting their logs unlocks Rail Cannon telemetry."',
    intelNotes: 'Use Supercruise + Homing Missiles to overtake fleeing Scouts.',
    enemyComposition: ['3 Recon Scouts', '3 Interceptors', 'Relay Frigate Zyr-08'],
    friendlyForces: '1 Recon Wingman',
    environmentalHazards: 'Long-range open-space intercept.',
    optionalObjective: 'Destroy the Frigate Comms Array.',
    rewards: { salvage: 170, supplies: 55, intel: 80, fleetReadiness: 10 },
  },
  {
    id: 'opt_distress_extraction',
    missionNumber: 103,
    isOptional: true,
    unlockAfterMission: 5,
    code: 'OPT C',
    title: 'Extraction: Belt Distress Signal',
    subtitle: 'Deep Asteroid Belt — Escape Pod Rescue',
    theater: 'space',
    encounterTier: 'standard',
    spaceRegionId: 'debris_belt',
    capitalShipOverride: null,
    briefingSummary:
      'A Vanguard medical transport went dark inside the Deep Asteroid Belt. Clear the alien ambush wing to recover military supplies and veteran flight crews.',
    commsTransmission:
      'MEDICAL TRANSPORT 09: "Engines dead inside asteroid canyon — alien gunships closing!"',
    intelNotes: 'Compact high-stakes dogfight among large drifting rocks. Major Supplies & Fleet Readiness reward.',
    enemyComposition: ['3 Interceptors', '2 Armored Gunships', '1 Elite Ace'],
    friendlyForces: 'Stranded Medical Transport',
    environmentalHazards: 'Rotating asteroid canyon.',
    optionalObjective: 'Neutralize the ambush wing cleanly.',
    rewards: { salvage: 160, supplies: 130, intel: 30, fleetReadiness: 14 },
  },
];

export const ALL_CAMPAIGN_MISSIONS: CampaignMissionDef[] = [
  ...MAIN_CAMPAIGN_MISSIONS,
  ...OPTIONAL_CAMPAIGN_MISSIONS,
];

export function getCampaignMissionById(id: string): CampaignMissionDef | undefined {
  return ALL_CAMPAIGN_MISSIONS.find((m) => m.id === id);
}

export function getMainMissionByNumber(num: number): CampaignMissionDef {
  const clamped = Math.max(1, Math.min(MAIN_CAMPAIGN_MISSIONS.length, Math.round(num)));
  return MAIN_CAMPAIGN_MISSIONS[clamped - 1];
}

export function shipIdToChassisAlias(shipId: PlayableShipId): SpaceChassisConfigId {
  if (shipId === 'heavy_fighter') return 'gunship';
  if (shipId === 'strike_bomber') return 'striker';
  return 'interceptor';
}

export function createInitialCampaignState(difficulty: DifficultyId = 'normal'): CampaignState {
  return {
    version: 2,
    difficulty,
    currentMissionNumber: 1,
    completedMainMissions: [],
    completedOptionalIds: [],
    claimedRewardMissionIds: [],
    currentLevelId: 'op01_l1',
    completedLevelIds: [],
    unlockedLevelIds: ['op01_l1'],
    claimedRewardLevelIds: [],
    levelRecords: {},
    pilotProgress: {
      xp: 0,
      credits: 0,
      rankIndex: 0,
      medals: [],
      unlockedCosmetics: ['vanguard_standard'],
      activeCosmeticId: 'vanguard_standard',
    },
    discoveredRegions: ['low_orbit'],
    resources: {
      salvage: 200,
      supplies: 90,
      intel: 40,
      fleetReadiness: 58,
    },
    spaceLoadout: {
      selectedShipId: 'light_interceptor',
      unlockedShips: ['light_interceptor', 'heavy_fighter'],
      chassisConfig: 'interceptor',
      pulseLevel: 1,
      plasmaLevel: 1,
      empLevel: 1,
      railLevel: 1,
      missileCapacity: 14,
      countermeasureLevel: 1,
      shieldLevel: 1,
      engineLevel: 1,
      alliedSupportLevel: 1,
      shipHullCondition: 100,
      ownedModules: [],
      equippedModules: [],
    },
    decisions: {},
    pendingDecisionId: null,
    stats: {
      totalSpaceKills: 0,
      capitalSubsystemsDestroyed: 0,
      capitalShipsDestroyed: 0,
      distanceTraveledKm: 0,
      missionsCompletedCount: 0,
      optionalOpsCompletedCount: 0,
      decisionsMadeCount: 0,
      playTimeSec: 0,
    },
    campaignCompleted: false,
    activeCampaignTrack: 'original',
    extinctionState: createInitialExtinctionState(),
    saveRevision: 0,
    savedAtIso: new Date().toISOString(),
  };
}

/**
 * Pure computation of tangible mechanical effects from strategic choices & fleet support.
 */
export function computeDecisionEffects(state: CampaignState): CampaignDecisionEffects {
  let extraAlliedFighters = Math.max(0, state.spaceLoadout.alliedSupportLevel - 1);
  let enemyReinforcementReduction = 0;
  let capitalShipShieldReduction = 0;
  let sovereignFlagshipWeakenedPct = 0;
  let extraRepairKits = 0;
  let revealedIntelBonus = state.resources.intel >= 55;

  if (state.decisions.dec_fleet_vs_platform === 'save_allied_fleet') {
    extraAlliedFighters += 2;
  } else if (state.decisions.dec_fleet_vs_platform === 'destroy_weapons_platform') {
    enemyReinforcementReduction += 0.25;
    capitalShipShieldReduction += 0.2;
  }

  if (state.decisions.dec_rescue_vs_supply === 'rescue_stranded_pilots') {
    extraAlliedFighters += 2;
  } else if (state.decisions.dec_rescue_vs_supply === 'secure_supply_convoy') {
    extraRepairKits += 1;
  }

  if (state.decisions.dec_comms_vs_carrier === 'destroy_enemy_comms') {
    sovereignFlagshipWeakenedPct += 0.16;
    revealedIntelBonus = true;
  } else if (state.decisions.dec_comms_vs_carrier === 'protect_allied_carrier') {
    extraAlliedFighters += 2;
  }

  if (state.resources.fleetReadiness >= 80) {
    extraAlliedFighters += 1;
  }

  return {
    extraAlliedFighters,
    enemyReinforcementReduction: Math.min(0.35, enemyReinforcementReduction),
    capitalShipShieldReduction: Math.min(0.3, capitalShipShieldReduction),
    sovereignFlagshipWeakenedPct: Math.min(0.18, sovereignFlagshipWeakenedPct),
    extraRepairKits,
    revealedIntelBonus,
  };
}

export interface MissionCompletionResult {
  state: CampaignState;
  summary: MissionRunSummary | null;
}

export function applyMissionCompletionWithSummary(
  state: CampaignState,
  missionId: string,
  runStats: {
    spaceKills?: number;
    subsystemsDestroyed?: number;
    capitalShipsDestroyed?: number;
    distanceTraveledKm?: number;
    elapsedSec?: number;
    shotsFired?: number;
    shotsHit?: number;
    hullRemainingPct?: number;
  } = {},
): MissionCompletionResult {
  const mission = getCampaignMissionById(missionId);
  if (!mission) return { state, summary: null };

  const alreadyClaimed =
    state.claimedRewardMissionIds.includes(mission.id) ||
    (mission.isOptional
      ? state.completedOptionalIds.includes(mission.id)
      : state.completedMainMissions.includes(mission.missionNumber));

  const firstClear = !alreadyClaimed;

  // Strict anti-duplicate reward guard: full rewards are granted ONCE on first clear; replays grant 0 duplicate resources.
  const rewardsGranted: CampaignResources = firstClear
    ? {
        salvage: mission.rewards.salvage,
        supplies: mission.rewards.supplies,
        intel: mission.rewards.intel,
        fleetReadiness: mission.rewards.fleetReadiness,
      }
    : { salvage: 0, supplies: 0, intel: 0, fleetReadiness: 0 };

  const nextResources: CampaignResources = {
    salvage: state.resources.salvage + rewardsGranted.salvage,
    supplies: state.resources.supplies + rewardsGranted.supplies,
    intel: state.resources.intel + rewardsGranted.intel,
    fleetReadiness: Math.max(
      0,
      Math.min(100, state.resources.fleetReadiness + rewardsGranted.fleetReadiness),
    ),
  };

  const completedMain = mission.isOptional
    ? state.completedMainMissions
    : Array.from(new Set([...state.completedMainMissions, mission.missionNumber])).sort(
        (a, b) => a - b,
      );

  const completedOpt = mission.isOptional
    ? Array.from(new Set([...state.completedOptionalIds, mission.id]))
    : state.completedOptionalIds;

  const claimedRewardMissionIds = Array.from(
    new Set([...state.claimedRewardMissionIds, mission.id]),
  );

  // Unlock additional spacecraft naturally along the space campaign arc
  const prevUnlocked = new Set<PlayableShipId>(state.spaceLoadout.unlockedShips);
  const unlockedShips = new Set<PlayableShipId>(state.spaceLoadout.unlockedShips);
  if (completedMain.includes(2)) unlockedShips.add('strike_bomber');
  if (completedMain.includes(3)) unlockedShips.add('recon_craft');
  if (completedMain.includes(6)) unlockedShips.add('advanced_prototype');
  const newlyUnlockedShips = Array.from(unlockedShips).filter((id) => !prevUnlocked.has(id));

  // Discover regions naturally as missions progress without accidental skipping
  const discovered = new Set<SpaceRegionId>(state.discoveredRegions);
  discovered.add(mission.spaceRegionId);
  const nextMainNum = mission.isOptional
    ? state.currentMissionNumber
    : Math.min(
        MAIN_CAMPAIGN_MISSIONS.length,
        Math.max(state.currentMissionNumber, mission.missionNumber + 1),
      );
  discovered.add(getMainMissionByNumber(nextMainNum).spaceRegionId);

  const pendingDecisionId =
    !mission.isOptional && mission.decisionAfterId && !state.decisions[mission.decisionAfterId]
      ? mission.decisionAfterId
      : state.pendingDecisionId;

  const isFinished = state.campaignCompleted || Boolean(mission.isFinalMission);
  const shotsFired = Math.max(0, Math.round(runStats.shotsFired ?? 0));
  const shotsHit = Math.max(0, Math.min(shotsFired || 9999, Math.round(runStats.shotsHit ?? 0)));
  const accuracyPct =
    shotsFired > 0 ? Math.min(100, Math.round((shotsHit / shotsFired) * 100)) : 0;

  const nextUnlockedLevelIds = computeUnlockedLevelIds({
    completedLevelIds: state.completedLevelIds,
    completedMainMissions: completedMain,
    currentMissionNumber: nextMainNum,
    existingUnlockedLevelIds: state.unlockedLevelIds,
  });

  const nextState: CampaignState = {
    ...state,
    currentMissionNumber: nextMainNum,
    completedMainMissions: completedMain,
    completedOptionalIds: completedOpt,
    claimedRewardMissionIds,
    unlockedLevelIds: nextUnlockedLevelIds,
    discoveredRegions: Array.from(discovered),
    resources: nextResources,
    spaceLoadout: {
      ...state.spaceLoadout,
      unlockedShips: Array.from(unlockedShips),
    },
    pendingDecisionId,
    campaignCompleted: isFinished,
    stats: {
      ...state.stats,
      totalSpaceKills: state.stats.totalSpaceKills + (runStats.spaceKills ?? 0),
      capitalSubsystemsDestroyed:
        state.stats.capitalSubsystemsDestroyed + (runStats.subsystemsDestroyed ?? 0),
      capitalShipsDestroyed:
        state.stats.capitalShipsDestroyed + (runStats.capitalShipsDestroyed ?? 0),
      distanceTraveledKm: Number(
        (state.stats.distanceTraveledKm + (runStats.distanceTraveledKm ?? 0)).toFixed(1),
      ),
      playTimeSec: Math.round(state.stats.playTimeSec + Math.max(0, runStats.elapsedSec ?? 0)),
      missionsCompletedCount: firstClear
        ? state.stats.missionsCompletedCount + 1
        : state.stats.missionsCompletedCount,
      optionalOpsCompletedCount: completedOpt.length,
    },
    savedAtIso: new Date().toISOString(),
  };

  const nextMissionId = mission.isFinalMission
    ? null
    : getMainMissionByNumber(nextMainNum).id;

  const summary: MissionRunSummary = {
    missionId: mission.id,
    missionCode: mission.code,
    missionTitle: mission.title,
    missionSubtitle: mission.subtitle,
    isOptional: mission.isOptional,
    isFinalMission: Boolean(mission.isFinalMission),
    elapsedSec: Math.max(1, Math.round(runStats.elapsedSec ?? 1)),
    spaceKills: Math.max(0, Math.round(runStats.spaceKills ?? 0)),
    subsystemsDestroyed: Math.max(0, Math.round(runStats.subsystemsDestroyed ?? 0)),
    capitalShipsDestroyed: Math.max(0, Math.round(runStats.capitalShipsDestroyed ?? 0)),
    shotsFired,
    shotsHit,
    accuracyPct,
    hullRemainingPct: Math.max(0, Math.min(100, Math.round(runStats.hullRemainingPct ?? 100))),
    distanceTraveledKm: Number((runStats.distanceTraveledKm ?? 0).toFixed(1)),
    firstClear,
    rewardsGranted,
    newlyUnlockedShips,
    nextMissionId,
    pendingDecisionId,
  };

  return { state: nextState, summary };
}

export function applyMissionCompletion(
  state: CampaignState,
  missionId: string,
  runStats: {
    spaceKills?: number;
    subsystemsDestroyed?: number;
    capitalShipsDestroyed?: number;
    distanceTraveledKm?: number;
    elapsedSec?: number;
    shotsFired?: number;
    shotsHit?: number;
    hullRemainingPct?: number;
  } = {},
): CampaignState {
  return applyMissionCompletionWithSummary(state, missionId, runStats).state;
}

export interface LevelCompletionRunStats {
  spaceKills?: number;
  subsystemsDestroyed?: number;
  capitalShipsDestroyed?: number;
  distanceTraveledKm?: number;
  elapsedSec?: number;
  shotsFired?: number;
  shotsHit?: number;
  hullRemainingPct?: number;
  combatScore?: number;
  maxCombo?: number;
  protectedHpPct?: number | null;
  repairKitsUsed?: number;
  legendaryDefeated?: boolean;
  nearMissCount?: number;
  missilesEvaded?: number;
}

/**
 * Applies completion of a specific Campaign Level (e.g., op01_l1 .. op10_l3):
 * - Evaluates C/B/A/S grade, score, optional objective, medals, XP, and Credits.
 * - Grants full level rewards ONCE on first clear (strict anti-duplicate guard).
 * - On replay: updates personal bests (score/grade/accuracy/time), awards zero duplicate
 *   base resources, and only awards one-time grade-upgrade XP/Credit delta if grade improved.
 * - Completing the final level of an Operation also completes that Operation, unlocking its
 *   story ships, strategic decisions, next Operation, and OP 10 finale cleanly.
 */
const EXTINCTION_BOSS_MEDALS: Partial<Record<ExtinctionBossId, string>> = {
  executioner: 'Executioner Breaker',
  carrier_warden: 'Warden Crusher',
  siege_breaker: 'Siege Shatterer',
  iron_revenant: 'Revenant Slayer',
  void_harvester: 'Void Core Breaker',
  sovereign_extinction: 'Extinction Omega Champion',
};

export function setActiveCampaignTrack(
  state: CampaignState,
  track: CampaignTrackId,
): CampaignState {
  return {
    ...state,
    activeCampaignTrack: track,
    extinctionState: normalizeExtinctionState(state.extinctionState),
    savedAtIso: new Date().toISOString(),
  };
}

function buildUpdatedRecordAndPilotRewards(params: {
  state: CampaignState;
  level: ExtinctionLevelDef | NonNullable<ReturnType<typeof getLevelById>>;
  firstClear: boolean;
  existingRecord: LevelCompletionRecord | undefined;
  runStats: LevelCompletionRunStats;
}) {
  const { state, level, firstClear, existingRecord, runStats } = params;
  const perf = evaluateLevelPerformance({
    level,
    combatScore: runStats.combatScore ?? (runStats.spaceKills ?? 0) * 210,
    shotsFired: runStats.shotsFired ?? 0,
    shotsHit: runStats.shotsHit ?? 0,
    kills: runStats.spaceKills ?? 0,
    elapsedSec: Math.max(1, Math.round(runStats.elapsedSec ?? 1)),
    hullRemainingPct: Math.max(0, Math.min(100, Math.round(runStats.hullRemainingPct ?? 100))),
    maxCombo: runStats.maxCombo ?? 1,
    subsystemsDestroyed: runStats.subsystemsDestroyed ?? 0,
    protectedHpPct: runStats.protectedHpPct ?? null,
    repairKitsUsed: runStats.repairKitsUsed ?? 0,
    legendaryDefeated: runStats.legendaryDefeated ?? false,
    nearMissCount: runStats.nearMissCount ?? 0,
    missilesEvaded: runStats.missilesEvaded ?? 0,
  });

  const prevBestScore = existingRecord?.bestScore ?? 0;
  const isNewBestScore = perf.finalScore > prevBestScore;
  const rewardsGranted: CampaignResources = firstClear
    ? {
        salvage: level.rewards.salvage,
        supplies: level.rewards.supplies,
        intel: level.rewards.intel,
        fleetReadiness: level.rewards.fleetReadiness,
      }
    : { salvage: 0, supplies: 0, intel: 0, fleetReadiness: 0 };

  let xpEarned = 0;
  let creditsEarned = 0;
  if (firstClear) {
    xpEarned = perf.xpEarned;
    creditsEarned = perf.creditsEarned;
  } else {
    const upgradeDelta = computeGradeImprovementBonus(
      level,
      existingRecord?.highestRewardedGrade ?? null,
      perf.grade,
    );
    xpEarned = upgradeDelta.xpDelta;
    creditsEarned = upgradeDelta.creditsDelta;
  }

  const prevRankInfo = computePilotRankProgress(state.pilotProgress.xp);
  const nextXp = state.pilotProgress.xp + xpEarned;
  const nextRankInfo = computePilotRankProgress(nextXp);
  const rankedUp = nextRankInfo.currentRank.rankIndex > prevRankInfo.currentRank.rankIndex;

  const nextBestGrade: PerformanceGrade =
    !existingRecord || GRADE_ORDER[perf.grade] > GRADE_ORDER[existingRecord.bestGrade]
      ? perf.grade
      : existingRecord.bestGrade;
  const nextHighestRewardedGrade: PerformanceGrade =
    !existingRecord ||
    GRADE_ORDER[perf.grade] > GRADE_ORDER[existingRecord.highestRewardedGrade]
      ? perf.grade
      : existingRecord.highestRewardedGrade;

  const updatedRecord: LevelCompletionRecord = {
    levelId: level.id,
    bestScore: Math.max(prevBestScore, perf.finalScore),
    bestGrade: nextBestGrade,
    bestAccuracyPct: Math.max(existingRecord?.bestAccuracyPct ?? 0, perf.accuracyPct),
    bestTimeSec: existingRecord
      ? Math.min(existingRecord.bestTimeSec, Math.max(1, Math.round(runStats.elapsedSec ?? 1)))
      : Math.max(1, Math.round(runStats.elapsedSec ?? 1)),
    optionalCompleted: Boolean(existingRecord?.optionalCompleted || perf.optionalCompleted),
    completions: (existingRecord?.completions ?? 0) + 1,
    highestRewardedGrade: nextHighestRewardedGrade,
  };

  return {
    perf,
    prevBestScore,
    isNewBestScore,
    rewardsGranted,
    xpEarned,
    creditsEarned,
    prevRankInfo,
    nextXp,
    nextRankInfo,
    rankedUp,
    updatedRecord,
  };
}

export function applyExtinctionLevelCompletionWithSummary(
  state: CampaignState,
  extLevel: ExtinctionLevelDef,
  runStats: LevelCompletionRunStats = {},
): MissionCompletionResult {
  const prevExt = normalizeExtinctionState(state.extinctionState);
  const firstClear = !prevExt.claimedRewardLevelIds.includes(extLevel.id);
  const existingRecord = prevExt.levelRecords[extLevel.id];

  const {
    perf,
    prevBestScore,
    isNewBestScore,
    rewardsGranted,
    xpEarned,
    creditsEarned,
    prevRankInfo,
    nextXp,
    nextRankInfo,
    rankedUp,
    updatedRecord,
  } = buildUpdatedRecordAndPilotRewards({
    state,
    level: extLevel,
    firstClear,
    existingRecord,
    runStats,
  });

  const bossMedal = extLevel.bossId ? EXTINCTION_BOSS_MEDALS[extLevel.bossId] : undefined;
  const extraMedals = [
    ...(firstClear && extLevel.extinctionNumber === 1 ? ['Extinction Vanguard'] : []),
    ...(bossMedal ? [bossMedal] : []),
    ...(extLevel.isFinalExtinctionMission ? ['Extinction Protocol Victor'] : []),
  ];

  const mergedMedals = Array.from(
    new Set([...(state.pilotProgress.medals ?? []), ...perf.medalsEarned, ...extraMedals]),
  );
  const mergedExtMedals = Array.from(new Set([...prevExt.extinctionMedals, ...extraMedals]));
  const mergedCosmetics = Array.from(
    new Set([
      ...(state.pilotProgress.unlockedCosmetics ?? ['vanguard_standard']),
      ...nextRankInfo.unlockedCosmetics.map((c) => c.id),
      ...(extLevel.isFinalExtinctionMission ? ['extinction_apex'] : []),
    ]),
  );

  const completedLevelIds = Array.from(new Set([...prevExt.completedLevelIds, extLevel.id]));
  const claimedRewardLevelIds = Array.from(new Set([...prevExt.claimedRewardLevelIds, extLevel.id]));
  const nextExt = getNextExtinctionLevel(extLevel.id);
  const unlockedLevelIds = computeUnlockedExtinctionLevelIds({
    completedLevelIds,
    existingUnlockedLevelIds: [...prevExt.unlockedLevelIds, ...(nextExt ? [nextExt.id] : [])],
  });

  const currentExtObj = getExtinctionLevelById(prevExt.currentLevelId);
  const nextCurrentLevelId =
    nextExt && (!currentExtObj || nextExt.extinctionNumber > currentExtObj.extinctionNumber)
      ? nextExt.id
      : prevExt.currentLevelId;

  const defeatedBossIds = extLevel.bossId
    ? Array.from(new Set([...prevExt.defeatedBossIds, extLevel.bossId]))
    : prevExt.defeatedBossIds;

  const isFinal = Boolean(extLevel.isFinalExtinctionMission);
  const nextExtState: ExtinctionCampaignState = {
    unlockedLevelIds,
    completedLevelIds,
    claimedRewardLevelIds,
    currentLevelId: nextCurrentLevelId,
    levelRecords: {
      ...prevExt.levelRecords,
      [extLevel.id]: updatedRecord,
    },
    defeatedBossIds,
    extinctionCompleted: prevExt.extinctionCompleted || isFinal,
    extinctionMedals: mergedExtMedals,
    stats: {
      totalKills: prevExt.stats.totalKills + (runStats.spaceKills ?? 0),
      bossesDefeated: defeatedBossIds.length,
      playTimeSec: Math.round(prevExt.stats.playTimeSec + Math.max(0, runStats.elapsedSec ?? 0)),
    },
  };

  const nextResources: CampaignResources = {
    salvage: state.resources.salvage + rewardsGranted.salvage,
    supplies: state.resources.supplies + rewardsGranted.supplies,
    intel: state.resources.intel + rewardsGranted.intel,
    fleetReadiness: Math.max(
      0,
      Math.min(100, state.resources.fleetReadiness + rewardsGranted.fleetReadiness),
    ),
  };

  const discovered = new Set<SpaceRegionId>(state.discoveredRegions);
  discovered.add(extLevel.spaceRegionId);
  if (nextExt) discovered.add(nextExt.spaceRegionId);

  const nextState: CampaignState = {
    ...state,
    activeCampaignTrack: 'extinction',
    extinctionState: nextExtState,
    pilotProgress: {
      xp: nextXp,
      credits: state.pilotProgress.credits + creditsEarned,
      rankIndex: nextRankInfo.currentRank.rankIndex,
      medals: mergedMedals,
      unlockedCosmetics: mergedCosmetics,
      activeCosmeticId: state.pilotProgress.activeCosmeticId || 'vanguard_standard',
    },
    discoveredRegions: Array.from(discovered),
    resources: nextResources,
    stats: {
      ...state.stats,
      totalSpaceKills: state.stats.totalSpaceKills + (runStats.spaceKills ?? 0),
      capitalSubsystemsDestroyed:
        state.stats.capitalSubsystemsDestroyed + (runStats.subsystemsDestroyed ?? 0),
      capitalShipsDestroyed:
        state.stats.capitalShipsDestroyed + (runStats.capitalShipsDestroyed ?? 0),
      distanceTraveledKm: Number(
        (state.stats.distanceTraveledKm + (runStats.distanceTraveledKm ?? 0)).toFixed(1),
      ),
      playTimeSec: Math.round(state.stats.playTimeSec + Math.max(0, runStats.elapsedSec ?? 0)),
      missionsCompletedCount: firstClear
        ? state.stats.missionsCompletedCount + 1
        : state.stats.missionsCompletedCount,
    },
    savedAtIso: new Date().toISOString(),
  };

  const summary: MissionRunSummary = {
    missionId: EXTINCTION_CAMPAIGN_OPERATION.id,
    missionCode: extLevel.code,
    missionTitle: extLevel.name,
    missionSubtitle: `EXTINCTION CAMPAIGN · ${extLevel.objectiveBadge}`,
    isOptional: false,
    isFinalMission: isFinal,
    campaignTrack: 'extinction',
    bossDefeatedId: extLevel.bossId,
    elapsedSec: Math.max(1, Math.round(runStats.elapsedSec ?? 1)),
    spaceKills: Math.max(0, Math.round(runStats.spaceKills ?? 0)),
    subsystemsDestroyed: Math.max(0, Math.round(runStats.subsystemsDestroyed ?? 0)),
    capitalShipsDestroyed: Math.max(0, Math.round(runStats.capitalShipsDestroyed ?? 0)),
    shotsFired: Math.max(0, Math.round(runStats.shotsFired ?? 0)),
    shotsHit: Math.max(0, Math.round(runStats.shotsHit ?? 0)),
    accuracyPct: perf.accuracyPct,
    hullRemainingPct: Math.max(0, Math.min(100, Math.round(runStats.hullRemainingPct ?? 100))),
    distanceTraveledKm: Number((runStats.distanceTraveledKm ?? 0).toFixed(1)),
    firstClear,
    rewardsGranted,
    newlyUnlockedShips: [],
    nextMissionId: nextExt ? EXTINCTION_CAMPAIGN_OPERATION.id : null,
    pendingDecisionId: null,
    levelId: extLevel.id,
    levelCode: extLevel.code,
    levelName: extLevel.name,
    score: perf.finalScore,
    grade: perf.grade,
    previousBestScore: prevBestScore,
    isNewBestScore,
    optionalCompleted: perf.optionalCompleted,
    optionalObjectiveText: extLevel.optionalObjectiveText,
    medalsEarned: Array.from(new Set([...perf.medalsEarned, ...extraMedals])),
    xpEarned,
    creditsEarned,
    previousRankTitle: prevRankInfo.currentRank.title,
    newRankTitle: nextRankInfo.currentRank.title,
    rankedUp,
    rankUnlockSummary: rankedUp ? nextRankInfo.currentRank.unlockSummary : undefined,
    nextLevelId: nextExt?.id ?? null,
    maxCombo: runStats.maxCombo ?? 1,
    scoreBreakdown: perf.breakdown,
  };

  return { state: nextState, summary };
}

export function applyLevelCompletionWithSummary(
  state: CampaignState,
  levelId: string,
  runStats: LevelCompletionRunStats = {},
): MissionCompletionResult {
  const extLevel = getExtinctionLevelById(levelId);
  if (extLevel) {
    return applyExtinctionLevelCompletionWithSummary(state, extLevel, runStats);
  }
  const level = getLevelById(levelId);
  if (!level) {
    return applyMissionCompletionWithSummary(state, levelId, runStats);
  }
  const parentOp = getMainMissionByNumber(level.operationNumber);
  const alreadyClaimed = state.claimedRewardLevelIds.includes(level.id);
  const firstClear = !alreadyClaimed;

  const {
    perf,
    prevBestScore,
    isNewBestScore,
    rewardsGranted,
    xpEarned,
    creditsEarned,
    prevRankInfo,
    nextXp,
    nextRankInfo,
    rankedUp,
    updatedRecord,
  } = buildUpdatedRecordAndPilotRewards({
    state,
    level,
    firstClear,
    existingRecord: state.levelRecords[level.id],
    runStats,
  });

  const mergedMedals = Array.from(
    new Set([...(state.pilotProgress.medals ?? []), ...perf.medalsEarned]),
  );
  const mergedCosmetics = Array.from(
    new Set([
      ...(state.pilotProgress.unlockedCosmetics ?? ['vanguard_standard']),
      ...nextRankInfo.unlockedCosmetics.map((c) => c.id),
    ]),
  );

  const completedLevelIds = Array.from(new Set([...state.completedLevelIds, level.id]));
  const claimedRewardLevelIds = Array.from(new Set([...state.claimedRewardLevelIds, level.id]));

  const nextLevel = getNextLevel(level.id);
  const completedFinalLevelOfOp = isFinalLevelOfOperation(level.id);

  // Operation-level progression when final level of an operation is cleared
  const completedMainMissions = completedFinalLevelOfOp
    ? Array.from(new Set([...state.completedMainMissions, level.operationNumber])).sort(
        (a, b) => a - b,
      )
    : state.completedMainMissions;
  const claimedRewardMissionIds = completedFinalLevelOfOp
    ? Array.from(new Set([...state.claimedRewardMissionIds, parentOp.id]))
    : state.claimedRewardMissionIds;

  const prevUnlocked = new Set<PlayableShipId>(state.spaceLoadout.unlockedShips);
  const unlockedShips = new Set<PlayableShipId>(state.spaceLoadout.unlockedShips);
  if (completedMainMissions.includes(2)) unlockedShips.add('strike_bomber');
  if (completedMainMissions.includes(3)) unlockedShips.add('recon_craft');
  if (completedMainMissions.includes(6)) unlockedShips.add('advanced_prototype');
  const newlyUnlockedShips = Array.from(unlockedShips).filter((id) => !prevUnlocked.has(id));

  const nextMainNum = completedFinalLevelOfOp
    ? Math.min(
        MAIN_CAMPAIGN_MISSIONS.length,
        Math.max(state.currentMissionNumber, level.operationNumber + 1),
      )
    : Math.max(state.currentMissionNumber, level.operationNumber);

  const discovered = new Set<SpaceRegionId>(state.discoveredRegions);
  discovered.add(level.spaceRegionId);
  if (nextLevel) discovered.add(nextLevel.spaceRegionId);
  discovered.add(getMainMissionByNumber(nextMainNum).spaceRegionId);

  const pendingDecisionId =
    completedFinalLevelOfOp &&
    parentOp.decisionAfterId &&
    !state.decisions[parentOp.decisionAfterId]
      ? parentOp.decisionAfterId
      : state.pendingDecisionId;

  const isFinalCampaignLevel = Boolean(parentOp.isFinalMission && completedFinalLevelOfOp);
  const isFinished = state.campaignCompleted || isFinalCampaignLevel;

  const currentLevelObj = getLevelById(state.currentLevelId);
  const nextCurrentLevelId =
    nextLevel && (!currentLevelObj || nextLevel.globalLevelNumber > currentLevelObj.globalLevelNumber)
      ? nextLevel.id
      : state.currentLevelId;

  const nextResources: CampaignResources = {
    salvage: state.resources.salvage + rewardsGranted.salvage,
    supplies: state.resources.supplies + rewardsGranted.supplies,
    intel: state.resources.intel + rewardsGranted.intel,
    fleetReadiness: Math.max(
      0,
      Math.min(100, state.resources.fleetReadiness + rewardsGranted.fleetReadiness),
    ),
  };

  const unlockedLevelIds = computeUnlockedLevelIds({
    completedLevelIds,
    completedMainMissions,
    currentMissionNumber: nextMainNum,
    existingUnlockedLevelIds: [
      ...(state.unlockedLevelIds ?? ['op01_l1']),
      ...(nextLevel ? [nextLevel.id] : []),
    ],
  });

  const nextState: CampaignState = {
    ...state,
    currentMissionNumber: nextMainNum,
    completedMainMissions,
    claimedRewardMissionIds,
    currentLevelId: nextCurrentLevelId,
    completedLevelIds,
    unlockedLevelIds,
    claimedRewardLevelIds,
    levelRecords: {
      ...state.levelRecords,
      [level.id]: updatedRecord,
    },
    pilotProgress: {
      xp: nextXp,
      credits: state.pilotProgress.credits + creditsEarned,
      rankIndex: nextRankInfo.currentRank.rankIndex,
      medals: mergedMedals,
      unlockedCosmetics: mergedCosmetics,
      activeCosmeticId: state.pilotProgress.activeCosmeticId || 'vanguard_standard',
    },
    discoveredRegions: Array.from(discovered),
    resources: nextResources,
    spaceLoadout: {
      ...state.spaceLoadout,
      unlockedShips: Array.from(unlockedShips),
    },
    pendingDecisionId,
    campaignCompleted: isFinished,
    stats: {
      ...state.stats,
      totalSpaceKills: state.stats.totalSpaceKills + (runStats.spaceKills ?? 0),
      capitalSubsystemsDestroyed:
        state.stats.capitalSubsystemsDestroyed + (runStats.subsystemsDestroyed ?? 0),
      capitalShipsDestroyed:
        state.stats.capitalShipsDestroyed + (runStats.capitalShipsDestroyed ?? 0),
      distanceTraveledKm: Number(
        (state.stats.distanceTraveledKm + (runStats.distanceTraveledKm ?? 0)).toFixed(1),
      ),
      playTimeSec: Math.round(state.stats.playTimeSec + Math.max(0, runStats.elapsedSec ?? 0)),
      missionsCompletedCount:
        firstClear && completedFinalLevelOfOp
          ? state.stats.missionsCompletedCount + 1
          : state.stats.missionsCompletedCount,
      legendaryPilotsDefeated:
        (state.stats.legendaryPilotsDefeated ?? 0) + (runStats.legendaryDefeated ? 1 : 0),
    },
    savedAtIso: new Date().toISOString(),
  };

  const summary: MissionRunSummary = {
    missionId: parentOp.id,
    missionCode: level.code,
    missionTitle: level.name,
    missionSubtitle: `${parentOp.code}: ${parentOp.title} · ${level.objectiveBadge}`,
    isOptional: false,
    isFinalMission: isFinalCampaignLevel,
    elapsedSec: Math.max(1, Math.round(runStats.elapsedSec ?? 1)),
    spaceKills: Math.max(0, Math.round(runStats.spaceKills ?? 0)),
    subsystemsDestroyed: Math.max(0, Math.round(runStats.subsystemsDestroyed ?? 0)),
    capitalShipsDestroyed: Math.max(0, Math.round(runStats.capitalShipsDestroyed ?? 0)),
    shotsFired: Math.max(0, Math.round(runStats.shotsFired ?? 0)),
    shotsHit: Math.max(0, Math.round(runStats.shotsHit ?? 0)),
    accuracyPct: perf.accuracyPct,
    hullRemainingPct: Math.max(0, Math.min(100, Math.round(runStats.hullRemainingPct ?? 100))),
    distanceTraveledKm: Number((runStats.distanceTraveledKm ?? 0).toFixed(1)),
    firstClear,
    rewardsGranted,
    newlyUnlockedShips,
    nextMissionId: nextLevel ? nextLevel.operationId : null,
    pendingDecisionId,
    levelId: level.id,
    levelCode: level.code,
    levelName: level.name,
    score: perf.finalScore,
    grade: perf.grade,
    previousBestScore: prevBestScore,
    isNewBestScore,
    optionalCompleted: perf.optionalCompleted,
    optionalObjectiveText: level.optionalObjectiveText,
    medalsEarned: perf.medalsEarned,
    xpEarned,
    creditsEarned,
    previousRankTitle: prevRankInfo.currentRank.title,
    newRankTitle: nextRankInfo.currentRank.title,
    rankedUp,
    rankUnlockSummary: rankedUp ? nextRankInfo.currentRank.unlockSummary : undefined,
    nextLevelId: nextLevel?.id ?? null,
    maxCombo: runStats.maxCombo ?? 1,
    scoreBreakdown: perf.breakdown,
  };

  return { state: nextState, summary };
}

export function selectPilotCosmeticLivery(
  state: CampaignState,
  cosmeticId: string,
): { state: CampaignState; applied: boolean } {
  const livery = COSMETIC_LIVERIES.find((c) => c.id === cosmeticId);
  if (!livery) return { state, applied: false };
  const rankInfo = computePilotRankProgress(state.pilotProgress.xp);
  const unlocked =
    livery.requiredRankIndex <= rankInfo.currentRank.rankIndex ||
    state.pilotProgress.unlockedCosmetics.includes(cosmeticId);
  if (!unlocked) return { state, applied: false };
  return {
    applied: true,
    state: {
      ...state,
      pilotProgress: {
        ...state.pilotProgress,
        activeCosmeticId: cosmeticId,
      },
      savedAtIso: new Date().toISOString(),
    },
  };
}

/**
 * Allows players to exchange earned Pilot Credits for strategic Salvage/Supplies in the Hangar,
 * making Credits tangibly rewarding without breaking resource balance.
 */
export function exchangeCreditsForHangarKit(
  state: CampaignState,
): { state: CampaignState; applied: boolean; reason?: string } {
  const cost = 220;
  if ((state.pilotProgress?.credits ?? 0) < cost) {
    return { state, applied: false, reason: 'Need 220 Credits' };
  }
  return {
    applied: true,
    state: {
      ...state,
      resources: {
        ...state.resources,
        salvage: state.resources.salvage + 100,
        supplies: state.resources.supplies + 40,
      },
      pilotProgress: {
        ...state.pilotProgress,
        credits: state.pilotProgress.credits - cost,
      },
      savedAtIso: new Date().toISOString(),
    },
  };
}

export function applyStrategicDecision(
  state: CampaignState,
  decisionId: StrategicDecisionDef['id'],
  choiceId: string,
): CampaignState {
  const def = STRATEGIC_DECISIONS[decisionId];
  if (!def) return state;
  const choice =
    def.choiceA.id === choiceId ? def.choiceA : def.choiceB.id === choiceId ? def.choiceB : null;
  if (!choice || state.decisions[decisionId]) return state;

  const d = choice.resourceDelta;
  const nextResources: CampaignResources = {
    salvage: Math.max(0, state.resources.salvage + (d.salvage ?? 0)),
    supplies: Math.max(0, state.resources.supplies + (d.supplies ?? 0)),
    intel: Math.max(0, state.resources.intel + (d.intel ?? 0)),
    fleetReadiness: Math.max(
      0,
      Math.min(100, state.resources.fleetReadiness + (d.fleetReadiness ?? 0)),
    ),
  };

  return {
    ...state,
    resources: nextResources,
    decisions: {
      ...state.decisions,
      [decisionId]: choice.id,
    },
    pendingDecisionId: state.pendingDecisionId === decisionId ? null : state.pendingDecisionId,
    stats: {
      ...state.stats,
      decisionsMadeCount: Object.keys(state.decisions).length + 1,
    },
    savedAtIso: new Date().toISOString(),
  };
}

export type UpgradeActionType =
  | 'space_pulse'
  | 'space_plasma'
  | 'space_emp'
  | 'space_rail'
  | 'space_shields'
  | 'space_engines'
  | 'space_missiles'
  | 'space_countermeasures'
  | 'space_allied_support'
  | 'unlock_strike_bomber'
  | 'unlock_recon_craft'
  | 'unlock_prototype'
  | 'repair_ship';

export interface UpgradeCost {
  salvage: number;
  supplies: number;
  intel: number;
}

export function getUpgradeCost(state: CampaignState, action: UpgradeActionType): UpgradeCost {
  switch (action) {
    case 'space_pulse':
      return { salvage: 115 * state.spaceLoadout.pulseLevel, supplies: 30, intel: 0 };
    case 'space_plasma':
      return { salvage: 130 * state.spaceLoadout.plasmaLevel, supplies: 35, intel: 0 };
    case 'space_emp':
      return { salvage: 110 * state.spaceLoadout.empLevel, supplies: 20, intel: 25 };
    case 'space_rail':
      return { salvage: 145 * state.spaceLoadout.railLevel, supplies: 30, intel: 30 };
    case 'space_shields':
      return { salvage: 115 * state.spaceLoadout.shieldLevel, supplies: 30, intel: 0 };
    case 'space_engines':
      return { salvage: 110 * state.spaceLoadout.engineLevel, supplies: 25, intel: 0 };
    case 'space_missiles':
      return { salvage: 75, supplies: 45, intel: 0 };
    case 'space_countermeasures':
      return { salvage: 95 * state.spaceLoadout.countermeasureLevel, supplies: 30, intel: 15 };
    case 'space_allied_support':
      return { salvage: 130 * state.spaceLoadout.alliedSupportLevel, supplies: 50, intel: 20 };
    case 'unlock_strike_bomber':
      return { salvage: 160, supplies: 40, intel: 15 };
    case 'unlock_recon_craft':
      return { salvage: 150, supplies: 30, intel: 30 };
    case 'unlock_prototype':
      return { salvage: 320, supplies: 80, intel: 75 };
    case 'repair_ship':
      return { salvage: 55, supplies: 20, intel: 0 };
  }
}

export function canAffordCost(res: CampaignResources, cost: UpgradeCost): boolean {
  return res.salvage >= cost.salvage && res.supplies >= cost.supplies && res.intel >= cost.intel;
}

export function applyCampaignUpgrade(
  state: CampaignState,
  action: UpgradeActionType,
): { state: CampaignState; applied: boolean; reason?: string } {
  const cost = getUpgradeCost(state, action);
  if (!canAffordCost(state.resources, cost)) {
    return { state, applied: false, reason: 'Insufficient campaign resources' };
  }

  const spend = (): CampaignResources => ({
    ...state.resources,
    salvage: state.resources.salvage - cost.salvage,
    supplies: state.resources.supplies - cost.supplies,
    intel: state.resources.intel - cost.intel,
  });

  const sl = state.spaceLoadout;

  if (action === 'space_pulse') {
    if (sl.pulseLevel >= 3) return { state, applied: false, reason: 'Max level' };
    return { applied: true, state: { ...state, resources: spend(), spaceLoadout: { ...sl, pulseLevel: sl.pulseLevel + 1 } } };
  }
  if (action === 'space_plasma') {
    if (sl.plasmaLevel >= 3) return { state, applied: false, reason: 'Max level' };
    return { applied: true, state: { ...state, resources: spend(), spaceLoadout: { ...sl, plasmaLevel: sl.plasmaLevel + 1 } } };
  }
  if (action === 'space_emp') {
    if (sl.empLevel >= 3) return { state, applied: false, reason: 'Max level' };
    return { applied: true, state: { ...state, resources: spend(), spaceLoadout: { ...sl, empLevel: sl.empLevel + 1 } } };
  }
  if (action === 'space_rail') {
    if (sl.railLevel >= 3) return { state, applied: false, reason: 'Max level' };
    return { applied: true, state: { ...state, resources: spend(), spaceLoadout: { ...sl, railLevel: sl.railLevel + 1 } } };
  }
  if (action === 'space_shields') {
    if (sl.shieldLevel >= 3) return { state, applied: false, reason: 'Max level' };
    return { applied: true, state: { ...state, resources: spend(), spaceLoadout: { ...sl, shieldLevel: sl.shieldLevel + 1 } } };
  }
  if (action === 'space_engines') {
    if (sl.engineLevel >= 3) return { state, applied: false, reason: 'Max level' };
    return { applied: true, state: { ...state, resources: spend(), spaceLoadout: { ...sl, engineLevel: sl.engineLevel + 1 } } };
  }
  if (action === 'space_missiles') {
    if (sl.missileCapacity >= 24) return { state, applied: false, reason: 'Max capacity' };
    return { applied: true, state: { ...state, resources: spend(), spaceLoadout: { ...sl, missileCapacity: sl.missileCapacity + 2 } } };
  }
  if (action === 'space_countermeasures') {
    if (sl.countermeasureLevel >= 3) return { state, applied: false, reason: 'Max level' };
    return { applied: true, state: { ...state, resources: spend(), spaceLoadout: { ...sl, countermeasureLevel: sl.countermeasureLevel + 1 } } };
  }
  if (action === 'space_allied_support') {
    if (sl.alliedSupportLevel >= 3) return { state, applied: false, reason: 'Max level' };
    return { applied: true, state: { ...state, resources: spend(), spaceLoadout: { ...sl, alliedSupportLevel: sl.alliedSupportLevel + 1 } } };
  }
  if (action === 'unlock_strike_bomber') {
    if (sl.unlockedShips.includes('strike_bomber')) return { state, applied: false, reason: 'Already unlocked' };
    return {
      applied: true,
      state: {
        ...state,
        resources: spend(),
        spaceLoadout: {
          ...sl,
          unlockedShips: [...sl.unlockedShips, 'strike_bomber'],
          selectedShipId: 'strike_bomber',
          chassisConfig: shipIdToChassisAlias('strike_bomber'),
        },
      },
    };
  }
  if (action === 'unlock_recon_craft') {
    if (sl.unlockedShips.includes('recon_craft')) return { state, applied: false, reason: 'Already unlocked' };
    return {
      applied: true,
      state: {
        ...state,
        resources: spend(),
        spaceLoadout: {
          ...sl,
          unlockedShips: [...sl.unlockedShips, 'recon_craft'],
          selectedShipId: 'recon_craft',
          chassisConfig: shipIdToChassisAlias('recon_craft'),
        },
      },
    };
  }
  if (action === 'unlock_prototype') {
    if (sl.unlockedShips.includes('advanced_prototype')) return { state, applied: false, reason: 'Already unlocked' };
    return {
      applied: true,
      state: {
        ...state,
        resources: spend(),
        spaceLoadout: {
          ...sl,
          unlockedShips: [...sl.unlockedShips, 'advanced_prototype'],
          selectedShipId: 'advanced_prototype',
          chassisConfig: shipIdToChassisAlias('advanced_prototype'),
        },
      },
    };
  }
  if (action === 'repair_ship') {
    if (sl.shipHullCondition >= 100) return { state, applied: false, reason: 'Hull at 100%' };
    return { applied: true, state: { ...state, resources: spend(), spaceLoadout: { ...sl, shipHullCondition: 100 } } };
  }

  return { state, applied: false };
}

export function purchaseTradeOffModule(
  state: CampaignState,
  moduleId: TradeOffModuleId,
): { state: CampaignState; applied: boolean; reason?: string } {
  const def = UPGRADE_TRADE_OFF_MODULES.find((m) => m.id === moduleId);
  if (!def) return { state, applied: false, reason: 'Unknown engineering module' };
  const owned = state.spaceLoadout.ownedModules ?? [];
  if (owned.includes(moduleId)) {
    return { state, applied: false, reason: 'Already owned' };
  }
  const cost: UpgradeCost = {
    salvage: def.cost.salvage ?? 0,
    supplies: def.cost.supplies ?? 0,
    intel: def.cost.intel ?? 0,
  };
  if (!canAffordCost(state.resources, cost)) {
    return { state, applied: false, reason: 'Insufficient campaign resources' };
  }
  const nextOwned = [...owned, moduleId];
  const prevEquipped = state.spaceLoadout.equippedModules ?? [];
  // Auto-equip up to 2 active engineering trade-off modules simultaneously
  const nextEquipped =
    prevEquipped.length < 2 ? [...prevEquipped, moduleId] : [...prevEquipped.slice(1), moduleId];

  return {
    applied: true,
    state: {
      ...state,
      resources: {
        ...state.resources,
        salvage: state.resources.salvage - cost.salvage,
        supplies: state.resources.supplies - cost.supplies,
        intel: state.resources.intel - cost.intel,
      },
      spaceLoadout: {
        ...state.spaceLoadout,
        ownedModules: nextOwned,
        equippedModules: nextEquipped,
      },
      savedAtIso: new Date().toISOString(),
    },
  };
}

export function toggleTradeOffModule(
  state: CampaignState,
  moduleId: TradeOffModuleId,
): { state: CampaignState; changed: boolean } {
  const owned = state.spaceLoadout.ownedModules ?? [];
  if (!owned.includes(moduleId)) return { state, changed: false };
  const equipped = state.spaceLoadout.equippedModules ?? [];
  let nextEquipped: TradeOffModuleId[];
  if (equipped.includes(moduleId)) {
    nextEquipped = equipped.filter((id) => id !== moduleId);
  } else {
    nextEquipped = equipped.length < 2 ? [...equipped, moduleId] : [...equipped.slice(1), moduleId];
  }
  return {
    changed: true,
    state: {
      ...state,
      spaceLoadout: {
        ...state.spaceLoadout,
        equippedModules: nextEquipped,
      },
      savedAtIso: new Date().toISOString(),
    },
  };
}

export interface CampaignEndingSummary {
  variant: 'triumphant_liberation' | 'hard_won_victory' | 'pyrrhic_stand';
  title: string;
  subtitle: string;
  commanderFate: string;
  planetFate: string;
  consequences: string[];
  masteryRank: 'S' | 'A' | 'B' | 'C';
}

export function evaluateCampaignEnding(state: CampaignState): CampaignEndingSummary {
  const fleet = state.resources.fleetReadiness;
  const optCount = state.completedOptionalIds.length;

  const consequences: string[] = [];
  for (const def of Object.values(STRATEGIC_DECISIONS)) {
    const chosenId = state.decisions[def.id];
    if (chosenId === def.choiceA.id) consequences.push(def.choiceA.epilogueText);
    else if (chosenId === def.choiceB.id) consequences.push(def.choiceB.epilogueText);
  }
  if (consequences.length === 0) {
    consequences.push(
      'Wing Commander Kael Voss led the orbital strike straight through the Sovereign’s Defence Zone, shattering Eternal Eclipse in open space.',
    );
  }

  let variant: CampaignEndingSummary['variant'] = 'hard_won_victory';
  let title = 'AETHER PRIME ORBIT LIBERATED';
  let subtitle = 'ETERNAL ECLIPSE DESTROYED — THE SOVEREIGN ARMADA BROKEN';
  let commanderFate =
    'Wing Commander Kael Voss brought his battered starfighter home to CSV Aegis as the burning wreckage of Eternal Eclipse drifted into deep space, rising to command Aether Prime’s rebuilt Orbital Defense Fleet.';
  let planetFate =
    'With the Sovereign’s flagship destroyed, the alien armada fractured and retreated beyond the Outer Frontier. Beneath clearing orbital lanes, Aether Prime begins its recovery.';

  if (fleet >= 75 && optCount >= 1) {
    variant = 'triumphant_liberation';
    title = 'TRIUMPHANT FLEET LIBERATION';
    subtitle = 'THE SOVEREIGN ARMADA SHATTERED · VANGUARD FLEET VICTORIOUS';
    commanderFate =
      'Wing Commander Kael Voss became the legendary ace of the Aether Prime War. His strategic fleet discipline preserved CSV Aegis and secured humanity’s star lanes for a generation.';
    planetFate =
      'Backed by an intact carrier group and fortified orbital platforms across all five sectors, Aether Prime enters a new era of deep-space vigilance and peace.';
  } else if (fleet < 45) {
    variant = 'pyrrhic_stand';
    title = 'THE LAST STAND ENDURED';
    subtitle = 'VICTORY AMONG THE SHATTERED STARS';
    commanderFate =
      'Flying on failing thrusters and cracked canopy glass, Kael Voss delivered the final Rail Cannon strike into Eternal Eclipse’s reactor before coasting back toward Aether Prime’s blue horizon.';
    planetFate =
      'Aether Prime is free, though the orbital armada paid dearly across five sectors of fire. Survivors gather aboard the remaining defense stations to rebuild from the wreckage.';
  }

  const score =
    state.completedMainMissions.length * 10 +
    optCount * 12 +
    Math.round(fleet * 0.4) +
    Math.min(25, state.stats.capitalSubsystemsDestroyed * 3);
  const masteryRank: CampaignEndingSummary['masteryRank'] =
    score >= 135 ? 'S' : score >= 110 ? 'A' : score >= 85 ? 'B' : 'C';

  return {
    variant,
    title,
    subtitle,
    commanderFate,
    planetFate,
    consequences,
    masteryRank,
  };
}

export function serializeCampaignState(state: CampaignState): string {
  return JSON.stringify(state);
}

export function deserializeCampaignState(raw: string | null): CampaignState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CampaignState>;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 2) return null;
    const base = createInitialCampaignState(parsed.difficulty ?? 'normal');
    const completedMainMissions = Array.isArray(parsed.completedMainMissions)
      ? parsed.completedMainMissions
      : [];
    const currentMissionNumber = Math.max(
      1,
      Math.min(MAIN_CAMPAIGN_MISSIONS.length, Number(parsed.currentMissionNumber ?? 1)),
    );
    const migratedCurrentLevelId =
      typeof parsed.currentLevelId === 'string' && getLevelById(parsed.currentLevelId)
        ? parsed.currentLevelId
        : getFirstLevelForOperation(currentMissionNumber).id;

    const rawPilot = parsed.pilotProgress ?? base.pilotProgress;
    const xp = Math.max(0, Math.round(Number(rawPilot.xp ?? 0)));
    const rankInfo = computePilotRankProgress(xp);
    const unlockedCosmetics = Array.from(
      new Set([
        'vanguard_standard',
        ...(Array.isArray(rawPilot.unlockedCosmetics) ? rawPilot.unlockedCosmetics : []),
        ...rankInfo.unlockedCosmetics.map((c) => c.id),
      ]),
    );

    const completedLevelIds = Array.isArray(parsed.completedLevelIds)
      ? Array.from(new Set(parsed.completedLevelIds.filter((id) => typeof id === 'string' && Boolean(getLevelById(id)))))
      : [];
    const unlockedLevelIds = computeUnlockedLevelIds({
      completedLevelIds,
      completedMainMissions,
      currentMissionNumber,
      existingUnlockedLevelIds: Array.isArray(parsed.unlockedLevelIds)
        ? parsed.unlockedLevelIds.filter((id) => typeof id === 'string')
        : undefined,
    });

    return {
      ...base,
      ...parsed,
      currentMissionNumber,
      currentLevelId: migratedCurrentLevelId,
      completedLevelIds,
      unlockedLevelIds,
      claimedRewardLevelIds: Array.isArray(parsed.claimedRewardLevelIds)
        ? parsed.claimedRewardLevelIds
        : completedLevelIds,
      levelRecords:
        parsed.levelRecords && typeof parsed.levelRecords === 'object'
          ? parsed.levelRecords
          : {},
      pilotProgress: {
        xp,
        credits: Math.max(0, Math.round(Number(rawPilot.credits ?? 0))),
        rankIndex: rankInfo.currentRank.rankIndex,
        medals: Array.isArray(rawPilot.medals) ? rawPilot.medals : [],
        unlockedCosmetics,
        activeCosmeticId:
          typeof rawPilot.activeCosmeticId === 'string' &&
          unlockedCosmetics.includes(rawPilot.activeCosmeticId)
            ? rawPilot.activeCosmeticId
            : 'vanguard_standard',
      },
      resources: { ...base.resources, ...(parsed.resources ?? {}) },
      spaceLoadout: {
        ...base.spaceLoadout,
        ...(parsed.spaceLoadout ?? {}),
        unlockedShips:
          Array.isArray(parsed.spaceLoadout?.unlockedShips) &&
          parsed.spaceLoadout.unlockedShips.length > 0
            ? parsed.spaceLoadout.unlockedShips
            : base.spaceLoadout.unlockedShips,
        ownedModules: Array.isArray(parsed.spaceLoadout?.ownedModules)
          ? parsed.spaceLoadout.ownedModules
          : [],
        equippedModules: Array.isArray(parsed.spaceLoadout?.equippedModules)
          ? parsed.spaceLoadout.equippedModules
          : [],
      },
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
      decisions: { ...(parsed.decisions ?? {}) },
      completedMainMissions,
      completedOptionalIds: Array.isArray(parsed.completedOptionalIds)
        ? parsed.completedOptionalIds
        : [],
      claimedRewardMissionIds: Array.isArray(parsed.claimedRewardMissionIds)
        ? parsed.claimedRewardMissionIds
        : [
            ...completedMainMissions.map((n) => getMainMissionByNumber(n).id),
            ...(Array.isArray(parsed.completedOptionalIds) ? parsed.completedOptionalIds : []),
          ],
      discoveredRegions:
        Array.isArray(parsed.discoveredRegions) && parsed.discoveredRegions.length > 0
          ? parsed.discoveredRegions
          : base.discoveredRegions,
      activeCampaignTrack:
        parsed.activeCampaignTrack === 'extinction' ? 'extinction' : 'original',
      extinctionState: normalizeExtinctionState(parsed.extinctionState),
      saveRevision: Math.max(0, Math.round(Number(parsed.saveRevision ?? 0))),
    };
  } catch {
    return null;
  }
}

let lastSaveLayerStatus: CampaignSaveLayerStatus = {
  localStorage: false,
  sessionStorage: false,
  windowName: false,
  indexedDbQueued: false,
};

export function getLastSaveLayerStatus(): CampaignSaveLayerStatus {
  return { ...lastSaveLayerStatus };
}

export function saveCampaignToStorage(state: CampaignState): boolean {
  const nextRevision = (state.saveRevision ?? 0) + 1;
  const extNorm = normalizeExtinctionState(state.extinctionState);
  const authoritativeState: CampaignState = {
    ...state,
    activeCampaignTrack:
      state.activeCampaignTrack === 'extinction' ? 'extinction' : 'original',
    extinctionState: extNorm,
    unlockedLevelIds: computeUnlockedLevelIds({
      completedLevelIds: state.completedLevelIds ?? [],
      completedMainMissions: state.completedMainMissions ?? [],
      currentMissionNumber: state.currentMissionNumber ?? 1,
      existingUnlockedLevelIds: state.unlockedLevelIds,
    }),
    saveRevision: nextRevision,
    savedAtIso: new Date().toISOString(),
  };
  // Mutate the in-memory reference's revision/timestamp so subsequent saves stay monotonic
  state.saveRevision = authoritativeState.saveRevision;
  state.savedAtIso = authoritativeState.savedAtIso;
  state.unlockedLevelIds = authoritativeState.unlockedLevelIds;
  state.extinctionState = authoritativeState.extinctionState;
  state.activeCampaignTrack = authoritativeState.activeCampaignTrack;

  const serialized = serializeCampaignState(authoritativeState);
  lastSaveLayerStatus = writeCampaignToAllLayers(serialized);
  return (
    lastSaveLayerStatus.localStorage ||
    lastSaveLayerStatus.sessionStorage ||
    lastSaveLayerStatus.windowName ||
    lastSaveLayerStatus.indexedDbQueued
  );
}

export function loadCampaignFromStorage(): CampaignState | null {
  return readCampaignFromSyncLayers(deserializeCampaignState, serializeCampaignState);
}

export async function hydrateCampaignFromAsyncStorage(
  currentState: CampaignState | null,
): Promise<CampaignState | null> {
  const idbState = await readCampaignFromIndexedDb(deserializeCampaignState);
  if (!idbState) return null;
  if (currentState && !isCandidateFresher(idbState, currentState)) {
    return null;
  }
  // Mirror recovered durable IndexedDB save back to synchronous storage layers
  writeCampaignToAllLayers(serializeCampaignState(idbState), undefined, false);
  return idbState;
}

export function clearCampaignStorage(): void {
  clearCampaignFromAllLayers();
}

export { hasCampaignProgression };
