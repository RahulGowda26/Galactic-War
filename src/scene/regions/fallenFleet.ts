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

export function buildFallenFleet(
  mats: WorldMaterialLibrary,
  destructionRegistry: DestructionRegistry,
): RegionBuildResult {
  const root = new THREE.Group();
  root.name = 'Region_FallenFleet';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'FallenFleet_Detail';
  const microGroup = new THREE.Group();
  microGroup.name = 'FallenFleet_Micro';
  root.add(detailGroup, microGroup);

  const geos: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };

  const rand = seededRand(88317);
  const fireAnchors: THREE.Vector3[] = [];
  const smokeAnchors: THREE.Vector3[] = [];
  const colliders: WorldCollider[] = [];
  const counts: Record<string, number> = {
    ringedDreadnought: 1,
    downedCarriers: 0,
    hullFragments: 0,
    cordonAPCs: 0,
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
      minY: cy - 10,
      maxY: cy + h,
      minZ: cz - d * 0.5,
      maxZ: cz + d * 0.5,
    });
  };

  // =========================================================================
  // 1. COLOSSAL CRASHED RINGED ALIEN DREADNOUGHT (Ref #4 — 265m Crater at -1080, 1240)
  // =========================================================================
  const cx = -1080;
  const cz = 1240;
  const craterFloorY = getTerrainHeight(cx, cz);

  const dread = new THREE.Group();
  dread.name = 'FallenDreadnought_RingedColossus';
  dread.position.set(cx, craterFloorY + 34, cz);
  // Dramatic tilted impact plunge into the planetary crust
  dread.rotation.set(0.56, 0.72, -0.44);

  // Inner armored ribbed spherical reactor core
  const coreSphere = new THREE.Mesh(
    track(new THREE.SphereGeometry(52, 28, 20)),
    mats.alienObsidian,
  );
  coreSphere.scale.set(1.06, 0.92, 1.06);
  coreSphere.castShadow = true;
  coreSphere.receiveShadow = true;
  dread.add(coreSphere);

  // Exposed breached cyan-blue plasma reactor rift glowing inside the split hull
  const reactorGlow = new THREE.Mesh(
    track(new THREE.TorusGeometry(55, 6.2, 14, 48, Math.PI * 1.45)),
    mats.alienEnergyCyan,
  );
  reactorGlow.rotation.x = Math.PI * 0.5;
  reactorGlow.rotation.z = 0.4;
  dread.add(reactorGlow);

  const reactorHeart = new THREE.Mesh(
    track(new THREE.SphereGeometry(32, 20, 16)),
    mats.alienEnergyCyan,
  );
  reactorHeart.position.set(-28, 6, 12);
  dread.add(reactorHeart);

  // Secondary concentric ribbed orbital ring (middle ring)
  const midRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(82, 8.8, 16, 56)),
    mats.alienHullDark,
  );
  midRing.rotation.x = Math.PI * 0.5;
  midRing.scale.set(1.0, 1.0, 0.72);
  midRing.castShadow = true;
  dread.add(midRing);

  const midRingEnergy = new THREE.Mesh(
    track(new THREE.TorusGeometry(75, 2.6, 10, 56)),
    mats.alienEnergyCyan,
  );
  midRingEnergy.rotation.x = Math.PI * 0.5;
  dread.add(midRingEnergy);

  // Colossal outer structural drive ring (partially fractured at impact end)
  const outerRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(118, 11.5, 16, 64, Math.PI * 1.72)),
    mats.alienObsidian,
  );
  outerRing.rotation.x = Math.PI * 0.5;
  outerRing.rotation.z = -0.35;
  outerRing.scale.set(1.0, 1.0, 0.62);
  outerRing.castShadow = true;
  outerRing.receiveShadow = true;
  dread.add(outerRing);

  // Radial armor ribs & structural spars joining outer ring, middle ring, and core
  const ribGeo = track(new THREE.BoxGeometry(6.5, 13.5, 68));
  const finGeo = track(new THREE.BoxGeometry(3.2, 22, 12));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rib = new THREE.Mesh(ribGeo, mats.alienHullDark);
    rib.position.set(Math.sin(a) * 86, 0, Math.cos(a) * 86);
    rib.rotation.y = a;
    rib.castShadow = true;
    dread.add(rib);

    // Outer armor radiator fins
    const fin = new THREE.Mesh(finGeo, mats.scorchedHull);
    fin.position.set(Math.sin(a) * 119, 0, Math.cos(a) * 119);
    fin.rotation.y = a;
    dread.add(fin);
  }

  // Equatorial dorsal armor belt around core sphere
  const coreBelt = new THREE.Mesh(
    track(new THREE.CylinderGeometry(54.5, 54.5, 16, 28, 1, true)),
    mats.scorchedHull,
  );
  coreBelt.rotation.z = 0.25;
  dread.add(coreBelt);

  root.add(dread);
  addBoxCollider('ff_dreadnought_core', cx, craterFloorY, cz, 145, 95, 145);

  destructionRegistry.register(
    buildTowerDestructionSpec({
      id: 'ff_ringed_dreadnought',
      name: 'Downed Ringed Alien Dreadnought',
      regionId: 'fallen_fleet',
      category: 'alien_structure',
      position: [cx, craterFloorY, cz],
      width: 220,
      depth: 220,
      height: 115,
      primaryMaterial: 'alien_obsidian',
      damageState: 'critical',
    }),
  );

  // Heavy burning impact rim & smoke plumes around the Dreadnought
  const dreadFires: Array<[number, number, number]> = [
    [cx + 68, craterFloorY + 22, cz + 42],
    [cx - 72, craterFloorY + 18, cz + 56],
    [cx + 15, craterFloorY + 26, cz - 78],
    [cx - 46, craterFloorY + 38, cz - 24],
    [cx + 88, craterFloorY + 14, cz - 28],
    [cx - 24, craterFloorY + 16, cz + 92],
  ];
  for (const [fx, fy, fz] of dreadFires) {
    fireAnchors.push(new THREE.Vector3(fx, fy, fz));
    smokeAnchors.push(new THREE.Vector3(fx, fy + 10, fz));
  }

  // =========================================================================
  // 2. DOWNED ESCORT CARRIERS IN SECONDARY IMPACT CRATERS
  // =========================================================================
  const carrierSites: Array<[number, number, number]> = [
    [-720, 1020, 1.1],
    [-1360, 980, -0.75],
    [-920, 1520, 2.3],
  ];

  carrierSites.forEach(([sx, sz, yaw], idx) => {
    const gy = getTerrainHeight(sx, sz);
    const ship = new THREE.Group();
    ship.position.set(sx, gy + 10, sz);
    ship.rotation.set(0.24, yaw, -0.28);

    const fuselage = new THREE.Mesh(
      track(new THREE.CylinderGeometry(10, 18, 92, 8)),
      mats.scorchedHull,
    );
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    ship.add(fuselage);

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(
        track(new THREE.BoxGeometry(36, 4.5, 42)),
        mats.alienHullDark,
      );
      wing.position.set(side * 24, -1, 6);
      wing.rotation.z = side * 0.22;
      wing.castShadow = true;
      ship.add(wing);
    }

    const engineGlow = new THREE.Mesh(
      track(new THREE.CylinderGeometry(7.5, 9, 4, 12)),
      mats.alienEnergyAmber,
    );
    engineGlow.rotation.x = Math.PI / 2;
    engineGlow.position.set(0, 0, 45);
    ship.add(engineGlow);

    root.add(ship);
    addBoxCollider(`ff_carrier_${idx}`, sx, gy, sz, 48, 26, 75);
    counts.downedCarriers++;

    fireAnchors.push(new THREE.Vector3(sx + 8, gy + 12, sz - 6));
    smokeAnchors.push(new THREE.Vector3(sx + 8, gy + 18, sz - 6));
  });

  // =========================================================================
  // 3. SHATTERED HULL FRAGMENTS & BURNED STRUCTURAL RIBS
  // =========================================================================
  const shardGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const shardMesh = new THREE.InstancedMesh(shardGeo, mats.scorchedHull, 90);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2;
    const dist = 125 + rand() * 340;
    const fx = cx + Math.cos(a) * dist;
    const fz = cz + Math.sin(a) * dist;
    const gy = getTerrainHeight(fx, fz);

    dummy.position.set(fx, gy + 1.8, fz);
    dummy.rotation.set(rand() * 0.9, rand() * Math.PI * 2, rand() * 0.9);
    dummy.scale.set(4 + rand() * 14, 1.5 + rand() * 5, 5 + rand() * 18);
    dummy.updateMatrix();
    shardMesh.setMatrixAt(i, dummy.matrix);
    counts.hullFragments++;
  }
  shardMesh.instanceMatrix.needsUpdate = true;
  detailGroup.add(shardMesh);

  // =========================================================================
  // 4. ALLIED 8-WHEEL TACTICAL APC CORDON PERIMETER (Ref #1 & #4)
  // =========================================================================
  const apcSites: Array<[number, number, number]> = [
    [-785, 1110, 2.2],
    [-752, 1165, 2.45],
    [-820, 1060, 2.05],
    [-865, 1410, 0.85],
    [-935, 1465, 0.65],
    [-1245, 1480, -0.52],
  ];

  const apcHullGeo = track(new THREE.BoxGeometry(4.4, 2.6, 9.6));
  const apcTurretGeo = track(new THREE.BoxGeometry(2.4, 1.2, 3.4));
  const wheelGeo = track(new THREE.CylinderGeometry(0.85, 0.85, 0.65, 10));
  wheelGeo.rotateZ(Math.PI / 2);

  apcSites.forEach(([ax, az, yaw], idx) => {
    const gy = getTerrainHeight(ax, az);
    const apc = new THREE.Group();
    apc.position.set(ax, gy, az);
    apc.rotation.y = yaw;

    const hull = new THREE.Mesh(apcHullGeo, mats.militaryArmor);
    hull.position.y = 2.0;
    hull.castShadow = true;
    apc.add(hull);

    const turret = new THREE.Mesh(apcTurretGeo, mats.weaponGunmetal);
    turret.position.set(0, 3.8, -0.6);
    apc.add(turret);

    // 8 rugged combat tires
    for (const side of [-2.35, 2.35]) {
      for (const wz of [-3.3, -1.1, 1.1, 3.3]) {
        const w = new THREE.Mesh(wheelGeo, mats.rubbleDark);
        w.position.set(side, 0.9, wz);
        apc.add(w);
      }
    }

    // Headlight accents
    const lightBar = new THREE.Mesh(
      track(new THREE.BoxGeometry(3.2, 0.32, 0.25)),
      mats.cityAmberAccent,
    );
    lightBar.position.set(0, 2.2, -4.85);
    apc.add(lightBar);

    microGroup.add(apc);
    addBoxCollider(`ff_apc_${idx}`, ax, gy, az, 6, 4.5, 11);
    counts.cordonAPCs++;
  });

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
