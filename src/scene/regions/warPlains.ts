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

export function buildWarPlains(
  mats: WorldMaterialLibrary,
  destructionRegistry: DestructionRegistry,
): RegionBuildResult {
  const root = new THREE.Group();
  root.name = 'Region_WarPlains';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'WarPlains_Detail';
  const microGroup = new THREE.Group();
  microGroup.name = 'WarPlains_Micro';
  root.add(detailGroup, microGroup);

  const geos: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };

  const rand = seededRand(44109);
  const fireAnchors: THREE.Vector3[] = [];
  const smokeAnchors: THREE.Vector3[] = [];
  const colliders: WorldCollider[] = [];
  const counts: Record<string, number> = {
    artilleryBatteries: 0,
    fortifiedBunkers: 0,
    trenchSegments: 0,
    alienWalkers: 0,
    wreckedArmor: 0,
    alienDropSpires: 0,
  };

  const addBoxCollider = (
    id: string,
    cx: number,
    cy: number,
    cz: number,
    w: number,
    h: number,
    d: number,
  ) => {
    colliders.push({
      id,
      minX: cx - w * 0.5,
      maxX: cx + w * 0.5,
      minY: cy - 2,
      maxY: cy + h,
      minZ: cz - d * 0.5,
      maxZ: cz + d * 0.5,
    });
  };

  // =========================================================================
  // 1. MULTI-TIER RAIL ARTILLERY BATTERIES & COMMAND BUNKERS
  // =========================================================================
  const batterySites: Array<[number, number, number]> = [
    [1020, 740, -0.65],
    [1220, 910, -0.82],
    [1460, 1080, -0.78],
    [860, 990, -0.42],
    [1640, 760, -1.05],
  ];

  const basePadGeo = track(new THREE.CylinderGeometry(18, 22, 4.5, 8));
  const turretBodyGeo = track(new THREE.BoxGeometry(14, 7.2, 16));
  const turretMantletGeo = track(new THREE.BoxGeometry(8.5, 4.5, 7));
  const barrelGeo = track(new THREE.CylinderGeometry(0.95, 1.35, 34, 10));
  barrelGeo.rotateX(Math.PI / 2);
  const bunkerBodyGeo = track(new THREE.BoxGeometry(26, 7.5, 18));
  const bunkerSlitGeo = track(new THREE.BoxGeometry(20, 1.4, 2));

  batterySites.forEach(([x, z, yaw], idx) => {
    const gY = getTerrainHeight(x, z);
    const bat = new THREE.Group();
    bat.position.set(x, gY, z);
    bat.rotation.y = yaw;

    // Octagonal ferroconcrete firing pad
    const pad = new THREE.Mesh(basePadGeo, mats.concreteBarrier);
    pad.position.y = 1.6;
    pad.receiveShadow = true;
    pad.castShadow = true;
    bat.add(pad);

    // Armored turret hull
    const turret = new THREE.Mesh(turretBodyGeo, mats.militaryArmor);
    turret.position.set(0, 6.8, 0);
    turret.castShadow = true;
    bat.add(turret);

    // Breech mantlet & twin elevated rail barrels aimed toward Arrival Citadel
    const mantlet = new THREE.Mesh(turretMantletGeo, mats.weaponGunmetal);
    mantlet.position.set(0, 8.2, -5.5);
    bat.add(mantlet);

    for (const side of [-2.1, 2.1]) {
      const barrel = new THREE.Mesh(barrelGeo, mats.weaponGunmetal);
      barrel.position.set(side, 12.6, -18.5);
      barrel.rotation.x = 0.24;
      barrel.castShadow = true;
      bat.add(barrel);

      // Barrel rail glow coils
      const coil = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.45, 0.55, 20)),
        mats.cityCyanAccent,
      );
      coil.position.set(side, 13.6, -17);
      coil.rotation.x = 0.24;
      bat.add(coil);
    }

    // Rear ammunition bunker
    const bunker = new THREE.Mesh(bunkerBodyGeo, mats.ruinConcrete);
    bunker.position.set(0, 3.5, 22);
    bunker.castShadow = true;
    bunker.receiveShadow = true;
    bat.add(bunker);

    const slit = new THREE.Mesh(bunkerSlitGeo, mats.cityAmberAccent);
    slit.position.set(0, 5.2, 13.2);
    bat.add(slit);

    root.add(bat);
    addBoxCollider(`wp_artillery_${idx}`, x, gY, z, 30, 14, 30);
    counts.artilleryBatteries++;
    counts.fortifiedBunkers++;

    destructionRegistry.register(
      buildTowerDestructionSpec({
        id: `wp_artillery_${idx}`,
        name: `Aether Rail Battery ${idx + 1}`,
        regionId: 'war_plains',
        category: 'military_tower',
        position: [x, gY, z],
        width: 24,
        depth: 24,
        height: 16,
        primaryMaterial: 'reinforced_titanium',
        damageState: idx === 4 ? 'damaged' : 'intact',
      }),
    );

    if (idx === 4) {
      fireAnchors.push(new THREE.Vector3(x + 4, gY + 6, z - 2));
      smokeAnchors.push(new THREE.Vector3(x + 4, gY + 9, z - 2));
    }
  });

  // =========================================================================
  // 2. COLOSSAL ALIEN WAR-WALKER WRECK & ACTIVE ASSAULT STRIDER (Ref #5)
  // =========================================================================
  const buildAlienWarWalker = (
    cx: number,
    cz: number,
    yaw: number,
    downed: boolean,
    idx: number,
  ) => {
    const gY = getTerrainHeight(cx, cz);
    const walker = new THREE.Group();
    walker.position.set(cx, gY, cz);
    walker.rotation.y = yaw;

    const torsoY = downed ? 11.5 : 24.0;

    // Sculpted domed armored carapace hull
    const hullMain = new THREE.Mesh(
      track(new THREE.SphereGeometry(12.5, 16, 12)),
      mats.alienObsidian,
    );
    hullMain.scale.set(1.25, 0.72, 1.48);
    hullMain.position.set(0, torsoY, 0);
    hullMain.rotation.z = downed ? 0.34 : 0;
    hullMain.castShadow = true;
    walker.add(hullMain);

    // Forward armored mandible prow & plasma cannon aperture
    const prow = new THREE.Mesh(
      track(new THREE.ConeGeometry(8.2, 16, 7)),
      mats.alienHullDark,
    );
    prow.rotation.x = -Math.PI / 2;
    prow.position.set(0, torsoY - 1.5, -16);
    prow.rotation.z = downed ? 0.34 : 0;
    walker.add(prow);

    const eyeCore = new THREE.Mesh(
      track(new THREE.SphereGeometry(3.2, 12, 10)),
      downed ? mats.alienEnergyAmber : mats.enemyAlienEmissive,
    );
    eyeCore.position.set(0, torsoY + 0.5, -14.5);
    walker.add(eyeCore);

    // 4 articulated hydraulic insectoid walker legs
    const legAngles = [-0.65, 0.65, -2.35, 2.35];
    const upperLegGeo = track(new THREE.CylinderGeometry(1.6, 2.2, 18, 8));
    const lowerLegGeo = track(new THREE.CylinderGeometry(0.95, 1.7, 24, 8));
    const jointGeo = track(new THREE.DodecahedronGeometry(2.6, 0));

    legAngles.forEach((ang, li) => {
      const hipX = Math.sin(ang) * 11;
      const hipZ = Math.cos(ang) * 12;
      const kneeX = Math.sin(ang) * 23;
      const kneeZ = Math.cos(ang) * 25;
      const kneeY = downed ? (li % 2 === 0 ? 15 : 8) : 29;
      const footX = Math.sin(ang) * 29;
      const footZ = Math.cos(ang) * 32;

      const hip = new THREE.Vector3(hipX, torsoY, hipZ);
      const knee = new THREE.Vector3(kneeX, kneeY, kneeZ);
      const foot = new THREE.Vector3(footX, 0, footZ);

      const upperDir = knee.clone().sub(hip);
      const upperMesh = new THREE.Mesh(upperLegGeo, mats.alienHullDark);
      upperMesh.position.copy(hip).addScaledVector(upperDir, 0.5);
      upperMesh.scale.y = upperDir.length() / 18;
      upperMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        upperDir.clone().normalize(),
      );
      upperMesh.castShadow = true;
      walker.add(upperMesh);

      const joint = new THREE.Mesh(jointGeo, mats.alienObsidian);
      joint.position.copy(knee);
      walker.add(joint);

      const lowerDir = foot.clone().sub(knee);
      const lowerMesh = new THREE.Mesh(lowerLegGeo, mats.alienObsidian);
      lowerMesh.position.copy(knee).addScaledVector(lowerDir, 0.5);
      lowerMesh.scale.y = lowerDir.length() / 24;
      lowerMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        lowerDir.clone().normalize(),
      );
      lowerMesh.castShadow = true;
      walker.add(lowerMesh);
    });

    root.add(walker);
    addBoxCollider(`wp_walker_${idx}`, cx, gY, cz, 32, torsoY + 10, 34);
    counts.alienWalkers++;

    if (downed) {
      fireAnchors.push(new THREE.Vector3(cx + 3, gY + 9, cz - 4));
      smokeAnchors.push(new THREE.Vector3(cx + 3, gY + 13, cz - 4));
    }
  };

  buildAlienWarWalker(1180, 690, 0.55, true, 0);
  buildAlienWarWalker(1540, 890, -0.45, false, 1);

  // =========================================================================
  // 3. DEFENSIVE TRENCH LINES, SANDBAG PARAPETS & CONCRETE CHEVAUX-DE-FRISE
  // =========================================================================
  const trenchWallGeo = track(new THREE.BoxGeometry(24, 2.8, 3.2));
  const trenchMesh = new THREE.InstancedMesh(trenchWallGeo, mats.concreteBarrier, 96);
  const dummy = new THREE.Object3D();
  let tIdx = 0;

  // Three long sweeping defensive lines across the valley
  for (let line = 0; line < 3; line++) {
    const baseZ = 610 + line * 255;
    for (let s = 0; s < 32 && tIdx < 96; s++) {
      const tx = 760 + s * 34 + Math.sin(s * 0.5 + line) * 18;
      const tz = baseZ + Math.cos(s * 0.35 + line) * 42;
      const gy = getTerrainHeight(tx, tz);
      dummy.position.set(tx, gy + 1.1, tz);
      dummy.rotation.set(0, Math.sin(s * 0.35) * 0.32, 0);
      dummy.scale.set(1, 0.85 + rand() * 0.45, 1);
      dummy.updateMatrix();
      trenchMesh.setMatrixAt(tIdx++, dummy.matrix);
      counts.trenchSegments++;
    }
  }
  trenchMesh.count = tIdx;
  trenchMesh.instanceMatrix.needsUpdate = true;
  trenchMesh.receiveShadow = true;
  detailGroup.add(trenchMesh);

  // =========================================================================
  // 4. ALIEN DROP-SPIRES EMBEDDED IN PLAINS CRATERS
  // =========================================================================
  const spireSites: Array<[number, number, number]> = [
    [960, 580, 52],
    [1580, 1050, 64],
    [1220, 1420, 48],
    [1840, 620, 58],
  ];

  spireSites.forEach(([sx, sz, h], idx) => {
    const gy = getTerrainHeight(sx, sz);
    const spire = new THREE.Group();
    spire.position.set(sx, gy - 4, sz);
    spire.rotation.set((rand() - 0.5) * 0.24, rand() * Math.PI * 2, (rand() - 0.5) * 0.24);

    const core = new THREE.Mesh(
      track(new THREE.CylinderGeometry(3.2, 9.5, h, 6)),
      mats.alienObsidian,
    );
    core.position.y = h * 0.5;
    core.castShadow = true;
    spire.add(core);

    for (let fin = 0; fin < 4; fin++) {
      const ang = (fin / 4) * Math.PI * 2;
      const blade = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.8, h * 0.72, 11)),
        mats.alienHullDark,
      );
      blade.position.set(Math.sin(ang) * 7.5, h * 0.42, Math.cos(ang) * 7.5);
      blade.rotation.y = ang;
      blade.rotation.x = 0.14;
      spire.add(blade);
    }

    const coreStrip = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.4, 2.2, h * 0.65, 6)),
      mats.alienEnergyAmber,
    );
    coreStrip.position.y = h * 0.52;
    spire.add(coreStrip);

    root.add(spire);
    addBoxCollider(`wp_spire_${idx}`, sx, gy, sz, 18, h, 18);
    counts.alienDropSpires++;

    fireAnchors.push(new THREE.Vector3(sx + 6, gy + 5, sz + 5));
    smokeAnchors.push(new THREE.Vector3(sx + 6, gy + 12, sz + 5));
  });

  // =========================================================================
  // 5. DESTROYED ARMORED TANKS & MILITARY TRANSPORT WRECKS
  // =========================================================================
  const tankHullGeo = track(new THREE.BoxGeometry(6.8, 2.6, 11.2));
  const tankTurretGeo = track(new THREE.BoxGeometry(4.4, 1.9, 5.8));
  const wreckedHulls = new THREE.InstancedMesh(tankHullGeo, mats.scorchedHull, 26);
  const wreckedTurrets = new THREE.InstancedMesh(tankTurretGeo, mats.militaryArmor, 26);

  for (let i = 0; i < 26; i++) {
    const ang = rand() * Math.PI * 2;
    const dist = 120 + rand() * 780;
    const wx = 1320 + Math.cos(ang) * dist;
    const wz = 910 + Math.sin(ang) * dist;
    const gy = getTerrainHeight(wx, wz);
    const yaw = rand() * Math.PI * 2;

    dummy.position.set(wx, gy + 1.25, wz);
    dummy.rotation.set((rand() - 0.5) * 0.18, yaw, (rand() - 0.5) * 0.22);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    wreckedHulls.setMatrixAt(i, dummy.matrix);

    dummy.position.set(wx + (rand() - 0.5) * 1.4, gy + 3.05, wz + (rand() - 0.5) * 1.4);
    dummy.rotation.y = yaw + (rand() - 0.5) * 1.2;
    dummy.updateMatrix();
    wreckedTurrets.setMatrixAt(i, dummy.matrix);
    counts.wreckedArmor++;

    if (i < 5) {
      fireAnchors.push(new THREE.Vector3(wx, gy + 2.8, wz));
      smokeAnchors.push(new THREE.Vector3(wx, gy + 5.5, wz));
    }
  }
  wreckedHulls.instanceMatrix.needsUpdate = true;
  wreckedTurrets.instanceMatrix.needsUpdate = true;
  microGroup.add(wreckedHulls, wreckedTurrets);

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
