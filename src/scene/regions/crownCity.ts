import * as THREE from 'three';
import {
  PLAYER_START_POS,
  VALKYRIE_PAD_POS,
  getRiverCenterZ,
  getTerrainHeight,
  type WorldCollider,
} from '../../world/worldConfig';
import {
  DestructionRegistry,
  buildTowerDestructionSpec,
} from '../../world/destructionSystem';
import type { WorldMaterialLibrary } from '../materials';

export interface RegionBuildResult {
  root: THREE.Group;
  detailGroup: THREE.Group;
  microGroup: THREE.Group;
  fireAnchors: THREE.Vector3[];
  smokeAnchors: THREE.Vector3[];
  colliders: WorldCollider[];
  assetCounts: Record<string, number>;
  update?: (elapsed: number) => void;
  dispose: () => void;
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildCrownCity(
  mats: WorldMaterialLibrary,
  destructionRegistry: DestructionRegistry,
): RegionBuildResult {
  const root = new THREE.Group();
  root.name = 'Region_CrownCity';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'CrownCity_Detail';
  const microGroup = new THREE.Group();
  microGroup.name = 'CrownCity_Micro';
  root.add(detailGroup, microGroup);

  const geos: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };

  const rand = seededRand(104729);
  const fireAnchors: THREE.Vector3[] = [];
  const smokeAnchors: THREE.Vector3[] = [];
  const colliders: WorldCollider[] = [];
  const counts: Record<string, number> = {
    limestoneSkyscrapers: 0,
    apexSpires: 0,
    corporateArcologies: 0,
    civicLandmarks: 0,
    residentialTowers: 0,
    skyLandingPads: 0,
    elevatedHighways: 0,
    streetLamps: 0,
    hologramSigns: 0,
    distantSkylineBlocks: 0,
  };

  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const cyl6Geo = track(new THREE.CylinderGeometry(0.76, 1, 1, 6));
  const cyl12Geo = track(new THREE.CylinderGeometry(1, 1, 1, 12));
  const cone4Geo = track(new THREE.CylinderGeometry(0.16, 1, 1, 4));
  const domeGeo = track(new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5));
  const torusGeo = track(new THREE.TorusGeometry(1, 0.08, 8, 28));
  const planeGeo = track(new THREE.PlaneGeometry(1, 1));

  const registerBoxCollider = (
    id: string,
    cx: number,
    baseY: number,
    cz: number,
    w: number,
    h: number,
    d: number,
  ) => {
    colliders.push({
      id,
      minX: cx - w * 0.5,
      maxX: cx + w * 0.5,
      minY: baseY - 2,
      maxY: baseY + h,
      minZ: cz - d * 0.5,
      maxZ: cz + d * 0.5,
    });
  };

  // =========================================================================
  // FAMILY 1: MONUMENTAL SETBACK LIMESTONE & GLASS SKYSCRAPER (Ref #10 detail)
  // Detailed ground-floor colonnade entrance, cornice ledges, structural ribs,
  // stepped setbacks, rooftop mechanical penthouse, HVAC units, & twin antennas.
  // =========================================================================
  const addHeroSetbackTower = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    style: 'limestone' | 'darkGlass' | 'silverSteel',
    id: string,
    name: string,
  ) => {
    const gy = getTerrainHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, gy - 1.0, z);

    const facadeMat =
      style === 'limestone'
        ? mats.cityTowerLimestone
        : style === 'silverSteel'
        ? mats.cityTowerSilver
        : mats.cityTowerDark;
    const trimMat = style === 'limestone' ? mats.cityConcretePodium : mats.cityTrimSteel;

    // 1. Ground-level Civic Lobby Podium with recessed dark glass entrance & stone colonnade
    const podH = 14;
    const lobbyCore = new THREE.Mesh(boxGeo, mats.cityGlassCyan);
    lobbyCore.scale.set(w * 0.9, podH, d * 0.9);
    lobbyCore.position.y = podH * 0.5;
    g.add(lobbyCore);

    // Entrance canopy & structural perimeter columns
    const canopy = new THREE.Mesh(boxGeo, trimMat);
    canopy.scale.set(w * 1.06, 2.2, d * 1.06);
    canopy.position.y = podH;
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    g.add(canopy);

    const colPerSide = 4;
    for (let i = 0; i <= colPerSide; i++) {
      const f = i / colPerSide - 0.5;
      for (const side of [-1, 1]) {
        const colA = new THREE.Mesh(boxGeo, trimMat);
        colA.scale.set(2.1, podH, 2.1);
        colA.position.set(f * (w - 2), podH * 0.5, side * (d * 0.5));
        g.add(colA);

        if (i > 0 && i < colPerSide) {
          const colB = new THREE.Mesh(boxGeo, trimMat);
          colB.scale.set(2.1, podH, 2.1);
          colB.position.set(side * (w * 0.5), podH * 0.5, f * (d - 2));
          g.add(colB);
        }
      }
    }

    // 2. Primary Lower Shaft with structural corner pilasters & belt cornice
    const tier1H = h * 0.56;
    const tier1 = new THREE.Mesh(boxGeo, facadeMat);
    tier1.scale.set(w, tier1H, d);
    tier1.position.y = podH + tier1H * 0.5;
    tier1.castShadow = true;
    tier1.receiveShadow = true;
    g.add(tier1);

    // Corner structural vertical fins for real 3D silhouette depth
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const fin = new THREE.Mesh(boxGeo, trimMat);
        fin.scale.set(2.4, tier1H + 4, 2.4);
        fin.position.set(sx * (w * 0.5), podH + tier1H * 0.5, sz * (d * 0.5));
        g.add(fin);
      }
    }

    // Mid-height architectural cornice ledge & sky-terrace
    const cornice1 = new THREE.Mesh(boxGeo, trimMat);
    cornice1.scale.set(w * 1.05, 2.6, d * 1.05);
    cornice1.position.y = podH + tier1H;
    g.add(cornice1);

    // 3. Upper Setback Tier
    const tier2H = h * 0.34;
    const tier2 = new THREE.Mesh(boxGeo, facadeMat);
    tier2.scale.set(w * 0.78, tier2H, d * 0.78);
    tier2.position.y = podH + tier1H + tier2H * 0.5;
    tier2.castShadow = true;
    tier2.receiveShadow = true;
    g.add(tier2);

    const crownCornice = new THREE.Mesh(boxGeo, trimMat);
    crownCornice.scale.set(w * 0.83, 2.4, d * 0.83);
    crownCornice.position.y = podH + tier1H + tier2H;
    g.add(crownCornice);

    // 4. Rooftop Mechanical Penthouse, HVAC chillers, & Comms Spire
    const roofY = podH + tier1H + tier2H + 1.2;
    const mech = new THREE.Mesh(boxGeo, mats.cityTrimSteel);
    mech.scale.set(w * 0.44, 11, d * 0.44);
    mech.position.y = roofY + 5.5;
    g.add(mech);

    for (let u = -1; u <= 1; u += 2) {
      const hvac = new THREE.Mesh(cyl12Geo, mats.cityConcretePodium);
      hvac.scale.set(3.2, 4.5, 3.2);
      hvac.position.set(u * w * 0.24, roofY + 2.2, d * 0.2);
      g.add(hvac);
    }

    const spire = new THREE.Mesh(cyl12Geo, mats.cityTrimSteel);
    spire.scale.set(0.55, 26, 0.55);
    spire.position.y = roofY + 23;
    g.add(spire);

    const beacon = new THREE.Mesh(boxGeo, mats.cityAmberAccent);
    beacon.scale.set(1.2, 2.2, 1.2);
    beacon.position.y = roofY + 36;
    g.add(beacon);

    root.add(g);
    counts.limestoneSkyscrapers++;
    registerBoxCollider(id, x, gy, z, w + 1.5, h, d + 1.5);

    destructionRegistry.register(
      buildTowerDestructionSpec({
        id,
        name,
        regionId: 'crown_city',
        category: 'skyscraper',
        position: [x, gy, z],
        width: w,
        depth: d,
        height: h,
        primaryMaterial: style === 'limestone' ? 'ferroconcrete' : 'reinforced_titanium',
      }),
    );
  };

  // =========================================================================
  // FAMILY 2: FUTURISTIC TAPERED APEX SPIRE (Monumental Capital Landmarks)
  // =========================================================================
  const addApexSpire = (
    x: number,
    z: number,
    height: number,
    baseW: number,
    id: string,
    name: string,
  ) => {
    const gy = getTerrainHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, gy - 1.5, z);

    const podH = height * 0.14;
    const pod = new THREE.Mesh(boxGeo, mats.cityConcretePodium);
    pod.scale.set(baseW * 1.28, podH, baseW * 1.28);
    pod.position.y = podH * 0.5;
    pod.castShadow = true;
    pod.receiveShadow = true;
    g.add(pod);

    const shaftH = height * 0.68;
    const shaft = new THREE.Mesh(cyl6Geo, mats.cityTowerDark);
    shaft.scale.set(baseW * 0.64, shaftH, baseW * 0.64);
    shaft.position.y = podH + shaftH * 0.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    g.add(shaft);

    // 6 External steel exoskeleton diagonal buttress ribs
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const fin = new THREE.Mesh(boxGeo, mats.cityTrimSteel);
      fin.scale.set(baseW * 0.11, height * 0.78, baseW * 0.28);
      fin.position.set(
        Math.cos(a) * baseW * 0.56,
        height * 0.42,
        Math.sin(a) * baseW * 0.56,
      );
      fin.rotation.y = -a;
      g.add(fin);
    }

    // Observation terraces
    for (const frac of [0.45, 0.78]) {
      const collar = new THREE.Mesh(cyl12Geo, mats.cityTrimSteel);
      collar.scale.set(baseW * (0.64 - frac * 0.16), 3.6, baseW * (0.64 - frac * 0.16));
      collar.position.y = podH + shaftH * frac;
      g.add(collar);
    }

    // Tapered glass crown & spire mast
    const crownH = height * 0.22;
    const crown = new THREE.Mesh(cone4Geo, mats.cityGlassCyan);
    crown.scale.set(baseW * 0.44, crownH, baseW * 0.44);
    crown.position.y = podH + shaftH + crownH * 0.45;
    g.add(crown);

    const mast = new THREE.Mesh(cyl12Geo, mats.cityTrimSteel);
    mast.scale.set(0.8, height * 0.22, 0.8);
    mast.position.y = podH + shaftH + crownH + height * 0.08;
    g.add(mast);

    root.add(g);
    counts.apexSpires++;
    registerBoxCollider(id, x, gy, z, baseW * 1.25, height, baseW * 1.25);

    destructionRegistry.register(
      buildTowerDestructionSpec({
        id,
        name,
        regionId: 'crown_city',
        category: 'skyscraper',
        position: [x, gy, z],
        width: baseW * 1.25,
        depth: baseW * 1.25,
        height,
        primaryMaterial: 'reinforced_titanium',
      }),
    );
  };

  // =========================================================================
  // FAMILY 3: TWIN-BRIDGE CORPORATE ARCOLOGY
  // =========================================================================
  const addTwinArcology = (
    x: number,
    z: number,
    height: number,
    spread: number,
    rotY: number,
    id: string,
    name: string,
  ) => {
    const gy = getTerrainHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, gy - 1.5, z);
    g.rotation.y = rotY;

    const pod = new THREE.Mesh(boxGeo, mats.cityConcretePodium);
    pod.scale.set(spread * 2.15, 18, 32);
    pod.position.y = 9;
    pod.receiveShadow = true;
    g.add(pod);

    const t1H = height;
    const t2H = height * 0.84;

    const t1 = new THREE.Mesh(boxGeo, mats.cityTowerSilver);
    t1.scale.set(28, t1H, 30);
    t1.position.set(-spread * 0.54, 16 + t1H * 0.5, 0);
    t1.castShadow = true;
    t1.receiveShadow = true;
    g.add(t1);

    const t2 = new THREE.Mesh(boxGeo, mats.cityTowerDark);
    t2.scale.set(26, t2H, 28);
    t2.position.set(spread * 0.54, 16 + t2H * 0.5, 0);
    t2.castShadow = true;
    t2.receiveShadow = true;
    g.add(t2);

    // Dual enclosed glass skybridges with steel trusses
    for (const frac of [0.46, 0.7]) {
      const bridge = new THREE.Mesh(boxGeo, mats.cityGlassCyan);
      bridge.scale.set(spread * 0.94, 8.5, 13);
      bridge.position.set(0, height * frac, 0);
      g.add(bridge);

      const truss = new THREE.Mesh(boxGeo, mats.cityTrimSteel);
      truss.scale.set(spread * 0.96, 1.8, 13.8);
      truss.position.set(0, height * frac - 4.5, 0);
      g.add(truss);
    }

    root.add(g);
    counts.corporateArcologies++;
    registerBoxCollider(id, x, gy, z, spread * 2.1, height, 32);

    destructionRegistry.register(
      buildTowerDestructionSpec({
        id,
        name,
        regionId: 'crown_city',
        category: 'skyscraper',
        position: [x, gy, z],
        width: spread * 2,
        depth: 32,
        height,
        primaryMaterial: 'reinforced_titanium',
      }),
    );
  };

  // =========================================================================
  // FAMILY 4: PLANETARY ASSEMBLY DOME & UNDERGROUND TRANSIT PORTAL
  // =========================================================================
  const addCivicDome = (x: number, z: number, radius: number, id: string, name: string) => {
    const gy = getTerrainHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, gy - 1.5, z);

    const base1 = new THREE.Mesh(cyl12Geo, mats.cityConcretePodium);
    base1.scale.set(radius * 1.28, 12, radius * 1.28);
    base1.position.y = 6;
    base1.receiveShadow = true;
    g.add(base1);

    const base2 = new THREE.Mesh(cyl12Geo, mats.cityTowerLimestone);
    base2.scale.set(radius * 0.98, 22, radius * 0.98);
    base2.position.y = 20;
    base2.castShadow = true;
    g.add(base2);

    const dome = new THREE.Mesh(domeGeo, mats.cityGlassCyan);
    dome.scale.set(radius * 0.88, radius * 0.62, radius * 0.88);
    dome.position.y = 30;
    g.add(dome);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pil = new THREE.Mesh(boxGeo, mats.cityTrimSteel);
      pil.scale.set(3.8, 36, 7);
      pil.position.set(Math.cos(a) * radius * 1.05, 18, Math.sin(a) * radius * 1.05);
      pil.rotation.y = -a;
      g.add(pil);
    }

    root.add(g);
    counts.civicLandmarks++;
    registerBoxCollider(id, x, gy, z, radius * 2.1, 60, radius * 2.1);

    destructionRegistry.register(
      buildTowerDestructionSpec({
        id,
        name,
        regionId: 'crown_city',
        category: 'landmark',
        position: [x, gy, z],
        width: radius * 2.2,
        depth: radius * 2.2,
        height: 30 + radius * 0.65,
        primaryMaterial: 'composite_glass',
      }),
    );
  };

  // =========================================================================
  // HERO REPRESENTATIVE CROWN CITY STREET BLOCK (Centered around Spawn -1085, -745)
  // Wide boulevard with towering limestone + dark-glass skyscrapers flanking both sides!
  // =========================================================================
  const heroAvenueY = 18.08;
  // Ground-level wide urban avenues (flush on terraced shelf, zero Z-fighting)
  const addGroundAvenue = (cx: number, cz: number, w: number, len: number, rotY: number) => {
    const road = new THREE.Mesh(boxGeo, mats.roadAsphalt);
    road.scale.set(w, 0.35, len);
    road.position.set(cx, heroAvenueY, cz);
    road.rotation.y = rotY;
    road.receiveShadow = true;
    root.add(road);
  };
  // Grand Avenue running straight from Player Spawn (-1085, -745) NW into Spire Core & SE toward Ruined District
  addGroundAvenue(-1180, -860, 38, 1280, 0.56);
  // Cross-boulevard intersecting Grand Plaza
  addGroundAvenue(-1220, -820, 32, 1080, -1.01);
  // Secondary parallel avenue
  addGroundAvenue(-1420, -1040, 30, 1050, 0.56);

  // Hero Urban Street Block — Left & Right sides framing the spawn sightline (Ref #10 Matrix street canyon!)
  addHeroSetbackTower(-1155, -790, 42, 46, 178, 'limestone', 'hero_west_1', 'Aether Reserve Building');
  addHeroSetbackTower(-1225, -875, 44, 48, 224, 'darkGlass', 'hero_west_2', 'Vanguard Financial Center');
  addHeroSetbackTower(-1295, -965, 46, 46, 206, 'silverSteel', 'hero_west_3', 'Orion Exchange Tower');
  addHeroSetbackTower(-1080, -670, 38, 42, 148, 'limestone', 'hero_west_4', 'Civic Archives Hall');

  addHeroSetbackTower(-1035, -795, 42, 44, 192, 'darkGlass', 'hero_east_1', 'Helios Plaza Tower');
  addHeroSetbackTower(-1115, -895, 46, 44, 238, 'limestone', 'hero_east_2', 'Grand Commonwealth Spire');
  addHeroSetbackTower(-1195, -990, 44, 48, 214, 'darkGlass', 'hero_east_3', 'Aetherium Corporate Hub');
  addHeroSetbackTower(-965, -715, 38, 40, 156, 'silverSteel', 'hero_east_4', 'Frontier Transit HQ');

  // Monumental Capital Apex Spires rising behind the Hero Street Block
  addApexSpire(-1355, -1095, 415, 48, 'crown_apex_prime', 'Aether Crown Spire');
  addApexSpire(-1520, -940, 348, 42, 'crown_apex_west', 'Solstice Tower');
  addApexSpire(-1225, -1240, 332, 40, 'crown_apex_north', 'Vanguard Spire');
  addApexSpire(-1660, -1180, 368, 44, 'crown_apex_high', 'Zenith Citadel');

  // Twin-Bridge Corporate Arcologies
  addTwinArcology(-940, -960, 255, 42, 0.25, 'crown_arcology_east', 'Helios Corporate Arcology');
  addTwinArcology(-1420, -680, 226, 38, -0.35, 'crown_arcology_south', 'Meridian Exchange');
  addTwinArcology(-1680, -820, 265, 44, 0.14, 'crown_arcology_west', 'Aetherium Spire Complex');

  // Planetary Assembly Dome Complex
  addCivicDome(-1310, -720, 56, 'crown_senate_dome', 'Planetary Assembly Dome');

  // Underground Metro Entrance Plaza next to Grand Avenue
  const metroG = new THREE.Group();
  metroG.position.set(-1062, heroAvenueY, -768);
  metroG.rotation.y = 0.56;
  const metroArch = new THREE.Mesh(boxGeo, mats.cityTrimSteel);
  metroArch.scale.set(14, 5.2, 18);
  metroArch.position.y = 2.6;
  const metroVoid = new THREE.Mesh(boxGeo, mats.sovereignUnderSuit);
  metroVoid.scale.set(10.5, 4.0, 18.4);
  metroVoid.position.y = 2.0;
  metroG.add(metroArch, metroVoid);
  detailGroup.add(metroG);

  // =========================================================================
  // MULTI-LEVEL ELEVATED TRANSIT HIGHWAYS & AETHER RIVER GRAND VIADUCT (Ref #2)
  // =========================================================================
  const addHighwaySegment = (
    p1: [number, number, number],
    p2: [number, number, number],
    width: number,
    withPiers = true,
  ) => {
    const v1 = new THREE.Vector3(...p1);
    const v2 = new THREE.Vector3(...p2);
    const len = v1.distanceTo(v2);
    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);

    const g = new THREE.Group();
    const deck = new THREE.Mesh(boxGeo, mats.roadAsphalt);
    deck.scale.set(width, 2.8, len);
    deck.position.copy(mid);
    deck.lookAt(v2);
    deck.castShadow = true;
    deck.receiveShadow = true;
    g.add(deck);

    // Concrete jersey barriers + steel undersides
    for (const side of [-width * 0.48, width * 0.48]) {
      const wall = new THREE.Mesh(boxGeo, mats.concreteBarrier);
      wall.scale.set(1.1, 1.8, len);
      wall.position.copy(mid);
      wall.lookAt(v2);
      wall.translateX(side);
      wall.translateY(1.8);
      g.add(wall);
    }

    if (withPiers) {
      const pierCount = Math.max(2, Math.floor(len / 95));
      for (let i = 1; i < pierCount; i++) {
        const t = i / pierCount;
        const px = THREE.MathUtils.lerp(p1[0], p2[0], t);
        const py = THREE.MathUtils.lerp(p1[1], p2[1], t);
        const pz = THREE.MathUtils.lerp(p1[2], p2[2], t);
        // Never drop a highway support pier inside the Valkyrie Emergency Landing Pad!
        if (Math.hypot(px - VALKYRIE_PAD_POS[0], pz - VALKYRIE_PAD_POS[2]) < 38) continue;
        const gy = Math.min(getTerrainHeight(px, pz), -6);
        const h = Math.max(8, py - gy);
        const pier = new THREE.Mesh(boxGeo, mats.cityConcretePodium);
        pier.scale.set(width * 0.32, h, 5.5);
        pier.position.set(px, py - h * 0.5 - 1.2, pz);
        g.add(pier);
      }
    }

    root.add(g);
    counts.elevatedHighways++;
  };

  // Multi-level sky-bridges crossing overhead above the Hero Avenue (Ref #2!)
  addHighwaySegment([-1480, 48, -990], [-950, 48, -680], 20, true);
  addHighwaySegment([-1390, 74, -1080], [-1020, 74, -770], 16, false);
  // Eastbound Highway Spine linking Crown City to Ruined District
  addHighwaySegment([-1050, 44, -780], [-420, 38, -560], 22, true);
  // Grand Aether River Suspension Viaduct connecting Crown City south toward Fallen Fleet
  const riverZAtBridge = getRiverCenterZ(-1180);
  addHighwaySegment([-1180, 44, -540], [-1120, 40, riverZAtBridge + 240], 24, true);

  // Suspension Bridge Steel Pylons
  for (const offsetZ of [-90, 90]) {
    for (const sideX of [-15, 15]) {
      const pylon = new THREE.Mesh(boxGeo, mats.cityTrimSteel);
      pylon.scale.set(5.5, 115, 5.5);
      pylon.position.set(-1150 + sideX, 55, riverZAtBridge + offsetZ);
      root.add(pylon);
    }
    const cross = new THREE.Mesh(boxGeo, mats.cityTrimSteel);
    cross.scale.set(36, 4.5, 5);
    cross.position.set(-1150, 96, riverZAtBridge + offsetZ);
    root.add(cross);
  }

  // Circular Sky-Landing Platforms
  const addSkyLandingPad = (x: number, z: number, elevY: number, radius: number) => {
    const gy = getTerrainHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, gy, z);
    const colH = elevY - gy;
    const stem = new THREE.Mesh(cyl6Geo, mats.cityTrimSteel);
    stem.scale.set(radius * 0.25, colH, radius * 0.25);
    stem.position.y = colH * 0.5;
    g.add(stem);

    const disc = new THREE.Mesh(cyl12Geo, mats.cityTrimSteel);
    disc.scale.set(radius, 4, radius);
    disc.position.y = colH;
    g.add(disc);

    const ring = new THREE.Mesh(torusGeo, mats.cityCyanAccent);
    ring.rotation.x = Math.PI / 2;
    ring.scale.setScalar(radius * 0.88);
    ring.position.y = colH + 2.2;
    g.add(ring);

    detailGroup.add(g);
    counts.skyLandingPads++;
  };
  addSkyLandingPad(-1160, -860, 62, 28);
  addSkyLandingPad(-1360, -960, 82, 32);

  // =========================================================================
  // STREET-LEVEL REALISM PROPS (Streetlamps, Barricades, Holographic Signage, Trees)
  // =========================================================================
  const lampCount = 36;
  const lampPoles = new THREE.InstancedMesh(cyl12Geo, mats.cityTrimSteel, lampCount);
  const lampHeads = new THREE.InstancedMesh(boxGeo, mats.cityAmberAccent, lampCount);
  const dummy = new THREE.Object3D();
  const dirX = Math.sin(0.56);
  const dirZ = Math.cos(0.56);
  const perpX = Math.cos(0.56);
  const perpZ = -Math.sin(0.56);

  let lIdx = 0;
  for (let i = 0; i < 18; i++) {
    const t = -280 + i * 36;
    for (const side of [-1, 1]) {
      const lx = -1140 + dirX * t + perpX * side * 17.5;
      const lz = -805 + dirZ * t + perpZ * side * 17.5;
      // Keep Valkyrie Emergency Landing Pad and Player Spawn clear of streetlamp poles
      if (Math.hypot(lx - VALKYRIE_PAD_POS[0], lz - VALKYRIE_PAD_POS[2]) < 26) continue;
      if (Math.hypot(lx - PLAYER_START_POS[0], lz - PLAYER_START_POS[2]) < 20) continue;
      dummy.position.set(lx, heroAvenueY + 4.8, lz);
      dummy.scale.set(0.22, 9.6, 0.22);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      lampPoles.setMatrixAt(lIdx, dummy.matrix);

      dummy.position.set(lx - perpX * side * 1.1, heroAvenueY + 9.5, lz - perpZ * side * 1.1);
      dummy.scale.set(1.8, 0.35, 0.65);
      dummy.rotation.set(0, 0.56, 0);
      dummy.updateMatrix();
      lampHeads.setMatrixAt(lIdx, dummy.matrix);
      lIdx++;
    }
  }
  lampPoles.count = lIdx;
  lampHeads.count = lIdx;
  lampPoles.instanceMatrix.needsUpdate = true;
  lampHeads.instanceMatrix.needsUpdate = true;
  lampPoles.computeBoundingSphere();
  lampHeads.computeBoundingSphere();
  microGroup.add(lampPoles, lampHeads);
  counts.streetLamps = lIdx;

  // Holographic Civic Evacuation Billboards mounted along tower facades
  const holoSpecs: Array<[number, number, number, number]> = [
    [-1128, 66, -792, 0.56],
    [-1068, 72, -820, -2.58],
    [-1202, 92, -885, 0.56],
    [-1142, 96, -912, -2.58],
  ];
  for (const [hx, hy, hz, rot] of holoSpecs) {
    const sign = new THREE.Mesh(planeGeo, mats.hologramMat);
    sign.scale.set(34, 17, 1);
    sign.position.set(hx, hy, hz);
    sign.rotation.y = rot;
    detailGroup.add(sign);
    counts.hologramSigns++;
  }

  // =========================================================================
  // MASSIVE METROPOLITAN SKYLINE EXPANSION (180 multi-silhouette buildings across 2.4km)
  // =========================================================================
  const sprawlCount = 180;
  const sprawlGlass = new THREE.InstancedMesh(boxGeo, mats.cityTowerDark, sprawlCount);
  const sprawlStone = new THREE.InstancedMesh(boxGeo, mats.cityTowerLimestone, Math.floor(sprawlCount * 0.55));
  const tint = new THREE.Color();

  let gIdx = 0;
  let sIdx = 0;
  for (let i = 0; i < sprawlCount * 1.6 && gIdx < sprawlCount; i++) {
    const angle = Math.PI * 0.42 + rand() * Math.PI * 1.28;
    const rad = 260 + rand() * 1450;
    const dx = -1320 + Math.cos(angle) * rad;
    const dz = -920 + Math.sin(angle) * rad;
    // Keep hero avenue corridor and Aether River clear
    if (Math.hypot(dx + 1140, dz + 810) < 250) continue;
    if (Math.abs(dz - getRiverCenterZ(dx)) < 115) continue;

    const gy = getTerrainHeight(dx, dz);
    const w = 24 + rand() * 34;
    const h = 65 + rand() * 245;
    const d = w * (0.72 + rand() * 0.5);

    dummy.position.set(dx, gy + h * 0.5 - 4, dz);
    dummy.scale.set(w, h, d);
    dummy.rotation.set(0, Math.floor(rand() * 4) * (Math.PI * 0.5) + 0.56, 0);
    dummy.updateMatrix();

    const shade = 0.72 + rand() * 0.32;
    tint.setRGB(shade, shade * 0.99, shade * 1.02);

    if (i % 3 === 0 && sIdx < sprawlStone.count) {
      sprawlStone.setMatrixAt(sIdx, dummy.matrix);
      sprawlStone.setColorAt(sIdx, tint);
      sIdx++;
    } else {
      sprawlGlass.setMatrixAt(gIdx, dummy.matrix);
      sprawlGlass.setColorAt(gIdx, tint);
      gIdx++;
    }
  }
  sprawlGlass.count = gIdx;
  sprawlStone.count = sIdx;
  sprawlGlass.instanceMatrix.needsUpdate = true;
  sprawlStone.instanceMatrix.needsUpdate = true;
  if (sprawlGlass.instanceColor) sprawlGlass.instanceColor.needsUpdate = true;
  if (sprawlStone.instanceColor) sprawlStone.instanceColor.needsUpdate = true;
  sprawlGlass.computeBoundingSphere();
  sprawlStone.computeBoundingSphere();
  root.add(sprawlGlass, sprawlStone);
  counts.distantSkylineBlocks = gIdx + sIdx;

  // =========================================================================
  // PHASE 3: DARK WAR-ZONE CITY DEVASTATION — BURNING FLOORS, SAUCER WARSHIPS,
  // PULSING RED EMERGENCY BEACONS, WRECKED EVACUATION VEHICLES & VALKYRIE PAD
  // =========================================================================
  const localMats: THREE.Material[] = [];
  const trackMat = <T extends THREE.Material>(m: T): T => {
    localMats.push(m);
    return m;
  };

  // 1. Burning internal tower breaches & thick smoke plumes on hero Crown City towers (Ref #1)
  const breachSpecs: Array<[number, number, number]> = [
    [-1136, 98, -792],
    [-1204, 134, -878],
    [-1054, 112, -804],
    [-1132, 156, -892],
    [-1276, 128, -962],
    [-978, 86, -722],
    [-820, getTerrainHeight(-820, -640) + 55, -640],
  ];
  for (const [bx, by, bz] of breachSpecs) {
    const breachGlow = new THREE.Mesh(
      track(new THREE.SphereGeometry(7.2, 12, 10)),
      mats.fireCore,
    );
    breachGlow.scale.set(1.3, 0.75, 1.3);
    breachGlow.position.set(bx, by, bz);
    detailGroup.add(breachGlow);
    fireAnchors.push(new THREE.Vector3(bx, by, bz));
    smokeAnchors.push(new THREE.Vector3(bx, by + 9, bz));
  }

  // 2. Pulsing Red Emergency Street Beacons & Overturned Wrecked Evacuation Vehicles
  const emergencyBeaconMeshes: THREE.Mesh[] = [];
  const beaconPositions: Array<[number, number]> = [
    [-1104, -772],
    [-1074, -782],
    [-1128, -818],
    [-1098, -838],
    [-1056, -714],
    [-1030, -752],
  ];
  for (const [rx, rz] of beaconPositions) {
    const gy = getTerrainHeight(rx, rz);
    const pole = new THREE.Mesh(cyl12Geo, mats.cityTrimSteel);
    pole.scale.set(0.24, 3.2, 0.24);
    pole.position.set(rx, gy + 1.6, rz);
    detailGroup.add(pole);

    const bulb = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.42, 10, 8)),
      mats.emergencyRedGlow,
    );
    bulb.position.set(rx, gy + 3.35, rz);
    detailGroup.add(bulb);
    emergencyBeaconMeshes.push(bulb);
  }

  // Wrecked & overturned civilian evacuation cars + concrete rubble barricades along Grand Avenue
  const wreckSpecs: Array<[number, number, number, number]> = [
    [-1112, -780, 0.45, 0.08],
    [-1082, -798, -0.72, 2.85], // Overturned car
    [-1132, -834, 1.12, 0.14],
    [-1062, -790, -0.35, 0.05],
    [-1118, -732, 0.88, 2.9],
  ];
  for (const [wx, wz, rotY, rollZ] of wreckSpecs) {
    const gy = getTerrainHeight(wx, wz);
    const car = new THREE.Group();
    car.position.set(wx, gy + 0.9, wz);
    car.rotation.set(0.06, rotY, rollZ);
    const chassis = new THREE.Mesh(boxGeo, mats.scorchedHull);
    chassis.scale.set(2.2, 0.95, 4.7);
    chassis.castShadow = true;
    const cabin = new THREE.Mesh(boxGeo, mats.ruinConcrete);
    cabin.scale.set(1.9, 0.78, 2.3);
    cabin.position.set(0, 0.78, -0.2);
    car.add(chassis, cabin);
    detailGroup.add(car);
    fireAnchors.push(new THREE.Vector3(wx, gy + 1.2, wz));
  }

  // 3. TWO MENACING ALIEN SAUCER WARSHIPS HOVERING OVER DARK CROWN CITY FIRING BEAMS (Ref #1!)
  const saucerWarships: Array<{ group: THREE.Group; baseY: number; phase: number; beam: THREE.Mesh }> = [];
  const beamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff9238,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const saucerSpecs: Array<{ pos: [number, number, number]; target: [number, number, number]; radius: number }> = [
    { pos: [-1235, 195, -945], target: [-1204, 118, -878], radius: 68 },
    { pos: [-1100, 148, -860], target: [-1136, 94, -792], radius: 44 },
    { pos: [-1365, 225, -1040], target: [-1276, 128, -962], radius: 54 },
  ];
  for (let s = 0; s < saucerSpecs.length; s++) {
    const spec = saucerSpecs[s];
    const sg = new THREE.Group();
    sg.position.set(...spec.pos);

    const discUpper = new THREE.Mesh(
      track(new THREE.CylinderGeometry(spec.radius * 0.56, spec.radius, spec.radius * 0.18, 28)),
      mats.alienObsidian,
    );
    discUpper.position.y = spec.radius * 0.08;
    sg.add(discUpper);

    const discLower = new THREE.Mesh(
      track(new THREE.CylinderGeometry(spec.radius, spec.radius * 0.44, spec.radius * 0.16, 28)),
      mats.alienHullDark,
    );
    discLower.position.y = -spec.radius * 0.08;
    sg.add(discLower);

    // Glowing perimeter weapon ring & ventral plasma furnace
    const rimRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(spec.radius * 0.86, spec.radius * 0.032, 8, 36)),
      mats.alienEnergyAmber,
    );
    rimRing.rotation.x = Math.PI / 2;
    sg.add(rimRing);

    const core = new THREE.Mesh(
      track(new THREE.SphereGeometry(spec.radius * 0.24, 16, 12)),
      mats.alienEnergyAmber,
    );
    core.scale.set(1, 0.45, 1);
    core.position.y = -spec.radius * 0.15;
    sg.add(core);
    root.add(sg);

    // Translucent orbital strike beam lancing down into the burning tower
    const vStart = new THREE.Vector3(...spec.pos).add(new THREE.Vector3(0, -spec.radius * 0.18, 0));
    const vEnd = new THREE.Vector3(...spec.target);
    const beamLen = vStart.distanceTo(vEnd);
    const beamGeo = track(new THREE.CylinderGeometry(1.1, 3.8, beamLen, 10, 1, true));
    beamGeo.rotateX(Math.PI / 2);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(vStart).lerp(vEnd, 0.5);
    beam.lookAt(vEnd);
    root.add(beam);

    saucerWarships.push({ group: sg, baseY: spec.pos[1], phase: s * 2.1, beam });
  }

  // 4. ALLIED VANGUARD EMERGENCY LANDING PAD AT VALKYRIE_PAD_POS ([-1044, 18.2, -736])
  const padGroup = new THREE.Group();
  padGroup.name = 'ValkyrieEmergencyLandingPad';
  padGroup.position.set(VALKYRIE_PAD_POS[0], VALKYRIE_PAD_POS[1] - 0.15, VALKYRIE_PAD_POS[2]);

  const padDeck = new THREE.Mesh(
    track(new THREE.CylinderGeometry(15.5, 17.0, 0.5, 8)),
    mats.cityTrimSteel,
  );
  padDeck.receiveShadow = true;
  padGroup.add(padDeck);

  const padInner = new THREE.Mesh(
    track(new THREE.CylinderGeometry(12.2, 12.2, 0.54, 8)),
    mats.roadAsphalt,
  );
  padInner.receiveShadow = true;
  padGroup.add(padInner);

  const padRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(13.2, 0.18, 8, 32)),
    mats.valkyrieThrusterCyan,
  );
  padRing.rotation.x = Math.PI / 2;
  padRing.position.y = 0.3;
  padGroup.add(padRing);

  // 4 Illuminated pad corner stanchions + warm floodlight
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
    const pylon = new THREE.Mesh(boxGeo, mats.cityTrimSteel);
    pylon.scale.set(0.65, 3.8, 0.65);
    pylon.position.set(Math.cos(a) * 14.5, 1.9, Math.sin(a) * 14.5);
    padGroup.add(pylon);

    const lamp = new THREE.Mesh(boxGeo, mats.cityCyanAccent);
    lamp.scale.set(0.9, 0.35, 0.9);
    lamp.position.set(Math.cos(a) * 14.5, 3.9, Math.sin(a) * 14.5);
    padGroup.add(lamp);
  }
  const padLight = new THREE.PointLight(0x70d8ff, 34, 48, 1.4);
  padLight.position.set(0, 10.5, 0);
  padGroup.add(padLight);
  root.add(padGroup);

  const update = (elapsed: number) => {
    for (let i = 0; i < saucerWarships.length; i++) {
      const sw = saucerWarships[i];
      sw.group.rotation.y = elapsed * 0.22 * (i % 2 === 0 ? 1 : -1);
      sw.group.position.y = sw.baseY + Math.sin(elapsed * 0.7 + sw.phase) * 4.5;
      const beamPulse = 0.36 + Math.sin(elapsed * 8.5 + sw.phase) * 0.14;
      (sw.beam.material as THREE.MeshBasicMaterial).opacity = beamPulse;
    }
    const redPulse = 0.7 + Math.sin(elapsed * 5.2) * 0.3;
    for (let i = 0; i < emergencyBeaconMeshes.length; i++) {
      const s = 0.85 + redPulse * 0.35;
      emergencyBeaconMeshes[i].scale.setScalar(s);
    }
  };

  return {
    root,
    detailGroup,
    microGroup,
    fireAnchors,
    smokeAnchors,
    colliders,
    assetCounts: counts,
    update,
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of localMats) m.dispose();
    },
  };
}
