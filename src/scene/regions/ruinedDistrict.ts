import * as THREE from 'three';
import { getTerrainHeight, type WorldCollider } from '../../world/worldConfig';
import {
  DestructionRegistry,
  buildTowerDestructionSpec,
} from '../../world/destructionSystem';
import type { WorldMaterialLibrary } from '../materials';
import type { RegionBuildResult } from './crownCity';

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildRuinedDistrict(
  mats: WorldMaterialLibrary,
  destructionRegistry: DestructionRegistry,
): RegionBuildResult {
  const root = new THREE.Group();
  root.name = 'Region_RuinedDistrict';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'RuinedDistrict_Detail';
  const microGroup = new THREE.Group();
  microGroup.name = 'RuinedDistrict_Micro';
  root.add(detailGroup, microGroup);

  const geos: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };

  const rand = seededRand(882377);
  const fireAnchors: THREE.Vector3[] = [];
  const smokeAnchors: THREE.Vector3[] = [];
  const colliders: WorldCollider[] = [];
  const counts: Record<string, number> = {
    hollowRuinedBuildings: 0,
    severedOverpass: 1,
    crashedAircraft: 1,
    abandonedVehicles: 0,
    fallenCommsTowers: 1,
    destroyedDefenses: 0,
    rubbleChunks: 0,
  };

  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const cylGeo = track(new THREE.CylinderGeometry(1, 1, 1, 10));
  const rubbleGeo = track(new THREE.DodecahedronGeometry(1, 1));

  // =========================================================================
  // TRUE HOLLOW MULTI-STORY CONCRETE SKELETON RUINED BUILDING (Ref #3!)
  // Actual individual floor slabs, structural corner columns, partial blown-out
  // curtain walls, bent protruding rebar, collapsed upper slab, & debris apron!
  // =========================================================================
  const addHollowRuinedBuilding = (
    x: number,
    z: number,
    width: number,
    depth: number,
    floors: number,
    rotY: number,
    onFire: boolean,
    id: string,
  ) => {
    const gy = getTerrainHeight(x, z);
    const floorH = 6.8;
    const totalH = floors * floorH;
    const g = new THREE.Group();
    g.position.set(x, gy - 1.5, z);
    g.rotation.y = rotY;

    // 1. Structural vertical reinforced-concrete columns (full height with ragged tops)
    const colPositions: Array<[number, number]> = [
      [-width * 0.48, -depth * 0.48],
      [0, -depth * 0.48],
      [width * 0.48, -depth * 0.48],
      [-width * 0.48, depth * 0.48],
      [0, depth * 0.48],
      [width * 0.48, depth * 0.48],
      [-width * 0.48, 0],
      [width * 0.48, 0],
    ];
    for (let i = 0; i < colPositions.length; i++) {
      const [cx, cz] = colPositions[i];
      const hFrac = 0.62 + rand() * 0.44;
      const ch = totalH * hFrac;
      const col = new THREE.Mesh(boxGeo, mats.ruinConcrete);
      col.scale.set(1.85, ch, 1.85);
      col.position.set(cx, ch * 0.5, cz);
      col.castShadow = true;
      col.receiveShadow = true;
      g.add(col);

      // Bent steel rebar sticking up from sheared concrete column tops
      for (let r = 0; r < 2; r++) {
        const rebar = new THREE.Mesh(boxGeo, mats.exposedSteel);
        rebar.scale.set(0.22, 4.5 + rand() * 4.5, 0.22);
        rebar.position.set(cx + (r - 0.5) * 0.7, ch + 1.8, cz);
        rebar.rotation.set((rand() - 0.5) * 0.55, 0, (rand() - 0.5) * 0.55);
        g.add(rebar);
      }
    }

    // 2. Individual horizontal concrete floor slabs (some partially collapsed/tilted!)
    for (let f = 1; f <= floors; f++) {
      const fy = f * floorH;
      const intactRatio = f > floors - 2 ? 0.55 + rand() * 0.3 : 0.85 + rand() * 0.15;
      const slab = new THREE.Mesh(boxGeo, mats.ruinConcrete);
      slab.scale.set(width * intactRatio, 0.95, depth * (0.78 + rand() * 0.22));
      slab.position.set((rand() - 0.5) * width * (1 - intactRatio), fy, 0);
      if (f === floors) {
        // Collapsed tilted roof slab resting on girders
        slab.rotation.set((rand() - 0.5) * 0.28, 0, (rand() - 0.5) * 0.34);
        slab.position.y -= 1.8;
      }
      slab.castShadow = true;
      slab.receiveShadow = true;
      g.add(slab);
    }

    // 3. Partial blown-out exterior facade walls (leaving huge hollow dark bays open to sky!)
    const wallPanels: Array<[number, number, number, number, number]> = [
      [0, -depth * 0.49, width * 0.96, totalH * (0.52 + rand() * 0.32), 0],
      [width * 0.49, 0, depth * 0.96, totalH * (0.45 + rand() * 0.38), Math.PI * 0.5],
      [-width * 0.49, 0, depth * 0.72, totalH * (0.38 + rand() * 0.42), Math.PI * 0.5],
      [width * 0.18, depth * 0.49, width * 0.58, totalH * (0.42 + rand() * 0.35), 0],
    ];
    for (const [wx, wz, ww, wh, ry] of wallPanels) {
      const wall = new THREE.Mesh(boxGeo, mats.ruinFacade);
      wall.scale.set(ww, wh, 1.35);
      wall.position.set(wx, wh * 0.5, wz);
      wall.rotation.y = ry;
      wall.castShadow = true;
      wall.receiveShadow = true;
      g.add(wall);
    }

    // 4. Inner elevator/stairwell concrete core shaft
    const coreH = totalH * (0.78 + rand() * 0.24);
    const core = new THREE.Mesh(boxGeo, mats.ruinConcrete);
    core.scale.set(width * 0.32, coreH, depth * 0.32);
    core.position.set(0, coreH * 0.5, 0);
    g.add(core);

    // 5. Large rubble skirt mound around foundation
    for (let m = 0; m < 4; m++) {
      const ang = (m / 4) * Math.PI * 2 + rand();
      const skirt = new THREE.Mesh(rubbleGeo, mats.rubbleDark);
      skirt.scale.set(width * 0.48, 3.8 + rand() * 2.5, depth * 0.42);
      skirt.position.set(Math.cos(ang) * width * 0.35, 1.4, Math.sin(ang) * depth * 0.35);
      g.add(skirt);
    }

    if (onFire) {
      fireAnchors.push(new THREE.Vector3(x + width * 0.2, gy + totalH * 0.35, z));
      smokeAnchors.push(new THREE.Vector3(x, gy + totalH * 0.75, z));
    }

    root.add(g);
    counts.hollowRuinedBuildings++;
    colliders.push({
      id,
      minX: x - width * 0.52,
      maxX: x + width * 0.52,
      minY: gy - 2,
      maxY: gy + totalH,
      minZ: z - depth * 0.52,
      maxZ: z + depth * 0.52,
    });

    destructionRegistry.register(
      buildTowerDestructionSpec({
        id,
        name: `Devastated Block ${counts.hollowRuinedBuildings}`,
        regionId: 'ruined_district',
        category: 'skyscraper',
        position: [x, gy, z],
        width,
        depth,
        height: totalH,
        primaryMaterial: 'ferroconcrete',
        damageState: floors < 9 ? 'collapsed' : 'critical',
      }),
    );
  };

  // Place expanded devastated city blocks spanning the Ruined District (centered around -120, -480)
  const ruinsSpec: Array<[number, number, number, number, number, number, boolean]> = [
    // Hero Devastated Street Block (immediately visible from preset 3 & combat frontline)
    [-235, -455, 34, 30, 12, 0.14, true],
    [-135, -545, 38, 34, 15, -0.08, true],
    [-25, -495, 32, 30, 11, 0.22, true],
    [-265, -345, 30, 28, 9, -0.18, false],
    [-110, -350, 36, 30, 10, 0.12, true],
    [45, -395, 34, 32, 13, -0.14, true],
    [135, -480, 32, 28, 10, 0.08, false],
    [-185, -660, 40, 34, 14, -0.1, true],
    [-40, -685, 36, 32, 12, 0.18, false],
    [115, -620, 34, 30, 11, -0.22, true],
    [-385, -510, 34, 32, 13, 0.06, false],
    [-465, -420, 30, 28, 10, -0.12, true],
    [-560, -560, 36, 32, 14, 0.2, false],
    [225, -555, 32, 30, 9, 0.16, true],
    [20, -260, 30, 28, 8, -0.2, false],
    [-210, -245, 32, 28, 9, 0.1, false],
  ];
  ruinsSpec.forEach((s, idx) => {
    addHollowRuinedBuilding(s[0], s[1], s[2], s[3], s[4], s[5], s[6], `ruin_block_${idx + 1}`);
  });

  // =========================================================================
  // ICONIC SEVERED ELEVATED HIGHWAY OVERPASS WITH DANGLING CABLES & WRECKED CARS (Ref #3)
  // =========================================================================
  const overpassG = new THREE.Group();
  const deckY = 34.0;
  const deckA = new THREE.Mesh(boxGeo, mats.roadAsphalt);
  deckA.scale.set(22, 2.8, 165);
  deckA.position.set(-340, deckY, -415);
  deckA.rotation.y = 0.56;
  deckA.castShadow = true;
  deckA.receiveShadow = true;
  overpassG.add(deckA);

  for (const side of [-10.4, 10.4]) {
    const rail = new THREE.Mesh(boxGeo, mats.concreteBarrier);
    rail.scale.set(1.1, 1.8, 160);
    rail.position.set(-340, deckY + 1.8, -415);
    rail.rotation.y = 0.56;
    rail.translateX(side);
    overpassG.add(rail);
  }
  for (const offset of [-55, 0, 55]) {
    const pier = new THREE.Mesh(boxGeo, mats.ruinConcrete);
    pier.scale.set(7.5, 38, 5.5);
    pier.position.set(-340, deckY - 19, -415);
    pier.rotation.y = 0.56;
    pier.translateZ(offset);
    overpassG.add(pier);
  }

  // Collapsed broken highway span plunging into the blasted street
  const deckBroken = new THREE.Mesh(boxGeo, mats.ruinConcrete);
  deckBroken.scale.set(21, 2.8, 62);
  deckBroken.position.set(-285, deckY - 11.5, -495);
  deckBroken.rotation.set(0.36, 0.56, -0.08);
  overpassG.add(deckBroken);

  // Curved hanging steel cables & rebar off severed lip (TubeGeometry!)
  for (let i = 0; i < 6; i++) {
    const startX = -302 + (i - 2.5) * 3.1;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(startX, deckY - 0.5, -478),
      new THREE.Vector3(startX + 2, deckY - 7.5, -485),
      new THREE.Vector3(startX - 1.5, deckY - 16.5, -489),
    ]);
    const cableGeo = track(new THREE.TubeGeometry(curve, 12, 0.16, 6, false));
    overpassG.add(new THREE.Mesh(cableGeo, mats.exposedSteel));
  }
  root.add(overpassG);

  // =========================================================================
  // CRASHED ALLIED DROPSHIP FUSELAGE IN BLASTED PLAZA
  // =========================================================================
  const crashG = new THREE.Group();
  const crx = -195;
  const crz = -400;
  const cry = getTerrainHeight(crx, crz);
  crashG.position.set(crx, cry + 1.5, crz);
  crashG.rotation.set(0.18, 0.72, -0.26);

  const fuselage = new THREE.Mesh(cylGeo, mats.scorchedHull);
  fuselage.rotation.x = Math.PI * 0.5;
  fuselage.scale.set(4.2, 22, 3.6);
  fuselage.position.y = 3.2;
  crashG.add(fuselage);

  const cockpit = new THREE.Mesh(boxGeo, mats.cityGlassCyan);
  cockpit.scale.set(5.2, 2.8, 5.5);
  cockpit.position.set(0, 3.8, 9.8);
  crashG.add(cockpit);

  const brokenWing = new THREE.Mesh(boxGeo, mats.militaryArmor);
  brokenWing.scale.set(16, 0.9, 6.2);
  brokenWing.position.set(-7.5, 4.2, -2);
  brokenWing.rotation.z = 0.24;
  crashG.add(brokenWing);

  detailGroup.add(crashG);
  fireAnchors.push(new THREE.Vector3(crx - 4, cry + 3.2, crz + 2));
  smokeAnchors.push(new THREE.Vector3(crx, cry + 6, crz));

  // =========================================================================
  // STREET-LEVEL TACTICAL COVER BARRICADES & BURNED MILITARY VEHICLES (for combat!)
  // =========================================================================
  const addWreckedVehicle = (x: number, y: number, z: number, rotY: number, isApc: boolean) => {
    const vg = new THREE.Group();
    vg.position.set(x, y, z);
    vg.rotation.y = rotY;
    const body = new THREE.Mesh(boxGeo, isApc ? mats.militaryArmor : mats.scorchedHull);
    body.scale.set(isApc ? 3.2 : 2.2, isApc ? 1.85 : 1.15, isApc ? 7.4 : 4.6);
    body.position.y = isApc ? 1.45 : 0.9;
    body.castShadow = true;
    vg.add(body);

    const upper = new THREE.Mesh(boxGeo, mats.rubbleDark);
    upper.scale.set(isApc ? 2.5 : 1.8, isApc ? 1.0 : 0.75, isApc ? 3.2 : 2.2);
    upper.position.set(0, isApc ? 2.6 : 1.75, isApc ? 0.4 : -0.2);
    vg.add(upper);

    const wheelsZ = isApc ? [-2.4, -0.8, 0.8, 2.4] : [-1.45, 1.45];
    for (const wz of wheelsZ) {
      for (const wx of [isApc ? -1.55 : -1.05, isApc ? 1.55 : 1.05]) {
        const w = new THREE.Mesh(cylGeo, mats.rubbleDark);
        w.rotation.z = Math.PI * 0.5;
        w.scale.set(0.58, 0.42, 0.58);
        w.position.set(wx, 0.58, wz);
        vg.add(w);
      }
    }
    detailGroup.add(vg);
    counts.abandonedVehicles++;
    colliders.push({
      id: `wreck_${counts.abandonedVehicles}`,
      minX: x - 2.4,
      maxX: x + 2.4,
      minY: y - 1,
      maxY: y + 3.2,
      minZ: z - 3.6,
      maxZ: z + 3.6,
    });
  };

  const streetCover: Array<[number, number, number, boolean]> = [
    [-305, -352, 0.4, true],
    [-255, -372, -0.6, false],
    [-175, -395, 0.9, true],
    [-85, -425, -0.35, true],
    [-150, -470, 1.15, false],
    [-45, -455, 0.2, false],
    [-415, -455, 0.55, true],
    [-520, -495, -0.4, false],
  ];
  for (const [sx, sz, srot, apc] of streetCover) {
    const sy = getTerrainHeight(sx, sz);
    addWreckedVehicle(sx, sy, sz, srot, apc);

    for (let b = -1; b <= 1; b++) {
      const bx = sx + Math.cos(srot) * b * 4.8;
      const bz = sz + Math.sin(srot) * b * 4.8 + 5.2;
      const bar = new THREE.Mesh(boxGeo, mats.concreteBarrier);
      bar.scale.set(4.2, 1.45, 1.15);
      bar.position.set(bx, getTerrainHeight(bx, bz) + 0.72, bz);
      bar.rotation.y = srot + (rand() - 0.5) * 0.25;
      bar.castShadow = true;
      detailGroup.add(bar);
      colliders.push({
        id: `bar_${counts.destroyedDefenses}_${b}`,
        minX: bx - 2.1,
        maxX: bx + 2.1,
        minY: sy - 1,
        maxY: sy + 1.8,
        minZ: bz - 1.4,
        maxZ: bz + 1.4,
      });
    }
    counts.destroyedDefenses++;
  }

  // Fallen Planetary Communications Tower
  const commG = new THREE.Group();
  const cgy = getTerrainHeight(68, -460);
  commG.position.set(68, cgy + 1.5, -460);
  commG.rotation.set(0.16, 0.65, 1.28);
  const mastMain = new THREE.Mesh(cylGeo, mats.exposedSteel);
  mastMain.scale.set(2.4, 92, 2.4);
  mastMain.position.y = 46;
  commG.add(mastMain);
  detailGroup.add(commG);

  // Crater fires & rising wind-blown smoke anchors
  const fireSpots: Array<[number, number]> = [
    [-55, -510],
    [-240, -310],
    [185, -340],
    [-160, -430],
    [-390, -490],
  ];
  for (const [fx, fz] of fireSpots) {
    const fy = getTerrainHeight(fx, fz);
    fireAnchors.push(new THREE.Vector3(fx, fy + 2.0, fz));
    smokeAnchors.push(new THREE.Vector3(fx, fy + 5.5, fz));
  }

  // Instanced Concrete Rubble & Debris Field across devastated blocks
  const rubbleCount = 420;
  const rubbleInst = new THREE.InstancedMesh(rubbleGeo, mats.rubbleDark, rubbleCount);
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < rubbleCount; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 620;
    const rx = -140 + Math.cos(a) * r;
    const rz = -475 + Math.sin(a) * r;
    const ry = getTerrainHeight(rx, rz);
    const sx = 1.4 + rand() * 5.2;
    const sy = 0.7 + rand() * 2.8;
    const sz = 1.4 + rand() * 4.8;
    dummy.position.set(rx, ry + sy * 0.32, rz);
    dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    rubbleInst.setMatrixAt(i, dummy.matrix);

    const shade = 0.68 + rand() * 0.42;
    c.setRGB(shade, shade * 0.96, shade * 0.93);
    rubbleInst.setColorAt(i, c);
  }
  rubbleInst.instanceMatrix.needsUpdate = true;
  if (rubbleInst.instanceColor) rubbleInst.instanceColor.needsUpdate = true;
  rubbleInst.computeBoundingSphere();
  microGroup.add(rubbleInst);
  counts.rubbleChunks = rubbleCount;

  return {
    root,
    detailGroup,
    microGroup,
    fireAnchors,
    smokeAnchors,
    colliders,
    assetCounts: counts,
    dispose: () => {
      for (const g of geos) g.dispose();
    },
  };
}
