import * as THREE from 'three';
import {
  SOVEREIGN_FACING_YAW,
  SOVEREIGN_WORLD_POS,
  getTerrainHeight,
  type WorldCollider,
} from '../../world/worldConfig';
import {
  DestructionRegistry,
  buildTowerDestructionSpec,
} from '../../world/destructionSystem';
import type { WorldMaterialLibrary } from '../materials';
import type { RegionBuildResult } from './crownCity';

export interface ArrivalZoneResult extends RegionBuildResult {
  hoveringWarships: THREE.Group[];
  floatingObelisks: THREE.Mesh[];
  orbitalBeams: THREE.Mesh[];
}

export function buildArrivalZone(
  mats: WorldMaterialLibrary,
  destructionRegistry: DestructionRegistry,
): ArrivalZoneResult {
  const root = new THREE.Group();
  root.name = 'Region_SovereignArrivalZone';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'ArrivalZone_Detail';
  const microGroup = new THREE.Group();
  microGroup.name = 'ArrivalZone_Micro';
  root.add(detailGroup, microGroup);

  const geos: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };

  const fireAnchors: THREE.Vector3[] = [];
  const smokeAnchors: THREE.Vector3[] = [];
  const colliders: WorldCollider[] = [];
  const hoveringWarships: THREE.Group[] = [];
  const floatingObelisks: THREE.Mesh[] = [];
  const orbitalBeams: THREE.Mesh[] = [];

  const counts: Record<string, number> = {
    arrivalCitadel: 1,
    fortressGates: 2,
    sovereignDais: 1,
    alienLandingPlatforms: 3,
    hoveringWarships: 0,
    floatingObelisks: 0,
    energyPylons: 0,
    vanguardTroops: 0,
  };

  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const cyl6Geo = track(new THREE.CylinderGeometry(1, 1, 1, 6));
  const cyl16Geo = track(new THREE.CylinderGeometry(1, 1, 1, 16));
  const torusGeo = track(new THREE.TorusGeometry(1, 0.14, 12, 36));
  const octGeo = track(new THREE.OctahedronGeometry(1, 0));

  // =========================================================================
  // 1. MONUMENTAL ALIEN FORTRESS — THE ARRIVAL CITADEL (~490m tall, Ref #1 & #6!)
  // =========================================================================
  const cx = 1320;
  const cz = -1645;
  const cgy = getTerrainHeight(cx, cz);

  const citadel = new THREE.Group();
  citadel.name = 'SovereignArrivalCitadel';
  citadel.position.set(cx, cgy - 8, cz);
  citadel.rotation.y = SOVEREIGN_FACING_YAW;

  // Multi-tiered fortress bastion foundation with angular retaining walls
  const base1 = new THREE.Mesh(cyl6Geo, mats.alienObsidian);
  base1.scale.set(220, 44, 220);
  base1.position.y = 22;
  base1.receiveShadow = true;
  citadel.add(base1);

  const base2 = new THREE.Mesh(cyl6Geo, mats.alienHullDark);
  base2.scale.set(162, 62, 162);
  base2.position.y = 66;
  base2.castShadow = true;
  citadel.add(base2);

  // 6 Massive sloped structural fortress buttress wings anchoring into the mountain plateau
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const buttress = new THREE.Mesh(boxGeo, mats.alienObsidian);
    buttress.scale.set(26, 155, 118);
    buttress.position.set(Math.cos(a) * 142, 68, Math.sin(a) * 142);
    buttress.rotation.y = -a + Math.PI * 0.5;
    buttress.rotation.x = 0.28;
    buttress.castShadow = true;
    citadel.add(buttress);
  }

  // Colossal Sweeping Ribbed Obsidian Horns (Ref #1 dramatic silhouette)
  const buildFortressHorn = (
    side: number,
    scaleMult: number,
    spreadX: number,
    height: number,
  ) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 34 * scaleMult, 36, 0),
      new THREE.Vector3(side * (spreadX * 0.54), height * 0.36, -24),
      new THREE.Vector3(side * spreadX, height * 0.68, -8),
      new THREE.Vector3(side * (spreadX * 0.64), height * 0.92, 18),
      new THREE.Vector3(side * 28 * scaleMult, height, 24),
    ]);
    const tubeGeo = track(new THREE.TubeGeometry(curve, 32, 24 * scaleMult, 8, false));
    const p = tubeGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const vy = p.getY(i);
      const t = Math.max(0, Math.min(1, (vy - 36) / (height - 36)));
      const center = curve.getPoint(t);
      const shrink = 1.0 - t * 0.78;
      // Add architectural armor ribbing along the horn length
      const rib = 1.0 + Math.sin(t * Math.PI * 18) * 0.08;
      p.setXYZ(
        i,
        center.x + (p.getX(i) - center.x) * shrink * rib,
        center.y + (p.getY(i) - center.y) * shrink,
        center.z + (p.getZ(i) - center.z) * shrink * rib,
      );
    }
    tubeGeo.computeVertexNormals();
    const mesh = new THREE.Mesh(tubeGeo, mats.alienObsidian);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // Primary inner cathedral horns framing the vertical energy rift
  citadel.add(buildFortressHorn(-1, 1.08, 148, 465));
  citadel.add(buildFortressHorn(1, 1.08, 148, 465));
  // Outer colossal wing-buttress horns
  citadel.add(buildFortressHorn(-1, 0.88, 265, 360));
  citadel.add(buildFortressHorn(1, 0.88, 265, 360));

  // Split Obsidian Twin Spire Towers with Vertical Molten Energy Rift (Ref #6!)
  for (const side of [-1, 1]) {
    const towerHalf = new THREE.Mesh(boxGeo, mats.alienObsidian);
    towerHalf.scale.set(36, 330, 56);
    towerHalf.position.set(side * 28, 205, -8);
    towerHalf.castShadow = true;
    citadel.add(towerHalf);

    // Armored stepped side ribs along the split fortress tower
    for (let r = 0; r < 7; r++) {
      const fin = new THREE.Mesh(boxGeo, mats.alienHullDark);
      fin.scale.set(22, 8, 44);
      fin.position.set(side * 52, 95 + r * 36, -6);
      fin.rotation.z = side * -0.18;
      citadel.add(fin);
    }
  }

  // Intense Narrow Vertical Rift Beam cutting straight up the fortress spine (Ref #6)
  const verticalRift = new THREE.Mesh(boxGeo, mats.alienEnergyAmber);
  verticalRift.scale.set(6.5, 420, 12);
  verticalRift.position.set(0, 235, 16);
  citadel.add(verticalRift);

  // Monumental Fortress Gatehouse Arch facing the Command Dais
  const gateL = new THREE.Mesh(boxGeo, mats.alienObsidian);
  gateL.scale.set(18, 86, 26);
  gateL.position.set(-34, 48, 118);
  const gateR = new THREE.Mesh(boxGeo, mats.alienObsidian);
  gateR.scale.set(18, 86, 26);
  gateR.position.set(34, 48, 118);
  const gateLintel = new THREE.Mesh(boxGeo, mats.alienHullDark);
  gateLintel.scale.set(92, 16, 30);
  gateLintel.position.set(0, 92, 118);
  citadel.add(gateL, gateR, gateLintel);

  // Rotating containment halo around upper rift
  const ring1 = new THREE.Mesh(torusGeo, mats.alienHullDark);
  ring1.scale.set(82, 82, 34);
  ring1.position.set(0, 315, 14);
  ring1.rotation.set(0.32, 0.14, 0);
  citadel.add(ring1);

  root.add(citadel);
  colliders.push({
    id: 'arrival_citadel_core',
    minX: cx - 180,
    maxX: cx + 180,
    minY: cgy - 10,
    maxY: cgy + 460,
    minZ: cz - 180,
    maxZ: cz + 180,
  });

  destructionRegistry.register(
    buildTowerDestructionSpec({
      id: 'sovereign_arrival_citadel',
      name: "The Sovereign's Arrival Fortress Citadel",
      regionId: 'arrival_zone',
      category: 'alien_structure',
      position: [cx, cgy, cz],
      width: 390,
      depth: 260,
      height: 465,
      primaryMaterial: 'alien_obsidian',
    }),
  );

  // =========================================================================
  // 2. THE SOVEREIGN'S CEREMONIAL COMMAND DAIS (SOVEREIGN_WORLD_POS)
  // =========================================================================
  const dais = new THREE.Group();
  dais.name = 'SovereignCommandDais';
  const [sx, sy, sz] = SOVEREIGN_WORLD_POS;
  dais.position.set(sx, sy, sz);
  dais.rotation.y = SOVEREIGN_FACING_YAW;

  const daisLower = new THREE.Mesh(cyl6Geo, mats.alienObsidian);
  daisLower.scale.set(22, 14, 22);
  daisLower.position.y = -7.5;
  daisLower.receiveShadow = true;
  dais.add(daisLower);

  const daisTop = new THREE.Mesh(cyl6Geo, mats.alienHullDark);
  daisTop.scale.set(14, 1.2, 14);
  daisTop.position.y = -0.6;
  daisTop.receiveShadow = true;
  dais.add(daisTop);

  const daisRing = new THREE.Mesh(torusGeo, mats.sovereignEmissive);
  daisRing.rotation.x = Math.PI * 0.5;
  daisRing.scale.set(11.8, 11.8, 1.2);
  daisRing.position.y = -0.02;
  dais.add(daisRing);

  // Grand obsidian steps descending toward the valley approach
  for (let s = 0; s < 6; s++) {
    const step = new THREE.Mesh(boxGeo, mats.alienObsidian);
    step.scale.set(12 + s * 1.8, 0.8, 2.6);
    step.position.set(0, -0.5 - s * 0.65, 13 + s * 2.4);
    dais.add(step);
  }

  // Flanking carved sentinel obelisks behind the Sovereign
  for (const side of [-1, 1]) {
    const pyl = new THREE.Mesh(boxGeo, mats.alienObsidian);
    pyl.scale.set(2.0, 12.5, 3.0);
    pyl.position.set(side * 10.5, 5.2, -6.5);
    pyl.rotation.z = side * -0.15;
    pyl.castShadow = true;
    dais.add(pyl);

    const trim = new THREE.Mesh(boxGeo, mats.sovereignEmissive);
    trim.scale.set(0.24, 9.2, 0.3);
    trim.position.set(side * 9.6, 5.4, -5.2);
    trim.rotation.z = side * -0.15;
    dais.add(trim);
  }
  root.add(dais);

  // Alien Terraced Landing Platforms flanking the Citadel
  const padCoords: Array<[number, number]> = [
    [1020, -1580],
    [1560, -1420],
    [1220, -1210],
  ];
  for (const [px, pz] of padCoords) {
    const py = getTerrainHeight(px, pz);
    const pad = new THREE.Group();
    pad.position.set(px, py + 4, pz);
    const deck = new THREE.Mesh(cyl6Geo, mats.alienObsidian);
    deck.scale.set(42, 8, 42);
    const trim = new THREE.Mesh(torusGeo, mats.alienEnergyAmber);
    trim.rotation.x = Math.PI * 0.5;
    trim.scale.set(36, 36, 1.8);
    trim.position.y = 4.2;
    pad.add(deck, trim);
    detailGroup.add(pad);
  }

  // =========================================================================
  // 3. ENORMOUS MULTI-RING HOVERING ALIEN WARSHIPS (Ref #3 & #7 detail)
  // =========================================================================
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffa84c,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beamMatCyan = new THREE.MeshBasicMaterial({
    color: 0x5ae2ff,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  geos.push({
    dispose: () => {
      beamMat.dispose();
      beamMatCyan.dispose();
    },
  } as unknown as THREE.BufferGeometry);

  const addHoveringWarship = (
    x: number,
    y: number,
    z: number,
    radius: number,
    withBeam: boolean,
    cyanBeam = false,
  ) => {
    const ship = new THREE.Group();
    ship.position.set(x, y, z);

    // Multi-tiered armored beveled dreadnought saucer
    const discMain = new THREE.Mesh(cyl16Geo, mats.alienObsidian);
    discMain.scale.set(radius, radius * 0.09, radius);
    ship.add(discMain);

    const upperDeck = new THREE.Mesh(
      track(new THREE.CylinderGeometry(radius * 0.45, radius * 0.92, radius * 0.14, 16)),
      mats.alienHullDark,
    );
    upperDeck.position.y = radius * 0.11;
    ship.add(upperDeck);

    const upperTower = new THREE.Mesh(
      track(new THREE.CylinderGeometry(radius * 0.18, radius * 0.42, radius * 0.12, 8)),
      mats.alienObsidian,
    );
    upperTower.position.y = radius * 0.23;
    ship.add(upperTower);

    const underCore = new THREE.Mesh(
      track(new THREE.CylinderGeometry(radius * 0.84, radius * 0.34, radius * 0.16, 16)),
      mats.alienObsidian,
    );
    underCore.position.y = -radius * 0.12;
    ship.add(underCore);

    // 8 Radial armored structural spars & hanging stabilizer fins
    for (let r = 0; r < 8; r++) {
      const a = (r / 8) * Math.PI * 2;
      const spar = new THREE.Mesh(boxGeo, mats.alienHullDark);
      spar.scale.set(radius * 0.98, radius * 0.055, radius * 0.08);
      spar.position.set(Math.cos(a) * radius * 0.5, radius * 0.03, Math.sin(a) * radius * 0.5);
      spar.rotation.y = -a;
      ship.add(spar);

      const claw = new THREE.Mesh(boxGeo, mats.alienObsidian);
      claw.scale.set(radius * 0.06, radius * 0.22, radius * 0.12);
      claw.position.set(Math.cos(a) * radius * 0.65, -radius * 0.18, Math.sin(a) * radius * 0.65);
      claw.rotation.y = -a;
      claw.rotation.z = 0.25;
      ship.add(claw);
    }

    const glowRing = new THREE.Mesh(
      torusGeo,
      cyanBeam ? mats.alienEnergyCyan : mats.alienEnergyAmber,
    );
    glowRing.rotation.x = Math.PI * 0.5;
    glowRing.scale.set(radius * 0.62, radius * 0.62, radius * 0.12);
    glowRing.position.y = -radius * 0.1;
    ship.add(glowRing);

    if (withBeam) {
      const groundY = getTerrainHeight(x, z);
      const beamH = Math.max(80, y - groundY);
      const beam = new THREE.Mesh(cyl16Geo, cyanBeam ? beamMatCyan : beamMat);
      beam.scale.set(radius * 0.05, beamH, radius * 0.05);
      beam.position.y = -beamH * 0.5 - radius * 0.16;
      ship.add(beam);
      orbitalBeams.push(beam);
    }

    root.add(ship);
    hoveringWarships.push(ship);
    counts.hoveringWarships++;
  };

  // Colossal Flagship Dreadnought & Flanking Cruisers hovering over the 8km warfront
  addHoveringWarship(340, 560, -820, 175, true, false);
  addHoveringWarship(1680, 460, -1240, 110, true, false);
  addHoveringWarship(640, 440, -1580, 102, true, true);
  addHoveringWarship(-160, 490, -680, 118, true, false);
  addHoveringWarship(1240, 520, -480, 96, false, true);
  addHoveringWarship(-780, 540, -1120, 92, true, true);

  // =========================================================================
  // 4. FLOATING OBSIDIAN MONOLITHS & PERIMETER ENERGY PYLONS (Ref #9)
  // =========================================================================
  const obeliskCoords: Array<[number, number, number, number]> = [
    [940, 215, -1420, 72],
    [1060, 255, -1780, 88],
    [1580, 240, -1820, 82],
    [1640, 205, -1380, 68],
    [1220, 265, -1180, 62],
  ];
  for (const [ox, oy, oz, oh] of obeliskCoords) {
    const ob = new THREE.Mesh(octGeo, mats.alienObsidian);
    ob.scale.set(11, oh * 0.55, 11);
    ob.position.set(ox, oy, oz);
    ob.userData.baseY = oy;
    detailGroup.add(ob);
    floatingObelisks.push(ob);
    counts.floatingObelisks++;
  }

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const px = 1280 + Math.cos(a) * 340;
    const pz = -1560 + Math.sin(a) * 310;
    const py = getTerrainHeight(px, pz);
    const pg = new THREE.Group();
    pg.position.set(px, py - 2, pz);
    pg.rotation.y = -a;

    const shaft = new THREE.Mesh(boxGeo, mats.alienObsidian);
    shaft.scale.set(9, 54, 12);
    shaft.position.y = 27;
    pg.add(shaft);

    const glow = new THREE.Mesh(boxGeo, mats.alienEnergyAmber);
    glow.scale.set(1.8, 42, 1.8);
    glow.position.set(4.6, 28, 0);
    pg.add(glow);

    detailGroup.add(pg);
    counts.energyPylons++;
  }

  // =========================================================================
  // 5. ARRAYED ALIEN VANGUARD LEGIONS ASSEMBLED BELOW THE COMMAND DAIS
  // =========================================================================
  const troopCount = 240;
  const troopInst = new THREE.InstancedMesh(boxGeo, mats.alienObsidian, troopCount);
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let block = 0; block < 2; block++) {
    const side = block === 0 ? -1 : 1;
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 10; col++) {
        const localX = side * (28 + col * 5.2);
        const localZ = 28 + row * 6.0;
        const cos = Math.cos(SOVEREIGN_FACING_YAW);
        const sin = Math.sin(SOVEREIGN_FACING_YAW);
        const wx = sx + localX * cos + localZ * sin;
        const wz = sz - localX * sin + localZ * cos;
        const wy = getTerrainHeight(wx, wz);

        dummy.position.set(wx, wy + 1.45, wz);
        dummy.scale.set(0.95, 2.9, 0.72);
        dummy.rotation.set(0, SOVEREIGN_FACING_YAW, 0);
        dummy.updateMatrix();
        troopInst.setMatrixAt(idx++, dummy.matrix);
      }
    }
  }
  troopInst.instanceMatrix.needsUpdate = true;
  troopInst.computeBoundingSphere();
  microGroup.add(troopInst);
  counts.vanguardTroops = troopCount;

  smokeAnchors.push(new THREE.Vector3(960, getTerrainHeight(960, -1240) + 8, -1240));
  smokeAnchors.push(new THREE.Vector3(1480, getTerrainHeight(1480, -1280) + 8, -1280));

  return {
    root,
    detailGroup,
    microGroup,
    fireAnchors,
    smokeAnchors,
    colliders,
    hoveringWarships,
    floatingObelisks,
    orbitalBeams,
    assetCounts: counts,
    dispose: () => {
      for (const g of geos) g.dispose();
    },
  };
}
