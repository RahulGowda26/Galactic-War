import * as THREE from 'three';
import {
  CAPITAL_SUBSYSTEM_KEYS,
  DEFAULT_FLIGHT_SETTINGS,
  ENEMY_FIGHTER_ROLES,
  PLAYABLE_SHIPS,
  SPACE_ENCOUNTERS,
  SPACE_REGIONS,
  SPACE_REGION_LIST,
  SPACE_WEAPONS,
  applyCapitalSubsystemDamage,
  applyShipDamage,
  applyShipRepair,
  computeAsteroidCollision,
  computeCapitalShipPerformance,
  computeSpaceRegionDistanceKm,
  createCapitalShipStatus,
  evaluateAsteroidProximity,
  isAsteroidBreakable,
  selectVisibleEnemyHealthBars,
  stepFlightStability,
  stepSpacecraftSpeed,
  stepTargetLock,
  type AsteroidProximityAlert,
  type AsteroidSeverity,
  type CapitalShipStatus,
  type CapitalSubsystemKey,
  type EnemyFighterRole,
  type EnemyHealthBarCandidate,
  type EnemyHealthBarMarker,
  type EnemyShipClass,
  type FlightControlSettings,
  type FlightInputState,
  type FlightInstabilityState,
  type PlayableShipId,
  type ShipImpactZone,
  type ShipVitalsState,
  type SpaceEncounterId,
  type SpaceRegionId,
  type SpaceWeaponId,
} from '../world/spacePhysics';
import { DIFFICULTY_PROFILES, type DifficultyId } from '../world/campaignConfig';
import {
  deriveThreatLevel,
  formatEnemyClassification,
  isTargetOccludedBySpheres,
  layoutEnemyTargetIndicators,
  makeCenterRect,
  type NormRect,
  type OccluderSphere,
  type OffscreenTargetIndicator,
  type ResolvedTargetMarker,
  type TargetHudCandidate,
  type TargetHudSmoothingState,
  type TargetHudViewportContext,
  type TargetThreatLevel,
} from '../world/targetHudLayout';
import {
  canExecuteWeaponAction,
  computeMissionTacticalProfile,
  computePredictiveAimPoint,
  computeWeaponDamageBreakdown,
  segmentIntersectsSphere,
  selectActiveAttackerIds,
  stepMissileGuidance,
} from '../world/combatTactics';
import { computeAsteroidAvoidanceVector } from '../world/weaponFeedback';
import {
  classifyDestructionClass,
  type DestructionClass,
} from '../world/shipDestruction';
import {
  LEGENDARY_PILOTS,
  SECTOR_ASTEROID_PROFILES,
  SpatialAsteroidGrid,
  VANGUARD_WINGMEN_ROSTER,
  computeEquippedUpgradeModifiers,
  createReinforcementDirector,
  evaluateMissionMoment,
  generateSectorAsteroidLayout,
  getLegendaryPilotForMission,
  getWingmanCommandAck,
  selectWingmanObjectiveTarget,
  stepEnemyDogfightManoeuvre,
  stepReinforcementDirector,
  type CombatScenarioKind,
  type DogfightManeuverState,
  type LegendaryPilotDef,
  type MissionMomentDef,
  type ReinforcementDirectorState,
  type ReinforcementStage,
  type SpatialObstacleRef,
  type WingmanCommandId,
  type WingmanStatusSnapshot,
} from '../world/combatExpansion';
import {
  CALIBRATED_HIT_RADII,
  WEAPON_BALLISTICS,
  advanceProjectileSegment,
  canLaunchHomingMissile,
  computeAimDirectionWithAssist,
  computeConsecutiveHitMultiplier,
  computeDistanceDamageFalloff,
} from '../world/ballistics';
import {
  getScaledEscapeTimerSec,
  getScaledLevelTimeLimitSec,
  type CampaignLevelDef,
} from '../world/campaignLevels';
import {
  getAnyEnemyRoleConfig,
  getExtinctionLevelById,
  type CampaignTrackId,
  type ExtinctionBossId,
  type ExtinctionBossKind,
  type ExtinctionEnemyRole,
  type ExtinctionEventKind,
  type ExtinctionLevelDef,
} from '../world/extinctionCampaign';
import {
  DISRUPTOR_SHIELD_SUPPORT_RANGE_METERS,
  MAX_ACTIVE_HUNTER_DRONES,
  computeFleetFormationOrder,
  computeHunterDroneSwarmVector,
  createBattleDirector,
  createDisruptorFieldState,
  createOrbitalKillZonePylons,
  createPhantomCloakState,
  evaluateAggregateDisruptorEw,
  stepBattleDirector,
  stepDisruptorField,
  stepOrbitalKillZonePylon,
  stepPhantomCloak,
  type AggregateEwEffect,
  type BattleDirectorState,
  type DisruptorFieldState,
  type OrbitalKillZonePylon,
  type PhantomCloakState,
} from '../world/extinctionCombat';
import {
  applyStandaloneBossDamage,
  createBossStateMachine,
  damageHarvesterCore,
  stepBossStateMachine,
  type BossStateMachine,
  type HarvesterEnergyCoreState,
} from '../world/bossStateMachines';
import {
  createCombatScoreState,
  evaluateOptionalObjective,
  recordCombatHit,
  recordCombatKill,
  recordCombatMiss,
  recordMissileEvadedBonus,
  recordNearMissBonus,
  recordPlayerHullDamagePenalty,
  recordSubsystemBreakScore,
  tickCombatScoreState,
  type CombatBonusCallout,
  type CombatScoreState,
} from '../world/combatScoring';
import {
  createSquadronDialogueDirector,
  requestSquadronDialogue,
} from '../world/squadronDialogue';
import {
  createCapitalHelmState,
  stepCapitalShipMovement,
  createEscortSquadronPlan,
  computeEscortTacticalState,
  shouldLaunchEscortReinforcement,
  createCapitalCriticalCountdown,
  stepCapitalCriticalCountdown,
  computeCapitalBlastDamage,
  CAPITAL_BLAST_DANGER_RADIUS_METERS,
  type CapitalCriticalCountdownState,
  type CapitalHelmState,
  type EscortSquadronPlan,
  type EscortWingRole,
} from '../world/capitalShipTactics';
import {
  resolveSweptSolidCollision,
  computeSolidImpactDamage,
  computePredictiveAsteroidAvoidance,
  evaluateClosingProximityWarning,
  SOLID_COLLISION_COOLDOWN_SEC,
  type SolidSphereCollider,
  type ProximityWarningResult,
} from '../world/solidCollisions';
import type {
  CampaignDecisionEffects,
  CampaignMissionDef,
  MissionFailureCause,
  SpaceLoadout,
} from '../world/strategicCampaign';
import type { WorldMaterialLibrary } from './materials';
import type { SpaceCameraMode, ValkyrieSpacecraft } from './spacecraft';
import type { ExplosionSystem, ShipDestructionStageEvent } from './explosionSystem';

export interface SpaceRadarBlip {
  id: string;
  x: number; // -1..1 (right)
  z: number; // -1..1 (forward = -1, rear = +1)
  kind: 'fighter' | 'capital' | 'friendly' | 'asteroid' | 'beacon' | 'waypoint';
  isLocked?: boolean;
}

export interface WaypointHudInfo {
  id: string;
  label: string;
  distanceKm: number;
  screenX: number;
  screenY: number;
  inView: boolean;
  cleared: boolean;
}

export interface SelectedTargetHudInfo {
  id: string;
  name: string;
  classification: string;
  shipClass: EnemyShipClass;
  threatLevel: TargetThreatLevel;
  distanceMeters: number;
  hullPct: number;
  shieldPct: number;
  hasShields: boolean;
  lockProgress: number;
  isLocked: boolean;
  isOccluded: boolean;
  isCapital: boolean;
  activeSubsystems?: number;
  totalSubsystems?: number;
}

export interface SpaceHudSnapshot {
  speed: number;
  altitudeKm: number;
  throttlePct: number;
  isBoosting: boolean;
  boostState: 'ready' | 'boosting' | 'recharging' | 'low';
  isSupercruise: boolean;
  autopilotActive: boolean;
  boostEnergy: number;
  weaponHeat: number;
  railChargePct: number;
  activeWeapon: SpaceWeaponId;
  activeWeaponName: string;
  selectedShipId: PlayableShipId;
  selectedShipName: string;
  missilesRemaining: number;
  maxMissiles: number;
  countermeasuresRemaining: number;
  maxCountermeasures: number;
  shield: number;
  maxShield: number;
  hull: number;
  maxHull: number;
  engineIntegrity: number;
  controlIntegrity: number;
  weaponIntegrity: number;
  repairKits: number;
  kills: number;
  subsystemsDestroyedCount: number;
  capitalShipsDestroyedCount: number;
  distanceTraveledKm: number;
  hostilesRemaining: number;
  activeZoneLabel: string;
  zonesClearedCount: number;
  zonesTotalCount: number;
  waypoints: WaypointHudInfo[];
  // 5-Region 80km Expanded Space Theater & Mission State
  currentRegionId: SpaceRegionId;
  regionCode: string;
  regionLabel: string;
  regionSubtitle: string;
  regionDistancesKm: Record<SpaceRegionId, number>;
  encounterId: SpaceEncounterId;
  encounterLabel: string;
  encounterHazardLevel: string;
  campaignMissionId: string;
  campaignMissionCode: string;
  campaignMissionTitle: string;
  missionObjectiveLabel: string;
  missionCompleted: boolean;
  // Capital ship & 5 subsystems targeting
  capitalShip: CapitalShipStatus | null;
  capitalShipDistanceMeters: number | null;
  selectedSubsystem: CapitalSubsystemKey | null;
  capitalCriticalCountdown: {
    active: boolean;
    remainingSec: number;
    displayDigit: number;
    shipName: string;
  } | null;
  solidProximityWarning: {
    risk: 'caution' | 'critical';
    closingSpeed: number;
    timeToImpactSec: number | null;
  } | null;
  // Radar, Non-Obstructive Target Markers & Alerts
  radarBlips: SpaceRadarBlip[];
  enemyHealthMarkers: EnemyHealthBarMarker[];
  targetMarkers: ResolvedTargetMarker[];
  offscreenTargets: OffscreenTargetIndicator[];
  asteroidCount: number;
  asteroidAlert: AsteroidProximityAlert;
  collisionSeverityFlash: AsteroidSeverity | null;
  collisionWarningBanner: string | null;
  scoutEscapeWarning: string | null;
  nearRepairBeacon: boolean;
  lockedTargetName: string | null;
  lockedTargetRole: string | null;
  lockedTargetDistMeters: number | null;
  selectedTargetInfo: SelectedTargetHudInfo | null;
  predictiveLeadReticle: { x: number; y: number; visible: boolean } | null;
  lockProgress: number; // 0..1
  targetScreenX: number; // 0..1
  targetScreenY: number; // 0..1
  targetInView: boolean;
  incomingMissile: boolean;
  cameraMode: SpaceCameraMode;
  flightAssist: boolean;
  isDestroyed: boolean;
  weaponOverheated: boolean;
  missileCooldownPct: number; // 0 = ready, 100 = cooling
  flareCooldownPct: number; // 0 = ready, 100 = cooling
  flareDecoyActive: boolean;
  hitMarkerTimer: number;
  hitMarkerKill: boolean;
  shotsFired: number;
  shotsHit: number;
  sortieElapsedSec: number;
  statusToast: string | null;
  // Space Combat Expansion Telemetry
  wingmen: WingmanStatusSnapshot[];
  wingmanCommand: WingmanCommandId;
  reinforcementStage: ReinforcementStage;
  reinforcementBanner: string | null;
  legendaryPilot: {
    name: string;
    callsign: string;
    title: string;
    hullPct: number;
    shieldPct: number;
    alive: boolean;
  } | null;
  activeMissionEvent: string | null;
  incomingDamageAngleDeg: number | null;
  criticalDamageWarning: boolean;
  // Level-Based Gameplay, Objectives & Skill Scoring Telemetry
  activeLevelId: string | null;
  activeLevelCode: string | null;
  activeLevelName: string | null;
  activeLevelObjectiveBadge: string | null;
  activeLevelPrimaryText: string | null;
  activeLevelOptionalText: string | null;
  activeLevelOptionalCompleted: boolean;
  levelTimerRemainingSec: number | null;
  levelTimerKind: 'time_limit' | 'survival' | 'escape' | null;
  protectedEntity: { name: string; hpPct: number } | null;
  combatScore: number;
  comboCount: number;
  comboMultiplier: number;
  comboTimerRatio: number;
  activeBonusCallout: CombatBonusCallout | null;
  consecutiveHits: number;
  activeWeaponRangeTag: string;
  missileLockReady: boolean;
  // Extinction Campaign Real-Time Telemetry
  campaignTrack: CampaignTrackId;
  extinctionBoss: {
    bossId: ExtinctionBossId;
    bossKind: ExtinctionBossKind;
    name: string;
    phase: number;
    phaseLabel: string;
    hp: number;
    maxHp: number;
    hpPct: number;
    shield: number;
    maxShield: number;
    shieldPct: number;
    mainHullInvulnerable: boolean;
    invulnerableReason: string | null;
    telegraphActive: boolean;
    telegraphLabel: string | null;
    telegraphRemainingSec: number;
    cores?: Array<{ id: string; label: string; hpPct: number; destroyed: boolean }>;
    meltdownStep?: number;
    meltdownActive?: boolean;
  } | null;
  ewInterference: {
    active: boolean;
    activePulseCount: number;
    lockSpeedMultiplier: number;
  } | null;
  battleStage: {
    stageNumber: number;
    totalStages: number;
    label: string;
  } | null;
  extractionState: {
    required: boolean;
    active: boolean;
    distanceMeters: number | null;
    reached: boolean;
  } | null;
  activeExtinctionEvents: ExtinctionEventKind[];
  orbitalPylonsRemaining: number;
  encounterDiagnostics?: EncounterDiagnosticsSnapshot;
}

export interface EncounterTransitionEntry {
  atSec: number;
  ENCOUNTER_STAGE: string;
  BOSS_ID: string | null;
  SPAWN_CONDITION: string;
  ENTITY_CREATED: boolean;
  SCENE_REGISTERED: boolean;
  AI_ACTIVE: boolean;
  TARGET_ASSIGNED: boolean;
  reason: string;
}

export interface EncounterDiagnosticsSnapshot {
  activeCampaignTrack: 'original' | 'extinction';
  activeLevelId: string | null;
  encounterStage: number;
  totalStages: number;
  stageLabel: string;
  advanceWhen: string;
  requiredObjectives: string;
  objectiveCompletionState: string;
  bossSpawnCondition: string;
  bossSpawnAttemptCount: number;
  bossEntityCreated: boolean;
  bossEntityId: string | null;
  sceneRegistered: boolean;
  bossWorldPos: [number, number, number] | null;
  distanceToPlayerMeters: number | null;
  bossInCameraView: boolean;
  bossHealth: number | null;
  bossMaxHealth: number | null;
  bossShield: number | null;
  bossMaxShield: number | null;
  bossAiState: string;
  bossPhase: number;
  targetAssigned: boolean;
  defeatState: 'none' | 'active' | 'meltdown' | 'defeated';
  transitionLog: EncounterTransitionEntry[];
}

export interface SpaceCombatCallbacks {
  onLaserFire?: () => void;
  onWeaponFire?: (weapon: SpaceWeaponId, muzzlePan?: number) => void;
  onWeaponImpact?: (impact: {
    weapon: SpaceWeaponId;
    worldPos: THREE.Vector3;
    isShield: boolean;
    targetClass: EnemyShipClass;
    killed: boolean;
  }) => void;
  onRailChargeTick?: (chargeRatio: number) => void;
  onEmptyOrdnance?: () => void;
  onHitConfirm?: (killed: boolean) => void;
  onRailHullImpact?: (impact: {
    worldPos: THREE.Vector3;
    targetClass: 'fighter' | 'medium' | 'capital';
    distanceMeters: number;
    directHull: boolean;
    killed: boolean;
  }) => void;
  onShieldHit?: () => void;
  onHullHit?: () => void;
  onCapitalFire?: (worldPos?: THREE.Vector3) => void;
  onMissileLaunch?: (muzzlePan?: number) => void;
  onMissileLock?: () => void;
  onEnemyDestroyed?: (enemyName: string, worldPos?: THREE.Vector3) => void;
  onSubsystemDestroyed?: (
    shipName: string,
    subsystem: CapitalSubsystemKey,
    worldPos?: THREE.Vector3,
  ) => void;
  onCapitalShipDestroyed?: (shipName: string, worldPos?: THREE.Vector3) => void;
  onCriticalCountdownBeep?: (digit: number) => void;
  onShipDestructionStage?: (evt: ShipDestructionStageEvent & { distanceMeters: number }) => void;
  onRegionEntered?: (regionId: SpaceRegionId) => void;
  onIncomingMissile?: () => void;
  onPlayerShipDamaged?: (destroyed: boolean) => void;
  onAsteroidCollision?: (severity: AsteroidSeverity, hitZone: ShipImpactZone, destroyed: boolean) => void;
  onShipRepaired?: (source: 'kit' | 'beacon') => void;
  onCountermeasure?: () => void;
  onMissionFailed?: (failure: {
    cause: MissionFailureCause;
    elapsedSec: number;
    spaceKills: number;
    subsystemsDestroyed: number;
    hostilesRemaining: number;
  }) => void;
  onMissionComplete?: (
    missionId: string,
    spaceKills: number,
    subsystemsDestroyed: number,
    capitalShipsDestroyed: number,
    distanceTraveledKm: number,
    extraStats?: {
      elapsedSec: number;
      shotsFired: number;
      shotsHit: number;
      hullRemainingPct: number;
      legendaryDefeated?: boolean;
      wingmenDisabled?: number;
      bonusSalvage?: number;
      levelId?: string | null;
      combatScore?: number;
      maxCombo?: number;
      protectedHpPct?: number | null;
      repairKitsUsed?: number;
      nearMissCount?: number;
      missilesEvaded?: number;
    },
  ) => void;
  onWingmanComms?: (message: string, command: WingmanCommandId) => void;
  onReinforcementEvent?: (banner: string, stage: ReinforcementStage) => void;
  onLegendaryPilotEvent?: (kind: 'intro' | 'phase2' | 'defeated', pilot: LegendaryPilotDef) => void;
  onMissionMoment?: (event: MissionMomentDef) => void;
  onCriticalDamageAlert?: () => void;
  onExtinctionAudioCue?: (
    kind:
      | 'boss_intro'
      | 'boss_phase'
      | 'disruptor_pulse'
      | 'phantom_cloak'
      | 'telegraph_warning'
      | 'extraction_beacon'
      | 'sovereign_collapse',
  ) => void;
  onStageOrBossBanner?: (headline: string, tone: 'info' | 'warning' | 'critical') => void;
}

interface AsteroidHazard {
  id: string;
  tier: 'small' | 'medium' | 'large' | 'wreckage';
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  radius: number;
  mass: number;
  hp: number;
  cooldown: number;
}

interface EnemyStarfighter {
  id: string;
  zoneId: string;
  zoneCenter: THREE.Vector3;
  name: string;
  role: ExtinctionEnemyRole;
  shipClass: Exclude<EnemyShipClass, 'capital'>;
  isCorvette: boolean;
  isLegendary: boolean;
  isExecutionerBoss?: boolean;
  legendaryDef?: LegendaryPilotDef;
  legendaryPhase2Triggered?: boolean;
  root: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  empStunTimer: number;
  lastHitAge: number;
  destroyedFlashTimer: number;
  alive: boolean;
  orbitAngle: number;
  orbitRadius: number;
  orbitHeight: number;
  orbitSpeed: number;
  flankPhase: number;
  squadSlot: number;
  evasionTimer: number;
  aceFlareCooldown: number;
  fireCooldown: number;
  missileCooldown: number;
  escapeTimer: number;
  aiAccumDt: number;
  // Advanced 3D Dogfighting AI state
  maneuverState: DogfightManeuverState;
  stateTimer: number;
  strafeSign: 1 | -1;
  verticalSign: 1 | -1;
  currentBankRad: number;
  boostRemainingSec?: number;
  boostCooldownSec?: number;
  recoveryTimer?: number;
  evasionCooldownSec?: number;
  isCapitalEscort?: boolean;
  escortSlotIndex?: number;
  escortRole?: EscortWingRole;
  // Extinction archetype states
  phantomCloak?: PhantomCloakState;
  cloakMaterials?: THREE.MeshStandardMaterial[];
  disruptorField?: DisruptorFieldState;
  disruptorRingMesh?: THREE.Object3D;
}

interface ActiveCapitalShipEntity {
  root: THREE.Group;
  status: CapitalShipStatus;
  pos: THREE.Vector3;
  subsystemMeshes: Record<CapitalSubsystemKey, THREE.Object3D>;
  bridgeMesh: THREE.Object3D;
  damageFireTimer: number;
  lastHitAge: number;
  destroyedFlashTimer: number;
  turretCooldown: number;
  reinforceCooldown: number;
  helm: CapitalHelmState;
  criticalCountdown: CapitalCriticalCountdownState | null;
  escortSquadronPlan: EscortSquadronPlan;
  escortEnemyIds: string[];
  reinforcementWavesLaunched: number;
  extinctionBossId?: ExtinctionBossId | null;
  harvesterSpinnerGroup?: THREE.Group;
  harvesterCoreMeshes?: Array<{
    id: HarvesterEnergyCoreState['id'];
    group: THREE.Group;
    coreMesh: THREE.Mesh;
  }>;
  telegraphBeamMesh?: THREE.Mesh;
}

interface AlliedWingman {
  id: string;
  callsign: string;
  pilotName: string;
  formationOffset: [number, number, number];
  root: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  kills: number;
  status: 'active' | 'engaging' | 'damaged' | 'disabled';
  orbitAngle: number;
  orbitRadius: number;
  orbitHeight: number;
  fireCooldown: number;
  active: boolean;
}

interface SpaceProjectile {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  originPos: THREE.Vector3;
  vel: THREE.Vector3;
  fromPlayer: boolean;
  fromAlly?: boolean;
  shooterWingmanId?: string;
  weaponKind: SpaceWeaponId;
  isMissile: boolean;
  targetEnemy?: EnemyStarfighter;
  targetSubsystem?: CapitalSubsystemKey;
  targetHarvesterCoreId?: HarvesterEnergyCoreState['id'];
  damage: number;
  life: number;
  traveledMeters: number;
  maxRangeMeters: number;
  guidanceRemainingSec?: number;
  nearMissAwarded?: boolean;
}

interface DecoyFlareEntity {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface SavedRegionProgress {
  deadEnemyIds: Set<string>;
  capitalShipStatus: CapitalShipStatus | null;
}

export interface SpaceCombatTheater {
  root: THREE.Group;
  setVisible: (visible: boolean) => void;
  enterCombat: (
    ship: ValkyrieSpacecraft,
    encounterOrRegion?: SpaceEncounterId | SpaceRegionId,
    missionOverride?: CampaignMissionDef,
    levelOverride?: CampaignLevelDef | null,
  ) => void;
  travelToRegion: (
    regionId: SpaceRegionId,
    ship?: ValkyrieSpacecraft,
    missionOverride?: CampaignMissionDef,
    preserveProgress?: boolean,
    levelOverride?: CampaignLevelDef | null,
  ) => void;
  getCurrentRegionId: () => SpaceRegionId;
  setEncounter: (encounterId: SpaceEncounterId, ship?: ValkyrieSpacecraft) => void;
  getEncounterId: () => SpaceEncounterId;
  applySpaceLoadout: (
    loadout: SpaceLoadout,
    effects?: CampaignDecisionEffects,
    ship?: ValkyrieSpacecraft,
    wingmanEffectivenessBonusPct?: number,
  ) => void;
  selectWeapon: (weapon: SpaceWeaponId) => void;
  cycleWeapon: () => void;
  cycleTarget: () => void;
  toggleSupercruise: () => boolean;
  toggleAutopilot: () => boolean;
  setAiUpdateMultiplier: (mult: number) => void;
  setCampaignDifficulty: (difficulty: DifficultyId) => void;
  setInputState: (partial: Partial<FlightInputState>) => void;
  clearFlightInputs: () => void;
  addLookDelta: (dx: number, dy: number) => void;
  setFiringPrimary: (down: boolean) => void;
  fireMissile: () => boolean;
  triggerCountermeasure: () => void;
  useRepairKit: () => boolean;
  setFlightSettings: (settings: FlightControlSettings) => void;
  getFlightSettings: () => FlightControlSettings;
  respawnInOrbit: (ship: ValkyrieSpacecraft) => void;
  forceCompleteMission: () => void;
  triggerDebugPlayerDestruction: (
    ship: ValkyrieSpacecraft,
    cause?: MissionFailureCause,
  ) => void;
  runLiveBallisticsCheck: (
    ship: ValkyrieSpacecraft,
    camera: THREE.PerspectiveCamera,
    opts: {
      weapon: SpaceWeaponId;
      targetDistanceMeters: number;
      targetLateralSpeed?: number;
      aimOffsetDeg?: number;
      withLock?: boolean;
      maxSimSec?: number;
    },
  ) => {
    fired: boolean;
    hit: boolean;
    damageDealt: number;
    elapsedSec: number;
    projectileTraveledMeters: number;
    targetShieldAfter: number;
    targetHullAfter: number;
    missilesBefore: number;
    missilesAfter: number;
  };
  fireDebugVolley: (ship: ValkyrieSpacecraft) => void;
  triggerDebugRailHullImpact: (
    camera: THREE.PerspectiveCamera,
    ship: ValkyrieSpacecraft,
    targetClass?: 'fighter' | 'medium' | 'capital',
  ) => boolean;
  triggerDebugWeaponImpact: (
    camera: THREE.PerspectiveCamera,
    ship: ValkyrieSpacecraft,
    weapon: SpaceWeaponId,
    targetClass?: 'fighter' | 'medium' | 'capital',
  ) => boolean;
  triggerDebugAsteroidCollision: (ship: ValkyrieSpacecraft, severity?: AsteroidSeverity) => void;
  triggerDebugShipDestruction: (
    camera: THREE.PerspectiveCamera,
    ship: ValkyrieSpacecraft,
    destructionClass: DestructionClass,
  ) => boolean;
  destroyDebugSubsystem: (key: CapitalSubsystemKey) => void;
  inspectPlayerShip: (
    camera: THREE.PerspectiveCamera,
    ship: ValkyrieSpacecraft,
    angle: 'front' | 'side' | 'rear' | 'three_quarter' | 'boost_rear',
  ) => void;
  inspectEnemyClass: (
    camera: THREE.PerspectiveCamera,
    ship: ValkyrieSpacecraft,
    cls: EnemyShipClass,
  ) => boolean;
  inspectOpenDeepSpace: (camera: THREE.PerspectiveCamera, ship: ValkyrieSpacecraft) => void;
  inspectAsteroidCloseUp: (camera: THREE.PerspectiveCamera, ship: ValkyrieSpacecraft) => void;
  inspectAsteroidCombat: (camera: THREE.PerspectiveCamera, ship: ValkyrieSpacecraft) => void;
  focusAsteroidBelt: (camera: THREE.PerspectiveCamera, ship: ValkyrieSpacecraft) => void;
  damageTargetedEnemy: (amount?: number) => { shield: number; hull: number; alive: boolean } | null;
  setHudViewportContext: (
    partial: Partial<
      Pick<
        TargetHudViewportContext,
        'viewportWidth' | 'viewportHeight' | 'isTouchMode' | 'isCompactPhone' | 'orientation'
      >
    >,
  ) => void;
  stageTargetHudScenario: (
    camera: THREE.PerspectiveCamera,
    ship: ValkyrieSpacecraft,
    scenario:
      | 'distant_fighter'
      | 'nearby_fighter'
      | 'formation'
      | 'elite_ace'
      | 'medium_warship'
      | 'capital_ship'
      | 'overlapping_cluster'
      | 'fast_crossing'
      | 'behind_asteroid',
  ) => boolean;
  setTopDownOverviewCamera: (camera: THREE.PerspectiveCamera, theaterWide?: boolean) => void;
  issueWingmanCommand: (cmd: WingmanCommandId) => void;
  getNearbyObstaclesForCamera: (pos: THREE.Vector3) => Array<{ x: number; y: number; z: number; radius: number }>;
  stageCombatScenario: (
    camera: THREE.PerspectiveCamera,
    ship: ValkyrieSpacecraft,
    scenario: CombatScenarioKind | 'capital_destruction',
  ) => boolean;
  getCombatDiagnostics: () => {
    asteroidCount: number;
    asteroidYRange: [number, number];
    gridCells: number;
    wingmanCommand: WingmanCommandId;
    activeWingmen: number;
    reinforcementStage: ReinforcementStage;
    enemies: Array<{
      id: string;
      name: string;
      role: ExtinctionEnemyRole;
      isLegendary: boolean;
      maneuverState: DogfightManeuverState;
      pos: [number, number, number];
      vel: [number, number, number];
      bankRad: number;
      alive: boolean;
    }>;
  };
  getEncounterDiagnostics: () => EncounterDiagnosticsSnapshot;
  getHudSnapshot: () => SpaceHudSnapshot;
  update: (
    dt: number,
    elapsed: number,
    ship: ValkyrieSpacecraft,
    camera: THREE.PerspectiveCamera,
    playable: boolean,
  ) => void;
  dispose: () => void;
}

function createExtrudedHullPlate(
  pointsXZ: [number, number][],
  thickness: number,
  bevelSize = 0.14,
  bevelThickness = 0.1,
  uvRepeats = 3.2,
  centerZ = true,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(pointsXZ[0][0], -pointsXZ[0][1]);
  for (let i = 1; i < pointsXZ.length; i++) {
    shape.lineTo(pointsXZ[i][0], -pointsXZ[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize,
    bevelThickness,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  if (geo.boundingBox) {
    const c = new THREE.Vector3();
    geo.boundingBox.getCenter(c);
    geo.translate(-c.x, -c.y, centerZ ? -c.z : 0);
  }
  geo.computeVertexNormals();
  geo.computeBoundingBox();

  // Normalize UVs cleanly proportional to hull span (prevents 1000x micro-tiling on capital ships!)
  const size = new THREE.Vector3(1, 1, 1);
  if (geo.boundingBox) geo.boundingBox.getSize(size);
  const span = Math.max(size.x, size.z, 1);
  const uvScale = uvRepeats / span;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const norm = geo.attributes.normal as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  if (pos && norm && uv) {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (Math.abs(norm.getY(i)) >= 0.55) {
        uv.setXY(i, x * uvScale, z * uvScale);
      } else if (Math.abs(norm.getX(i)) >= 0.55) {
        uv.setXY(i, z * uvScale, y * uvScale);
      } else {
        uv.setXY(i, x * uvScale, y * uvScale);
      }
    }
    uv.needsUpdate = true;
  }
  return geo;
}

function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSoftPointSpriteTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    grad.addColorStop(0.28, 'rgba(240,248,255,0.88)');
    grad.addColorStop(0.62, 'rgba(180,215,255,0.22)');
    grad.addColorStop(1.0, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

interface EnemyFuselageSection {
  z: number;
  halfWidth: number;
  topY: number;
  bottomY: number;
  chineY: number;
  deckFrac?: number;
  bellyFrac?: number;
}

/**
 * Builds a true sculpted 8-facet stealth aerospace fuselage lofted smoothly along Z
 * for enemy corvettes and fighters (exact outward winding, zero boxy slabs).
 */
function createEnemyLoftedFuselage(
  sections: EnemyFuselageSection[],
  uvScale = 0.2,
): THREE.BufferGeometry {
  const ringPts = 8;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s];
    const hw = Math.max(0.02, sec.halfWidth);
    const df = sec.deckFrac ?? 0.52;
    const bf = sec.bellyFrac ?? 0.46;
    const dw = hw * df;
    const bw = hw * bf;

    const ring: [number, number][] = [
      [0, sec.topY],
      [dw, sec.topY - (sec.topY - sec.chineY) * 0.24],
      [hw, sec.chineY],
      [bw, sec.bottomY + (sec.chineY - sec.bottomY) * 0.24],
      [0, sec.bottomY],
      [-bw, sec.bottomY + (sec.chineY - sec.bottomY) * 0.24],
      [-hw, sec.chineY],
      [-dw, sec.topY - (sec.topY - sec.chineY) * 0.24],
    ];

    for (let k = 0; k < ringPts; k++) {
      const [x, y] = ring[k];
      positions.push(x, y, sec.z);
      uvs.push((k / ringPts) * 2.4, sec.z * uvScale);
    }
  }

  for (let s = 0; s < sections.length - 1; s++) {
    const rowA = s * ringPts;
    const rowB = (s + 1) * ringPts;
    for (let k = 0; k < ringPts; k++) {
      const kn = (k + 1) % ringPts;
      const a0 = rowA + k;
      const a1 = rowA + kn;
      const b0 = rowB + k;
      const b1 = rowB + kn;
      indices.push(a0, a1, b1);
      indices.push(a0, b1, b0);
    }
  }

  const frontCenterIdx = positions.length / 3;
  const s0 = sections[0];
  positions.push(0, (s0.topY + s0.bottomY) * 0.5, s0.z);
  uvs.push(0.5, 0.5);
  for (let k = 0; k < ringPts; k++) {
    const kn = (k + 1) % ringPts;
    indices.push(frontCenterIdx, kn, k);
  }

  const backCenterIdx = positions.length / 3;
  const sLast = sections[sections.length - 1];
  const lastRow = (sections.length - 1) * ringPts;
  positions.push(0, (sLast.topY + sLast.bottomY) * 0.5, sLast.z);
  uvs.push(0.5, 0.5);
  for (let k = 0; k < ringPts; k++) {
    const kn = (k + 1) % ringPts;
    indices.push(backCenterIdx, lastRow + k, lastRow + kn);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * 10-archetype high-detail geological asteroid generator with multi-octave ridged
 * fracture strata, planar tectonic cleavage, impact bowl craters with raised ejecta rims,
 * seamless triplanar UVs, and baked per-vertex cavity Ambient Occlusion (`color` attribute).
 */
function buildIrregularAsteroidGeometry(
  seed: number,
  detail: number,
  archetype = 0,
): THREE.IcosahedronGeometry {
  const geo = new THREE.IcosahedronGeometry(1.0, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const colors = new Float32Array(pos.count * 3);

  const arch = ((archetype % 10) + 10) % 10;
  // Distinct realistic asteroid silhouettes (monolith, sheared boulder, elongated shard, contact binary, etc.)
  const aspectProfiles: [number, number, number][] = [
    [1.08, 0.78, 0.94], // 0: cratered monolith
    [1.18, 0.68, 0.88], // 1: angular sheared boulder
    [0.72, 0.64, 1.38], // 2: elongated iron-nickel ridge shard
    [1.34, 0.72, 0.78], // 3: twin-lobed contact binary (67P / Itokawa silhouette)
    [0.98, 0.86, 1.12], // 4: concave impact basin rock
    [1.16, 0.58, 1.04], // 5: stratified silicate crag
    [0.84, 0.94, 1.16], // 6: jagged meteoritic chunk
    [1.06, 0.84, 0.92], // 7: rugged boulder cluster
    [0.94, 0.76, 1.18], // 8: pitted regolith monolith
    [1.24, 0.62, 0.96], // 9: fractured wedge crag
  ];
  const [sx, sy, sz] = aspectProfiles[arch];

  // Deterministic multi-scale impact crater centers on unit sphere
  const craterCount = arch === 8 ? 7 : arch === 0 || arch === 4 ? 5 : 4;
  const craters: [number, number, number, number, number][] = [];
  for (let c = 0; c < craterCount; c++) {
    const a1 = seed * 1.37 + c * 2.19 + arch * 0.53;
    const a2 = Math.sin(seed * 0.71 + c * 1.57 + arch * 0.31) * 1.18;
    const cx = Math.cos(a1) * Math.cos(a2);
    const cy = Math.sin(a2);
    const cz = Math.sin(a1) * Math.cos(a2);
    const isMajor = c === 0 && (arch === 0 || arch === 4);
    const rad = isMajor ? 0.56 : 0.24 + (((seed + c * 19 + arch * 7) % 10) * 0.026);
    const depth = isMajor ? 0.31 : 0.17 + (((seed + c * 11) % 6) * 0.018);
    craters.push([cx, cy, cz, rad, depth]);
  }

  // Primary & secondary tectonic cleave plane normals
  const cl1x = Math.cos(seed * 0.9 + arch);
  const cl1y = 0.42;
  const cl1z = Math.sin(seed * 0.9 + arch);
  const cl1Len = Math.hypot(cl1x, cl1y, cl1z) || 1;
  const c1x = cl1x / cl1Len;
  const c1y = cl1y / cl1Len;
  const c1z = cl1z / cl1Len;

  const cl2x = Math.cos(seed * 2.1 - arch * 0.7);
  const cl2y = -0.58;
  const cl2z = Math.sin(seed * 2.1 - arch * 0.7);
  const cl2Len = Math.hypot(cl2x, cl2y, cl2z) || 1;
  const c2x = cl2x / cl2Len;
  const c2y = cl2y / cl2Len;
  const c2z = cl2z / cl2Len;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const nx = v.x;
    const ny = v.y;
    const nz = v.z;

    // Multi-octave geological ridged fracture noise
    const r1 = 1.0 - Math.abs(Math.sin(nx * 2.3 + ny * 1.9 + nz * 1.2 + seed * 1.3));
    const r2 = 1.0 - Math.abs(Math.cos(ny * 4.1 - nz * 3.2 + nx * 1.7 + seed * 2.1));
    const r3 = 1.0 - Math.abs(Math.sin(nx * 7.8 - ny * 6.4 + nz * 7.1 - seed * 0.8));
    const lowMass =
      Math.sin(nx * 1.7 + seed) * Math.cos(ny * 1.9 - seed * 0.6) * Math.sin(nz * 1.5 + seed * 0.4);
    const micro =
      Math.sin(nx * 11.4 + nz * 10.2 - seed) * Math.cos(ny * 10.8 + nx * 6.2 + seed * 1.7);

    // Archetype-specific macro sculpting
    let archMod = 0;
    if (arch === 3) {
      // Twin-lobed contact binary waist pinch
      const waist = Math.exp(-nx * nx * 5.2);
      archMod = -waist * 0.32 + Math.abs(nx) * 0.14;
    } else if (arch === 5) {
      // Stepped geological strata shelves
      const strata = Math.sin(ny * 11.5 + nx * 2.2 + seed);
      archMod = Math.sign(strata) * Math.pow(Math.abs(strata), 0.55) * 0.065;
    } else if (arch === 2 || arch === 9) {
      // Sharp tectonic spine ridge
      archMod = (1.0 - Math.abs(nx * 0.8 + ny * 0.6)) * 0.14;
    } else if (arch === 7) {
      // Bulbous nodular outcrops
      archMod = Math.max(0, Math.sin(nx * 3.4 + seed) * Math.cos(nz * 3.1 - seed)) * 0.16;
    }

    // Double tectonic shear cleavage for fractured sharp rock planes
    const cleave1 = Math.max(0, nx * c1x + ny * c1y + nz * c1z - (arch === 1 || arch === 9 ? 0.36 : 0.48)) * 0.44;
    const cleave2 = Math.max(0, nx * c2x + ny * c2y + nz * c2z - 0.54) * 0.32;

    // Bowl impact craters with sharp raised ejecta rims
    let craterDelta = 0;
    let craterFloorAO = 0;
    let craterRimHi = 0;
    for (const [cx, cy, cz, rad, depth] of craters) {
      const dist = Math.hypot(nx - cx, ny - cy, nz - cz);
      if (dist < rad) {
        const u = dist / rad;
        const bowl = (1.0 - u * u) * depth;
        craterDelta -= bowl;
        craterFloorAO = Math.max(craterFloorAO, (1.0 - u * u) * 0.52);
      } else if (dist < rad * 1.28) {
        const rim = Math.sin(((1.0 - (dist - rad) / (rad * 0.28)) * Math.PI) * 0.5);
        craterDelta += rim * depth * 0.28;
        craterRimHi = Math.max(craterRimHi, rim * 0.14);
      }
    }

    const disp = Math.max(
      0.42,
      0.76 +
      lowMass * 0.14 +
      r1 * 0.2 +
      r2 * 0.12 +
      r3 * 0.055 +
      micro * 0.032 +
      archMod -
      cleave1 -
      cleave2 +
      craterDelta,
    );

    const px = nx * disp * sx;
    const py = ny * disp * sy;
    const pz = nz * disp * sz;
    pos.setXYZ(i, px, py, pz);

    // Baked per-vertex Cavity Ambient Occlusion + subtle mineral tinting (works with vertexColors: true!)
    const ridgeBoost = Math.max(0, r1 - 0.52) * 0.22 + Math.max(0, r2 - 0.58) * 0.14 + craterRimHi;
    const creviceDark = (cleave1 + cleave2) * 0.42 + craterFloorAO;
    const dispAO = THREE.MathUtils.clamp((disp - 0.52) * 0.48, -0.18, 0.16);
    const ao = THREE.MathUtils.clamp(0.86 + dispAO + ridgeBoost - creviceDark, 0.38, 1.12);

    // Subtle geological mineral tint (warmer dust on rims, cooler shadow in deep cavities)
    const mineralWarm = 1.0 + (r2 - 0.5) * 0.08 - craterFloorAO * 0.08;
    const mineralCool = 1.0 - (r2 - 0.5) * 0.06 + craterFloorAO * 0.06;
    colors[i * 3] = Math.min(1.14, ao * mineralWarm);
    colors[i * 3 + 1] = Math.min(1.12, ao * (0.98 + ridgeBoost * 0.05));
    colors[i * 3 + 2] = Math.min(1.12, ao * mineralCool);
  }

  // Per-triangle dominant-axis triplanar UVs (100% eliminates diagonal seam smearing!)
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const fNorm = new THREE.Vector3();
  for (let i = 0; i + 2 < pos.count; i += 3) {
    vA.fromBufferAttribute(pos, i);
    vB.fromBufferAttribute(pos, i + 1);
    vC.fromBufferAttribute(pos, i + 2);
    e1.subVectors(vB, vA);
    e2.subVectors(vC, vA);
    fNorm.crossVectors(e1, e2);
    const ax = Math.abs(fNorm.x);
    const ay = Math.abs(fNorm.y);
    const az = Math.abs(fNorm.z);
    for (let k = 0; k < 3; k++) {
      const vi = i + k;
      const x = pos.getX(vi);
      const y = pos.getY(vi);
      const z = pos.getZ(vi);
      if (ay >= ax && ay >= az) {
        uv.setXY(vi, x * 0.72 + 0.5, z * 0.72 + 0.5);
      } else if (ax >= ay && ax >= az) {
        uv.setXY(vi, z * 0.72 + 0.5, y * 0.72 + 0.5);
      } else {
        uv.setXY(vi, x * 0.72 + 0.5, y * 0.72 + 0.5);
      }
    }
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted torn hull-rib / jagged metallic asteroid wreckage shard (replaces flat blocky slabs!).
 */
function buildWreckageShardGeometry(seed: number): THREE.BufferGeometry {
  const geo = buildIrregularAsteroidGeometry(seed + 131, 2, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Slightly flatten into a twisted torn armor/rock monolith with structural ridges
    const twist = z * 0.35;
    const rx = x * Math.cos(twist) - y * Math.sin(twist);
    const ry = x * Math.sin(twist) + y * Math.cos(twist);
    pos.setXYZ(i, rx * 0.85, ry * 0.58, z * 1.18);
  }
  geo.computeVertexNormals();
  return geo;
}

function isSpaceRegionId(val: string | undefined): val is SpaceRegionId {
  return Boolean(val && val in SPACE_REGIONS);
}

/**
 * VAST 5x EXPANDED INTERSTELLAR SPACE COMBAT THEATER (~80 KM SCALE)
 * - 5 Spatially Separated Regions (7.8–9.6 km radius each) with seamless free-flight transition
 * - 3 Separated Encounter Zones per Region (1.4–5.4 km spacing) with Persistent Region State
 * - 5 Playable Spacecraft, 5 Weapons (incl. Precision Rail Cannon), Countermeasures & Supercruise/Autopilot
 * - 5 Destructible Capital Ship Subsystems (Shields, Weapons, Engines, Comms, Hangar) + 3-Phase Sovereign Flagship
 * - Distance-scaled AI updates & Mobile/Desktop unified flight control physics
 */
export function buildSpaceCombatTheater(
  mats: WorldMaterialLibrary,
  explosions: ExplosionSystem,
  callbacks: SpaceCombatCallbacks = {},
): SpaceCombatTheater {
  const root = new THREE.Group();
  root.name = 'VastInterstellarSpaceTheater_80km';
  root.visible = true;

  const sectorDynamicGroup = new THREE.Group();
  sectorDynamicGroup.name = 'SectorDynamicEntities';
  root.add(sectorDynamicGroup);

  const asteroidGroup = new THREE.Group();
  asteroidGroup.name = 'SectorAsteroidHazards';
  root.add(asteroidGroup);

  const geos: THREE.BufferGeometry[] = [];
  const sectorGeos: THREE.BufferGeometry[] = [];
  const sectorMats: THREE.Material[] = [];
  let trackingSectorGeos = false;
  const localMats: THREE.Material[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    if (trackingSectorGeos) {
      sectorGeos.push(g);
    } else {
      geos.push(g);
    }
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    if (trackingSectorGeos) {
      sectorMats.push(m);
    } else {
      localMats.push(m);
    }
    return m;
  };

  let currentRegionId: SpaceRegionId = 'low_orbit';
  let currentEncounterId: SpaceEncounterId = 'shattered_fleet';
  const activeCenter = new THREE.Vector3(...SPACE_REGIONS.low_orbit.worldCenter);
  const savedRegionProgress = new Map<SpaceRegionId, SavedRegionProgress>();

  // =========================================================================
  // 1. CINEMATIC DEEP-SPACE SKY DOME + MULTI-DEPTH PINPOINT STARFIELD
  // Realistic Milky Way dust rift, restrained distant cosmic nebula wisps, crisp Solar star disc
  // =========================================================================
  const SUN_DIR = new THREE.Vector3(0.56, 0.54, 0.63).normalize();

  const skyMat = trackMat(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uSunDir: { value: SUN_DIR.clone() },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 uSunDir;

        float hash31(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }

        float vnoise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(
              mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
              mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x),
              f.y
            ),
            mix(
              mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
              mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x),
              f.y
            ),
            f.z
          );
        }

        float fbm(vec3 p) {
          float s = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            s += a * vnoise(p);
            p = p * 2.07 + vec3(3.1, 7.4, 2.6);
            a *= 0.5;
          }
          return s;
        }

        void main() {
          vec3 d = normalize(vDir);
          // Deep obsidian-navy interstellar void base
          vec3 col = mix(vec3(0.008, 0.012, 0.022), vec3(0.016, 0.024, 0.042), d.y * 0.5 + 0.5);

          // Tilted galactic plane for natural Milky Way band & dark cosmic dust rift
          vec3 galNormal = normalize(vec3(0.32, 0.84, -0.44));
          float galLat = dot(d, galNormal);
          float band = exp(-galLat * galLat * 14.0);
          float wideBand = exp(-galLat * galLat * 3.8);

          float n1 = fbm(d * 3.2 + vec3(1.4, -0.7, 2.2));
          float n2 = fbm(d * 7.8 + vec3(-2.1, 4.3, 1.1));
          float dustRift = smoothstep(0.42, 0.72, fbm(d * 5.6 + vec3(0.5, 2.8, -1.9)));

          // Restrained dusty steel-blue star clouds & faint muted amber core wisps (realistic astronomy)
          vec3 slateNebula = vec3(0.052, 0.088, 0.145) * wideBand * smoothstep(0.34, 0.84, n1);
          vec3 warmDust = vec3(0.115, 0.078, 0.052) * band * smoothstep(0.46, 0.88, n2);
          float milkyCloud = band * smoothstep(0.28, 0.78, n1 * 0.65 + n2 * 0.35);
          vec3 starCloud = mix(vec3(0.085, 0.115, 0.165), vec3(0.155, 0.132, 0.108), n2) * milkyCloud;

          // Carve authentic dark interstellar dust lanes through the Milky Way core
          float riftMask = 1.0 - dustRift * band * 0.78;
          col += (slateNebula * 0.72 + warmDust * 0.55 + starCloud * 0.82) * riftMask;

          // Subtle micro-star shimmer along galactic plane
          float microStar = pow(max(0.0, vnoise(d * 185.0)), 22.0) * (0.28 + band * 0.95);
          col += vec3(0.76, 0.84, 0.96) * microStar;

          // Distant crisp Solar star disc + clean tight corona aligned with physical key light
          float sunDot = max(0.0, dot(d, normalize(uSunDir)));
          float sunCore = smoothstep(0.99935, 0.99982, sunDot);
          float sunHalo = pow(sunDot, 160.0) * 0.72 + pow(sunDot, 22.0) * 0.095;
          col += vec3(1.0, 0.96, 0.88) * sunCore * 2.4;
          col += vec3(0.95, 0.86, 0.72) * sunHalo;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  const skyDome = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(88000, 40, 28)), skyMat);
  skyDome.name = 'DeepSpaceSkyDome';
  skyDome.renderOrder = -10;
  root.add(skyDome);

  // Two-tier crisp pinpoint starfield (ZERO blocky white squares!)
  const pointSpriteTex = createSoftPointSpriteTexture();
  const starRand = createMulberry32(90210);
  const starCount = 2600;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = starRand() * 2 - 1;
    const theta = starRand() * Math.PI * 2;
    const r = 48000 + starRand() * 24000;
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    starPos[i * 3] = Math.cos(theta) * s * r;
    starPos[i * 3 + 1] = 4500 + u * r * 0.86;
    starPos[i * 3 + 2] = -18000 + Math.sin(theta) * s * r;

    const brightness = 0.36 + Math.pow(starRand(), 2.2) * 0.64;
    const temp = starRand();
    if (temp < 0.24) {
      starCol[i * 3] = brightness * 0.76;
      starCol[i * 3 + 1] = brightness * 0.88;
      starCol[i * 3 + 2] = brightness * 1.0;
    } else if (temp > 0.82) {
      starCol[i * 3] = brightness * 1.0;
      starCol[i * 3 + 1] = brightness * 0.86;
      starCol[i * 3 + 2] = brightness * 0.68;
    } else {
      starCol[i * 3] = brightness * 0.94;
      starCol[i * 3 + 1] = brightness * 0.96;
      starCol[i * 3 + 2] = brightness * 1.0;
    }
  }
  const starGeo = trackGeo(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const starMat = trackMat(
    new THREE.PointsMaterial({
      size: 46,
      map: pointSpriteTex,
      alphaTest: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      fog: false,
      depthWrite: false,
    }),
  );
  root.add(new THREE.Points(starGeo, starMat));

  // Secondary faint distant star-dust layer for astronomical parallax depth
  const faintCount = 2600;
  const faintPos = new Float32Array(faintCount * 3);
  const faintCol = new Float32Array(faintCount * 3);
  for (let i = 0; i < faintCount; i++) {
    const u = starRand() * 2 - 1;
    const theta = starRand() * Math.PI * 2;
    const r = 56000 + starRand() * 22000;
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    faintPos[i * 3] = Math.cos(theta) * s * r;
    faintPos[i * 3 + 1] = 4500 + u * r * 0.9;
    faintPos[i * 3 + 2] = -18000 + Math.sin(theta) * s * r;
    const b = 0.25 + starRand() * 0.45;
    faintCol[i * 3] = b * 0.82;
    faintCol[i * 3 + 1] = b * 0.89;
    faintCol[i * 3 + 2] = b * 1.0;
  }
  const faintGeo = trackGeo(new THREE.BufferGeometry());
  faintGeo.setAttribute('position', new THREE.BufferAttribute(faintPos, 3));
  faintGeo.setAttribute('color', new THREE.BufferAttribute(faintCol, 3));
  const faintMat = trackMat(
    new THREE.PointsMaterial({
      size: 24,
      map: pointSpriteTex,
      alphaTest: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.56,
      fog: false,
      depthWrite: false,
    }),
  );
  root.add(new THREE.Points(faintGeo, faintMat));

  // High-speed velocity dust motes — INVISIBLE at idle/normal cruise (zero floating white specks!),
  // fading subtly in ONLY during Boost or Supercruise.
  const dustRand = createMulberry32(44109);
  const dustCount = 160;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (dustRand() - 0.5) * 900;
    dustPos[i * 3 + 1] = (dustRand() - 0.5) * 600;
    dustPos[i * 3 + 2] = (dustRand() - 0.5) * 900;
  }
  const dustGeo = trackGeo(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = trackMat(
    new THREE.PointsMaterial({
      color: 0x9ec7ef,
      map: pointSpriteTex,
      alphaTest: 0.04,
      size: 1.3,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  const spaceDustPoints = new THREE.Points(dustGeo, dustMat);
  root.add(spaceDustPoints);

  // =========================================================================
  // 2. CELESTIAL BODIES — AETHER PRIME (RAYLEIGH ATMOSPHERE) + CRATERED MOON AETHER MINOR
  // =========================================================================
  const planetRadius = 6400;
  const planetCenter = new THREE.Vector3(0, -3450, 950);

  const planetMat = trackMat(
    new THREE.ShaderMaterial({
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: SUN_DIR.clone() },
      },
      vertexShader: `
        varying vec3 vNormalW;
        varying vec3 vPosW;
        varying vec3 vLocalPos;
        void main() {
          vLocalPos = normalize(position);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPosW = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vNormalW;
        varying vec3 vPosW;
        varying vec3 vLocalPos;
        uniform float uTime;
        uniform vec3 uSunDir;

        float hash3(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise3(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(
              mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
              mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x),
              f.y
            ),
            mix(
              mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
              mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x),
              f.y
            ),
            f.z
          );
        }

        float fbm3(vec3 p) {
          float s = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            s += a * noise3(p);
            p = p * 2.04 + vec3(1.7, 9.2, 4.3);
            a *= 0.5;
          }
          return s;
        }

        void main() {
          vec3 N = normalize(vNormalW);
          vec3 V = normalize(cameraPosition - vPosW);
          vec3 L = normalize(uSunDir);
          vec3 p = normalize(vLocalPos);

          float continents = fbm3(p * 3.1);
          float mountainDetail = fbm3(p * 11.4 + vec3(3.2, -1.4, 2.1));
          float cloudDrift = uTime * 0.004;
          vec3 cp = vec3(
            p.x * cos(cloudDrift) - p.z * sin(cloudDrift),
            p.y,
            p.x * sin(cloudDrift) + p.z * cos(cloudDrift)
          );
          float clouds = fbm3(cp * 5.2 + vec3(2.4, -1.1, 0.8));

          vec3 ocean = mix(vec3(0.02, 0.075, 0.175), vec3(0.04, 0.135, 0.285), mountainDetail);
          vec3 land = mix(vec3(0.08, 0.115, 0.145), vec3(0.16, 0.17, 0.165), mountainDetail);
          float landMask = smoothstep(0.47, 0.60, continents);
          vec3 surface = mix(ocean, land, landMask);

          // Crisp solar terminator + warm dusk band + ocean specular glint
          float ndotl = dot(N, L);
          float sunLight = smoothstep(-0.14, 0.28, ndotl) * max(ndotl, 0.0);
          vec3 H = normalize(L + V);
          float oceanSpec = pow(max(dot(N, H), 0.0), 42.0) * (1.0 - landMask) * smoothstep(0.0, 0.25, ndotl);

          // Night-side planetary city & siege-fire glow clusters (only on night continents)
          float nightMask = smoothstep(0.14, -0.22, ndotl);
          float fireSpots = smoothstep(0.71, 0.83, fbm3(p * 12.2)) * landMask;
          vec3 nightLights = vec3(0.95, 0.42, 0.14) * fireSpots * (0.28 + nightMask * 0.72);

          vec3 col = surface * (0.045 + sunLight * 1.06) + vec3(0.65, 0.78, 0.92) * oceanSpec * 0.36;
          col += nightLights;

          // Multi-layer sunlit cloud deck with subtle shadow
          float cloudMask = smoothstep(0.48, 0.78, clouds) * 0.64;
          vec3 cloudCol = vec3(0.76, 0.84, 0.94) * (0.06 + sunLight * 0.94);
          col = mix(col, cloudCol, cloudMask);

          // Atmospheric Rayleigh limb scatter (bright on sunlit edge, deep indigo on night side)
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.6);
          float limbSun = smoothstep(-0.28, 0.55, ndotl);
          vec3 atmoDay = vec3(0.28, 0.64, 1.0);
          vec3 atmoDusk = vec3(0.72, 0.42, 0.24) * exp(-abs(ndotl) * 6.5) * 0.35;
          col += (atmoDay * (0.14 + limbSun * 1.15) + atmoDusk) * fresnel;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  const planetMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(planetRadius, 56, 42)), planetMat);
  planetMesh.position.copy(planetCenter);
  planetMesh.rotation.set(0.85, 0.35, 0.22);
  root.add(planetMesh);

  // Physically inspired Rayleigh outer atmospheric limb halo
  const haloMat = trackMat(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      uniforms: {
        uSunDir: { value: SUN_DIR.clone() },
      },
      vertexShader: `
        varying vec3 vNormalW;
        varying vec3 vPosW;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPosW = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vNormalW;
        varying vec3 vPosW;
        uniform vec3 uSunDir;
        void main() {
          vec3 N = normalize(vNormalW);
          vec3 V = normalize(cameraPosition - vPosW);
          float rim = pow(clamp(1.0 + dot(N, V), 0.0, 1.0), 2.8);
          float sunSide = smoothstep(-0.32, 0.65, dot(N, normalize(uSunDir)));
          vec3 col = mix(vec3(0.08, 0.24, 0.52), vec3(0.32, 0.72, 1.0), sunSide);
          gl_FragColor = vec4(col * rim * (0.28 + sunSide * 0.78), rim * 0.72);
        }
      `,
    }),
  );
  const haloMesh = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(planetRadius * 1.044, 40, 28)),
    haloMat,
  );
  haloMesh.position.copy(planetCenter);
  root.add(haloMesh);

  // Distant Cratered Silicate Moon — Aether Minor (cinematic celestial depth across Sectors II–IV)
  const moonMat = trackMat(
    new THREE.ShaderMaterial({
      fog: false,
      uniforms: {
        uSunDir: { value: SUN_DIR.clone() },
      },
      vertexShader: `
        varying vec3 vNormalW;
        varying vec3 vLocalPos;
        void main() {
          vLocalPos = normalize(position);
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormalW;
        varying vec3 vLocalPos;
        uniform vec3 uSunDir;

        float hash3(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.13, 0.19, 0.29));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise3(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(
              mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
              mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x),
              f.y
            ),
            mix(
              mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
              mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x),
              f.y
            ),
            f.z
          );
        }

        float fbm(vec3 p) {
          float s = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            s += a * noise3(p);
            p = p * 2.1 + vec3(2.3, 5.1, 1.7);
            a *= 0.5;
          }
          return s;
        }

        void main() {
          vec3 N = normalize(vNormalW);
          vec3 p = normalize(vLocalPos);
          float maria = fbm(p * 3.4);
          float regolith = fbm(p * 14.0);
          float craterField = abs(noise3(p * 22.0) - 0.5) * 2.0;
          vec3 darkBasalt = vec3(0.16, 0.17, 0.19);
          vec3 paleHighland = vec3(0.42, 0.41, 0.39);
          vec3 base = mix(darkBasalt, paleHighland, smoothstep(0.36, 0.68, maria));
          base *= 0.78 + regolith * 0.28 + smoothstep(0.18, 0.34, craterField) * 0.1;

          float ndotl = dot(N, normalize(uSunDir));
          float lit = smoothstep(-0.08, 0.14, ndotl) * max(ndotl, 0.0);
          vec3 col = base * (0.03 + lit * 1.12);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  const moonMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(2150, 36, 26)), moonMat);
  moonMesh.position.set(-14800, 6200, -28500);
  root.add(moonMesh);

  // =========================================================================
  // 3. SCULPTED MILITARY LANDMARK INSTALLATIONS ACROSS ALL 5 EXPANDED REGIONS
  // =========================================================================
  // Sector I Landmark: Orbital Defense Platform Alpha (multi-ring structural citadel)
  const defPlatform = new THREE.Group();
  defPlatform.position.set(
    SPACE_REGIONS.low_orbit.worldCenter[0] - 2100,
    SPACE_REGIONS.low_orbit.worldCenter[1] + 140,
    SPACE_REGIONS.low_orbit.worldCenter[2] - 1650,
  );
  const platRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(195, 16, 10, 32)), mats.friendlyCarrierMat);
  platRing.rotation.x = Math.PI / 2;
  const platInnerRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(118, 9, 8, 24)), mats.playerHullDarkComposite);
  platInnerRing.rotation.x = Math.PI / 2;
  platInnerRing.position.y = -24;
  const platSpire = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(24, 46, 330, 10)), mats.playerHullPrimary);
  const platCrown = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(54, 42, 42, 10)), mats.thrusterNozzleMetal);
  platCrown.position.y = 124;
  const platDockArms = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(390, 18, 26)), mats.playerHullDarkComposite);
  platDockArms.position.y = 22;
  const platDockArmsCross = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(26, 18, 390)), mats.playerHullDarkComposite);
  platDockArmsCross.position.y = 22;
  defPlatform.add(platRing, platInnerRing, platSpire, platCrown, platDockArms, platDockArmsCross);
  root.add(defPlatform);

  // Sector II Landmark: Torn Capital Ship Graveyard Hulks
  const wreckGroup = new THREE.Group();
  wreckGroup.position.set(
    SPACE_REGIONS.shattered_fleet.worldCenter[0] - 1900,
    SPACE_REGIONS.shattered_fleet.worldCenter[1] + 60,
    SPACE_REGIONS.shattered_fleet.worldCenter[2] + 650,
  );
  const hulkGeo = trackGeo(
    createExtrudedHullPlate(
      [
        [0, -280],
        [95, -140],
        [110, 180],
        [60, 260],
        [-60, 260],
        [-110, 180],
        [-95, -140],
      ],
      68,
      10,
      8,
    ),
  );
  const hulkA = new THREE.Mesh(hulkGeo, mats.scorchedHull);
  hulkA.rotation.set(0.24, 0.65, -0.35);
  const hulkB = new THREE.Mesh(hulkGeo, mats.enemyMediumArmor);
  hulkB.scale.setScalar(0.74);
  hulkB.position.set(520, -75, -310);
  hulkB.rotation.set(-0.32, -0.45, 0.28);
  wreckGroup.add(hulkA, hulkB);
  root.add(wreckGroup);

  // Sector III Landmark: Deep Belt Mining Rig 04
  const miningRig = new THREE.Group();
  miningRig.position.set(
    SPACE_REGIONS.debris_belt.worldCenter[0] - 2650,
    SPACE_REGIONS.debris_belt.worldCenter[1] + 210,
    SPACE_REGIONS.debris_belt.worldCenter[2] - 1550,
  );
  const rigCore = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(48, 66, 330, 10)), mats.enemyWarshipArmor);
  const rigCollar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(92, 12, 8, 24)), mats.thrusterNozzleMetal);
  rigCollar.rotation.x = Math.PI / 2;
  rigCollar.position.y = 48;
  const rigArm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(380, 28, 36)), mats.weaponGunmetal);
  rigArm.position.y = 48;
  const rigArm2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(36, 28, 340)), mats.weaponGunmetal);
  rigArm2.position.y = -32;
  miningRig.add(rigCore, rigCollar, rigArm, rigArm2);
  root.add(miningRig);

  // Sector IV Landmark: Hidden Alien Comms Listening Installation
  const commsArray = new THREE.Group();
  commsArray.position.set(
    SPACE_REGIONS.outer_frontier.worldCenter[0] + 2800,
    SPACE_REGIONS.outer_frontier.worldCenter[1] + 260,
    SPACE_REGIONS.outer_frontier.worldCenter[2] - 1200,
  );
  const commsMast = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(18, 48, 430, 10)), mats.enemyMediumArmor);
  const commsDish = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(165, 13, 8, 28)), mats.enemyWarshipArmor);
  commsDish.position.y = 90;
  const commsSpoke = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(330, 12, 16)), mats.thrusterNozzleMetal);
  commsSpoke.position.y = 90;
  commsArray.add(commsMast, commsDish, commsSpoke);
  root.add(commsArray);

  // Sector V Landmark: Sovereign Orbital Bastion Ring Pylons
  const fortressRing = new THREE.Group();
  fortressRing.position.set(
    SPACE_REGIONS.sovereign_defense_zone.worldCenter[0],
    SPACE_REGIONS.sovereign_defense_zone.worldCenter[1] + 310,
    SPACE_REGIONS.sovereign_defense_zone.worldCenter[2] - 4200,
  );
  for (let p = 0; p < 8; p++) {
    const ang = (p / 8) * Math.PI * 2;
    const pylon = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(62, 460, 4)), mats.enemyMediumArmor);
    pylon.position.set(Math.cos(ang) * 920, Math.sin(ang) * 560, 0);
    pylon.rotation.z = ang + Math.PI / 2;
    fortressRing.add(pylon);
  }
  root.add(fortressRing);

  // Friendly Flagship Carrier CSV Aegis (sculpted armored military carrier silhouette)
  const friendlyCarrier = new THREE.Group();
  friendlyCarrier.name = 'FriendlyCarrier_CSVAegis';
  const carrierHullGeo = trackGeo(
    createExtrudedHullPlate(
      [
        [0, -295],
        [44, -220],
        [76, -65],
        [82, 185],
        [58, 265],
        [-58, 265],
        [-82, 185],
        [-76, -65],
        [-44, -220],
      ],
      48,
      8,
      6,
    ),
  );
  const carrierHull = new THREE.Mesh(carrierHullGeo, mats.friendlyCarrierMat);
  const carrierDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(92, 12, 360)), mats.playerHullDarkComposite);
  carrierDeck.position.set(0, 32, 15);
  const carrierBridge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(42, 68, 96)), mats.playerHullPrimary);
  carrierBridge.position.set(22, 62, 125);
  const carrierMast = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.5, 5, 58, 6)), mats.thrusterNozzleMetal);
  carrierMast.position.set(22, 118, 125);
  friendlyCarrier.add(carrierHull, carrierDeck, carrierBridge, carrierMast);
  root.add(friendlyCarrier);

  // Allied Orbital Repair Beacon (subtle aerospace dock ring)
  const repairBeaconPos = new THREE.Vector3();
  const repairBeaconGroup = new THREE.Group();
  const repairRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38d9a9,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const repairRingOuter = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(34, 2.0, 10, 32)),
    mats.playerHullPrimary,
  );
  const repairRingGlow = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(30, 0.85, 8, 32)), repairRingMat);
  repairBeaconGroup.add(repairRingOuter, repairRingGlow);
  root.add(repairBeaconGroup);

  // Natural 3-point Space Lighting Rig synced directly with SUN_DIR
  const orbitalSun = new THREE.DirectionalLight(0xfff1de, 3.35);
  orbitalSun.position.copy(SUN_DIR).multiplyScalar(32000);
  root.add(orbitalSun);

  const orbitalBounce = new THREE.DirectionalLight(0x3f7ec4, 1.18);
  orbitalBounce.position.set(-4000, -18000, 6000);
  root.add(orbitalBounce);

  const orbitalRim = new THREE.DirectionalLight(0x82aad8, 0.92);
  orbitalRim.position.copy(SUN_DIR).multiplyScalar(-26000).add(new THREE.Vector3(0, 9000, 0));
  root.add(orbitalRim);

  // =========================================================================
  // 4. CAPITAL SHIP BUILDER WITH ALL 5 DESTRUCTIBLE 3D SUBSYSTEMS + SOVEREIGN FLAGSHIP
  // =========================================================================
  let activeCapitalShip: ActiveCapitalShipEntity | null = null;
  let selectedSubsystem: CapitalSubsystemKey | null = null;
  let manualSubsystemLock = false;
  let muzzlePanToggle = 1;

  const subsystemAmberAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b2c1a,
      emissive: 0xd97706,
      emissiveIntensity: 0.72,
      roughness: 0.38,
      metalness: 0.72,
    }),
  );
  const subsystemCyanCoilMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x163245,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.75,
      roughness: 0.32,
      metalness: 0.76,
    }),
  );
  const darkRecessBayMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b0f16,
      roughness: 0.82,
      metalness: 0.55,
    }),
  );

  const buildCapitalShipEntity = (
    name: string,
    shipClass: 'frigate' | 'assault_cruiser' | 'heavy_dreadnought' | 'sovereign_flagship',
    spawnPos: THREE.Vector3,
    shieldReductionPct: number,
    existingStatus?: CapitalShipStatus | null,
    extinctionBossId: ExtinctionBossId | null = null,
  ): ActiveCapitalShipEntity => {
    const prevTrack = trackingSectorGeos;
    trackingSectorGeos = true;
    try {
      const isFlagship = shipClass === 'sovereign_flagship';
      const isDread = shipClass === 'heavy_dreadnought';
      const isFrigate = shipClass === 'frigate';
      const scale = (isFlagship ? 1.48 : isDread ? 1.12 : isFrigate ? 0.58 : 0.82) * 1.28;

      const g = new THREE.Group();
      g.name = `CapitalShip_${shipClass}`;

      // Sculpted Class A Heavy Capital Warship (layered industrial steel battleship matching Class A reference)
      const primaryHullMat = isFlagship
        ? mats.enemyMediumArmor
        : isDread
          ? mats.dreadnoughtCrimsonHull
          : mats.enemyWarshipArmor;
      const secondaryArmorMat = isFlagship ? mats.alienObsidian : mats.enemyMediumArmor;

      // 1. Sleek, wide-beamed spearhead main hull deck (unshifted Z: prow at +620*s, stern at -420*s)
      const mainHullGeo = trackGeo(
        createExtrudedHullPlate(
          [
            [0, 620 * scale],
            [38 * scale, 455 * scale],
            [112 * scale, 215 * scale],
            [168 * scale, -40 * scale],
            [156 * scale, -330 * scale],
            [104 * scale, -420 * scale],
            [-104 * scale, -420 * scale],
            [-156 * scale, -330 * scale],
            [-168 * scale, -40 * scale],
            [-112 * scale, 215 * scale],
            [-38 * scale, 455 * scale],
          ],
          48 * scale,
          14 * scale,
          12 * scale,
          4.5,
          false,
        ),
      );
      const mainHull = new THREE.Mesh(mainHullGeo, primaryHullMat);
      g.add(mainHull);

      // 2. Stepped upper dorsal armored citadel deck
      const upperDeckGeo = trackGeo(
        createExtrudedHullPlate(
          [
            [0, 415 * scale],
            [64 * scale, 180 * scale],
            [116 * scale, -85 * scale],
            [106 * scale, -320 * scale],
            [-106 * scale, -320 * scale],
            [-116 * scale, -85 * scale],
            [-64 * scale, 180 * scale],
          ],
          30 * scale,
          10 * scale,
          8 * scale,
          3.6,
          false,
        ),
      );
      const upperDeck = new THREE.Mesh(upperDeckGeo, secondaryArmorMat);
      upperDeck.position.set(0, 38 * scale, 0);
      g.add(upperDeck);

      // 3. Armored dorsal keel spine, structural rib stiffeners & forward prow lance cannon housing
      const spineDeck = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(46 * scale, 20 * scale, 460 * scale)),
        primaryHullMat,
      );
      spineDeck.position.set(0, 60 * scale, 125 * scale);
      g.add(spineDeck);

      // Armored dorsal structural ribs & radiator fins breaking up flat deck surfaces
      const ribGeo = trackGeo(new THREE.BoxGeometry(118 * scale, 9 * scale, 18 * scale));
      for (const rz of [280, 195, 110, 25, -60, -145]) {
        const rib = new THREE.Mesh(ribGeo, mats.thrusterNozzleMetal);
        rib.position.set(0, 56 * scale, rz * scale);
        g.add(rib);
      }

      const prowConduit = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(16 * scale, 24 * scale, 160 * scale, 12)),
        mats.thrusterNozzleMetal,
      );
      prowConduit.rotation.x = Math.PI / 2;
      prowConduit.position.set(0, 14 * scale, 515 * scale);
      g.add(prowConduit);

      const prowRing = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(28 * scale, 32 * scale, 36 * scale, 12)),
        secondaryArmorMat,
      );
      prowRing.rotation.x = Math.PI / 2;
      prowRing.position.set(0, 14 * scale, 468 * scale);
      g.add(prowRing);

      // 4. Heavy lateral armored sponsons + ventral propulsion nacelles + broadside batteries
      const nacelleGeo = trackGeo(new THREE.CylinderGeometry(34 * scale, 42 * scale, 330 * scale, 14));
      nacelleGeo.rotateX(Math.PI / 2);
      const turretDeckGeo = trackGeo(new THREE.CylinderGeometry(15 * scale, 21 * scale, 14 * scale, 10));
      const barrelGeo = trackGeo(new THREE.CylinderGeometry(3.0 * scale, 3.8 * scale, 52 * scale, 6));
      barrelGeo.rotateX(Math.PI / 2);

      for (const side of [-1, 1]) {
        // Layered lateral armor ribs & mechanical sponsons
        const flank = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(46 * scale, 36 * scale, 360 * scale)),
          secondaryArmorMat,
        );
        flank.position.set(side * 158 * scale, -4 * scale, -110 * scale);
        g.add(flank);

        // Subtle warm hull porthole strip recessed along flank
        const portStrip = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(4 * scale, 4 * scale, 210 * scale)),
          subsystemAmberAccentMat,
        );
        portStrip.position.set(side * 182 * scale, 2 * scale, -85 * scale);
        g.add(portStrip);

        // Heavy ventral propulsion nacelles slung beneath rear flanks
        const nacelle = new THREE.Mesh(nacelleGeo, primaryHullMat);
        nacelle.position.set(side * 134 * scale, -48 * scale, -195 * scale);
        g.add(nacelle);

        const nacelleStrut = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(62 * scale, 24 * scale, 145 * scale)),
          secondaryArmorMat,
        );
        nacelleStrut.position.set(side * 98 * scale, -28 * scale, -185 * scale);
        nacelleStrut.rotation.z = side * 0.28;
        g.add(nacelleStrut);

        // Dark recessed nacelle exhaust throat + restrained amber plasma ring
        const throat = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(28 * scale, 28 * scale, 14 * scale, 14)),
          darkRecessBayMat,
        );
        throat.rotation.x = Math.PI / 2;
        throat.position.set(side * 134 * scale, -48 * scale, -356 * scale);
        g.add(throat);

        const exhaustRing = new THREE.Mesh(
          trackGeo(new THREE.TorusGeometry(24 * scale, 3.6 * scale, 8, 18)),
          subsystemAmberAccentMat,
        );
        exhaustRing.position.set(side * 134 * scale, -48 * scale, -363 * scale);
        g.add(exhaustRing);

        // Dorsal dual-barrel broadside turret batteries
        for (const tz of [215, 55, -105]) {
          const tBase = new THREE.Mesh(turretDeckGeo, mats.thrusterNozzleMetal);
          tBase.position.set(side * 72 * scale, 62 * scale, tz * scale);
          g.add(tBase);
          for (const bo of [-5, 5]) {
            const brl = new THREE.Mesh(barrelGeo, mats.weaponGunmetal);
            brl.position.set(side * 72 * scale + bo * scale, 65 * scale, (tz + 26) * scale);
            g.add(brl);
          }
        }
      }

      // Extra Sovereign Flagship dorsal crescent wings & molten reactor core
      if (isFlagship) {
        for (const side of [-1, 1]) {
          const wingGeo = trackGeo(
            createExtrudedHullPlate(
              [
                [0, 140 * scale],
                [340 * scale, -20 * scale],
                [310 * scale, -220 * scale],
                [0, -160 * scale],
              ],
              24 * scale,
              8 * scale,
              6 * scale,
              3.2,
              false,
            ),
          );
          const wing = new THREE.Mesh(wingGeo, mats.alienObsidian);
          wing.position.set(side * 130 * scale, 8 * scale, -60 * scale);
          if (side < 0) wing.scale.x = -1;
          g.add(wing);
        }
        const sovereignCore = new THREE.Mesh(
          trackGeo(new THREE.OctahedronGeometry(42 * scale, 1)),
          mats.sovereignEmissive,
        );
        sovereignCore.position.set(0, 86 * scale, 220 * scale);
        g.add(sovereignCore);
      }

      // 5. Elevated stern command bridge tower + armored sensor dome (destructible Command Bridge target!)
      const bridgeGroup = new THREE.Group();
      bridgeGroup.name = 'CapitalCommandBridge';
      const bridgeBase = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(74 * scale, 64 * scale, 126 * scale)),
        primaryHullMat,
      );
      bridgeBase.position.set(0, 82 * scale, -235 * scale);
      bridgeGroup.add(bridgeBase);

      const bridgeNeck = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(52 * scale, 34 * scale, 78 * scale)),
        secondaryArmorMat,
      );
      bridgeNeck.position.set(0, 124 * scale, -242 * scale);
      bridgeGroup.add(bridgeNeck);

      const bridgeCrown = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(36 * scale, 42 * scale, 28 * scale, 16)),
        primaryHullMat,
      );
      bridgeCrown.position.set(0, 152 * scale, -242 * scale);
      bridgeGroup.add(bridgeCrown);

      const bridgeDomeCap = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(34 * scale, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)),
        secondaryArmorMat,
      );
      bridgeDomeCap.position.set(0, 164 * scale, -242 * scale);
      bridgeGroup.add(bridgeDomeCap);

      // Subtle recessed warm slit bridge windows (not a glowing neon slab)
      const bridgeVisor = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(44 * scale, 6 * scale, 6 * scale)),
        subsystemAmberAccentMat,
      );
      bridgeVisor.position.set(0, 148 * scale, -206 * scale);
      bridgeGroup.add(bridgeVisor);
      g.add(bridgeGroup);

      // 6. 5 Integrated Destructible Industrial 3D Subsystems (Zero bright yellow cones or glowing orange cubes!)
      // 6a. Shield Generator Array: armored ring housing + subtle recessed cyan plasma coils
      const shieldGroup = new THREE.Group();
      shieldGroup.position.set(0, 74 * scale, 155 * scale);
      const shieldHousing = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(30 * scale, 38 * scale, 22 * scale, 12)),
        mats.thrusterNozzleMetal,
      );
      const shieldCoilRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(28 * scale, 4.2 * scale, 8, 16)),
        subsystemCyanCoilMat,
      );
      shieldCoilRing.rotation.x = Math.PI / 2;
      shieldCoilRing.position.y = 4 * scale;
      shieldGroup.add(shieldHousing, shieldCoilRing);
      g.add(shieldGroup);

      // 6b. Primary Weapon Battery: armored starboard twin-cannon casemate
      const weaponGroup = new THREE.Group();
      weaponGroup.position.set(162 * scale, 24 * scale, 35 * scale);
      const wpnCasemate = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(46 * scale, 28 * scale, 118 * scale)),
        mats.thrusterNozzleMetal,
      );
      weaponGroup.add(wpnCasemate);
      for (const bx of [-10, 10]) {
        const heavyBrl = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(4.5 * scale, 5.5 * scale, 92 * scale, 8)),
          mats.weaponGunmetal,
        );
        heavyBrl.rotation.x = Math.PI / 2;
        heavyBrl.position.set(bx * scale, 4 * scale, 78 * scale);
        weaponGroup.add(heavyBrl);
      }
      g.add(weaponGroup);

      // 6c. Main Stern Engine Manifold: armored thruster cowling + triple recessed dark exhaust nozzles
      const engineGroup = new THREE.Group();
      engineGroup.position.set(0, 2 * scale, -424 * scale);
      const engCowling = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(164 * scale, 42 * scale, 30 * scale)),
        mats.thrusterNozzleMetal,
      );
      engineGroup.add(engCowling);
      for (const ex of [-54, 0, 54]) {
        const noz = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(18 * scale, 22 * scale, 24 * scale, 12)),
          darkRecessBayMat,
        );
        noz.rotation.x = Math.PI / 2;
        noz.position.set(ex * scale, 0, -14 * scale);
        engineGroup.add(noz);

        const glow = new THREE.Mesh(
          trackGeo(new THREE.TorusGeometry(15 * scale, 3.0 * scale, 8, 16)),
          subsystemAmberAccentMat,
        );
        glow.position.set(ex * scale, 0, -24 * scale);
        engineGroup.add(glow);
      }
      g.add(engineGroup);

      // 6d. Fleet Comms & Sensor Mast: sleek dark metallic lattice mast + parabolic radar wing (NO yellow cone!)
      const commsGroup = new THREE.Group();
      commsGroup.position.set(0, 184 * scale, -242 * scale);
      const mastPole = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(3.2 * scale, 6.5 * scale, 64 * scale, 8)),
        mats.thrusterNozzleMetal,
      );
      const radarBar = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(92 * scale, 8 * scale, 14 * scale)),
        secondaryArmorMat,
      );
      radarBar.position.y = 14 * scale;
      const beaconTip = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(4.2 * scale, 8, 8)),
        subsystemAmberAccentMat,
      );
      beaconTip.position.y = 33 * scale;
      commsGroup.add(mastPole, radarBar, beaconTip);
      g.add(commsGroup);

      // 6e. Port Flight-Deck Hangar Bay: recessed dark armored flight bay alcove + thin guide lights (NO glowing cube!)
      const hangarGroup = new THREE.Group();
      hangarGroup.position.set(-164 * scale, -4 * scale, -55 * scale);
      const bayFrame = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(44 * scale, 34 * scale, 134 * scale)),
        mats.thrusterNozzleMetal,
      );
      const bayRecess = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(10 * scale, 22 * scale, 108 * scale)),
        darkRecessBayMat,
      );
      bayRecess.position.x = -19 * scale;
      const bayGuideStrip = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(4 * scale, 3 * scale, 98 * scale)),
        subsystemAmberAccentMat,
      );
      bayGuideStrip.position.set(-22 * scale, -10 * scale, 0);
      hangarGroup.add(bayFrame, bayRecess, bayGuideStrip);
      g.add(hangarGroup);

    // 7. Distinct Extinction Mini-Boss & Major-Boss Sculpted Assemblies
    let harvesterSpinnerGroup: THREE.Group | undefined;
    let harvesterCoreMeshes: ActiveCapitalShipEntity['harvesterCoreMeshes'];
    let telegraphBeamMesh: THREE.Mesh | undefined;

    if (extinctionBossId === 'carrier_warden') {
      // Twin expanded starboard carrier flight deck bay
      const stbdDeck = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(58 * scale, 36 * scale, 165 * scale)),
        mats.thrusterNozzleMetal,
      );
      stbdDeck.position.set(172 * scale, -2 * scale, -40 * scale);
      const stbdGlow = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(6 * scale, 4 * scale, 130 * scale)),
        subsystemAmberAccentMat,
      );
      stbdGlow.position.set(200 * scale, -6 * scale, -40 * scale);
      g.add(stbdDeck, stbdGlow);
    } else if (extinctionBossId === 'siege_breaker' || extinctionBossId === 'iron_revenant') {
      // Layered Dreadnought Siege Prow Ram & Reinforced Assault Sponsons
      for (const s of [-1, 1]) {
        const prowBlade = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(36 * scale, 54 * scale, 210 * scale)),
          extinctionBossId === 'iron_revenant' ? mats.dreadnoughtCrimsonHull : mats.alienObsidian,
        );
        prowBlade.position.set(s * 96 * scale, 12 * scale, 425 * scale);
        prowBlade.rotation.y = s * -0.18;
        g.add(prowBlade);
      }
    } else if (extinctionBossId === 'void_harvester') {
      // Non-human Mechanical Construct: Counter-Rotating Tri-Ring Frame + 3 Independently Destructible Energy Cores
      harvesterSpinnerGroup = new THREE.Group();
      harvesterSpinnerGroup.position.set(0, 22 * scale, 75 * scale);
      const outerHalo = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(285 * scale, 18 * scale, 10, 6)),
        mats.alienObsidian,
      );
      const innerHalo = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(195 * scale, 12 * scale, 8, 8)),
        subsystemCyanCoilMat,
      );
      harvesterSpinnerGroup.add(outerHalo, innerHalo);

      const coreMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 1.45,
          roughness: 0.18,
          metalness: 0.4,
        }),
      );
      const coreIds: HarvesterEnergyCoreState['id'][] = ['core_alpha', 'core_beta', 'core_gamma'];
      harvesterCoreMeshes = coreIds.map((cid, idx) => {
        const ang = (idx * Math.PI * 2) / 3;
        const cg = new THREE.Group();
        cg.position.set(Math.cos(ang) * 265 * scale, Math.sin(ang) * 265 * scale, 0);
        const pylonHousing = new THREE.Mesh(
          trackGeo(new THREE.OctahedronGeometry(42 * scale, 0)),
          mats.thrusterNozzleMetal,
        );
        const coreOrb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(28 * scale, 14, 14)), coreMat);
        const cageRing = new THREE.Mesh(
          trackGeo(new THREE.TorusGeometry(46 * scale, 4.5 * scale, 8, 16)),
          subsystemAmberAccentMat,
        );
        cg.add(pylonHousing, coreOrb, cageRing);
        harvesterSpinnerGroup!.add(cg);
        return { id: cid, group: cg, coreMesh: coreOrb };
      });
      g.add(harvesterSpinnerGroup);
    } else if (extinctionBossId === 'sovereign_extinction') {
      // Omega Mothership Citadel dorsal crown spire & molten nova core
      const crownRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(185 * scale, 14 * scale, 10, 24)),
        mats.dreadnoughtCrimsonHull,
      );
      crownRing.rotation.x = Math.PI / 2;
      crownRing.position.set(0, 115 * scale, 40 * scale);
      const spire = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(42 * scale, 220 * scale, 8)),
        mats.alienObsidian,
      );
      spire.position.set(0, 225 * scale, -180 * scale);
      g.add(crownRing, spire);
    }

    if (extinctionBossId && extinctionBossId !== 'executioner') {
      const beamMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: extinctionBossId === 'void_harvester' ? 0x38bdf8 : 0xff3b1f,
          transparent: true,
          opacity: 0.52,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const beamGeo = trackGeo(new THREE.CylinderGeometry(3.2 * scale, 11 * scale, 1900, 10, 1, true));
      beamGeo.rotateX(Math.PI / 2);
      beamGeo.translate(0, 0, 950);
      telegraphBeamMesh = new THREE.Mesh(beamGeo, beamMat);
      telegraphBeamMesh.position.set(0, 24 * scale, 460 * scale);
      telegraphBeamMesh.visible = false;
      g.add(telegraphBeamMesh);
    }

    g.position.copy(spawnPos);
    g.rotation.set(0.04, 0.34, -0.03);
    sectorDynamicGroup.add(g);

    const status =
      existingStatus ??
      createCapitalShipStatus(
        `cap_${shipClass}_${Date.now()}`,
        name,
        shipClass,
        shieldReductionPct,
      );

    const helm = createCapitalHelmState(shipClass, { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z });
    const escortSquadronPlan = createEscortSquadronPlan(shipClass);

    return {
      root: g,
      status,
      pos: spawnPos.clone(),
      subsystemMeshes: {
        shields: shieldGroup,
        weapons: weaponGroup,
        engines: engineGroup,
        comms: commsGroup,
        hangar: hangarGroup,
      },
      bridgeMesh: bridgeGroup,
      damageFireTimer: 0.4,
      lastHitAge: 99,
      destroyedFlashTimer: 0,
      turretCooldown: 2.2,
      reinforceCooldown: 18,
      helm,
      criticalCountdown: null,
      escortSquadronPlan,
      escortEnemyIds: [],
      reinforcementWavesLaunched: 0,
      extinctionBossId,
      harvesterSpinnerGroup,
      harvesterCoreMeshes,
      telegraphBeamMesh,
    };
    } finally {
      trackingSectorGeos = prevTrack;
    }
  };

  const getSubsystemWorldPos = (
    cap: ActiveCapitalShipEntity,
    key: CapitalSubsystemKey,
    out: THREE.Vector3,
  ): THREE.Vector3 => {
    cap.subsystemMeshes[key].getWorldPosition(out);
    return out;
  };

  // =========================================================================
  // 5. GEOLOGICAL ASTEROID SYSTEM (10 ARCHETYPES + INSTANCED BELTS) & REBUILT ENEMY FLEET
  // =========================================================================
  // 6 high-detail (detail=3, 1280 faces) hero/large/medium geological asteroids + 4 mid-detail (detail=2) belt rocks
  const asteroidHeroTemplates = [
    trackGeo(buildIrregularAsteroidGeometry(11, 3, 0)),
    trackGeo(buildIrregularAsteroidGeometry(27, 3, 1)),
    trackGeo(buildIrregularAsteroidGeometry(43, 3, 2)),
    trackGeo(buildIrregularAsteroidGeometry(61, 3, 3)),
    trackGeo(buildIrregularAsteroidGeometry(79, 3, 4)),
    trackGeo(buildIrregularAsteroidGeometry(97, 3, 5)),
  ];
  const asteroidSmallTemplates = [
    trackGeo(buildIrregularAsteroidGeometry(113, 2, 6)),
    trackGeo(buildIrregularAsteroidGeometry(137, 2, 7)),
    trackGeo(buildIrregularAsteroidGeometry(151, 2, 8)),
    trackGeo(buildIrregularAsteroidGeometry(173, 2, 9)),
  ];
  // Sculpted jagged metallic-rock debris shards (ZERO flat grey slab placeholders!)
  const wreckShardGeo = trackGeo(buildWreckageShardGeometry(211));

  // Batched InstancedMesh scenic asteroid belts (rebuilt cleanly per sector)
  const scenicBeltGroup = new THREE.Group();
  scenicBeltGroup.name = 'ScenicAsteroidBelts';
  asteroidGroup.add(scenicBeltGroup);
  let scenicBeltMeshes: THREE.InstancedMesh[] = [];

  const asteroids: AsteroidHazard[] = [];
  const enemies: EnemyStarfighter[] = [];

  // Realistic dark reflective tinted glass canopy for enemy warships & fighters (ZERO glowing neon boxes!)
  const enemyCanopyGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x0b121c,
      emissive: 0x261206,
      emissiveIntensity: 0.24,
      roughness: 0.08,
      metalness: 0.34,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.85,
    }),
  );

  // Soft tapered GLSL volumetric thruster plume for enemy craft (ZERO hard glowing circles!)
  const enemyThrusterHotMat = trackMat(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormalV = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        void main() {
          // vUv.y: 1.0 at nozzle throat, 0.0 at tapered tail tip
          float axial = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
          float edge = pow(abs(dot(normalize(vNormalV), normalize(vViewDir))), 1.35);
          vec3 coreCol = vec3(1.0, 0.82, 0.56);
          vec3 tailCol = vec3(0.92, 0.32, 0.08);
          vec3 col = mix(tailCol, coreCol, pow(vUv.y, 1.7));
          float alpha = axial * edge * 0.78;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    }),
  );

  const heatedBarrelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x342c2e,
      emissive: 0xd94816,
      emissiveIntensity: 0.95,
      roughness: 0.38,
      metalness: 0.84,
    }),
  );

  // Shared machined LatheGeometry enemy engine bell (hollow tapered metallic nozzle)
  const enemyBellPoints = [
    new THREE.Vector2(0.58, 0.0),
    new THREE.Vector2(0.66, 0.25),
    new THREE.Vector2(0.52, 0.95),
    new THREE.Vector2(0.46, 1.35),
    new THREE.Vector2(0.38, 1.32),
    new THREE.Vector2(0.44, 0.25),
  ];
  const enemyNozzleBellGeo = trackGeo(new THREE.LatheGeometry(enemyBellPoints, 14));
  enemyNozzleBellGeo.rotateX(Math.PI / 2);

  const enemyPlumeConeGeo = trackGeo(new THREE.ConeGeometry(0.44, 3.1, 12, 1, true));
  enemyPlumeConeGeo.rotateX(Math.PI / 2);

  /**
   * Builds visually distinct sculpted aerospace silhouettes for:
   * - Class B Medium Warship (`medium_warship` — sculpted lofted stealth assault corvette)
   * - Class C Standard Fighters (all 5 roles rebuilt with lofted fuselages + dark reflective glass canopies!)
   * Note: Enemy forward axis is -Z (matches lookAt in AI loop), engines at +Z.
   */
  const buildAlienStarfighterMesh = (
    role: ExtinctionEnemyRole,
    legendaryDef?: LegendaryPilotDef,
    extra?: { isExecutionerBoss?: boolean },
  ): THREE.Group => {
    const prevTrack = trackingSectorGeos;
    trackingSectorGeos = true;
    try {
      const g = new THREE.Group();
    const isExec = Boolean(extra?.isExecutionerBoss);

      const addFighterThruster = (x: number, y: number, z: number, sc = 1.0) => {
        const noz = new THREE.Mesh(enemyNozzleBellGeo, mats.thrusterNozzleMetal);
        noz.position.set(x, y, z - 0.5 * sc);
        noz.scale.setScalar(sc);
        g.add(noz);

        const coreRecess = new THREE.Mesh(
          trackGeo(new THREE.CircleGeometry(0.36 * sc, 10)),
          darkRecessBayMat,
        );
        coreRecess.position.set(x, y, z + 0.28 * sc);
        g.add(coreRecess);

        const fl = new THREE.Mesh(enemyPlumeConeGeo, enemyThrusterHotMat);
        fl.position.set(x, y, z + 1.85 * sc);
        fl.scale.setScalar(sc);
        g.add(fl);
      };

      // -----------------------------------------------------------------------
      // CLASS B — MEDIUM WARSHIP / HEAVY ASSAULT CORVETTE
      // Sculpted lofted faceted stealth wedge + framed glass bridge + twin triple-barrel rotary cannons
      // -----------------------------------------------------------------------
      if (role === 'medium_warship') {
        g.name = 'ClassB_MediumWarship';
        const s = 1.0;

        // Sculpted lofted faceted main stealth corvette hull (nose -21.5 -> stern +18.2)
        const mainLoftGeo = trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: -21.5 * s, halfWidth: 0.45 * s, topY: 0.15 * s, bottomY: -0.32 * s, chineY: -0.05 * s },
              { z: -16.8 * s, halfWidth: 3.9 * s, topY: 1.05 * s, bottomY: -1.15 * s, chineY: 0.05 * s, deckFrac: 0.56 },
              { z: -9.5 * s, halfWidth: 8.6 * s, topY: 2.1 * s, bottomY: -1.95 * s, chineY: 0.18 * s, deckFrac: 0.62 },
              { z: 1.2 * s, halfWidth: 14.2 * s, topY: 2.85 * s, bottomY: -2.4 * s, chineY: 0.15 * s, deckFrac: 0.64 },
              { z: 11.8 * s, halfWidth: 11.6 * s, topY: 2.75 * s, bottomY: -2.15 * s, chineY: 0.2 * s, deckFrac: 0.6 },
              { z: 17.8 * s, halfWidth: 7.4 * s, topY: 2.15 * s, bottomY: -1.65 * s, chineY: 0.25 * s, deckFrac: 0.56 },
            ],
            0.11,
          ),
        );
        g.add(new THREE.Mesh(mainLoftGeo, mats.enemyMediumArmor));

        // Raised dorsal armor spine & stealth carapace
        const dorsalLoftGeo = trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: -13.5 * s, halfWidth: 1.8 * s, topY: 2.4 * s, bottomY: 1.3 * s, chineY: 1.8 * s },
              { z: -4.0 * s, halfWidth: 6.4 * s, topY: 3.65 * s, bottomY: 2.0 * s, chineY: 2.7 * s, deckFrac: 0.58 },
              { z: 7.5 * s, halfWidth: 7.2 * s, topY: 3.85 * s, bottomY: 2.1 * s, chineY: 2.85 * s, deckFrac: 0.6 },
              { z: 14.6 * s, halfWidth: 5.2 * s, topY: 3.15 * s, bottomY: 1.8 * s, chineY: 2.4 * s },
            ],
            0.12,
          ),
        );
        g.add(new THREE.Mesh(dorsalLoftGeo, mats.enemyWarshipArmor));

        // Armored sloped bridge deckhouse with framed dark reflective canopy glass & mullion struts
        const bridgeLoftGeo = trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: 1.4 * s, halfWidth: 2.8 * s, topY: 5.15 * s, bottomY: 3.4 * s, chineY: 4.35 * s, deckFrac: 0.62 },
              { z: 4.8 * s, halfWidth: 3.9 * s, topY: 5.75 * s, bottomY: 3.6 * s, chineY: 4.7 * s, deckFrac: 0.66 },
              { z: 11.4 * s, halfWidth: 4.1 * s, topY: 5.45 * s, bottomY: 3.4 * s, chineY: 4.45 * s, deckFrac: 0.62 },
              { z: 13.8 * s, halfWidth: 2.4 * s, topY: 4.55 * s, bottomY: 3.1 * s, chineY: 3.8 * s },
            ],
            0.16,
          ),
        );
        g.add(new THREE.Mesh(bridgeLoftGeo, mats.enemyMediumArmor));

        const bridgeGlass = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(5.1 * s, 0.96 * s, 1.65 * s)),
          enemyCanopyGlassMat,
        );
        bridgeGlass.position.set(0, 4.72 * s, 2.25 * s);
        bridgeGlass.rotation.x = 0.24;
        g.add(bridgeGlass);

        for (const mx of [-1.45, 0, 1.45]) {
          const mullion = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(0.18 * s, 1.05 * s, 1.72 * s)),
            mats.thrusterNozzleMetal,
          );
          mullion.position.set(mx * s, 4.72 * s, 2.22 * s);
          mullion.rotation.x = 0.24;
          g.add(mullion);
        }

        // Machined multi-barrel rotary gatling cannons with sculpted sloped turret cowlings
        const gatlingBarrelGeo = trackGeo(new THREE.CylinderGeometry(0.16 * s, 0.19 * s, 11.2 * s, 7));
        gatlingBarrelGeo.rotateX(Math.PI / 2);
        const breechCollarGeo = trackGeo(new THREE.CylinderGeometry(0.54 * s, 0.6 * s, 1.8 * s, 10));
        breechCollarGeo.rotateX(Math.PI / 2);
        const turretCowlGeo = trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: -11.2 * s, halfWidth: 0.72 * s, topY: 0.76 * s, bottomY: -0.68 * s, chineY: 0.05 * s },
              { z: -8.6 * s, halfWidth: 1.38 * s, topY: 1.05 * s, bottomY: -0.84 * s, chineY: 0.1 * s },
              { z: -4.2 * s, halfWidth: 1.24 * s, topY: 0.92 * s, bottomY: -0.78 * s, chineY: 0.06 * s },
              { z: -2.4 * s, halfWidth: 0.65 * s, topY: 0.45 * s, bottomY: -0.55 * s, chineY: 0.0 },
            ],
            0.22,
          ),
        );
        const corvetteFinGeo = trackGeo(
          createExtrudedHullPlate(
            [
              [0, -2.6 * s],
              [4.2 * s, 1.6 * s],
              [4.2 * s, 3.6 * s],
              [0, 2.8 * s],
            ],
            0.42 * s,
            0.08,
            0.06,
            1.8,
            true,
          ),
        );

        for (const side of [-1, 1]) {
          const mount = new THREE.Mesh(turretCowlGeo, mats.thrusterNozzleMetal);
          mount.position.set(side * 5.1 * s, 2.35 * s, 0);
          g.add(mount);

          const breechCollar = new THREE.Mesh(breechCollarGeo, heatedBarrelMat);
          breechCollar.position.set(side * 5.1 * s, 2.35 * s, -11.4 * s);
          g.add(breechCollar);

          const barrelOffsets: [number, number][] = [
            [0, 0.25],
            [-0.23, -0.15],
            [0.23, -0.15],
          ];
          for (const [bx, by] of barrelOffsets) {
            const brl = new THREE.Mesh(gatlingBarrelGeo, mats.weaponGunmetal);
            brl.position.set(side * 5.1 * s + bx * s, 2.35 * s + by * s, -15.6 * s);
            g.add(brl);
          }

          // Recessed dark radiator louver vent (subtle realistic cooling grille, zero bright neon slab!)
          const ventHousing = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(0.95 * s, 0.95 * s, 4.6 * s)),
            darkRecessBayMat,
          );
          ventHousing.position.set(side * 12.1 * s, 0.2 * s, -1.6 * s);
          g.add(ventHousing);

          const ventGlow = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(0.18 * s, 0.16 * s, 2.2 * s)),
            subsystemCyanCoilMat,
          );
          ventGlow.position.set(side * 12.55 * s, 0.2 * s, -1.6 * s);
          g.add(ventGlow);

          const wingBlade = new THREE.Mesh(
            trackGeo(
              createExtrudedHullPlate(
                [
                  [0, -2.5 * s],
                  [8.8 * s, 4.4 * s],
                  [7.8 * s, 9.0 * s],
                  [0, 5.6 * s],
                ],
                0.66 * s,
                0.2,
                0.15,
                2.2,
                false,
              ),
            ),
            mats.enemyMediumArmor,
          );
          wingBlade.position.set(side * 11.0 * s, 0.15 * s, 5.2 * s);
          if (side < 0) wingBlade.scale.x = -1;
          g.add(wingBlade);

          const stab = new THREE.Mesh(corvetteFinGeo, mats.enemyWarshipArmor);
          stab.rotation.z = Math.PI / 2 + side * -0.44;
          stab.position.set(side * 9.6 * s, 3.45 * s, 12.4 * s);
          g.add(stab);

          addFighterThruster(side * 5.2 * s, 0.35 * s, 18.2 * s, 2.85);
        }

        addFighterThruster(0, 0.85 * s, 18.6 * s, 3.45);
        g.scale.setScalar(1.45);
        return g;
      }

      // -----------------------------------------------------------------------
      // CLASS C — ALL 5 STANDARD FIGHTER ROLES REBUILT WITH SCULPTED LOFTED FUSELAGES
      // + DARK REFLECTIVE TINTED GLASS CANOPIES (ZERO GLOWING NEON BOXES!)
      // -----------------------------------------------------------------------
      const gunBarrelGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.11, 3.4, 6));
      gunBarrelGeo.rotateX(Math.PI / 2);

      const addSculptedCanopy = (zFront: number, zMid: number, zRear: number, halfW: number, baseY: number, peakY: number) => {
        const canopyGeo = trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: zFront, halfWidth: halfW * 0.25, topY: baseY + 0.08, bottomY: baseY - 0.06, chineY: baseY },
              { z: zMid, halfWidth: halfW, topY: peakY, bottomY: baseY - 0.04, chineY: baseY + (peakY - baseY) * 0.42 },
              { z: zRear, halfWidth: halfW * 0.72, topY: baseY + (peakY - baseY) * 0.65, bottomY: baseY - 0.04, chineY: baseY + 0.14 },
            ],
            0.3,
          ),
        );
        g.add(new THREE.Mesh(canopyGeo, enemyCanopyGlassMat));
        // Metallic canopy bow frame arch
        const frame = new THREE.Mesh(
          trackGeo(new THREE.TorusGeometry(halfW * 0.92, 0.065, 6, 12, Math.PI)),
          mats.thrusterNozzleMetal,
        );
        frame.position.set(0, baseY + 0.06, zMid);
        g.add(frame);
      };

      const sweptFinGeo = trackGeo(
        createExtrudedHullPlate(
          [
            [0, -1.2],
            [1.85, 0.9],
            [1.85, 1.75],
            [0, 1.35],
          ],
          0.12,
          0.03,
          0.02,
          1.8,
          true,
        ),
      );

      if (role === 'interceptor') {
        // Razor-sleek twin-chine stealth interceptor with gunmetal delta wings, dark crimson trim & swept fins
        const hullGeo = trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: -7.2, halfWidth: 0.14, topY: 0.08, bottomY: -0.1, chineY: 0.0 },
              { z: -4.2, halfWidth: 0.88, topY: 0.56, bottomY: -0.44, chineY: 0.05 },
              { z: -0.6, halfWidth: 1.48, topY: 0.86, bottomY: -0.64, chineY: 0.06 },
              { z: 2.8, halfWidth: 1.56, topY: 0.78, bottomY: -0.58, chineY: 0.04 },
              { z: 4.6, halfWidth: 1.08, topY: 0.52, bottomY: -0.46, chineY: 0.02 },
            ],
            0.22,
          ),
        );
        g.add(new THREE.Mesh(hullGeo, mats.enemyFighterArmor));
        addSculptedCanopy(-3.2, -1.6, 0.2, 0.62, 0.58, 1.18);

        for (const s of [-1, 1]) {
          const wing = new THREE.Mesh(
            trackGeo(
              createExtrudedHullPlate(
                [
                  [0, -2.2],
                  [5.4, 2.3],
                  [4.7, 3.6],
                  [0, 1.8],
                ],
                0.22,
                0.06,
                0.05,
                2.2,
                false,
              ),
            ),
            mats.enemyMediumArmor,
          );
          wing.position.set(s * 1.15, -0.02, 0.25);
          if (s < 0) wing.scale.x = -1;
          g.add(wing);

          // Tactical dark crimson wing root armor accent strip (weathered metallic, never bright plastic)
          const wingTrim = new THREE.Mesh(
            trackGeo(
              createExtrudedHullPlate(
                [
                  [0.2, -1.6],
                  [2.9, 1.1],
                  [2.5, 1.9],
                  [0.2, 0.4],
                ],
                0.08,
                0.02,
                0.02,
                1.8,
                false,
              ),
            ),
            mats.dreadnoughtCrimsonHull,
          );
          wingTrim.position.set(s * 1.18, 0.14, 0.28);
          if (s < 0) wingTrim.scale.x = -1;
          g.add(wingTrim);

          // Swept tapered stealth vertical tail fin (ZERO rectangular box fins!)
          const tail = new THREE.Mesh(sweptFinGeo, mats.enemyFighterArmor);
          tail.rotation.z = Math.PI / 2 + s * -0.42;
          tail.position.set(s * 1.38, 1.05, 3.25);
          g.add(tail);

          const gun = new THREE.Mesh(gunBarrelGeo, mats.weaponGunmetal);
          gun.position.set(s * 0.95, -0.26, -4.4);
          g.add(gun);

          addFighterThruster(s * 0.62, 0.0, 4.7, 0.88);
        }
      } else if (role === 'heavy_fighter') {
        // Twin-boom armored assault striker with sculpted nacelles & quad forward barrels
        const bodyGeo = trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: -6.4, halfWidth: 0.28, topY: 0.16, bottomY: -0.22, chineY: 0.0 },
              { z: -3.2, halfWidth: 1.85, topY: 0.98, bottomY: -0.78, chineY: 0.08 },
              { z: 1.4, halfWidth: 2.55, topY: 1.24, bottomY: -0.96, chineY: 0.1 },
              { z: 4.8, halfWidth: 1.75, topY: 0.88, bottomY: -0.74, chineY: 0.06 },
            ],
            0.18,
          ),
        );
        g.add(new THREE.Mesh(bodyGeo, mats.enemyMediumArmor));
        addSculptedCanopy(-3.6, -1.8, 0.4, 0.96, 0.94, 1.62);

        const boomGeo = trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: -5.4, halfWidth: 0.22, topY: 0.25, bottomY: -0.25, chineY: 0 },
              { z: -2.2, halfWidth: 0.72, topY: 0.62, bottomY: -0.58, chineY: 0 },
              { z: 3.6, halfWidth: 0.78, topY: 0.68, bottomY: -0.62, chineY: 0 },
              { z: 4.8, halfWidth: 0.56, topY: 0.5, bottomY: -0.46, chineY: 0 },
            ],
            0.22,
          ),
        );

        for (const s of [-1, 1]) {
          const boom = new THREE.Mesh(boomGeo, mats.enemyWarshipArmor);
          boom.position.set(s * 3.85, 0.05, 0);
          g.add(boom);

          const wingBridge = new THREE.Mesh(
            trackGeo(
              createExtrudedHullPlate(
                [
                  [0, -1.6],
                  [2.6, -0.4],
                  [2.6, 2.4],
                  [0, 2.8],
                ],
                0.38,
                0.08,
                0.06,
                1.8,
                false,
              ),
            ),
            mats.dreadnoughtCrimsonHull,
          );
          wingBridge.position.set(s * 1.45, 0.02, 0.2);
          if (s < 0) wingBridge.scale.x = -1;
          g.add(wingBridge);

          for (const by of [-0.22, 0.22]) {
            const gun = new THREE.Mesh(gunBarrelGeo, mats.weaponGunmetal);
            gun.position.set(s * 3.85, by, -5.8);
            g.add(gun);
          }

          addFighterThruster(s * 3.85, 0.05, 4.9, 1.15);
        }
        addFighterThruster(0, 0.1, 5.1, 1.05);
      } else if (role === 'bomber') {
        // Wide armored ordnance strike bomber with sculpted torpedo pods
        const bodyGeo = trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: -6.2, halfWidth: 1.4, topY: 0.55, bottomY: -0.68, chineY: -0.05 },
              { z: -2.4, halfWidth: 3.4, topY: 1.38, bottomY: -1.18, chineY: 0.1 },
              { z: 2.2, halfWidth: 3.5, topY: 1.44, bottomY: -1.24, chineY: 0.12 },
              { z: 5.1, halfWidth: 2.6, topY: 1.08, bottomY: -0.92, chineY: 0.08 },
            ],
            0.16,
          ),
        );
        g.add(new THREE.Mesh(bodyGeo, mats.enemyWarshipArmor));
        addSculptedCanopy(-4.6, -2.8, -0.8, 1.32, 1.18, 1.88);

        for (const s of [-1, 1]) {
          const pod = new THREE.Mesh(
            trackGeo(new THREE.CylinderGeometry(0.88, 1.04, 7.6, 12)),
            mats.scorchedHull,
          );
          pod.rotation.x = Math.PI / 2;
          pod.position.set(s * 4.2, -0.58, 0.2);
          g.add(pod);

          const stubWing = new THREE.Mesh(
            trackGeo(
              createExtrudedHullPlate(
                [
                  [0, -1.8],
                  [3.4, 0.4],
                  [3.1, 3.2],
                  [0, 3.0],
                ],
                0.42,
                0.08,
                0.07,
                1.8,
                false,
              ),
            ),
            mats.enemyMediumArmor,
          );
          stubWing.position.set(s * 2.5, 0.25, 0.4);
          if (s < 0) stubWing.scale.x = -1;
          g.add(stubWing);

          addFighterThruster(s * 1.85, 0.1, 5.2, 1.28);
        }
      } else if (role === 'scout') {
        // Slender long-range stealth sensor dart with high-aspect swept wings & dorsal radar ring
        const bodyGeo = trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: -8.2, halfWidth: 0.1, topY: 0.06, bottomY: -0.06, chineY: 0 },
              { z: -4.2, halfWidth: 0.64, topY: 0.44, bottomY: -0.34, chineY: 0.04 },
              { z: 0.4, halfWidth: 1.12, topY: 0.66, bottomY: -0.46, chineY: 0.06 },
              { z: 4.3, halfWidth: 0.68, topY: 0.42, bottomY: -0.34, chineY: 0.04 },
            ],
            0.22,
          ),
        );
        g.add(new THREE.Mesh(bodyGeo, mats.enemyMediumArmor));
        addSculptedCanopy(-3.4, -1.8, 0.0, 0.46, 0.44, 0.92);

        for (const s of [-1, 1]) {
          const wing = new THREE.Mesh(
            trackGeo(
              createExtrudedHullPlate(
                [
                  [0, -0.8],
                  [5.8, 1.4],
                  [5.4, 2.3],
                  [0, 1.3],
                ],
                0.18,
                0.04,
                0.04,
                2.2,
                false,
              ),
            ),
            mats.enemyFighterArmor,
          );
          wing.position.set(s * 0.72, 0.02, 0.6);
          if (s < 0) wing.scale.x = -1;
          g.add(wing);
        }

        const sensorMast = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.14, 0.24, 0.68, 8)),
          mats.thrusterNozzleMetal,
        );
        sensorMast.position.set(0, 0.78, 0.9);
        g.add(sensorMast);

        const sensorRing = new THREE.Mesh(
          trackGeo(new THREE.TorusGeometry(1.12, 0.12, 8, 18)),
          mats.thrusterNozzleMetal,
        );
        sensorRing.rotation.x = Math.PI / 2;
        sensorRing.position.set(0, 1.12, 0.9);
        g.add(sensorRing);

        addFighterThruster(0, 0, 4.45, 0.94);
      } else if (role === 'phantom_interceptor') {
      // Extinction Archetype 1: Stealth needle-wing Phantom with fadeable cloak materials
      const cloakHullMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x1e2436,
          emissive: 0x312e81,
          emissiveIntensity: 0.35,
          metalness: 0.85,
          roughness: 0.25,
          transparent: true,
          opacity: 0.2,
        }),
      );
      const cloakWingMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x312e81,
          emissive: 0x6366f1,
          emissiveIntensity: 0.42,
          metalness: 0.82,
          roughness: 0.28,
          transparent: true,
          opacity: 0.22,
        }),
      );
      g.userData.cloakMaterials = [cloakHullMat, cloakWingMat];

      const pBody = new THREE.Mesh(
        trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: -8.6, halfWidth: 0.08, topY: 0.06, bottomY: -0.06, chineY: 0 },
              { z: -4.4, halfWidth: 0.72, topY: 0.48, bottomY: -0.34, chineY: 0.04 },
              { z: 0.2, halfWidth: 1.25, topY: 0.72, bottomY: -0.48, chineY: 0.06 },
              { z: 4.5, halfWidth: 0.84, topY: 0.46, bottomY: -0.36, chineY: 0.03 },
            ],
            0.22,
          ),
        ),
        cloakHullMat,
      );
      g.add(pBody);

      for (const s of [-1, 1]) {
        const razorWing = new THREE.Mesh(
          trackGeo(
            createExtrudedHullPlate(
              [
                [0, -1.6],
                [5.9, -4.2],
                [4.6, 1.4],
                [0, 1.8],
              ],
              0.16,
              0.04,
              0.04,
              2.2,
              false,
            ),
          ),
          cloakWingMat,
        );
        razorWing.position.set(s * 0.9, 0.0, 0.1);
        if (s < 0) razorWing.scale.x = -1;
        g.add(razorWing);
      }
      addFighterThruster(0, 0, 4.65, 0.96);
    } else if (role === 'hunter_drone') {
      // Extinction Archetype 2: Compact tri-blade autonomous Swarm Hunter Drone
      const chassis = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(1.45, 0)),
        mats.alienObsidian,
      );
      chassis.scale.set(1.0, 0.72, 1.85);
      g.add(chassis);

      const eyeSensor = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.45, 10, 10)),
        subsystemAmberAccentMat,
      );
      eyeSensor.position.set(0, 0.12, -2.05);
      g.add(eyeSensor);

      const bladeGeo = trackGeo(
        createExtrudedHullPlate(
          [
            [0, -1.2],
            [3.2, 0.8],
            [2.4, 2.2],
            [0, 1.2],
          ],
          0.14,
          0.03,
          0.03,
          1.6,
          false,
        ),
      );
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(bladeGeo, mats.dreadnoughtCrimsonHull);
        const pivot = new THREE.Group();
        pivot.rotation.z = (b * Math.PI * 2) / 3;
        blade.position.set(0.65, 0, 0.25);
        pivot.add(blade);
        g.add(pivot);
      }
      addFighterThruster(0, 0, 2.5, 0.72);
    } else if (role === 'disruptor_ship') {
      // Extinction Archetype 3: Electronic Warfare Twin-Boom Disruptor Gunboat
      const hull = new THREE.Mesh(
        trackGeo(
          createEnemyLoftedFuselage(
            [
              { z: -9.5, halfWidth: 1.1, topY: 0.55, bottomY: -0.55, chineY: 0 },
              { z: -3.2, halfWidth: 3.6, topY: 1.65, bottomY: -1.45, chineY: 0.1 },
              { z: 4.4, halfWidth: 3.8, topY: 1.75, bottomY: -1.5, chineY: 0.1 },
              { z: 9.2, halfWidth: 2.2, topY: 1.05, bottomY: -0.95, chineY: 0.05 },
            ],
            0.16,
          ),
        ),
        mats.enemyWarshipArmor,
      );
      g.add(hull);
      addSculptedCanopy(-6.2, -3.5, -0.4, 1.25, 1.35, 2.15);

      const ewRing = new THREE.Group();
      ewRing.position.set(0, 0.2, 0.4);
      const outerTorus = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(5.6, 0.36, 10, 24)),
        subsystemCyanCoilMat,
      );
      const innerTorus = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(4.1, 0.24, 8, 20)),
        subsystemAmberAccentMat,
      );
      innerTorus.rotation.y = Math.PI / 2;
      ewRing.add(outerTorus, innerTorus);
      g.add(ewRing);
      g.userData.disruptorRingMesh = ewRing;

      for (const s of [-1, 1]) {
        const pylon = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(1.1, 0.9, 11.5)),
          mats.alienObsidian,
        );
        pylon.position.set(s * 4.4, 0, 0.2);
        g.add(pylon);
        addFighterThruster(s * 2.2, 0, 9.4, 1.35);
      }
      g.scale.setScalar(1.48);
      return g;
    } else {
      // elite_ace / Executioner Mini-Boss: Forward-swept Sovereign predator delta
      const bodyGeo = trackGeo(
        createEnemyLoftedFuselage(
          [
            { z: -7.8, halfWidth: 0.16, topY: 0.1, bottomY: -0.12, chineY: 0 },
            { z: -3.6, halfWidth: 1.26, topY: 0.76, bottomY: -0.58, chineY: 0.06 },
            { z: 0.8, halfWidth: 1.96, topY: 1.04, bottomY: -0.74, chineY: 0.08 },
            { z: 4.8, halfWidth: 1.24, topY: 0.66, bottomY: -0.54, chineY: 0.04 },
          ],
          0.2,
        ),
      );
      g.add(new THREE.Mesh(bodyGeo, mats.dreadnoughtCrimsonHull));
      addSculptedCanopy(-3.6, -1.7, 0.5, 0.78, 0.72, 1.42);

      for (const s of [-1, 1]) {
        const fwdBlade = new THREE.Mesh(
          trackGeo(
            createExtrudedHullPlate(
              [
                [0, 2.2],
                [6.4, -3.5],
                [5.5, -4.9],
                [0, -0.7],
              ],
              0.26,
              0.06,
              0.05,
              2.2,
              false,
            ),
          ),
          mats.alienObsidian,
        );
        fwdBlade.position.set(s * 1.42, 0.0, 0.1);
        if (s < 0) fwdBlade.scale.x = -1;
        g.add(fwdBlade);

        const fin = new THREE.Mesh(sweptFinGeo, mats.dreadnoughtCrimsonHull);
        fin.scale.setScalar(1.22);
        fin.rotation.z = Math.PI / 2 + s * -0.4;
        fin.position.set(s * 1.82, 1.25, 3.15);
        g.add(fin);

        const gun = new THREE.Mesh(gunBarrelGeo, mats.weaponGunmetal);
        gun.position.set(s * 1.45, -0.24, -4.2);
        g.add(gun);

        addFighterThruster(s * 0.92, 0.04, 4.9, 1.08);
      }

      // Bespoke Legendary Ace / Executioner Mini-Boss sculpted crown-blades & heraldic accent trim
      if (legendaryDef || isExec) {
        const legendTrimMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: legendaryDef ? legendaryDef.accentHex : 0xf43f5e,
            emissive: legendaryDef ? legendaryDef.trimHex : 0xfbbf24,
            emissiveIntensity: 0.48,
            metalness: 0.82,
            roughness: 0.24,
          }),
        );
        const dorsalCrest = new THREE.Mesh(
          trackGeo(
            createExtrudedHullPlate(
              [
                [0, -4.4],
                [0.45, -1.0],
                [0.55, 3.8],
                [0, 4.6],
                [-0.55, 3.8],
                [-0.45, -1.0],
              ],
              0.42,
              0.08,
              0.06,
              1.6,
              false,
            ),
          ),
          legendTrimMat,
        );
        dorsalCrest.position.set(0, 1.38, 0.2);
        g.add(dorsalCrest);

        for (const s of [-1, 1]) {
          const wingTipBlade = new THREE.Mesh(
            trackGeo(
              createExtrudedHullPlate(
                [
                  [0, -2.6],
                  [2.2, -5.8],
                  [1.4, -1.2],
                  [0, 1.2],
                ],
                0.22,
                0.04,
                0.04,
                1.4,
                false,
              ),
            ),
            legendTrimMat,
          );
          wingTipBlade.position.set(s * 6.8, 0.14, -2.1);
          if (s < 0) wingTipBlade.scale.x = -1;
          g.add(wingTipBlade);
        }
      }
    }

    // Scale enemy silhouettes cleanly so fighters, drones & aces are unmistakably readable during combat
    const visualScale = isExec
      ? 2.16
      : legendaryDef
        ? 1.88
        : role === 'elite_ace'
          ? 1.82
          : role === 'hunter_drone'
            ? 1.24
            : role === 'phantom_interceptor'
              ? 1.68
              : 1.65;
    g.scale.setScalar(visualScale);
    return g;
    } finally {
      trackingSectorGeos = prevTrack;
    }
  };

  // Up to 8 Sculpted Allied Wingmen orbiting near the player & CSV Aegis
  const wingmen: AlliedWingman[] = [];
  const allyHullGeo = trackGeo(
    createExtrudedHullPlate(
      [
        [0, -5.2],
        [0.85, -1.6],
        [1.15, 2.6],
        [0.65, 3.4],
        [-0.65, 3.4],
        [-1.15, 2.6],
        [-0.85, -1.6],
      ],
      0.56,
      0.08,
      0.06,
    ),
  );
  const allyWingGeo = trackGeo(
    createExtrudedHullPlate(
      [
        [0, -1.4],
        [3.8, 1.5],
        [3.4, 2.2],
        [0, 1.2],
      ],
      0.16,
      0.04,
      0.03,
    ),
  );
  const allyPlumeGeo = trackGeo(new THREE.ConeGeometry(0.32, 2.2, 8, 1, true));
  allyPlumeGeo.rotateX(Math.PI / 2);
  const allyPlumeMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x52c7ff,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  for (let i = 0; i < 8; i++) {
    const wg = new THREE.Group();
    const fuselage = new THREE.Mesh(allyHullGeo, mats.playerHullPrimary);
    wg.add(fuselage);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(allyWingGeo, mats.playerHullPrimary);
      w.position.set(s * 2.4, 0, 0.6);
      if (s < 0) w.scale.x = -1;
      wg.add(w);
      const p = new THREE.Mesh(allyPlumeGeo, allyPlumeMat);
      p.position.set(s * 0.52, 0, 4.4);
      wg.add(p);
    }
    wg.scale.setScalar(1.38);
    wg.visible = i < 3;
    root.add(wg);

    const rosterEntry = VANGUARD_WINGMEN_ROSTER[i];
    wingmen.push({
      id: rosterEntry?.id ?? `wg_escort_${i + 1}`,
      callsign: rosterEntry?.callsign ?? `VANGUARD-${i + 2}`,
      pilotName: rosterEntry?.pilotName ?? `Escort Pilot ${i + 1}`,
      formationOffset: rosterEntry?.formationOffset ?? [
        (i % 2 === 0 ? -1 : 1) * (58 + i * 12),
        16 + (i % 3) * 14,
        44 + i * 10,
      ],
      root: wg,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      hull: 110,
      maxHull: 110,
      shield: 85,
      maxShield: 85,
      kills: 0,
      status: 'active',
      orbitAngle: i * 0.92,
      orbitRadius: 260 + (i % 4) * 58,
      orbitHeight: -35 + (i % 3) * 36,
      fireCooldown: 0.9 + i * 0.3,
      active: i < 3,
    });
  }

  // Projectiles for all 5 Space Weapons (including Precision Rail Cannon slug!)
  const playerLaserGeo = trackGeo(new THREE.CylinderGeometry(0.15, 0.15, 16, 6));
  playerLaserGeo.rotateX(Math.PI / 2);
  const playerLaserMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x76eeff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const plasmaOrbGeo = trackGeo(new THREE.SphereGeometry(0.9, 10, 8));
  const plasmaOrbMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffb138,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const empRingGeo = trackGeo(new THREE.TorusGeometry(1.25, 0.24, 8, 16));
  const empRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x9b7bff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const railBeamGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 52, 8));
  railBeamGeo.rotateX(Math.PI / 2);
  const railBeamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xe0f7ff,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const enemyLaserMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff4622,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const missileGeo = trackGeo(new THREE.ConeGeometry(0.45, 3.4, 6));
  missileGeo.rotateX(-Math.PI / 2);
  const missileMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffb84a,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const flareOrbGeo = trackGeo(new THREE.OctahedronGeometry(0.68, 1));
  const flareOrbMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfff0b8,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const projectileGroup = new THREE.Group();
  projectileGroup.name = 'ProjectilePoolGroup';
  root.add(projectileGroup);

  const projectiles: SpaceProjectile[] = [];
  const projectilePool: SpaceProjectile[] = [];
  const MAX_PROJECTILE_POOL = 180;

  for (let i = 0; i < 140; i++) {
    const m = new THREE.Mesh(playerLaserGeo, playerLaserMat);
    m.visible = false;
    projectileGroup.add(m);
    projectilePool.push({
      mesh: m,
      pos: new THREE.Vector3(),
      prevPos: new THREE.Vector3(),
      originPos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      fromPlayer: false,
      fromAlly: false,
      weaponKind: 'pulse',
      isMissile: false,
      damage: 0,
      life: 0,
      traveledMeters: 0,
      maxRangeMeters: 1000,
    });
  }

  const acquirePooledProjectile = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: THREE.Vector3,
    lookTarget: THREE.Vector3,
    vel: THREE.Vector3,
    fromPlayer: boolean,
    weaponKind: SpaceWeaponId,
    isMissile: boolean,
    damage: number,
    life: number,
    maxRangeMeters: number,
    extra?: {
      fromAlly?: boolean;
      shooterWingmanId?: string;
      targetEnemy?: EnemyStarfighter;
      targetSubsystem?: CapitalSubsystemKey;
      targetHarvesterCoreId?: HarvesterEnergyCoreState['id'];
      guidanceRemainingSec?: number;
    },
  ): SpaceProjectile => {
    let p = projectilePool.pop();
    if (!p) {
      const m = new THREE.Mesh(geo, mat);
      projectileGroup.add(m);
      p = {
        mesh: m,
        pos: new THREE.Vector3(),
        prevPos: new THREE.Vector3(),
        originPos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        fromPlayer,
        fromAlly: extra?.fromAlly,
        shooterWingmanId: extra?.shooterWingmanId,
        weaponKind,
        isMissile,
        targetEnemy: extra?.targetEnemy,
        targetSubsystem: extra?.targetSubsystem,
        targetHarvesterCoreId: extra?.targetHarvesterCoreId,
        damage,
        life,
        traveledMeters: 0,
        maxRangeMeters,
        guidanceRemainingSec: extra?.guidanceRemainingSec,
      };
    } else {
      p.mesh.geometry = geo;
      p.mesh.material = mat;
      p.fromPlayer = fromPlayer;
      p.fromAlly = extra?.fromAlly;
      p.shooterWingmanId = extra?.shooterWingmanId;
      p.weaponKind = weaponKind;
      p.isMissile = isMissile;
      p.targetEnemy = extra?.targetEnemy;
      p.targetSubsystem = extra?.targetSubsystem;
      p.targetHarvesterCoreId = extra?.targetHarvesterCoreId;
      p.damage = damage;
      p.life = life;
      p.traveledMeters = 0;
      p.maxRangeMeters = maxRangeMeters;
      p.guidanceRemainingSec = extra?.guidanceRemainingSec;
      p.nearMissAwarded = false;
    }

    p.pos.copy(pos);
    p.prevPos.copy(pos);
    p.originPos.copy(pos);
    p.vel.copy(vel);

    p.mesh.position.copy(pos);
    p.mesh.lookAt(lookTarget);
    p.mesh.visible = true;

    projectiles.push(p);
    return p;
  };

  const releasePooledProjectile = (index: number) => {
    const p = projectiles[index];
    if (!p) return;
    p.mesh.visible = false;
    p.targetEnemy = undefined;
    p.targetSubsystem = undefined;
    p.targetHarvesterCoreId = undefined;
    if (projectilePool.length < MAX_PROJECTILE_POOL) {
      projectilePool.push(p);
    } else {
      projectileGroup.remove(p.mesh);
    }
    projectiles.splice(index, 1);
  };
  const decoyFlares: DecoyFlareEntity[] = [];

  // =========================================================================
  // 6. LOADOUT, WEAPONS, SUPERCRUISE, AUTOPILOT, VITALS & TARGETING STATE
  // =========================================================================
  let activeWeapon: SpaceWeaponId = 'pulse';
  let spaceLoadout: SpaceLoadout = {
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
  };
  let decisionEffects: CampaignDecisionEffects = {
    extraAlliedFighters: 0,
    enemyReinforcementReduction: 0,
    capitalShipShieldReduction: 0,
    sovereignFlagshipWeakenedPct: 0,
    extraRepairKits: 0,
    revealedIntelBonus: false,
  };

  let activeCampaignMissionId = 'm1_fall_of_aether_prime_orbit';
  let activeMissionCode = 'OP 01';
  let activeMissionTitle = 'The Fall of Aether Prime Orbit';
  let activeMissionOverride: CampaignMissionDef | null = null;
  let activeLevelOverride: CampaignLevelDef | null = null;
  let activeExtLevel: ExtinctionLevelDef | null = null;
  let battleDirector: BattleDirectorState | null = null;
  let activeBossSm: BossStateMachine | null = null;
  let selectedHarvesterCoreId: HarvesterEnergyCoreState['id'] | null = null;
  let bossSpawnAttemptCount = 0;
  let bossEntityCreated = false;
  let bossEntityId: string | null = null;
  let bossSceneRegistered = false;
  let bossLastInCameraView = false;
  let bossAiStateLabel = 'inactive';
  let bossTargetAssigned = false;
  const encounterTransitionLog: EncounterTransitionEntry[] = [];
  let ewInterferenceState: AggregateEwEffect = evaluateAggregateDisruptorEw([]);
  let orbitalPylons: OrbitalKillZonePylon[] = [];
  const pylonEntities: Array<{
    id: string;
    group: THREE.Group;
    pos: THREE.Vector3;
    telegraphBeam: THREE.Mesh;
  }> = [];
  let extractionActive = false;
  let extractionReached = false;
  const extractionPos = new THREE.Vector3();
  let extractionBeaconMesh: THREE.Group | null = null;
  let activeDifficulty: DifficultyId = 'normal';
  let missionCompleted = false;
  let missionFailedReported = false;
  let missionKills = 0;
  let subsystemsDestroyedCount = 0;
  let capitalShipsDestroyedCount = 0;
  let distanceTraveledMeters = 0;
  let shotsFired = 0;
  let shotsHit = 0;
  let sortieElapsedSec = 0;
  let repairKitsUsedInLevel = 0;
  let levelTimeLimitSec: number | null = null;
  let levelSurvivalTargetSec: number | null = null;
  let levelEscapeTimerSec: number | null = null;
  let protectedEntityName: string | null = null;
  let protectedEntityHp = 0;
  let protectedEntityMaxHp = 0;
  let escortWarnedHalf = false;
  let combatScoreState: CombatScoreState = createCombatScoreState();
  let dialogueDirector = createSquadronDialogueDirector();
  let nearMissCooldownSec = 0;
  let scoutEscapeWarning: string | null = null;
  let autopilotActive = false;
  let aiUpdateIntervalMultiplier = 1.0;

  let flightSettings: FlightControlSettings = { ...DEFAULT_FLIGHT_SETTINGS };
  const input: FlightInputState = {
    throttleForward: false,
    throttleReverse: false,
    strafeLeft: false,
    strafeRight: false,
    rollLeft: false,
    rollRight: false,
    boost: false,
    brake: false,
    supercruise: false,
    pitchDelta: 0,
    yawDelta: 0,
    joyPitch: 0,
    joyYaw: 0,
  };

  let vitals: ShipVitalsState = {
    shield: 100,
    maxShield: 100,
    hull: 95,
    maxHull: 95,
    engineIntegrity: 100,
    controlIntegrity: 100,
    weaponIntegrity: 100,
    boostEnergy: 100,
    weaponHeat: 0,
    missiles: 14,
    maxMissiles: 14,
    countermeasures: 4,
    maxCountermeasures: 4,
    repairKits: 2,
    speed: 145,
    altitudeKm: 36,
  };

  let instability: FlightInstabilityState = {
    pitchShock: 0,
    yawShock: 0,
    rollShock: 0,
    knockbackSpeed: 0,
    alarmTimer: 0,
  };
  const knockbackDir = new THREE.Vector3();

  let asteroidAlert: AsteroidProximityAlert = {
    risk: 'none',
    nearestDistance: 999,
    timeToImpactSec: null,
    bearingRad: 0,
  };
  let collisionSeverityFlash: AsteroidSeverity | null = null;
  let collisionBannerTimer = 0;
  let collisionWarningBanner: string | null = null;
  let nearRepairBeacon = false;
  let repairBeaconCooldown = 0;

  let weaponOverheated = false;
  let primaryFiring = false;
  let primaryCooldown = 0;
  let missileCooldown = 0;
  let flareCooldown = 0;
  let flareDecoyTimer = 0;
  let railChargeSec = 0;
  let railChargeAudioTick = 0;
  let hitMarkerTimer = 0;
  let hitMarkerKill = false;
  let isBoostingNow = false;
  let latestBoostState: 'ready' | 'boosting' | 'recharging' | 'low' = 'ready';
  let isSupercruiseNow = false;
  let kills = 0;
  let timeSinceDamaged = 10;
  let lockedTarget: EnemyStarfighter | null = null;
  let lockProgress = 0;
  let lockGraceSec = 0;
  let wasLocked = false;
  let targetScreenX = 0.5;
  let targetScreenY = 0.5;
  let targetInView = false;
  let latestPredictiveLeadReticle: { x: number; y: number; visible: boolean } | null = null;
  let incomingMissile = false;
  let statusToast: string | null = null;
  let toastTimer = 0;
  let currentCameraMode: SpaceCameraMode = 'chase';
  let latestRadarBlips: SpaceRadarBlip[] = [];
  let latestWaypoints: WaypointHudInfo[] = [];
  let latestEnemyHealthMarkers: EnemyHealthBarMarker[] = [];
  let latestTargetMarkers: ResolvedTargetMarker[] = [];
  let latestOffscreenTargets: OffscreenTargetIndicator[] = [];
  let targetHudSmoothState: TargetHudSmoothingState = {};
  let latestCapitalDistanceMeters: number | null = null;
  const dyingCapitalHulls: Array<{
    root: THREE.Group;
    age: number;
    removeAt: number;
    rollSpeed: number;
    pitchSpeed: number;
  }> = [];
  // Space Combat Expansion Runtime State
  const spatialAsteroidGrid = new SpatialAsteroidGrid<SpatialObstacleRef>(380);
  const spatialQueryBuf: SpatialObstacleRef[] = [];
  const solidColliderBuf: SolidSphereCollider[] = [];
  let solidCollisionCooldown = 0;
  let solidProximityWarningState: ProximityWarningResult | null = null;
  let activeWingmanCommand: WingmanCommandId = 'cover';
  let reinforcementDirector: ReinforcementDirectorState = createReinforcementDirector(1, 0);
  let initialRegionHostiles = 6;
  let legendaryDefeatedInMission = false;
  let legendaryBonusSalvageEarned = 0;
  const triggeredMissionEventIds = new Set<string>();
  let activeMissionEventBanner: string | null = null;
  let activeMissionEventTimer = 0;
  let incomingDamageAngleDeg: number | null = null;
  let incomingDamageIndicatorTimer = 0;
  let criticalAlertCooldown = 0;
  const hudViewportCtx: TargetHudViewportContext = {
    viewportWidth: 1440,
    viewportHeight: 900,
    fovDeg: 62,
    isTouchMode: false,
    isCompactPhone: false,
    orientation: 'landscape',
    cameraMode: 'chase',
    hasCapitalPanel: false,
    enemyInfoMode: 'full',
  };
  const occluderSpheres: OccluderSphere[] = [];

  const triggerClassDestruction = (
    pos: THREE.Vector3,
    shipClass: EnemyShipClass,
    role?: ExtinctionEnemyRole,
    isLegendary = false,
    shipVelocity?: THREE.Vector3,
    scale = 1.0,
  ) => {
    const destructionClass = classifyDestructionClass(shipClass, role, isLegendary);
    explosions.spawnShipDestruction(pos.clone(), destructionClass, {
      scale,
      shipVelocity,
      onStageDetonation: (evt) => {
        const refPos = lastShipRef?.root.position ?? pos;
        callbacks.onShipDestructionStage?.({
          ...evt,
          distanceMeters: evt.pos.distanceTo(refPos),
        });
      },
    });
  };

  const shipForward = new THREE.Vector3(0, 0, -1);
  const shipRight = new THREE.Vector3(1, 0, 0);
  const shipUp = new THREE.Vector3(0, 1, 0);
  const qPitch = new THREE.Quaternion();
  const qYaw = new THREE.Quaternion();
  const qRoll = new THREE.Quaternion();
  const tmpLeftMuzzle = new THREE.Vector3();
  const tmpRightMuzzle = new THREE.Vector3();
  const tmpVec = new THREE.Vector3();
  const tmpVec2 = new THREE.Vector3();
  const tmpSubPos = new THREE.Vector3();
  const tmpProj = new THREE.Vector3();
  const prevShipPos = new THREE.Vector3();

  const showToast = (msg: string, duration = 2.4) => {
    statusToast = msg;
    toastTimer = duration;
  };

  const getShipSpec = () => PLAYABLE_SHIPS[spaceLoadout.selectedShipId] ?? PLAYABLE_SHIPS.light_interceptor;

  const getWeaponUpgradeLevel = (w: SpaceWeaponId): number => {
    if (w === 'pulse') return spaceLoadout.pulseLevel;
    if (w === 'heavy_plasma') return spaceLoadout.plasmaLevel;
    if (w === 'emp') return spaceLoadout.empLevel;
    if (w === 'rail_cannon') return spaceLoadout.railLevel;
    return Math.max(spaceLoadout.pulseLevel, spaceLoadout.plasmaLevel);
  };

  const persistCurrentRegionProgress = () => {
    const deadSet = new Set<string>();
    const existing = savedRegionProgress.get(currentRegionId);
    if (existing) {
      for (const id of existing.deadEnemyIds) deadSet.add(id);
    }
    for (const e of enemies) {
      if (!e.alive) deadSet.add(e.id);
    }
    savedRegionProgress.set(currentRegionId, {
      deadEnemyIds: deadSet,
      capitalShipStatus: activeCapitalShip ? { ...activeCapitalShip.status } : null,
    });
  };

  let lastShipRef: ValkyrieSpacecraft | null = null;
  let wingmanEffectivenessMult = 1.0;

  const applySpaceLoadout = (
    loadout: SpaceLoadout,
    effects?: CampaignDecisionEffects,
    ship?: ValkyrieSpacecraft,
    wingmanEffectivenessBonusPct = 0,
  ) => {
    wingmanEffectivenessMult = 1 + Math.max(0, wingmanEffectivenessBonusPct) / 100;
    spaceLoadout = {
      ...loadout,
      ownedModules: loadout.ownedModules ?? [],
      equippedModules: loadout.equippedModules ?? [],
    };
    if (effects) decisionEffects = { ...effects };

    const spec = getShipSpec();
    const mods = computeEquippedUpgradeModifiers(spaceLoadout.equippedModules);
    vitals.maxHull = Math.round(spec.maxHull * mods.hullMult);
    vitals.maxShield = Math.round((spec.maxShield + (loadout.shieldLevel - 1) * 28) * mods.shieldMult);
    vitals.hull = Math.round(vitals.maxHull * (Math.max(40, loadout.shipHullCondition) / 100));
    vitals.shield = vitals.maxShield;
    vitals.maxMissiles = Math.min(36, Math.max(6, loadout.missileCapacity + spec.missileCapacityBonus + mods.extraMissiles));
    vitals.missiles = vitals.maxMissiles;
    vitals.maxCountermeasures = 3 + loadout.countermeasureLevel;
    vitals.countermeasures = vitals.maxCountermeasures;
    vitals.repairKits = 2 + decisionEffects.extraRepairKits;

    const targetShip = ship ?? lastShipRef;
    targetShip?.setShipClass(loadout.selectedShipId);

    // Activate Named Tactical Wingmen (3 core Vanguard wingmen + Strategic Decision escorts)
    const totalWingmen = Math.min(wingmen.length, 3 + decisionEffects.extraAlliedFighters);
    for (let i = 0; i < wingmen.length; i++) {
      wingmen[i].active = i < totalWingmen;
      wingmen[i].root.visible = wingmen[i].active && wingmen[i].status !== 'disabled';
    }
  };

  const emitDialogueLine = (
    trigger: Parameters<typeof requestSquadronDialogue>[1],
    override?: { speaker?: string; callsign?: string; text?: string },
  ) => {
    const line = requestSquadronDialogue(dialogueDirector, trigger, sortieElapsedSec, override);
    if (!line) return;
    const formatted = `${line.callsign} (${line.speaker}): "${line.text}"`;
    callbacks.onWingmanComms?.(formatted, activeWingmanCommand);
  };

  const spawnExtinctionWaveMap = (
    wave: Partial<Record<ExtinctionEnemyRole, number>>,
    anchorPos: THREE.Vector3,
    idPrefix: string,
    region: (typeof SPACE_REGIONS)[SpaceRegionId],
    isWarpDrop = false,
  ) => {
    const diffEnemyHpMult = Math.max(
      0.75,
      Math.min(1.32, DIFFICULTY_PROFILES[activeDifficulty].enemyHealth),
    );
    const initialManeuvers: DogfightManeuverState[] = [
      'straight_approach',
      'lateral_strafe',
      'vertical_climb_dive',
      'high_speed_flyby',
      'tail_pursuit',
    ];
    let cursor = 0;
    const activeDronesNow = enemies.filter((e) => e.alive && e.role === 'hunter_drone').length;
    let dronesAdded = 0;

    for (const [rawRole, rawCount] of Object.entries(wave)) {
      if (!rawCount || rawCount <= 0) continue;
      const role = rawRole as ExtinctionEnemyRole;
      const cfg = getAnyEnemyRoleConfig(role);
      const count =
        role === 'hunter_drone'
          ? Math.max(0, Math.min(rawCount, MAX_ACTIVE_HUNTER_DRONES - activeDronesNow - dronesAdded))
          : Math.max(1, rawCount);

      for (let k = 0; k < count; k++) {
        if (role === 'hunter_drone') dronesAdded += 1;
        const zone = region.encounterZones[cursor % region.encounterZones.length];
        const eid = `${idPrefix}_${role}_${k}_${Date.now()}`;
        const mesh = buildAlienStarfighterMesh(role);
        const band = Math.floor(cursor / 3);
        const lateral = ((cursor % 3) - 1) * 230 + (k % 2 === 0 ? -55 : 55);
        const forwardDist = (isWarpDrop ? 680 : 540) + band * 280 + (cursor % 2) * 95;
        const height = (cursor % 2 === 0 ? 1 : -1) * (42 + (cursor % 3) * 48);
        const pos = new THREE.Vector3(
          anchorPos.x + lateral,
          anchorPos.y + height,
          anchorPos.z - forwardDist,
        );
        mesh.position.copy(pos);
        sectorDynamicGroup.add(mesh);
        if (isWarpDrop) {
          explosions.spawnShieldRipple(pos.clone(), 22, 0x76d8ff);
        }

        const scaledHp = Math.round(cfg.baseHp * diffEnemyHpMult);
        const scaledShield = Math.round(cfg.baseShield * (0.85 + 0.15 * diffEnemyHpMult));
        enemies.push({
          id: eid,
          zoneId: zone.id,
          zoneCenter: pos.clone(),
          name: `${cfg.displayName} #${k + 1}`,
          role,
          shipClass: cfg.shipClass,
          isCorvette: role === 'medium_warship' || role === 'disruptor_ship',
          isLegendary: false,
          root: mesh,
          pos,
          vel: new THREE.Vector3(),
          health: scaledHp,
          maxHealth: scaledHp,
          shield: scaledShield,
          maxShield: scaledShield,
          empStunTimer: 0,
          lastHitAge: 99,
          destroyedFlashTimer: 0,
          alive: true,
          orbitAngle: cursor * 0.9,
          orbitRadius: role === 'medium_warship' || role === 'disruptor_ship' ? 240 : 280,
          orbitHeight: height,
          orbitSpeed: (role === 'disruptor_ship' ? 0.18 : role === 'bomber' ? 0.2 : 0.44) * (cursor % 2 === 0 ? 1 : -1),
          flankPhase: cursor * 1.25,
          squadSlot: cursor,
          evasionTimer: 0,
          aceFlareCooldown: role === 'elite_ace' || role === 'phantom_interceptor' ? 4.5 : 999,
          fireCooldown: 1.4 + (cursor % 5) * 0.28,
          missileCooldown: 8.5 + (cursor % 4) * 2.0,
          escapeTimer: role === 'scout' ? 45 : 999,
          aiAccumDt: 0,
          maneuverState:
            role === 'medium_warship' || role === 'disruptor_ship'
              ? 'straight_approach'
              : initialManeuvers[cursor % initialManeuvers.length],
          stateTimer: 2.2 + (cursor % 4) * 0.75,
          strafeSign: cursor % 2 === 0 ? 1 : -1,
          verticalSign: cursor % 3 === 0 ? 1 : -1,
          currentBankRad: 0,
          phantomCloak: role === 'phantom_interceptor' ? createPhantomCloakState(true) : undefined,
          cloakMaterials: Array.isArray(mesh.userData.cloakMaterials)
            ? (mesh.userData.cloakMaterials as THREE.MeshStandardMaterial[])
            : undefined,
          disruptorField: role === 'disruptor_ship' ? createDisruptorFieldState() : undefined,
          disruptorRingMesh: (mesh.userData.disruptorRingMesh as THREE.Object3D | undefined) ?? undefined,
        });
        cursor++;
      }
    }
  };

  const triggerExtinctionEvent = (evt: ExtinctionEventKind, shipPos: THREE.Vector3) => {
    if (evt === 'asteroid_storm') {
      activeMissionEventBanner = 'WARNING: ASTEROID STORM ENTERING COMBAT LANE';
      activeMissionEventTimer = 4.8;
      showToast('ASTEROID STORM INBOUND — EVADE MOVING BOULDERS!', 3.6);
      callbacks.onStageOrBossBanner?.(activeMissionEventBanner, 'warning');
      // Spawn up to 10 moving storm rocks sweeping across combat corridor cleanly
      const stormCount = 10;
      for (let i = 0; i < stormCount; i++) {
        const tmpl = asteroidSmallTemplates[i % asteroidSmallTemplates.length];
        const m = new THREE.Mesh(tmpl, mats.asteroidBasalt);
        const radius = 14 + (i % 4) * 6;
        const pos = new THREE.Vector3(
          shipPos.x + (i % 2 === 0 ? -980 : 980) + (i - 5) * 85,
          shipPos.y + ((i % 3) - 1) * 145,
          shipPos.z - 520 - i * 110,
        );
        m.position.copy(pos);
        m.scale.setScalar(radius * 0.92);
        asteroidGroup.add(m);
        asteroids.push({
          id: `ext_storm_${Date.now()}_${i}`,
          tier: 'medium',
          mesh: m,
          pos,
          vel: new THREE.Vector3((i % 2 === 0 ? 1 : -1) * 44, ((i % 3) - 1) * 8, 18),
          rotVel: new THREE.Vector3(0.45, -0.35, 0.3),
          radius,
          mass: 2.2,
          hp: 9999,
          cooldown: 0,
        });
      }
    } else if (evt === 'orbital_kill_zone' && pylonEntities.length === 0) {
      activeMissionEventBanner = 'ORBITAL KILL ZONE ACTIVE — DESTROY DEFENSE PYLONS TO CLEAR';
      activeMissionEventTimer = 5.0;
      showToast('ORBITAL DEFENSE PYLONS ONLINE — EVADE TARGETING BEAMS!', 3.5);
      callbacks.onStageOrBossBanner?.(activeMissionEventBanner, 'warning');
      orbitalPylons = createOrbitalKillZonePylons(3, 190);
      const prevTrack = trackingSectorGeos;
      trackingSectorGeos = true;
      try {
        for (let i = 0; i < orbitalPylons.length; i++) {
          const pylon = orbitalPylons[i];
          const ang = (i * Math.PI * 2) / 3 + 0.4;
          const pPos = new THREE.Vector3(
            shipPos.x + Math.cos(ang) * 780,
            shipPos.y + (i - 1) * 140,
            shipPos.z - 760 + Math.sin(ang) * 420,
          );
          const pg = new THREE.Group();
          const tower = new THREE.Mesh(
            trackGeo(new THREE.CylinderGeometry(8, 14, 68, 8)),
            mats.alienObsidian,
          );
          const emitter = new THREE.Mesh(
            trackGeo(new THREE.OctahedronGeometry(14, 0)),
            subsystemAmberAccentMat,
          );
          emitter.position.y = 38;
          const beamMat = trackMat(
            new THREE.MeshBasicMaterial({
              color: 0xff3b1f,
              transparent: true,
              opacity: 0.6,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          );
          const beamGeo = trackGeo(new THREE.CylinderGeometry(2.2, 6.5, 1600, 8, 1, true));
          beamGeo.rotateX(Math.PI / 2);
          beamGeo.translate(0, 0, 800);
          const beamMesh = new THREE.Mesh(beamGeo, beamMat);
          beamMesh.position.y = 38;
          beamMesh.visible = false;
          pg.add(tower, emitter, beamMesh);
          pg.position.copy(pPos);
          sectorDynamicGroup.add(pg);
          pylonEntities.push({ id: pylon.id, group: pg, pos: pPos, telegraphBeam: beamMesh });
        }
      } finally {
        trackingSectorGeos = prevTrack;
      }
    } else if (evt === 'emergency_extraction') {
      extractionActive = true;
      extractionReached = false;
      const dist = activeExtLevel?.extractionDistanceMeters ?? 1550;
      extractionPos.set(shipPos.x + 280, shipPos.y + 85, shipPos.z - dist);
      if (extractionBeaconMesh) {
        extractionBeaconMesh.position.copy(extractionPos);
        extractionBeaconMesh.visible = true;
      }
      activeMissionEventBanner = 'EMERGENCY EXTRACTION BEACON ACTIVE — REACH JUMP RING';
      activeMissionEventTimer = 6.0;
      showToast('EMERGENCY EXTRACTION OPEN — FLY THROUGH GREEN JUMP RING!', 4.0);
      callbacks.onExtinctionAudioCue?.('extraction_beacon');
      callbacks.onStageOrBossBanner?.(activeMissionEventBanner, 'critical');
    } else if (evt === 'hyperspace_ambush') {
      activeMissionEventBanner = 'HYPERSPACE AMBUSH — HOSTILE SQUADRON DROPPING IN';
      activeMissionEventTimer = 4.2;
      showToast('HYPERSPACE RUPTURE DETECTED — AMBUSH INBOUND!', 3.2);
      callbacks.onStageOrBossBanner?.(activeMissionEventBanner, 'warning');
    } else if (evt === 'fleet_collapse') {
      activeMissionEventBanner = 'FLEET COLLAPSE ALERT — PROTECT ALLIED FRIGATE AEGIS';
      activeMissionEventTimer = 4.6;
      showToast('ALLIED FLEET UNDER HEAVY ASSAULT — DEFEND FRIGATE AEGIS!', 3.4);
      callbacks.onStageOrBossBanner?.(activeMissionEventBanner, 'critical');
    }
  };

  const recordEncounterTransition = (
    encounterStage: string,
    bossId: string | null,
    spawnCondition: string,
    reason: string,
  ) => {
    const entry: EncounterTransitionEntry = {
      atSec: Number(sortieElapsedSec.toFixed(2)),
      ENCOUNTER_STAGE: encounterStage,
      BOSS_ID: bossId,
      SPAWN_CONDITION: spawnCondition,
      ENTITY_CREATED: bossEntityCreated,
      SCENE_REGISTERED: bossSceneRegistered,
      AI_ACTIVE: bossAiStateLabel !== 'inactive' && bossAiStateLabel !== 'defeated',
      TARGET_ASSIGNED: bossTargetAssigned,
      reason,
    };
    encounterTransitionLog.push(entry);
    if (encounterTransitionLog.length > 24) encounterTransitionLog.shift();
  };

  const clearAsteroidsForBossSpawn = (center: THREE.Vector3, clearanceRadius: number) => {
    const pushVec = new THREE.Vector3();
    let movedAny = false;
    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i];
      const minDist = clearanceRadius + a.radius;
      const dist = a.pos.distanceTo(center);
      if (dist < minDist) {
        if (dist > 0.1) pushVec.subVectors(a.pos, center).normalize();
        else pushVec.set(1, 0.25, 0).normalize();
        a.pos.copy(center).addScaledVector(pushVec, minDist + 45);
        a.mesh.position.copy(a.pos);
        movedAny = true;
      }
    }
    if (movedAny) {
      spatialAsteroidGrid.rebuild(
        asteroids.map((a) => ({ id: a.id, x: a.pos.x, y: a.pos.y, z: a.pos.z, radius: a.radius })),
      );
    }
  };

  const spawnExtinctionBossEncounter = (
    playerPos: THREE.Vector3,
    forwardDir: THREE.Vector3,
    upDir: THREE.Vector3,
    rightDir: THREE.Vector3,
    triggerReason: string,
  ): boolean => {
    if (!activeExtLevel?.bossId) return false;
    bossSpawnAttemptCount += 1;
    if (bossEntityCreated || activeBossSm !== null) {
      recordEncounterTransition(
        'BOSS_DUPLICATE_BLOCKED',
        activeExtLevel.bossId,
        'ALREADY_ACTIVE',
        `Duplicate boss spawn suppressed (${triggerReason})`,
      );
      return false;
    }

    const region = SPACE_REGIONS[currentRegionId];
    const diffEnemyHpMult = Math.max(
      0.72,
      Math.min(1.28, DIFFICULTY_PROFILES[activeDifficulty].enemyHealth),
    );
    const bossId = activeExtLevel.bossId;
    const sm = createBossStateMachine(bossId, diffEnemyHpMult);
    const isExec = bossId === 'executioner';
    const fwdDist = isExec
      ? 500
      : bossId === 'carrier_warden' || bossId === 'siege_breaker'
        ? 920
        : bossId === 'sovereign_extinction'
          ? 1160
          : 1060;
    const spawnPos = playerPos
      .clone()
      .addScaledVector(forwardDir, fwdDist)
      .addScaledVector(rightDir, isExec ? 85 : 135)
      .addScaledVector(upDir, isExec ? 42 : 70);

    if (isExec) {
      const execMesh = buildAlienStarfighterMesh('elite_ace', undefined, {
        isExecutionerBoss: true,
      });
      execMesh.position.copy(spawnPos);
      execMesh.lookAt(playerPos);
      sectorDynamicGroup.add(execMesh);

      const execEnemy: EnemyStarfighter = {
        id: 'boss_executioner',
        zoneId: region.encounterZones[0].id,
        zoneCenter: playerPos.clone(),
        name: 'The Executioner · Vaelen Korr',
        role: 'elite_ace',
        shipClass: 'fighter',
        isCorvette: false,
        isLegendary: true,
        isExecutionerBoss: true,
        root: execMesh,
        pos: spawnPos.clone(),
        vel: forwardDir.clone().multiplyScalar(-95),
        health: sm.maxHp,
        maxHealth: sm.maxHp,
        shield: sm.maxShield,
        maxShield: sm.maxShield,
        empStunTimer: 0,
        lastHitAge: 99,
        destroyedFlashTimer: 0,
        alive: true,
        orbitAngle: 0,
        orbitRadius: 290,
        orbitHeight: 65,
        orbitSpeed: 0.62,
        flankPhase: 0.4,
        squadSlot: 0,
        evasionTimer: 0,
        aceFlareCooldown: 4.5,
        fireCooldown: 0.7,
        missileCooldown: 3.4,
        escapeTimer: 999,
        aiAccumDt: 0,
        maneuverState: 'straight_approach',
        stateTimer: 3.2,
        strafeSign: 1,
        verticalSign: 1,
        currentBankRad: 0,
      };
      enemies.push(execEnemy);
      activeBossSm = sm;
      lockedTarget = execEnemy;
      selectedSubsystem = null;
      selectedHarvesterCoreId = null;
      manualSubsystemLock = false;
      lockProgress = 0.88;

      explosions.spawnShieldRipple(spawnPos.clone(), 44, 0xf43f5e);
      explosions.spawnImpactSparks(spawnPos.clone(), 0xfbbf24, 2.4);

      bossEntityCreated = true;
      bossEntityId = execEnemy.id;
      bossSceneRegistered =
        execMesh.parent === sectorDynamicGroup && sectorDynamicGroup.parent === root;
      bossLastInCameraView = true;
      bossAiStateLabel = 'dogfight:straight_approach';
      bossTargetAssigned = true;
    } else {
      clearAsteroidsForBossSpawn(spawnPos, 410);
      const capSpec = activeExtLevel.capitalShipOverride ?? {
        name: region.capitalShipName ?? sm.bossName,
        shipClass: region.capitalShipClass ?? 'assault_cruiser',
      };
      const shieldRed =
        capSpec.shipClass === 'sovereign_flagship'
          ? decisionEffects.capitalShipShieldReduction + decisionEffects.sovereignFlagshipWeakenedPct
          : decisionEffects.capitalShipShieldReduction;

      const cap = buildCapitalShipEntity(
        capSpec.name,
        capSpec.shipClass,
        spawnPos,
        shieldRed,
        null,
        bossId,
      );
      const toPlayer = playerPos.clone().sub(spawnPos);
      const heroYaw = Math.atan2(toPlayer.x, toPlayer.z) + 0.36;
      cap.helm.yawRad = heroYaw;
      cap.helm.anchorX = playerPos.x + forwardDir.x * Math.min(820, fwdDist * 0.72);
      cap.helm.anchorY = spawnPos.y;
      cap.helm.anchorZ = playerPos.z + forwardDir.z * Math.min(820, fwdDist * 0.72);
      cap.root.rotation.set(0.03, heroYaw, -0.02, 'YXZ');
      cap.turretCooldown = 0.85;
      activeCapitalShip = cap;

      activeBossSm = {
        ...sm,
        hp: cap.status.hull,
        maxHp: cap.status.maxHull,
        shield: cap.status.shield,
        maxShield: cap.status.maxShield,
      };
      selectedSubsystem =
        CAPITAL_SUBSYSTEM_KEYS.find((k) => !cap.status.subsystems[k].destroyed) ?? 'shields';
      selectedHarvesterCoreId = null;
      manualSubsystemLock = false;
      lockedTarget = null;
      lockProgress = 1.0;

      explosions.spawnExplosion(spawnPos.clone(), 4.8, {
        isSpace: true,
        colorHex: bossId === 'void_harvester' ? 0x22d3ee : 0xff3b1f,
      });
      explosions.spawnShieldRipple(
        spawnPos.clone(),
        140,
        bossId === 'void_harvester' ? 0x38bdf8 : 0xf43f5e,
      );

      bossEntityCreated = true;
      bossEntityId = cap.status.id;
      bossSceneRegistered =
        cap.root.parent === sectorDynamicGroup && sectorDynamicGroup.parent === root;
      bossLastInCameraView = true;
      bossAiStateLabel = 'capital_helm_active';
      bossTargetAssigned = true;
    }

    activeMissionEventBanner = `${sm.bossKind === 'mini_boss' ? 'MINI-BOSS' : 'MAJOR BOSS'} ARRIVED: ${sm.bossName.toUpperCase()}`;
    activeMissionEventTimer = 5.4;
    showToast(`${activeMissionEventBanner} — ENGAGE AT WILL!`, 3.8);
    callbacks.onStageOrBossBanner?.(activeMissionEventBanner, 'critical');
    callbacks.onExtinctionAudioCue?.('boss_intro');
    if (sm.bossKind === 'major_boss') {
      callbacks.onMissionMoment?.({
        id: `boss_arrival_${bossId}`,
        effectKind: 'capital_emergence',
        commsMessage: `${sm.bossName} has jumped into combat range directly ahead!`,
      } as MissionMomentDef);
    }

    recordEncounterTransition('BOSS_INTRO', bossId, 'SATISFIED', triggerReason);
    return true;
  };

  const buildEncounterDiagnostics = (): EncounterDiagnosticsSnapshot => {
    const curStageIdx = battleDirector ? battleDirector.currentStageIndex : 0;
    const curStage = battleDirector?.stages[curStageIdx];
    const execEnemy =
      activeBossSm?.bossId === 'executioner'
        ? enemies.find((e) => e.isExecutionerBoss)
        : null;
    const playerPos = lastShipRef?.root.position ?? activeCenter;
    let worldPos: [number, number, number] | null = null;
    let distMeters: number | null = null;
    let hp: number | null = activeBossSm ? Math.round(activeBossSm.hp) : null;
    let maxHp: number | null = activeBossSm ? activeBossSm.maxHp : null;
    let shield: number | null = activeBossSm ? Math.round(activeBossSm.shield) : null;
    let maxShield: number | null = activeBossSm ? activeBossSm.maxShield : null;

    if (activeCapitalShip && (!activeExtLevel || activeExtLevel.bossId)) {
      const p = activeCapitalShip.root.position;
      worldPos = [Math.round(p.x), Math.round(p.y), Math.round(p.z)];
      distMeters = Math.round(p.distanceTo(playerPos));
      hp = Math.round(activeCapitalShip.status.hull);
      maxHp = activeCapitalShip.status.maxHull;
      shield = Math.round(activeCapitalShip.status.shield);
      maxShield = activeCapitalShip.status.maxShield;
      bossSceneRegistered =
        activeCapitalShip.root.parent === sectorDynamicGroup && sectorDynamicGroup.parent === root;
    } else if (execEnemy) {
      worldPos = [Math.round(execEnemy.pos.x), Math.round(execEnemy.pos.y), Math.round(execEnemy.pos.z)];
      distMeters = Math.round(execEnemy.pos.distanceTo(playerPos));
      hp = Math.round(execEnemy.health);
      maxHp = execEnemy.maxHealth;
      shield = Math.round(execEnemy.shield);
      maxShield = execEnemy.maxShield;
      bossSceneRegistered =
        execEnemy.root.parent === sectorDynamicGroup && sectorDynamicGroup.parent === root;
    }

    const defeatState: EncounterDiagnosticsSnapshot['defeatState'] = !activeBossSm
      ? 'none'
      : activeBossSm.defeated && activeBossSm.meltdownActive
        ? 'meltdown'
        : activeBossSm.defeated
          ? 'defeated'
          : 'active';

    const hostilesAlive = enemies.filter((e) => e.alive).length;
    return {
      activeCampaignTrack: activeExtLevel ? 'extinction' : 'original',
      activeLevelId: activeLevelOverride?.id ?? null,
      encounterStage: battleDirector ? battleDirector.currentStageIndex + 1 : 1,
      totalStages: battleDirector ? battleDirector.totalStages : 1,
      stageLabel: curStage?.label ?? activeMissionTitle,
      advanceWhen: curStage?.advanceWhen ?? (activeCapitalShip ? 'capital_or_hostiles' : 'hostiles_cleared'),
      requiredObjectives: activeLevelOverride?.primaryObjectiveText ?? activeMissionTitle,
      objectiveCompletionState: missionCompleted
        ? 'mission_complete'
        : activeBossSm?.defeated
          ? 'boss_defeated'
          : bossEntityCreated
            ? 'boss_active'
            : hostilesAlive <= 0
              ? 'stage_cleared_ready'
              : `in_progress (${hostilesAlive} hostiles)`,
      bossSpawnCondition: !activeExtLevel?.bossId
        ? 'None (Non-boss mission)'
        : bossEntityCreated
          ? 'SATISFIED'
          : curStage?.spawnBossOnEnter
            ? 'READY_ON_ENTER'
            : `Clear Stage ${battleDirector ? battleDirector.currentStageIndex + 1 : 1} (${hostilesAlive} hostiles left)`,
      bossSpawnAttemptCount,
      bossEntityCreated,
      bossEntityId,
      sceneRegistered: bossSceneRegistered,
      bossWorldPos: worldPos,
      distanceToPlayerMeters: distMeters,
      bossInCameraView: bossLastInCameraView,
      bossHealth: hp,
      bossMaxHealth: maxHp,
      bossShield: shield,
      bossMaxShield: maxShield,
      bossAiState: bossAiStateLabel,
      bossPhase: activeBossSm?.phase ?? 0,
      targetAssigned: bossTargetAssigned,
      defeatState,
      transitionLog: [...encounterTransitionLog],
    };
  };

  const spawnRegionEntities = (
    regionId: SpaceRegionId,
    missionOverride: CampaignMissionDef | null,
    preserveProgress: boolean,
    levelOverride: CampaignLevelDef | null = null,
  ) => {
    const region = SPACE_REGIONS[regionId];
    activeCenter.set(...region.worldCenter);

    for (const a of asteroids) asteroidGroup.remove(a.mesh);
    asteroids.length = 0;
    for (const bm of scenicBeltMeshes) {
      scenicBeltGroup.remove(bm);
      bm.dispose();
    }
    scenicBeltMeshes = [];
    for (const e of enemies) sectorDynamicGroup.remove(e.root);
    enemies.length = 0;
    if (activeCapitalShip) {
      sectorDynamicGroup.remove(activeCapitalShip.root);
      activeCapitalShip = null;
    }
    for (const dh of dyingCapitalHulls) {
      sectorDynamicGroup.remove(dh.root);
    }
    dyingCapitalHulls.length = 0;
    for (const pe of pylonEntities) {
      sectorDynamicGroup.remove(pe.group);
    }
    pylonEntities.length = 0;
    orbitalPylons = [];
    if (extractionBeaconMesh) {
      sectorDynamicGroup.remove(extractionBeaconMesh);
      extractionBeaconMesh = null;
    }
    extractionActive = false;
    extractionReached = false;
    battleDirector = null;
    activeBossSm = null;
    selectedHarvesterCoreId = null;
    bossSpawnAttemptCount = 0;
    bossEntityCreated = false;
    bossEntityId = null;
    bossSceneRegistered = false;
    bossLastInCameraView = false;
    bossAiStateLabel = 'inactive';
    bossTargetAssigned = false;
    encounterTransitionLog.length = 0;
    ewInterferenceState = evaluateAggregateDisruptorEw([]);
    for (const sg of sectorGeos) sg.dispose();
    sectorGeos.length = 0;
    for (const sm of sectorMats) sm.dispose();
    sectorMats.length = 0;
    for (const p of projectiles) {
      p.mesh.visible = false;
      if (projectilePool.length < MAX_PROJECTILE_POOL) projectilePool.push(p);
      else projectileGroup.remove(p.mesh);
    }
    projectiles.length = 0;
    selectedSubsystem = null;
    manualSubsystemLock = false;
    lockedTarget = null;
    lockProgress = 0;
    lockGraceSec = 0;
    latestPredictiveLeadReticle = null;
    targetHudSmoothState = {};
    latestTargetMarkers = [];
    latestOffscreenTargets = [];
    latestCapitalDistanceMeters = null;

    const saved = preserveProgress ? savedRegionProgress.get(regionId) : undefined;

    // Place Friendly Carrier & Allied Repair Beacon safely near entry corridor
    friendlyCarrier.visible = region.hasFriendlyCarrier;
    friendlyCarrier.position.set(
      activeCenter.x + region.spawnOffset[0] + 420,
      activeCenter.y + region.spawnOffset[1] - 90,
      activeCenter.z + region.spawnOffset[2] - 280,
    );
    friendlyCarrier.rotation.set(0.02, -0.32, 0);

    repairBeaconPos.set(
      activeCenter.x + region.spawnOffset[0] + 240,
      activeCenter.y + region.spawnOffset[1] + 40,
      activeCenter.z + region.spawnOffset[2] - 220,
    );
    repairBeaconGroup.position.copy(repairBeaconPos);

    // Distribute True 3D Asteroids Across ALL 5 Sectors (isolated monoliths, narrow canyons, clusters, vertical layers & 3D belt ribbons)
    const shipSafeSpawn = new THREE.Vector3(
      activeCenter.x + region.spawnOffset[0],
      activeCenter.y + region.spawnOffset[1],
      activeCenter.z + region.spawnOffset[2],
    );

    const sectorAstProfile = SECTOR_ASTEROID_PROFILES[regionId];
    const largeCount = Math.max(12, Math.round(region.largeAsteroids * 1.45));
    const mediumCount = Math.max(20, Math.round(region.mediumAsteroids * 1.55));
    const smallCount = Math.max(22, Math.round(region.smallAsteroids * 1.45));
    const distributedSpecs = generateSectorAsteroidLayout({
      regionId,
      center: { x: activeCenter.x, y: activeCenter.y, z: activeCenter.z },
      spawnPos: { x: shipSafeSpawn.x, y: shipSafeSpawn.y, z: shipSafeSpawn.z },
      beaconPos: { x: repairBeaconPos.x, y: repairBeaconPos.y, z: repairBeaconPos.z },
      fieldRadius: region.fieldRadius * 0.88,
      largeCount,
      mediumCount,
      smallCount,
      wreckageCount: Math.max(6, region.wreckageFragments),
      driftSpeedMult: region.driftSpeedMultiplier,
    });

    for (let idx = 0; idx < distributedSpecs.length; idx++) {
      const sp = distributedSpecs[idx];
      const isWreck = sp.tier === 'wreckage';
      const geo = isWreck
        ? wreckShardGeo
        : sp.tier === 'small'
          ? asteroidSmallTemplates[idx % asteroidSmallTemplates.length]
          : asteroidHeroTemplates[idx % asteroidHeroTemplates.length];
      const mat = isWreck
        ? idx % 2 === 0
          ? mats.asteroidIronOre
          : mats.asteroidBasalt
        : idx % 3 === 0
          ? mats.asteroidIronOre
          : idx % 3 === 1
            ? mats.asteroidBasalt
            : mats.asteroidRock;

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(sp.x, sp.y, sp.z);
      mesh.scale.set(sp.scaleX, sp.scaleY, sp.scaleZ);
      mesh.rotation.set(sp.rotX, sp.rotY, sp.rotZ);
      asteroidGroup.add(mesh);

      const mass =
        sp.tier === 'large'
          ? 6.4 + Math.max(0, sp.radius - 34) * 0.28
          : sp.tier === 'medium'
            ? 2.3 + Math.max(0, sp.radius - 15) * 0.18
            : sp.tier === 'wreckage'
              ? 3.4
              : 0.58 + Math.max(0, sp.radius - 5) * 0.08;

      asteroids.push({
        id: sp.id,
        tier: sp.tier,
        mesh,
        pos: new THREE.Vector3(sp.x, sp.y, sp.z),
        vel: new THREE.Vector3(sp.driftX, sp.driftY, sp.driftZ),
        rotVel: new THREE.Vector3(
          (idx % 2 === 0 ? 1 : -1) * (sp.tier === 'large' ? 0.1 : 0.36),
          (idx % 3 === 0 ? -1 : 1) * (sp.tier === 'large' ? 0.08 : 0.3),
          sp.tier === 'small' ? 0.46 : 0.12,
        ),
        radius: isWreck ? sp.radius * 1.02 : sp.radius * 0.94,
        mass,
        hp: sp.tier === 'small' ? 35 : 9999,
        cooldown: 0,
      });
    }

    // Rebuild Spatial Asteroid Partitioning Grid for fast O(1) collision, avoidance & camera queries
    const astItems: SpatialObstacleRef[] = [];
    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i];
      astItems.push({ id: a.id, x: a.pos.x, y: a.pos.y, z: a.pos.z, radius: a.radius });
    }
    spatialAsteroidGrid.rebuild(astItems);

    // 3 Batched THREE.InstancedMesh 3D Scenic Asteroid Belts spanning ALL 5 sectors at 3 draw calls!
    const perMatCount = Math.max(70, Math.round(sectorAstProfile.instancedBeltCount / 3));
    const beltMaterials = [mats.asteroidRock, mats.asteroidBasalt, mats.asteroidIronOre];
    const beltGeos = [asteroidSmallTemplates[0], asteroidSmallTemplates[1], asteroidSmallTemplates[2]];
    const beltRand = createMulberry32(regionId.length * 7919 + 31337);
    const dummy = new THREE.Object3D();
    const instColor = new THREE.Color();

    for (let mIdx = 0; mIdx < 3; mIdx++) {
      const inst = new THREE.InstancedMesh(beltGeos[mIdx], beltMaterials[mIdx], perMatCount);
      for (let i = 0; i < perMatCount; i++) {
        let bx = 0;
        let by = 0;
        let bz = 0;
        for (let tries = 0; tries < 8; tries++) {
          const mode = i % 3;
          if (mode === 0) {
            // Sweeping 3D tilted asteroid ribbon across the sector
            const t = (beltRand() - 0.5) * 2.0;
            const along = t * region.fieldRadius * 0.72;
            const spread = (beltRand() - 0.5) * 2100;
            const ribbonCurve = Math.sin(t * 2.4 + mIdx * 0.7) * 740;
            bx = activeCenter.x + along * 0.72 + spread * 0.68 + ribbonCurve;
            by =
              activeCenter.y +
              (beltRand() - 0.5) * sectorAstProfile.verticalSpanMeters +
              Math.cos(t * 2.1) * 240;
            bz = activeCenter.z - along * 0.68 + spread * 0.72;
          } else if (mode === 1) {
            // 3D volumetric scatter above, below & flanking all flight vectors
            const ang = beltRand() * Math.PI * 2;
            const dist = 360 + beltRand() * (region.fieldRadius * 0.74);
            bx = activeCenter.x + Math.cos(ang) * dist;
            by = activeCenter.y + (beltRand() - 0.5) * sectorAstProfile.verticalSpanMeters * 1.05;
            bz = activeCenter.z + Math.sin(ang) * dist;
          } else {
            // Near-corridor 3D cluster boulders framing dramatic depth around player approach
            const ang = beltRand() * Math.PI * 2;
            const dist = 240 + beltRand() * 1650;
            bx = shipSafeSpawn.x + Math.cos(ang) * dist;
            by = shipSafeSpawn.y + (beltRand() - 0.5) * Math.min(920, sectorAstProfile.verticalSpanMeters * 0.6);
            bz = shipSafeSpawn.z + Math.sin(ang) * dist - 420;
          }
          const dSpawn = Math.hypot(bx - shipSafeSpawn.x, by - shipSafeSpawn.y, bz - shipSafeSpawn.z);
          const dBeacon = Math.hypot(bx - repairBeaconPos.x, by - repairBeaconPos.y, bz - repairBeaconPos.z);
          if (dSpawn > 190 && dBeacon > 140) break;
        }

        const baseScale =
          beltRand() < 0.16
            ? 32 + beltRand() * 44
            : beltRand() < 0.52
              ? 12 + beltRand() * 18
              : 4.5 + beltRand() * 8.5;
        dummy.position.set(bx, by, bz);
        dummy.rotation.set(beltRand() * 6.28, beltRand() * 6.28, beltRand() * 6.28);
        dummy.scale.set(
          baseScale * (0.72 + beltRand() * 0.56),
          baseScale * (0.68 + beltRand() * 0.54),
          baseScale * (0.74 + beltRand() * 0.58),
        );
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);

        const shade = 0.74 + beltRand() * 0.3;
        const warm = 0.96 + beltRand() * 0.08;
        instColor.setRGB(shade * warm, shade, shade * (1.02 - beltRand() * 0.06));
        inst.setColorAt(i, instColor);
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.computeBoundingSphere();
      scenicBeltGroup.add(inst);
      scenicBeltMeshes.push(inst);
    }

    // Spawn Capital Ship (Level override > Mission override > Region default) at the Capital Encounter Zone!
    const capOverride = levelOverride
      ? levelOverride.capitalShipOverride
      : missionOverride
        ? missionOverride.capitalShipOverride
        : undefined;
    const capSpec =
      capOverride !== undefined
        ? capOverride
        : region.hasCapitalShip && region.capitalShipName && region.capitalShipClass
          ? { name: region.capitalShipName, shipClass: region.capitalShipClass }
          : null;

    if (capSpec && !activeExtLevel?.bossId && (!saved?.capitalShipStatus || !saved.capitalShipStatus.destroyed)) {
      const capZone =
        region.encounterZones.find((z) => z.hasCapitalShip) ??
        region.encounterZones[region.encounterZones.length - 1];
      const capPos = activeExtLevel
        ? new THREE.Vector3(
            shipSafeSpawn.x + 140,
            shipSafeSpawn.y + 65,
            shipSafeSpawn.z - 1480,
          )
        : new THREE.Vector3(
            activeCenter.x + capZone.offsetFromRegionCenter[0],
            activeCenter.y + capZone.offsetFromRegionCenter[1],
            activeCenter.z + capZone.offsetFromRegionCenter[2],
          );
      if (activeExtLevel) {
        clearAsteroidsForBossSpawn(capPos, 320);
      }
      const shieldRed =
        capSpec.shipClass === 'sovereign_flagship'
          ? decisionEffects.capitalShipShieldReduction + decisionEffects.sovereignFlagshipWeakenedPct
          : decisionEffects.capitalShipShieldReduction;

      activeCapitalShip = buildCapitalShipEntity(
        capSpec.name,
        capSpec.shipClass,
        capPos,
        shieldRed,
        saved?.capitalShipStatus ?? null,
        activeExtLevel?.bossId ?? null,
      );
      selectedSubsystem =
        CAPITAL_SUBSYSTEM_KEYS.find((k) => !activeCapitalShip!.status.subsystems[k].destroyed) ?? null;
      if (activeCapitalShip && !activeCapitalShip.status.destroyed && !activeExtLevel) {
        spawnCapitalEscortSquadron(activeCapitalShip);
      }
    }

    // Spawn Enemies (Extinction Staged Director OR Original Level Mix OR Sector encounter zones)
    let cursor = 0;
    const diffEnemyHpMult = Math.max(
      0.72,
      Math.min(1.28, DIFFICULTY_PROFILES[activeDifficulty].enemyHealth),
    );
    const initialManeuvers: DogfightManeuverState[] = [
      'straight_approach',
      'lateral_strafe',
      'vertical_climb_dive',
      'high_speed_flyby',
      'tail_pursuit',
    ];

    if (activeExtLevel) {
      // Extinction Campaign: Controlled Staged Battle Director + Deterministic Boss Emergence
      battleDirector = createBattleDirector(activeExtLevel.battleStages);
      activeBossSm = null;

      if (activeExtLevel.extractionRequired) {
        const prevTrack = trackingSectorGeos;
        trackingSectorGeos = true;
        try {
          const gateGroup = new THREE.Group();
          const outerRing = new THREE.Mesh(
            trackGeo(new THREE.TorusGeometry(92, 4.2, 12, 36)),
            repairRingMat,
          );
          const innerRing = new THREE.Mesh(
            trackGeo(new THREE.TorusGeometry(64, 2.2, 10, 32)),
            subsystemCyanCoilMat,
          );
          gateGroup.add(outerRing, innerRing);
          gateGroup.visible = false;
          sectorDynamicGroup.add(gateGroup);
          extractionBeaconMesh = gateGroup;
        } finally {
          trackingSectorGeos = prevTrack;
        }
      }

      const stage1 = activeExtLevel.battleStages[0];
      if (stage1) {
        spawnExtinctionWaveMap(
          stage1.enemyWaves,
          shipSafeSpawn,
          `ext_${activeExtLevel.id}_s1`,
          region,
        );
        if (stage1.spawnBossOnEnter && activeExtLevel.bossId) {
          spawnExtinctionBossEncounter(
            shipSafeSpawn,
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(1, 0, 0),
            'STAGE_1_ENTER',
          );
        } else if (activeExtLevel.bossId) {
          activeMissionEventBanner = stage1.headline;
          activeMissionEventTimer = 4.5;
          recordEncounterTransition(
            'STAGE_1_VANGUARD',
            activeExtLevel.bossId,
            'WAITING_FOR_STAGE_1_CLEAR',
            'Awaiting Stage 1 vanguard clear before boss emergence',
          );
        } else {
          activeMissionEventBanner = stage1.headline;
          activeMissionEventTimer = 4.5;
          recordEncounterTransition(
            'STAGE_1_ACTIVE',
            null,
            'NON_BOSS_MISSION',
            'Non-boss Extinction mission initialized',
          );
        }
        if (stage1.triggerEvents) {
          for (const evt of stage1.triggerEvents) {
            triggerExtinctionEvent(evt, shipSafeSpawn);
          }
        }
      }
    } else if (levelOverride) {
      const entries = Object.entries(levelOverride.enemyMix) as Array<[EnemyFighterRole, number]>;
      for (const [role, rawCount] of entries) {
        const count = Math.max(1, rawCount);
        const cfg = ENEMY_FIGHTER_ROLES[role];
        const scaledHp = Math.round(cfg.baseHp * diffEnemyHpMult);
        const scaledShield = Math.round(cfg.baseShield * (0.82 + 0.18 * diffEnemyHpMult));
        for (let k = 0; k < count; k++) {
          const zone = region.encounterZones[cursor % region.encounterZones.length];
          const eid = `lvl_${levelOverride.id}_${role}_${k}`;
          const mesh = buildAlienStarfighterMesh(role);
          // Place level encounters along an exciting combat arc 520m–1650m ahead of spawn so action starts crisp & readable
          const band = Math.floor(cursor / 3);
          const lateral = ((cursor % 3) - 1) * 240 + (k % 2 === 0 ? -65 : 65);
          const forwardDist = 560 + band * 340 + (cursor % 2) * 110;
          const height = (cursor % 2 === 0 ? 1 : -1) * (42 + (cursor % 3) * 52);
          const pos = new THREE.Vector3(
            shipSafeSpawn.x + lateral,
            shipSafeSpawn.y + height,
            shipSafeSpawn.z - forwardDist,
          );
          mesh.position.copy(pos);
          sectorDynamicGroup.add(mesh);

          enemies.push({
            id: eid,
            zoneId: zone.id,
            zoneCenter: pos.clone(),
            name: `${cfg.displayName} #${k + 1}`,
            role,
            shipClass: cfg.shipClass,
            isCorvette: role === 'medium_warship',
            isLegendary: false,
            root: mesh,
            pos,
            vel: new THREE.Vector3(),
            health: scaledHp,
            maxHealth: scaledHp,
            shield: scaledShield,
            maxShield: scaledShield,
            empStunTimer: 0,
            lastHitAge: 99,
            destroyedFlashTimer: 0,
            alive: true,
            orbitAngle: cursor * 0.9,
            orbitRadius: role === 'medium_warship' ? 220 : 280,
            orbitHeight: height,
            orbitSpeed:
              (role === 'medium_warship'
                ? 0.14
                : role === 'bomber'
                  ? 0.2
                  : role === 'elite_ace'
                    ? 0.58
                    : 0.38) * (cursor % 2 === 0 ? 1 : -1),
            flankPhase: cursor * 1.3,
            squadSlot: k,
            evasionTimer: 0,
            aceFlareCooldown: role === 'elite_ace' ? 4.5 : 999,
            fireCooldown: 1.55 + (cursor % 5) * 0.32,
            missileCooldown: 8.5 + (cursor % 4) * 2.2,
            escapeTimer: role === 'scout' ? 45 : 999,
            aiAccumDt: 0,
            maneuverState:
              role === 'medium_warship'
                ? 'straight_approach'
                : initialManeuvers[cursor % initialManeuvers.length],
            stateTimer: 2.2 + (cursor % 4) * 0.85,
            strafeSign: cursor % 2 === 0 ? 1 : -1,
            verticalSign: cursor % 3 === 0 ? 1 : -1,
            currentBankRad: 0,
          });
          cursor++;
        }
      }
    } else {
      for (const zone of region.encounterZones) {
        const zCenter = new THREE.Vector3(
          activeCenter.x + zone.offsetFromRegionCenter[0],
          activeCenter.y + zone.offsetFromRegionCenter[1],
          activeCenter.z + zone.offsetFromRegionCenter[2],
        );
        const entries = Object.entries(zone.fighterMix) as Array<[EnemyFighterRole, number]>;
        for (const [role, rawCount] of entries) {
          if (missionOverride?.missionNumber === 1 && role === 'medium_warship') {
            continue;
          }
          const count = Math.max(
            1,
            Math.round(rawCount * (1 - decisionEffects.enemyReinforcementReduction * 0.5)),
          );
          const cfg = ENEMY_FIGHTER_ROLES[role];
          const scaledHp = Math.round(cfg.baseHp * diffEnemyHpMult);
          const scaledShield = Math.round(cfg.baseShield * (0.82 + 0.18 * diffEnemyHpMult));
          for (let k = 0; k < count; k++) {
            const eid = `fighter_${regionId}_${zone.id}_${role}_${k}`;
            if (saved?.deadEnemyIds.has(eid)) {
              cursor++;
              continue;
            }
            const mesh = buildAlienStarfighterMesh(role);
            const angle = ((k + cursor * 0.37) / Math.max(1, count)) * Math.PI * 2;
            const radius = 240 + (cursor % 4) * 115;
            const height = (cursor % 2 === 0 ? 1 : -1) * (36 + (cursor % 3) * 48);
            const pos = new THREE.Vector3(
              zCenter.x + Math.cos(angle) * radius,
              zCenter.y + height,
              zCenter.z + Math.sin(angle) * radius,
            );
            mesh.position.copy(pos);
            sectorDynamicGroup.add(mesh);

            enemies.push({
              id: eid,
              zoneId: zone.id,
              zoneCenter: zCenter.clone(),
              name: `${cfg.displayName} #${k + 1}`,
              role,
              shipClass: cfg.shipClass,
              isCorvette: role === 'medium_warship',
              isLegendary: false,
              root: mesh,
              pos,
              vel: new THREE.Vector3(),
              health: scaledHp,
              maxHealth: scaledHp,
              shield: scaledShield,
              maxShield: scaledShield,
              empStunTimer: 0,
              lastHitAge: 99,
              destroyedFlashTimer: 0,
              alive: true,
              orbitAngle: angle,
              orbitRadius: role === 'medium_warship' ? radius * 0.72 : radius,
              orbitHeight: height,
              orbitSpeed:
                (role === 'medium_warship'
                  ? 0.14
                  : role === 'bomber'
                    ? 0.2
                    : role === 'elite_ace'
                      ? 0.58
                      : 0.38) * (cursor % 2 === 0 ? 1 : -1),
              flankPhase: cursor * 1.3,
              squadSlot: k,
              evasionTimer: 0,
              aceFlareCooldown: role === 'elite_ace' ? 4.5 : 999,
              fireCooldown: 1.45 + (cursor % 5) * 0.32,
              missileCooldown: 8.5 + (cursor % 4) * 2.2,
              escapeTimer: role === 'scout' ? 42 : 999,
              aiAccumDt: 0,
              maneuverState:
                role === 'medium_warship'
                  ? 'straight_approach'
                  : initialManeuvers[cursor % initialManeuvers.length],
              stateTimer: 2.2 + (cursor % 4) * 0.85,
              strafeSign: cursor % 2 === 0 ? 1 : -1,
              verticalSign: cursor % 3 === 0 ? 1 : -1,
              currentBankRad: 0,
            });
            cursor++;
          }
        }
      }
    }

    // Spawn Legendary Enemy Pilot Boss when specified by level or operation
    const missionNum = levelOverride?.operationNumber ?? missionOverride?.missionNumber ?? 1;
    const legendaryDef = levelOverride
      ? levelOverride.legendaryPilotId
        ? LEGENDARY_PILOTS.find((p) => p.id === levelOverride.legendaryPilotId) ?? null
        : null
      : getLegendaryPilotForMission(missionNum);
    legendaryDefeatedInMission = false;
    legendaryBonusSalvageEarned = 0;

    if (legendaryDef && !saved?.deadEnemyIds.has(`legend_${legendaryDef.id}`)) {
      const cfg = ENEMY_FIGHTER_ROLES.elite_ace;
      const lHp = Math.round(cfg.baseHp * legendaryDef.hpMultiplier * diffEnemyHpMult);
      const lShield = Math.round(cfg.baseShield * legendaryDef.shieldMultiplier * (0.85 + 0.15 * diffEnemyHpMult));
      const lMesh = buildAlienStarfighterMesh('elite_ace', legendaryDef);
      const lPos = new THREE.Vector3(
        shipSafeSpawn.x + 165,
        shipSafeSpawn.y + 85,
        shipSafeSpawn.z - 840,
      );
      lMesh.position.copy(lPos);
      sectorDynamicGroup.add(lMesh);
      enemies.push({
        id: `legend_${legendaryDef.id}`,
        zoneId: region.encounterZones[0].id,
        zoneCenter: lPos.clone(),
        name: `${legendaryDef.name} "${legendaryDef.callsign}"`,
        role: 'elite_ace',
        shipClass: 'fighter',
        isCorvette: false,
        isLegendary: true,
        legendaryDef,
        legendaryPhase2Triggered: false,
        root: lMesh,
        pos: lPos,
        vel: new THREE.Vector3(),
        health: lHp,
        maxHealth: lHp,
        shield: lShield,
        maxShield: lShield,
        empStunTimer: 0,
        lastHitAge: 99,
        destroyedFlashTimer: 0,
        alive: true,
        orbitAngle: 0,
        orbitRadius: 280,
        orbitHeight: 65,
        orbitSpeed: 0.62,
        flankPhase: 0.5,
        squadSlot: 0,
        evasionTimer: 0,
        aceFlareCooldown: 4.0,
        fireCooldown: 1.2,
        missileCooldown: 7.5,
        escapeTimer: 999,
        aiAccumDt: 0,
        maneuverState: 'high_speed_flyby',
        stateTimer: 3.0,
        strafeSign: 1,
        verticalSign: 1,
        currentBankRad: 0,
      });
      callbacks.onLegendaryPilotEvent?.('intro', legendaryDef);
      emitDialogueLine('ace_intro', {
        speaker: legendaryDef.name,
        callsign: legendaryDef.callsign,
        text: legendaryDef.introTransmission,
      });
      activeMissionEventBanner = `LEGENDARY ACE DETECTED: ${legendaryDef.name.toUpperCase()} "${legendaryDef.callsign}"`;
      activeMissionEventTimer = 5.2;
    }

    // Reset Wingmen around ship spawn, Reinforcement Director & Scripted Mission Events
    const totalWingmen = Math.min(wingmen.length, 3 + decisionEffects.extraAlliedFighters);
    for (let i = 0; i < wingmen.length; i++) {
      const w = wingmen[i];
      w.active = i < totalWingmen;
      w.hull = w.maxHull;
      w.shield = w.maxShield;
      w.kills = 0;
      w.status = 'active';
      w.pos.set(
        shipSafeSpawn.x + w.formationOffset[0],
        shipSafeSpawn.y + w.formationOffset[1],
        shipSafeSpawn.z + w.formationOffset[2],
      );
      w.vel.set(0, 0, -90);
      w.root.position.copy(w.pos);
      w.root.visible = w.active;
    }

    initialRegionHostiles = Math.max(4, enemies.filter((e) => e.alive).length);
    reinforcementDirector = createReinforcementDirector(
      missionNum,
      decisionEffects.enemyReinforcementReduction,
    );
    if (!preserveProgress) {
      triggeredMissionEventIds.clear();
      if (!legendaryDef) {
        activeMissionEventBanner = null;
        activeMissionEventTimer = 0;
      }
    }
  };

  const resetPlayerCombatState = (ship: ValkyrieSpacecraft, keepShipPosition = false) => {
    const region = SPACE_REGIONS[currentRegionId];
    const spec = getShipSpec();
    const mods = computeEquippedUpgradeModifiers(spaceLoadout.equippedModules);
    vitals.maxHull = Math.round(spec.maxHull * mods.hullMult);
    vitals.maxShield = Math.round((spec.maxShield + (spaceLoadout.shieldLevel - 1) * 28) * mods.shieldMult);
    vitals.shield = vitals.maxShield;
    vitals.hull = Math.max(
      Math.round(vitals.maxHull * 0.55),
      Math.round(vitals.maxHull * (spaceLoadout.shipHullCondition / 100)),
    );
    vitals.engineIntegrity = 100;
    vitals.controlIntegrity = 100;
    vitals.weaponIntegrity = 100;
    vitals.boostEnergy = 100;
    vitals.weaponHeat = 0;
    vitals.maxMissiles = Math.min(36, Math.max(6, spaceLoadout.missileCapacity + spec.missileCapacityBonus + mods.extraMissiles));
    vitals.missiles = vitals.maxMissiles;
    vitals.maxCountermeasures = 3 + spaceLoadout.countermeasureLevel;
    vitals.countermeasures = vitals.maxCountermeasures;
    vitals.repairKits = 2 + decisionEffects.extraRepairKits;
    vitals.speed = 145;
    incomingDamageAngleDeg = null;
    incomingDamageIndicatorTimer = 0;
    criticalAlertCooldown = 0;

    instability = {
      pitchShock: 0,
      yawShock: 0,
      rollShock: 0,
      knockbackSpeed: 0,
      alarmTimer: 0,
    };
    collisionSeverityFlash = null;
    collisionWarningBanner = null;
    collisionBannerTimer = 0;
    weaponOverheated = false;
    incomingMissile = false;
    input.supercruise = false;
    autopilotActive = false;
    primaryCooldown = 0;
    missileCooldown = 0;
    flareCooldown = 0;
    flareDecoyTimer = 0;
    railChargeSec = 0;
    railChargeAudioTick = 0;
    hitMarkerTimer = 0;
    hitMarkerKill = false;
    missionFailedReported = false;
    timeSinceDamaged = 10;

    if (!keepShipPosition) {
      // Clear any leftover projectiles or flares from prior sorties so every launch/retry is pristine
      for (let i = projectiles.length - 1; i >= 0; i--) {
        root.remove(projectiles[i].mesh);
      }
      projectiles.length = 0;
      for (let i = decoyFlares.length - 1; i >= 0; i--) {
        root.remove(decoyFlares[i].mesh);
      }
      decoyFlares.length = 0;

      ship.root.position.set(
        region.worldCenter[0] + region.spawnOffset[0],
        region.worldCenter[1] + region.spawnOffset[1],
        region.worldCenter[2] + region.spawnOffset[2],
      );
      ship.root.quaternion.setFromEuler(new THREE.Euler(-0.04, 0.04, 0));
    }
    prevShipPos.copy(ship.root.position);
    ship.setShipClass(spaceLoadout.selectedShipId);
    ship.setDamageVisuals(vitals.hull / vitals.maxHull, vitals.engineIntegrity / 100);
    showToast(`${region.code}: ${region.label.toUpperCase()} — ${region.objectiveSummary.toUpperCase()}`, 3.4);
  };

  const travelToRegion = (
    regionId: SpaceRegionId,
    ship?: ValkyrieSpacecraft,
    missionOverride?: CampaignMissionDef,
    preserveProgress = false,
    levelOverride: CampaignLevelDef | null = null,
  ) => {
    if (preserveProgress && currentRegionId !== regionId) {
      persistCurrentRegionProgress();
    } else if (!preserveProgress) {
      savedRegionProgress.delete(regionId);
    }

    currentRegionId = regionId;
    const region = SPACE_REGIONS[regionId];
    if (regionId === 'debris_belt') currentEncounterId = 'outer_debris_belt';
    else if (regionId === 'sovereign_defense_zone') currentEncounterId = 'dead_orbit';
    else currentEncounterId = 'shattered_fleet';

    activeMissionOverride = missionOverride ?? null;
    activeLevelOverride = levelOverride ?? null;
    activeExtLevel = levelOverride ? getExtinctionLevelById(levelOverride.id) : null;
    activeCampaignMissionId = missionOverride?.id ?? `space_${regionId}`;
    activeMissionCode = levelOverride?.code ?? missionOverride?.code ?? region.code;
    activeMissionTitle = levelOverride?.name ?? missionOverride?.title ?? region.label;
    missionCompleted = false;
    missionFailedReported = false;
    missionKills = 0;
    subsystemsDestroyedCount = 0;
    capitalShipsDestroyedCount = 0;
    if (!preserveProgress) {
      distanceTraveledMeters = 0;
      shotsFired = 0;
      shotsHit = 0;
      sortieElapsedSec = 0;
      repairKitsUsedInLevel = 0;
      lockedTarget = null;
      lockProgress = 0;
      combatScoreState = createCombatScoreState();
      dialogueDirector = createSquadronDialogueDirector();
      nearMissCooldownSec = 0;
      escortWarnedHalf = false;

      // Configure level-specific objective timers & protected units
      levelTimeLimitSec = levelOverride
        ? getScaledLevelTimeLimitSec(levelOverride, activeDifficulty)
        : null;
      levelSurvivalTargetSec = levelOverride?.survivalDurationSec ?? null;
      levelEscapeTimerSec = levelOverride
        ? getScaledEscapeTimerSec(levelOverride, activeDifficulty)
        : null;
      if (levelOverride?.protectedEntityName && levelOverride.protectedMaxHp) {
        protectedEntityName = levelOverride.protectedEntityName;
        protectedEntityMaxHp = levelOverride.protectedMaxHp;
        protectedEntityHp = levelOverride.protectedMaxHp;
      } else {
        protectedEntityName = null;
        protectedEntityMaxHp = 0;
        protectedEntityHp = 0;
      }
    }

    spawnRegionEntities(regionId, activeMissionOverride, preserveProgress, activeLevelOverride);
    callbacks.onRegionEntered?.(regionId);

    const targetShip = ship ?? lastShipRef;
    if (targetShip) {
      const distToDestCenter = targetShip.root.position.distanceTo(activeCenter);
      const crossedSeamlessly = preserveProgress && distToDestCenter < region.fieldRadius * 0.96;
      resetPlayerCombatState(targetShip, crossedSeamlessly);
      if (levelOverride && !preserveProgress) {
        emitDialogueLine('level_start');
      }
    }
  };

  const setEncounter = (encounterId: SpaceEncounterId, ship?: ValkyrieSpacecraft) => {
    currentEncounterId = encounterId;
    const mapped = SPACE_ENCOUNTERS[encounterId].mappedRegionId;
    travelToRegion(mapped, ship);
  };

  // Initialize Sector I by default
  spawnRegionEntities(currentRegionId, null, false);

  const selectWeapon = (weapon: SpaceWeaponId) => {
    activeWeapon = weapon;
    railChargeSec = 0;
    showToast(`WEAPON: [${SPACE_WEAPONS[weapon].keyBind}] ${SPACE_WEAPONS[weapon].name.toUpperCase()}`, 1.7);
  };

  const cycleWeapon = () => {
    const order: SpaceWeaponId[] = ['pulse', 'heavy_plasma', 'missile', 'emp', 'rail_cannon'];
    const idx = order.indexOf(activeWeapon);
    selectWeapon(order[(idx + 1) % order.length]);
  };

  const toggleSupercruise = (): boolean => {
    input.supercruise = !input.supercruise;
    if (input.supercruise) {
      showToast('SUPERCRUISE DRIVE ENGAGED — LONG-DISTANCE CRUISE', 2.0);
    } else {
      autopilotActive = false;
      showToast('SUPERCRUISE DISENGAGED — COMBAT THRUSTERS', 1.6);
    }
    return input.supercruise;
  };

  const toggleAutopilot = (): boolean => {
    autopilotActive = !autopilotActive;
    if (autopilotActive) {
      input.supercruise = true;
      showToast('NAV AUTOPILOT ENGAGED — STEERING TO ACTIVE WAYPOINT', 2.2);
    } else {
      input.supercruise = false;
      showToast('MANUAL FLIGHT CONTROL RESTORED', 1.5);
    }
    return autopilotActive;
  };

  const clearFlightInputs = () => {
    input.throttleForward = false;
    input.throttleReverse = false;
    input.strafeLeft = false;
    input.strafeRight = false;
    input.rollLeft = false;
    input.rollRight = false;
    input.boost = false;
    input.brake = false;
    input.pitchDelta = 0;
    input.yawDelta = 0;
    input.joyPitch = 0;
    input.joyYaw = 0;
    primaryFiring = false;
    railChargeSec = 0;
  };

  const getHarvesterCoreWorldPos = (
    coreId: HarvesterEnergyCoreState['id'],
    out: THREE.Vector3,
  ): boolean => {
    const cm = activeCapitalShip?.harvesterCoreMeshes?.find((m) => m.id === coreId);
    const coreState = activeBossSm?.harvesterCores.find((c) => c.id === coreId);
    if (!cm || !coreState || coreState.destroyed) return false;
    cm.coreMesh.getWorldPosition(out);
    return true;
  };

  const cycleTarget = () => {
    const targets: Array<
      | { type: 'harvester_core'; core: HarvesterEnergyCoreState }
      | { type: 'subsystem'; key: CapitalSubsystemKey }
      | { type: 'fighter'; fighter: EnemyStarfighter }
    > = [];
    if (activeBossSm?.bossId === 'void_harvester' && activeCapitalShip && !activeCapitalShip.status.destroyed) {
      for (const c of activeBossSm.harvesterCores) {
        if (!c.destroyed) targets.push({ type: 'harvester_core', core: c });
      }
    }
    if (activeCapitalShip && !activeCapitalShip.status.destroyed) {
      CAPITAL_SUBSYSTEM_KEYS.forEach((k) => {
        if (!activeCapitalShip!.status.subsystems[k].destroyed) {
          targets.push({ type: 'subsystem', key: k });
        }
      });
    }
    for (const e of enemies) {
      if (e.alive) targets.push({ type: 'fighter', fighter: e });
    }
    if (targets.length === 0) return;

    let currentIdx = -1;
    if (selectedHarvesterCoreId) {
      currentIdx = targets.findIndex(
        (t) => t.type === 'harvester_core' && t.core.id === selectedHarvesterCoreId,
      );
    } else if (selectedSubsystem && !lockedTarget) {
      currentIdx = targets.findIndex((t) => t.type === 'subsystem' && t.key === selectedSubsystem);
    } else if (lockedTarget) {
      currentIdx = targets.findIndex((t) => t.type === 'fighter' && t.fighter.id === lockedTarget!.id);
    }

    const next = targets[(currentIdx + 1) % targets.length];
    if (next.type === 'harvester_core') {
      selectedHarvesterCoreId = next.core.id;
      selectedSubsystem = null;
      manualSubsystemLock = true;
      lockedTarget = null;
      lockProgress = 1.0;
      showToast(`LOCKED HARVESTER CORE: ${next.core.label.toUpperCase()}`, 2.0);
    } else if (next.type === 'subsystem') {
      selectedHarvesterCoreId = null;
      selectedSubsystem = next.key;
      manualSubsystemLock = true;
      lockedTarget = null;
      lockProgress = 1.0;
      const subLabel = activeCapitalShip!.status.subsystems[next.key].label;
      showToast(`LOCKED SUBSYSTEM: ${activeCapitalShip!.status.name.toUpperCase()} -> ${subLabel.toUpperCase()}`, 2.0);
    } else {
      selectedHarvesterCoreId = null;
      selectedSubsystem = null;
      manualSubsystemLock = false;
      lockedTarget = next.fighter;
      lockProgress = 0.85;
      showToast(
        `TARGET LOCKED: ${next.fighter.name.toUpperCase()} [${getAnyEnemyRoleConfig(next.fighter.role).badge}]`,
        1.8,
      );
    }
    callbacks.onMissileLock?.();
  };

  const reportMissionFailure = (cause: MissionFailureCause) => {
    if (missionFailedReported || missionCompleted) return;
    missionFailedReported = true;
    clearFlightInputs();
    emitDialogueLine('level_failure');
    callbacks.onMissionFailed?.({
      cause,
      elapsedSec: Math.max(1, Math.round(sortieElapsedSec)),
      spaceKills: missionKills,
      subsystemsDestroyed: subsystemsDestroyedCount,
      hostilesRemaining: enemies.filter((e) => e.alive).length,
    });
  };

  const checkSpaceMissionCompletion = (forceSurvivalClear = false) => {
    if (missionCompleted || vitals.hull <= 0) return;
    const fightersLeft = enemies.filter((e) => e.alive).length;
    const isFlagshipBoss =
      activeCapitalShip?.status.shipClass === 'sovereign_flagship' ||
      Boolean(activeExtLevel?.bossId);
    const requiredSubs = activeLevelOverride?.requiredSubsystems ?? 3;
    const capDone =
      !activeCapitalShip ||
      activeCapitalShip.status.destroyed ||
      (!isFlagshipBoss &&
        Object.values(activeCapitalShip.status.subsystems).filter((s) => s.destroyed).length >= requiredSubs);

    const extStagesDone = !battleDirector || battleDirector.completed;
    const extBossDone =
      !activeBossSm || (activeBossSm.defeated && !activeBossSm.meltdownActive);
    const extExtractionEscape = Boolean(activeExtLevel?.extractionRequired && extractionReached);

    const isCompleteNow = activeExtLevel
      ? extExtractionEscape ||
        (extStagesDone && extBossDone && fightersLeft === 0 && capDone && !activeExtLevel.extractionRequired)
      : forceSurvivalClear || (fightersLeft === 0 && capDone);

    if (isCompleteNow) {
      missionCompleted = true;
      clearFlightInputs();
      const hullRemainingPct = Math.round((vitals.hull / Math.max(1, vitals.maxHull)) * 100);
      const wingmenDisabled = wingmen.filter((w) => w.active && w.status === 'disabled').length;
      const protectedHpPct =
        protectedEntityMaxHp > 0
          ? Math.max(0, Math.round((protectedEntityHp / protectedEntityMaxHp) * 100))
          : null;
      emitDialogueLine('level_victory');
      showToast(`${activeMissionCode} SECURED — MISSION COMPLETE`, 4.0);
      callbacks.onMissionComplete?.(
        activeCampaignMissionId,
        missionKills,
        subsystemsDestroyedCount,
        capitalShipsDestroyedCount,
        Number((distanceTraveledMeters / 1000).toFixed(1)),
        {
          elapsedSec: Math.max(1, Math.round(sortieElapsedSec)),
          shotsFired,
          shotsHit,
          hullRemainingPct,
          legendaryDefeated: legendaryDefeatedInMission,
          wingmenDisabled,
          bonusSalvage: legendaryBonusSalvageEarned,
          levelId: activeLevelOverride?.id ?? null,
          combatScore: combatScoreState.score,
          maxCombo: Math.max(1, combatScoreState.maxCombo),
          protectedHpPct,
          repairKitsUsed: repairKitsUsedInLevel,
          nearMissCount: combatScoreState.nearMissCount,
          missilesEvaded: combatScoreState.missilesEvaded,
        },
      );
    }
  };

  const forceCompleteMission = () => {
    if (missionCompleted) return;
    missionCompleted = true;
    clearFlightInputs();
    const hullRemainingPct = Math.max(5, Math.round((vitals.hull / Math.max(1, vitals.maxHull)) * 100));
    const wingmenDisabled = wingmen.filter((w) => w.active && w.status === 'disabled').length;
    const protectedHpPct =
      protectedEntityMaxHp > 0
        ? Math.max(75, Math.round((protectedEntityHp / protectedEntityMaxHp) * 100))
        : null;
    showToast(`${activeMissionCode} SECURED — MISSION COMPLETE`, 4.0);
    callbacks.onMissionComplete?.(
      activeCampaignMissionId,
      Math.max(5, missionKills),
      Math.max(activeCapitalShip ? 3 : 0, subsystemsDestroyedCount),
      Math.max(activeCapitalShip ? 1 : 0, capitalShipsDestroyedCount),
      Number(Math.max(4.5, distanceTraveledMeters / 1000).toFixed(1)),
      {
        elapsedSec: Math.max(42, Math.round(sortieElapsedSec)),
        shotsFired: Math.max(24, shotsFired),
        shotsHit: Math.max(16, shotsHit),
        hullRemainingPct,
        legendaryDefeated: legendaryDefeatedInMission,
        wingmenDisabled,
        bonusSalvage: legendaryBonusSalvageEarned,
        levelId: activeLevelOverride?.id ?? null,
        combatScore: Math.max(1850, combatScoreState.score),
        maxCombo: Math.max(4, combatScoreState.maxCombo),
        protectedHpPct,
        repairKitsUsed: repairKitsUsedInLevel,
        nearMissCount: combatScoreState.nearMissCount,
        missilesEvaded: combatScoreState.missilesEvaded,
      },
    );
  };

  const handleAsteroidImpact = (
    ship: ValkyrieSpacecraft,
    impactNormal: THREE.Vector3,
    asteroidMass: number,
    asteroidRadius: number,
    relativeSpeed: number,
    impactCosine: number,
    hitZone: ShipImpactZone,
  ) => {
    const res = computeAsteroidCollision({
      asteroidMass,
      asteroidRadius,
      relativeSpeed,
      impactCosine,
      hitZone,
      vitals,
    });

    timeSinceDamaged = 0;
    vitals.shield = res.shield;
    vitals.hull = res.hull;
    vitals.engineIntegrity = res.engineIntegrity;
    vitals.controlIntegrity = res.controlIntegrity;
    vitals.weaponIntegrity = res.weaponIntegrity;
    vitals.speed = Math.max(18, vitals.speed * (res.severity === 'severe' ? 0.35 : 0.65));
    input.supercruise = false;
    autopilotActive = false;

    knockbackDir.copy(impactNormal).normalize();
    instability = {
      pitchShock: (Math.random() > 0.5 ? 1 : -1) * res.pitchShock,
      yawShock: (Math.random() > 0.5 ? 1 : -1) * res.yawShock,
      rollShock: (Math.random() > 0.5 ? 1 : -1) * res.rollShock,
      knockbackSpeed: res.knockbackSpeed,
      alarmTimer: res.severity === 'severe' ? 3.2 : 2.0,
    };

    ship.addCameraShake(res.cameraShake);
    ship.setDamageVisuals(vitals.hull / vitals.maxHull, vitals.engineIntegrity / 100);

    const contactPt = ship.root.position.clone().addScaledVector(impactNormal, -5.2);
    explosions.spawnExplosion(
      contactPt,
      res.severity === 'severe' ? 2.5 : res.severity === 'medium' ? 1.6 : 0.95,
      { isSpace: true, colorHex: 0xffb862 },
    );

    collisionSeverityFlash = res.severity;
    collisionBannerTimer = res.severity === 'severe' ? 3.2 : 2.2;
    collisionWarningBanner =
      res.severity === 'severe'
        ? `SEVERE ASTEROID IMPACT (${res.hitZone.toUpperCase()}) — USE NANITE REPAIR [H]`
        : res.severity === 'medium'
          ? `MEDIUM ASTEROID COLLISION — ${res.hitZone.toUpperCase()} DAMAGED`
          : `GLANCING ASTEROID GRAZE — SHIELDS ABSORBED IMPACT`;
    showToast(collisionWarningBanner, 2.8);

    if (res.destroyed) {
      explosions.spawnExplosion(ship.root.position.clone(), 3.8, { isSpace: true });
      showToast(`${getShipSpec().name.toUpperCase()} DESTROYED — HULL BREACH`, 3.2);
      reportMissionFailure('asteroid_collision');
    }

    callbacks.onAsteroidCollision?.(res.severity, res.hitZone, res.destroyed);
  };

  const useRepairKit = (): boolean => {
    if (vitals.hull <= 0 || vitals.repairKits <= 0) return false;
    if (
      vitals.hull >= vitals.maxHull &&
      vitals.engineIntegrity >= 100 &&
      vitals.controlIntegrity >= 100
    ) {
      return false;
    }
    vitals.repairKits--;
    const rep = applyShipRepair(vitals, 45, 45);
    vitals.hull = rep.hull;
    vitals.shield = rep.shield;
    vitals.engineIntegrity = rep.engineIntegrity;
    vitals.controlIntegrity = rep.controlIntegrity;
    vitals.weaponIntegrity = rep.weaponIntegrity;
    repairKitsUsedInLevel += 1;
    instability.pitchShock *= 0.2;
    instability.yawShock *= 0.2;
    instability.rollShock *= 0.2;
    lastShipRef?.setDamageVisuals(vitals.hull / vitals.maxHull, vitals.engineIntegrity / 100);
    showToast(`NANITE REPAIR DEPLOYED (${vitals.repairKits} KITS LEFT)`, 2.2);
    callbacks.onShipRepaired?.('kit');
    return true;
  };

  const fireMissile = (ship?: ValkyrieSpacecraft): boolean => {
    const s = ship ?? lastShipRef;
    if (!s || missionCompleted) return false;
    shipForward.set(0, 0, -1).applyQuaternion(s.root.quaternion).normalize();

    let hasValidTarget = false;
    let targetDist = Infinity;
    let targetForwardCos = -1;
    const useHarvesterCoreTarget =
      !lockedTarget &&
      Boolean(
        selectedHarvesterCoreId &&
        activeCapitalShip &&
        !activeCapitalShip.status.destroyed &&
        getHarvesterCoreWorldPos(selectedHarvesterCoreId, tmpSubPos),
      );
    const useSubsystemTarget =
      !lockedTarget &&
      !useHarvesterCoreTarget &&
      Boolean(
        selectedSubsystem &&
        activeCapitalShip &&
        !activeCapitalShip.status.destroyed &&
        !activeCapitalShip.status.subsystems[selectedSubsystem].destroyed,
      );

    if (lockedTarget && lockedTarget.alive) {
      hasValidTarget = true;
      targetDist = lockedTarget.pos.distanceTo(s.root.position);
      tmpVec.subVectors(lockedTarget.pos, s.root.position).normalize();
      targetForwardCos = tmpVec.dot(shipForward);
    } else if (useHarvesterCoreTarget && selectedHarvesterCoreId) {
      getHarvesterCoreWorldPos(selectedHarvesterCoreId, tmpSubPos);
      hasValidTarget = true;
      targetDist = tmpSubPos.distanceTo(s.root.position);
      tmpVec.subVectors(tmpSubPos, s.root.position).normalize();
      targetForwardCos = tmpVec.dot(shipForward);
    } else if (useSubsystemTarget && selectedSubsystem && activeCapitalShip) {
      getSubsystemWorldPos(activeCapitalShip, selectedSubsystem, tmpSubPos);
      hasValidTarget = true;
      targetDist = tmpSubPos.distanceTo(s.root.position);
      tmpVec.subVectors(tmpSubPos, s.root.position).normalize();
      targetForwardCos = tmpVec.dot(shipForward);
    }

    const validation = canLaunchHomingMissile({
      hasValidTarget,
      lockProgress,
      distanceMeters: targetDist,
      targetForwardCos,
      ammoRemaining: vitals.missiles,
      cooldownSec: missileCooldown,
      playerHull: vitals.hull,
    });
    if (!validation.allowed) {
      if (validation.reason !== 'cooldown' && validation.reason !== 'destroyed') {
        callbacks.onEmptyOrdnance?.();
        if (validation.toastMessage) {
          showToast(validation.toastMessage, 1.8);
        }
      }
      return false;
    }

    const missileBallistics = WEAPON_BALLISTICS.missile;
    const wFactor = 0.72 + 0.28 * (vitals.weaponIntegrity / 100);
    missileCooldown = SPACE_WEAPONS.missile.cooldownSec / wFactor;
    vitals.missiles--;
    shotsFired++;
    s.addCameraShake(0.09);
    s.getMuzzleWorldPositions(tmpLeftMuzzle, tmpRightMuzzle);
    const launchLeft = vitals.missiles % 2 === 0;
    const launchPos = launchLeft ? tmpLeftMuzzle : tmpRightMuzzle;

    acquirePooledProjectile(
      missileGeo,
      missileMat,
      launchPos,
      tmpVec.addVectors(launchPos, shipForward),
      tmpVec2.copy(shipForward).multiplyScalar(missileBallistics.projectileSpeed + vitals.speed * 0.45),
      true,
      'missile',
      true,
      Math.round(SPACE_WEAPONS.missile.fighterDamage * (1 + (getWeaponUpgradeLevel('missile') - 1) * 0.14)),
      missileBallistics.maxLifeSec,
      missileBallistics.maxRangeMeters,
      {
        targetEnemy: lockedTarget && lockedTarget.alive ? lockedTarget : undefined,
        targetSubsystem: useSubsystemTarget && selectedSubsystem ? selectedSubsystem : undefined,
        targetHarvesterCoreId:
          useHarvesterCoreTarget && selectedHarvesterCoreId ? selectedHarvesterCoreId : undefined,
        guidanceRemainingSec: missileBallistics.missileMaxGuidanceSec ?? 3.6,
      },
    );
    showToast(
      lockedTarget && lockedTarget.alive
        ? `HOMING MISSILE LOCK -> ${lockedTarget.name.toUpperCase()} (${vitals.missiles} LEFT)`
        : useHarvesterCoreTarget && selectedHarvesterCoreId
          ? `HOMING MISSILE LOCK -> ${selectedHarvesterCoreId.replace('core_', '').toUpperCase()} ENERGY CORE (${vitals.missiles} LEFT)`
          : `HOMING MISSILE LOCK -> ${activeCapitalShip!.status.subsystems[selectedSubsystem!].label.toUpperCase()} (${vitals.missiles} LEFT)`,
      1.6,
    );
    callbacks.onMissileLaunch?.(launchLeft ? -0.28 : 0.28);
    return true;
  };

  const fireActiveWeapon = (ship: ValkyrieSpacecraft) => {
    if (vitals.hull <= 0 || missionCompleted) return;
    if (activeWeapon === 'missile') {
      if (fireMissile(ship)) {
        primaryCooldown = SPACE_WEAPONS.missile.cooldownSec;
      } else {
        primaryCooldown = 0.28;
      }
      return;
    }
    const check = canExecuteWeaponAction({
      hull: vitals.hull,
      cooldownSec: 0,
      overheated: weaponOverheated,
    });
    if (!check.allowed) {
      if (check.reason === 'overheated') {
        callbacks.onEmptyOrdnance?.();
        showToast('WEAPONS OVERHEATED — VENT HEAT [R]', 1.3);
        primaryCooldown = 0.35;
      }
      return;
    }

    const spec = SPACE_WEAPONS[activeWeapon];
    const ballistics = WEAPON_BALLISTICS[activeWeapon];
    const mods = computeEquippedUpgradeModifiers(spaceLoadout.equippedModules);
    const wFactor = 0.68 + 0.32 * (vitals.weaponIntegrity / 100);
    const levelMult = (1 + (getWeaponUpgradeLevel(activeWeapon) - 1) * 0.22) * mods.weaponDamageMult;
    primaryCooldown = spec.cooldownSec / wFactor;
    vitals.weaponHeat = Math.min(100, vitals.weaponHeat + (spec.heatPerShot * mods.weaponHeatMult) / wFactor);
    if (vitals.weaponHeat >= 99) {
      weaponOverheated = true;
      showToast('WEAPONS OVERHEATED — VENT HEAT [R]', 1.8);
    }

    ship.getMuzzleWorldPositions(tmpLeftMuzzle, tmpRightMuzzle);
    shipForward.set(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();

    // Skill-based micro-boresight convergence ONLY (<= 2.4° standard, <= 1.35° subtle, 0° off; never snaps 20-30°!)
    const effectiveAssistMode =
      flightSettings.aimAssistMode ?? (flightSettings.gentleAimAssist ? 'subtle' : 'off');
    let candidateTargetDir: { x: number; y: number; z: number } | null = null;
    let candidateDist = Infinity;
    if (lockedTarget && lockedTarget.alive) {
      candidateDist = lockedTarget.pos.distanceTo(ship.root.position);
      const leadPt = computePredictiveAimPoint({
        shooterPos: ship.root.position,
        targetPos: lockedTarget.pos,
        targetVel: lockedTarget.vel,
        projectileSpeed: ballistics.projectileSpeed,
        leadFactor: 0.9,
      });
      tmpVec.set(leadPt.x - ship.root.position.x, leadPt.y - ship.root.position.y, leadPt.z - ship.root.position.z).normalize();
      candidateTargetDir = { x: tmpVec.x, y: tmpVec.y, z: tmpVec.z };
    } else if (
      selectedHarvesterCoreId &&
      activeCapitalShip &&
      !activeCapitalShip.status.destroyed &&
      getHarvesterCoreWorldPos(selectedHarvesterCoreId, tmpSubPos)
    ) {
      candidateDist = tmpSubPos.distanceTo(ship.root.position);
      tmpVec.subVectors(tmpSubPos, ship.root.position).normalize();
      candidateTargetDir = { x: tmpVec.x, y: tmpVec.y, z: tmpVec.z };
    } else if (selectedSubsystem && activeCapitalShip && !activeCapitalShip.status.destroyed) {
      getSubsystemWorldPos(activeCapitalShip, selectedSubsystem, tmpSubPos);
      candidateDist = tmpSubPos.distanceTo(ship.root.position);
      tmpVec.subVectors(tmpSubPos, ship.root.position).normalize();
      candidateTargetDir = { x: tmpVec.x, y: tmpVec.y, z: tmpVec.z };
    }

    const assistRes = computeAimDirectionWithAssist({
      forward: { x: shipForward.x, y: shipForward.y, z: shipForward.z },
      targetDir: candidateTargetDir,
      weapon: activeWeapon,
      mode: effectiveAssistMode,
      distanceMeters: candidateDist,
    });
    const aimDir = new THREE.Vector3(assistRes.dir.x, assistRes.dir.y, assistRes.dir.z).normalize();

    // Distinct tactile recoil impulse per weapon class
    if (activeWeapon === 'rail_cannon') {
      ship.addCameraShake(0.24);
      explosions.spawnImpactSparks(
        tmpLeftMuzzle.clone().lerp(tmpRightMuzzle, 0.5).addScaledVector(aimDir, 2.2),
        0xc8f4ff,
        1.15,
      );
    } else if (activeWeapon === 'heavy_plasma') {
      ship.addCameraShake(0.09);
    } else if (activeWeapon === 'emp') {
      ship.addCameraShake(0.12);
    }

    const geo =
      activeWeapon === 'rail_cannon'
        ? railBeamGeo
        : activeWeapon === 'heavy_plasma'
          ? plasmaOrbGeo
          : activeWeapon === 'emp'
            ? empRingGeo
            : playerLaserGeo;
    const mat =
      activeWeapon === 'rail_cannon'
        ? railBeamMat
        : activeWeapon === 'heavy_plasma'
          ? plasmaOrbMat
          : activeWeapon === 'emp'
            ? empRingMat
            : playerLaserMat;

    const muzzles =
      activeWeapon === 'emp' || activeWeapon === 'rail_cannon'
        ? [tmpLeftMuzzle.clone().lerp(tmpRightMuzzle, 0.5)]
        : [tmpLeftMuzzle, tmpRightMuzzle];

    shotsFired++;
    muzzlePanToggle = -muzzlePanToggle;
    const muzzlePan =
      activeWeapon === 'emp' || activeWeapon === 'rail_cannon' ? 0 : muzzlePanToggle * 0.22;
    for (const muzzle of muzzles) {
      acquirePooledProjectile(
        geo,
        mat,
        muzzle,
        tmpVec.addVectors(muzzle, aimDir),
        tmpVec2.copy(aimDir).multiplyScalar(ballistics.projectileSpeed),
        true,
        activeWeapon,
        false,
        Math.round(spec.fighterDamage * levelMult),
        ballistics.maxLifeSec,
        ballistics.maxRangeMeters,
      );
    }
    callbacks.onWeaponFire?.(activeWeapon, muzzlePan);
    callbacks.onLaserFire?.();
  };

  const triggerCountermeasure = () => {
    if (vitals.hull <= 0 || missionCompleted) return;
    if (flareCooldown > 0.05) {
      callbacks.onEmptyOrdnance?.();
      return;
    }
    if (vitals.countermeasures <= 0 && vitals.weaponHeat < 20) {
      callbacks.onEmptyOrdnance?.();
      showToast('NO COUNTERMEASURE FLARES REMAINING — FLY THROUGH REPAIR BEACON', 1.8);
      return;
    }

    flareCooldown = 1.6;
    let cleared = 0;
    if (vitals.countermeasures > 0) {
      vitals.countermeasures--;
      flareDecoyTimer = 2.2;
      for (let i = projectiles.length - 1; i >= 0; i--) {
        if (!projectiles[i].fromPlayer && projectiles[i].isMissile) {
          explosions.spawnImpactSparks(projectiles[i].pos.clone(), 0xffd27d, 1.2);
          root.remove(projectiles[i].mesh);
          projectiles.splice(i, 1);
          cleared++;
        }
      }
      // Eject 4 lingering incandescent thermal decoy flares drifting aft in a protective arc
      if (lastShipRef) {
        shipForward.set(0, 0, -1).applyQuaternion(lastShipRef.root.quaternion).normalize();
        shipRight.set(1, 0, 0).applyQuaternion(lastShipRef.root.quaternion).normalize();
        shipUp.set(0, 1, 0).applyQuaternion(lastShipRef.root.quaternion).normalize();
        for (let f = 0; f < 4; f++) {
          const side = f % 2 === 0 ? -1 : 1;
          const vert = f < 2 ? 0.55 : -0.45;
          const flarePos = lastShipRef.root.position
            .clone()
            .addScaledVector(shipForward, -4.8)
            .addScaledVector(shipRight, side * (2.6 + (f >= 2 ? 1.1 : 0)))
            .addScaledVector(shipUp, vert);
          const flareVel = shipForward
            .clone()
            .multiplyScalar(Math.max(20, vitals.speed * 0.35) - 36)
            .addScaledVector(shipRight, side * (28 + Math.random() * 14))
            .addScaledVector(shipUp, vert * 18);
          const fm = new THREE.Mesh(flareOrbGeo, flareOrbMat);
          fm.position.copy(flarePos);
          root.add(fm);
          decoyFlares.push({
            mesh: fm,
            pos: flarePos.clone(),
            vel: flareVel,
            life: 2.1,
            maxLife: 2.1,
          });
          explosions.spawnImpactSparks(flarePos, 0xffe49e, 1.35);
        }
      }
    }
    vitals.weaponHeat = Math.max(0, vitals.weaponHeat - 65);
    weaponOverheated = false;
    incomingMissile = false;
    showToast(
      cleared > 0
        ? `FLARES DEPLOYED — ${cleared} MISSILE(S) DECOYED (${vitals.countermeasures} LEFT)`
        : `DECOY FLARES & HEAT VENT DEPLOYED (${vitals.countermeasures} LEFT)`,
      2.0,
    );
    callbacks.onCountermeasure?.();
  };

  const spawnCapitalEscortSquadron = (cap: ActiveCapitalShipEntity) => {
    const plan = cap.escortSquadronPlan;
    for (const slot of plan.slots) {
      const cfg = ENEMY_FIGHTER_ROLES[slot.fighterRole];
      const mesh = buildAlienStarfighterMesh(slot.fighterRole);
      const spawnWorld = new THREE.Vector3(
        cap.pos.x + slot.localOffset.x,
        cap.pos.y + slot.localOffset.y,
        cap.pos.z + slot.localOffset.z,
      );
      mesh.position.copy(spawnWorld);
      sectorDynamicGroup.add(mesh);

      const eid = `escort_${cap.status.id}_slot_${slot.slotIndex}`;
      enemies.push({
        id: eid,
        zoneId: 'capital_escort_wing',
        zoneCenter: cap.pos.clone(),
        name: `${cap.status.name} · ${slot.callsign}`,
        role: slot.fighterRole,
        shipClass: cfg.shipClass,
        isCorvette: false,
        isLegendary: false,
        root: mesh,
        pos: spawnWorld,
        vel: new THREE.Vector3(0, 0, 15),
        health: cfg.baseHp,
        maxHealth: cfg.baseHp,
        shield: cfg.baseShield,
        maxShield: cfg.baseShield,
        empStunTimer: 0,
        lastHitAge: 99,
        destroyedFlashTimer: 0,
        alive: true,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitRadius: 280,
        orbitHeight: 35,
        orbitSpeed: 0.6,
        flankPhase: Math.random() * 6,
        squadSlot: slot.slotIndex,
        evasionTimer: 0,
        aceFlareCooldown: 8.0,
        fireCooldown: 2.2 + slot.slotIndex * 0.4,
        missileCooldown: slot.fighterRole === 'bomber' ? 9.5 : 16.0,
        escapeTimer: 999,
        aiAccumDt: 0,
        maneuverState: 'straight_approach',
        stateTimer: 2.0,
        strafeSign: slot.slotIndex % 2 === 0 ? 1 : -1,
        verticalSign: 1,
        currentBankRad: 0,
        isCapitalEscort: true,
        escortSlotIndex: slot.slotIndex,
        escortRole: slot.escortRole,
      });
      cap.escortEnemyIds.push(eid);
    }
  };

  const spawnHangarReinforcements = (cap: ActiveCapitalShipEntity) => {
    if (enemies.filter((e) => e.alive).length >= 16) return;
    const aliveEscorts = enemies.filter((e) => e.alive && e.isCapitalEscort).length;
    const reinfDecision = shouldLaunchEscortReinforcement({
      aliveEscortCount: aliveEscorts,
      targetEscortCount: cap.escortSquadronPlan.slots.length,
      wavesLaunched: cap.reinforcementWavesLaunched,
      maxWaves: cap.escortSquadronPlan.maxReinforcementWaves,
      cooldownRemainingSec: cap.reinforceCooldown,
      hangarOperational: !cap.status.subsystems.hangar.destroyed,
      capitalDestroyedOrCritical: Boolean(cap.status.destroyed || cap.criticalCountdown?.active),
    });
    if (!reinfDecision.shouldLaunch) return;

    cap.reinforcementWavesLaunched++;
    cap.reinforceCooldown = cap.escortSquadronPlan.reinforcementCooldownSec;

    for (let sIdx = 0; sIdx < reinfDecision.spawnCount; sIdx++) {
      const openSlot =
        cap.escortSquadronPlan.slots.find(
          (slot) => !enemies.some((e) => e.alive && e.isCapitalEscort && e.escortSlotIndex === slot.slotIndex),
        ) ?? cap.escortSquadronPlan.slots[0];
      const role: EnemyFighterRole = openSlot.fighterRole;
      const cfg = ENEMY_FIGHTER_ROLES[role];
      getSubsystemWorldPos(cap, 'hangar', tmpSubPos);
      const mesh = buildAlienStarfighterMesh(role);
      const spawn = tmpSubPos.clone().add(new THREE.Vector3(-45 + sIdx * 30, -15, 30));
      mesh.position.copy(spawn);
      sectorDynamicGroup.add(mesh);

      const eid = `reinf_${Date.now()}_${sIdx}_${Math.random().toString(36).slice(2, 6)}`;
      enemies.push({
        id: eid,
        zoneId: 'capital_hangar',
        zoneCenter: cap.pos.clone(),
        name: `${cap.status.name} · ${openSlot.callsign}`,
        role,
        shipClass: cfg.shipClass,
        isCorvette: false,
        isLegendary: false,
        root: mesh,
        pos: spawn,
        vel: new THREE.Vector3(0, 0, 20),
        health: cfg.baseHp,
        maxHealth: cfg.baseHp,
        shield: cfg.baseShield,
        maxShield: cfg.baseShield,
        empStunTimer: 0,
        lastHitAge: 99,
        destroyedFlashTimer: 0,
        alive: true,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitRadius: 340,
        orbitHeight: 40,
        orbitSpeed: 0.5,
        flankPhase: Math.random() * 6,
        squadSlot: openSlot.slotIndex,
        evasionTimer: 0,
        aceFlareCooldown: role === 'elite_ace' ? 5.0 : 999,
        fireCooldown: 2.0,
        missileCooldown: 12,
        escapeTimer: 999,
        aiAccumDt: 0,
        maneuverState: 'straight_approach',
        stateTimer: 3.4,
        strafeSign: enemies.length % 2 === 0 ? 1 : -1,
        verticalSign: 1,
        currentBankRad: 0,
        isCapitalEscort: true,
        escortSlotIndex: openSlot.slotIndex,
        escortRole: openSlot.escortRole,
      });
      cap.escortEnemyIds.push(eid);
    }
    showToast(
      `${cap.status.name.toUpperCase()} LAUNCHED ESCORT REINFORCEMENTS (WAVE ${cap.reinforcementWavesLaunched}/${cap.escortSquadronPlan.maxReinforcementWaves})!`,
      2.6,
    );
  };

  /**
   * Spawns a dynamic hyperspace reinforcement wing visibly 1,100–1,450 m ahead/flank of the player
   * (NEVER behind or directly on top of the player's ship).
   */
  const spawnWarpReinforcementWave = (ship: ValkyrieSpacecraft, count: number) => {
    if (enemies.filter((e) => e.alive).length >= 18) return;
    shipForward.set(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
    shipRight.set(1, 0, 0).applyQuaternion(ship.root.quaternion).normalize();
    shipUp.set(0, 1, 0).applyQuaternion(ship.root.quaternion).normalize();

    const missionNum = activeMissionOverride?.missionNumber ?? 1;
    const roles: EnemyFighterRole[] =
      missionNum >= 7 ? ['interceptor', 'heavy_fighter', 'elite_ace'] : ['interceptor', 'heavy_fighter', 'bomber'];
    const diffEnemyHpMult = Math.max(0.75, Math.min(1.25, DIFFICULTY_PROFILES[activeDifficulty].enemyHealth));

    for (let k = 0; k < count; k++) {
      const role = roles[k % roles.length];
      const cfg = ENEMY_FIGHTER_ROLES[role];
      const side = (k - (count - 1) * 0.5) * 210;
      const ahead = 1180 + k * 95;
      const elev = (k % 2 === 0 ? 1 : -1) * 75;
      const spawnPos = ship.root.position
        .clone()
        .addScaledVector(shipForward, ahead)
        .addScaledVector(shipRight, side)
        .addScaledVector(shipUp, elev);

      const mesh = buildAlienStarfighterMesh(role);
      mesh.position.copy(spawnPos);
      mesh.lookAt(ship.root.position);
      sectorDynamicGroup.add(mesh);
      explosions.spawnShieldRipple(spawnPos.clone(), 28, 0x76d8ff);
      explosions.spawnImpactSparks(spawnPos.clone(), 0xb8f0ff, 2.2);

      const hp = Math.round(cfg.baseHp * diffEnemyHpMult);
      const sh = Math.round(cfg.baseShield * (0.85 + 0.15 * diffEnemyHpMult));
      enemies.push({
        id: `warp_reinf_${Date.now()}_${k}`,
        zoneId: 'warp_reinforcement',
        zoneCenter: spawnPos.clone(),
        name: `${cfg.displayName} (Warp Wing)`,
        role,
        shipClass: cfg.shipClass,
        isCorvette: false,
        isLegendary: false,
        root: mesh,
        pos: spawnPos,
        vel: shipForward.clone().multiplyScalar(-180),
        health: hp,
        maxHealth: hp,
        shield: sh,
        maxShield: sh,
        empStunTimer: 0,
        lastHitAge: 99,
        destroyedFlashTimer: 0,
        alive: true,
        orbitAngle: k * 1.2,
        orbitRadius: 300,
        orbitHeight: elev,
        orbitSpeed: 0.45,
        flankPhase: k * 1.4,
        squadSlot: k,
        evasionTimer: 0,
        aceFlareCooldown: role === 'elite_ace' ? 4.5 : 999,
        fireCooldown: 1.6 + k * 0.4,
        missileCooldown: 10 + k * 2,
        escapeTimer: 999,
        aiAccumDt: 0,
        maneuverState: k === 0 ? 'straight_approach' : 'lateral_strafe',
        stateTimer: 3.6,
        strafeSign: k % 2 === 0 ? 1 : -1,
        verticalSign: k % 2 === 0 ? 1 : -1,
        currentBankRad: 0,
      });
    }
  };

  const issueWingmanCommand = (cmd: WingmanCommandId) => {
    activeWingmanCommand = cmd;
    const ack = getWingmanCommandAck(cmd, lockedTarget?.name ?? null);
    showToast(ack, 2.6);
    callbacks.onWingmanComms?.(ack, cmd);
  };

  const cameraObstacleBuf: Array<{ x: number; y: number; z: number; radius: number }> = [];
  const getNearbyObstaclesForCamera = (
    pos: THREE.Vector3,
  ): Array<{ x: number; y: number; z: number; radius: number }> => {
    const found = spatialAsteroidGrid.queryRadius(pos.x, pos.y, pos.z, 180, spatialQueryBuf);
    cameraObstacleBuf.length = found.length;
    for (let i = 0; i < found.length; i++) {
      const o = found[i];
      if (!cameraObstacleBuf[i]) {
        cameraObstacleBuf[i] = { x: o.x, y: o.y, z: o.z, radius: o.radius };
      } else {
        cameraObstacleBuf[i].x = o.x;
        cameraObstacleBuf[i].y = o.y;
        cameraObstacleBuf[i].z = o.z;
        cameraObstacleBuf[i].radius = o.radius;
      }
    }
    return cameraObstacleBuf;
  };

  const update = (
    dt: number,
    elapsed: number,
    ship: ValkyrieSpacecraft,
    camera: THREE.PerspectiveCamera,
    playable: boolean,
  ) => {
    lastShipRef = ship;
    currentCameraMode = ship.getViewMode();
    const safeDt = Math.min(dt, 0.05);
    planetMat.uniforms.uTime.value = elapsed;
    planetMesh.rotation.y += safeDt * 0.0022;
    moonMesh.rotation.y += safeDt * 0.0014;
    skyDome.position.copy(camera.position);

    toastTimer = Math.max(0, toastTimer - safeDt);
    if (toastTimer <= 0) statusToast = null;
    collisionBannerTimer = Math.max(0, collisionBannerTimer - safeDt);
    if (collisionBannerTimer <= 0) {
      collisionWarningBanner = null;
      collisionSeverityFlash = null;
    }
    repairBeaconCooldown = Math.max(0, repairBeaconCooldown - safeDt);
    missileCooldown = Math.max(0, missileCooldown - safeDt);

    // Step staged capital ship breakup hulls (removed cleanly right at final core detonation!)
    for (let di = dyingCapitalHulls.length - 1; di >= 0; di--) {
      const dh = dyingCapitalHulls[di];
      dh.age += safeDt;
      dh.root.rotation.z += dh.rollSpeed * safeDt;
      dh.root.rotation.x += dh.pitchSpeed * safeDt;
      dh.root.position.y -= 3.2 * safeDt;
      if (dh.age >= dh.removeAt) {
        sectorDynamicGroup.remove(dh.root);
        dyingCapitalHulls.splice(di, 1);
      }
    }
    flareCooldown = Math.max(0, flareCooldown - safeDt);
    flareDecoyTimer = Math.max(0, flareDecoyTimer - safeDt);
    hitMarkerTimer = Math.max(0, hitMarkerTimer - safeDt);
    activeMissionEventTimer = Math.max(0, activeMissionEventTimer - safeDt);
    if (activeMissionEventTimer <= 0) activeMissionEventBanner = null;
    incomingDamageIndicatorTimer = Math.max(0, incomingDamageIndicatorTimer - safeDt);
    if (incomingDamageIndicatorTimer <= 0) incomingDamageAngleDeg = null;
    criticalAlertCooldown = Math.max(0, criticalAlertCooldown - safeDt);
    nearMissCooldownSec = Math.max(0, nearMissCooldownSec - safeDt);
    if (playable && vitals.hull > 0 && !missionCompleted) {
      sortieElapsedSec += safeDt;
      tickCombatScoreState(combatScoreState, safeDt);

      // Level-Specific Objective Timers & Protected Unit Integrity Pressure
      if (levelTimeLimitSec !== null && sortieElapsedSec >= levelTimeLimitSec) {
        showToast('MISSION TIME EXPIRED — OBJECTIVE FAILED', 3.0);
        reportMissionFailure('time_expired');
      } else if (
        levelSurvivalTargetSec !== null &&
        sortieElapsedSec >= levelSurvivalTargetSec &&
        !activeExtLevel
      ) {
        checkSpaceMissionCompletion(true);
      } else if (
        levelEscapeTimerSec !== null &&
        sortieElapsedSec >= levelEscapeTimerSec &&
        enemies.some((e) => e.alive)
      ) {
        showToast('HOSTILE TARGETS ESCAPED JUMP RANGE — OBJECTIVE FAILED', 3.0);
        reportMissionFailure('target_escaped');
      }

      if (protectedEntityMaxHp > 0 && protectedEntityHp > 0 && !missionCompleted) {
        let bomberPressure = 0;
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!e.alive || e.empStunTimer > 0) continue;
          bomberPressure += e.role === 'bomber' ? 2.1 : e.role === 'medium_warship' ? 1.8 : 0.45;
        }
        if (bomberPressure > 0) {
          const diffScale =
            activeDifficulty === 'story' ? 0.6 : activeDifficulty === 'hard' ? 1.2 : activeDifficulty === 'nightmare' ? 1.35 : 1.0;
          protectedEntityHp = Math.max(0, protectedEntityHp - bomberPressure * diffScale * safeDt);
          if (!escortWarnedHalf && protectedEntityHp < protectedEntityMaxHp * 0.6) {
            escortWarnedHalf = true;
            emitDialogueLine('escort_damaged');
            showToast(`${protectedEntityName?.toUpperCase()} TAKING HEAVY FIRE!`, 2.6);
          }
          if (protectedEntityHp <= 0) {
            showToast(`${protectedEntityName?.toUpperCase()} LOST — ESCORT FAILED`, 3.2);
            reportMissionFailure('escort_destroyed');
          }
        }
      }
      // Critical hull/engine klaxon reminder on sustainable interval
      if (
        (vitals.hull / Math.max(1, vitals.maxHull) < 0.34 || vitals.engineIntegrity < 60) &&
        criticalAlertCooldown <= 0
      ) {
        criticalAlertCooldown = 4.6;
        callbacks.onCriticalDamageAlert?.();
      }
    }

    // Update lingering incandescent thermal decoy flares
    for (let i = decoyFlares.length - 1; i >= 0; i--) {
      const fl = decoyFlares[i];
      fl.life -= safeDt;
      fl.pos.addScaledVector(fl.vel, safeDt);
      fl.vel.multiplyScalar(Math.max(0.85, 1 - safeDt * 0.6));
      fl.mesh.position.copy(fl.pos);
      const scale = Math.max(0.1, (fl.life / fl.maxLife) * 1.15);
      fl.mesh.scale.setScalar(scale);
      if (fl.life <= 0) {
        root.remove(fl.mesh);
        decoyFlares.splice(i, 1);
      }
    }

    repairRingGlow.rotation.z = elapsed * 1.4;
    defPlatform.rotation.y = elapsed * 0.06;
    commsArray.rotation.y = elapsed * 0.08;
    fortressRing.rotation.z = elapsed * 0.05;

    // Velocity dust motes remain invisible at idle/normal speed (ZERO floating white specks!)
    // and fade subtly in ONLY during Boost or Supercruise.
    spaceDustPoints.position.set(
      Math.round(ship.root.position.x / 300) * 300,
      Math.round(ship.root.position.y / 300) * 300,
      Math.round(ship.root.position.z / 300) * 300,
    );
    dustMat.opacity = isSupercruiseNow ? 0.24 : isBoostingNow ? 0.14 : 0.0;
    dustMat.size = isSupercruiseNow ? 2.2 : 1.3;

    // Update Active Capital Ship (5 Subsystems + Hangar Reinforcements + Comms Coordination!)
    let enemyCoordMult = 1.0;
    if (activeCapitalShip && !activeCapitalShip.status.destroyed) {
      const cap = activeCapitalShip;
      CAPITAL_SUBSYSTEM_KEYS.forEach((k) => {
        const sub = cap.status.subsystems[k];
        if (sub.empDisabledTimer > 0) {
          sub.empDisabledTimer = Math.max(0, sub.empDisabledTimer - safeDt);
        }
        cap.subsystemMeshes[k].visible = !sub.destroyed;
      });

      const perf = computeCapitalShipPerformance(cap.status);
      enemyCoordMult = perf.enemyCoordinationMultiplier;

      if (perf.shieldRegenPerSec > 0 && cap.status.shield < cap.status.maxShield) {
        cap.status.shield = Math.min(
          cap.status.maxShield,
          cap.status.shield + perf.shieldRegenPerSec * safeDt,
        );
      }

      cap.root.position.y = cap.pos.y + Math.sin(elapsed * 0.22 * perf.speedMultiplier) * 18;
      cap.bridgeMesh.visible = !cap.status.bridgeDestroyed;

      // Escalating fires, sparks & hull venting on destroyed subsystems / damaged command bridge
      const destroyedSubKeys = CAPITAL_SUBSYSTEM_KEYS.filter((k) => cap.status.subsystems[k].destroyed);
      if (destroyedSubKeys.length > 0 || cap.status.bridgeDestroyed || cap.status.armorPlatesRemaining < 3) {
        cap.damageFireTimer -= safeDt;
        if (cap.damageFireTimer <= 0) {
          cap.damageFireTimer = Math.max(0.45, 1.4 - destroyedSubKeys.length * 0.22);
          if (destroyedSubKeys.length > 0) {
            const pickKey = destroyedSubKeys[Math.floor(elapsed * 2) % destroyedSubKeys.length];
            getSubsystemWorldPos(cap, pickKey, tmpSubPos);
            explosions.spawnImpactSparks(tmpSubPos.clone(), 0xff8a36, 1.5);
          } else if (cap.status.bridgeDestroyed) {
            cap.bridgeMesh.getWorldPosition(tmpSubPos);
            explosions.spawnImpactSparks(tmpSubPos.clone(), 0xff6229, 1.8);
          }
        }
      }

      if (playable && vitals.hull > 0 && !missionCompleted) {
        const distCap = cap.root.position.distanceTo(ship.root.position);
        const phaseFireMult =
          cap.status.shipClass === 'sovereign_flagship' && cap.status.bossPhase
            ? 1 + (cap.status.bossPhase - 1) * 0.28
            : 1.0;
        const bridgeMult = cap.status.bridgeDestroyed ? 0.58 : 1.0;

        cap.turretCooldown -= safeDt * perf.fireRateMultiplier * phaseFireMult * bridgeMult;
        if (cap.turretCooldown <= 0 && distCap < 2600) {
          cap.turretCooldown = 2.3;
          getSubsystemWorldPos(cap, 'weapons', tmpSubPos);
          const dir = tmpVec.subVectors(ship.root.position, tmpSubPos).normalize();
          const diffCapDmgMult = DIFFICULTY_PROFILES[activeDifficulty].incomingDamage;
          acquirePooledProjectile(
            plasmaOrbGeo,
            enemyLaserMat,
            tmpSubPos,
            ship.root.position,
            tmpVec2.copy(dir).multiplyScalar(380),
            false,
            'heavy_plasma',
            false,
            Math.round(
              (cap.status.shipClass === 'sovereign_flagship' ? 18 : 14) * diffCapDmgMult,
            ),
            4.5,
            2200,
          );
          callbacks.onCapitalFire?.(tmpSubPos.clone());
        }

        // Rotate Void Harvester rings & hide destroyed energy cores
        if (cap.harvesterSpinnerGroup) {
          cap.harvesterSpinnerGroup.rotation.z += safeDt * (activeBossSm?.phase === 3 ? 0.18 : 0.62);
          if (cap.harvesterCoreMeshes && activeBossSm) {
            for (const cm of cap.harvesterCoreMeshes) {
              const coreState = activeBossSm.harvesterCores.find((c) => c.id === cm.id);
              cm.group.visible = Boolean(coreState && !coreState.destroyed);
            }
          }
        }
        if (cap.telegraphBeamMesh) {
          cap.telegraphBeamMesh.visible = Boolean(activeBossSm?.telegraphActive);
          if (cap.telegraphBeamMesh.visible) {
            cap.telegraphBeamMesh.lookAt(ship.root.position);
          }
        }

        // Launch Hangar fighter reinforcements periodically while Hangar is intact (Original campaign; Extinction uses Boss SM)
        if (!activeExtLevel && perf.canLaunchReinforcements && distCap < 3200) {
          cap.reinforceCooldown -= safeDt;
          if (cap.reinforceCooldown <= 0) {
            cap.reinforceCooldown = 26;
            spawnHangarReinforcements(cap);
          }
        }
      }
    }

    // Dynamic Battle & Event Director (Extinction Campaign Staged Progression + Boss SM vs Original OP 01–10)
    if (playable && vitals.hull > 0 && !missionCompleted) {
      if (activeExtLevel) {
        const region = SPACE_REGIONS[currentRegionId];
        const hostilesAliveNow = enemies.filter((e) => e.alive).length;

        // 1. Step Extinction Mini-Boss / Major-Boss State Machine
        if (activeBossSm) {
          const prevTelegraph = activeBossSm.telegraphActive;
          const execEnemy =
            activeBossSm.bossId === 'executioner'
              ? enemies.find((e) => e.isExecutionerBoss)
              : null;
          const destroyedSubCount = activeCapitalShip
            ? CAPITAL_SUBSYSTEM_KEYS.filter((k) => activeCapitalShip!.status.subsystems[k].destroyed).length
            : 0;
          const capInRange = activeCapitalShip
            ? activeCapitalShip.root.position.distanceTo(ship.root.position) < 3400
            : execEnemy
              ? execEnemy.pos.distanceTo(ship.root.position) < 2800
              : true;

          const stepRes = stepBossStateMachine(activeBossSm, {
            dt: safeDt,
            externalHull: activeCapitalShip
              ? activeCapitalShip.status.hull
              : execEnemy
                ? (execEnemy.alive ? execEnemy.health : 0)
                : activeBossSm.hp,
            externalMaxHull: activeCapitalShip
              ? activeCapitalShip.status.maxHull
              : execEnemy
                ? execEnemy.maxHealth
                : activeBossSm.maxHp,
            externalShield: activeCapitalShip
              ? activeCapitalShip.status.shield
              : execEnemy
                ? (execEnemy.alive ? execEnemy.shield : 0)
                : activeBossSm.shield,
            destroyedSubsystemsCount: destroyedSubCount,
            hangarDestroyed: Boolean(activeCapitalShip?.status.subsystems.hangar.destroyed),
            armorPlatesRemaining: activeCapitalShip?.status.armorPlatesRemaining ?? 3,
            activeEscortCount: hostilesAliveNow,
            playerInRange: capInRange,
          });
          activeBossSm = stepRes.state;
          bossAiStateLabel = activeBossSm.defeated
            ? 'defeated'
            : activeBossSm.telegraphActive
              ? 'telegraph_windup'
              : activeCapitalShip
                ? 'capital_helm_active'
                : execEnemy
                  ? `dogfight:${execEnemy.maneuverState}`
                  : 'active';
          bossTargetAssigned = bossEntityCreated && !activeBossSm.defeated && playable;

          if (!prevTelegraph && activeBossSm.telegraphActive && activeBossSm.telegraphLabel) {
            showToast(`WARNING: ${activeBossSm.telegraphLabel} CHARGING — EVADE!`, 2.2);
            callbacks.onExtinctionAudioCue?.('telegraph_warning');
          }

          if (stepRes.transition) {
            activeMissionEventBanner = stepRes.transition.headline;
            activeMissionEventTimer = 5.0;
            showToast(stepRes.transition.headline, 3.6);
            callbacks.onStageOrBossBanner?.(stepRes.transition.headline, 'critical');
            callbacks.onExtinctionAudioCue?.(
              stepRes.transition.toPhase === 4 && activeBossSm.bossId === 'sovereign_extinction'
                ? 'sovereign_collapse'
                : 'boss_phase',
            );
            recordEncounterTransition(
              stepRes.transition.toPhase === 4 ? 'BOSS_DEFEATED' : `BOSS_PHASE_${stepRes.transition.toPhase}`,
              activeBossSm.bossId,
              'SATISFIED',
              `Boss transitioned ${stepRes.transition.fromPhase} -> ${stepRes.transition.toPhase}`,
            );
            if (activeBossSm.bossId === 'void_harvester' && stepRes.transition.toPhase === 2) {
              const firstCore = activeBossSm.harvesterCores.find((c) => !c.destroyed)?.id ?? null;
              selectedHarvesterCoreId = firstCore;
              selectedSubsystem = null;
              manualSubsystemLock = Boolean(firstCore);
              showToast('CENTRAL BARRIER LOCKED — TARGET GLOWING ENERGY CORES [TAB]!', 3.6);
            }
          }

          if (
            stepRes.spawnCarrierLaunchCount > 0 &&
            activeCapitalShip &&
            !activeCapitalShip.status.subsystems.hangar.destroyed
          ) {
            getSubsystemWorldPos(activeCapitalShip, 'hangar', tmpSubPos);
            spawnExtinctionWaveMap(
              { hunter_drone: 1, interceptor: 1 },
              tmpSubPos.clone().add(new THREE.Vector3(0, 0, 120)),
              `cw_launch_${activeBossSm.hangarLaunchWavesUsed}`,
              region,
              false,
            );
            showToast('CARRIER WARDEN DEPLOYED FIGHTER SCREEN!', 2.4);
          }

          if (stepRes.telegraphAttackFired) {
            const origin = activeCapitalShip
              ? activeCapitalShip.root.position.clone().add(new THREE.Vector3(0, 20, 120))
              : execEnemy
                ? execEnemy.pos.clone()
                : ship.root.position.clone().add(new THREE.Vector3(0, 0, -400));
            const dir = tmpVec.subVectors(ship.root.position, origin).normalize();
            const dmg = Math.round(28 * DIFFICULTY_PROFILES[activeDifficulty].incomingDamage);
            acquirePooledProjectile(
              plasmaOrbGeo,
              enemyLaserMat,
              origin,
              ship.root.position,
              tmpVec2.copy(dir).multiplyScalar(540),
              false,
              'heavy_plasma',
              false,
              dmg,
              4.2,
              2400,
            );
            callbacks.onCapitalFire?.(origin);
          }

          if (stepRes.meltdownStepTriggered !== null && activeCapitalShip) {
            const off = new THREE.Vector3(
              (Math.random() - 0.5) * 320,
              (Math.random() - 0.5) * 140,
              (Math.random() - 0.5) * 420,
            );
            const blastPos = activeCapitalShip.root.position.clone().add(off);
            explosions.spawnExplosion(blastPos, 3.6 + stepRes.meltdownStepTriggered * 0.2, {
              isSpace: true,
              colorHex: stepRes.meltdownStepTriggered >= 9 ? 0xff4400 : 0xff8c38,
            });
            callbacks.onShipDestructionStage?.({
              pos: blastPos,
              destructionClass: 'capital',
              isSecondary: stepRes.meltdownStepTriggered < 10,
              kind: stepRes.meltdownStepTriggered >= 10 ? 'main_detonation' : 'hull_rupture',
              scale: 2.8,
              distanceMeters: blastPos.distanceTo(ship.root.position),
            });
            showToast(
              `SOVEREIGN COLLAPSE STEP ${stepRes.meltdownStepTriggered}/10`,
              1.1,
            );
          }

          if (stepRes.meltdownFinishedNow) {
            if (activeBossSm.bossId === 'sovereign_extinction' && activeCapitalShip) {
              for (const rem of enemies) {
                if (!rem.alive) continue;
                if (rem.pos.distanceTo(activeCapitalShip.root.position) <= 4200) {
                  rem.alive = false;
                  rem.destroyedFlashTimer = 0.8;
                  sectorDynamicGroup.remove(rem.root);
                  kills++;
                  missionKills++;
                }
              }
            }
            checkSpaceMissionCompletion();
          }
        }

        // 2. Step Orbital Kill Zone Pylons
        for (let pi = 0; pi < orbitalPylons.length; pi++) {
          const pylon = orbitalPylons[pi];
          const pe = pylonEntities.find((x) => x.id === pylon.id);
          if (!pe) continue;
          const distP = pe.pos.distanceTo(ship.root.position);
          const pRes = stepOrbitalKillZonePylon(pylon, safeDt, distP < 2400);
          orbitalPylons[pi] = pRes.pylon;
          pe.group.visible = !pRes.pylon.destroyed;
          pe.telegraphBeam.visible = pRes.telegraphActive && !pRes.pylon.destroyed;
          if (pe.telegraphBeam.visible) {
            pe.telegraphBeam.lookAt(ship.root.position);
          }
          if (pRes.beamFiredThisStep && !pRes.pylon.destroyed) {
            const bDir = tmpVec.subVectors(ship.root.position, pe.pos).normalize();
            acquirePooledProjectile(
              plasmaOrbGeo,
              enemyLaserMat,
              pe.pos.clone().add(new THREE.Vector3(0, 38, 0)),
              ship.root.position,
              tmpVec2.copy(bDir).multiplyScalar(580),
              false,
              'heavy_plasma',
              false,
              Math.round(19 * DIFFICULTY_PROFILES[activeDifficulty].incomingDamage),
              3.8,
              2200,
            );
            callbacks.onCapitalFire?.(pe.pos.clone());
          }
        }

        // 3. Check Emergency Extraction Beacon
        if (extractionActive && !extractionReached && extractionBeaconMesh) {
          extractionBeaconMesh.rotation.z += safeDt * 1.15;
          if (ship.root.position.distanceTo(extractionPos) <= 185) {
            extractionReached = true;
            showToast('EMERGENCY EXTRACTION COMPLETE — CLEAR TO JUMP!', 3.2);
          }
        }

        // 4. Step Controlled Finite Staged Battle Director
        if (battleDirector) {
          const survivalMet =
            levelSurvivalTargetSec !== null ? sortieElapsedSec >= levelSurvivalTargetSec : true;
          const bdRes = stepBattleDirector(battleDirector, {
            dt: safeDt,
            aliveHostiles: hostilesAliveNow,
            bossPhase: activeBossSm?.phase ?? 0,
            bossDefeated: activeBossSm ? activeBossSm.defeated : true,
            survivalElapsedMet: survivalMet,
            extractionReached,
          });
          battleDirector = bdRes.state;
          if (bdRes.advancedToStage) {
            activeMissionEventBanner = bdRes.advancedToStage.headline;
            activeMissionEventTimer = 4.8;
            showToast(bdRes.advancedToStage.headline, 3.2);
            callbacks.onStageOrBossBanner?.(bdRes.advancedToStage.headline, 'warning');
            if (bdRes.advancedToStage.spawnBossOnEnter && activeExtLevel.bossId) {
              shipForward.set(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
              shipRight.set(1, 0, 0).applyQuaternion(ship.root.quaternion).normalize();
              shipUp.set(0, 1, 0).applyQuaternion(ship.root.quaternion).normalize();
              spawnExtinctionBossEncounter(
                ship.root.position,
                shipForward,
                shipUp,
                shipRight,
                `STAGE_${bdRes.advancedToStage.stageNumber}_TRIGGER`,
              );
            }
          }
          if (bdRes.spawnWave) {
            spawnExtinctionWaveMap(
              bdRes.spawnWave as Partial<Record<ExtinctionEnemyRole, number>>,
              ship.root.position,
              `ext_${activeExtLevel.id}_s${battleDirector.currentStageIndex + 1}`,
              region,
              true,
            );
          }
          for (const evt of bdRes.triggeredEvents) {
            triggerExtinctionEvent(evt, ship.root.position);
          }
          if (battleDirector.completed) {
            checkSpaceMissionCompletion();
          }
        }
      } else {
        const hostilesAliveNow = enemies.filter((e) => e.alive).length;
        const reinfStep = stepReinforcementDirector({
          state: reinforcementDirector,
          dt: safeDt,
          hostilesKilled: missionKills,
          hostilesAlive: hostilesAliveNow,
          initialHostiles: initialRegionHostiles,
          commsDestroyed: Boolean(activeCapitalShip?.status.subsystems.comms.destroyed),
          hangarDestroyed: Boolean(activeCapitalShip?.status.subsystems.hangar.destroyed),
        });
        reinforcementDirector = reinfStep.state;
        if (reinfStep.bannerEvent) {
          callbacks.onReinforcementEvent?.(reinfStep.bannerEvent, reinforcementDirector.stage);
          showToast(reinfStep.bannerEvent, 3.2);
        }
        if (reinfStep.shouldSpawnWave && reinfStep.spawnCount > 0) {
          spawnWarpReinforcementWave(ship, reinfStep.spawnCount);
        }
      }

      const capHullPct =
        activeCapitalShip && !activeCapitalShip.status.destroyed
          ? (activeCapitalShip.status.hull / Math.max(1, activeCapitalShip.status.maxHull)) * 100
          : null;
      const moment = evaluateMissionMoment({
        missionNumber: activeMissionOverride?.missionNumber ?? 1,
        elapsedSec: sortieElapsedSec,
        kills: missionKills,
        capitalHullPct: capHullPct,
        triggeredIds: triggeredMissionEventIds,
      });
      if (moment) {
        triggeredMissionEventIds.add(moment.id);
        activeMissionEventBanner = moment.headline;
        activeMissionEventTimer = 5.4;
        showToast(moment.headline, 3.8);
        callbacks.onMissionMoment?.(moment);
        if (moment.effectKind === 'asteroid_fracture') {
          // Physically fracture a nearby monolith into dramatic tumbling silicate shards!
          const fracCenter = ship.root.position
            .clone()
            .addScaledVector(shipForward, 360)
            .addScaledVector(shipRight, 75);
          explosions.spawnExplosion(fracCenter.clone(), 4.2, { isSpace: true, colorHex: 0xf59e0b });
          for (let f = 0; f < 4; f++) {
            const fragMesh = new THREE.Mesh(
              asteroidSmallTemplates[f % asteroidSmallTemplates.length],
              mats.asteroidRock,
            );
            const fPos = fracCenter.clone().add(new THREE.Vector3((f - 1.5) * 34, (f % 2 === 0 ? 18 : -16), f * 22));
            fragMesh.position.copy(fPos);
            fragMesh.scale.setScalar(11 + f * 2.5);
            asteroidGroup.add(fragMesh);
            asteroids.push({
              id: `fracture_${Date.now()}_${f}`,
              tier: 'small',
              mesh: fragMesh,
              pos: fPos,
              vel: new THREE.Vector3((f - 1.5) * 16, (f % 2 === 0 ? 8 : -8), 14),
              rotVel: new THREE.Vector3(0.42, -0.35, 0.5),
              radius: 10 + f * 2,
              mass: 1.4,
              hp: 35,
              cooldown: 0,
            });
          }
        } else if (moment.effectKind === 'flagship_overload' && activeCapitalShip) {
          explosions.spawnExplosion(activeCapitalShip.root.position.clone().add(new THREE.Vector3(0, 80, 120)), 5.0, {
            isSpace: true,
            colorHex: 0xff5a22,
          });
        }
      }
    }

    // Update Asteroids & Collisions (distance-culled collision tests for mobile performance)
    shipForward.set(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
    shipRight.set(1, 0, 0).applyQuaternion(ship.root.quaternion).normalize();
    const shipVel = shipForward.clone().multiplyScalar(vitals.speed);

    let bestClearance = 9999;
    let bestClosing = 0;
    let bestBearing = 0;
    const regionCfg = SPACE_REGIONS[currentRegionId];
    const maxRockRange = regionCfg.fieldRadius * 0.92;

    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i];
      a.cooldown = Math.max(0, a.cooldown - safeDt);
      a.pos.addScaledVector(a.vel, safeDt);
      a.mesh.position.copy(a.pos);
      a.mesh.rotation.x += a.rotVel.x * safeDt;
      a.mesh.rotation.y += a.rotVel.y * safeDt;
      a.mesh.rotation.z += a.rotVel.z * safeDt;

      if (a.pos.distanceTo(activeCenter) > maxRockRange) {
        a.vel.negate();
        a.pos.addScaledVector(a.vel, safeDt * 2);
      }

      if (playable && vitals.hull > 0 && !missionCompleted) {
        tmpVec.subVectors(a.pos, ship.root.position);
        const centerDistSq = tmpVec.lengthSq();
        if (centerDistSq > 160000) continue; // >400m quick skip
        const centerDist = Math.sqrt(centerDistSq);
        const shipRadius = 9.2;
        const clearance = centerDist - (a.radius + shipRadius);

        if (clearance < bestClearance) {
          bestClearance = clearance;
          const dirToRock = tmpVec.clone().divideScalar(Math.max(0.1, centerDist));
          const relVel = shipVel.clone().sub(a.vel);
          bestClosing = relVel.dot(dirToRock);
          bestBearing = Math.atan2(dirToRock.dot(shipRight), dirToRock.dot(shipForward));
        }

        if (clearance <= 0 && a.cooldown <= 0) {
          a.cooldown = 0.85;
          const impactNormal = ship.root.position.clone().sub(a.pos).normalize();
          ship.root.position.copy(a.pos).addScaledVector(impactNormal, a.radius + shipRadius + 1.6);

          const relVel = shipVel.clone().sub(a.vel);
          const relSpeed = Math.max(24, relVel.length());
          const impactCos = Math.abs(relVel.clone().normalize().dot(impactNormal));
          const fwdDot = impactNormal.dot(shipForward);
          const rightDot = Math.abs(impactNormal.dot(shipRight));
          const hitZone: ShipImpactZone =
            fwdDot > 0.45 ? 'engine' : rightDot > 0.58 ? 'wing' : 'hull';

          handleAsteroidImpact(ship, impactNormal, a.mass, a.radius, relSpeed, impactCos, hitZone);
        }
      }
    }

    asteroidAlert = evaluateAsteroidProximity({
      clearanceDist: bestClearance,
      closingSpeed: bestClosing,
      bearingRad: bestBearing,
    });

    // Allied Orbital Repair Beacon fly-through recovery (also refills Countermeasures!)
    nearRepairBeacon =
      playable && vitals.hull > 0 && ship.root.position.distanceTo(repairBeaconPos) < 64;
    if (
      nearRepairBeacon &&
      repairBeaconCooldown <= 0 &&
      (vitals.hull < vitals.maxHull - 1 ||
        vitals.engineIntegrity < 99 ||
        vitals.countermeasures < vitals.maxCountermeasures ||
        vitals.missiles < vitals.maxMissiles)
    ) {
      repairBeaconCooldown = 4.0;
      const rep = applyShipRepair(vitals, 65, 65);
      vitals.hull = rep.hull;
      vitals.shield = rep.shield;
      vitals.engineIntegrity = rep.engineIntegrity;
      vitals.controlIntegrity = rep.controlIntegrity;
      vitals.weaponIntegrity = rep.weaponIntegrity;
      vitals.countermeasures = vitals.maxCountermeasures;
      vitals.missiles = Math.min(vitals.maxMissiles, vitals.missiles + 6);
      vitals.repairKits = Math.min(3 + decisionEffects.extraRepairKits, vitals.repairKits + 1);
      ship.setDamageVisuals(vitals.hull / vitals.maxHull, vitals.engineIntegrity / 100);
      showToast('ORBITAL REPAIR BEACON — HULL, ORDNANCE & FLARES RESTORED', 2.8);
      callbacks.onShipRepaired?.('beacon');
    }

    // Rebuild spatial asteroid grid periodically (every ~0.4s) as rocks slowly drift
    if (Math.floor(elapsed * 2.5) !== Math.floor((elapsed - safeDt) * 2.5)) {
      spatialAsteroidGrid.rebuild(
        asteroids.map((a) => ({ id: a.id, x: a.pos.x, y: a.pos.y, z: a.pos.z, radius: a.radius })),
      );
    }

    // Progressive Tactical AI Profile & Fair Attack Token Allocation
    const tacticalProfile = computeMissionTacticalProfile(
      activeMissionOverride?.missionNumber ?? 1,
      activeDifficulty,
    );
    const activeAttackers =
      playable && vitals.hull > 0 && !missionCompleted
        ? selectActiveAttackerIds(
          enemies
            .filter((e) => e.alive)
            .map((e) => ({
              id: e.id,
              distToPlayer: e.pos.distanceTo(ship.root.position),
              role: e.role,
              empStunned: e.empStunTimer > 0,
            })),
          tacticalProfile.maxSimultaneousAttackers,
        )
        : new Set<string>();

    // Update Named Tactical AI Wingmen (VANGUARD-2/3/4 obeying ATTACK / DEFEND / COVER / REGROUP!)
    shipUp.set(0, 1, 0).applyQuaternion(ship.root.quaternion).normalize();
    const wingmanTargetCandidates = enemies
      .filter((e) => e.alive)
      .map((e) => ({
        id: e.id,
        pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z },
        distToPlayer: e.pos.distanceTo(ship.root.position),
        isPlayerLocked: lockedTarget?.id === e.id,
        isAttackingPlayer: activeAttackers.has(e.id),
      }));

    for (let i = 0; i < wingmen.length; i++) {
      const w = wingmen[i];
      if (!w.active || w.status === 'disabled') {
        w.root.visible = false;
        continue;
      }
      w.root.visible = true;
      // Passive shield recharge for wingmen (scaled by Pilot Rank wingman perk)
      if (w.shield < w.maxShield) {
        w.shield = Math.min(w.maxShield, w.shield + safeDt * 6.5 * wingmanEffectivenessMult);
      }

      const targetId = playable
        ? selectWingmanObjectiveTarget(activeWingmanCommand, wingmanTargetCandidates)
        : null;
      const targetEnemy = targetId ? enemies.find((e) => e.id === targetId && e.alive) ?? null : null;

      // Formation slot always flanks/trails behind player so wingmen NEVER obstruct player's forward view!
      const [offR, offU, offBack] = w.formationOffset;
      const desiredPos = tmpVec.copy(playable ? ship.root.position : activeCenter);
      if (targetEnemy && (activeWingmanCommand === 'attack' || activeWingmanCommand === 'cover')) {
        w.status = w.hull < w.maxHull * 0.45 ? 'damaged' : 'engaging';
        const flankAng = elapsed * 0.85 + i * 2.1;
        desiredPos.set(
          targetEnemy.pos.x + Math.cos(flankAng) * 145,
          targetEnemy.pos.y + Math.sin(flankAng * 0.8) * 55 + 24,
          targetEnemy.pos.z + Math.sin(flankAng) * 145,
        );
      } else {
        w.status = w.hull < w.maxHull * 0.45 ? 'damaged' : 'active';
        const tightScale = activeWingmanCommand === 'defend' ? 0.78 : activeWingmanCommand === 'regroup' ? 0.68 : 1.0;
        desiredPos
          .addScaledVector(shipRight, offR * tightScale)
          .addScaledVector(shipUp, offU * tightScale + Math.sin(elapsed * 1.1 + i) * 5)
          .addScaledVector(shipForward, -offBack * tightScale);
      }

      const toGoal = desiredPos.clone().sub(w.pos);
      const distGoal = toGoal.length();
      const desiredSpd = Math.min(280, Math.max(85, distGoal * 1.85 + vitals.speed * 0.7));
      if (distGoal > 2) {
        toGoal.normalize().multiplyScalar(desiredSpd);
        w.vel.lerp(toGoal, Math.min(1, safeDt * 3.4));
      }
      w.pos.addScaledVector(w.vel, safeDt);
      w.root.position.copy(w.pos);
      if (w.vel.lengthSq() > 4) {
        w.root.lookAt(w.pos.clone().add(w.vel));
      }

      // Wingmen fire real allied pulse cannons that genuinely damage & destroy hostiles!
      w.fireCooldown -= safeDt;
      if (w.fireCooldown <= 0 && playable && root.visible && activeWingmanCommand !== 'regroup') {
        const fireTarget =
          targetEnemy ??
          enemies.find((e) => e.alive && e.pos.distanceToSquared(w.pos) < 1600 * 1600);
        if (fireTarget && fireTarget.pos.distanceTo(w.pos) < 1550) {
          const baseCooldown = activeWingmanCommand === 'attack' ? 1.15 : 1.65;
          w.fireCooldown = baseCooldown / wingmanEffectivenessMult;
          const dir = tmpVec.subVectors(fireTarget.pos, w.pos).normalize();
          acquirePooledProjectile(
            playerLaserGeo,
            playerLaserMat,
            w.pos,
            fireTarget.pos,
            tmpVec2.copy(dir).multiplyScalar(640),
            false,
            'pulse',
            false,
            Math.round(14 * wingmanEffectivenessMult),
            2.1,
            1200,
            { fromAlly: true, shooterWingmanId: w.id },
          );
        }
      }
    }

    const diffProfile = DIFFICULTY_PROFILES[activeDifficulty];
    const playerFlightCtx = {
      pos: { x: ship.root.position.x, y: ship.root.position.y, z: ship.root.position.z },
      vel: { x: shipVel.x, y: shipVel.y, z: shipVel.z },
      forward: { x: shipForward.x, y: shipForward.y, z: shipForward.z },
      right: { x: shipRight.x, y: shipRight.y, z: shipRight.z },
      up: { x: shipUp.x, y: shipUp.y, z: shipUp.z },
      speed: vitals.speed,
    };

    // Update 9-Role Enemy Starfighters, Extinction Archetypes & Medium Warships
    scoutEscapeWarning = null;
    const activeEwDistances: number[] = [];
    const activeDisruptorPositions: THREE.Vector3[] = [];
    const aliveHunterDrones: EnemyStarfighter[] = [];
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (!en.alive) continue;
      if (en.role === 'disruptor_ship' && en.empStunTimer <= 0) {
        activeDisruptorPositions.push(en.pos);
        if (en.disruptorField?.active) {
          activeEwDistances.push(en.pos.distanceTo(ship.root.position));
        }
      } else if (en.role === 'hunter_drone') {
        aliveHunterDrones.push(en);
      }
    }
    ewInterferenceState = evaluateAggregateDisruptorEw(activeEwDistances);
    const aliveEnemiesCountNow = enemies.filter((en) => en.alive).length;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;

      const distToPlayer = e.pos.distanceTo(ship.root.position);
      // Throttle distant AI updates for mobile & 80km theater performance
      const stepBudget =
        distToPlayer > 3800
          ? 0.25 * aiUpdateIntervalMultiplier
          : distToPlayer > 1800
            ? 0.08 * aiUpdateIntervalMultiplier
            : 0;
      e.aiAccumDt += safeDt;
      if (stepBudget > 0 && e.aiAccumDt < stepBudget) continue;
      const aiDt = Math.min(0.3, e.aiAccumDt);
      e.aiAccumDt = 0;

      const roleCfg = getAnyEnemyRoleConfig(e.role);
      e.empStunTimer = Math.max(0, e.empStunTimer - aiDt);
      e.evasionTimer = Math.max(0, e.evasionTimer - aiDt);
      e.aceFlareCooldown = Math.max(0, e.aceFlareCooldown - aiDt);
      const speedFactor = (e.empStunTimer > 0 ? 0.24 : 1.0) * (0.76 + 0.24 * enemyCoordMult);

      // Disruptor EW Pulse & Shield Stabilization Support
      if (e.role === 'disruptor_ship') {
        if (e.disruptorRingMesh) {
          e.disruptorRingMesh.rotation.z += aiDt * (e.empStunTimer > 0 ? 0.25 : 2.3);
        }
        if (e.disruptorField) {
          const ewRes = stepDisruptorField(e.disruptorField, {
            dt: aiDt,
            alive: e.alive,
            empStunned: e.empStunTimer > 0,
            distanceToPlayerMeters: distToPlayer,
          });
          e.disruptorField = ewRes.state;
          if (ewRes.pulseTriggered) {
            callbacks.onExtinctionAudioCue?.('disruptor_pulse');
            showToast('EW DISRUPTOR PULSE ACTIVE — MISSILE LOCK DEGRADED!', 2.0);
          }
        }
      } else if (activeDisruptorPositions.length > 0 && e.shield < e.maxShield && e.empStunTimer <= 0) {
        for (let di = 0; di < activeDisruptorPositions.length; di++) {
          if (e.pos.distanceTo(activeDisruptorPositions[di]) <= DISRUPTOR_SHIELD_SUPPORT_RANGE_METERS) {
            e.shield = Math.min(e.maxShield, e.shield + 4.5 * aiDt);
            break;
          }
        }
      }

      if (e.role === 'scout' && playable && distToPlayer < 2600) {
        e.escapeTimer -= aiDt;
        if (e.escapeTimer < 16 && e.escapeTimer > 0) {
          scoutEscapeWarning = `ALIEN RECON SCOUT SIGNALING (${Math.ceil(e.escapeTimer)}s) — INTERCEPT!`;
        }
        if (e.escapeTimer <= 0) {
          e.escapeTimer = 46;
          showToast('SCOUT SIGNAL SENT — PATROL ALERTED', 2.4);
        }
      }

      // Advanced 7-Maneuver 3D Dogfighting AI with physically bounded turn radius, finite boost,
      // evasion cooldowns, and post-maneuver recovery windows across all difficulties!
      const dogfight = stepEnemyDogfightManoeuvre(
        {
          id: e.id,
          role: e.role,
          isLegendary: e.isLegendary,
          squadSlot: e.squadSlot,
          pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z },
          vel: { x: e.vel.x, y: e.vel.y, z: e.vel.z },
          maneuverState: e.maneuverState,
          stateTimer: e.stateTimer,
          strafeSign: e.strafeSign,
          verticalSign: e.verticalSign,
          flankPhase: e.flankPhase,
          evasionTimer: e.evasionTimer,
          recentlyHit: e.lastHitAge < 1.8,
          empStunned: e.empStunTimer > 0,
          boostRemainingSec: e.boostRemainingSec,
          boostCooldownSec: e.boostCooldownSec,
          recoveryTimer: e.recoveryTimer,
          evasionCooldownSec: e.evasionCooldownSec,
          difficulty: activeDifficulty,
        },
        playerFlightCtx,
        aiDt,
        elapsed,
        tacticalProfile.fireCadenceMultiplier * (e.isLegendary ? 1.12 : 1.0),
      );

      e.maneuverState = dogfight.nextState;
      e.stateTimer = dogfight.nextTimer;
      e.strafeSign = dogfight.nextStrafeSign;
      e.verticalSign = dogfight.nextVerticalSign;
      e.boostRemainingSec = dogfight.nextBoostRemainingSec;
      e.boostCooldownSec = dogfight.nextBoostCooldownSec;
      e.recoveryTimer = dogfight.nextRecoveryTimer;
      e.evasionCooldownSec = dogfight.nextEvasionCooldownSec;

      tmpVec.set(dogfight.desiredVel.x, dogfight.desiredVel.y, dogfight.desiredVel.z);

      // Hunter Drone coordinated swarm surround & separation vector
      if (e.role === 'hunter_drone' && aliveHunterDrones.length > 1) {
        const dIdx = aliveHunterDrones.indexOf(e);
        const nbPos: Array<{ x: number; y: number; z: number }> = [];
        for (let ni = 0; ni < aliveHunterDrones.length; ni++) {
          if (ni !== dIdx) {
            const p = aliveHunterDrones[ni].pos;
            nbPos.push({ x: p.x, y: p.y, z: p.z });
          }
        }
        const swarmDir = computeHunterDroneSwarmVector({
          dronePos: e.pos,
          swarmIndex: Math.max(0, dIdx),
          swarmCount: aliveHunterDrones.length,
          playerPos: ship.root.position,
          neighborPositions: nbPos,
          elapsedSec: elapsed,
        });
        const spd = Math.max(120, tmpVec.length());
        tmpVec.x = tmpVec.x * 0.45 + swarmDir.x * spd * 0.55;
        tmpVec.y = tmpVec.y * 0.45 + swarmDir.y * spd * 0.55;
        tmpVec.z = tmpVec.z * 0.45 + swarmDir.z * spd * 0.55;
      } else if (activeExtLevel && !e.isCapitalEscort && e.role !== 'disruptor_ship') {
        const form = computeFleetFormationOrder({
          role: e.role,
          squadSlot: e.squadSlot,
          aliveAlliesCount: aliveEnemiesCountNow,
          lowHullRatio: e.health / Math.max(1, e.maxHealth),
          playerForward: shipForward,
          playerRight: shipRight,
          playerPos: ship.root.position,
        });
        tmpVec2.set(
          form.flankAnchor.x - e.pos.x,
          form.flankAnchor.y - e.pos.y,
          form.flankAnchor.z - e.pos.z,
        );
        if (tmpVec2.length() > 380) {
          tmpVec2.normalize().multiplyScalar(roleCfg.speed);
          tmpVec.lerp(tmpVec2, 0.22);
        }
      }

      const nearbyRocks = spatialAsteroidGrid.queryRadius(e.pos.x, e.pos.y, e.pos.z, 220, spatialQueryBuf);
      if (e.isCapitalEscort && activeCapitalShip && e.escortSlotIndex !== undefined) {
        const escortPlan = activeCapitalShip.escortSquadronPlan;
        const slot = escortPlan.slots[e.escortSlotIndex] ?? escortPlan.slots[0];
        const escortTactics = computeEscortTacticalState({
          escortRole: slot.escortRole,
          slotIndex: e.escortSlotIndex,
          localOffset: slot.localOffset,
          escortPos: { x: e.pos.x, y: e.pos.y, z: e.pos.z },
          capitalPos: { x: activeCapitalShip.pos.x, y: activeCapitalShip.pos.y, z: activeCapitalShip.pos.z },
          capitalForward: {
            x: Math.sin(activeCapitalShip.helm.yawRad) * Math.cos(activeCapitalShip.helm.pitchRad),
            y: -Math.sin(activeCapitalShip.helm.pitchRad),
            z: Math.cos(activeCapitalShip.helm.yawRad) * Math.cos(activeCapitalShip.helm.pitchRad),
          },
          capitalRight: {
            x: Math.cos(activeCapitalShip.helm.yawRad),
            y: 0,
            z: -Math.sin(activeCapitalShip.helm.yawRad),
          },
          capitalHullRatio: activeCapitalShip.status.hull / Math.max(1, activeCapitalShip.status.maxHull),
          capitalDestroyedOrCritical: Boolean(
            activeCapitalShip.status.destroyed ||
            (activeCapitalShip.criticalCountdown && activeCapitalShip.criticalCountdown.active),
          ),
          capitalUnderSubsystemAttack: Boolean(selectedSubsystem && !activeCapitalShip.status.destroyed),
          playerPos: { x: ship.root.position.x, y: ship.root.position.y, z: ship.root.position.z },
          elapsedSec: elapsed,
        });

        if (escortTactics.shouldScatter) {
          const toScatter = tmpVec
            .set(
              escortTactics.anchorPoint.x - e.pos.x,
              escortTactics.anchorPoint.y - e.pos.y,
              escortTactics.anchorPoint.z - e.pos.z,
            )
            .normalize()
            .multiplyScalar(roleCfg.speed * 1.3);
          e.vel.lerp(toScatter, Math.min(1, aiDt * 4.5));
        } else if (escortTactics.behavior === 'hold_formation') {
          const toAnchor = tmpVec.set(
            escortTactics.anchorPoint.x - e.pos.x,
            escortTactics.anchorPoint.y - e.pos.y,
            escortTactics.anchorPoint.z - e.pos.z,
          );
          const dist = toAnchor.length();
          const cruise = Math.min(roleCfg.speed * 1.1, Math.max(24, dist * 1.5));
          e.vel.lerp(toAnchor.normalize().multiplyScalar(cruise), Math.min(1, aiDt * 3.6));
        } else if (escortTactics.behavior === 'defend_subsystem') {
          const toDefend = tmpVec
            .set(
              escortTactics.anchorPoint.x - e.pos.x,
              escortTactics.anchorPoint.y - e.pos.y,
              escortTactics.anchorPoint.z - e.pos.z,
            )
            .normalize()
            .multiplyScalar(roleCfg.speed * 1.15);
          e.vel.lerp(toDefend, Math.min(1, aiDt * 4.2));
        } else {
          e.vel.lerp(tmpVec.copy(dogfight.desiredVel).multiplyScalar(speedFactor), Math.min(1, aiDt * 4.8));
        }
      } else {
        // O(1) Spatial-Grid 3D Asteroid Avoidance so enemy fighters weave convincingly around asteroids!
        if (nearbyRocks.length > 0) {
          const avoid = computeAsteroidAvoidanceVector(e.pos, nearbyRocks, 52);
          tmpVec.x += avoid.x * 210;
          tmpVec.y += avoid.y * 210;
          tmpVec.z += avoid.z * 210;
          const turnBlend = Math.min(1, aiDt * (e.role === 'medium_warship' || e.role === 'disruptor_ship' ? 2.2 : 5.2));
          e.vel.lerp(tmpVec.multiplyScalar(speedFactor), turnBlend);
        } else {
          // dogfight.desiredVel is already physically steered with bounded accel & turn radius
          e.vel.copy(tmpVec.multiplyScalar(speedFactor));
        }
      }
      e.pos.addScaledVector(e.vel, aiDt);
      e.root.position.copy(e.pos);
      e.currentBankRad = THREE.MathUtils.lerp(e.currentBankRad, dogfight.bankAngle, Math.min(1, aiDt * 4.5));
      if (e.vel.lengthSq() > 1) {
        // Enemy mesh nose faces -Z; rotateY(Math.PI) aligns -Z cleanly along travel velocity!
        e.root.lookAt(e.pos.clone().sub(e.vel));
        e.root.rotateZ(e.currentBankRad);
      }

      // Active Attack-Token Gated Firing with Predictive Lead Aiming & Asteroid Line-of-Sight Check
      const holdsAttackToken = activeAttackers.has(e.id) || e.isLegendary;
      let firedPrimaryThisTick = false;
      if (playable && vitals.hull > 0 && !missionCompleted && e.empStunTimer <= 0 && distToPlayer < 1650) {
        const cadenceRate =
          (holdsAttackToken ? tacticalProfile.fireCadenceMultiplier : 0.36) * enemyCoordMult;
        e.fireCooldown -= aiDt * cadenceRate;
        if (e.fireCooldown <= 0 && holdsAttackToken && dogfight.firingWindowOpen) {
          let blockedByRock = false;
          for (let obsIdx = 0; obsIdx < nearbyRocks.length; obsIdx++) {
            const obs = nearbyRocks[obsIdx];
            if (obs.radius >= 24 && segmentIntersectsSphere(e.pos, ship.root.position, obs, obs.radius * 0.92)) {
              blockedByRock = true;
              break;
            }
          }
          if (blockedByRock) {
            e.fireCooldown = 0.45;
          } else {
            firedPrimaryThisTick = true;
            e.fireCooldown = roleCfg.fireCooldown / tacticalProfile.fireCadenceMultiplier + Math.random() * 0.95;
            const projSpeed = e.role === 'medium_warship' || e.role === 'disruptor_ship' ? 440 : 415;
            const leadTarget = computePredictiveAimPoint({
              shooterPos: e.pos,
              targetPos: ship.root.position,
              targetVel: shipVel,
              projectileSpeed: projSpeed,
              leadFactor: tacticalProfile.leadAimFactor * enemyCoordMult,
            });
            const scatter = enemyCoordMult < 0.8 ? tacticalProfile.scatterMeters * 1.65 : tacticalProfile.scatterMeters;
            const dir = tmpVec
              .set(
                leadTarget.x - e.pos.x + (Math.random() - 0.5) * scatter,
                leadTarget.y - e.pos.y + (Math.random() - 0.5) * scatter,
                leadTarget.z - e.pos.z + (Math.random() - 0.5) * scatter,
              )
              .normalize();

            const scaledEnemyDmg = Math.max(3, Math.round(roleCfg.damage * diffProfile.incomingDamage));
            const isTwin = e.role === 'medium_warship' || e.role === 'disruptor_ship';
            const shots = isTwin ? [-6.8, 6.8] : e.isLegendary ? [-2.4, 2.4] : [0];
            for (const lateral of shots) {
              const origin = e.pos.clone();
              if (lateral !== 0) {
                origin.x += lateral;
              }
              acquirePooledProjectile(
                isTwin ? plasmaOrbGeo : playerLaserGeo,
                enemyLaserMat,
                origin,
                tmpVec2.addVectors(origin, dir),
                dir.clone().multiplyScalar(projSpeed),
                false,
                isTwin ? 'heavy_plasma' : 'pulse',
                false,
                scaledEnemyDmg,
                3.2,
                isTwin ? 1650 : 1250,
              );
            }
            if (isTwin) callbacks.onCapitalFire?.(e.pos.clone());
          }
        }

        e.missileCooldown -= aiDt * enemyCoordMult * (holdsAttackToken ? 1.0 : 0.4);
        if (
          e.missileCooldown <= 0 &&
          holdsAttackToken &&
          (e.role === 'bomber' ||
            e.role === 'elite_ace' ||
            e.role === 'heavy_fighter' ||
            e.role === 'medium_warship' ||
            e.isExecutionerBoss) &&
          distToPlayer < 1350 &&
          distToPlayer > 170
        ) {
          e.missileCooldown = (12.5 + Math.random() * 6.0) * tacticalProfile.missileCooldownMultiplier;
          const dir = tmpVec.subVectors(ship.root.position, e.pos).normalize();
          acquirePooledProjectile(
            missileGeo,
            missileMat,
            e.pos,
            ship.root.position,
            tmpVec2.copy(dir).multiplyScalar(240),
            false,
            'missile',
            true,
            Math.round(24 * diffProfile.incomingDamage),
            4.9,
            1450,
            { guidanceRemainingSec: 4.2 },
          );
          callbacks.onIncomingMissile?.();
        }
      }

      // Phantom Interceptor timed stealth cloak (readable thermal/sensor shimmer, decloaks on fire/hit/close range)
      if (e.phantomCloak) {
        const cloakRes = stepPhantomCloak(e.phantomCloak, {
          dt: aiDt,
          distanceToPlayerMeters: distToPlayer,
          justFired: firedPrimaryThisTick,
          tookDamage: e.lastHitAge < 0.25,
          empStunned: e.empStunTimer > 0,
        });
        e.phantomCloak = cloakRes.state;
        if (e.cloakMaterials) {
          for (let mi = 0; mi < e.cloakMaterials.length; mi++) {
            e.cloakMaterials[mi].opacity = cloakRes.state.visualOpacity;
          }
        }
        if (cloakRes.recloakedNow && distToPlayer < 1500) {
          callbacks.onExtinctionAudioCue?.('phantom_cloak');
        }
      }
    }

    // Playable 6-DOF Spacecraft Flight Control (Desktop Mouse/Keyboard + Mobile Touch Unified + Upgrade Trade-Off Modules!)
    if (playable && vitals.hull > 0) {
      const shipSpec = getShipSpec();
      const mods = computeEquippedUpgradeModifiers(spaceLoadout.equippedModules);
      timeSinceDamaged += safeDt;
      const regenDelaySec = Math.max(2.4, Math.min(5.2, diffProfile.playerShieldDelaySec * 0.9));
      const regenRateScale = (diffProfile.playerShieldRegenRate / 22) * mods.shieldRegenMult;
      if (timeSinceDamaged > regenDelaySec && vitals.shield < vitals.maxShield) {
        vitals.shield = Math.min(
          vitals.maxShield,
          vitals.shield + safeDt * (18 + spaceLoadout.shieldLevel * 4) * regenRateScale,
        );
      }

      const coolFactor = 0.55 + 0.45 * (vitals.weaponIntegrity / 100);
      vitals.weaponHeat = Math.max(0, vitals.weaponHeat - safeDt * 26 * coolFactor);
      if (vitals.weaponHeat < 25) weaponOverheated = false;

      const engineUpgradeMult = (1 + (spaceLoadout.engineLevel - 1) * 0.14) * mods.speedMult;
      const speedStep = stepSpacecraftSpeed({
        currentSpeed: vitals.speed,
        boostEnergy: vitals.boostEnergy,
        engineIntegrity: vitals.engineIntegrity,
        input,
        flightAssist: flightSettings.flightAssist,
        dt: safeDt,
        engineUpgradeMultiplier: engineUpgradeMult,
        shipSpec,
      });
      vitals.speed = speedStep.speed;
      // Apply boostRechargeMult delta from trade-off modules cleanly when recharging
      const boostDelta = speedStep.boostEnergy - vitals.boostEnergy;
      vitals.boostEnergy = THREE.MathUtils.clamp(
        vitals.boostEnergy + (boostDelta > 0 ? boostDelta * mods.boostRechargeMult : boostDelta),
        0,
        100,
      );
      isBoostingNow = speedStep.isBoosting;
      latestBoostState = speedStep.boostState;
      isSupercruiseNow = speedStep.isSupercruise;

      // Cancel autopilot if pilot manually steers strongly or brakes
      if (
        autopilotActive &&
        (input.brake || Math.abs(input.joyPitch) > 0.35 || Math.abs(input.joyYaw) > 0.35)
      ) {
        autopilotActive = false;
        showToast('AUTOPILOT DISENGAGED — MANUAL CONTROL', 1.4);
      }

      // Autopilot steering toward nearest uncleared encounter zone or capital ship
      if (autopilotActive) {
        let navTarget: THREE.Vector3 | null = null;
        if (activeCapitalShip && !activeCapitalShip.status.destroyed) {
          navTarget = activeCapitalShip.root.position;
        } else {
          const aliveEnemy = enemies.find((e) => e.alive);
          if (aliveEnemy) navTarget = aliveEnemy.pos;
        }
        if (navTarget) {
          const distToNav = navTarget.distanceTo(ship.root.position);
          if (distToNav < 780) {
            autopilotActive = false;
            input.supercruise = false;
            showToast('ARRIVED AT COMBAT ZONE — ENGAGE HOSTILES!', 2.2);
          } else {
            const desiredQuat = new THREE.Quaternion();
            const m = new THREE.Matrix4().lookAt(
              ship.root.position,
              navTarget,
              new THREE.Vector3(0, 1, 0),
            );
            desiredQuat.setFromRotationMatrix(m);
            ship.root.quaternion.slerp(desiredQuat, Math.min(1, safeDt * 2.8));
          }
        } else {
          autopilotActive = false;
          input.supercruise = false;
        }
      }

      const controlFactor =
        (0.48 + 0.52 * (vitals.controlIntegrity / 100)) * shipSpec.turnRateMultiplier * mods.agilityMult;
      const lookSens = flightSettings.cameraSensitivity * controlFactor;
      const joySens = flightSettings.flightSensitivity * controlFactor;
      const pitchSign = flightSettings.invertFlightY ? 1 : -1;

      // Combine discrete mouse/touch-look deltas + continuous virtual joystick pitch/yaw
      const pitchRate =
        THREE.MathUtils.clamp(input.pitchDelta * 0.0026 * lookSens * pitchSign, -0.14, 0.14) +
        input.joyPitch * 1.85 * joySens * pitchSign * safeDt +
        instability.pitchShock * safeDt;
      const yawRate =
        THREE.MathUtils.clamp(-input.yawDelta * 0.0026 * lookSens, -0.14, 0.14) -
        input.joyYaw * 2.05 * joySens * safeDt +
        instability.yawShock * safeDt;

      input.pitchDelta *= flightSettings.flightAssist ? 0.35 : 0.72;
      input.yawDelta *= flightSettings.flightAssist ? 0.35 : 0.72;

      let rollInput = (input.rollLeft ? 1 : 0) - (input.rollRight ? 1 : 0);
      if (flightSettings.rollOnAD) {
        rollInput += (input.strafeLeft ? 0.85 : 0) - (input.strafeRight ? 0.85 : 0);
      }
      // Subtle banking feedback when turning via virtual joystick
      const joyBank = -input.joyYaw * 0.32;
      let rollStep =
        (rollInput * 2.1 + joyBank) * controlFactor * safeDt + instability.rollShock * safeDt;

      qPitch.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchRate);
      qYaw.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawRate);
      qRoll.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollStep);
      ship.root.quaternion.multiply(qYaw).multiply(qPitch).multiply(qRoll).normalize();

      // Auto-Roll Stabilization (keeps horizon comfortable on mobile & flight-assist!)
      if (flightSettings.autoRollStabilize && Math.abs(rollInput) < 0.05 && Math.abs(input.joyYaw) < 0.12) {
        shipRight.set(1, 0, 0).applyQuaternion(ship.root.quaternion);
        shipForward.set(0, 0, -1).applyQuaternion(ship.root.quaternion);
        if (Math.abs(shipForward.y) < 0.85) {
          const levelRoll = THREE.MathUtils.clamp(shipRight.y * 1.45 * safeDt, -0.05, 0.05);
          qRoll.setFromAxisAngle(new THREE.Vector3(0, 0, 1), levelRoll);
          ship.root.quaternion.multiply(qRoll).normalize();
        }
      }

      // Optional Gentle Target Tracking Assist (subtle nose pull toward locked target during combat)
      if (
        flightSettings.targetTrackingAssist &&
        !isSupercruiseNow &&
        !autopilotActive &&
        lockedTarget &&
        lockedTarget.alive
      ) {
        tmpVec.subVectors(lockedTarget.pos, ship.root.position).normalize();
        shipForward.set(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
        if (tmpVec.dot(shipForward) > 0.82) {
          const desiredQuat = new THREE.Quaternion();
          const m = new THREE.Matrix4().lookAt(
            ship.root.position,
            lockedTarget.pos,
            shipUp.set(0, 1, 0).applyQuaternion(ship.root.quaternion),
          );
          desiredQuat.setFromRotationMatrix(m);
          ship.root.quaternion.slerp(desiredQuat, Math.min(1, safeDt * 1.25));
        }
      }

      instability = stepFlightStability(instability, flightSettings.flightAssist, safeDt);

      shipForward.set(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
      shipRight.set(1, 0, 0).applyQuaternion(ship.root.quaternion).normalize();
      shipUp.set(0, 1, 0).applyQuaternion(ship.root.quaternion).normalize();

      prevShipPos.copy(ship.root.position);
      ship.root.position.addScaledVector(shipForward, vitals.speed * safeDt);
      if (instability.knockbackSpeed > 0.2) {
        ship.root.position.addScaledVector(knockbackDir, instability.knockbackSpeed * safeDt);
      }
      if (!flightSettings.rollOnAD) {
        const strafe = (input.strafeRight ? 1 : 0) - (input.strafeLeft ? 1 : 0);
        if (strafe !== 0) {
          ship.root.position.addScaledVector(shipRight, strafe * 88 * controlFactor * safeDt);
        }
      }

      shipVel.subVectors(ship.root.position, prevShipPos).divideScalar(Math.max(1e-4, safeDt));

      // Build nearby solid colliders buffer (asteroids, capital ship hull proxy, allied carrier)
      solidColliderBuf.length = 0;
      const nearbySolidRefs = spatialAsteroidGrid.queryRadius(
        ship.root.position.x,
        ship.root.position.y,
        ship.root.position.z,
        360,
        spatialQueryBuf,
      );
      for (let sIdx = 0; sIdx < nearbySolidRefs.length; sIdx++) {
        const ref = nearbySolidRefs[sIdx];
        const ast = asteroids.find((a) => a.id === ref.id);
        solidColliderBuf.push({
          id: ref.id,
          kind: ast && ast.tier === 'wreckage' ? 'wreckage' : 'asteroid',
          x: ref.x,
          y: ref.y,
          z: ref.z,
          radius: ref.radius,
          mass: ast ? ast.mass : 80,
          velX: ast ? ast.vel.x : 0,
          velY: ast ? ast.vel.y : 0,
          velZ: ast ? ast.vel.z : 0,
        });
      }

      if (activeCapitalShip && !activeCapitalShip.status.destroyed) {
        const cap = activeCapitalShip;
        const capRadius =
          cap.status.shipClass === 'sovereign_flagship'
            ? 280
            : cap.status.shipClass === 'heavy_dreadnought'
              ? 220
              : cap.status.shipClass === 'frigate'
                ? 135
                : 180;
        solidColliderBuf.push({
          id: cap.status.id,
          kind: 'capital_ship',
          x: cap.pos.x,
          y: cap.pos.y,
          z: cap.pos.z,
          radius: capRadius,
          mass: 12000,
          velX: cap.helm.velX,
          velY: cap.helm.velY,
          velZ: cap.helm.velZ,
        });
      }

      if (friendlyCarrier.visible) {
        solidColliderBuf.push({
          id: 'friendly_carrier',
          kind: 'friendly_carrier',
          x: friendlyCarrier.position.x,
          y: friendlyCarrier.position.y,
          z: friendlyCarrier.position.z,
          radius: 175,
          mass: 9000,
        });
      }

      // Live obstacle closing proximity warning
      solidProximityWarningState = evaluateClosingProximityWarning(
        { x: ship.root.position.x, y: ship.root.position.y, z: ship.root.position.z },
        { x: shipVel.x, y: shipVel.y, z: shipVel.z },
        12.0,
        solidColliderBuf,
      );

      // Swept solid obstacle collision test & physical deflection
      solidCollisionCooldown = Math.max(0, solidCollisionCooldown - safeDt);
      const sweptHit = resolveSweptSolidCollision(
        { x: prevShipPos.x, y: prevShipPos.y, z: prevShipPos.z },
        { x: ship.root.position.x, y: ship.root.position.y, z: ship.root.position.z },
        { x: shipVel.x, y: shipVel.y, z: shipVel.z },
        11.5,
        solidColliderBuf,
        3.2,
      );

      if (sweptHit && solidCollisionCooldown <= 0) {
        solidCollisionCooldown = SOLID_COLLISION_COOLDOWN_SEC;
        ship.root.position.set(sweptHit.resolvedPos.x, sweptHit.resolvedPos.y, sweptHit.resolvedPos.z);
        shipVel.set(sweptHit.deflectedVel.x, sweptHit.deflectedVel.y, sweptHit.deflectedVel.z);
        vitals.speed = Math.max(16, shipVel.length());
        input.supercruise = false;
        autopilotActive = false;

        const solidDmg = computeSolidImpactDamage({
          shipClass: spaceLoadout.selectedShipId,
          obstacleKind: sweptHit.collider.kind,
          relativeSpeed: sweptHit.relativeSpeed,
          closingSpeed: sweptHit.closingSpeed,
          headOnFactor: sweptHit.headOnFactor,
          obstacleMass: sweptHit.collider.mass,
          currentShield: vitals.shield,
          currentHull: vitals.hull,
          maxHull: vitals.maxHull,
          difficultyScale: DIFFICULTY_PROFILES[activeDifficulty].incomingDamage,
        });

        vitals.shield = Math.max(0, vitals.shield - solidDmg.shieldDamage);
        vitals.hull = Math.max(0, vitals.hull - solidDmg.hullDamage);
        timeSinceDamaged = 0;

        knockbackDir.set(sweptHit.normal.x, sweptHit.normal.y, sweptHit.normal.z).normalize();
        instability = {
          pitchShock: (Math.random() > 0.5 ? 1 : -1) * (solidDmg.severity === 'heavy' ? 0.35 : 0.16),
          yawShock: (Math.random() > 0.5 ? 1 : -1) * (solidDmg.severity === 'heavy' ? 0.35 : 0.16),
          rollShock: (Math.random() > 0.5 ? 1 : -1) * (solidDmg.severity === 'heavy' ? 0.45 : 0.2),
          knockbackSpeed: solidDmg.severity === 'heavy' ? 44 : 22,
          alarmTimer: solidDmg.severity === 'heavy' ? 3.0 : 1.5,
        };

        callbacks.onAsteroidCollision?.(
          solidDmg.severity === 'heavy' ? 'severe' : solidDmg.severity === 'moderate' ? 'medium' : 'small',
          'hull',
          vitals.hull <= 0,
        );
        explosions.spawnImpactSparks(
          new THREE.Vector3(sweptHit.contactPoint.x, sweptHit.contactPoint.y, sweptHit.contactPoint.z),
          0xff8833,
          solidDmg.severity === 'heavy' ? 2.4 : 1.2,
        );
        ship.addCameraShake(solidDmg.cameraImpulse);
        ship.setDamageVisuals(vitals.hull / vitals.maxHull, vitals.engineIntegrity / 100);

        if (vitals.hull <= 0) {
          explosions.spawnExplosion(ship.root.position.clone(), 3.5, { isSpace: true });
          showToast(`${shipSpec.name.toUpperCase()} CATASTROPHIC IMPACT WITH SOLID OBSTACLE`, 3.4);
          reportMissionFailure('asteroid_collision');
        }
      }

      // Accumulate true 3D distance traveled in meters
      distanceTraveledMeters += ship.root.position.distanceTo(prevShipPos);

      // Seamless Inter-Region Free-Flight Transition OR Expansive Soft Perimeter (7.8–9.6 km radius!)
      const distFromCenter = ship.root.position.distanceTo(activeCenter);
      if (distFromCenter > regionCfg.fieldRadius * 0.88) {
        let nearestOther: SpaceRegionId | null = null;
        let nearestDist = Infinity;
        for (const r of SPACE_REGION_LIST) {
          if (r.id === currentRegionId) continue;
          const d = Math.hypot(
            ship.root.position.x - r.worldCenter[0],
            ship.root.position.y - r.worldCenter[1],
            ship.root.position.z - r.worldCenter[2],
          );
          if (d < nearestDist) {
            nearestDist = d;
            nearestOther = r.id;
          }
        }
        if (nearestOther && nearestDist < SPACE_REGIONS[nearestOther].fieldRadius * 0.95) {
          travelToRegion(nearestOther, ship, undefined, true);
        } else if (distFromCenter > regionCfg.fieldRadius) {
          // Soft boundary cushion only at the far edge of the 80km theater
          tmpVec.subVectors(activeCenter, ship.root.position).normalize();
          ship.root.position.addScaledVector(tmpVec, (distFromCenter - regionCfg.fieldRadius) * 0.12);
        }
      }

      // Keep ship safely above Aether Prime atmosphere floor
      const distToPlanet = ship.root.position.distanceTo(planetCenter);
      if (distToPlanet < planetRadius + 380) {
        tmpVec.subVectors(ship.root.position, planetCenter).normalize();
        ship.root.position.copy(planetCenter).addScaledVector(tmpVec, planetRadius + 380);
      }

      const thrustNorm = THREE.MathUtils.clamp((vitals.speed - 30) / 360, 0.15, 2.0);
      ship.setThrustLevel(thrustNorm, isBoostingNow, isSupercruiseNow);
      ship.setDamageVisuals(vitals.hull / vitals.maxHull, vitals.engineIntegrity / 100);
      ship.updateVisuals(safeDt, elapsed, pitchRate * 16, rollInput + joyBank);
      const camObstacles = getNearbyObstaclesForCamera(ship.root.position);
      ship.updateCamera(camera, safeDt, isBoostingNow, isSupercruiseNow, camObstacles, false);

      // Primary Weapon & Precision Rail Cannon Charge Logic (with rising audible charge pulse)
      primaryCooldown = Math.max(0, primaryCooldown - safeDt);
      const wSpec = SPACE_WEAPONS[activeWeapon];
      if (primaryFiring && primaryCooldown <= 0 && !weaponOverheated && !missionCompleted) {
        if (wSpec.chargeTimeSec > 0) {
          const effectiveCharge = wSpec.chargeTimeSec / shipSpec.railChargeBonus;
          railChargeSec += safeDt;
          railChargeAudioTick -= safeDt;
          if (railChargeAudioTick <= 0) {
            railChargeAudioTick = 0.14;
            callbacks.onRailChargeTick?.(Math.min(1, railChargeSec / Math.max(0.05, effectiveCharge)));
          }
          if (railChargeSec >= effectiveCharge) {
            railChargeSec = 0;
            railChargeAudioTick = 0;
            fireActiveWeapon(ship);
          }
        } else {
          fireActiveWeapon(ship);
        }
      } else {
        railChargeSec = Math.max(0, railChargeSec - safeDt * 2.5);
        railChargeAudioTick = 0;
      }

      // Target Lock-On (supports Capital Ship Subsystems, Void Harvester Energy Cores + Fighter Lock-On!)
      let preferCoreLock = false;
      if (
        selectedHarvesterCoreId &&
        activeCapitalShip &&
        !activeCapitalShip.status.destroyed &&
        getHarvesterCoreWorldPos(selectedHarvesterCoreId, tmpSubPos)
      ) {
        const coreDist = tmpSubPos.distanceTo(ship.root.position);
        tmpVec.subVectors(tmpSubPos, ship.root.position).normalize();
        const coreDot = tmpVec.dot(shipForward);
        preferCoreLock = manualSubsystemLock || (coreDist < 3600 && coreDot > 0.72);
      }

      let preferSubsystemLock = false;
      if (
        !preferCoreLock &&
        selectedSubsystem &&
        activeCapitalShip &&
        !activeCapitalShip.status.destroyed &&
        !activeCapitalShip.status.subsystems[selectedSubsystem].destroyed
      ) {
        getSubsystemWorldPos(activeCapitalShip, selectedSubsystem, tmpSubPos);
        const capDist = tmpSubPos.distanceTo(ship.root.position);
        tmpVec.subVectors(tmpSubPos, ship.root.position).normalize();
        const capDot = tmpVec.dot(shipForward);
        preferSubsystemLock = manualSubsystemLock || (capDist < 4800 && capDot > 0.72);
      }

      if (preferCoreLock && selectedHarvesterCoreId && activeCapitalShip && getHarvesterCoreWorldPos(selectedHarvesterCoreId, tmpSubPos)) {
        tmpProj.copy(tmpSubPos).project(camera);
        targetInView = tmpProj.z > -1 && tmpProj.z < 1;
        targetScreenX = (tmpProj.x + 1) * 0.5;
        targetScreenY = (1 - tmpProj.y) * 0.5;
        lockProgress = 1.0;
        lockGraceSec = 0;
        lockedTarget = null;
        latestPredictiveLeadReticle = null;
      } else if (preferSubsystemLock && selectedSubsystem && activeCapitalShip) {
        getSubsystemWorldPos(activeCapitalShip, selectedSubsystem, tmpSubPos);
        tmpProj.copy(tmpSubPos).project(camera);
        targetInView = tmpProj.z > -1 && tmpProj.z < 1;
        targetScreenX = (tmpProj.x + 1) * 0.5;
        targetScreenY = (1 - tmpProj.y) * 0.5;
        lockProgress = 1.0;
        lockGraceSec = 0;
        lockedTarget = null;
        latestPredictiveLeadReticle = null;
      } else {
        let bestCandidate: EnemyStarfighter | null = null;
        let bestDot = flightSettings.gentleAimAssist ? 0.8 : 0.86;
        let bestDist = Infinity;
        let currentTargetDot = -1;
        let currentTargetDist = Infinity;
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!e.alive) continue;
          const dist = e.pos.distanceTo(ship.root.position);
          // Phantom stealth cloak prevents long-range lock unless close sensor bleed (< 285m)
          const lockable = !e.phantomCloak?.cloaked || dist <= 285;
          tmpVec.subVectors(e.pos, ship.root.position).normalize();
          const dot = tmpVec.dot(shipForward);
          if (lockedTarget && e.id === lockedTarget.id) {
            currentTargetDot = dot;
            currentTargetDist = dist;
          }
          if (!lockable) continue;
          if (dist > shipSpec.lockRangeMeters) continue;
          if (dot > bestDot) {
            bestDot = dot;
            bestDist = dist;
            bestCandidate = e;
          }
        }

        const lockEval = stepTargetLock({
          currentTargetId: lockedTarget && lockedTarget.alive ? lockedTarget.id : null,
          currentProgress: lockProgress,
          currentGraceSec: lockGraceSec,
          currentTargetDot: lockedTarget && lockedTarget.alive ? currentTargetDot : undefined,
          currentTargetDist: lockedTarget && lockedTarget.alive ? currentTargetDist : undefined,
          bestCandidateId: bestCandidate?.id ?? null,
          bestCandidateDot: bestCandidate ? bestDot : 0,
          bestCandidateDist: bestCandidate ? bestDist : Infinity,
          dt: safeDt * mods.lockSpeedMult * ewInterferenceState.lockSpeedMultiplier,
          maxLockRange: shipSpec.lockRangeMeters,
          coneDotThreshold: flightSettings.gentleAimAssist ? 0.82 : 0.87,
        });
        lockedTarget = lockEval.lockedTargetId
          ? enemies.find((e) => e.id === lockEval.lockedTargetId && e.alive) ?? null
          : null;
        lockProgress = lockEval.lockProgress;
        lockGraceSec = lockEval.graceSec;
        if (lockEval.isLocked && !wasLocked && lockedTarget) {
          wasLocked = true;
          callbacks.onMissileLock?.();
        } else if (!lockEval.isLocked) {
          wasLocked = false;
        }

        if (lockedTarget && lockedTarget.alive) {
          tmpProj.copy(lockedTarget.pos).project(camera);
          targetInView = tmpProj.z > -1 && tmpProj.z < 1;
          targetScreenX = (tmpProj.x + 1) * 0.5;
          targetScreenY = (1 - tmpProj.y) * 0.5;

          const activeWpnSpeed = SPACE_WEAPONS[activeWeapon].projectileSpeed;
          const leadPt = computePredictiveAimPoint({
            shooterPos: ship.root.position,
            targetPos: lockedTarget.pos,
            targetVel: lockedTarget.vel,
            projectileSpeed: Math.max(320, activeWpnSpeed),
            leadFactor: 0.92,
          });
          tmpProj.set(leadPt.x, leadPt.y, leadPt.z).project(camera);
          const leadInView =
            tmpProj.z > -1 &&
            tmpProj.z < 1 &&
            lockedTarget.pos.distanceTo(ship.root.position) <= shipSpec.lockRangeMeters;
          latestPredictiveLeadReticle = leadInView
            ? {
              x: THREE.MathUtils.clamp((tmpProj.x + 1) * 0.5, 0.04, 0.96),
              y: THREE.MathUtils.clamp((1 - tmpProj.y) * 0.5, 0.06, 0.94),
              visible: true,
            }
            : null;
        } else {
          targetInView = false;
          latestPredictiveLeadReticle = null;
        }
      }

      // Compute 3D Encounter Zone Waypoint HUD Markers
      latestWaypoints = regionCfg.encounterZones.map((zone) => {
        const wp = new THREE.Vector3(
          activeCenter.x + zone.offsetFromRegionCenter[0],
          activeCenter.y + zone.offsetFromRegionCenter[1],
          activeCenter.z + zone.offsetFromRegionCenter[2],
        );
        const distKm = Number((wp.distanceTo(ship.root.position) / 1000).toFixed(2));
        tmpProj.copy(wp).project(camera);
        const inView = tmpProj.z > -1 && tmpProj.z < 1;
        const zoneEnemiesLeft = enemies.some((e) => e.alive && e.zoneId === zone.id);
        const capAliveHere = Boolean(
          zone.hasCapitalShip && activeCapitalShip && !activeCapitalShip.status.destroyed,
        );
        return {
          id: zone.id,
          label: zone.label,
          distanceKm: distKm,
          screenX: (tmpProj.x + 1) * 0.5,
          screenY: (1 - tmpProj.y) * 0.5,
          inView,
          cleared: !zoneEnemiesLeft && !capAliveHere && !zone.isPeacefulSalvage,
        };
      });

      if (extractionActive && !extractionReached) {
        const exDistKm = Number((extractionPos.distanceTo(ship.root.position) / 1000).toFixed(2));
        tmpProj.copy(extractionPos).project(camera);
        latestWaypoints.unshift({
          id: 'extraction_beacon',
          label: 'EXTRACTION BEACON',
          distanceKm: exDistKm,
          screenX: (tmpProj.x + 1) * 0.5,
          screenY: (1 - tmpProj.y) * 0.5,
          inView: tmpProj.z > -1 && tmpProj.z < 1,
          cleared: false,
        });
      }

      // Compute 2D Tactical Radar Blips (scaled to ship's sensor range!)
      const radarRange = shipSpec.radarRangeMeters;
      const blips: SpaceRadarBlip[] = [];
      const pushBlip = (
        id: string,
        worldPos: THREE.Vector3,
        kind: SpaceRadarBlip['kind'],
        isLocked = false,
      ) => {
        tmpVec.subVectors(worldPos, ship.root.position);
        const rx = tmpVec.dot(shipRight) / radarRange;
        const rz = -tmpVec.dot(shipForward) / radarRange;
        const len = Math.hypot(rx, rz);
        const clamp = len > 0.94 ? 0.94 / len : 1;
        blips.push({
          id,
          x: Number((rx * clamp).toFixed(2)),
          z: Number((rz * clamp).toFixed(2)),
          kind,
          isLocked,
        });
      };

      for (const e of enemies) {
        if (e.alive) pushBlip(e.id, e.pos, 'fighter', lockedTarget?.id === e.id);
      }
      if (activeCapitalShip && !activeCapitalShip.status.destroyed) {
        pushBlip(
          activeCapitalShip.status.id,
          activeCapitalShip.root.position,
          'capital',
          Boolean(selectedSubsystem),
        );
      }
      if (friendlyCarrier.visible) {
        pushBlip('csv_aegis', friendlyCarrier.position, 'friendly');
      }
      pushBlip('repair_beacon', repairBeaconPos, 'beacon');
      for (let i = 0; i < Math.min(8, asteroids.length); i++) {
        if (asteroids[i].tier === 'large') {
          pushBlip(asteroids[i].id, asteroids[i].pos, 'asteroid');
        }
      }
      latestRadarBlips = blips;

      // Refresh Non-Obstructive Enemy Targeting Information (3 tiers, silhouette clearance,
      // asteroid occlusion, overlap resolution, HUD safe zones & smooth damping)
      occluderSpheres.length = 0;
      for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        if (a.hp > 0 && a.mesh.visible && a.radius >= 18) {
          occluderSpheres.push({ x: a.pos.x, y: a.pos.y, z: a.pos.z, radius: a.radius });
        }
      }

      const waypointRects: NormRect[] = [];
      for (let i = 0; i < latestWaypoints.length; i++) {
        const wp = latestWaypoints[i];
        if (wp.inView && !wp.cleared) {
          const wx = THREE.MathUtils.clamp(wp.screenX, 0.14, 0.86);
          const wy = THREE.MathUtils.clamp(wp.screenY, 0.18, hudViewportCtx.isTouchMode ? 0.58 : 0.76);
          waypointRects.push(makeCenterRect(wx, wy, 0.072, 0.026));
        }
      }

      const hbCandidates: EnemyHealthBarCandidate[] = [];
      const targetCandidates: TargetHudCandidate[] = [];

      for (const e of enemies) {
        e.lastHitAge = Math.min(99, e.lastHitAge + safeDt);
        if (!e.alive) {
          if (e.destroyedFlashTimer > 0) {
            e.destroyedFlashTimer = Math.max(0, e.destroyedFlashTimer - safeDt);
          }
          if (e.destroyedFlashTimer <= 0) continue;
        }
        tmpProj.copy(e.pos).project(camera);
        const inFront = tmpProj.z > -1 && tmpProj.z < 1;
        const screenX = (tmpProj.x + 1) * 0.5;
        const screenY = (1 - tmpProj.y) * 0.5;
        const dist = e.pos.distanceTo(ship.root.position);
        const shieldPct = e.maxShield > 0 ? (e.shield / e.maxShield) * 100 : 0;
        const hullPct = e.alive ? (e.health / Math.max(1, e.maxHealth)) * 100 : 0;
        const isTargeted = lockedTarget?.id === e.id;
        const justDestroyed = !e.alive && e.destroyedFlashTimer > 0;
        const isOccluded =
          inFront && e.alive
            ? isTargetOccludedBySpheres(camera.position, e.pos, occluderSpheres)
            : false;
        const worldRadiusMeters =
          e.shipClass === 'medium'
            ? 36
            : e.isExecutionerBoss
              ? 30
              : e.isLegendary
                ? 21
                : e.role === 'elite_ace'
                  ? 19.5
                  : e.role === 'heavy_fighter' || e.role === 'bomber'
                    ? 17.5
                    : 15.2;

        if (e.isExecutionerBoss) {
          bossLastInCameraView =
            inFront && screenX >= -0.05 && screenX <= 1.05 && screenY >= -0.05 && screenY <= 1.05;
        }

        targetCandidates.push({
          id: e.id,
          name: e.isExecutionerBoss ? 'MINI-BOSS · THE EXECUTIONER' : e.name,
          role: e.role,
          shipClass: e.shipClass,
          threatLevel: e.isExecutionerBoss ? 'elite' : deriveThreatLevel(e.shipClass, e.role),
          anchorX: screenX,
          anchorY: screenY,
          inFront,
          distanceMeters: dist,
          worldRadiusMeters,
          shieldPct,
          hullPct,
          hasShields: e.maxShield > 0,
          isTargeted,
          isAttacking: e.isExecutionerBoss || e.fireCooldown < 0.85 || dist < 920,
          wasRecentlyHit: e.lastHitAge < 3.2,
          justDestroyed,
          isOccluded,
          lockProgress: isTargeted ? lockProgress : 0,
        });

        hbCandidates.push({
          id: e.id,
          name: e.name,
          roleBadge: getAnyEnemyRoleConfig(e.role).badge,
          shipClass: e.shipClass,
          screenX,
          screenY,
          inFront,
          distanceMeters: dist,
          shieldPct,
          hullPct,
          isTargeted,
          wasRecentlyHit: e.lastHitAge < 3.2,
          justDestroyed,
        });
      }

      latestCapitalDistanceMeters = null;
      if (activeCapitalShip) {
        const cap = activeCapitalShip;
        cap.lastHitAge = Math.min(99, cap.lastHitAge + safeDt);

        // Advance deliberate capital ship helm movement along 3D tactical patrol route
        if (!cap.status.destroyed || (cap.criticalCountdown && cap.criticalCountdown.active)) {
          const engineMult = cap.status.subsystems.engines.destroyed ? 0.35 : 1.0;
          const underFire = cap.lastHitAge < 3.5;
          const stepRes = stepCapitalShipMovement(
            cap.helm,
            safeDt,
            {
              engineSpeedMultiplier: engineMult,
              hullRatio: cap.status.hull / Math.max(1, cap.status.maxHull),
              underFire,
              playerPos: { x: ship.root.position.x, y: ship.root.position.y, z: ship.root.position.z },
              criticalMeltdown: Boolean(cap.criticalCountdown && cap.criticalCountdown.active),
            },
          );
          cap.helm = stepRes.state;
          cap.pos.set(cap.helm.posX, cap.helm.posY, cap.helm.posZ);
          cap.root.position.copy(cap.pos);
          cap.root.rotation.set(cap.helm.pitchRad, cap.helm.yawRad, cap.helm.rollRad, 'YXZ');
        }

        // Advance 3-second critical countdown if reactor meltdown in progress
        if (cap.criticalCountdown && !cap.criticalCountdown.detonated) {
          const cStep = stepCapitalCriticalCountdown(cap.criticalCountdown, safeDt);
          cap.criticalCountdown = cStep.state;

          if (cStep.triggeredBeepDigit !== null) {
            callbacks.onCriticalCountdownBeep?.(cStep.triggeredBeepDigit);
            showToast(
              `[CRITICAL] REACTOR DETONATION IN ${cStep.triggeredBeepDigit}s — CLEAR BLAST RADIUS (${CAPITAL_BLAST_DANGER_RADIUS_METERS}m)!`,
              1.2,
            );
          }

          if (cStep.triggeredSecondaryBlast) {
            const subKeys: CapitalSubsystemKey[] = ['engines', 'weapons', 'hangar', 'comms', 'shields'];
            const randSub = subKeys[Math.floor(Math.random() * subKeys.length)];
            getSubsystemWorldPos(cap, randSub, tmpSubPos);
            explosions.spawnExplosion(tmpSubPos.clone(), 2.8, { isSpace: true, colorHex: 0xff6622 });
            callbacks.onShipDestructionStage?.({
              pos: tmpSubPos.clone(),
              destructionClass: 'capital',
              isSecondary: true,
              kind: 'hull_rupture',
              scale: 2.2,
              distanceMeters: tmpSubPos.distanceTo(ship.root.position),
            });
            ship.addCameraShake(0.24);
          }

          if (cStep.triggeredMainDetonation) {
            cap.criticalCountdown.detonated = true;
            cap.status.destroyed = true;
            cap.destroyedFlashTimer = 1.8;
            capitalShipsDestroyedCount++;
            recordCombatKill(combatScoreState, {
              shipClass: 'capital',
              distanceMeters: cap.root.position.distanceTo(ship.root.position),
            });

            // Massive expanding explosion & debris
            explosions.spawnExplosion(cap.root.position.clone(), 5.2, { isSpace: true, colorHex: 0xff4400 });
            callbacks.onCapitalShipDestroyed?.(cap.status.name, cap.root.position.clone());
            callbacks.onShipDestructionStage?.({
              pos: cap.root.position.clone(),
              destructionClass: 'capital',
              isSecondary: false,
              kind: 'main_detonation',
              scale: 5.0,
              distanceMeters: cap.root.position.distanceTo(ship.root.position),
            });

            // Distance-based escape blast damage
            const distToPlayer = cap.root.position.distanceTo(ship.root.position);
            const blast = computeCapitalBlastDamage({
              distanceMeters: distToPlayer,
              blastRadiusMeters: CAPITAL_BLAST_DANGER_RADIUS_METERS,
              currentShield: vitals.shield,
              currentHull: vitals.hull,
              maxHull: vitals.maxHull,
            });

            if (blast.escapedSafely) {
              showToast('BLAST WAVE CLEARED! SAFELY ESCAPED REACTOR DETONATION RADIUS!', 3.5);
              ship.addCameraShake(blast.cameraImpulse);
            } else {
              vitals.shield = Math.max(0, vitals.shield - blast.shieldDamage);
              vitals.hull = Math.max(0, vitals.hull - blast.hullDamage);
              timeSinceDamaged = 0;
              ship.addCameraShake(blast.cameraImpulse);
              showToast(`CAUGHT IN CAPITAL DETONATION BLAST WAVE! -${blast.totalDamage} HP`, 3.5);
              if (blast.knockbackSpeed > 0) {
                const knockDir = tmpVec.subVectors(ship.root.position, cap.root.position).normalize();
                shipVel.addScaledVector(knockDir, blast.knockbackSpeed);
              }
              if (vitals.hull <= 0) {
                explosions.spawnExplosion(ship.root.position.clone(), 3.5, { isSpace: true });
                showToast(`${shipSpec.name.toUpperCase()} DESTROYED BY CAPITAL REACTOR DETONATION`, 3.4);
                reportMissionFailure('enemy_fire');
              }
            }

            dyingCapitalHulls.push({
              root: cap.root,
              age: 0,
              removeAt: 18.0,
              rollSpeed: 0.045,
              pitchSpeed: 0.02,
            });

            checkSpaceMissionCompletion();
          }
        }

        if (cap.status.destroyed && cap.destroyedFlashTimer > 0) {
          cap.destroyedFlashTimer = Math.max(
            0,
            cap.destroyedFlashTimer - safeDt,
          );
        }
        if (!activeCapitalShip.status.destroyed || activeCapitalShip.destroyedFlashTimer > 0) {
          const cap = activeCapitalShip;
          const capDist = cap.root.position.distanceTo(ship.root.position);
          latestCapitalDistanceMeters = Math.round(capDist);
          tmpProj.copy(cap.root.position).project(camera);
          const capInFront = tmpProj.z > -1 && tmpProj.z < 1;
          const capScreenX = (tmpProj.x + 1) * 0.5;
          const capScreenY = (1 - tmpProj.y) * 0.5;
          const activeSubs = Object.values(cap.status.subsystems).filter((s) => !s.destroyed).length;
          const capRadius =
            cap.status.shipClass === 'sovereign_flagship'
              ? 282
              : cap.status.shipClass === 'heavy_dreadnought'
                ? 224
                : cap.status.shipClass === 'frigate'
                  ? 135
                  : 186;
          const shieldPct = cap.status.maxShield > 0 ? (cap.status.shield / cap.status.maxShield) * 100 : 0;
          const hullPct = cap.status.destroyed ? 0 : (cap.status.hull / Math.max(1, cap.status.maxHull)) * 100;

          targetCandidates.push({
            id: cap.status.id,
            name: cap.status.name,
            shipClass: 'capital',
            threatLevel: 'capital',
            anchorX: capScreenX,
            anchorY: capScreenY,
            inFront: capInFront,
            distanceMeters: capDist,
            worldRadiusMeters: capRadius,
            shieldPct,
            hullPct,
            hasShields: cap.status.maxShield > 0,
            isTargeted: Boolean(selectedSubsystem),
            isAttacking: capDist < 4200,
            wasRecentlyHit: cap.lastHitAge < 4.5,
            justDestroyed: cap.status.destroyed && cap.destroyedFlashTimer > 0,
            isOccluded: false,
            lockProgress: selectedSubsystem ? lockProgress : 0,
            activeSubsystems: activeSubs,
            totalSubsystems: CAPITAL_SUBSYSTEM_KEYS.length,
          });

          hbCandidates.push({
            id: cap.status.id,
            name: cap.status.name,
            roleBadge: 'CAPITAL',
            shipClass: 'capital',
            screenX: capScreenX,
            screenY: capScreenY,
            inFront: capInFront,
            distanceMeters: capDist,
            shieldPct,
            hullPct,
            isTargeted: Boolean(selectedSubsystem),
            wasRecentlyHit: cap.lastHitAge < 4.5,
            justDestroyed: cap.status.destroyed && cap.destroyedFlashTimer > 0,
            activeSubsystems: activeSubs,
            totalSubsystems: CAPITAL_SUBSYSTEM_KEYS.length,
          });
        }
      }

      hudViewportCtx.fovDeg = camera.fov || 62;
      hudViewportCtx.cameraMode = currentCameraMode;
      hudViewportCtx.hasCapitalPanel = Boolean(activeCapitalShip && !activeCapitalShip.status.destroyed);
      hudViewportCtx.waypointRects = waypointRects;
      hudViewportCtx.enemyInfoMode = flightSettings.enemyInfoDisplayMode ?? 'full';

      const layoutRes = layoutEnemyTargetIndicators(
        targetCandidates,
        hudViewportCtx,
        targetHudSmoothState,
        safeDt,
      );
      latestTargetMarkers = layoutRes.markers;
      latestOffscreenTargets = layoutRes.offscreen;
      targetHudSmoothState = layoutRes.nextState;

      latestEnemyHealthMarkers = selectVisibleEnemyHealthBars(hbCandidates, {
        maxVisible: 7,
        fighterMaxRange: 2800,
        warshipMaxRange: 4800,
      });
    }

    // Update Projectiles with Physical Range Cutoff, Distance Falloff, Calibrated Hit Spheres,
    // Finite Evadable Homing Guidance, Near-Miss & Missile-Evasion Skill Scoring
    let hasIncoming = false;
    const shipSpec = getShipSpec();
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life -= safeDt;

      if (p.isMissile) {
        if (p.guidanceRemainingSec !== undefined) {
          p.guidanceRemainingSec = Math.max(0, p.guidanceRemainingSec - safeDt);
        }
        const guidanceActive = p.guidanceRemainingSec === undefined || p.guidanceRemainingSec > 0;
        const playerTurnRate = WEAPON_BALLISTICS.missile.missileMaxTurnRadPerSec ?? 2.35;

        if (p.fromPlayer && guidanceActive && p.targetEnemy && p.targetEnemy.alive) {
          // Elite Aces can deploy defensive decoy flares on cooldown to spoof incoming missiles
          const dAce = p.pos.distanceTo(p.targetEnemy.pos);
          if (
            p.targetEnemy.role === 'elite_ace' &&
            dAce < 135 &&
            p.targetEnemy.aceFlareCooldown <= 0 &&
            p.targetEnemy.empStunTimer <= 0
          ) {
            p.targetEnemy.aceFlareCooldown = tacticalProfile.aceFlareCooldownSec;
            p.targetEnemy.evasionTimer = 2.4;
            explosions.spawnImpactSparks(p.targetEnemy.pos.clone(), 0xffe49e, 1.6);
            p.targetEnemy = undefined;
            showToast('ELITE ACE DEPLOYED COUNTERMEASURES — MISSILE SPOOFED!', 1.8);
          } else {
            const guided = stepMissileGuidance({
              missilePos: p.pos,
              missileVel: p.vel,
              targetPos: p.targetEnemy.pos,
              targetVel: p.targetEnemy.vel,
              speed: p.vel.length(),
              dt: safeDt,
              maxTurnRadPerSec: playerTurnRate,
              seekerConeCos: 0.2,
              leadFactor: 0.82,
            });
            p.vel.set(guided.vel.x, guided.vel.y, guided.vel.z);
            if (guided.lostSeeker) {
              p.targetEnemy = undefined;
            }
            p.mesh.lookAt(p.pos.clone().add(p.vel));
          }
        } else if (
          p.fromPlayer &&
          guidanceActive &&
          p.targetSubsystem &&
          activeCapitalShip &&
          !activeCapitalShip.status.destroyed
        ) {
          getSubsystemWorldPos(activeCapitalShip, p.targetSubsystem, tmpSubPos);
          const guided = stepMissileGuidance({
            missilePos: p.pos,
            missileVel: p.vel,
            targetPos: tmpSubPos,
            targetVel: { x: 0, y: 0, z: 0 },
            speed: p.vel.length(),
            dt: safeDt,
            maxTurnRadPerSec: 2.2,
            seekerConeCos: 0.16,
            leadFactor: 0,
          });
          p.vel.set(guided.vel.x, guided.vel.y, guided.vel.z);
          if (guided.lostSeeker) {
            p.targetSubsystem = undefined;
          }
          p.mesh.lookAt(p.pos.clone().add(p.vel));
        } else if (!p.fromPlayer && playable && vitals.hull > 0) {
          if (flareDecoyTimer > 0) {
            if (!p.nearMissAwarded) {
              p.nearMissAwarded = true;
              recordMissileEvadedBonus(combatScoreState);
            }
            p.vel.y += 120 * safeDt;
            p.vel.x += 90 * safeDt;
            p.mesh.lookAt(p.pos.clone().add(p.vel));
          } else if (guidanceActive) {
            hasIncoming = true;
            const guided = stepMissileGuidance({
              missilePos: p.pos,
              missileVel: p.vel,
              targetPos: ship.root.position,
              targetVel: shipVel,
              speed: p.vel.length(),
              dt: safeDt,
              maxTurnRadPerSec: 1.45,
              seekerConeCos: 0.28,
              leadFactor: 0.42,
            });
            p.vel.set(guided.vel.x, guided.vel.y, guided.vel.z);
            if (guided.lostSeeker && !p.nearMissAwarded) {
              p.nearMissAwarded = true;
              recordMissileEvadedBonus(combatScoreState);
            }
            p.mesh.lookAt(p.pos.clone().add(p.vel));
          }
        }
      }

      const stepRes = advanceProjectileSegment({
        pos: p.pos,
        vel: p.vel,
        dt: safeDt,
        traveledMeters: p.traveledMeters ?? 0,
        maxRangeMeters: p.maxRangeMeters ?? WEAPON_BALLISTICS[p.weaponKind].maxRangeMeters,
      });
      p.prevPos.set(stepRes.prevPos.x, stepRes.prevPos.y, stepRes.prevPos.z);
      p.pos.set(stepRes.nextPos.x, stepRes.nextPos.y, stepRes.nextPos.z);
      p.traveledMeters = stepRes.nextTraveledMeters;
      p.mesh.position.copy(p.pos);
      if (p.weaponKind === 'emp') {
        p.mesh.rotation.z += safeDt * 7.5;
      }

      let remove = p.life <= 0 || stepRes.expiredByRange;
      let hitSomething = false;

      // Swept Tactical Asteroid Cover & Destructible Small Asteroid Fragmentation!
      if (!remove || stepRes.stepDistMeters > 0.01) {
        for (let aIdx = asteroids.length - 1; aIdx >= 0; aIdx--) {
          const ast = asteroids[aIdx];
          if (segmentIntersectsSphere(p.prevPos, p.pos, ast.pos, ast.radius)) {
            remove = true;
            hitSomething = true;
            if (p.fromPlayer && ast.tier !== 'wreckage' && isAsteroidBreakable(ast.tier, ast.mass)) {
              ast.hp -= p.damage;
              explosions.spawnWeaponImpactDebris(p.pos.clone(), p.weaponKind, {
                isShield: false,
                targetClass: 'fighter',
                scale: 0.9,
                impactDir: p.vel,
              });
              if (ast.hp <= 0) {
                explosions.spawnExplosion(ast.pos.clone(), 1.25, { isSpace: true, colorHex: 0xd99b66 });
                asteroidGroup.remove(ast.mesh);
                asteroids.splice(aIdx, 1);
                callbacks.onWeaponImpact?.({
                  weapon: p.weaponKind,
                  worldPos: ast.pos.clone(),
                  isShield: false,
                  targetClass: 'fighter',
                  killed: true,
                });
              }
            } else if (p.isMissile) {
              explosions.spawnWeaponImpactDebris(p.pos.clone(), 'missile', {
                isShield: false,
                targetClass: 'medium',
                impactDir: p.vel,
              });
              explosions.spawnExplosion(p.pos.clone(), 1.5, { isSpace: true });
              if (!p.fromPlayer) {
                recordMissileEvadedBonus(combatScoreState);
                showToast('INCOMING MISSILE INTERCEPTED BY ASTEROID COVER!', 1.5);
              }
            } else {
              explosions.spawnWeaponImpactDebris(p.pos.clone(), p.weaponKind, {
                isShield: false,
                targetClass: 'fighter',
                scale: 0.72,
                impactDir: p.vel,
              });
            }
            break;
          }
        }
      }

      // Swept Orbital Kill Zone Defense Pylon Hits (Extinction Event Hazard Destruction)
      if (!hitSomething && p.fromPlayer && pylonEntities.length > 0) {
        for (let pi = 0; pi < orbitalPylons.length; pi++) {
          const pylon = orbitalPylons[pi];
          if (pylon.destroyed) continue;
          const pe = pylonEntities.find((x) => x.id === pylon.id);
          if (!pe) continue;
          if (segmentIntersectsSphere(p.prevPos, p.pos, pe.pos, 38)) {
            const falloff = computeDistanceDamageFalloff(p.weaponKind, p.traveledMeters);
            if (falloff <= 0) break;
            remove = true;
            hitSomething = true;
            shotsHit++;
            const nextHp = Math.max(0, pylon.hp - Math.round(p.damage * falloff));
            const broken = nextHp <= 0;
            orbitalPylons[pi] = { ...pylon, hp: nextHp, destroyed: broken, telegraphChargeSec: 0 };
            hitMarkerTimer = broken ? 0.36 : 0.2;
            hitMarkerKill = broken;
            callbacks.onHitConfirm?.(broken);
            explosions.spawnExplosion(pe.pos.clone().add(new THREE.Vector3(0, 26, 0)), broken ? 3.2 : 1.4, {
              isSpace: true,
              colorHex: broken ? 0xff5a22 : 0x38bdf8,
            });
            if (broken) {
              pe.group.visible = false;
              const remPylons = orbitalPylons.filter((x) => !x.destroyed).length;
              showToast(`ORBITAL PYLON DESTROYED (${remPylons} REMAINING)`, 2.4);
            }
            break;
          }
        }
      }

      // Swept Void Harvester Rotating Energy Cores (Major Boss 2 — 3 Independently Destructible Cores)
      if (
        !hitSomething &&
        p.fromPlayer &&
        activeCapitalShip &&
        !activeCapitalShip.status.destroyed &&
        activeCapitalShip.harvesterCoreMeshes &&
        activeBossSm?.bossId === 'void_harvester'
      ) {
        for (const cm of activeCapitalShip.harvesterCoreMeshes) {
          const coreState = activeBossSm.harvesterCores.find((c) => c.id === cm.id);
          if (!coreState || coreState.destroyed) continue;
          cm.coreMesh.getWorldPosition(tmpSubPos);
          if (segmentIntersectsSphere(p.prevPos, p.pos, tmpSubPos, 74)) {
            const falloff = computeDistanceDamageFalloff(p.weaponKind, p.traveledMeters);
            if (falloff <= 0) break;
            remove = true;
            hitSomething = true;
            shotsHit++;
            recordCombatHit(combatScoreState, { distanceMeters: p.traveledMeters, isWeakPoint: true });
            const dmg = Math.max(8, Math.round(p.damage * falloff * 1.35));
            const coreHit = damageHarvesterCore(activeBossSm, cm.id, dmg);
            activeBossSm = coreHit.state;
            hitMarkerTimer = coreHit.coreDestroyedNow ? 0.44 : 0.24;
            hitMarkerKill = coreHit.coreDestroyedNow;
            callbacks.onHitConfirm?.(coreHit.coreDestroyedNow);
            explosions.spawnExplosion(
              tmpSubPos.clone(),
              coreHit.coreDestroyedNow ? 4.2 : 1.8,
              { isSpace: true, colorHex: coreHit.coreDestroyedNow ? 0xff5a22 : 0x22d3ee },
            );
            if (coreHit.coreDestroyedNow) {
              cm.group.visible = false;
              recordSubsystemBreakScore(combatScoreState);
              const left = activeBossSm.harvesterCores.filter((c) => !c.destroyed).length;
              showToast(
                `${coreState.label.toUpperCase()} DESTROYED! (${left}/3 CORES REMAINING)`,
                3.2,
              );
            }
            break;
          }
        }
      }

      // Swept Capital Ship, 5 Subsystems, Command Bridge & Armor Plating Hits
      if (!hitSomething && p.fromPlayer && activeCapitalShip && !activeCapitalShip.status.destroyed) {
        const cap = activeCapitalShip;
        const mods = computeEquippedUpgradeModifiers(spaceLoadout.equippedModules);
        let hitSub: CapitalSubsystemKey | null = null;
        for (const k of CAPITAL_SUBSYSTEM_KEYS) {
          if (cap.status.subsystems[k].destroyed) continue;
          getSubsystemWorldPos(cap, k, tmpSubPos);
          if (segmentIntersectsSphere(p.prevPos, p.pos, tmpSubPos, CALIBRATED_HIT_RADII.capitalSubsystem)) {
            hitSub = k;
            break;
          }
        }
        let hitBridge = false;
        if (!cap.status.bridgeDestroyed) {
          cap.bridgeMesh.getWorldPosition(tmpSubPos);
          if (segmentIntersectsSphere(p.prevPos, p.pos, tmpSubPos, CALIBRATED_HIT_RADII.capitalBridge)) {
            hitBridge = true;
          }
        }
        const hitCapHull =
          hitSub !== null ||
          hitBridge ||
          segmentIntersectsSphere(p.prevPos, p.pos, cap.root.position, CALIBRATED_HIT_RADII.capitalHull);
        if (hitCapHull) {
          const falloff = computeDistanceDamageFalloff(p.weaponKind, p.traveledMeters);
          if (falloff > 0) {
            remove = true;
            hitSomething = true;
            shotsHit++;
            // Guard Void Harvester Phase 2 central shield until all 3 rotating Energy Cores are destroyed
            if (activeBossSm?.mainHullInvulnerable && !hitSub) {
              explosions.spawnShieldRipple(p.pos.clone(), 28, 0x22d3ee);
              showToast(
                activeBossSm.invulnerableReason
                  ? `BARRIER LOCKED — ${activeBossSm.invulnerableReason}!`
                  : 'CENTRAL SHIELD LOCKED — DESTROY ENERGY CORES!',
                2.0,
              );
              callbacks.onHitConfirm?.(false);
            } else {
            const isWeakPoint = hitSub !== null || hitBridge;
            const weakMult = isWeakPoint ? WEAPON_BALLISTICS[p.weaponKind].weakPointMultiplier : 1.0;
            const bossResMult = activeBossSm?.damageResistanceMult ?? 1.0;
            recordCombatHit(combatScoreState, {
              distanceMeters: p.traveledMeters,
              isWeakPoint,
            });
            hitMarkerTimer = 0.24;
            hitMarkerKill = false;
            const hadShield = cap.status.shield > 0;
            const targetKey = hitSub ?? selectedSubsystem;
            const res = applyCapitalSubsystemDamage(
              cap.status,
              targetKey,
              p.weaponKind,
              getWeaponUpgradeLevel(p.weaponKind),
              shipSpec.capitalDamageMultiplier * mods.capitalDamageMult * falloff * weakMult * bossResMult,
            );
            cap.status = res.ship;
            cap.lastHitAge = 0;

            // Destructible Armor Plating (3 layers shatter progressively as hull drops)
            const hullFracNow = cap.status.hull / Math.max(1, cap.status.maxHull);
            const nextPlates = hullFracNow > 0.72 ? 3 : hullFracNow > 0.44 ? 2 : hullFracNow > 0.18 ? 1 : 0;
            if (nextPlates < cap.status.armorPlatesRemaining) {
              cap.status.armorPlatesRemaining = nextPlates;
              explosions.spawnExplosion(p.pos.clone(), 3.2, { isSpace: true, colorHex: 0xff8c38 });
              showToast(`${cap.status.name.toUpperCase()} — ARMOR SECTION SHATTERED (${nextPlates}/3 LEFT)!`, 2.8);
            }

            // Destructible Command Bridge damage (when hit directly or shields down)
            if ((hitBridge || (!hadShield && p.weaponKind === 'rail_cannon')) && !cap.status.bridgeDestroyed) {
              const bridgeDmg = Math.round(p.damage * falloff * weakMult * bossResMult * (hitBridge ? 1.4 : 0.45));
              cap.status.bridgeHealth = Math.max(0, cap.status.bridgeHealth - bridgeDmg);
              if (cap.status.bridgeHealth <= 0) {
                cap.status.bridgeDestroyed = true;
                cap.bridgeMesh.visible = false;
                cap.bridgeMesh.getWorldPosition(tmpSubPos);
                explosions.spawnExplosion(tmpSubPos.clone(), 4.6, { isSpace: true, colorHex: 0xff5a22 });
                recordSubsystemBreakScore(combatScoreState);
                showToast(`${cap.status.name.toUpperCase()} — COMMAND BRIDGE DESTROYED! FIREPOWER CRIPPLED!`, 3.6);
              }
            }

            if (hadShield) {
              explosions.spawnShieldRipple(
                p.pos.clone(),
                24,
                p.weaponKind === 'emp' ? 0x9b7bff : p.weaponKind === 'rail_cannon' ? 0xd0f4ff : 0x5cc8ff,
              );
            }
            explosions.spawnWeaponImpactDebris(p.pos.clone(), p.weaponKind, {
              isShield: hadShield,
              targetClass: 'capital',
              impactDir: p.vel,
            });
            callbacks.onWeaponImpact?.({
              weapon: p.weaponKind,
              worldPos: p.pos.clone(),
              isShield: hadShield,
              targetClass: 'capital',
              killed: Boolean(res.subsystemDestroyedNow || cap.status.destroyed),
            });

            if (p.weaponKind === 'emp') {
              for (let k = 0; k < enemies.length; k++) {
                const escort = enemies[k];
                if (!escort.alive) continue;
                if (escort.pos.distanceTo(p.pos) <= 48) {
                  escort.shield = Math.max(0, escort.shield - Math.round(p.damage * 2.2));
                  escort.empStunTimer = Math.max(escort.empStunTimer, SPACE_WEAPONS.emp.empDisableSec * 0.7);
                  escort.lastHitAge = 0;
                  explosions.spawnShieldRipple(escort.pos.clone(), 10, 0x9b7bff);
                }
              }
            }

            if (p.weaponKind === 'rail_cannon') {
              callbacks.onRailHullImpact?.({
                worldPos: p.pos.clone(),
                targetClass: 'capital',
                distanceMeters: p.pos.distanceTo(ship.root.position),
                directHull: !hadShield,
                killed: Boolean(res.subsystemDestroyedNow || cap.status.destroyed),
              });
            }
            callbacks.onHitConfirm?.(Boolean(res.subsystemDestroyedNow || cap.status.destroyed));
            if (res.subsystemDestroyedNow) {
              hitMarkerKill = true;
              hitMarkerTimer = 0.42;
              subsystemsDestroyedCount++;
              recordSubsystemBreakScore(combatScoreState);
              emitDialogueLine('subsystem_destroyed');
              getSubsystemWorldPos(cap, res.subsystemDestroyedNow, tmpSubPos);
              explosions.spawnExplosion(tmpSubPos.clone(), 3.9, { isSpace: true, colorHex: 0xff5a22 });
              showToast(
                `${cap.status.name.toUpperCase()} — ${cap.status.subsystems[res.subsystemDestroyedNow].label.toUpperCase()} DESTROYED!`,
                3.2,
              );
              callbacks.onSubsystemDestroyed?.(
                cap.status.name,
                res.subsystemDestroyedNow,
                tmpSubPos.clone(),
              );
              const nextIntact = CAPITAL_SUBSYSTEM_KEYS.find((k) => !cap.status.subsystems[k].destroyed);
              selectedSubsystem = nextIntact ?? null;
              checkSpaceMissionCompletion();
            }
            if (
              cap.status.destroyed &&
              !cap.criticalCountdown &&
              activeBossSm?.bossId !== 'sovereign_extinction'
            ) {
              hitMarkerKill = true;
              hitMarkerTimer = 0.55;
              cap.destroyedFlashTimer = 3.6;
              cap.criticalCountdown = createCapitalCriticalCountdown(cap.status.name, cap.status.shipClass);
              showToast(
                `${cap.status.name.toUpperCase()} — REACTOR CRITICAL! DETONATION IN 3s — ESCAPE NOW!`,
                4.0,
              );
              callbacks.onCriticalCountdownBeep?.(3);
              explosions.spawnWeaponImpactDebris(cap.root.position.clone(), 'emp', {
                isShield: false,
                targetClass: 'capital',
                scale: 2.8,
              });
            }
            }
          }
        }
      }

      // Swept Enemy Starfighter & Medium Warship Hits (Calibrated hull hit radii + physical falloff!)
      if (!hitSomething && (p.fromPlayer || p.fromAlly)) {
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.alive) continue;
          const hitRad =
            e.shipClass === 'medium'
              ? CALIBRATED_HIT_RADII.mediumWarship
              : e.isLegendary || e.role === 'heavy_fighter' || e.role === 'bomber'
                ? CALIBRATED_HIT_RADII.fighterHeavyOrAce
                : CALIBRATED_HIT_RADII.fighterStandard;
          if (segmentIntersectsSphere(p.prevPos, p.pos, e.pos, hitRad)) {
            const falloff = p.fromPlayer
              ? computeDistanceDamageFalloff(p.weaponKind, p.traveledMeters)
              : 1.0;
            if (falloff <= 0) break;

            remove = true;
            hitSomething = true;
            let effectiveDmg = p.damage * falloff;
            if (p.fromPlayer) {
              shotsHit++;
              recordCombatHit(combatScoreState, { distanceMeters: p.traveledMeters });
              const streakMult = computeConsecutiveHitMultiplier(
                p.weaponKind,
                combatScoreState.consecutiveHits,
              );
              effectiveDmg *= streakMult;
            }
            e.lastHitAge = 0;
            const hadShield = e.shield > 0;
            let breakdown = computeWeaponDamageBreakdown({
              weapon: p.weaponKind,
              baseDamage: Math.max(1, Math.round(effectiveDmg)),
              targetShield: e.shield,
              targetHull: e.health,
            });
            if (e.isExecutionerBoss && activeBossSm) {
              const bossRes = applyStandaloneBossDamage(activeBossSm, effectiveDmg, {
                isEmp: p.weaponKind === 'emp',
              });
              activeBossSm = bossRes.state;
              breakdown = {
                ...breakdown,
                nextShield: bossRes.state.shield,
                nextHull: bossRes.state.hp,
                destroyed: bossRes.killed,
              };
            }
            e.shield = breakdown.nextShield;
            e.health = breakdown.nextHull;

            if (
              e.isLegendary &&
              e.legendaryDef &&
              !e.legendaryPhase2Triggered &&
              !breakdown.destroyed &&
              e.health / Math.max(1, e.maxHealth) <= 0.5
            ) {
              e.legendaryPhase2Triggered = true;
              e.evasionTimer = 2.6;
              e.maneuverState = 'vertical_climb_dive';
              e.stateTimer = 2.8;
              callbacks.onLegendaryPilotEvent?.('phase2', e.legendaryDef);
              emitDialogueLine('ace_phase2', {
                speaker: e.legendaryDef.name,
                callsign: e.legendaryDef.callsign,
                text: e.legendaryDef.phase2Transmission,
              });
              activeMissionEventBanner = `${e.legendaryDef.callsign} — PHASE II OVERDRIVE ENGAGED`;
              activeMissionEventTimer = 4.2;
              showToast(e.legendaryDef.phase2Transmission, 3.4);
            }

            if (p.fromPlayer && breakdown.empDisableSec > 0) {
              e.empStunTimer = Math.max(e.empStunTimer, breakdown.empDisableSec);
              showToast(`EMP BURST — ${e.name.toUpperCase()} SYSTEMS DISABLED`, 1.7);
              for (let k = 0; k < enemies.length; k++) {
                const other = enemies[k];
                if (!other.alive || other === e) continue;
                if (other.pos.distanceTo(e.pos) <= breakdown.empAoeRadius) {
                  other.shield = Math.max(0, other.shield - Math.round(effectiveDmg * 2.4));
                  other.empStunTimer = Math.max(other.empStunTimer, breakdown.empDisableSec * 0.65);
                  other.lastHitAge = 0;
                  explosions.spawnShieldRipple(other.pos.clone(), 10, 0x9b7bff);
                }
              }
            } else if (p.fromPlayer && breakdown.plasmaSplashRadius > 0) {
              const splashDmg = Math.max(8, Math.round(effectiveDmg * 0.42));
              for (let k = 0; k < enemies.length; k++) {
                const other = enemies[k];
                if (!other.alive || other === e) continue;
                if (other.pos.distanceTo(e.pos) <= breakdown.plasmaSplashRadius) {
                  const splashRes = computeWeaponDamageBreakdown({
                    weapon: 'heavy_plasma',
                    baseDamage: splashDmg,
                    targetShield: other.shield,
                    targetHull: other.health,
                  });
                  other.shield = splashRes.nextShield;
                  other.health = splashRes.nextHull;
                  other.lastHitAge = 0;
                  explosions.spawnWeaponImpactDebris(other.pos.clone(), 'heavy_plasma', {
                    isShield: other.shield > 0,
                    targetClass: other.shipClass,
                    scale: 0.75,
                  });
                  if (splashRes.destroyed) {
                    other.alive = false;
                    other.destroyedFlashTimer = 1.1;
                    sectorDynamicGroup.remove(other.root);
                    kills++;
                    missionKills++;
                    recordCombatKill(combatScoreState, {
                      shipClass: other.shipClass,
                      isEliteOrAce: other.role === 'elite_ace',
                      isLegendary: other.isLegendary,
                      distanceMeters: other.pos.distanceTo(ship.root.position),
                    });
                    triggerClassDestruction(
                      other.pos,
                      other.shipClass,
                      other.role,
                      other.isLegendary,
                      other.vel,
                      1.0,
                    );
                    callbacks.onEnemyDestroyed?.(other.name, other.pos.clone());
                    if (lockedTarget === other) {
                      lockedTarget = null;
                      lockProgress = 0;
                    }
                    checkSpaceMissionCompletion();
                  }
                }
              }
            }

            if (
              !breakdown.destroyed &&
              (e.role === 'interceptor' || e.role === 'elite_ace' || e.role === 'scout') &&
              Math.random() < tacticalProfile.evasiveBreakChance
            ) {
              e.evasionTimer = Math.max(e.evasionTimer, 1.5);
            }

            if (hadShield) {
              explosions.spawnShieldRipple(
                e.pos.clone(),
                e.shipClass === 'medium' ? 22 : 12,
                p.weaponKind === 'emp' ? 0x9b7bff : p.weaponKind === 'rail_cannon' ? 0xd0f4ff : 0x5cc8ff,
              );
            }
            explosions.spawnWeaponImpactDebris(p.pos.clone(), p.weaponKind, {
              isShield: hadShield,
              targetClass: e.shipClass,
              impactDir: p.vel,
            });
            if (p.fromPlayer) {
              callbacks.onWeaponImpact?.({
                weapon: p.weaponKind,
                worldPos: p.pos.clone(),
                isShield: hadShield,
                targetClass: e.shipClass,
                killed: breakdown.destroyed,
              });
              if (p.weaponKind === 'rail_cannon') {
                callbacks.onRailHullImpact?.({
                  worldPos: p.pos.clone(),
                  targetClass: e.shipClass,
                  distanceMeters: p.pos.distanceTo(ship.root.position),
                  directHull: !hadShield,
                  killed: breakdown.destroyed,
                });
              }
              hitMarkerTimer = breakdown.destroyed ? 0.38 : 0.2;
              hitMarkerKill = breakdown.destroyed;
              callbacks.onHitConfirm?.(breakdown.destroyed);
            }

            if (breakdown.destroyed) {
              e.alive = false;
              e.destroyedFlashTimer = 1.1;
              sectorDynamicGroup.remove(e.root);
              kills++;
              missionKills++;
              if (p.fromPlayer) {
                const prevMulti = combatScoreState.multiKillsCount;
                recordCombatKill(combatScoreState, {
                  shipClass: e.shipClass,
                  isEliteOrAce: e.role === 'elite_ace',
                  isLegendary: e.isLegendary,
                  distanceMeters: p.traveledMeters,
                });
                if (combatScoreState.multiKillsCount > prevMulti) {
                  emitDialogueLine('multi_kill');
                } else if (!e.isLegendary) {
                  emitDialogueLine('enemy_eliminated');
                }
              } else if (p.fromAlly && p.shooterWingmanId) {
                const shooter = wingmen.find((w) => w.id === p.shooterWingmanId);
                if (shooter) shooter.kills++;
              }
              triggerClassDestruction(
                e.pos,
                e.shipClass,
                e.role,
                e.isLegendary,
                e.vel,
                1.0,
              );
              if (e.isLegendary && e.legendaryDef) {
                legendaryDefeatedInMission = true;
                legendaryBonusSalvageEarned += e.legendaryDef.bonusSalvage;
                callbacks.onLegendaryPilotEvent?.('defeated', e.legendaryDef);
                emitDialogueLine('ace_defeated', {
                  speaker: e.legendaryDef.name,
                  callsign: e.legendaryDef.callsign,
                  text: e.legendaryDef.defeatTransmission,
                });
                activeMissionEventBanner = `LEGENDARY ACE DOWN — ${e.legendaryDef.name.toUpperCase()} (+${e.legendaryDef.bonusSalvage} SALVAGE)`;
                activeMissionEventTimer = 5.0;
                showToast(e.legendaryDef.defeatTransmission, 3.8);
              } else {
                showToast(`${e.name.toUpperCase()} DESTROYED`, 2.0);
              }
              callbacks.onEnemyDestroyed?.(e.name, e.pos.clone());
              if (lockedTarget === e) {
                lockedTarget = null;
                lockProgress = 0;
              }
              checkSpaceMissionCompletion();
            }
            break;
          }
        }
      } else if (!hitSomething && !p.fromPlayer && !p.fromAlly && p.damage > 0 && playable && vitals.hull > 0 && !missionCompleted) {
        let hitWingman = false;
        for (let wi = 0; wi < wingmen.length; wi++) {
          const w = wingmen[wi];
          if (!w.active || w.status === 'disabled') continue;
          if (segmentIntersectsSphere(p.prevPos, p.pos, w.pos, CALIBRATED_HIT_RADII.wingmanHull)) {
            remove = true;
            hitSomething = true;
            hitWingman = true;
            let rem = p.damage;
            if (w.shield > 0) {
              const abs = Math.min(w.shield, rem);
              w.shield -= abs;
              rem -= abs;
              explosions.spawnShieldRipple(w.pos.clone(), 8, 0x5cc8ff);
            }
            if (rem > 0) {
              w.hull = Math.max(0, w.hull - rem);
              explosions.spawnImpactSparks(w.pos.clone(), 0xff8c42, 1.1);
            }
            if (w.hull <= 0) {
              w.status = 'disabled';
              w.root.visible = false;
              explosions.spawnExplosion(w.pos.clone(), 2.2, { isSpace: true });
              const downMsg = `${w.callsign} (${w.pilotName}): "Engines hit — ejecting to rescue pod!"`;
              showToast(downMsg, 3.0);
              callbacks.onWingmanComms?.(downMsg, activeWingmanCommand);
            }
            break;
          }
        }

        if (!hitWingman && segmentIntersectsSphere(p.prevPos, p.pos, ship.root.position, CALIBRATED_HIT_RADII.playerHull)) {
          remove = true;
          hitSomething = true;
          timeSinceDamaged = 0;
          const fromDir = tmpVec.subVectors(p.prevPos, ship.root.position).normalize();
          const relRight = fromDir.dot(shipRight);
          const relUp = fromDir.dot(shipUp);
          const relFwd = fromDir.dot(shipForward);
          incomingDamageAngleDeg = Math.round(
            (Math.atan2(relRight, relFwd < -0.5 ? -0.6 : Math.max(-0.5, relUp)) * 180) / Math.PI,
          );
          incomingDamageIndicatorTimer = 0.72;

          const prevHull = vitals.hull;
          const hadPlayerShield = vitals.shield > 0;
          const dmgRes = applyShipDamage(vitals, p.damage);
          vitals.shield = dmgRes.shield;
          vitals.hull = dmgRes.hull;
          vitals.engineIntegrity = dmgRes.engineIntegrity;
          const hullLost = Math.max(0, prevHull - vitals.hull);
          if (hullLost > 0) {
            recordPlayerHullDamagePenalty(combatScoreState, hullLost);
          }
          if (vitals.hull > 0 && vitals.hull / Math.max(1, vitals.maxHull) < 0.34) {
            emitDialogueLine('player_critical');
          }
          ship.addCameraShake(0.35);
          if (hadPlayerShield) {
            explosions.spawnShieldRipple(ship.root.position.clone(), 9.5, 0x5cc8ff);
            callbacks.onShieldHit?.();
          } else {
            explosions.spawnImpactSparks(p.pos.clone(), 0xff8c42, 1.1);
            callbacks.onHullHit?.();
          }
          if (dmgRes.destroyed) {
            explosions.spawnExplosion(ship.root.position.clone(), 3.4, { isSpace: true });
            showToast(`${shipSpec.name.toUpperCase()} HULL CRITICAL — SIGNAL LOST`, 3.0);
            reportMissionFailure('enemy_fire');
          }
          callbacks.onPlayerShipDamaged?.(dmgRes.destroyed);
        } else if (
          !hitWingman &&
          !p.nearMissAwarded &&
          nearMissCooldownSec <= 0 &&
          segmentIntersectsSphere(p.prevPos, p.pos, ship.root.position, CALIBRATED_HIT_RADII.nearMissOuterRadius)
        ) {
          p.nearMissAwarded = true;
          nearMissCooldownSec = 2.6;
          recordNearMissBonus(combatScoreState);
          emitDialogueLine('near_miss');
        }
      }

      if (remove) {
        if (p.fromPlayer && !hitSomething) {
          recordCombatMiss(combatScoreState);
        }
        releasePooledProjectile(i);
      }
    }
    incomingMissile = hasIncoming;
  };

  return {
    root,
    setVisible: (visible: boolean) => {
      root.visible = visible;
    },
    enterCombat: (ship, encounterOrRegion, missionOverride, levelOverride = null) => {
      root.visible = true;
      if (isSpaceRegionId(encounterOrRegion)) {
        travelToRegion(encounterOrRegion, ship, missionOverride, false, levelOverride);
      } else if (encounterOrRegion && encounterOrRegion in SPACE_ENCOUNTERS) {
        travelToRegion(
          SPACE_ENCOUNTERS[encounterOrRegion].mappedRegionId,
          ship,
          missionOverride,
          false,
          levelOverride,
        );
      } else if (levelOverride?.spaceRegionId) {
        travelToRegion(levelOverride.spaceRegionId, ship, missionOverride, false, levelOverride);
      } else if (missionOverride?.spaceRegionId) {
        travelToRegion(missionOverride.spaceRegionId, ship, missionOverride, false, levelOverride);
      } else {
        resetPlayerCombatState(ship);
      }
    },
    travelToRegion,
    getCurrentRegionId: () => currentRegionId,
    setEncounter,
    getEncounterId: () => currentEncounterId,
    applySpaceLoadout,
    selectWeapon,
    cycleWeapon,
    cycleTarget,
    toggleSupercruise,
    toggleAutopilot,
    setAiUpdateMultiplier: (mult: number) => {
      aiUpdateIntervalMultiplier = Math.max(0.8, Math.min(2.5, mult));
    },
    setCampaignDifficulty: (difficulty: DifficultyId) => {
      activeDifficulty = difficulty;
    },
    setInputState: (partial) => {
      Object.assign(input, partial);
    },
    clearFlightInputs,
    addLookDelta: (dx, dy) => {
      input.yawDelta += dx;
      input.pitchDelta += dy;
    },
    setFiringPrimary: (down) => {
      primaryFiring = down;
      if (!down) {
        railChargeSec = 0;
        railChargeAudioTick = 0;
      }
    },
    fireMissile: () => fireMissile(),
    triggerCountermeasure,
    useRepairKit,
    setFlightSettings: (settings) => {
      flightSettings = { ...settings };
    },
    getFlightSettings: () => ({ ...flightSettings }),
    respawnInOrbit: (ship) => resetPlayerCombatState(ship),
    forceCompleteMission,
    triggerDebugPlayerDestruction: (ship, cause = 'enemy_fire') => {
      vitals.shield = 0;
      vitals.hull = 0;
      explosions.spawnExplosion(ship.root.position.clone(), 3.5, { isSpace: true });
      callbacks.onPlayerShipDamaged?.(true);
      reportMissionFailure(cause);
    },
    runLiveBallisticsCheck: (ship, camera, opts) => {
      // Deterministic in-engine live 3D projectile probe for Playwright verification
      for (let i = projectiles.length - 1; i >= 0; i--) {
        root.remove(projectiles[i].mesh);
      }
      projectiles.length = 0;
      const target = enemies.find((e) => e.alive);
      const missilesBefore = vitals.missiles;
      if (!target) {
        return {
          fired: false,
          hit: false,
          damageDealt: 0,
          elapsedSec: 0,
          projectileTraveledMeters: 0,
          targetShieldAfter: 0,
          targetHullAfter: 0,
          missilesBefore,
          missilesAfter: vitals.missiles,
        };
      }

      // Position ship cleanly facing -Z and place target at exact distance & angular offset
      ship.root.position.set(activeCenter.x, activeCenter.y + 420, activeCenter.z);
      ship.root.quaternion.identity();
      const rad = ((opts.aimOffsetDeg ?? 0) * Math.PI) / 180;
      target.pos.set(
        ship.root.position.x + Math.sin(rad) * opts.targetDistanceMeters,
        ship.root.position.y,
        ship.root.position.z - Math.cos(rad) * opts.targetDistanceMeters,
      );
      target.root.position.copy(target.pos);
      target.vel.set(opts.targetLateralSpeed ?? 0, 0, 0);
      target.health = target.maxHealth;
      target.shield = target.maxShield;
      const initialTotal = target.health + target.shield;

      lockedTarget = opts.withLock ? target : null;
      lockProgress = opts.withLock ? 1.0 : 0;
      selectedSubsystem = null;
      activeWeapon = opts.weapon;
      primaryCooldown = 0;
      missileCooldown = 0;
      vitals.weaponHeat = 0;
      weaponOverheated = false;
      vitals.speed = 0;

      const beforeCount = projectiles.length;
      if (opts.weapon === 'missile') {
        fireMissile(ship);
      } else {
        fireActiveWeapon(ship);
      }
      const fired = projectiles.length > beforeCount;
      let elapsed = 0;
      let maxTraveled = 0;
      const maxSim = opts.maxSimSec ?? 3.6;
      const dtStep = 0.02;
      while (fired && projectiles.length > 0 && elapsed < maxSim) {
        for (const pr of projectiles) {
          if (pr.traveledMeters > maxTraveled) maxTraveled = pr.traveledMeters;
        }
        // Keep probe target moving smoothly at exact requested lateral speed
        target.pos.x += (opts.targetLateralSpeed ?? 0) * dtStep;
        target.root.position.copy(target.pos);
        update(dtStep, elapsed, ship, camera, false);
        elapsed += dtStep;
        if (target.health + target.shield < initialTotal) {
          break;
        }
      }
      const damageDealt = Math.max(0, initialTotal - (target.health + target.shield));
      return {
        fired,
        hit: damageDealt > 0,
        damageDealt,
        elapsedSec: Number(elapsed.toFixed(3)),
        projectileTraveledMeters: Number(maxTraveled.toFixed(1)),
        targetShieldAfter: target.shield,
        targetHullAfter: target.health,
        missilesBefore,
        missilesAfter: vitals.missiles,
      };
    },
    fireDebugVolley: (ship) => {
      if (activeCapitalShip && !activeCapitalShip.status.destroyed) {
        selectedSubsystem =
          CAPITAL_SUBSYSTEM_KEYS.find((k) => !activeCapitalShip!.status.subsystems[k].destroyed) ??
          'shields';
        getSubsystemWorldPos(activeCapitalShip, selectedSubsystem, tmpSubPos);
        ship.root.position.copy(tmpSubPos).add(new THREE.Vector3(0, 60, 420));
        ship.root.lookAt(tmpSubPos);
        ship.root.rotateY(Math.PI);
      } else {
        const alive = enemies.find((e) => e.alive);
        if (alive) {
          ship.root.position.copy(alive.pos).add(new THREE.Vector3(0, 22, 185));
          ship.root.lookAt(alive.pos);
          ship.root.rotateY(Math.PI);
          lockedTarget = alive;
          lockProgress = 1;
        }
      }
      fireActiveWeapon(ship);
      missileCooldown = 0;
      fireMissile(ship);
    },
    destroyDebugSubsystem: (key: CapitalSubsystemKey) => {
      const cap = activeCapitalShip;
      if (!cap || cap.criticalCountdown?.detonated) return;
      cap.status.shield = 0;
      const res = applyCapitalSubsystemDamage(cap.status, key, 'rail_cannon', 1, 1.0);
      res.ship.subsystems[key].health = 0;
      res.ship.subsystems[key].destroyed = true;
      cap.status = res.ship;
      cap.subsystemMeshes[key].visible = false;
      subsystemsDestroyedCount++;
      getSubsystemWorldPos(cap, key, tmpSubPos);
      explosions.spawnExplosion(tmpSubPos.clone(), 4.2, { isSpace: true, colorHex: 0xff5a22 });
      showToast(
        `${cap.status.name.toUpperCase()} — ${cap.status.subsystems[key].label.toUpperCase()} DESTROYED!`,
        3.2,
      );
      callbacks.onSubsystemDestroyed?.(cap.status.name, key);

      const allDestroyed = CAPITAL_SUBSYSTEM_KEYS.every((k) => cap.status.subsystems[k].destroyed);
      if ((allDestroyed || cap.status.destroyed) && !cap.criticalCountdown) {
        cap.status.hull = 0;
        cap.status.destroyed = true;
        hitMarkerKill = true;
        hitMarkerTimer = 0.55;
        cap.destroyedFlashTimer = 3.6;
        cap.criticalCountdown = createCapitalCriticalCountdown(
          cap.status.name,
          cap.status.shipClass,
        );
        callbacks.onCriticalCountdownBeep?.(3);
        showToast(
          `${cap.status.name.toUpperCase()} — REACTOR CRITICAL! DETONATION IN 3s — ESCAPE NOW!`,
          4.0,
        );
      }
    },
    triggerDebugAsteroidCollision: (ship, severity = 'severe') => {
      const bigRock = asteroids.find((a) => a.tier === 'large') ?? asteroids[0];
      shipForward.set(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
      shipRight.set(1, 0, 0).applyQuaternion(ship.root.quaternion).normalize();
      if (bigRock) {
        bigRock.pos
          .copy(ship.root.position)
          .addScaledVector(shipForward, bigRock.radius + 16)
          .addScaledVector(shipRight, -10);
        bigRock.mesh.position.copy(bigRock.pos);
      }
      vitals.shield = severity === 'severe' ? 35 : 55;
      const normal = shipForward.clone().negate().addScaledVector(shipRight, 0.5).normalize();
      handleAsteroidImpact(
        ship,
        normal,
        severity === 'severe' ? 6.5 : severity === 'medium' ? 3.2 : 0.8,
        bigRock?.radius ?? 26,
        severity === 'severe' ? 108 : severity === 'medium' ? 76 : 36,
        severity === 'severe' ? 0.78 : 0.55,
        severity === 'severe' ? 'engine' : 'wing',
      );
    },
    inspectPlayerShip: (camera, ship, angle) => {
      ship.root.visible = true;
      ship.setViewMode('chase');
      ship.root.quaternion.setFromEuler(new THREE.Euler(0.04, 0.48, -0.05));
      const boostMode = angle === 'rear' || angle === 'boost_rear';
      ship.setThrustLevel(boostMode ? 1.0 : 0.65, boostMode, angle === 'boost_rear');
      ship.updateVisuals(0.016, 2.6, 0, 0);
      ship.root.updateMatrixWorld(true);
      const q = ship.root.quaternion;
      const offset =
        angle === 'front'
          ? new THREE.Vector3(5.2, 3.3, -13.6)
          : angle === 'side'
            ? new THREE.Vector3(16.2, 3.0, -0.5)
            : angle === 'boost_rear'
              ? new THREE.Vector3(-6.8, 4.2, 14.2)
              : angle === 'rear'
                ? new THREE.Vector3(-4.4, 3.6, 15.0)
                : new THREE.Vector3(10.8, 4.5, -10.8);
      offset.applyQuaternion(q).add(ship.root.position);
      const target = new THREE.Vector3(0, 1.55, angle === 'boost_rear' ? 2.4 : -0.5)
        .applyQuaternion(q)
        .add(ship.root.position);
      camera.position.copy(offset);
      camera.up.set(0, 1, 0).applyQuaternion(q);
      camera.fov = 48;
      camera.updateProjectionMatrix();
      camera.lookAt(target);
      skyDome.position.copy(camera.position);
    },
    inspectEnemyClass: (camera, ship, cls) => {
      ship.root.visible = true;
      ship.setViewMode('chase');
      if (cls === 'capital') {
        if (!activeCapitalShip || activeCapitalShip.status.destroyed) {
          travelToRegion('shattered_fleet', ship, undefined, false);
        }
        if (!activeCapitalShip) return false;
        const cap = activeCapitalShip;
        ship.root.position.copy(cap.root.position).add(new THREE.Vector3(-420, -180, -760));
        camera.position.copy(cap.root.position).add(new THREE.Vector3(390, 175, 640));
        camera.up.set(0, 1, 0);
        camera.fov = 50;
        camera.updateProjectionMatrix();
        camera.lookAt(cap.root.position.clone().add(new THREE.Vector3(0, 22, 45)));
        skyDome.position.copy(camera.position);
        selectedSubsystem = 'shields';
        lockedTarget = null;
        return true;
      }
      if (cls === 'medium' && !enemies.some((e) => e.alive && e.shipClass === 'medium')) {
        travelToRegion('shattered_fleet', ship, undefined, false);
      }
      const targetEnemy =
        cls === 'medium'
          ? enemies.find((e) => e.alive && e.shipClass === 'medium')
          : enemies.find((e) => e.alive && (e.role === 'interceptor' || e.role === 'elite_ace')) ??
          enemies.find((e) => e.alive && e.shipClass === 'fighter');
      if (!targetEnemy) return false;
      // Orient target cleanly so solar key light illuminates its sculpted armor & dark canopy
      targetEnemy.root.rotation.set(0.08, 2.35, -0.14);
      targetEnemy.root.updateMatrixWorld(true);
      lockedTarget = targetEnemy;
      selectedSubsystem = null;
      lockProgress = 1.0;
      const dist = cls === 'medium' ? 40 : 15.5;
      ship.root.position.copy(targetEnemy.pos).add(new THREE.Vector3(-dist * 4, -dist * 2, -dist * 4));
      camera.position.copy(targetEnemy.pos).add(new THREE.Vector3(dist * 0.72, dist * (cls === 'medium' ? 0.56 : 0.48), dist * 0.84));
      camera.up.set(0, 1, 0);
      camera.fov = 48;
      camera.updateProjectionMatrix();
      camera.lookAt(targetEnemy.pos.clone().add(new THREE.Vector3(0, cls === 'medium' ? 1.8 : 0.35, 0)));
      skyDome.position.copy(camera.position);
      return true;
    },
    inspectOpenDeepSpace: (camera, ship) => {
      if (currentRegionId !== 'low_orbit') {
        travelToRegion('low_orbit', ship, undefined, false);
      }
      ship.setViewMode('chase');
      ship.root.visible = false;
      camera.position.set(1450, 4120, 4600);
      camera.up.set(0, 1, 0);
      camera.fov = 56;
      camera.updateProjectionMatrix();
      camera.lookAt(new THREE.Vector3(-1250, 2650, -3400));
      skyDome.position.copy(camera.position);
    },
    inspectAsteroidCloseUp: (camera, ship) => {
      if (currentRegionId !== 'debris_belt') {
        travelToRegion('debris_belt', ship, undefined, false);
      }
      ship.setViewMode('chase');
      ship.root.visible = false;
      const heroRock =
        asteroids.find((a) => a.tier === 'large' && a.radius >= 45) ??
        asteroids.find((a) => a.tier === 'large') ??
        asteroids[0];
      if (heroRock) {
        const d = heroRock.radius * 2.48;
        camera.position.copy(heroRock.pos).add(new THREE.Vector3(d * 0.72, d * 0.34, d * 0.68));
        camera.up.set(0, 1, 0);
        camera.fov = 48;
        camera.updateProjectionMatrix();
        camera.lookAt(heroRock.pos);
        skyDome.position.copy(camera.position);
      }
    },
    inspectAsteroidCombat: (camera, ship) => {
      if (currentRegionId !== 'debris_belt') {
        travelToRegion('debris_belt', ship, undefined, false);
      }
      ship.root.visible = true;
      ship.setViewMode('chase');
      const largeAst = asteroids.find((a) => a.tier === 'large') ?? asteroids[0];
      const anchor = largeAst ? largeAst.pos.clone() : activeCenter.clone();
      ship.root.position.copy(anchor).add(new THREE.Vector3(-48, 12, 168));
      ship.root.lookAt(anchor.clone().add(new THREE.Vector3(18, 4, -80)));
      ship.root.rotateY(Math.PI);

      // Position 3 hostile fighters weaving aggressively through the asteroid corridor right ahead
      const liveEnemies = enemies.filter((e) => e.alive).slice(0, 3);
      const combatOffsets = [
        new THREE.Vector3(-12, 8, -110),
        new THREE.Vector3(46, 22, -165),
        new THREE.Vector3(-64, -14, -195),
      ];
      liveEnemies.forEach((e, idx) => {
        const off = combatOffsets[idx] ?? new THREE.Vector3(0, 0, -140);
        e.pos.copy(ship.root.position).add(off);
        e.root.position.copy(e.pos);
        e.root.lookAt(ship.root.position);
        e.lastHitAge = 0;
      });
      if (liveEnemies[0]) {
        lockedTarget = liveEnemies[0];
        lockProgress = 1.0;
        explosions.spawnExplosion(liveEnemies[0].pos.clone().add(new THREE.Vector3(8, 2, 12)), 2.2, {
          isSpace: true,
        });
        explosions.spawnImpactSparks(liveEnemies[0].pos.clone(), 0xffb347, 1.5);
      }
      ship.setThrustLevel(0.95, true, false);
      ship.updateVisuals(0.016, 4.0, 0.08, -0.18);
      ship.updateCamera(camera, 1.0, true, false);
      skyDome.position.copy(camera.position);
      // Fire twin visible pulse cannons straight down the asteroid lane
      activeWeapon = 'pulse';
      fireActiveWeapon(ship);
    },
    focusAsteroidBelt: (camera, ship) => {
      ship.root.visible = true;
      if (currentRegionId !== 'debris_belt') {
        travelToRegion('debris_belt', ship, undefined, false);
      }
      const largeAst = asteroids.find((a) => a.tier === 'large') ?? asteroids[0];
      if (largeAst) {
        ship.root.position.copy(largeAst.pos).add(new THREE.Vector3(-42, 18, 155));
        ship.root.lookAt(largeAst.pos.clone().add(new THREE.Vector3(35, -6, -180)));
        ship.root.rotateY(Math.PI);
        ship.updateCamera(camera, 1.0, false, false);
        skyDome.position.copy(camera.position);
      }
    },
    damageTargetedEnemy: (amount = 110) => {
      const target = lockedTarget && lockedTarget.alive ? lockedTarget : enemies.find((e) => e.alive);
      if (!target) return null;
      lockedTarget = target;
      lockProgress = 1;
      target.lastHitAge = 0;
      let rem = amount;
      if (target.shield > 0) {
        const abs = Math.min(target.shield, rem);
        target.shield -= abs;
        rem -= abs;
        explosions.spawnShieldRipple(target.pos.clone(), target.shipClass === 'medium' ? 18 : 9, 0x5cc8ff);
      }
      if (rem > 0) {
        target.health = Math.max(0, target.health - rem);
        explosions.spawnImpactSparks(target.pos.clone(), 0xffb347, 1.3);
      }
      if (target.health <= 0) {
        target.alive = false;
        target.destroyedFlashTimer = 1.2;
        sectorDynamicGroup.remove(target.root);
        triggerClassDestruction(
          target.pos,
          target.shipClass,
          target.role,
          target.isLegendary,
          target.vel,
          1.0,
        );
        kills++;
        missionKills++;
      }
      return { shield: target.shield, hull: target.health, alive: target.alive };
    },
    triggerDebugShipDestruction: (camera, ship, destructionClass) => {
      ship.root.visible = true;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.root.quaternion).normalize();
      const dist = destructionClass === 'capital' ? 420 : destructionClass === 'heavy' ? 145 : 92;
      const blastPos = ship.root.position
        .clone()
        .addScaledVector(forward, dist)
        .addScaledVector(up, destructionClass === 'capital' ? 18 : 6);
      ship.updateVisuals(0.016, 4.0, 0, 0);
      ship.updateCamera(camera, 1.0, false, false, undefined, true);
      skyDome.position.copy(camera.position);
      explosions.spawnShipDestruction(blastPos, destructionClass, {
        scale: 1.0,
        shipVelocity: new THREE.Vector3(18, 4, -22),
        onStageDetonation: (evt) => {
          callbacks.onShipDestructionStage?.({
            ...evt,
            distanceMeters: evt.pos.distanceTo(ship.root.position),
          });
        },
      });
      return true;
    },
    triggerDebugRailHullImpact: (camera, ship, targetClass = 'medium') => {
      ship.root.visible = true;
      activeWeapon = 'rail_cannon';
      vitals.weaponHeat = Math.min(100, vitals.weaponHeat + 26);

      if (targetClass === 'capital') {
        if (!activeCapitalShip || activeCapitalShip.status.destroyed) {
          travelToRegion('shattered_fleet', ship, undefined, false);
        }
        if (!activeCapitalShip) return false;
        const cap = activeCapitalShip;
        const impactPos = cap.root.position.clone().add(new THREE.Vector3(24, 18, 95));
        ship.root.position.copy(impactPos).add(new THREE.Vector3(-42, -16, 265));
        ship.root.lookAt(impactPos);
        ship.root.rotateY(Math.PI);
        ship.updateVisuals(0.016, 4.0, 0, 0);
        ship.updateCamera(camera, 1.0, false, false);
        skyDome.position.copy(camera.position);

        explosions.spawnImpactSparks(impactPos.clone(), 0xd8f6ff, 2.6);
        explosions.spawnImpactSparks(impactPos.clone(), 0xff9a3c, 2.2);
        explosions.spawnExplosion(impactPos.clone(), 1.9, { isSpace: true, colorHex: 0x8be4ff });
        hitMarkerTimer = 0.28;
        hitMarkerKill = false;
        callbacks.onWeaponFire?.('rail_cannon');
        callbacks.onHitConfirm?.(false);
        callbacks.onRailHullImpact?.({
          worldPos: impactPos,
          targetClass: 'capital',
          distanceMeters: impactPos.distanceTo(ship.root.position),
          directHull: true,
          killed: false,
        });
        return true;
      }

      const candidate =
        (targetClass === 'medium'
          ? enemies.find((e) => e.alive && e.shipClass === 'medium')
          : enemies.find((e) => e.alive && e.shipClass === 'fighter')) ??
        enemies.find((e) => e.alive);
      if (!candidate) return false;

      // Frame the hostile hull plate cleanly in front of the player starfighter for clear visual verification
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.root.quaternion).normalize();
      const dist = candidate.shipClass === 'medium' ? 115 : 88;
      candidate.pos
        .copy(ship.root.position)
        .addScaledVector(forward, dist)
        .addScaledVector(up, 6);
      candidate.root.position.copy(candidate.pos);
      candidate.root.lookAt(ship.root.position);
      candidate.root.rotateY(0.55);
      candidate.shield = 0; // direct armor hull plate impact!
      candidate.health = Math.max(20, candidate.health - 95);
      candidate.lastHitAge = 0;
      lockedTarget = candidate;
      lockProgress = 1.0;

      ship.updateVisuals(0.016, 4.0, 0, 0);
      ship.updateCamera(camera, 1.0, false, false);
      skyDome.position.copy(camera.position);

      const impactPos = candidate.pos.clone().addScaledVector(forward, -6);
      explosions.spawnWeaponImpactDebris(impactPos.clone(), 'rail_cannon', {
        isShield: false,
        targetClass: candidate.shipClass,
        scale: 1.25,
        impactDir: forward,
      });
      explosions.spawnExplosion(impactPos.clone(), 1.45, { isSpace: true, colorHex: 0x8be4ff });
      shotsFired++;
      shotsHit++;
      hitMarkerTimer = 0.28;
      hitMarkerKill = false;
      callbacks.onWeaponFire?.('rail_cannon', 0);
      callbacks.onWeaponImpact?.({
        weapon: 'rail_cannon',
        worldPos: impactPos.clone(),
        isShield: false,
        targetClass: candidate.shipClass,
        killed: false,
      });
      callbacks.onHitConfirm?.(false);
      callbacks.onRailHullImpact?.({
        worldPos: impactPos,
        targetClass: candidate.shipClass,
        distanceMeters: dist,
        directHull: true,
        killed: false,
      });
      return true;
    },
    triggerDebugWeaponImpact: (camera, ship, weapon, targetClass = 'fighter') => {
      if (weapon === 'rail_cannon') {
        ship.root.visible = true;
      }
      activeWeapon = weapon;
      const candidate =
        (targetClass === 'medium'
          ? enemies.find((e) => e.alive && e.shipClass === 'medium')
          : enemies.find((e) => e.alive && e.shipClass === 'fighter')) ??
        enemies.find((e) => e.alive);
      if (!candidate) return false;

      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.root.quaternion).normalize();
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.root.quaternion).normalize();
      const dist = candidate.shipClass === 'medium' ? 110 : 82;
      // Offset slightly left/right by weapon so spatial stereo pan is genuinely non-zero and testable
      const lateralOffset =
        weapon === 'pulse' ? -24 : weapon === 'heavy_plasma' ? 26 : weapon === 'emp' ? -18 : weapon === 'missile' ? 22 : 0;
      candidate.pos
        .copy(ship.root.position)
        .addScaledVector(forward, dist)
        .addScaledVector(right, lateralOffset)
        .addScaledVector(up, 5);
      candidate.root.position.copy(candidate.pos);
      candidate.root.lookAt(ship.root.position);
      candidate.lastHitAge = 0;
      lockedTarget = candidate;
      lockProgress = 1.0;

      ship.updateVisuals(0.016, 4.0, 0, 0);
      ship.updateCamera(camera, 1.0, false, false);
      skyDome.position.copy(camera.position);

      const impactPos = candidate.pos.clone().addScaledVector(forward, -5);
      const isShield = weapon === 'emp' || candidate.shield > 0;
      if (isShield) {
        explosions.spawnShieldRipple(
          candidate.pos.clone(),
          candidate.shipClass === 'medium' ? 18 : 10,
          weapon === 'emp' ? 0x9b7bff : 0x5cc8ff,
        );
      }
      explosions.spawnWeaponImpactDebris(impactPos, weapon, {
        isShield,
        targetClass: candidate.shipClass,
        scale: 1.2,
        impactDir: forward,
      });
      shotsFired++;
      shotsHit++;
      hitMarkerTimer = 0.28;
      hitMarkerKill = false;
      callbacks.onWeaponFire?.(weapon, lateralOffset < 0 ? -0.22 : 0.22);
      callbacks.onWeaponImpact?.({
        weapon,
        worldPos: impactPos,
        isShield,
        targetClass: candidate.shipClass,
        killed: false,
      });
      callbacks.onHitConfirm?.(false);
      if (weapon === 'rail_cannon') {
        callbacks.onRailHullImpact?.({
          worldPos: impactPos,
          targetClass: candidate.shipClass,
          distanceMeters: dist,
          directHull: true,
          killed: false,
        });
      }
      return true;
    },
    setHudViewportContext: (partial) => {
      if (partial.viewportWidth !== undefined) hudViewportCtx.viewportWidth = partial.viewportWidth;
      if (partial.viewportHeight !== undefined) hudViewportCtx.viewportHeight = partial.viewportHeight;
      if (partial.isTouchMode !== undefined) hudViewportCtx.isTouchMode = partial.isTouchMode;
      if (partial.isCompactPhone !== undefined) hudViewportCtx.isCompactPhone = partial.isCompactPhone;
      if (partial.orientation !== undefined) hudViewportCtx.orientation = partial.orientation;
    },
    stageTargetHudScenario: (camera, ship, scenario) => {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.root.quaternion).normalize();
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.root.quaternion).normalize();
      const aliveEnemies = enemies.filter((e) => e.alive);
      if (aliveEnemies.length === 0) return false;

      // Clear smoothing state so staged verification frame is crisp and immediate
      targetHudSmoothState = {};

      // Park unused enemies safely far behind camera unless needed by scenario
      const parkUnused = (keepIds: Set<string>) => {
        for (let i = 0; i < aliveEnemies.length; i++) {
          const e = aliveEnemies[i];
          if (keepIds.has(e.id)) continue;
          e.pos
            .copy(ship.root.position)
            .addScaledVector(forward, -1600 - i * 120)
            .addScaledVector(right, (i % 2 === 0 ? 1 : -1) * 400);
          e.root.position.copy(e.pos);
        }
      };

      const placeEnemy = (
        e: EnemyStarfighter,
        fwdDist: number,
        latDist: number,
        upDist: number,
        shieldFrac = 0.72,
        hullFrac = 0.85,
      ) => {
        e.pos
          .copy(ship.root.position)
          .addScaledVector(forward, fwdDist)
          .addScaledVector(right, latDist)
          .addScaledVector(up, upDist);
        e.root.position.copy(e.pos);
        e.root.lookAt(ship.root.position.clone().addScaledVector(right, 35));
        e.shield = Math.round(e.maxShield * shieldFrac);
        e.health = Math.round(e.maxHealth * hullFrac);
        e.fireCooldown = 0.4;
      };

      if (scenario === 'distant_fighter') {
        const e = aliveEnemies[0];
        parkUnused(new Set([e.id]));
        placeEnemy(e, 1850, 260, 140, 1.0, 1.0);
        e.fireCooldown = 2.5;
        lockedTarget = null;
        selectedSubsystem = null;
        lockProgress = 0;
      } else if (scenario === 'nearby_fighter') {
        const e = aliveEnemies[0];
        parkUnused(new Set([e.id]));
        placeEnemy(e, 86, -16, 12, 0.65, 0.78);
        lockedTarget = e;
        selectedSubsystem = null;
        manualSubsystemLock = false;
        lockProgress = 1.0;
      } else if (scenario === 'formation') {
        const picked = aliveEnemies.slice(0, 4);
        parkUnused(new Set(picked.map((x) => x.id)));
        const offsets: [number, number, number][] = [
          [115, -34, 18],
          [145, 28, 22],
          [175, -62, 6],
          [190, 58, 10],
        ];
        picked.forEach((e, idx) => {
          const [f, r, u] = offsets[idx];
          placeEnemy(e, f, r, u, 0.8 - idx * 0.15, 0.92 - idx * 0.12);
        });
        lockedTarget = picked[0];
        selectedSubsystem = null;
        manualSubsystemLock = false;
        lockProgress = 1.0;
      } else if (scenario === 'elite_ace') {
        const ace = aliveEnemies.find((e) => e.role === 'elite_ace') ?? aliveEnemies[0];
        ace.role = 'elite_ace';
        ace.name = 'Sovereign Elite Ace';
        parkUnused(new Set([ace.id]));
        placeEnemy(ace, 96, 14, 14, 0.42, 0.64);
        ace.lastHitAge = 0.6;
        lockedTarget = ace;
        selectedSubsystem = null;
        manualSubsystemLock = false;
        lockProgress = 1.0;
      } else if (scenario === 'medium_warship') {
        let med = aliveEnemies.find((e) => e.shipClass === 'medium');
        if (!med) {
          travelToRegion('shattered_fleet', ship, undefined, false);
          med = enemies.find((e) => e.alive && e.shipClass === 'medium') ?? enemies.find((e) => e.alive);
        }
        if (!med) return false;
        const keep = new Set([med.id]);
        for (const e of enemies) {
          if (!e.alive || keep.has(e.id)) continue;
          e.pos.copy(ship.root.position).addScaledVector(forward, -1800);
          e.root.position.copy(e.pos);
        }
        placeEnemy(med, 145, -18, 18, 0.54, 0.72);
        med.lastHitAge = 0.5;
        lockedTarget = med;
        selectedSubsystem = null;
        manualSubsystemLock = false;
        lockProgress = 1.0;
      } else if (scenario === 'capital_ship') {
        if (!activeCapitalShip || activeCapitalShip.status.destroyed) {
          travelToRegion('shattered_fleet', ship, undefined, false);
        }
        if (!activeCapitalShip) return false;
        const cap = activeCapitalShip;
        cap.root.position
          .copy(ship.root.position)
          .addScaledVector(forward, 960)
          .addScaledVector(right, 80)
          .addScaledVector(up, 55);
        cap.pos.copy(cap.root.position);
        cap.root.lookAt(ship.root.position.clone().addScaledVector(right, 650));
        // Keep 2 escort fighters nearby in view for scale
        const escorts = enemies.filter((e) => e.alive).slice(0, 2);
        const keep = new Set(escorts.map((x) => x.id));
        for (const e of enemies) {
          if (!e.alive || keep.has(e.id)) continue;
          e.pos.copy(ship.root.position).addScaledVector(forward, -1900);
          e.root.position.copy(e.pos);
        }
        if (escorts[0]) placeEnemy(escorts[0], 260, -95, 22, 0.75, 0.85);
        if (escorts[1]) placeEnemy(escorts[1], 320, 125, -12, 0.9, 0.95);
        lockedTarget = null;
        selectedSubsystem = 'shields';
        manualSubsystemLock = true;
        lockProgress = 1.0;
      } else if (scenario === 'overlapping_cluster') {
        const picked = aliveEnemies.slice(0, 5);
        parkUnused(new Set(picked.map((x) => x.id)));
        const clusterOffsets: [number, number, number][] = [
          [140, -14, 16],
          [155, -2, 12],
          [168, 12, 20],
          [182, -26, 26],
          [195, 22, 8],
        ];
        picked.forEach((e, idx) => {
          const [f, r, u] = clusterOffsets[idx];
          placeEnemy(e, f, r, u, 0.85 - idx * 0.14, 0.9 - idx * 0.12);
          e.lastHitAge = 0.4;
        });
        lockedTarget = picked[0];
        selectedSubsystem = null;
        manualSubsystemLock = false;
        lockProgress = 1.0;
      } else if (scenario === 'fast_crossing') {
        const e = aliveEnemies[0];
        parkUnused(new Set([e.id]));
        placeEnemy(e, 110, -45, 16, 0.6, 0.82);
        e.vel.copy(right).multiplyScalar(195);
        lockedTarget = e;
        selectedSubsystem = null;
        manualSubsystemLock = false;
        lockProgress = 1.0;
      } else if (scenario === 'behind_asteroid') {
        const bigRock = asteroids.find((a) => a.hp > 0 && a.mesh.visible && a.radius >= 35) ?? asteroids[0];
        const e = aliveEnemies[0];
        parkUnused(new Set([e.id]));
        if (bigRock) {
          bigRock.pos
            .copy(ship.root.position)
            .addScaledVector(forward, 210)
            .addScaledVector(right, -22)
            .addScaledVector(up, 18);
          bigRock.mesh.position.copy(bigRock.pos);
          placeEnemy(e, 390, -40, 32, 0.8, 0.9);
          e.fireCooldown = 2.0;
        }
        lockedTarget = null;
        selectedSubsystem = null;
        lockProgress = 0;
      }

      // Snap chase camera cleanly right behind the player ship & refresh markers immediately
      ship.updateVisuals(0.016, 4.0, 0, 0);
      ship.updateCamera(camera, 0.016, false, false, undefined, true);
      camera.updateMatrixWorld(true);
      update(0.016, 0.016, ship, camera, false);
      return true;
    },
    setTopDownOverviewCamera: (camera, theaterWide = false) => {
      if (theaterWide) {
        camera.position.set(0, 42000, -14000);
        camera.up.set(0, 0, -1);
        camera.lookAt(0, 4000, -18000);
      } else {
        camera.position.set(activeCenter.x, activeCenter.y + 9200, activeCenter.z + 2400);
        camera.up.set(0, 1, 0);
        camera.lookAt(activeCenter.x, activeCenter.y, activeCenter.z - 800);
      }
      camera.fov = 58;
      camera.updateProjectionMatrix();
    },
    issueWingmanCommand,
    getNearbyObstaclesForCamera,
    stageCombatScenario: (camera, ship, scenario) => {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.root.quaternion).normalize();
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.root.quaternion).normalize();
      targetHudSmoothState = {};

      if (scenario === 'capital_destruction') {
        if (!activeCapitalShip || activeCapitalShip.status.destroyed) {
          travelToRegion('shattered_fleet', ship, undefined, false);
        }
        if (!activeCapitalShip) return false;
        const cap = activeCapitalShip;
        cap.root.position
          .copy(ship.root.position)
          .addScaledVector(forward, 980)
          .addScaledVector(right, 75)
          .addScaledVector(up, 50);
        cap.pos.copy(cap.root.position);
        cap.root.lookAt(ship.root.position.clone().addScaledVector(right, 680));
        cap.status.shield = 0;
        cap.status.subsystems.shields.health = 0;
        cap.status.subsystems.shields.destroyed = true;
        cap.status.armorPlatesRemaining = 1;
        cap.status.bridgeHealth = Math.round(cap.status.bridgeMaxHealth * 0.45);
        getSubsystemWorldPos(cap, 'shields', tmpSubPos);
        explosions.spawnExplosion(tmpSubPos.clone(), 4.2, { isSpace: true, colorHex: 0xff6224 });
        selectedSubsystem = 'weapons';
        manualSubsystemLock = true;
        lockedTarget = null;
      } else {
        const alive = enemies.filter((e) => e.alive);
        if (alive.length === 0) return false;
        if (scenario === 'asteroid_pursuit') {
          if (currentRegionId !== 'debris_belt') {
            travelToRegion('debris_belt', ship, undefined, false);
          }
          const bigAst = asteroids.find((a) => a.tier === 'large') ?? asteroids[0];
          if (bigAst) {
            ship.root.position.copy(bigAst.pos).add(new THREE.Vector3(-42, 16, 210));
            ship.root.lookAt(bigAst.pos.clone().add(new THREE.Vector3(24, 0, -160)));
            ship.root.rotateY(Math.PI);
          }
        }
        const fDir = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.root.quaternion).normalize();
        const rDir = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.root.quaternion).normalize();
        const uDir = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.root.quaternion).normalize();
        const activeNow = enemies.filter((e) => e.alive);
        const picked = activeNow.slice(0, 3);
        const layout: [number, number, number, DogfightManeuverState][] =
          scenario === 'crossfire'
            ? [
              [145, -75, 20, 'lateral_strafe'],
              [160, 78, 16, 'lateral_strafe'],
              [210, 8, 42, 'vertical_climb_dive'],
            ]
            : scenario === 'high_speed_interception'
              ? [
                [175, -36, 18, 'high_speed_flyby'],
                [230, 52, 26, 'straight_approach'],
                [290, -58, -14, 'high_speed_flyby'],
              ]
              : scenario === 'elite_ace_duel'
                ? [
                  [130, 22, 18, 'lateral_strafe'],
                  [240, -90, 34, 'vertical_climb_dive'],
                  [275, 110, -18, 'tail_pursuit'],
                ]
                : [
                  [135, -32, 16, 'lateral_strafe'],
                  [185, 48, 22, 'straight_approach'],
                  [235, -62, -10, 'tail_pursuit'],
                ];

        picked.forEach((e, idx) => {
          const [fDist, lDist, uDist, state] = layout[idx] ?? layout[0];
          e.pos
            .copy(ship.root.position)
            .addScaledVector(fDir, fDist)
            .addScaledVector(rDir, lDist)
            .addScaledVector(uDir, uDist);
          e.root.position.copy(e.pos);
          e.maneuverState = state;
          e.stateTimer = 4.0;
          e.strafeSign = idx % 2 === 0 ? 1 : -1;
          e.fireCooldown = 0.25;
          e.vel.copy(rDir).multiplyScalar(e.strafeSign * 145).addScaledVector(fDir, -65);
          e.root.lookAt(e.pos.clone().sub(e.vel));
          e.root.rotateZ(e.strafeSign * -0.55);
        });
        // Place Wingmen cleanly flanking behind player for cinematic squad framing
        wingmen.slice(0, 3).forEach((w) => {
          if (!w.active) return;
          w.pos
            .copy(ship.root.position)
            .addScaledVector(rDir, w.formationOffset[0] * 0.72)
            .addScaledVector(uDir, w.formationOffset[1] * 0.72)
            .addScaledVector(fDir, -w.formationOffset[2] * 0.55);
          w.root.position.copy(w.pos);
          w.root.lookAt(w.pos.clone().add(fDir));
        });
        lockedTarget = picked[0] ?? null;
        selectedSubsystem = null;
        lockProgress = 1.0;
      }

      ship.setThrustLevel(0.88, true, false);
      ship.updateVisuals(0.016, 4.0, 0.04, -0.08);
      ship.updateCamera(camera, 0.016, false, false, undefined, true);
      camera.updateMatrixWorld(true);
      update(0.016, 0.016, ship, camera, false);
      return true;
    },
    getCombatDiagnostics: () => {
      let minY = Infinity;
      let maxY = -Infinity;
      for (const a of asteroids) {
        if (a.pos.y < minY) minY = a.pos.y;
        if (a.pos.y > maxY) maxY = a.pos.y;
      }
      return {
        asteroidCount: asteroids.length,
        asteroidYRange: asteroids.length > 0 ? [Math.round(minY), Math.round(maxY)] : [0, 0],
        gridCells: spatialAsteroidGrid.cellCount,
        wingmanCommand: activeWingmanCommand,
        activeWingmen: wingmen.filter((w) => w.active && w.status !== 'disabled').length,
        reinforcementStage: reinforcementDirector.stage,
        enemies: enemies.slice(0, 12).map((e) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          isLegendary: e.isLegendary,
          maneuverState: e.maneuverState,
          pos: [Math.round(e.pos.x), Math.round(e.pos.y), Math.round(e.pos.z)],
          vel: [Math.round(e.vel.x), Math.round(e.vel.y), Math.round(e.vel.z)],
          bankRad: Number(e.currentBankRad.toFixed(2)),
          alive: e.alive,
        })),
      };
    },
    getHudSnapshot: () => {
      const region = SPACE_REGIONS[currentRegionId];
      const shipSpec = getShipSpec();
      const shipPos: [number, number, number] = lastShipRef
        ? [lastShipRef.root.position.x, lastShipRef.root.position.y, lastShipRef.root.position.z]
        : region.worldCenter;
      const regionDistancesKm: Record<SpaceRegionId, number> = {
        low_orbit: computeSpaceRegionDistanceKm(shipPos, 'low_orbit'),
        debris_belt: computeSpaceRegionDistanceKm(shipPos, 'debris_belt'),
        shattered_fleet: computeSpaceRegionDistanceKm(shipPos, 'shattered_fleet'),
        outer_frontier: computeSpaceRegionDistanceKm(shipPos, 'outer_frontier'),
        sovereign_defense_zone: computeSpaceRegionDistanceKm(shipPos, 'sovereign_defense_zone'),
      };
      const lockedName =
        selectedSubsystem && activeCapitalShip && !activeCapitalShip.status.destroyed
          ? `${activeCapitalShip.status.name} · ${activeCapitalShip.status.subsystems[selectedSubsystem].label}`
          : lockedTarget && lockedTarget.alive
            ? lockedTarget.name
            : null;
      const lockedRole =
        selectedSubsystem && activeCapitalShip
          ? 'CAPITAL SUBSYSTEM'
          : lockedTarget && lockedTarget.alive
          ? getAnyEnemyRoleConfig(lockedTarget.role).badge
          : null;
      const lockedDist =
        selectedSubsystem && activeCapitalShip && !activeCapitalShip.status.destroyed && lastShipRef
          ? Math.round(activeCapitalShip.root.position.distanceTo(lastShipRef.root.position))
          : lockedTarget && lockedTarget.alive && lastShipRef
            ? Math.round(lockedTarget.pos.distanceTo(lastShipRef.root.position))
            : null;

      const zonesClearedCount = latestWaypoints.filter((w) => w.cleared).length;
      const activeZone =
        latestWaypoints.find((w) => !w.cleared)?.label ?? region.encounterZones[0].label;

      const railSpec = SPACE_WEAPONS.rail_cannon;
      const railEffCharge = railSpec.chargeTimeSec / shipSpec.railChargeBonus;
      const railChargePct =
        activeWeapon === 'rail_cannon'
          ? Math.min(100, Math.round((railChargeSec / Math.max(0.05, railEffCharge)) * 100))
          : 0;

      const hostilesRemaining = enemies.filter((e) => e.alive).length;
      const missionObjectiveLabel = missionCompleted
        ? `${activeMissionCode} SECURED — MISSION COMPLETE`
        : extractionActive && !extractionReached
        ? 'EMERGENCY EXTRACTION OPEN — FLY TO GREEN JUMP RING'
        : activeBossSm && !activeBossSm.defeated
        ? `${activeBossSm.bossName.toUpperCase()} · ${activeBossSm.phaseLabel} (${hostilesRemaining} ESCORTS)`
        : activeCapitalShip && !activeCapitalShip.status.destroyed
          ? `Target ${activeCapitalShip.status.name} subsystems & clear ${hostilesRemaining} hostiles`
          : `Clear ${hostilesRemaining} hostile spacecraft across ${region.label}`;

      const selectedTargetInfo: SelectedTargetHudInfo | null = (() => {
        if (selectedSubsystem && activeCapitalShip && !activeCapitalShip.status.destroyed) {
          const cap = activeCapitalShip;
          const activeSubs = Object.values(cap.status.subsystems).filter((s) => !s.destroyed).length;
          return {
            id: cap.status.id,
            name: `${cap.status.name} · ${cap.status.subsystems[selectedSubsystem].label}`,
            classification: formatEnemyClassification('capital'),
            shipClass: 'capital',
            threatLevel: 'capital',
            distanceMeters: lockedDist ?? 0,
            hullPct: Math.round((cap.status.hull / Math.max(1, cap.status.maxHull)) * 100),
            shieldPct:
              cap.status.maxShield > 0
                ? Math.round((cap.status.shield / Math.max(1, cap.status.maxShield)) * 100)
                : 0,
            hasShields: cap.status.maxShield > 0,
            lockProgress,
            isLocked: lockProgress >= 0.99,
            isOccluded: false,
            isCapital: true,
            activeSubsystems: activeSubs,
            totalSubsystems: CAPITAL_SUBSYSTEM_KEYS.length,
          };
        }
        if (lockedTarget && lockedTarget.alive) {
          const matchedMarker = latestTargetMarkers.find((m) => m.id === lockedTarget!.id);
          return {
            id: lockedTarget.id,
            name: lockedTarget.name,
            classification: formatEnemyClassification(lockedTarget.shipClass, lockedTarget.role),
            shipClass: lockedTarget.shipClass,
            threatLevel: deriveThreatLevel(lockedTarget.shipClass, lockedTarget.role),
            distanceMeters: lockedDist ?? 0,
            hullPct: Math.round((lockedTarget.health / Math.max(1, lockedTarget.maxHealth)) * 100),
            shieldPct:
              lockedTarget.maxShield > 0
                ? Math.round((lockedTarget.shield / Math.max(1, lockedTarget.maxShield)) * 100)
                : 0,
            hasShields: lockedTarget.maxShield > 0,
            lockProgress,
            isLocked: lockProgress >= 0.99,
            isOccluded: matchedMarker?.isOccluded ?? false,
            isCapital: false,
          };
        }
        return null;
      })();

      return {
        speed: Math.round(vitals.speed),
        altitudeKm: Number(((lastShipRef?.root.position.y ?? 3600) / 100).toFixed(1)),
        throttlePct: Math.round(
          THREE.MathUtils.clamp((vitals.speed / shipSpec.topSpeed) * 100, 0, 100),
        ),
        isBoosting: isBoostingNow,
        boostState: latestBoostState,
        isSupercruise: isSupercruiseNow,
        autopilotActive,
        boostEnergy: Math.round(vitals.boostEnergy),
        weaponHeat: Math.round(vitals.weaponHeat),
        railChargePct,
        activeWeapon,
        activeWeaponName: SPACE_WEAPONS[activeWeapon].name,
        selectedShipId: shipSpec.id,
        selectedShipName: shipSpec.name,
        missilesRemaining: vitals.missiles,
        maxMissiles: vitals.maxMissiles,
        countermeasuresRemaining: vitals.countermeasures,
        maxCountermeasures: vitals.maxCountermeasures,
        shield: Math.round(vitals.shield),
        maxShield: vitals.maxShield,
        hull: Math.round(vitals.hull),
        maxHull: vitals.maxHull,
        engineIntegrity: Math.round(vitals.engineIntegrity),
        controlIntegrity: Math.round(vitals.controlIntegrity),
        weaponIntegrity: Math.round(vitals.weaponIntegrity),
        repairKits: vitals.repairKits,
        kills,
        subsystemsDestroyedCount,
        capitalShipsDestroyedCount,
        distanceTraveledKm: Number((distanceTraveledMeters / 1000).toFixed(2)),
        hostilesRemaining,
        activeZoneLabel: activeZone,
        zonesClearedCount,
        zonesTotalCount: region.encounterZones.length,
        waypoints: latestWaypoints,
        currentRegionId,
        regionCode: region.code,
        regionLabel: region.label,
        regionSubtitle: region.subtitle,
        regionDistancesKm,
        encounterId: currentEncounterId,
        encounterLabel: region.label,
        encounterHazardLevel: region.hazardLevel,
        campaignMissionId: activeCampaignMissionId,
        campaignMissionCode: activeMissionCode,
        campaignMissionTitle: activeMissionTitle,
        missionObjectiveLabel,
        missionCompleted,
        capitalShip: activeCapitalShip ? { ...activeCapitalShip.status } : null,
        capitalShipDistanceMeters: latestCapitalDistanceMeters,
        selectedSubsystem,
        capitalCriticalCountdown:
          activeCapitalShip &&
            activeCapitalShip.criticalCountdown &&
            activeCapitalShip.criticalCountdown.active
            ? {
              active: true,
              remainingSec: activeCapitalShip.criticalCountdown.remainingSec,
              displayDigit: Math.max(
                0,
                Math.min(3, Math.ceil(activeCapitalShip.criticalCountdown.remainingSec)),
              ),
              shipName: activeCapitalShip.status.name,
            }
            : null,
        solidProximityWarning:
          solidProximityWarningState && solidProximityWarningState.risk !== 'clear'
            ? {
              risk: solidProximityWarningState.risk,
              closingSpeed: solidProximityWarningState.closingSpeed,
              timeToImpactSec: solidProximityWarningState.timeToImpactSec,
            }
            : null,
        radarBlips: latestRadarBlips,
        enemyHealthMarkers: latestEnemyHealthMarkers,
        targetMarkers: latestTargetMarkers,
        offscreenTargets: latestOffscreenTargets,
        asteroidCount: asteroids.length,
        asteroidAlert,
        collisionSeverityFlash,
        collisionWarningBanner,
        scoutEscapeWarning,
        nearRepairBeacon,
        lockedTargetName: lockedName,
        lockedTargetRole: lockedRole,
        lockedTargetDistMeters: lockedDist,
        selectedTargetInfo,
        predictiveLeadReticle: latestPredictiveLeadReticle,
        lockProgress,
        targetScreenX,
        targetScreenY,
        targetInView,
        incomingMissile,
        cameraMode: currentCameraMode,
        flightAssist: flightSettings.flightAssist,
        isDestroyed: vitals.hull <= 0,
        weaponOverheated,
        missileCooldownPct: Math.min(100, Math.round((missileCooldown / SPACE_WEAPONS.missile.cooldownSec) * 100)),
        flareCooldownPct: Math.min(100, Math.round((flareCooldown / 1.6) * 100)),
        flareDecoyActive: flareDecoyTimer > 0,
        hitMarkerTimer,
        hitMarkerKill,
        shotsFired,
        shotsHit,
        sortieElapsedSec: Math.round(sortieElapsedSec),
        statusToast,
        wingmen: wingmen
          .filter((w) => w.active)
          .slice(0, 3)
          .map((w) => ({
            id: w.id,
            callsign: w.callsign,
            pilotName: w.pilotName,
            hullPct: Math.round((w.hull / Math.max(1, w.maxHull)) * 100),
            shieldPct: Math.round((w.shield / Math.max(1, w.maxShield)) * 100),
            command: activeWingmanCommand,
            status: w.status,
            kills: w.kills,
          })),
        wingmanCommand: activeWingmanCommand,
        reinforcementStage: reinforcementDirector.stage,
        reinforcementBanner: reinforcementDirector.alertBanner,
        legendaryPilot: (() => {
          const leg = enemies.find((e) => e.isLegendary && e.legendaryDef);
          if (!leg || !leg.legendaryDef) return null;
          return {
            name: leg.legendaryDef.name,
            callsign: leg.legendaryDef.callsign,
            title: leg.legendaryDef.title,
            hullPct: leg.alive ? Math.round((leg.health / Math.max(1, leg.maxHealth)) * 100) : 0,
            shieldPct: leg.alive ? Math.round((leg.shield / Math.max(1, leg.maxShield)) * 100) : 0,
            alive: leg.alive,
          };
        })(),
        activeMissionEvent: activeMissionEventBanner,
        incomingDamageAngleDeg,
        criticalDamageWarning:
          vitals.hull > 0 &&
          (vitals.hull / Math.max(1, vitals.maxHull) < 0.34 || vitals.engineIntegrity < 60),
        activeLevelId: activeLevelOverride?.id ?? null,
        activeLevelCode: activeLevelOverride?.code ?? null,
        activeLevelName: activeLevelOverride?.name ?? null,
        activeLevelObjectiveBadge: activeLevelOverride?.objectiveBadge ?? null,
        activeLevelPrimaryText: activeLevelOverride?.primaryObjectiveText ?? null,
        activeLevelOptionalText: activeLevelOverride?.optionalObjectiveText ?? null,
        activeLevelOptionalCompleted: activeLevelOverride
          ? evaluateOptionalObjective(
            activeLevelOverride.optionalObjectiveKind,
            activeLevelOverride.optionalObjectiveTarget,
            {
              level: activeLevelOverride,
              combatScore: combatScoreState.score,
              shotsFired,
              shotsHit,
              kills: missionKills,
              elapsedSec: Math.max(1, Math.round(sortieElapsedSec)),
              hullRemainingPct: Math.round((vitals.hull / Math.max(1, vitals.maxHull)) * 100),
              maxCombo: combatScoreState.maxCombo,
              subsystemsDestroyed: subsystemsDestroyedCount,
              protectedHpPct:
                protectedEntityMaxHp > 0
                  ? Math.round((protectedEntityHp / protectedEntityMaxHp) * 100)
                  : null,
              repairKitsUsed: repairKitsUsedInLevel,
              legendaryDefeated: legendaryDefeatedInMission,
            },
            shotsFired > 0 ? Math.min(100, Math.round((shotsHit / shotsFired) * 100)) : 0,
          )
          : false,
        levelTimerRemainingSec:
          levelTimeLimitSec !== null
            ? Math.max(0, Math.ceil(levelTimeLimitSec - sortieElapsedSec))
            : levelSurvivalTargetSec !== null
              ? Math.max(0, Math.ceil(levelSurvivalTargetSec - sortieElapsedSec))
              : levelEscapeTimerSec !== null
                ? Math.max(0, Math.ceil(levelEscapeTimerSec - sortieElapsedSec))
                : null,
        levelTimerKind:
          levelTimeLimitSec !== null
            ? 'time_limit'
            : levelSurvivalTargetSec !== null
              ? 'survival'
              : levelEscapeTimerSec !== null
                ? 'escape'
                : null,
        protectedEntity:
          protectedEntityName && protectedEntityMaxHp > 0
            ? {
              name: protectedEntityName,
              hpPct: Math.max(0, Math.round((protectedEntityHp / protectedEntityMaxHp) * 100)),
            }
            : null,
        combatScore: combatScoreState.score,
        comboCount: combatScoreState.comboCount,
        comboMultiplier: combatScoreState.comboMultiplier,
        comboTimerRatio:
          combatScoreState.comboCount > 0
            ? Math.max(0, Math.min(1, combatScoreState.comboTimerSec / combatScoreState.comboMaxTimerSec))
            : 0,
        activeBonusCallout: combatScoreState.activeCallout ? { ...combatScoreState.activeCallout } : null,
        consecutiveHits: combatScoreState.consecutiveHits,
        activeWeaponRangeTag: WEAPON_BALLISTICS[activeWeapon].hudRangeTag,
        missileLockReady:
          lockProgress >= (WEAPON_BALLISTICS.missile.missileMinLockProgress ?? 0.92) &&
          (Boolean(lockedTarget && lockedTarget.alive) ||
            Boolean(selectedSubsystem && activeCapitalShip && !activeCapitalShip.status.destroyed)),
        campaignTrack: activeExtLevel ? 'extinction' : 'original',
        extinctionBoss: activeBossSm
          ? {
              bossId: activeBossSm.bossId,
              bossKind: activeBossSm.bossKind,
              name: activeBossSm.bossName,
              phase: activeBossSm.phase,
              phaseLabel: activeBossSm.phaseLabel,
              hp: Math.round(activeBossSm.hp),
              maxHp: activeBossSm.maxHp,
              hpPct: Math.max(0, Math.round((activeBossSm.hp / Math.max(1, activeBossSm.maxHp)) * 100)),
              shield: Math.round(activeBossSm.shield),
              maxShield: activeBossSm.maxShield,
              shieldPct:
                activeBossSm.maxShield > 0
                  ? Math.max(0, Math.round((activeBossSm.shield / activeBossSm.maxShield) * 100))
                  : 0,
              mainHullInvulnerable: activeBossSm.mainHullInvulnerable,
              invulnerableReason: activeBossSm.invulnerableReason,
              telegraphActive: activeBossSm.telegraphActive,
              telegraphLabel: activeBossSm.telegraphLabel,
              telegraphRemainingSec: Number(activeBossSm.telegraphRemainingSec.toFixed(1)),
              cores:
                activeBossSm.harvesterCores.length > 0
                  ? activeBossSm.harvesterCores.map((c) => ({
                      id: c.id,
                      label: c.label,
                      hpPct: Math.max(0, Math.round((c.hp / Math.max(1, c.maxHp)) * 100)),
                      destroyed: c.destroyed,
                    }))
                  : undefined,
              meltdownStep: activeBossSm.meltdownStep,
              meltdownActive: activeBossSm.meltdownActive,
            }
          : null,
        ewInterference: ewInterferenceState.ewActive
          ? {
              active: true,
              activePulseCount: ewInterferenceState.activePulseCount,
              lockSpeedMultiplier: ewInterferenceState.lockSpeedMultiplier,
            }
          : null,
        battleStage: battleDirector
          ? {
              stageNumber: battleDirector.currentStageIndex + 1,
              totalStages: battleDirector.totalStages,
              label:
                battleDirector.stages[battleDirector.currentStageIndex]?.label ?? 'STAGE ACTIVE',
            }
          : null,
        extractionState: activeExtLevel?.extractionRequired
          ? {
              required: true,
              active: extractionActive,
              distanceMeters:
                extractionActive && lastShipRef
                  ? Math.round(lastShipRef.root.position.distanceTo(extractionPos))
                  : null,
              reached: extractionReached,
            }
          : null,
        activeExtinctionEvents: battleDirector ? battleDirector.activeEvents : [],
        orbitalPylonsRemaining: orbitalPylons.filter((p) => !p.destroyed).length,
      };
    },
    update,
    dispose: () => {
      for (const sg of sectorGeos) sg.dispose();
      sectorGeos.length = 0;
      for (const sm of sectorMats) sm.dispose();
      sectorMats.length = 0;
      for (const g of geos) g.dispose();
      for (const m of localMats) m.dispose();
    },
  };
}
