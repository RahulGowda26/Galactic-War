import type { CameraShakeMode } from './weaponFeedback';
import type { EnemyInfoDisplayMode } from './targetHudLayout';
import type { AimAssistMode } from './ballistics';

export interface FlightControlSettings {
  flightSensitivity: number; // 0.3 .. 2.2
  cameraSensitivity: number; // 0.3 .. 2.2
  invertFlightY: boolean;
  flightAssist: boolean;
  autoRollStabilize: boolean;
  gentleAimAssist: boolean;
  aimAssistMode: AimAssistMode;
  targetTrackingAssist: boolean;
  rollOnAD: boolean;
  cameraShakeMode: CameraShakeMode;
  enemyInfoDisplayMode: EnemyInfoDisplayMode;
  enemyInfoToggleKey: string;
}

export const DEFAULT_FLIGHT_SETTINGS: FlightControlSettings = {
  flightSensitivity: 1.0,
  cameraSensitivity: 1.0,
  invertFlightY: false,
  flightAssist: true,
  autoRollStabilize: true,
  gentleAimAssist: true,
  aimAssistMode: 'subtle',
  targetTrackingAssist: false,
  rollOnAD: false,
  cameraShakeMode: 'full',
  enemyInfoDisplayMode: 'full',
  enemyInfoToggleKey: 'F5',
};

export interface FlightInputState {
  throttleForward: boolean; // W
  throttleReverse: boolean; // S
  strafeLeft: boolean; // A
  strafeRight: boolean; // D
  rollLeft: boolean; // Q
  rollRight: boolean; // E
  boost: boolean; // Shift
  brake: boolean; // Space
  supercruise: boolean; // V / Cruise toggle
  pitchDelta: number; // Mouse Y / Touch camera drag
  yawDelta: number; // Mouse X / Touch camera drag
  joyPitch: number; // -1..1 continuous virtual joystick pitch
  joyYaw: number; // -1..1 continuous virtual joystick yaw
}

// =========================================================================
// VAST 5x EXPANDED INTERSTELLAR SPACE DIMENSIONS (~80 KM THEATER)
// Before: ~16 km diagonal, 1.55 km region radius
// After:  ~80 km interstellar theater (~62.5 km inter-region span), 7.8-9.6 km region radius (5x!)
// =========================================================================
export const LEGACY_SPACE_THEATER_KM = 16;
export const EXPANDED_SPACE_THEATER_KM = 80;
export const SPACE_EXPANSION_FACTOR = 5;

export type SpaceRegionId =
  | 'low_orbit'
  | 'shattered_fleet'
  | 'debris_belt'
  | 'outer_frontier'
  | 'sovereign_defense_zone';

export type EnemyShipClass = 'fighter' | 'medium' | 'capital';

export type EnemyFighterRole =
  | 'interceptor'
  | 'bomber'
  | 'heavy_fighter'
  | 'scout'
  | 'elite_ace'
  | 'medium_warship';

export interface EncounterZoneDef {
  id: string;
  label: string;
  kind: 'patrol' | 'wreckage_distress' | 'asteroid_corridor' | 'defense_platform' | 'capital_fleet';
  offsetFromRegionCenter: [number, number, number]; // separated by 1,400m - 5,400m!
  activationRadius: number;
  fighterMix: Partial<Record<EnemyFighterRole, number>>;
  hasDefensePlatform?: boolean;
  hasCapitalShip?: boolean;
  isPeacefulSalvage?: boolean;
}

export interface SpaceRegionDefinition {
  id: SpaceRegionId;
  index: number;
  code: string;
  label: string;
  subtitle: string;
  hazardLevel: string;
  asteroidEnvironment: string;
  worldCenter: [number, number, number]; // real 3D coordinates inside the 80km theater
  spawnOffset: [number, number, number];
  fieldRadius: number; // 7,800m - 9,600m (5x larger than legacy 1,550m!)
  smallAsteroids: number;
  mediumAsteroids: number;
  largeAsteroids: number;
  wreckageFragments: number;
  driftSpeedMultiplier: number;
  hasCapitalShip: boolean;
  capitalShipName: string | null;
  capitalShipClass: 'frigate' | 'assault_cruiser' | 'heavy_dreadnought' | 'sovereign_flagship' | null;
  hasFriendlyCarrier: boolean;
  fighterMix: Record<EnemyFighterRole, number>;
  encounterZones: EncounterZoneDef[];
  objectiveSummary: string;
  nebulaTintHex: number;
  mapCoord: [number, number]; // normalized 0..100 for Space Navigation Map
  connectedRegions: SpaceRegionId[];
}

// =========================================================================
// 5 DISTINCT PLAYABLE SPACECRAFT CLASSES
// =========================================================================
export type PlayableShipId =
  | 'light_interceptor'
  | 'heavy_fighter'
  | 'strike_bomber'
  | 'recon_craft'
  | 'advanced_prototype';

export interface PlayableShipSpec {
  id: PlayableShipId;
  code: string;
  name: string;
  role: string;
  summary: string;
  maxHull: number;
  maxShield: number;
  topSpeed: number;
  boostSpeed: number;
  cruiseSpeed: number;
  turnRateMultiplier: number;
  accelerationMultiplier: number;
  missileCapacityBonus: number;
  capitalDamageMultiplier: number;
  radarRangeMeters: number;
  lockRangeMeters: number;
  railChargeBonus: number;
  primaryColorHex: number;
  accentColorHex: number;
  unlockRequirement: string;
}

export const PLAYABLE_SHIPS: Record<PlayableShipId, PlayableShipSpec> = {
  light_interceptor: {
    id: 'light_interceptor',
    code: 'VX-94',
    name: 'VX-94 Valkyrie',
    role: 'Light Interceptor',
    summary: 'Razor-agile twin-thruster interceptor built for high-speed dogfighting and evading missiles.',
    maxHull: 95,
    maxShield: 100,
    topSpeed: 248,
    boostSpeed: 435,
    cruiseSpeed: 1380,
    turnRateMultiplier: 1.24,
    accelerationMultiplier: 1.32,
    missileCapacityBonus: 0,
    capitalDamageMultiplier: 0.95,
    radarRangeMeters: 3200,
    lockRangeMeters: 2600,
    railChargeBonus: 1.0,
    primaryColorHex: 0xdce4ee,
    accentColorHex: 0x38d8ff,
    unlockRequirement: 'Standard Fleet Issue',
  },
  heavy_fighter: {
    id: 'heavy_fighter',
    code: 'A-12',
    name: 'A-12 Ironclad',
    role: 'Heavy Fighter',
    summary: 'Reinforced twin-boom armored gunship with heavy shields and sustained plasma fire.',
    maxHull: 155,
    maxShield: 140,
    topSpeed: 205,
    boostSpeed: 365,
    cruiseSpeed: 1120,
    turnRateMultiplier: 0.88,
    accelerationMultiplier: 0.96,
    missileCapacityBonus: 2,
    capitalDamageMultiplier: 1.15,
    radarRangeMeters: 3000,
    lockRangeMeters: 2500,
    railChargeBonus: 1.05,
    primaryColorHex: 0x738294,
    accentColorHex: 0xf59e0b,
    unlockRequirement: 'Standard Fleet Issue',
  },
  strike_bomber: {
    id: 'strike_bomber',
    code: 'B-7',
    name: 'B-7 Hammerhead',
    role: 'Strike Bomber',
    summary: 'Heavy anti-capital ordnance carrier with massive missile bays and +40% subsystem damage.',
    maxHull: 170,
    maxShield: 125,
    topSpeed: 184,
    boostSpeed: 332,
    cruiseSpeed: 1040,
    turnRateMultiplier: 0.76,
    accelerationMultiplier: 0.86,
    missileCapacityBonus: 10,
    capitalDamageMultiplier: 1.42,
    radarRangeMeters: 2900,
    lockRangeMeters: 2800,
    railChargeBonus: 1.2,
    primaryColorHex: 0x5c665b,
    accentColorHex: 0xf97316,
    unlockRequirement: 'Unlocked via Hangar or OP 02',
  },
  recon_craft: {
    id: 'recon_craft',
    code: 'SR-4',
    name: 'SR-4 Specter',
    role: 'Recon Craft',
    summary: 'Long-range deep-space scanner with unmatched supercruise velocity and 2x sensor range.',
    maxHull: 82,
    maxShield: 90,
    topSpeed: 278,
    boostSpeed: 495,
    cruiseSpeed: 1780,
    turnRateMultiplier: 1.18,
    accelerationMultiplier: 1.4,
    missileCapacityBonus: -2,
    capitalDamageMultiplier: 0.85,
    radarRangeMeters: 6400,
    lockRangeMeters: 4200,
    railChargeBonus: 1.15,
    primaryColorHex: 0x3b485a,
    accentColorHex: 0x34d399,
    unlockRequirement: 'Unlocked via Hangar or OP 03',
  },
  advanced_prototype: {
    id: 'advanced_prototype',
    code: 'X-01',
    name: 'X-01 Sovereign Bane',
    role: 'Advanced Prototype',
    summary: 'Experimental forward-swept Vanguard prototype with overcharged Rail Cannon capacitors and elite agility.',
    maxHull: 145,
    maxShield: 165,
    topSpeed: 268,
    boostSpeed: 475,
    cruiseSpeed: 1620,
    turnRateMultiplier: 1.24,
    accelerationMultiplier: 1.32,
    missileCapacityBonus: 6,
    capitalDamageMultiplier: 1.32,
    radarRangeMeters: 5200,
    lockRangeMeters: 3800,
    railChargeBonus: 1.5,
    primaryColorHex: 0x1d2638,
    accentColorHex: 0x60a5fa,
    unlockRequirement: 'Complete OP 06 or Research in Hangar',
  },
};

export const PLAYABLE_SHIP_LIST: PlayableShipSpec[] = [
  PLAYABLE_SHIPS.light_interceptor,
  PLAYABLE_SHIPS.heavy_fighter,
  PLAYABLE_SHIPS.strike_bomber,
  PLAYABLE_SHIPS.recon_craft,
  PLAYABLE_SHIPS.advanced_prototype,
];

export interface EnemyFighterRoleConfig {
  role: EnemyFighterRole;
  shipClass: Exclude<EnemyShipClass, 'capital'>;
  displayName: string;
  badge: string;
  baseHp: number;
  baseShield: number;
  speed: number;
  damage: number;
  fireCooldown: number;
  tacticalSummary: string;
}

export const ENEMY_FIGHTER_ROLES: Record<EnemyFighterRole, EnemyFighterRoleConfig> = {
  interceptor: {
    role: 'interceptor',
    shipClass: 'fighter',
    displayName: 'Void Interceptor',
    badge: 'FLANKER',
    baseHp: 76,
    baseShield: 35,
    speed: 175,
    damage: 7,
    fireCooldown: 1.95,
    tacticalSummary: 'Fast flanker that loops behind your stern and executes evasive breaks.',
  },
  bomber: {
    role: 'bomber',
    shipClass: 'fighter',
    displayName: 'Siege Bomber',
    badge: 'ANTI-CAP',
    baseHp: 140,
    baseShield: 70,
    speed: 108,
    damage: 14,
    fireCooldown: 3.0,
    tacticalSummary: 'Heavy torpedo craft targeting friendly carriers and defense platforms.',
  },
  heavy_fighter: {
    role: 'heavy_fighter',
    shipClass: 'fighter',
    displayName: 'Armored Striker',
    badge: 'HEAVY',
    baseHp: 160,
    baseShield: 85,
    speed: 122,
    damage: 11,
    fireCooldown: 1.7,
    tacticalSummary: 'Twin-cannon armored fighter; strip shields with EMP or pierce with Plasma.',
  },
  scout: {
    role: 'scout',
    shipClass: 'fighter',
    displayName: 'Recon Scout',
    badge: 'SIGNALER',
    baseHp: 64,
    baseShield: 28,
    speed: 205,
    damage: 5,
    fireCooldown: 2.6,
    tacticalSummary: 'Searches open sectors and calls fleet reinforcements unless intercepted.',
  },
  elite_ace: {
    role: 'elite_ace',
    shipClass: 'fighter',
    displayName: 'Sovereign Elite Ace',
    badge: 'ACE',
    baseHp: 152,
    baseShield: 100,
    speed: 196,
    damage: 12,
    fireCooldown: 1.4,
    tacticalSummary: 'Veteran pilot using unpredictable barrel rolls, flanking loops, and decoy flares.',
  },
  medium_warship: {
    role: 'medium_warship',
    shipClass: 'medium',
    displayName: 'Void Assault Corvette',
    badge: 'CORVETTE',
    baseHp: 390,
    baseShield: 220,
    speed: 88,
    damage: 18,
    fireCooldown: 1.55,
    tacticalSummary: 'Faceted twin-turret medium warship escorting capital vessels with heavy dual rotary fire.',
  },
};

export const SPACE_REGIONS: Record<SpaceRegionId, SpaceRegionDefinition> = {
  low_orbit: {
    id: 'low_orbit',
    index: 1,
    code: 'SECTOR I',
    label: 'Aether Prime Orbit',
    subtitle: 'Planetary Horizon, Orbital Defense Platforms & Evacuation Corridors',
    hazardLevel: 'SPARSE DEBRIS',
    asteroidEnvironment: 'Sparse Orbital Debris & Satellite Wreckage',
    worldCenter: [0, 3600, 0],
    spawnOffset: [0, 60, 1850],
    fieldRadius: 7800,
    smallAsteroids: 28,
    mediumAsteroids: 14,
    largeAsteroids: 6,
    wreckageFragments: 16,
    driftSpeedMultiplier: 0.72,
    hasCapitalShip: false,
    capitalShipName: null,
    capitalShipClass: null,
    hasFriendlyCarrier: true,
    fighterMix: {
      interceptor: 4,
      bomber: 2,
      heavy_fighter: 1,
      scout: 2,
      elite_ace: 0,
      medium_warship: 1,
    },
    encounterZones: [
      {
        id: 'lo_evac_corridor',
        label: 'Evacuation Corridor Alpha',
        kind: 'patrol',
        offsetFromRegionCenter: [0, 40, 280],
        activationRadius: 2400,
        fighterMix: { interceptor: 2, scout: 1, medium_warship: 1 },
      },
      {
        id: 'lo_defense_ring',
        label: 'Orbital Defense Platform Alpha',
        kind: 'defense_platform',
        offsetFromRegionCenter: [-2100, 140, -1650],
        activationRadius: 2800,
        fighterMix: { interceptor: 2, bomber: 2 },
        hasDefensePlatform: true,
      },
      {
        id: 'lo_high_watch',
        label: 'Upper Thermosphere Signal Relay',
        kind: 'patrol',
        offsetFromRegionCenter: [2400, 320, -2600],
        activationRadius: 2800,
        fighterMix: { heavy_fighter: 1, scout: 1 },
      },
    ],
    objectiveSummary: 'Defend the orbital evacuation corridor and neutralize alien interceptor wings.',
    nebulaTintHex: 0x1b3a63,
    mapCoord: [50, 84],
    connectedRegions: ['shattered_fleet', 'debris_belt'],
  },
  shattered_fleet: {
    id: 'shattered_fleet',
    index: 2,
    code: 'SECTOR II',
    label: 'The Shattered Front',
    subtitle: 'Graveyard of Destroyed Capital Ships, Distress Beacons & Active Fleet Combat',
    hazardLevel: 'WRECKAGE GRAVEYARD',
    asteroidEnvironment: 'Destroyed Spacecraft Graveyard & Unstable Hull Debris',
    worldCenter: [16800, 4100, -11200],
    spawnOffset: [-1200, 120, 2400],
    fieldRadius: 8400,
    smallAsteroids: 34,
    mediumAsteroids: 22,
    largeAsteroids: 10,
    wreckageFragments: 42,
    driftSpeedMultiplier: 0.9,
    hasCapitalShip: true,
    capitalShipName: 'Alien Assault Cruiser Vex-04',
    capitalShipClass: 'assault_cruiser',
    hasFriendlyCarrier: true,
    fighterMix: {
      interceptor: 4,
      bomber: 3,
      heavy_fighter: 2,
      scout: 1,
      elite_ace: 1,
      medium_warship: 2,
    },
    encounterZones: [
      {
        id: 'sf_distress_hulk',
        label: 'CSV Valiant Wreckage & Distress Pod',
        kind: 'wreckage_distress',
        offsetFromRegionCenter: [-1900, 60, 650],
        activationRadius: 2600,
        fighterMix: { interceptor: 2, scout: 1 },
      },
      {
        id: 'sf_carrier_line',
        label: 'CSV Aegis Frontline Screen',
        kind: 'patrol',
        offsetFromRegionCenter: [1650, -90, -850],
        activationRadius: 3000,
        fighterMix: { bomber: 3, heavy_fighter: 1, medium_warship: 1 },
      },
      {
        id: 'sf_cruiser_anvil',
        label: 'Assault Cruiser Vex-04 Engagement',
        kind: 'capital_fleet',
        offsetFromRegionCenter: [450, 180, -3400],
        activationRadius: 3800,
        fighterMix: { interceptor: 2, heavy_fighter: 1, elite_ace: 1, medium_warship: 1 },
        hasCapitalShip: true,
      },
    ],
    objectiveSummary: 'Sweep the capital wreckage graveyard, rescue stranded pilots, and cripple Assault Cruiser Vex-04.',
    nebulaTintHex: 0x3b2434,
    mapCoord: [80, 60],
    connectedRegions: ['low_orbit', 'debris_belt', 'sovereign_defense_zone'],
  },
  debris_belt: {
    id: 'debris_belt',
    index: 3,
    code: 'SECTOR III',
    label: 'The Deep Asteroid Belt',
    subtitle: 'Dense Rotating Rock Corridors, Mining Installations & Ambush Canyons',
    hazardLevel: 'DENSE ASTEROIDS',
    asteroidEnvironment: 'Dense Rotating Asteroid Corridors & Drifting Rock Formations',
    worldCenter: [-17600, 4400, -13800],
    spawnOffset: [950, 140, 2650],
    fieldRadius: 8800,
    smallAsteroids: 64,
    mediumAsteroids: 42,
    largeAsteroids: 22,
    wreckageFragments: 18,
    driftSpeedMultiplier: 1.08,
    hasCapitalShip: false,
    capitalShipName: null,
    capitalShipClass: null,
    hasFriendlyCarrier: false,
    fighterMix: {
      interceptor: 4,
      bomber: 1,
      heavy_fighter: 2,
      scout: 2,
      elite_ace: 2,
      medium_warship: 1,
    },
    encounterZones: [
      {
        id: 'db_canyon_entry',
        label: 'Narrow Asteroid Corridor',
        kind: 'asteroid_corridor',
        offsetFromRegionCenter: [420, 40, 680],
        activationRadius: 2600,
        fighterMix: { interceptor: 2, scout: 2 },
      },
      {
        id: 'db_mining_rig',
        label: 'Abandoned Mining Rig 04',
        kind: 'defense_platform',
        offsetFromRegionCenter: [-2650, 210, -1550],
        activationRadius: 3100,
        fighterMix: { heavy_fighter: 2, bomber: 1, medium_warship: 1 },
        hasDefensePlatform: true,
      },
      {
        id: 'db_ace_ambush',
        label: 'Deep Silicate Drift — Ace Ambush',
        kind: 'patrol',
        offsetFromRegionCenter: [2150, -160, -3450],
        activationRadius: 3200,
        fighterMix: { interceptor: 2, elite_ace: 2 },
      },
    ],
    objectiveSummary: 'Thread the narrow asteroid corridors, break missile locks behind massive rocks, and defeat the Ace ambush.',
    nebulaTintHex: 0x3f2d1e,
    mapCoord: [20, 56],
    connectedRegions: ['low_orbit', 'shattered_fleet', 'outer_frontier'],
  },
  outer_frontier: {
    id: 'outer_frontier',
    index: 4,
    code: 'SECTOR IV',
    label: 'The Outer Frontier',
    subtitle: 'Vast Open Deep Space, Distant Moons, Hidden Listening Stations & Long-Range Patrols',
    hazardLevel: 'OPEN DEEP SPACE',
    asteroidEnvironment: 'Wide Open Void & Sparse Unstable Cometary Drift',
    worldCenter: [-13200, 5600, -34500],
    spawnOffset: [0, 180, 3200],
    fieldRadius: 9600,
    smallAsteroids: 24,
    mediumAsteroids: 14,
    largeAsteroids: 8,
    wreckageFragments: 12,
    driftSpeedMultiplier: 0.85,
    hasCapitalShip: true,
    capitalShipName: 'Alien Patrol Cruiser Kar-09',
    capitalShipClass: 'assault_cruiser',
    hasFriendlyCarrier: false,
    fighterMix: {
      interceptor: 3,
      bomber: 2,
      heavy_fighter: 2,
      scout: 3,
      elite_ace: 1,
      medium_warship: 2,
    },
    encounterZones: [
      {
        id: 'of_quiet_drift',
        label: 'Deep Space Salvage Drift (Quiet Sector)',
        kind: 'wreckage_distress',
        offsetFromRegionCenter: [-2400, 120, 1250],
        activationRadius: 2400,
        fighterMix: {},
        isPeacefulSalvage: true,
      },
      {
        id: 'of_hidden_relay',
        label: 'Hidden Alien Comms Installation',
        kind: 'defense_platform',
        offsetFromRegionCenter: [2800, 260, -1200],
        activationRadius: 3400,
        fighterMix: { scout: 3, interceptor: 2, medium_warship: 1 },
        hasDefensePlatform: true,
      },
      {
        id: 'of_patrol_cruiser',
        label: 'Outer Frontier Cruiser Kar-09',
        kind: 'capital_fleet',
        offsetFromRegionCenter: [-900, 320, -4400],
        activationRadius: 4200,
        fighterMix: { interceptor: 1, bomber: 2, heavy_fighter: 2, elite_ace: 1, medium_warship: 1 },
        hasCapitalShip: true,
      },
    ],
    objectiveSummary: 'Traverse vast open space past distant moons, disable the hidden comms array, and hunt Cruiser Kar-09.',
    nebulaTintHex: 0x162d3d,
    mapCoord: [28, 22],
    connectedRegions: ['debris_belt', 'sovereign_defense_zone'],
  },
  sovereign_defense_zone: {
    id: 'sovereign_defense_zone',
    index: 5,
    code: 'SECTOR V',
    label: "Sovereign's Defence Zone",
    subtitle: 'Massive Orbital Bastion Ring, Elite Armadas & The Sovereign Flagship',
    hazardLevel: 'EXTREME FORTIFICATION',
    asteroidEnvironment: 'Fortified Debris Ring & Shattered Bastion Shards',
    worldCenter: [14600, 5200, -39200],
    spawnOffset: [-800, 220, 3400],
    fieldRadius: 9200,
    smallAsteroids: 38,
    mediumAsteroids: 24,
    largeAsteroids: 12,
    wreckageFragments: 26,
    driftSpeedMultiplier: 1.15,
    hasCapitalShip: true,
    capitalShipName: 'Sovereign Dreadnought Oblivion',
    capitalShipClass: 'heavy_dreadnought',
    hasFriendlyCarrier: true,
    fighterMix: {
      interceptor: 3,
      bomber: 2,
      heavy_fighter: 2,
      scout: 1,
      elite_ace: 3,
      medium_warship: 2,
    },
    encounterZones: [
      {
        id: 'sdz_outer_bastion',
        label: 'Outer Bastion Weapon Platforms',
        kind: 'defense_platform',
        offsetFromRegionCenter: [-2200, 140, 850],
        activationRadius: 3200,
        fighterMix: { interceptor: 3, heavy_fighter: 1, medium_warship: 1 },
        hasDefensePlatform: true,
      },
      {
        id: 'sdz_royal_screen',
        label: 'Sovereign Royal Ace Escort Wing',
        kind: 'patrol',
        offsetFromRegionCenter: [2450, 260, -1450],
        activationRadius: 3400,
        fighterMix: { bomber: 2, scout: 1, elite_ace: 2 },
      },
      {
        id: 'sdz_dreadnought_core',
        label: 'Flagship Bastion — Dreadnought Core',
        kind: 'capital_fleet',
        offsetFromRegionCenter: [0, 310, -4200],
        activationRadius: 4800,
        fighterMix: { heavy_fighter: 1, elite_ace: 1, medium_warship: 1 },
        hasCapitalShip: true,
      },
    ],
    objectiveSummary: 'Breach the orbital bastion ring, strip Dreadnought subsystems, and confront the Sovereign Flagship.',
    nebulaTintHex: 0x3b151e,
    mapCoord: [74, 18],
    connectedRegions: ['shattered_fleet', 'outer_frontier'],
  },
};

export const SPACE_REGION_LIST: SpaceRegionDefinition[] = [
  SPACE_REGIONS.low_orbit,
  SPACE_REGIONS.shattered_fleet,
  SPACE_REGIONS.debris_belt,
  SPACE_REGIONS.outer_frontier,
  SPACE_REGIONS.sovereign_defense_zone,
];

/**
 * Computes exact bounding box span and diagonal of the expanded space theater in kilometers.
 */
export function computeExpandedSpaceDimensionsKm(): {
  spanXKm: number;
  spanYKm: number;
  spanZKm: number;
  interRegionDiagonalKm: number;
  fullNavigableDiagonalKm: number;
  averageRegionDiameterKm: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let totalDiam = 0;

  for (const r of SPACE_REGION_LIST) {
    minX = Math.min(minX, r.worldCenter[0] - r.fieldRadius);
    maxX = Math.max(maxX, r.worldCenter[0] + r.fieldRadius);
    minY = Math.min(minY, r.worldCenter[1] - 1800);
    maxY = Math.max(maxY, r.worldCenter[1] + 1800);
    minZ = Math.min(minZ, r.worldCenter[2] - r.fieldRadius);
    maxZ = Math.max(maxZ, r.worldCenter[2] + r.fieldRadius);
    totalDiam += r.fieldRadius * 2;
  }

  let maxInterDist = 0;
  for (let i = 0; i < SPACE_REGION_LIST.length; i++) {
    for (let j = i + 1; j < SPACE_REGION_LIST.length; j++) {
      const a = SPACE_REGION_LIST[i].worldCenter;
      const b = SPACE_REGION_LIST[j].worldCenter;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (d > maxInterDist) maxInterDist = d;
    }
  }

  const spanXKm = Number(((maxX - minX) / 1000).toFixed(1));
  const spanYKm = Number(((maxY - minY) / 1000).toFixed(1));
  const spanZKm = Number(((maxZ - minZ) / 1000).toFixed(1));
  const fullNavigableDiagonalKm = Number(Math.hypot(spanXKm, spanZKm).toFixed(1));

  return {
    spanXKm,
    spanYKm,
    spanZKm,
    interRegionDiagonalKm: Number((maxInterDist / 1000).toFixed(1)),
    fullNavigableDiagonalKm,
    averageRegionDiameterKm: Number((totalDiam / SPACE_REGION_LIST.length / 1000).toFixed(1)),
  };
}

// =========================================================================
// 5 DISTINCT SPACE WEAPONS (INCLUDING RAIL CANNON) + COUNTERMEASURES
// =========================================================================
export type SpaceWeaponId = 'pulse' | 'heavy_plasma' | 'missile' | 'emp' | 'rail_cannon';

export interface SpaceWeaponSpec {
  id: SpaceWeaponId;
  keyBind: string;
  name: string;
  shortName: string;
  role: string;
  cooldownSec: number;
  chargeTimeSec: number;
  heatPerShot: number;
  projectileSpeed: number;
  fighterDamage: number;
  capitalDamage: number;
  shieldDamageMultiplier: number;
  empDisableSec: number;
}

export const SPACE_WEAPONS: Record<SpaceWeaponId, SpaceWeaponSpec> = {
  pulse: {
    id: 'pulse',
    keyBind: '1',
    name: 'Rapid Pulse Cannons',
    shortName: 'PULSE',
    role: 'Close/mid-range dogfighting (520m eff)',
    cooldownSec: 0.125,
    chargeTimeSec: 0,
    heatPerShot: 4.0,
    projectileSpeed: 780,
    fighterDamage: 24,
    capitalDamage: 14,
    shieldDamageMultiplier: 1.0,
    empDisableSec: 0,
  },
  heavy_plasma: {
    id: 'heavy_plasma',
    keyBind: '2',
    name: 'Heavy Plasma Cannons',
    shortName: 'PLASMA',
    role: 'High-impact plasma bolts (460m eff, lead required)',
    cooldownSec: 0.4,
    chargeTimeSec: 0,
    heatPerShot: 14.0,
    projectileSpeed: 440,
    fighterDamage: 62,
    capitalDamage: 86,
    shieldDamageMultiplier: 0.9,
    empDisableSec: 0,
  },
  missile: {
    id: 'missile',
    keyBind: '3',
    name: 'Homing Missiles',
    shortName: 'MISSILE',
    role: 'Target-lock required high-explosive ordnance',
    cooldownSec: 0.65,
    chargeTimeSec: 0,
    heatPerShot: 0,
    projectileSpeed: 420,
    fighterDamage: 118,
    capitalDamage: 132,
    shieldDamageMultiplier: 1.0,
    empDisableSec: 0,
  },
  emp: {
    id: 'emp',
    keyBind: '4',
    name: 'EMP Disruptor',
    shortName: 'EMP',
    role: 'Shield-strip & tactical stun (440m eff)',
    cooldownSec: 0.85,
    chargeTimeSec: 0,
    heatPerShot: 21.0,
    projectileSpeed: 580,
    fighterDamage: 20,
    capitalDamage: 28,
    shieldDamageMultiplier: 3.8,
    empDisableSec: 5.0,
  },
  rail_cannon: {
    id: 'rail_cannon',
    keyBind: '5',
    name: 'Precision Rail Cannon',
    shortName: 'RAIL',
    role: 'Precision weak-point slug (1050m eff, strict aim)',
    cooldownSec: 1.35,
    chargeTimeSec: 0.48,
    heatPerShot: 28.0,
    projectileSpeed: 1750,
    fighterDamage: 138,
    capitalDamage: 172,
    shieldDamageMultiplier: 1.25,
    empDisableSec: 0,
  },
};

export const SPACE_WEAPON_LIST: SpaceWeaponSpec[] = [
  SPACE_WEAPONS.pulse,
  SPACE_WEAPONS.heavy_plasma,
  SPACE_WEAPONS.missile,
  SPACE_WEAPONS.emp,
  SPACE_WEAPONS.rail_cannon,
];

// =========================================================================
// 5 DESTRUCTIBLE CAPITAL SHIP SUBSYSTEMS
// =========================================================================
export type CapitalSubsystemKey = 'shields' | 'weapons' | 'engines' | 'comms' | 'hangar';

export const CAPITAL_SUBSYSTEM_KEYS: CapitalSubsystemKey[] = [
  'shields',
  'weapons',
  'engines',
  'comms',
  'hangar',
];

export interface CapitalSubsystemState {
  key: CapitalSubsystemKey;
  label: string;
  tacticalEffect: string;
  health: number;
  maxHealth: number;
  destroyed: boolean;
  empDisabledTimer: number;
}

export type CapitalShipClass =
  | 'frigate'
  | 'assault_cruiser'
  | 'heavy_dreadnought'
  | 'sovereign_flagship';

export interface CapitalShipStatus {
  id: string;
  name: string;
  shipClass: CapitalShipClass;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  subsystems: Record<CapitalSubsystemKey, CapitalSubsystemState>;
  destroyed: boolean;
  bossPhase?: number; // 1..3 for Sovereign Flagship
  bridgeHealth: number;
  bridgeMaxHealth: number;
  bridgeDestroyed: boolean;
  armorPlatesRemaining: number; // 0..3 destructible armor plating tiers
}

export function createCapitalShipStatus(
  id: string,
  name: string,
  shipClass: 'frigate' | 'assault_cruiser' | 'heavy_dreadnought' | 'sovereign_flagship',
  shieldReductionPct = 0,
): CapitalShipStatus {
  const isFlagship = shipClass === 'sovereign_flagship';
  const isDread = shipClass === 'heavy_dreadnought';
  const isFrigate = shipClass === 'frigate';

  const maxHull = isFlagship ? 2200 : isDread ? 1450 : isFrigate ? 560 : 880;
  const rawShield = isFlagship ? 1200 : isDread ? 880 : isFrigate ? 320 : 500;
  const maxShield = Math.round(rawShield * (1 - Math.max(0, Math.min(0.4, shieldReductionPct))));
  const subHp = isFlagship ? 420 : isDread ? 340 : isFrigate ? 160 : 220;

  return {
    id,
    name,
    shipClass,
    hull: maxHull,
    maxHull,
    shield: maxShield,
    maxShield,
    subsystems: {
      shields: {
        key: 'shields',
        label: 'Shield Generator',
        tacticalEffect: 'Halts shield regeneration & collapses barrier',
        health: subHp,
        maxHealth: subHp,
        destroyed: false,
        empDisabledTimer: 0,
      },
      weapons: {
        key: 'weapons',
        label: 'Weapon Batteries',
        tacticalEffect: 'Cuts capital ship broadside fire by 75%',
        health: subHp,
        maxHealth: subHp,
        destroyed: false,
        empDisabledTimer: 0,
      },
      engines: {
        key: 'engines',
        label: 'Ion Engines',
        tacticalEffect: 'Cripples capital ship thrust & evasion',
        health: subHp,
        maxHealth: subHp,
        destroyed: false,
        empDisabledTimer: 0,
      },
      comms: {
        key: 'comms',
        label: 'Comms Array',
        tacticalEffect: 'Disrupts enemy fighter coordination & accuracy',
        health: Math.round(subHp * 0.85),
        maxHealth: Math.round(subHp * 0.85),
        destroyed: false,
        empDisabledTimer: 0,
      },
      hangar: {
        key: 'hangar',
        label: 'Fighter Hangar',
        tacticalEffect: 'Prevents enemy fighter reinforcements from launching',
        health: Math.round(subHp * 0.9),
        maxHealth: Math.round(subHp * 0.9),
        destroyed: false,
        empDisabledTimer: 0,
      },
    },
    destroyed: false,
    bossPhase: isFlagship ? 1 : undefined,
    bridgeHealth: Math.round(subHp * 0.95),
    bridgeMaxHealth: Math.round(subHp * 0.95),
    bridgeDestroyed: false,
    armorPlatesRemaining: 3,
  };
}

/**
 * Pure capital ship subsystem damage calculation with EMP disruption, Rail precision bonus, and shield stripping.
 */
export function applyCapitalSubsystemDamage(
  ship: CapitalShipStatus,
  subsystemKey: CapitalSubsystemKey | null,
  weapon: SpaceWeaponId,
  upgradeLevel = 1,
  shipCapitalDamageMultiplier = 1.0,
): { ship: CapitalShipStatus; subsystemDestroyedNow: CapitalSubsystemKey | null } {
  const spec = SPACE_WEAPONS[weapon];
  const levelMult = 1 + (Math.max(1, upgradeLevel) - 1) * 0.22;
  const baseDmg = Math.round(spec.capitalDamage * levelMult * shipCapitalDamageMultiplier);

  let shield = ship.shield;
  let hull = ship.hull;
  const nextSubs: Record<CapitalSubsystemKey, CapitalSubsystemState> = {
    shields: { ...ship.subsystems.shields },
    weapons: { ...ship.subsystems.weapons },
    engines: { ...ship.subsystems.engines },
    comms: { ...ship.subsystems.comms },
    hangar: { ...ship.subsystems.hangar },
  };
  let subsystemDestroyedNow: CapitalSubsystemKey | null = null;

  if (shield > 0) {
    const shieldDmg = Math.round(baseDmg * spec.shieldDamageMultiplier);
    const absorbed = Math.min(shield, shieldDmg);
    shield -= absorbed;

    // Targeted Shield Generator or Rail Cannon precision bleed-through
    const bleedTarget =
      subsystemKey === 'shields' ? 'shields' : weapon === 'rail_cannon' ? subsystemKey : null;
    if (bleedTarget && !nextSubs[bleedTarget].destroyed) {
      const bleedScale = bleedTarget === 'shields' ? 0.68 : 0.42;
      nextSubs[bleedTarget].health = Math.max(
        0,
        nextSubs[bleedTarget].health - Math.round(baseDmg * bleedScale),
      );
      if (spec.empDisableSec > 0) {
        nextSubs[bleedTarget].empDisabledTimer = Math.max(
          nextSubs[bleedTarget].empDisabledTimer,
          spec.empDisableSec,
        );
      }
      if (nextSubs[bleedTarget].health <= 0) {
        nextSubs[bleedTarget].destroyed = true;
        if (bleedTarget === 'shields') shield = 0;
        subsystemDestroyedNow = bleedTarget;
      }
    } else if (spec.empDisableSec > 0 && subsystemKey && !nextSubs[subsystemKey].destroyed) {
      // EMP electromagnetic surge disrupts targeted subsystem electronics even through active shields
      nextSubs[subsystemKey].empDisabledTimer = Math.max(
        nextSubs[subsystemKey].empDisabledTimer,
        Number((spec.empDisableSec * 0.75).toFixed(2)),
      );
    }
  } else {
    hull = Math.max(0, hull - baseDmg);
    if (subsystemKey && !nextSubs[subsystemKey].destroyed) {
      const sub = nextSubs[subsystemKey];
      const subScale = weapon === 'rail_cannon' ? 1.4 : 1.15;
      sub.health = Math.max(0, sub.health - Math.round(baseDmg * subScale));
      if (spec.empDisableSec > 0) {
        sub.empDisabledTimer = Math.max(sub.empDisabledTimer, spec.empDisableSec);
      }
      if (sub.health <= 0) {
        sub.destroyed = true;
        subsystemDestroyedNow = subsystemKey;
        hull = Math.max(0, hull - Math.round(ship.maxHull * 0.12));
      }
    }
  }

  let bossPhase = ship.bossPhase;
  if (ship.shipClass === 'sovereign_flagship') {
    const hullRatio = hull / Math.max(1, ship.maxHull);
    bossPhase = hullRatio <= 0.34 ? 3 : hullRatio <= 0.68 ? 2 : 1;
  }

  return {
    ship: {
      ...ship,
      shield: Math.round(shield),
      hull: Math.round(hull),
      subsystems: nextSubs,
      destroyed: hull <= 0,
      bossPhase,
    },
    subsystemDestroyedNow,
  };
}

/**
 * Pure capital ship combat effectiveness derived from all 5 subsystems.
 */
export function computeCapitalShipPerformance(ship: CapitalShipStatus): {
  speedMultiplier: number;
  fireRateMultiplier: number;
  shieldRegenPerSec: number;
  enemyCoordinationMultiplier: number;
  canLaunchReinforcements: boolean;
} {
  const enginesDown = ship.subsystems.engines.destroyed || ship.subsystems.engines.empDisabledTimer > 0;
  const weaponsDown = ship.subsystems.weapons.destroyed || ship.subsystems.weapons.empDisabledTimer > 0;
  const shieldsDown = ship.subsystems.shields.destroyed || ship.subsystems.shields.empDisabledTimer > 0;
  const commsDown = ship.subsystems.comms.destroyed || ship.subsystems.comms.empDisabledTimer > 0;
  const hangarDown = ship.subsystems.hangar.destroyed || ship.subsystems.hangar.empDisabledTimer > 0;

  return {
    speedMultiplier: enginesDown ? 0.2 : 1.0,
    fireRateMultiplier: weaponsDown ? 0.25 : 1.0,
    shieldRegenPerSec: shieldsDown ? 0 : 14,
    enemyCoordinationMultiplier: commsDown ? 0.55 : 1.0,
    canLaunchReinforcements: !hangarDown,
  };
}

export function computeSpaceRegionDistanceKm(
  pos: [number, number, number],
  regionId: SpaceRegionId,
): number {
  const c = SPACE_REGIONS[regionId].worldCenter;
  const d = Math.hypot(pos[0] - c[0], pos[1] - c[1], pos[2] - c[2]);
  return Number((d / 1000).toFixed(2));
}

// =========================================================================
// LEGACY COMPATIBILITY EXPORTS
// =========================================================================
export type SpaceEncounterId = 'outer_debris_belt' | 'shattered_fleet' | 'dead_orbit';

export interface SpaceEncounterConfig {
  id: SpaceEncounterId;
  index: number;
  label: string;
  code: string;
  hazardLevel: string;
  description: string;
  smallAsteroids: number;
  mediumAsteroids: number;
  largeAsteroids: number;
  wreckageFragments: number;
  enemyRaiders: number;
  enemyCorvettes: number;
  fieldRadius: number;
  driftSpeedMultiplier: number;
  mappedRegionId: SpaceRegionId;
}

export const SPACE_ENCOUNTERS: Record<SpaceEncounterId, SpaceEncounterConfig> = {
  outer_debris_belt: {
    id: 'outer_debris_belt',
    index: 1,
    label: 'The Deep Asteroid Belt',
    code: 'SECTOR III',
    hazardLevel: 'DENSE ASTEROIDS',
    description: 'Vast rotating asteroid corridors, mining installations, and ace ambushes.',
    smallAsteroids: 64,
    mediumAsteroids: 42,
    largeAsteroids: 22,
    wreckageFragments: 18,
    enemyRaiders: 9,
    enemyCorvettes: 2,
    fieldRadius: 8800,
    driftSpeedMultiplier: 1.08,
    mappedRegionId: 'debris_belt',
  },
  shattered_fleet: {
    id: 'shattered_fleet',
    index: 2,
    label: 'The Shattered Front',
    code: 'SECTOR II',
    hazardLevel: 'WRECKAGE GRAVEYARD',
    description: 'Destroyed capital ship hulks, bombers, and Alien Assault Cruiser Vex-04.',
    smallAsteroids: 34,
    mediumAsteroids: 22,
    largeAsteroids: 10,
    wreckageFragments: 42,
    enemyRaiders: 10,
    enemyCorvettes: 2,
    fieldRadius: 8400,
    driftSpeedMultiplier: 0.9,
    mappedRegionId: 'shattered_fleet',
  },
  dead_orbit: {
    id: 'dead_orbit',
    index: 3,
    label: "Sovereign's Defence Zone",
    code: 'SECTOR V',
    hazardLevel: 'EXTREME FORTIFICATION',
    description: 'Massive orbital fortifications, royal elite aces, and Sovereign Dreadnought.',
    smallAsteroids: 38,
    mediumAsteroids: 24,
    largeAsteroids: 12,
    wreckageFragments: 26,
    enemyRaiders: 11,
    enemyCorvettes: 3,
    fieldRadius: 9200,
    driftSpeedMultiplier: 1.15,
    mappedRegionId: 'sovereign_defense_zone',
  },
};

export const SPACE_ENCOUNTER_LIST: SpaceEncounterConfig[] = [
  SPACE_ENCOUNTERS.outer_debris_belt,
  SPACE_ENCOUNTERS.shattered_fleet,
  SPACE_ENCOUNTERS.dead_orbit,
];

export interface ShipVitalsState {
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  engineIntegrity: number;
  controlIntegrity: number;
  weaponIntegrity: number;
  boostEnergy: number;
  weaponHeat: number;
  missiles: number;
  maxMissiles: number;
  countermeasures: number;
  maxCountermeasures: number;
  repairKits: number;
  speed: number;
  altitudeKm: number;
}

export interface FlightInstabilityState {
  pitchShock: number;
  yawShock: number;
  rollShock: number;
  knockbackSpeed: number;
  alarmTimer: number;
}

export type AsteroidSeverity = 'small' | 'medium' | 'severe';
export type ShipImpactZone = 'hull' | 'engine' | 'wing' | 'shield';

export interface AsteroidCollisionInput {
  asteroidMass: number;
  asteroidRadius: number;
  relativeSpeed: number;
  impactCosine: number;
  hitZone: ShipImpactZone;
  vitals: Pick<
    ShipVitalsState,
    'shield' | 'hull' | 'engineIntegrity' | 'controlIntegrity' | 'weaponIntegrity'
  >;
  difficultyDamageScale?: number;
}

export interface AsteroidCollisionResult {
  severity: AsteroidSeverity;
  hitZone: ShipImpactZone;
  rawImpactDamage: number;
  shield: number;
  hull: number;
  engineIntegrity: number;
  controlIntegrity: number;
  weaponIntegrity: number;
  knockbackSpeed: number;
  pitchShock: number;
  yawShock: number;
  rollShock: number;
  cameraShake: number;
  destroyed: boolean;
}

export interface AsteroidProximityAlert {
  risk: 'none' | 'caution' | 'critical';
  nearestDistance: number;
  timeToImpactSec: number | null;
  bearingRad: number;
}

export interface TargetLockEvaluation {
  lockedTargetId: string | null;
  lockProgress: number;
  isLocked: boolean;
  graceSec: number;
}

export function stepSpacecraftSpeed(params: {
  currentSpeed: number;
  boostEnergy: number;
  engineIntegrity: number;
  input: Pick<FlightInputState, 'throttleForward' | 'throttleReverse' | 'boost' | 'brake'> & {
    supercruise?: boolean;
  };
  flightAssist: boolean;
  dt: number;
  engineUpgradeMultiplier?: number;
  shipSpec?: Pick<PlayableShipSpec, 'topSpeed' | 'boostSpeed' | 'cruiseSpeed' | 'accelerationMultiplier'>;
}): {
  speed: number;
  boostEnergy: number;
  isBoosting: boolean;
  isSupercruise: boolean;
  boostState: 'ready' | 'boosting' | 'recharging' | 'low';
} {
  const { currentSpeed, engineIntegrity, input, flightAssist, dt } = params;
  let boostEnergy = params.boostEnergy;
  const upg = params.engineUpgradeMultiplier ?? 1.0;
  const baseTop = params.shipSpec?.topSpeed ?? 220;
  const baseBoost = params.shipSpec?.boostSpeed ?? 390;
  const baseCruise = params.shipSpec?.cruiseSpeed ?? 1380;
  const accelMult = params.shipSpec?.accelerationMultiplier ?? 1.0;

  const engineFactor = (0.44 + 0.56 * (Math.max(0, Math.min(100, engineIntegrity)) / 100)) * upg;
  const isSupercruise = Boolean(input.supercruise) && !input.brake && engineIntegrity > 25;
  const canBoost = input.boost && boostEnergy > 4 && !input.brake && engineIntegrity > 22 && !isSupercruise;

  const maxForward = (isSupercruise ? baseCruise : canBoost ? baseBoost : baseTop) * engineFactor;
  const maxReverse = -75 * engineFactor;

  let speed = currentSpeed;
  if (input.brake) {
    const damp = Math.min(1, dt * 5.6);
    speed += (0 - speed) * damp;
    if (Math.abs(speed) < 0.8) speed = 0;
  } else if (isSupercruise) {
    speed = Math.min(maxForward, speed + 560 * engineFactor * accelMult * dt);
  } else if (canBoost) {
    // Punchy intercept burst to close distance on fleeing fighters while keeping energy finite
    speed = Math.min(maxForward, speed + 335 * engineFactor * accelMult * dt);
    boostEnergy = Math.max(0, boostEnergy - 21 * dt);
  } else if (input.throttleForward) {
    speed = Math.min(maxForward, speed + 165 * engineFactor * accelMult * dt);
  } else if (input.throttleReverse) {
    speed = Math.max(maxReverse, speed - 125 * engineFactor * accelMult * dt);
  } else if (flightAssist) {
    // Smoothly bleed back down from supercruise or stabilize to comfortable dogfight cruise
    const cruiseTarget = speed > baseTop ? baseTop * 0.76 : speed > 36 ? 58 : 0;
    const dampRate = speed > baseTop ? 2.3 : 1.5;
    speed += (cruiseTarget - speed) * Math.min(1, dt * dampRate);
  }

  if (!canBoost) {
    boostEnergy = Math.min(100, boostEnergy + 24 * dt);
  }

  const boostState: 'ready' | 'boosting' | 'recharging' | 'low' = canBoost
    ? 'boosting'
    : boostEnergy < 18
      ? 'low'
      : boostEnergy < 96
        ? 'recharging'
        : 'ready';

  return { speed, boostEnergy, isBoosting: canBoost, isSupercruise, boostState };
}

export function stepTargetLock(params: {
  currentTargetId: string | null;
  currentProgress: number;
  bestCandidateId: string | null;
  bestCandidateDot: number;
  bestCandidateDist: number;
  dt: number;
  maxLockRange?: number;
  coneDotThreshold?: number;
  currentGraceSec?: number;
  maintainDotThreshold?: number;
  currentTargetDot?: number;
  currentTargetDist?: number;
}): TargetLockEvaluation {
  const {
    currentTargetId,
    currentProgress,
    bestCandidateId,
    bestCandidateDot,
    bestCandidateDist,
    dt,
    maxLockRange = 2800,
    coneDotThreshold = 0.89,
    currentGraceSec = 0,
    maintainDotThreshold = coneDotThreshold - 0.11,
    currentTargetDot,
    currentTargetDist,
  } = params;

  const inAcquireCone =
    bestCandidateId !== null &&
    bestCandidateDot >= coneDotThreshold &&
    bestCandidateDist <= maxLockRange;

  // Hysteresis: keep an existing acquiring/locked target stable within a wider gimbal cone
  const trackedDot =
    currentTargetDot !== undefined
      ? currentTargetDot
      : bestCandidateId === currentTargetId
        ? bestCandidateDot
        : -1;
  const trackedDist =
    currentTargetDist !== undefined
      ? currentTargetDist
      : bestCandidateId === currentTargetId
        ? bestCandidateDist
        : Infinity;

  const heldInMaintainCone =
    currentTargetId !== null &&
    currentProgress >= 0.35 &&
    trackedDot >= maintainDotThreshold &&
    trackedDist <= maxLockRange * 1.12;

  if (inAcquireCone) {
    // Prefer continuing lock on current target if it's still cleanly inside maintain cone
    const targetId =
      heldInMaintainCone && currentTargetId !== null && bestCandidateId !== currentTargetId && currentProgress >= 0.65
        ? currentTargetId
        : bestCandidateId;

    const nextProgress =
      targetId === currentTargetId
        ? Math.min(1, currentProgress + dt * 1.18)
        : Math.min(1, dt * 0.78);

    return {
      lockedTargetId: targetId,
      lockProgress: nextProgress,
      isLocked: nextProgress >= 0.99,
      graceSec: 0.55,
    };
  }

  if (heldInMaintainCone && currentTargetId !== null) {
    // Target drifted slightly outside tight acquire cone but still inside gimbal maintain cone
    const wasLocked = currentProgress >= 0.99;
    const nextProgress = wasLocked ? 1.0 : Math.min(1, currentProgress + dt * 0.45);
    return {
      lockedTargetId: currentTargetId,
      lockProgress: nextProgress,
      isLocked: nextProgress >= 0.99,
      graceSec: 0.55,
    };
  }

  // Brief grace window prevents 1-frame flickers from dropping a completed lock prematurely
  if (currentTargetId !== null && currentProgress >= 0.99 && currentGraceSec > 0) {
    const nextGrace = Math.max(0, currentGraceSec - dt);
    if (nextGrace > 0) {
      return {
        lockedTargetId: currentTargetId,
        lockProgress: 1.0,
        isLocked: true,
        graceSec: nextGrace,
      };
    }
  }

  const decayed = Math.max(0, currentProgress - dt * 1.35);
  return {
    lockedTargetId: decayed > 0 ? currentTargetId : null,
    lockProgress: decayed,
    isLocked: false,
    graceSec: 0,
  };
}

export function applyShipDamage(
  vitals: Pick<ShipVitalsState, 'shield' | 'hull' | 'engineIntegrity'>,
  damage: number,
): { shield: number; hull: number; engineIntegrity: number; destroyed: boolean } {
  let rem = Math.max(0, damage);
  let shield = vitals.shield;
  let hull = vitals.hull;
  let engineIntegrity = vitals.engineIntegrity;

  if (shield > 0) {
    const absorbed = Math.min(shield, rem);
    shield -= absorbed;
    rem -= absorbed;
  }

  if (rem > 0) {
    hull = Math.max(0, hull - rem);
    if (hull < 65) {
      engineIntegrity = Math.max(25, engineIntegrity - rem * 0.55);
    }
  }

  return {
    shield: Math.round(shield),
    hull: Math.round(hull),
    engineIntegrity: Math.round(engineIntegrity),
    destroyed: hull <= 0,
  };
}

export function computeAsteroidCollision(
  input: AsteroidCollisionInput,
): AsteroidCollisionResult {
  const cosAngle = Math.max(0.18, Math.min(1.0, input.impactCosine));
  const speed = Math.max(12, Math.min(480, input.relativeSpeed));
  const massFactor = Math.min(2.6, 0.45 + Math.sqrt(Math.max(0.2, input.asteroidMass)) * 0.68);
  const diffScale = input.difficultyDamageScale ?? 1.0;

  const rawImpactDamage = Math.min(
    88,
    Math.round(speed * 0.24 * massFactor * (0.45 + cosAngle * 0.72) * diffScale),
  );

  let severity: AsteroidSeverity = 'small';
  if (rawImpactDamage >= 46 || (input.asteroidMass >= 4.5 && speed >= 85 && cosAngle >= 0.55)) {
    severity = 'severe';
  } else if (rawImpactDamage >= 22 || (input.asteroidMass >= 1.6 && speed >= 55)) {
    severity = 'medium';
  }

  let rem = rawImpactDamage;
  let shield = input.vitals.shield;
  let hull = input.vitals.hull;
  let engineIntegrity = input.vitals.engineIntegrity;
  let controlIntegrity = input.vitals.controlIntegrity;
  let weaponIntegrity = input.vitals.weaponIntegrity;

  if (shield > 0) {
    const bleed = severity === 'severe' ? rem * 0.16 : 0;
    const shieldPart = rem - bleed;
    const absorbed = Math.min(shield, shieldPart);
    shield -= absorbed;
    rem = shieldPart - absorbed + bleed;
  }

  if (rem > 0) {
    hull = Math.max(0, hull - rem);
  }

  const severityMult = severity === 'severe' ? 1.0 : severity === 'medium' ? 0.55 : 0.18;
  const effectiveHitZone: ShipImpactZone =
    shield > 18 && severity === 'small' ? 'shield' : input.hitZone;

  if (effectiveHitZone === 'engine') {
    engineIntegrity = Math.max(20, engineIntegrity - Math.round(32 * severityMult));
    controlIntegrity = Math.max(30, controlIntegrity - Math.round(10 * severityMult));
  } else if (effectiveHitZone === 'wing') {
    controlIntegrity = Math.max(25, controlIntegrity - Math.round(34 * severityMult));
    weaponIntegrity = Math.max(30, weaponIntegrity - Math.round(20 * severityMult));
  } else if (effectiveHitZone === 'hull') {
    engineIntegrity = Math.max(25, engineIntegrity - Math.round(16 * severityMult));
    controlIntegrity = Math.max(30, controlIntegrity - Math.round(16 * severityMult));
    weaponIntegrity = Math.max(35, weaponIntegrity - Math.round(12 * severityMult));
  }

  const shockScale = severity === 'severe' ? 1.12 : severity === 'medium' ? 0.66 : 0.3;
  const knockbackSpeed = Math.min(96, 18 + speed * 0.38 * shockScale);
  const pitchShock = Math.min(0.9, (0.26 + cosAngle * 0.45) * shockScale);
  const yawShock = Math.min(1.0, (0.32 + (1 - cosAngle) * 0.5) * shockScale);
  const rollShock = Math.min(1.3, (0.4 + (effectiveHitZone === 'wing' ? 0.52 : 0.2)) * shockScale);
  const cameraShake = severity === 'severe' ? 1.0 : severity === 'medium' ? 0.58 : 0.26;

  return {
    severity,
    hitZone: effectiveHitZone,
    rawImpactDamage,
    shield: Math.round(shield),
    hull: Math.round(hull),
    engineIntegrity: Math.round(engineIntegrity),
    controlIntegrity: Math.round(controlIntegrity),
    weaponIntegrity: Math.round(weaponIntegrity),
    knockbackSpeed,
    pitchShock,
    yawShock,
    rollShock,
    cameraShake,
    destroyed: hull <= 0,
  };
}

export function stepFlightStability(
  state: FlightInstabilityState,
  flightAssist: boolean,
  dt: number,
): FlightInstabilityState {
  const decayRate = flightAssist ? 3.5 : 1.45;
  const factor = Math.exp(-decayRate * dt);
  const knockFactor = Math.exp(-2.8 * dt);

  return {
    pitchShock: Math.abs(state.pitchShock * factor) < 0.005 ? 0 : state.pitchShock * factor,
    yawShock: Math.abs(state.yawShock * factor) < 0.005 ? 0 : state.yawShock * factor,
    rollShock: Math.abs(state.rollShock * factor) < 0.005 ? 0 : state.rollShock * factor,
    knockbackSpeed:
      Math.abs(state.knockbackSpeed * knockFactor) < 0.2 ? 0 : state.knockbackSpeed * knockFactor,
    alarmTimer: Math.max(0, state.alarmTimer - dt),
  };
}

export function applyShipRepair(
  vitals: Pick<
    ShipVitalsState,
    'hull' | 'maxHull' | 'shield' | 'maxShield' | 'engineIntegrity' | 'controlIntegrity' | 'weaponIntegrity'
  >,
  hullRestore: number,
  subsystemRestore: number,
): {
  hull: number;
  shield: number;
  engineIntegrity: number;
  controlIntegrity: number;
  weaponIntegrity: number;
} {
  return {
    hull: Math.min(vitals.maxHull, Math.round(vitals.hull + hullRestore)),
    shield: Math.min(vitals.maxShield, Math.round(vitals.shield + hullRestore * 0.85)),
    engineIntegrity: Math.min(100, Math.round(vitals.engineIntegrity + subsystemRestore)),
    controlIntegrity: Math.min(100, Math.round(vitals.controlIntegrity + subsystemRestore)),
    weaponIntegrity: Math.min(100, Math.round(vitals.weaponIntegrity + subsystemRestore)),
  };
}

export function evaluateAsteroidProximity(params: {
  clearanceDist: number;
  closingSpeed: number;
  bearingRad: number;
}): AsteroidProximityAlert {
  const { clearanceDist, closingSpeed, bearingRad } = params;
  const tti = closingSpeed > 4 ? clearanceDist / closingSpeed : null;

  let risk: 'none' | 'caution' | 'critical' = 'none';
  if (clearanceDist < 28 || (tti !== null && tti < 1.9 && clearanceDist < 150)) {
    risk = 'critical';
  } else if (clearanceDist < 72 || (tti !== null && tti < 3.8 && clearanceDist < 260)) {
    risk = 'caution';
  }

  return {
    risk,
    nearestDistance: Math.max(0, Math.round(clearanceDist)),
    timeToImpactSec: tti !== null ? Number(tti.toFixed(1)) : null,
    bearingRad,
  };
}

// =========================================================================
// BREAKABLE ASTEROID PREDICATE & WORLD-SPACE ENEMY HEALTH BAR SELECTION
// =========================================================================
export function isAsteroidBreakable(
  tier: 'small' | 'medium' | 'large',
  mass: number,
): boolean {
  return tier === 'small' && mass <= 1.65;
}

export interface EnemyHealthBarCandidate {
  id: string;
  name: string;
  roleBadge: string;
  shipClass: EnemyShipClass;
  screenX: number; // normalized 0..1
  screenY: number; // normalized 0..1
  inFront: boolean;
  distanceMeters: number;
  shieldPct: number; // 0..100
  hullPct: number; // 0..100
  isTargeted: boolean;
  wasRecentlyHit: boolean;
  justDestroyed: boolean;
  activeSubsystems?: number;
  totalSubsystems?: number;
}

export interface EnemyHealthBarMarker {
  id: string;
  name: string;
  roleBadge: string;
  shipClass: EnemyShipClass;
  screenX: number;
  screenY: number;
  distanceMeters: number;
  shieldPct: number;
  hullPct: number;
  isTargeted: boolean;
  isCritical: boolean;
  wasRecentlyHit: boolean;
  justDestroyed: boolean;
  scale: number; // 0.72..1.0 based on distance
  activeSubsystems?: number;
  totalSubsystems?: number;
}

/**
 * Pure prioritization filter for world-space enemy health bars.
 * Keeps targeted, damaged, nearby, capital, and medium warships readable without visual clutter.
 */
export function selectVisibleEnemyHealthBars(
  candidates: EnemyHealthBarCandidate[],
  options?: {
    maxVisible?: number;
    fighterMaxRange?: number;
    warshipMaxRange?: number;
  },
): EnemyHealthBarMarker[] {
  const maxVisible = options?.maxVisible ?? 7;
  const fighterMaxRange = options?.fighterMaxRange ?? 2800;
  const warshipMaxRange = options?.warshipMaxRange ?? 4600;

  const eligible = candidates.filter((c) => {
    if (!c.inFront) return false;
    if (c.screenX < 0.04 || c.screenX > 0.96 || c.screenY < 0.06 || c.screenY > 0.9) {
      return false;
    }
    if (c.isTargeted || c.justDestroyed) return true;
    const rangeLimit = c.shipClass === 'fighter' ? fighterMaxRange : warshipMaxRange;
    if (c.distanceMeters > rangeLimit) return false;
    // Show damaged, medium/capital, or nearby active threats
    return (
      c.shipClass !== 'fighter' ||
      c.wasRecentlyHit ||
      c.hullPct < 98 ||
      c.shieldPct < 98 ||
      c.distanceMeters <= 1750
    );
  });

  const priorityScore = (c: EnemyHealthBarCandidate): number => {
    let score = 0;
    if (c.isTargeted) score += 10000;
    if (c.justDestroyed) score += 7000;
    if (c.shipClass === 'capital') score += 4200;
    else if (c.shipClass === 'medium') score += 2800;
    if (c.wasRecentlyHit) score += 1600;
    if (c.hullPct < 100 || c.shieldPct < 100) score += 900;
    score -= c.distanceMeters * 0.45;
    return score;
  };

  eligible.sort((a, b) => priorityScore(b) - priorityScore(a));

  return eligible.slice(0, maxVisible).map((c) => {
    const maxRef = c.shipClass === 'fighter' ? fighterMaxRange : warshipMaxRange;
    const distRatio = Math.max(0, Math.min(1, c.distanceMeters / maxRef));
    const scale = Number((1 - distRatio * 0.26).toFixed(2));
    return {
      id: c.id,
      name: c.name,
      roleBadge: c.roleBadge,
      shipClass: c.shipClass,
      screenX: Number(c.screenX.toFixed(4)),
      screenY: Number(c.screenY.toFixed(4)),
      distanceMeters: Math.round(c.distanceMeters),
      shieldPct: Math.max(0, Math.min(100, Math.round(c.shieldPct))),
      hullPct: Math.max(0, Math.min(100, Math.round(c.hullPct))),
      isTargeted: c.isTargeted,
      isCritical: !c.justDestroyed && c.hullPct <= 30,
      wasRecentlyHit: c.wasRecentlyHit,
      justDestroyed: c.justDestroyed,
      scale,
      activeSubsystems: c.activeSubsystems,
      totalSubsystems: c.totalSubsystems,
    };
  });
}
