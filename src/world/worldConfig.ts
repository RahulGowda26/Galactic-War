export type RegionId =
  | 'crown_city'
  | 'ruined_district'
  | 'war_plains'
  | 'fallen_fleet'
  | 'arrival_zone';

export interface RegionDefinition {
  id: RegionId;
  name: string;
  code: string;
  center: [number, number];
  radius: number;
  elevationBase: number;
  spawnPos: [number, number, number];
  spawnYaw: number;
  summary: string;
  lighting: {
    fogColor: number;
    fogDensity: number;
    sunColor: number;
    sunIntensity: number;
    hemiSky: number;
    hemiGround: number;
    hemiIntensity: number;
    exposure: number;
  };
}

export interface CraterSpec {
  x: number;
  z: number;
  radius: number;
  depth: number;
  rimHeight: number;
}

export interface WorldCollider {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface InspectionPreset {
  id: string;
  label: string;
  shortLabel: string;
  regionId: RegionId;
  category: 'environment' | 'antagonist' | 'overview';
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  description: string;
}

// Expanded ~8km x 8km playable planetary battlefield inside a 12.8km mountain basin
export const WORLD_PLAYABLE_HALF = 4000;
export const WORLD_HORIZON_HALF = 6400;
export const WATER_LEVEL = -4.0;

// Sovereign's Command Dais anchor overlooking the Arrival Citadel & burning valley
export const SOVEREIGN_WORLD_POS: [number, number, number] = [1085, 114.0, -1315];
export const SOVEREIGN_FACING_YAW = -0.68;

// Default player frontline spawn on Crown City Grand Avenue looking toward burning skyscrapers & Ruined District
export const PLAYER_START_POS: [number, number, number] = [-1085, 22, -745];
export const PLAYER_START_YAW = -1.12;

// Allied VX-94 Valkyrie Interceptor parked on Crown City Emergency Landing Pad (short walk from spawn!)
export const VALKYRIE_PAD_POS: [number, number, number] = [-1044, 18.2, -736];
// Orbital Space Warfare Theater directly above Aether Prime cloud deck
export const ORBITAL_CENTER_POS: [number, number, number] = [0, 3200, 0];

export const REGIONS: Record<RegionId, RegionDefinition> = {
  crown_city: {
    id: 'crown_city',
    name: 'The Crown City',
    code: 'SECTOR A',
    center: [-1350, -950],
    radius: 1180,
    elevationBase: 18,
    spawnPos: [-1085, 22, -745],
    spawnYaw: -1.12,
    summary:
      'Darkened, burning metropolitan capital under active alien invasion — shattered towers, thick smoke, emergency beacons, and allied landing pad.',
    lighting: {
      fogColor: 0x161d29,
      fogDensity: 0.00024,
      sunColor: 0x9bb7dc,
      sunIntensity: 1.55,
      hemiSky: 0x455a78,
      hemiGround: 0x2a1c17,
      hemiIntensity: 0.92,
      exposure: 1.08,
    },
  },
  ruined_district: {
    id: 'ruined_district',
    name: 'The Ruined District',
    code: 'SECTOR B',
    center: [-120, -480],
    radius: 960,
    elevationBase: 14,
    spawnPos: [-308, 18, -356],
    spawnYaw: -0.52,
    summary:
      'Catastrophically devastated urban blocks with hollow structural skeletons, severed overpasses, burning debris, and six alien invader classes.',
    lighting: {
      fogColor: 0x1a1e26,
      fogDensity: 0.00029,
      sunColor: 0xd4a480,
      sunIntensity: 1.5,
      hemiSky: 0x435166,
      hemiGround: 0x2e1f19,
      hemiIntensity: 0.88,
      exposure: 1.05,
    },
  },
  war_plains: {
    id: 'war_plains',
    name: 'The Open War Plains',
    code: 'SECTOR C',
    center: [1350, 920],
    radius: 1420,
    elevationBase: 22,
    spawnPos: [1080, 32, 790],
    spawnYaw: 2.45,
    summary:
      'Vast rolling rocky valleys, fortified trench lines, rail artillery batteries, downed war machines, and long planetary sightlines.',
    lighting: {
      fogColor: 0x7d766b,
      fogDensity: 0.00016,
      sunColor: 0xffd7a3,
      sunIntensity: 2.45,
      hemiSky: 0xa2b3c6,
      hemiGround: 0x52493b,
      hemiIntensity: 0.98,
      exposure: 1.1,
    },
  },
  fallen_fleet: {
    id: 'fallen_fleet',
    name: 'The Fallen Fleet',
    code: 'SECTOR D',
    center: [-1050, 1200],
    radius: 1080,
    elevationBase: 12,
    spawnPos: [-740, 22, 1080],
    spawnYaw: 1.25,
    summary:
      'Massive orbital crash scar housing a downed ringed alien dreadnought, exposed reactor cores, shattered dropships, and military cordons.',
    lighting: {
      fogColor: 0x62676f,
      fogDensity: 0.00021,
      sunColor: 0xf2cfa4,
      sunIntensity: 2.15,
      hemiSky: 0x899fb8,
      hemiGround: 0x3a3735,
      hemiIntensity: 0.95,
      exposure: 1.08,
    },
  },
  arrival_zone: {
    id: 'arrival_zone',
    name: "The Sovereign's Arrival Citadel",
    code: 'SECTOR E',
    center: [1280, -1550],
    radius: 1220,
    elevationBase: 92,
    spawnPos: [920, 96, -1120],
    spawnYaw: -2.42,
    summary:
      'Elevated volcanic-obsidian invasion plateau dominated by the colossal horned Arrival Citadel, hovering warships, and The Sovereign.',
    lighting: {
      fogColor: 0x38363c,
      fogDensity: 0.00024,
      sunColor: 0xffb37a,
      sunIntensity: 2.05,
      hemiSky: 0x6b7c96,
      hemiGround: 0x2c2220,
      hemiIntensity: 0.85,
      exposure: 1.08,
    },
  },
};

export const REGION_LIST: RegionDefinition[] = [
  REGIONS.crown_city,
  REGIONS.ruined_district,
  REGIONS.war_plains,
  REGIONS.fallen_fleet,
  REGIONS.arrival_zone,
];

export const CRATERS: CraterSpec[] = [
  // Colossal Fallen Fleet Dreadnought impact scar
  { x: -1080, z: 1240, radius: 265, depth: 28, rimHeight: 20 },
  { x: -720, z: 1020, radius: 95, depth: 12, rimHeight: 7 },
  { x: -1360, z: 980, radius: 110, depth: 14, rimHeight: 8 },
  // Ruined District orbital bombardment craters
  { x: -55, z: -510, radius: 85, depth: 11, rimHeight: 5.5 },
  { x: -240, z: -310, radius: 58, depth: 8, rimHeight: 4.0 },
  { x: 185, z: -340, radius: 72, depth: 9.5, rimHeight: 4.5 },
  // War Plains artillery & alien drop-pod craters
  { x: 960, z: 580, radius: 105, depth: 13, rimHeight: 7.5 },
  { x: 1580, z: 1050, radius: 135, depth: 16, rimHeight: 9.0 },
  { x: 1220, z: 1420, radius: 90, depth: 10, rimHeight: 5.5 },
  { x: 1840, z: 620, radius: 115, depth: 14, rimHeight: 7.5 },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hash2(ix: number, iz: number): number {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

export function noise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export function fbm2D(x: number, z: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2D(x * freq, z * freq);
    norm += amp;
    freq *= 2.04;
    amp *= 0.5;
  }
  return sum / norm;
}

export function ridgedFbm2D(x: number, z: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise2D(x * freq, z * freq) * 2 - 1);
    sum += amp * n * n;
    norm += amp;
    freq *= 2.08;
    amp *= 0.48;
  }
  return sum / norm;
}

/**
 * Winding Aether River channel flowing from WNW through the valley toward SSE.
 */
export function getRiverCenterZ(x: number): number {
  return 260 + Math.sin(x * 0.00125) * 320 + Math.cos(x * 0.00062) * 145;
}

export function getRiverInfluence(x: number, z: number): number {
  const rz = getRiverCenterZ(x);
  const dist = Math.abs(z - rz);
  const halfWidth = 72 + smoothstep(-600, 1800, x) * 42;
  return 1 - smoothstep(halfWidth * 0.42, halfWidth * 1.48, dist);
}

export interface RegionWeights {
  crown_city: number;
  ruined_district: number;
  war_plains: number;
  fallen_fleet: number;
  arrival_zone: number;
  dominant: RegionId;
}

export function getRegionWeights(x: number, z: number): RegionWeights {
  const weights: Record<RegionId, number> = {
    crown_city: 0,
    ruined_district: 0,
    war_plains: 0,
    fallen_fleet: 0,
    arrival_zone: 0,
  };

  let total = 0;
  for (const r of REGION_LIST) {
    const dx = x - r.center[0];
    const dz = z - r.center[1];
    const d = Math.hypot(dx, dz);
    const norm = d / r.radius;
    const w = Math.exp(-norm * norm * 1.55);
    weights[r.id] = w;
    total += w;
  }

  let dominant: RegionId = 'war_plains';
  let best = -1;
  for (const r of REGION_LIST) {
    const normalized = total > 1e-6 ? weights[r.id] / total : 0.2;
    weights[r.id] = normalized;
    if (normalized > best) {
      best = normalized;
      dominant = r.id;
    }
  }

  return {
    crown_city: weights.crown_city,
    ruined_district: weights.ruined_district,
    war_plains: weights.war_plains,
    fallen_fleet: weights.fallen_fleet,
    arrival_zone: weights.arrival_zone,
    dominant,
  };
}

/**
 * Deterministic 8km planetary terrain elevation at any (x, z) coordinate in meters.
 * Features realistic ridged geological formations, cliffs, valleys, flat terraced urban grid,
 * scarred ruined district, elevated Arrival Citadel plateau, river channel, craters, and outer mountains.
 */
export function getTerrainHeight(x: number, z: number): number {
  const rw = getRegionWeights(x, z);

  // Macro rolling topography + geological ridge outcrops
  const macro = (fbm2D(x * 0.00048 + 3.1, z * 0.00048 - 1.7, 4) - 0.44) * 92;
  const ridges = ridgedFbm2D(x * 0.0011 - 2.3, z * 0.0011 + 4.1, 4) * 38;
  const micro = (fbm2D(x * 0.0055 - 5.2, z * 0.0055 + 2.4, 3) - 0.5) * 7.5;

  // Crown City sits on a clean terraced metropolitan shelf so streets and towers sit flush
  const cityDist = Math.hypot(x - REGIONS.crown_city.center[0], z - REGIONS.crown_city.center[1]);
  const cityFlat = 1 - smoothstep(680, 1280, cityDist);
  const cityHeight = 18.0 + (fbm2D(x * 0.0009, z * 0.0009, 2) - 0.5) * 4.0;

  // Hero street boulevard corridor stays crisp and level around spawn (-1085, -745)
  const heroStreetDist = Math.hypot(x - -1160, z - -820);
  const heroStreetFlat = 1 - smoothstep(260, 480, heroStreetDist);

  // Ruined District sits on scarred urban level with uneven rubble undulations
  const ruinDist = Math.hypot(
    x - REGIONS.ruined_district.center[0],
    z - REGIONS.ruined_district.center[1],
  );
  const ruinMask = 1 - smoothstep(520, 980, ruinDist);
  const ruinHeight = 14.5 + micro * 0.85;

  // Arrival Zone rises onto a monumental terraced volcanic-obsidian highland plateau
  const arrDist = Math.hypot(
    x - REGIONS.arrival_zone.center[0],
    z - REGIONS.arrival_zone.center[1],
  );
  const arrPlateau = 1 - smoothstep(460, 1080, arrDist);
  const arrCore = 1 - smoothstep(220, 520, arrDist);
  const arrCliffTerrace = Math.floor(arrPlateau * 4) * 3.5 + arrPlateau * 64 + arrCore * 18;
  const arrHeight = 18 + arrCliffTerrace + micro * 0.45;

  // War Plains dramatic rocky ridges & defensive valley shelves
  const plainsRidges =
    (ridgedFbm2D(x * 0.0016 + 1.2, z * 0.0016 - 0.8, 3) - 0.35) * 58 +
    Math.sin(x * 0.0022 + z * 0.0014) * 16;

  // Blend regions smoothly
  let h = 20 + macro + ridges * 0.55 + micro + plainsRidges * rw.war_plains;
  h = h * (1 - cityFlat) + cityHeight * cityFlat;
  h = h * (1 - heroStreetFlat) + 18.0 * heroStreetFlat;
  h = h * (1 - ruinMask * 0.82) + ruinHeight * (ruinMask * 0.82);
  h = h * (1 - arrPlateau) + arrHeight * arrPlateau;

  // Sovereign's Command Dais flat overlook shelf at (1085, -1315)
  const daisDist = Math.hypot(x - SOVEREIGN_WORLD_POS[0], z - SOVEREIGN_WORLD_POS[2]);
  const daisMask = 1 - smoothstep(48, 120, daisDist);
  h = h * (1 - daisMask) + 109.0 * daisMask;

  // Winding Aether River valley & natural sloped riverbanks (suppressed on high Arrival plateau)
  const river = getRiverInfluence(x, z) * (1 - arrPlateau * 0.95);
  h = h * (1 - river) + -16.0 * river;

  // Impact craters with depressed bowls and raised rocky ejecta rims
  for (let i = 0; i < CRATERS.length; i++) {
    const c = CRATERS[i];
    const dist = Math.hypot(x - c.x, z - c.z);
    if (dist < c.radius * 1.48) {
      const rNorm = dist / c.radius;
      if (rNorm < 1.0) {
        const bowl = Math.cos(rNorm * Math.PI * 0.5);
        h -= bowl * bowl * c.depth;
      }
      const rimDelta = rNorm - 1.05;
      const rim = Math.exp(-(rimDelta * rimDelta) / 0.048);
      h += rim * c.rimHeight;
    }
  }

  // Towering jagged planetary mountain ring beyond the 3.4km playable basin
  const radial = Math.hypot(x, z);
  if (radial > 3200) {
    const ringFactor = smoothstep(3200, 5600, radial);
    const peakNoise = ridgedFbm2D(x * 0.00075 + 9.4, z * 0.00075 - 4.8, 4);
    const secondary = fbm2D(x * 0.0018 - 3.1, z * 0.0018 + 6.2, 3);
    const peaks = Math.pow(peakNoise, 1.45) * 980 + secondary * 210 + 95;
    h += ringFactor * peaks;
  }

  return h;
}

/**
 * Estimates terrain surface normal slope (0 = flat, 1 = sheer vertical cliff) for rock/cliff shading.
 */
export function getTerrainSlope(x: number, z: number, step = 6): number {
  const hL = getTerrainHeight(x - step, z);
  const hR = getTerrainHeight(x + step, z);
  const hD = getTerrainHeight(x, z - step);
  const hU = getTerrainHeight(x, z + step);
  const dx = (hR - hL) / (step * 2);
  const dz = (hU - hD) / (step * 2);
  const grad = Math.hypot(dx, dz);
  return Math.min(1, grad / 1.15);
}

/**
 * Resolves a circle/cylinder actor (player or enemy) against axis-aligned world building colliders.
 */
export function resolveHorizontalColliders(
  x: number,
  y: number,
  z: number,
  radius: number,
  actorHeight: number,
  colliders: readonly WorldCollider[],
): { x: number; z: number; collided: boolean } {
  let rx = x;
  let rz = z;
  let collided = false;

  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (y + actorHeight < c.minY || y > c.maxY) continue;

    const closestX = Math.max(c.minX, Math.min(rx, c.maxX));
    const closestZ = Math.max(c.minZ, Math.min(rz, c.maxZ));
    const dx = rx - closestX;
    const dz = rz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      collided = true;
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        rx += (dx / dist) * push;
        rz += (dz / dist) * push;
      } else {
        // Inside AABB: push out along nearest face
        const dLeft = Math.abs(rx - c.minX);
        const dRight = Math.abs(c.maxX - rx);
        const dBack = Math.abs(rz - c.minZ);
        const dFront = Math.abs(c.maxZ - rz);
        const minD = Math.min(dLeft, dRight, dBack, dFront);
        if (minD === dLeft) rx = c.minX - radius;
        else if (minD === dRight) rx = c.maxX + radius;
        else if (minD === dBack) rz = c.minZ - radius;
        else rz = c.maxZ + radius;
      }
    }
  }

  return { x: rx, z: rz, collided };
}

export const INSPECTION_PRESETS: InspectionPreset[] = [
  {
    id: 'ground_city',
    label: '1. Crown City — Dark Invasion Front',
    shortLabel: 'Dark City',
    regionId: 'crown_city',
    category: 'environment',
    position: [-1008, 34, -692],
    target: [-1210, 118, -915],
    fov: 56,
    description:
      'Dark storm-lit Crown City war zone under lightning skies, with burning skyscraper floors, wrecked cars, and hovering alien saucer warships firing plasma beams.',
  },
  {
    id: 'rooftop_skyline',
    label: '2. Crown City — Skyline Panorama',
    shortLabel: 'Skyline',
    regionId: 'crown_city',
    category: 'environment',
    position: [-1560, 210, -1180],
    target: [-320, 75, -620],
    fov: 50,
    description:
      'High-altitude capital skyline panorama sweeping across Crown City toward the smoking Ruined District and Arrival Citadel.',
  },
  {
    id: 'ruined_district',
    label: '3. The Ruined District',
    shortLabel: 'Ruins',
    regionId: 'ruined_district',
    category: 'environment',
    position: [-345, 36, -345],
    target: [-85, 34, -520],
    fov: 52,
    description:
      'Devastated urban blocks with hollowed concrete high-rises, protruding steel rebar, severed overpass, and hostile alien patrols.',
  },
  {
    id: 'war_plains',
    label: '4. The Open War Plains',
    shortLabel: 'War Plains',
    regionId: 'war_plains',
    category: 'environment',
    position: [1580, 92, 1280],
    target: [940, 48, 620],
    fov: 52,
    description:
      'Enormous rocky battlefield valleys with rail artillery batteries, defensive trenches, destroyed armor, and distant mountain ridges.',
  },
  {
    id: 'fallen_fleet',
    label: '5. The Fallen Fleet Crash Zone',
    shortLabel: 'Fallen Fleet',
    regionId: 'fallen_fleet',
    category: 'environment',
    position: [-765, 68, 1445],
    target: [-1080, 46, 1240],
    fov: 50,
    description:
      'Massive orbital crash crater containing the downed ringed Alien Dreadnought, glowing breached core, and military cordon.',
  },
  {
    id: 'arrival_zone',
    label: "6. Sovereign's Arrival Citadel",
    shortLabel: 'Citadel',
    regionId: 'arrival_zone',
    category: 'environment',
    position: [835, 198, -1045],
    target: [1295, 245, -1620],
    fov: 52,
    description:
      'Monumental obsidian fortress Citadel with colossal horned arches, plasma energy rift, hovering warships, and assembled legions.',
  },
  {
    id: 'sovereign_closeup',
    label: '7. The Sovereign — Front Face',
    shortLabel: 'Sovereign Front',
    regionId: 'arrival_zone',
    category: 'antagonist',
    position: [1083.72, 116.86, -1313.15],
    target: [1085.0, 116.82, -1315.0],
    fov: 32,
    description:
      'Front close-up of the redesigned alien warlord — ridged skull, fierce luminous eyes, fanged jaws, cranial conduits, and battle-scarred armor.',
  },
  {
    id: 'sovereign_side',
    label: '8. The Sovereign — Side Profile',
    shortLabel: 'Sovereign Side',
    regionId: 'arrival_zone',
    category: 'antagonist',
    position: [1087.15, 116.84, -1313.45],
    target: [1085.0, 116.75, -1315.0],
    fov: 34,
    description:
      'Side-profile anatomical study revealing protruding alien jaws, swept sagittal skull crest, cranial tubes, and heavy dorsal war-machinery.',
  },
  {
    id: 'sovereign_fullbody',
    label: '9. The Sovereign — Full Body',
    shortLabel: 'Sovereign Full',
    regionId: 'arrival_zone',
    category: 'antagonist',
    position: [1081.1, 115.75, -1309.5],
    target: [1085.0, 115.65, -1315.0],
    fov: 42,
    description:
      'Full 3.22m alien warlord silhouette standing atop the obsidian Command Dais with crimson war-plates, clawed gauntlets, and billowing war-mantle.',
  },
  {
    id: 'alien_army',
    label: '10. Six Alien Invasion Classes',
    shortLabel: 'Alien Army',
    regionId: 'ruined_district',
    category: 'environment',
    position: [-267, 20.6, -368],
    target: [-242, 17.8, -392],
    fov: 52,
    description:
      'Frontline clash displaying all 6 distinct alien species & combat classes — Dreadborn, Ravager Brute, Void Stalker, Aerial Reaver, Siege Guardian, and Elite Guard.',
  },
  {
    id: 'valkyrie_pad',
    label: '11. VX-94 Valkyrie Starfighter',
    shortLabel: 'Valkyrie Ship',
    regionId: 'crown_city',
    category: 'environment',
    position: [-1024, 24.4, -720],
    target: [-1044, 20.4, -736],
    fov: 44,
    description:
      'Allied VX-94 Valkyrie Interceptor parked on the Crown City evacuation pad, ready for boarding, atmospheric ascent, and orbital combat.',
  },
  {
    id: 'aerial_world',
    label: '12. 8km Planetary Overview',
    shortLabel: '8km Aerial',
    regionId: 'ruined_district',
    category: 'overview',
    position: [-420, 1180, 2150],
    target: [120, 60, -680],
    fov: 54,
    description:
      'Orbital reconnaissance view spanning all five interconnected regions across the 8km × 8km Aether Prime planetary war basin.',
  },
  {
    id: 'protagonist_closeup',
    label: '13. Protagonist — Face & Gear Close-Up',
    shortLabel: 'Soldier Face',
    regionId: 'crown_city',
    category: 'antagonist',
    position: [-1083.75, 19.65, -744.4],
    target: [-1085.0, 19.55, -745.0],
    fov: 32,
    description:
      'Close-up inspection of the redesigned adult male soldier protagonist — scarred facial anatomy, stubble, swept dark hair, realistic eyes, and FORCE tactical armor.',
  },
  {
    id: 'protagonist_fullbody',
    label: '14. Protagonist — Full Combat Loadout',
    shortLabel: 'Soldier Full',
    regionId: 'crown_city',
    category: 'antagonist',
    position: [-1082.3, 19.3, -743.7],
    target: [-1085.0, 19.05, -745.0],
    fov: 40,
    description:
      'Full-body tactical inspection showing athletic proportions, FORCE plate carrier, pouches, dark ballistic sleeves, articulated weapon grip, and combat boots.',
  },
];
