import * as THREE from 'three';
import {
  PLAYER_START_POS,
  PLAYER_START_YAW,
  WORLD_PLAYABLE_HALF,
  getTerrainHeight,
  resolveHorizontalColliders,
  type WorldCollider,
} from '../world/worldConfig';
import type { PlayerControlSettings } from '../world/streamingManager';
import type { WorldMaterialLibrary } from './materials';

export type PlayerStance = 'standing' | 'crouching' | 'sprinting' | 'airborne' | 'aiming' | 'dodging';
export type PlayerWeaponId = 'carbine' | 'shotgun' | 'marksman';
export type ProtagonistPosePreview =
  | 'live'
  | 'idle_front'
  | 'aiming'
  | 'crouching'
  | 'sprinting'
  | 'reloading'
  | 'melee'
  | 'dodge'
  | 'victory';

export interface PlayerHudState {
  position: [number, number, number];
  yaw: number;
  stance: PlayerStance;
  isAiming: boolean;
  shoulderSide: 'right' | 'left';
  activeWeapon: PlayerWeaponId;
  cameraDistance: number;
  speed: number;
  grounded: boolean;
  helmetEquipped: boolean;
  isDodging: boolean;
}

export interface PlayerController {
  root: THREE.Group;
  muzzleNode: THREE.Object3D;
  muzzleFlashLight: THREE.PointLight;
  muzzleFlashMesh: THREE.Mesh;
  setMoveKey: (code: string, down: boolean) => void;
  setAiming: (aiming: boolean) => void;
  toggleShoulder: () => void;
  setWeapon: (weapon: PlayerWeaponId) => void;
  getWeapon: () => PlayerWeaponId;
  setHelmetEquipped: (equipped: boolean) => void;
  isHelmetEquipped: () => boolean;
  setSpeedMultiplier: (mult: number) => void;
  triggerMelee: () => boolean;
  triggerDodge: () => boolean;
  adjustCameraDistance: (delta: number) => void;
  setCameraDistance: (dist: number) => void;
  setPosePreview: (pose: ProtagonistPosePreview) => void;
  applyLookDelta: (dx: number, dy: number, settings: PlayerControlSettings) => void;
  clearInputs: () => void;
  teleport: (pos: [number, number, number], yaw?: number) => void;
  applyRecoil: (amount?: number) => void;
  applyKnockback: (dirX: number, dirZ: number, impulse: number) => void;
  triggerReloadAnim: (durationSec: number) => void;
  triggerHitReaction: (heavy?: boolean) => void;
  setVisible: (visible: boolean) => void;
  getPosition: (target?: THREE.Vector3) => THREE.Vector3;
  getMuzzleWorldPos: (target?: THREE.Vector3) => THREE.Vector3;
  getHudState: () => PlayerHudState;
  update: (
    dt: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera,
    colliders: readonly WorldCollider[],
    active: boolean,
    isDead: boolean,
  ) => void;
  dispose: () => void;
}

/**
 * Sculpts a realistic adult male human head mesh (centered at u=0.5 front +Z)
 * with brow ridge, orbital eye hollows, nasal bridge/tip, cheekbones, squared jaw, and chin.
 */
function buildSculptedMaleHeadGeometry(): THREE.SphereGeometry {
  // phiStart = -PI/2 puts u = 0.5 squarely on +Z (face front), seam hidden at -Z (back hair)
  const geo = new THREE.SphereGeometry(0.112, 44, 34, -Math.PI * 0.5, Math.PI * 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Natural adult human cranium proportions (slightly taller, narrower temples, fuller occiput)
    let x = v.x * 0.88;
    let y = v.y * 1.14;
    let z = v.z * 0.98;

    const frontMask = Math.max(0, z / 0.11);
    const absX = Math.abs(x);

    // Taper lower face into strong masculine squared jaw & chin
    if (y < -0.015) {
      const jawT = Math.min(1, (-0.015 - y) / 0.11);
      // Slight jaw angle flare at sides, taper toward chin tip
      const sideSquare = Math.exp(-Math.pow((y + 0.068) / 0.032, 2)) * 0.011;
      x = x * (1 - jawT * 0.24) + Math.sign(x) * sideSquare * Math.min(1, absX / 0.05);
      // Forward masculine chin projection
      if (frontMask > 0.35 && absX < 0.042 && y < -0.055) {
        const chinBell = Math.exp(-Math.pow(absX / 0.028, 2)) * Math.exp(-Math.pow((y + 0.095) / 0.03, 2));
        z += chinBell * 0.024;
      }
    }

    // Subtle brow ridge overhang above eyes
    if (frontMask > 0.45 && y > 0.012 && y < 0.046 && absX < 0.068) {
      const brow = Math.exp(-Math.pow((y - 0.028) / 0.013, 2)) * Math.exp(-Math.pow(absX / 0.055, 2));
      z += brow * 0.014;
    }

    // Recessed orbital eye sockets (gives realistic depth under brow, avoids flat doll face)
    if (frontMask > 0.5 && y > -0.012 && y < 0.022 && absX > 0.014 && absX < 0.058) {
      const eyeD = Math.hypot((absX - 0.034) / 0.018, (y - 0.005) / 0.013);
      if (eyeD < 1.0) {
        z -= (1 - eyeD * eyeD) * 0.011;
      }
    }

    // Defined masculine nose bridge & tip
    if (frontMask > 0.55 && absX < 0.026 && y > -0.038 && y < 0.026) {
      const widthFall = Math.exp(-Math.pow(absX / 0.013, 2));
      const noseProfile = Math.max(0, 1 - Math.abs(y + 0.012) / 0.034);
      const tipBoost = Math.exp(-Math.pow((y + 0.024) / 0.011, 2)) * 0.012;
      z += widthFall * (noseProfile * 0.022 + tipBoost);
    }

    // Sculpted zygomatic cheekbones
    if (frontMask > 0.3 && absX > 0.035 && absX < 0.088 && y > -0.035 && y < 0.006) {
      const cheek =
        Math.exp(-Math.pow((absX - 0.062) / 0.022, 2)) *
        Math.exp(-Math.pow((y + 0.014) / 0.018, 2));
      x += Math.sign(x) * cheek * 0.009;
      z += cheek * 0.01;
    }

    // Subtle upper/lower lip volume
    if (frontMask > 0.55 && absX < 0.034 && y > -0.068 && y < -0.038) {
      const lip = Math.exp(-Math.pow(absX / 0.022, 2)) * Math.exp(-Math.pow((y + 0.053) / 0.01, 2));
      z += lip * 0.009;
    }

    // Slight hollow below cheekbones (adult weathered male contour, zero baby-fat doll cheeks)
    if (frontMask > 0.25 && absX > 0.038 && absX < 0.075 && y > -0.075 && y < -0.032) {
      const hollow =
        Math.exp(-Math.pow((absX - 0.055) / 0.016, 2)) *
        Math.exp(-Math.pow((y + 0.052) / 0.018, 2));
      z -= hollow * 0.006;
    }

    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpts layered swept-back short military side-part hair crown matching Reference #1.
 * Strictly keeps the front forehead & brow scar completely uncovered while draping neatly
 * along the temples and back occiput.
 */
function buildSweptHairGeometry(): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(0.109, 36, 26, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let x = v.x * 0.91;
    let y = v.y * 1.04;
    let z = v.z * 1.01;

    // Close-cropped military side-part texture (low, natural silhouette — never bulbous beanie)
    if (y > 0.05) {
      const partRidge = Math.exp(-Math.pow((x + 0.022) / 0.048, 2)) * 0.008;
      const combGrooves = Math.sin(x * 78 + z * 22) * 0.0018;
      y += partRidge + combGrooves + 0.003;
    }

    // High, realistic masculine hairline leaving forehead & scar completely clear
    if (z > 0.0) {
      const frontNorm = Math.min(1, z / 0.102);
      const templeDip = Math.exp(-Math.pow((Math.abs(x) - 0.072) / 0.026, 2)) * 0.016;
      const minFrontY = 0.060 * frontNorm - templeDip * 0.42;
      if (y < minFrontY) {
        y = minFrontY + (y - minFrontY) * 0.10;
        z *= 0.96;
      }
    }

    if (z < -0.02) {
      y -= (-z - 0.02) * 0.36;
    }
    if (Math.abs(x) > 0.076 && y < 0.045) {
      x *= 0.96;
    }

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Phase 4 Redesigned Realistic Human Male Soldier Protagonist (1.84m).
 * Matches Reference #1: scarred adult male face, stubble, swept dark hair,
 * athletic proportions, olive-drab "FORCE" plate carrier with pouches & battle wear,
 * dark ripstop ballistic sleeves, articulated gloved hands, dual switchable weapons,
 * full responsive animation suite, and collision-safe adjustable 3rd-person camera.
 */
export function buildPlayerController(
  mats: WorldMaterialLibrary,
  onFootstep?: (sprinting: boolean) => void,
): PlayerController {
  const root = new THREE.Group();
  root.name = 'Player_KaelVoss';

  const geos: THREE.BufferGeometry[] = [];
  const localMats: THREE.Material[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    localMats.push(m);
    return m;
  };

  // Ground contact shadow
  const shadowDisc = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1.45, 1.45)),
    mats.contactShadowMat,
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.03;
  root.add(shadowDisc);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // =========================================================================
  // 1. PELVIS, TACTICAL DUTY BELT & ATHLETIC LEGS
  // =========================================================================
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.96, 0);
  bodyPivot.add(pelvis);

  // Sculpted pelvic hip core in dark combat trousers fabric
  const pelvisCore = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.155, 0.145, 0.19, 14)),
    mats.soldierFabric,
  );
  pelvisCore.scale.set(1.12, 1.0, 0.78);
  pelvisCore.castShadow = true;
  pelvis.add(pelvisCore);

  // Heavy tactical duty belt + matte buckle + hip magazine / utility pouches (Ref #1)
  const dutyBelt = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.168, 0.168, 0.062, 16)),
    mats.soldierBootRubber,
  );
  dutyBelt.scale.set(1.13, 1.0, 0.8);
  dutyBelt.position.y = 0.055;
  pelvis.add(dutyBelt);

  const beltBuckle = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.072, 0.058, 0.028)),
    mats.weaponGunmetal,
  );
  beltBuckle.position.set(0, 0.055, 0.132);
  pelvis.add(beltBuckle);

  for (const side of [-1, 1]) {
    const hipPouch = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.085, 0.125, 0.11)),
      mats.soldierArmorOlive,
    );
    hipPouch.position.set(side * 0.175, 0.015, 0.05);
    hipPouch.rotation.y = side * 0.28;
    hipPouch.castShadow = true;
    pelvis.add(hipPouch);

    const hipFlap = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.088, 0.042, 0.115)),
      mats.soldierArmorOlive,
    );
    hipFlap.position.set(side * 0.175, 0.065, 0.054);
    hipFlap.rotation.y = side * 0.28;
    pelvis.add(hipFlap);
  }

  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.106, -0.055, 0);
    pelvis.add(hip);

    // Muscular sculpted thigh (Lathe profile)
    const thighProfile = [
      new THREE.Vector2(0.084, 0.0),
      new THREE.Vector2(0.092, -0.1),
      new THREE.Vector2(0.084, -0.25),
      new THREE.Vector2(0.068, -0.44),
    ];
    const thigh = new THREE.Mesh(
      track(new THREE.LatheGeometry(thighProfile, 14)),
      mats.soldierFabric,
    );
    thigh.scale.set(0.95, 1.0, 1.05);
    thigh.castShadow = true;
    hip.add(thigh);

    // Drop-leg tactical holster / cargo pouch strapped to outer thigh
    const thighRig = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.075, 0.18, 0.12)),
      mats.soldierArmorOlive,
    );
    thighRig.position.set(side * 0.078, -0.2, 0.01);
    thighRig.castShadow = true;
    hip.add(thighRig);

    const thighStrap = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.078, 0.009, 6, 16)),
      mats.soldierBootRubber,
    );
    thighStrap.rotation.x = Math.PI / 2;
    thighStrap.scale.set(0.98, 1.08, 1.0);
    thighStrap.position.y = -0.21;
    hip.add(thighStrap);

    const knee = new THREE.Group();
    knee.position.set(0, -0.44, 0);
    hip.add(knee);

    // Sculpted ballistic knee pad
    const kneePad = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.066, 12, 10)),
      mats.soldierArmorOlive,
    );
    kneePad.scale.set(0.92, 1.15, 0.56);
    kneePad.position.set(0, 0.0, 0.062);
    knee.add(kneePad);

    // Muscular calf / combat pant lower leg
    const calfProfile = [
      new THREE.Vector2(0.067, 0.0),
      new THREE.Vector2(0.076, -0.12),
      new THREE.Vector2(0.062, -0.28),
      new THREE.Vector2(0.056, -0.39),
    ];
    const shin = new THREE.Mesh(
      track(new THREE.LatheGeometry(calfProfile, 14)),
      mats.soldierFabric,
    );
    shin.castShadow = true;
    knee.add(shin);

    // Heavy tactical combat boot (upper + reinforced toe cap + lug sole)
    const bootUpper = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.062, 0.058, 0.14, 12)),
      mats.soldierBootRubber,
    );
    bootUpper.position.set(0, -0.35, 0.005);
    knee.add(bootUpper);

    const bootFoot = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.106, 0.082, 0.245)),
      mats.soldierBootRubber,
    );
    bootFoot.position.set(0, -0.425, 0.052);
    bootFoot.castShadow = true;
    knee.add(bootFoot);

    const bootToe = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.054, 10, 8)),
      mats.soldierBootRubber,
    );
    bootToe.scale.set(1.0, 0.72, 1.18);
    bootToe.position.set(0, -0.43, 0.155);
    knee.add(bootToe);

    return { hip, knee };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // =========================================================================
  // 2. ATHLETIC TORSO & OLIVE-DRAB "FORCE" PLATE CARRIER (Ref #1)
  // =========================================================================
  const torso = new THREE.Group();
  torso.position.set(0, 0.09, 0);
  pelvis.add(torso);

  // Sculpted broad-shouldered human torso under-suit (Lathe athletic V-taper)
  const torsoProfile = [
    new THREE.Vector2(0.152, 0.0),
    new THREE.Vector2(0.164, 0.12),
    new THREE.Vector2(0.198, 0.28),
    new THREE.Vector2(0.222, 0.42),
    new THREE.Vector2(0.194, 0.475),
    new THREE.Vector2(0.112, 0.515),
  ];
  const torsoUnder = new THREE.Mesh(
    track(new THREE.LatheGeometry(torsoProfile, 18)),
    mats.soldierFabric,
  );
  torsoUnder.scale.set(1.12, 1.0, 0.74);
  torsoUnder.castShadow = true;
  torso.add(torsoUnder);

  // High tactical mock-collar framing the muscular neck (Ref #1)
  const collar = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.086, 0.108, 0.072, 16)),
    mats.soldierFabric,
  );
  collar.position.set(0, 0.512, 0.005);
  torso.add(collar);

  // Beveled olive-drab "FORCE" Front Ballistic Plate Carrier (front face maps crisp FORCE texture!)
  const vestMaterials: THREE.Material[] = [
    mats.soldierArmorOlive, // +x
    mats.soldierArmorOlive, // -x
    mats.soldierArmorOlive, // +y
    mats.soldierArmorOlive, // -y
    mats.soldierPlateCarrier, // +z FRONT ("FORCE" + crest + MOLLE!)
    mats.soldierArmorOlive, // -z
  ];
  const frontCarrier = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.32, 0.36, 0.068)),
    vestMaterials,
  );
  frontCarrier.position.set(0, 0.275, 0.142);
  frontCarrier.rotation.x = -0.05;
  frontCarrier.castShadow = true;
  torso.add(frontCarrier);

  // 3 front tactical rifle magazine pouches along lower abdomen of vest
  for (let m = -1; m <= 1; m++) {
    const magPouch = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.078, 0.115, 0.056)),
      mats.soldierArmorOlive,
    );
    magPouch.position.set(m * 0.088, 0.145, 0.195);
    magPouch.castShadow = true;
    torso.add(magPouch);

    const latch = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.026, 0.05, 0.015)),
      mats.soldierBootRubber,
    );
    latch.position.set(m * 0.088, 0.162, 0.226);
    torso.add(latch);
  }

  // Heavy padded shoulder harness straps arching over clavicles (Ref #1)
  for (const side of [-1, 1]) {
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.12, 0.43, 0.145),
      new THREE.Vector3(side * 0.135, 0.505, 0.045),
      new THREE.Vector3(side * 0.132, 0.495, -0.065),
      new THREE.Vector3(side * 0.115, 0.41, -0.145),
    ]);
    const strap = new THREE.Mesh(
      track(new THREE.TubeGeometry(strapCurve, 12, 0.028, 8, false)),
      mats.soldierArmorOlive,
    );
    strap.scale.set(1.25, 0.65, 1.0);
    strap.castShadow = true;
    torso.add(strap);

    // Side cummerbund retention straps
    const sideStrap = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.036, 0.14, 0.24)),
      mats.soldierArmorOlive,
    );
    sideStrap.position.set(side * 0.19, 0.18, 0.0);
    torso.add(sideStrap);
  }

  // Rear armored backplate + compact tactical field pack (clean athletic over-the-shoulder silhouette)
  const backCarrier = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.3, 0.35, 0.068)),
    mats.soldierArmorOlive,
  );
  backCarrier.position.set(0, 0.28, -0.138);
  backCarrier.castShadow = true;
  torso.add(backCarrier);

  const tacPack = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.22, 0.28, 0.11)),
    mats.soldierFabric,
  );
  tacPack.position.set(0, 0.29, -0.205);
  tacPack.castShadow = true;
  torso.add(tacPack);

  const packStrap = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.23, 0.04, 0.118)),
    mats.soldierArmorOlive,
  );
  packStrap.position.set(0, 0.24, -0.205);
  torso.add(packStrap);

  // Subtle tactical IFF beacon bar + whip comms antenna on rear pack
  const iffStrip = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.11, 0.018, 0.016)),
    mats.cityCyanAccent,
  );
  iffStrip.position.set(0, 0.385, -0.264);
  torso.add(iffStrip);

  const radioAntenna = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.004, 0.007, 0.34, 6)),
    mats.weaponGunmetal,
  );
  radioAntenna.position.set(-0.088, 0.56, -0.185);
  radioAntenna.rotation.z = 0.08;
  torso.add(radioAntenna);

  // =========================================================================
  // 3. REALISTIC SCULPTED ADULT MALE HEAD, BALLISTIC COLLAR & SEALED HELMET
  // =========================================================================
  const head = new THREE.Group();
  head.position.set(0, 0.515, 0.012);
  torso.add(head);

  // Armored tactical collar / gorget bridging shoulders cleanly into neck
  const tacticalCollar = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.088, 0.118, 0.068, 16)),
    mats.soldierArmorOlive,
  );
  tacticalCollar.position.set(0, 0.006, 0.0);
  tacticalCollar.castShadow = true;
  head.add(tacticalCollar);

  // Proportional muscular neck seated into tactical collar
  const neckProfile = [
    new THREE.Vector2(0.074, 0.005),
    new THREE.Vector2(0.067, 0.042),
    new THREE.Vector2(0.064, 0.076),
    new THREE.Vector2(0.067, 0.095),
  ];
  const neck = new THREE.Mesh(
    track(new THREE.LatheGeometry(neckProfile, 16)),
    mats.soldierNeckSkin,
  );
  neck.castShadow = true;
  head.add(neck);

  // Bare face assembly (hidden when sealed tactical combat helmet is engaged so zero clipping occurs)
  const bareFaceGroup = new THREE.Group();
  bareFaceGroup.name = 'KaelVoss_BareFace';
  head.add(bareFaceGroup);

  const skullMesh = new THREE.Mesh(
    track(buildSculptedMaleHeadGeometry()),
    mats.soldierSkin,
  );
  skullMesh.position.set(0, 0.145, 0.014);
  skullMesh.castShadow = true;
  bareFaceGroup.add(skullMesh);

  // Deep-set realistic adult male 3D eyeballs seated inside orbital sockets
  const scleraMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xddd2c8, roughness: 0.26, metalness: 0.02 }),
  );
  const irisMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x423020, roughness: 0.18, metalness: 0.06 }),
  );
  const pupilMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x0b0908, roughness: 0.12, metalness: 0.08 }),
  );
  for (const side of [-1, 1]) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.032, 0.151, 0.098);
    const sclera = new THREE.Mesh(track(new THREE.SphereGeometry(0.0102, 12, 10)), scleraMat);
    sclera.scale.set(1.12, 0.56, 0.62);
    eyeGroup.add(sclera);

    const iris = new THREE.Mesh(track(new THREE.SphereGeometry(0.0058, 10, 8)), irisMat);
    iris.scale.set(1.0, 0.92, 0.45);
    iris.position.set(0, 0, 0.0056);
    eyeGroup.add(iris);

    const pupil = new THREE.Mesh(track(new THREE.SphereGeometry(0.0031, 8, 6)), pupilMat);
    pupil.scale.set(1.0, 1.0, 0.4);
    pupil.position.set(0, 0, 0.0078);
    eyeGroup.add(pupil);
    bareFaceGroup.add(eyeGroup);
  }

  // Outer ears + tactical radio earpiece
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.019, 0.008, 8, 12, Math.PI * 1.4)),
      mats.soldierNeckSkin,
    );
    ear.position.set(side * 0.095, 0.138, 0.006);
    ear.rotation.y = side * (Math.PI * 0.42);
    ear.rotation.z = side * -0.25;
    ear.scale.set(0.68, 1.28, 0.72);
    bareFaceGroup.add(ear);
  }

  const earComms = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.014, 0.025, 0.02)),
    mats.weaponGunmetal,
  );
  earComms.position.set(0.103, 0.135, 0.014);
  bareFaceGroup.add(earComms);

  // Close-cropped military side-part dark hair crown
  const hairCrown = new THREE.Mesh(
    track(buildSweptHairGeometry()),
    mats.soldierHair,
  );
  hairCrown.position.set(0, 0.153, 0.010);
  hairCrown.castShadow = true;
  bareFaceGroup.add(hairCrown);

  // =========================================================================
  // 3B. REMOVABLE / TOGGLEABLE SEALED SPECIAL-OPS TACTICAL HELMET ([H])
  // =========================================================================
  const helmetGroup = new THREE.Group();
  helmetGroup.name = 'KaelVoss_TacticalHelmet';
  helmetGroup.position.set(0, 0.148, 0.014);
  helmetGroup.visible = false;
  head.add(helmetGroup);

  // Ballistic dark under-hood / neck seal (zero exposed pale skin when sealed)
  const helmetNeckSeal = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.082, 0.090, 0.115, 16)),
    mats.soldierFabric,
  );
  helmetNeckSeal.position.set(0, -0.095, -0.004);
  helmetGroup.add(helmetNeckSeal);

  // Inner matte dark helmet core
  const helmetInnerCore = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.120, 20, 16)),
    mats.weaponGunmetal,
  );
  helmetInnerCore.scale.set(0.95, 1.06, 1.08);
  helmetInnerCore.position.set(0, 0.002, 0.0);
  helmetGroup.add(helmetInnerCore);

  // Angular dark-graphite composite ballistic dome (stops cleanly at brow line above visor)
  const helmetDome = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.134, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.54)),
    mats.soldierArmorOlive,
  );
  helmetDome.scale.set(0.98, 1.08, 1.13);
  helmetDome.position.set(0, 0.018, -0.004);
  helmetDome.castShadow = true;
  helmetGroup.add(helmetDome);

  // Sloped angular brow visor hood & Vanguard-07 rust-bronze center crest
  const helmetBrow = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.205, 0.032, 0.105)),
    mats.soldierArmorOlive,
  );
  helmetBrow.position.set(0, 0.064, 0.086);
  helmetBrow.rotation.x = 0.24;
  helmetGroup.add(helmetBrow);

  const helmetCrest = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.034, 0.022, 0.215)),
    mats.kaelTrimAccent,
  );
  helmetCrest.position.set(0, 0.148, -0.008);
  helmetGroup.add(helmetCrest);

  // Wide sweeping polarized dark-amber/gold tactical visor spanning cleanly across front
  const helmetVisor = new THREE.Mesh(
    track(
      new THREE.CylinderGeometry(
        0.132,
        0.124,
        0.078,
        24,
        1,
        true,
        -Math.PI * 0.42,
        Math.PI * 0.84,
      ),
    ),
    mats.kaelHelmetVisor,
  );
  helmetVisor.position.set(0, 0.012, 0.024);
  helmetGroup.add(helmetVisor);

  // Angled side ballistic cheek plates
  for (const side of [-1, 1]) {
    const cheekPlate = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.055, 0.095, 0.145)),
      mats.soldierArmorOlive,
    );
    cheekPlate.position.set(side * 0.096, -0.042, 0.036);
    cheekPlate.rotation.y = side * -0.26;
    cheekPlate.rotation.z = side * 0.14;
    helmetGroup.add(cheekPlate);
  }

  // Sealed angular ballistic respirator / chin guard
  const helmetJaw = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.156, 0.082, 0.115)),
    mats.soldierArmorOlive,
  );
  helmetJaw.position.set(0, -0.064, 0.082);
  helmetJaw.rotation.x = -0.18;
  helmetGroup.add(helmetJaw);

  const jawVent = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.072, 0.028, 0.026)),
    mats.kaelTrimAccent,
  );
  jawVent.position.set(0, -0.068, 0.138);
  helmetGroup.add(jawVent);

  // Side rail comms pods & tactical whip antenna
  for (const side of [-1, 1]) {
    const earPod = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.036, 0.036, 0.034, 12)),
      mats.weaponGunmetal,
    );
    earPod.rotation.z = Math.PI / 2;
    earPod.position.set(side * 0.128, 0.002, -0.004);
    helmetGroup.add(earPod);
  }
  const helmetAntenna = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.004, 0.006, 0.15, 6)),
    mats.weaponGunmetal,
  );
  helmetAntenna.position.set(-0.136, 0.094, -0.018);
  helmetAntenna.rotation.z = 0.12;
  helmetGroup.add(helmetAntenna);

  // =========================================================================
  // 4. MUSCULAR ARMS, ASYMMETRIC GRAPHITE SPECIAL-OPS PAULDRONS & GLOVED HANDS
  // =========================================================================
  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.204, 0.422, 0.0);
    torso.add(shoulder);

    // Solid muscular dark ballistic deltoid joint sphere — bridges torso & upper arm with ZERO air gap!
    const deltoidCore = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.084, 14, 12)),
      mats.soldierFabric,
    );
    deltoidCore.scale.set(1.05, 1.0, 0.96);
    deltoidCore.position.set(side * 0.01, -0.012, 0);
    deltoidCore.castShadow = true;
    shoulder.add(deltoidCore);

    // Signature Asymmetric Pauldron: heavier reinforced left combat shield pauldron (side === -1)
    // vs sleek agile right aiming shoulder (side === 1)
    const isHeavyLeft = side === -1;
    const pauldron = new THREE.Mesh(
      track(new THREE.SphereGeometry(isHeavyLeft ? 0.104 : 0.088, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58)),
      mats.soldierArmorOlive,
    );
    pauldron.scale.set(isHeavyLeft ? 1.1 : 1.02, isHeavyLeft ? 1.04 : 0.92, isHeavyLeft ? 1.12 : 1.02);
    pauldron.position.set(side * 0.02, isHeavyLeft ? 0.008 : -0.004, 0);
    pauldron.rotation.z = side * (isHeavyLeft ? -0.58 : -0.66);
    pauldron.castShadow = true;
    shoulder.add(pauldron);

    if (isHeavyLeft) {
      // Secondary layered trauma guard + Vanguard-07 rust-bronze insignia stripe on left shoulder
      const pauldronTrim = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.022, 0.068, 0.115)),
        mats.kaelTrimAccent,
      );
      pauldronTrim.position.set(-0.094, -0.032, 0.005);
      pauldronTrim.rotation.z = 0.24;
      shoulder.add(pauldronTrim);
    }

    // Muscular upper arm sleeve (dark ballistic fabric) overlapping cleanly into deltoid
    const upperProfile = [
      new THREE.Vector2(0.074, 0.015),
      new THREE.Vector2(0.072, -0.1),
      new THREE.Vector2(0.062, -0.22),
      new THREE.Vector2(0.055, -0.295),
    ];
    const upperArm = new THREE.Mesh(
      track(new THREE.LatheGeometry(upperProfile, 14)),
      mats.soldierFabric,
    );
    upperArm.position.x = side * 0.012;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    // Upper sleeve tactical Velcro pocket patch (Ref #1)
    const sleevePocket = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.022, 0.095, 0.072)),
      mats.soldierArmorOlive,
    );
    sleevePocket.position.set(side * 0.078, -0.145, 0);
    shoulder.add(sleevePocket);

    const elbow = new THREE.Group();
    elbow.position.set(side * 0.012, -0.29, 0);
    shoulder.add(elbow);

    // Seamless elbow joint bridge
    const elbowJoint = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.055, 10, 8)),
      mats.soldierFabric,
    );
    elbow.add(elbowJoint);

    // Forearm + sculpted olive-drab armored vambrace
    const forearm = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.052, 0.04, 0.26, 12)),
      mats.soldierFabric,
    );
    forearm.position.y = -0.13;
    forearm.castShadow = true;
    elbow.add(forearm);

    const bracer = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.058, 0.046, 0.16, 10, 1, false, -Math.PI * 0.65, Math.PI * 1.3)),
      mats.soldierArmorOlive,
    );
    bracer.position.y = -0.14;
    bracer.rotation.y = side * (Math.PI * 0.5);
    elbow.add(bracer);

    // Articulated gloved tactical hand (palm + thumb + curled fingers)
    const hand = new THREE.Group();
    hand.position.set(0, -0.27, 0.01);
    elbow.add(hand);

    const palm = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.058, 0.078, 0.036)),
      mats.soldierBootRubber,
    );
    hand.add(palm);

    const knuckleGuard = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.06, 0.022, 0.02)),
      mats.soldierArmorOlive,
    );
    knuckleGuard.position.set(0, -0.024, 0.02);
    hand.add(knuckleGuard);

    const thumb = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.01, 0.032, 4, 6)),
      mats.soldierBootRubber,
    );
    thumb.position.set(-side * 0.032, -0.015, 0.022);
    thumb.rotation.set(0.55, 0, side * 0.5);
    hand.add(thumb);

    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(
        track(new THREE.CapsuleGeometry(0.0085, 0.036, 4, 6)),
        mats.soldierBootRubber,
      );
      finger.position.set(-0.02 + f * 0.0135, -0.05, 0.022);
      finger.rotation.x = 0.85;
      hand.add(finger);
    }

    return { shoulder, elbow, hand };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // =========================================================================
  // 5. DUAL SWITCHABLE WEAPONS ([1] M41-A PULSE CARBINE & [2] M90-X RAIL SHOTGUN)
  // =========================================================================
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.165, 0.31, 0.35);
  torso.add(weaponPivot);

  // --- Weapon 1: M41-A Pulse Carbine ---
  const carbineGroup = new THREE.Group();
  weaponPivot.add(carbineGroup);

  const receiver = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.066, 0.108, 0.56)),
    mats.weaponGunmetal,
  );
  receiver.castShadow = true;
  carbineGroup.add(receiver);

  const stock = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.052, 0.11, 0.22)),
    mats.soldierBootRubber,
  );
  stock.position.set(0, -0.015, -0.34);
  carbineGroup.add(stock);

  const grip = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.042, 0.12, 0.056)),
    mats.soldierBootRubber,
  );
  grip.position.set(0, -0.095, -0.14);
  grip.rotation.x = -0.32;
  carbineGroup.add(grip);

  const upperRail = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.044, 0.032, 0.44)),
    mats.cityTrimSteel,
  );
  upperRail.position.set(0, 0.068, 0.04);
  carbineGroup.add(upperRail);

  const optic = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.044, 0.052, 0.12)),
    mats.weaponGunmetal,
  );
  optic.position.set(0, 0.105, -0.03);
  carbineGroup.add(optic);

  const barrel = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.016, 0.02, 0.34, 10)),
    mats.cityTrimSteel,
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.018, 0.42);
  carbineGroup.add(barrel);

  const magazine = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.042, 0.18, 0.082)),
    mats.soldierArmorOlive,
  );
  magazine.position.set(0, -0.12, 0.09);
  magazine.rotation.x = 0.22;
  carbineGroup.add(magazine);

  const ammoStrip = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.072, 0.018, 0.085)),
    mats.cityCyanAccent,
  );
  ammoStrip.position.set(0, 0.02, -0.14);
  carbineGroup.add(ammoStrip);

  // --- Weapon 2: M90-X Heavy Plasma Rail Shotgun ---
  const shotgunGroup = new THREE.Group();
  shotgunGroup.visible = false;
  weaponPivot.add(shotgunGroup);

  const sgBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.088, 0.132, 0.58)),
    mats.weaponGunmetal,
  );
  sgBody.castShadow = true;
  shotgunGroup.add(sgBody);

  const sgStock = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.062, 0.12, 0.24)),
    mats.soldierArmorOlive,
  );
  sgStock.position.set(0, -0.015, -0.35);
  shotgunGroup.add(sgStock);

  for (const s of [-1, 1]) {
    const railCoil = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.022, 0.042, 0.44)),
      mats.cityAmberAccent,
    );
    railCoil.position.set(s * 0.048, 0.02, 0.24);
    shotgunGroup.add(railCoil);
  }

  const sgBarrelTop = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.022, 0.024, 0.44, 10)),
    mats.cityTrimSteel,
  );
  sgBarrelTop.rotation.x = Math.PI / 2;
  sgBarrelTop.position.set(0, 0.032, 0.36);
  shotgunGroup.add(sgBarrelTop);

  const sgBarrelBot = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.02, 0.02, 0.38, 10)),
    mats.weaponGunmetal,
  );
  sgBarrelBot.rotation.x = Math.PI / 2;
  sgBarrelBot.position.set(0, -0.024, 0.32);
  shotgunGroup.add(sgBarrelBot);

  // --- Weapon 3: M77-S Precision Marksman Rail DMR ---
  const marksmanGroup = new THREE.Group();
  marksmanGroup.visible = false;
  weaponPivot.add(marksmanGroup);

  const dmrBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.058, 0.098, 0.68)),
    mats.weaponGunmetal,
  );
  dmrBody.castShadow = true;
  marksmanGroup.add(dmrBody);

  const dmrBarrel = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.014, 0.018, 0.56, 10)),
    mats.cityTrimSteel,
  );
  dmrBarrel.rotation.x = Math.PI / 2;
  dmrBarrel.position.set(0, 0.02, 0.58);
  marksmanGroup.add(dmrBarrel);

  const dmrScope = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.024, 0.022, 0.24, 10)),
    mats.soldierArmorOlive,
  );
  dmrScope.rotation.x = Math.PI / 2;
  dmrScope.position.set(0, 0.098, -0.02);
  marksmanGroup.add(dmrScope);

  const dmrAccent = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.064, 0.014, 0.28)),
    mats.kaelTrimAccent,
  );
  dmrAccent.position.set(0, 0.02, 0.14);
  marksmanGroup.add(dmrAccent);

  const muzzleNode = new THREE.Object3D();
  muzzleNode.position.set(0, 0.02, 0.62);
  weaponPivot.add(muzzleNode);

  const muzzleFlashMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffd78a,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const muzzleFlashMesh = new THREE.Mesh(
    track(new THREE.OctahedronGeometry(0.15, 0)),
    muzzleFlashMat,
  );
  muzzleFlashMesh.scale.set(0.75, 0.75, 2.3);
  muzzleFlashMesh.visible = false;
  muzzleNode.add(muzzleFlashMesh);

  const muzzleFlashLight = new THREE.PointLight(0xffbe68, 0, 14, 2);
  muzzleNode.add(muzzleFlashLight);

  // =========================================================================
  // 6. PHYSICS, KNOCKBACK, WEAPON SWITCH & CAMERA STATE
  // =========================================================================
  const pos = new THREE.Vector3(
    PLAYER_START_POS[0],
    getTerrainHeight(PLAYER_START_POS[0], PLAYER_START_POS[2]),
    PLAYER_START_POS[2],
  );
  root.position.copy(pos);

  let velY = 0;
  let knockVelX = 0;
  let knockVelZ = 0;
  let grounded = true;
  let landingSquash = 0;
  let camYaw = PLAYER_START_YAW;
  let camPitch = -0.09;
  let actorYaw = PLAYER_START_YAW + Math.PI;
  let shoulderTarget = 1;
  let shoulderCurrent = 1;
  let cameraDistance = 3.85;
  let activeWeapon: PlayerWeaponId = 'carbine';
  let weaponSwitchTimer = 0;
  let isAiming = false;
  let aimBlend = 0;
  let crouchBlend = 0;
  let strafeLean = 0;
  let recoilKick = 0;
  let reloadTimer = 0;
  let reloadDuration = 1.5;
  let hitReaction = 0;
  let walkCycle = 0;
  let stepAccumulator = 0;
  let currentSpeed = 0;
  let currentStance: PlayerStance = 'standing';
  let posePreview: ProtagonistPosePreview = 'live';
  let helmetEquipped = false;
  let speedMultiplier = 1.0;
  let meleeTimer = 0;
  let dodgeTimer = 0;
  let dodgeCooldown = 0;
  let dodgeDirX = 0;
  let dodgeDirZ = 0;

  const keys = new Set<string>();
  const moveDir = new THREE.Vector3();
  const forwardVec = new THREE.Vector3();
  const rightVec = new THREE.Vector3();
  const pivotPos = new THREE.Vector3();
  const desiredCamPos = new THREE.Vector3();
  const camLookAt = new THREE.Vector3();
  const samplePt = new THREE.Vector3();

  const setHelmetEquipped = (equipped: boolean) => {
    helmetEquipped = equipped;
    helmetGroup.visible = equipped;
    bareFaceGroup.visible = !equipped;
    neck.visible = !equipped;
  };

  const triggerMelee = (): boolean => {
    if (meleeTimer > 0) return false;
    meleeTimer = 0.44;
    return true;
  };

  const triggerDodge = (): boolean => {
    if (dodgeTimer > 0 || dodgeCooldown > 0 || !grounded) return false;
    dodgeTimer = 0.42;
    dodgeCooldown = 1.15;
    if (moveDir.lengthSq() > 0.01) {
      dodgeDirX = moveDir.x;
      dodgeDirZ = moveDir.z;
    } else {
      dodgeDirX = Math.cos(camYaw);
      dodgeDirZ = -Math.sin(camYaw);
    }
    return true;
  };

  const teleport = (targetPos: [number, number, number], yaw?: number) => {
    const gy = getTerrainHeight(targetPos[0], targetPos[2]);
    pos.set(targetPos[0], gy, targetPos[2]);
    velY = 0;
    knockVelX = 0;
    knockVelZ = 0;
    dodgeTimer = 0;
    grounded = true;
    if (typeof yaw === 'number') {
      camYaw = yaw;
      actorYaw = yaw + Math.PI;
    }
    camPitch = -0.06;
    root.position.copy(pos);
    root.rotation.y = actorYaw;
  };

  const setMoveKey = (code: string, down: boolean) => {
    if (down) {
      keys.add(code);
      if (code === 'Space' && grounded) {
        velY = 8.1;
        grounded = false;
      }
    } else {
      keys.delete(code);
    }
  };

  const setWeapon = (weapon: PlayerWeaponId) => {
    if (weapon === activeWeapon) return;
    activeWeapon = weapon;
    carbineGroup.visible = weapon === 'carbine';
    shotgunGroup.visible = weapon === 'shotgun';
    marksmanGroup.visible = weapon === 'marksman';
    muzzleFlashMat.color.setHex(
      weapon === 'shotgun' ? 0xffae52 : weapon === 'marksman' ? 0x7beeff : 0xffd78a,
    );
    weaponSwitchTimer = 0.42;
  };

  const applyLookDelta = (dx: number, dy: number, settings: PlayerControlSettings) => {
    const sens = isAiming ? settings.aimSensitivity : settings.cameraSensitivity;
    const baseRate = 0.00235 * sens;
    camYaw -= dx * baseRate;
    const ySign = settings.invertY ? 1 : -1;
    camPitch = THREE.MathUtils.clamp(camPitch + dy * baseRate * ySign, -0.95, 1.08);
  };

  const update = (
    dt: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera,
    colliders: readonly WorldCollider[],
    active: boolean,
    isDead: boolean,
  ) => {
    const safeDt = Math.min(dt, 0.05);

    if (active && !isDead) {
      const wantsCrouch = keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC');
      const wantsSprint =
        (keys.has('ShiftLeft') || keys.has('ShiftRight')) && !isAiming && !wantsCrouch;

      crouchBlend += ((wantsCrouch ? 1 : 0) - crouchBlend) * Math.min(1, safeDt * 10);
      aimBlend += ((isAiming ? 1 : 0) - aimBlend) * Math.min(1, safeDt * 12);
      shoulderCurrent += (shoulderTarget - shoulderCurrent) * Math.min(1, safeDt * 9);

      const fwdIn =
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const strafeIn =
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);

      strafeLean += (strafeIn * -0.09 - strafeLean) * Math.min(1, safeDt * 10);

      forwardVec.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      rightVec.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
      moveDir.set(0, 0, 0);
      moveDir.addScaledVector(forwardVec, fwdIn);
      moveDir.addScaledVector(rightVec, strafeIn);

      const hasInput = moveDir.lengthSq() > 0.001;
      if (hasInput) {
        moveDir.normalize();
      }

      const maxSpeed =
        (isAiming
          ? 3.55
          : wantsCrouch
          ? 3.25
          : wantsSprint
          ? 12.1
          : 6.7) * speedMultiplier;

      const targetSpeed = hasInput ? maxSpeed : 0;
      currentSpeed += (targetSpeed - currentSpeed) * Math.min(1, safeDt * 12);

      if (dodgeTimer > 0) {
        pos.x += dodgeDirX * 15.2 * safeDt;
        pos.z += dodgeDirZ * 15.2 * safeDt;
      } else if (hasInput && currentSpeed > 0.05) {
        pos.x += moveDir.x * currentSpeed * safeDt;
        pos.z += moveDir.z * currentSpeed * safeDt;
      }

      // Apply external knockback stagger velocity and damp cleanly
      if (Math.abs(knockVelX) > 0.05 || Math.abs(knockVelZ) > 0.05) {
        pos.x += knockVelX * safeDt;
        pos.z += knockVelZ * safeDt;
        const kDamp = Math.exp(-6.5 * safeDt);
        knockVelX *= kDamp;
        knockVelZ *= kDamp;
      }

      const limit = WORLD_PLAYABLE_HALF - 90;
      pos.x = THREE.MathUtils.clamp(pos.x, -limit, limit);
      pos.z = THREE.MathUtils.clamp(pos.z, -limit, limit);

      const resolved = resolveHorizontalColliders(
        pos.x,
        pos.y,
        pos.z,
        0.58,
        1.84 - crouchBlend * 0.48,
        colliders,
      );
      pos.x = resolved.x;
      pos.z = resolved.z;

      const wasGrounded = grounded;
      velY -= 21.5 * safeDt;
      pos.y += velY * safeDt;
      const terrainY = getTerrainHeight(pos.x, pos.z);
      if (pos.y <= terrainY) {
        if (!wasGrounded && velY < -3.5) {
          landingSquash = Math.min(0.22, Math.abs(velY) * 0.022);
        }
        pos.y = terrainY;
        velY = 0;
        grounded = true;
      } else if (pos.y - terrainY < 0.25 && velY <= 0) {
        pos.y = terrainY;
        velY = 0;
        grounded = true;
      } else {
        grounded = false;
      }

      const targetActorYaw =
        isAiming || recoilKick > 0.02
          ? camYaw + Math.PI
          : hasInput
          ? Math.atan2(moveDir.x, moveDir.z)
          : actorYaw;

      let yawDiff = targetActorYaw - actorYaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      actorYaw += yawDiff * Math.min(1, safeDt * (isAiming ? 18 : 11));

      currentStance = dodgeTimer > 0
        ? 'dodging'
        : !grounded
        ? 'airborne'
        : isAiming
        ? 'aiming'
        : wantsCrouch
        ? 'crouching'
        : wantsSprint && hasInput
        ? 'sprinting'
        : 'standing';

      if (grounded && currentSpeed > 1.2 && dodgeTimer <= 0) {
        const strideFreq = wantsSprint ? 11.8 : wantsCrouch ? 5.2 : 8.4;
        walkCycle += safeDt * strideFreq;
        stepAccumulator += safeDt * (wantsSprint ? 3.2 : 2.1);
        if (stepAccumulator >= 1.0) {
          stepAccumulator = 0;
          onFootstep?.(wantsSprint);
        }
      } else {
        stepAccumulator = 0.65;
      }
    }

    recoilKick = Math.max(0, recoilKick - safeDt * 6.5);
    hitReaction = Math.max(0, hitReaction - safeDt * 4.5);
    landingSquash = Math.max(0, landingSquash - safeDt * 1.4);
    if (reloadTimer > 0) reloadTimer = Math.max(0, reloadTimer - safeDt);
    if (weaponSwitchTimer > 0) weaponSwitchTimer = Math.max(0, weaponSwitchTimer - safeDt);
    if (meleeTimer > 0) meleeTimer = Math.max(0, meleeTimer - safeDt);
    if (dodgeTimer > 0) dodgeTimer = Math.max(0, dodgeTimer - safeDt);
    if (dodgeCooldown > 0) dodgeCooldown = Math.max(0, dodgeCooldown - safeDt);

    // =========================================================================
    // 7. NATURAL SKELETAL HUMAN ANIMATION BLENDING (+ Inspection Pose Overrides)
    // =========================================================================
    root.position.copy(pos);
    root.rotation.y = posePreview === 'idle_front' ? 1.12 : actorYaw;

    const effectiveCrouch =
      posePreview === 'crouching' ? 1 : posePreview === 'live' ? crouchBlend : 0;
    const effectiveAim =
      posePreview === 'aiming' ? 1 : posePreview === 'live' ? aimBlend : 0;
    const effectiveSprint =
      posePreview === 'sprinting' ? 1 : currentStance === 'sprinting' ? 1 : 0;
    const moveNorm =
      posePreview === 'sprinting' ? 1.0 : posePreview === 'live' ? Math.min(1, currentSpeed / 8.5) : 0;
    const cycleAngle = posePreview === 'sprinting' ? 0.85 : walkCycle;
    const swing = Math.sin(cycleAngle) * moveNorm;
    const bounce = Math.abs(Math.cos(cycleAngle)) * moveNorm * 0.048;
    const breathe = Math.sin(elapsed * 2.0) * 0.007;

    if (isDead) {
      bodyPivot.rotation.x += (-Math.PI * 0.47 - bodyPivot.rotation.x) * Math.min(1, safeDt * 6.5);
      bodyPivot.rotation.z += (0.24 - bodyPivot.rotation.z) * Math.min(1, safeDt * 6.5);
      bodyPivot.position.y += (0.16 - bodyPivot.position.y) * Math.min(1, safeDt * 6.5);
    } else {
      bodyPivot.rotation.x += (0 - bodyPivot.rotation.x) * Math.min(1, safeDt * 10);
      bodyPivot.rotation.z += (strafeLean - bodyPivot.rotation.z) * Math.min(1, safeDt * 10);
      bodyPivot.position.y = 0;

      pelvis.position.y =
        0.96 - effectiveCrouch * 0.34 - landingSquash * 0.45 + bounce + (grounded ? 0 : 0.08);
      pelvis.rotation.y = swing * 0.07;

      torso.rotation.x =
        0.05 +
        effectiveCrouch * 0.24 +
        effectiveSprint * 0.18 -
        recoilKick * 0.16 -
        hitReaction * 0.22;
      torso.rotation.y = effectiveAim * -0.18 + breathe;
      torso.rotation.z = hitReaction * 0.12;

      // Natural subtle head look/focus counter-rotation
      head.rotation.x = -torso.rotation.x * 0.55 + (active ? -camPitch * 0.32 : 0) + breathe * 1.4;
      head.rotation.y = effectiveAim * 0.16 + Math.sin(elapsed * 0.65) * (active ? 0.02 : 0.07);

      if (!grounded && posePreview === 'live') {
        leftLeg.hip.rotation.x = -0.58;
        leftLeg.knee.rotation.x = 0.88;
        rightLeg.hip.rotation.x = 0.28;
        rightLeg.knee.rotation.x = 0.46;
      } else {
        leftLeg.hip.rotation.x = swing * 0.66 - effectiveCrouch * 0.52 - landingSquash * 0.7;
        leftLeg.knee.rotation.x =
          Math.max(0, -swing) * 0.78 + effectiveCrouch * 0.96 + landingSquash * 1.1;
        rightLeg.hip.rotation.x = -swing * 0.66 - effectiveCrouch * 0.52 - landingSquash * 0.7;
        rightLeg.knee.rotation.x =
          Math.max(0, swing) * 0.78 + effectiveCrouch * 0.96 + landingSquash * 1.1;
      }

      const reloadDip =
        posePreview === 'reloading'
          ? 0.34
          : reloadTimer > 0
          ? Math.sin((reloadTimer / reloadDuration) * Math.PI) * 0.36
          : 0;
      const switchDip =
        weaponSwitchTimer > 0 ? Math.sin((weaponSwitchTimer / 0.42) * Math.PI) * 0.42 : 0;

      const dodgeActive = posePreview === 'dodge' || dodgeTimer > 0;
      const meleeSwing =
        posePreview === 'melee'
          ? 0.85
          : meleeTimer > 0
          ? Math.sin((meleeTimer / 0.44) * Math.PI)
          : 0;

      if (dodgeActive) {
        const rollAngle = posePreview === 'dodge' ? 0.85 : (1 - dodgeTimer / 0.42) * Math.PI * 1.35;
        bodyPivot.rotation.x = Math.sin(rollAngle) * 0.68;
        pelvis.position.y = 0.62;
      }

      if (posePreview === 'victory') {
        weaponPivot.position.set(0.22, 0.24, 0.3);
        weaponPivot.rotation.set(0.45, -0.45, 0.14);
        rightArm.shoulder.rotation.set(-0.52, 0, 0.12);
        rightArm.elbow.rotation.set(-0.72, 0, 0);
        leftArm.shoulder.rotation.set(-1.35, 0, -0.18);
        leftArm.elbow.rotation.set(-0.45, 0, 0);
      } else if (posePreview === 'idle_front') {
        weaponPivot.position.set(0.18, 0.2, 0.34);
        weaponPivot.rotation.set(0.32, -0.35, 0.1);
        rightArm.shoulder.rotation.set(-0.62, 0, 0.08);
        rightArm.elbow.rotation.set(-0.78, 0, 0);
        leftArm.shoulder.rotation.set(-0.72, 0, -0.32);
        leftArm.elbow.rotation.set(-0.88, 0, 0);
      } else {
        weaponPivot.position.set(
          0.165 - effectiveAim * 0.045 - meleeSwing * 0.22,
          0.31 + effectiveAim * 0.085 - (reloadDip + switchDip) * 0.24 + breathe + meleeSwing * 0.08,
          0.34 + effectiveAim * 0.065 - recoilKick * 0.095 + meleeSwing * 0.24,
        );
        weaponPivot.rotation.set(
          (active ? -camPitch * 0.48 : 0) - recoilKick * 0.22 + (reloadDip + switchDip) * 0.68,
          -0.08 + effectiveAim * 0.08 + meleeSwing * 1.15,
          (reloadDip + switchDip) * 0.38 - meleeSwing * 0.72,
        );

        rightArm.shoulder.rotation.set(
          -0.96 - effectiveAim * 0.26 - recoilKick * 0.16 + switchDip * 0.45 - meleeSwing * 0.45,
          meleeSwing * 0.5,
          0.05,
        );
        rightArm.elbow.rotation.set(-0.72 + meleeSwing * 0.28, 0, 0);
        leftArm.shoulder.rotation.set(
          -1.08 - effectiveAim * 0.22 + reloadDip * 0.58 + switchDip * 0.4 - meleeSwing * 0.35,
          0,
          -0.3,
        );
        leftArm.elbow.rotation.set(-0.84, 0, 0);
      }
    }

    // =========================================================================
    // 8. COLLISION-SAFE ADJUSTABLE OVER-THE-SHOULDER THIRD-PERSON CAMERA
    // =========================================================================
    if (active) {
      const targetFov = isAiming ? 43 : currentStance === 'sprinting' ? 63 : 57;
      camera.fov += (targetFov - camera.fov) * Math.min(1, safeDt * 11);
      camera.updateProjectionMatrix();

      const camDist = THREE.MathUtils.lerp(cameraDistance, Math.min(2.25, cameraDistance * 0.6), aimBlend);
      const shoulderOffset = THREE.MathUtils.lerp(0.84, 0.68, aimBlend) * shoulderCurrent;
      const heightOffset = 1.66 - crouchBlend * 0.42;

      pivotPos.set(pos.x, pos.y + heightOffset, pos.z);
      const cosP = Math.cos(camPitch);
      const sinP = Math.sin(camPitch);
      const lookDirX = -Math.sin(camYaw) * cosP;
      const lookDirY = sinP;
      const lookDirZ = -Math.cos(camYaw) * cosP;

      const rightX = Math.cos(camYaw);
      const rightZ = -Math.sin(camYaw);

      desiredCamPos.set(
        pivotPos.x - lookDirX * camDist + rightX * shoulderOffset,
        pivotPos.y - lookDirY * camDist + 0.16,
        pivotPos.z - lookDirZ * camDist + rightZ * shoulderOffset,
      );

      let safeFraction = 1.0;
      const steps = 8;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        samplePt.lerpVectors(pivotPos, desiredCamPos, t);
        const groundH = getTerrainHeight(samplePt.x, samplePt.z) + 0.52;
        if (samplePt.y < groundH) {
          desiredCamPos.y = Math.max(desiredCamPos.y, groundH);
        }
        let hitWall = false;
        for (let ci = 0; ci < colliders.length; ci++) {
          const c = colliders[ci];
          if (
            samplePt.x > c.minX - 0.35 &&
            samplePt.x < c.maxX + 0.35 &&
            samplePt.z > c.minZ - 0.35 &&
            samplePt.z < c.maxZ + 0.35 &&
            samplePt.y > c.minY &&
            samplePt.y < c.maxY
          ) {
            hitWall = true;
            break;
          }
        }
        if (hitWall) {
          safeFraction = Math.max(0.26, (s - 1) / steps);
          break;
        }
      }

      if (safeFraction < 1.0) {
        desiredCamPos.lerpVectors(pivotPos, desiredCamPos, safeFraction);
      }

      camera.position.lerp(desiredCamPos, Math.min(1, safeDt * 18));

      // Exact center-reticle convergence point so muzzle shots land cleanly on crosshair
      camLookAt.set(
        pivotPos.x + lookDirX * 92 + rightX * shoulderOffset * 0.42,
        pivotPos.y + lookDirY * 92 + recoilKick * 0.62,
        pivotPos.z + lookDirZ * 92 + rightZ * shoulderOffset * 0.42,
      );
      camera.lookAt(camLookAt);
    }
  };

  return {
    root,
    muzzleNode,
    muzzleFlashLight,
    muzzleFlashMesh,
    setMoveKey,
    setAiming: (aiming) => {
      isAiming = aiming;
    },
    toggleShoulder: () => {
      shoulderTarget = shoulderTarget > 0 ? -1 : 1;
    },
    setWeapon,
    getWeapon: () => activeWeapon,
    setHelmetEquipped,
    isHelmetEquipped: () => helmetEquipped,
    setSpeedMultiplier: (mult) => {
      speedMultiplier = THREE.MathUtils.clamp(mult, 0.75, 1.35);
    },
    triggerMelee,
    triggerDodge,
    adjustCameraDistance: (delta) => {
      cameraDistance = THREE.MathUtils.clamp(cameraDistance + delta, 2.6, 6.2);
    },
    setCameraDistance: (dist) => {
      cameraDistance = THREE.MathUtils.clamp(dist, 2.6, 6.2);
    },
    setPosePreview: (pose) => {
      posePreview = pose;
    },
    applyLookDelta,
    clearInputs: () => {
      keys.clear();
      isAiming = false;
    },
    teleport,
    applyRecoil: (amount = 0.24) => {
      recoilKick = Math.min(1.0, recoilKick + amount);
      camPitch = THREE.MathUtils.clamp(camPitch + 0.011, -0.95, 1.08);
    },
    applyKnockback: (dirX, dirZ, impulse) => {
      knockVelX += dirX * impulse;
      knockVelZ += dirZ * impulse;
    },
    triggerReloadAnim: (durationSec) => {
      reloadDuration = durationSec;
      reloadTimer = durationSec;
    },
    triggerHitReaction: (heavy = false) => {
      hitReaction = heavy ? 1.35 : 0.85;
    },
    setVisible: (visible) => {
      root.visible = visible;
    },
    getPosition: (target = new THREE.Vector3()) => target.copy(pos),
    getMuzzleWorldPos: (target = new THREE.Vector3()) => muzzleNode.getWorldPosition(target),
    getHudState: () => ({
      position: [pos.x, pos.y, pos.z],
      yaw: camYaw,
      stance: currentStance,
      isAiming,
      shoulderSide: shoulderTarget > 0 ? 'right' : 'left',
      activeWeapon,
      cameraDistance,
      speed: currentSpeed,
      grounded,
      helmetEquipped,
      isDodging: dodgeTimer > 0,
    }),
    update,
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of localMats) m.dispose();
    },
  };
}
