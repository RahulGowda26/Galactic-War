import * as THREE from 'three';
import type { WorldMaterialLibrary } from './materials';

export type AlienClassId =
  | 'dreadborn'
  | 'ravager_brute'
  | 'void_stalker'
  | 'aerial_reaver'
  | 'siege_guardian'
  | 'elite_guard';

export interface AlienClassStats {
  id: AlienClassId;
  displayName: string;
  maxHealth: number;
  moveSpeed: number;
  preferredRangeMin: number;
  preferredRangeMax: number;
  fireInterval: number;
  damage: number;
  projectileSpeed: number;
  isMelee: boolean;
  isFlying: boolean;
  bodyRadius: number;
  headHeight: number;
  bodyCenterY: number;
  hpBarY: number;
}

export const ALIEN_CLASS_STATS: Record<AlienClassId, AlienClassStats> = {
  dreadborn: {
    id: 'dreadborn',
    displayName: 'Dreadborn Infantry',
    maxHealth: 95,
    moveSpeed: 3.9,
    preferredRangeMin: 18,
    preferredRangeMax: 46,
    fireInterval: 1.45,
    damage: 11,
    projectileSpeed: 44,
    isMelee: false,
    isFlying: false,
    bodyRadius: 0.72,
    headHeight: 1.88,
    bodyCenterY: 1.15,
    hpBarY: 2.45,
  },
  ravager_brute: {
    id: 'ravager_brute',
    displayName: 'Ravager Brute',
    maxHealth: 240,
    moveSpeed: 5.6,
    preferredRangeMin: 2.2,
    preferredRangeMax: 4.0,
    fireInterval: 1.25,
    damage: 24,
    projectileSpeed: 0,
    isMelee: true,
    isFlying: false,
    bodyRadius: 1.18,
    headHeight: 2.68,
    bodyCenterY: 1.55,
    hpBarY: 3.35,
  },
  void_stalker: {
    id: 'void_stalker',
    displayName: 'Void Stalker',
    maxHealth: 85,
    moveSpeed: 7.4,
    preferredRangeMin: 11,
    preferredRangeMax: 28,
    fireInterval: 0.95,
    damage: 13,
    projectileSpeed: 56,
    isMelee: false,
    isFlying: false,
    bodyRadius: 0.74,
    headHeight: 2.28,
    bodyCenterY: 1.35,
    hpBarY: 2.8,
  },
  aerial_reaver: {
    id: 'aerial_reaver',
    displayName: 'Aerial Reaver',
    maxHealth: 115,
    moveSpeed: 8.8,
    preferredRangeMin: 22,
    preferredRangeMax: 52,
    fireInterval: 1.2,
    damage: 12,
    projectileSpeed: 52,
    isMelee: false,
    isFlying: true,
    bodyRadius: 1.15,
    headHeight: 1.35,
    bodyCenterY: 1.0,
    hpBarY: 2.25,
  },
  siege_guardian: {
    id: 'siege_guardian',
    displayName: 'Siege Guardian',
    maxHealth: 320,
    moveSpeed: 2.1,
    preferredRangeMin: 28,
    preferredRangeMax: 72,
    fireInterval: 2.35,
    damage: 26,
    projectileSpeed: 34,
    isMelee: false,
    isFlying: false,
    bodyRadius: 1.35,
    headHeight: 3.18,
    bodyCenterY: 1.85,
    hpBarY: 4.05,
  },
  elite_guard: {
    id: 'elite_guard',
    displayName: "Sovereign's Elite Guard",
    maxHealth: 185,
    moveSpeed: 4.8,
    preferredRangeMin: 16,
    preferredRangeMax: 44,
    fireInterval: 1.05,
    damage: 16,
    projectileSpeed: 54,
    isMelee: false,
    isFlying: false,
    bodyRadius: 0.85,
    headHeight: 2.38,
    bodyCenterY: 1.38,
    hpBarY: 2.95,
  },
};

export interface BuiltAlienRig {
  root: THREE.Group;
  torso: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  muzzleNode: THREE.Object3D;
  wingsGroup?: THREE.Group;
  dispose: () => void;
}

/**
 * Builds one of SIX visually distinct, anatomically unique alien enemy classes.
 * Every class has its own silhouette, proportions, head anatomy, armor, and weapon rig.
 */
export function buildAlienClassModel(
  classId: AlienClassId,
  mats: WorldMaterialLibrary,
): BuiltAlienRig {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };

  // Ground contact shadow (omitted for high-flying Aerial Reaver)
  if (classId !== 'aerial_reaver') {
    const shSize = classId === 'siege_guardian' || classId === 'ravager_brute' ? 2.6 : 1.7;
    const sh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(shSize, shSize)),
      mats.contactShadowMat,
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.04;
    root.add(sh);
  }

  const torso = new THREE.Group();
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const muzzleNode = new THREE.Object3D();
  let wingsGroup: THREE.Group | undefined;

  if (classId === 'dreadborn') {
    // 1. DREADBORN INFANTRY — Disciplined armored alien soldier with swept cranium & pulse rifle
    leftLeg.position.set(-0.15, 0.94, 0);
    rightLeg.position.set(0.15, 0.94, 0);
    const legGeo = track(new THREE.CylinderGeometry(0.088, 0.068, 0.92, 8));
    for (const [leg, side] of [
      [leftLeg, -1],
      [rightLeg, 1],
    ] as const) {
      const m = new THREE.Mesh(legGeo, mats.enemyAlienArmor);
      m.position.y = -0.46;
      m.castShadow = true;
      leg.add(m);
      const shinPlate = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.11, 0.42, 0.14)),
        mats.alienHullDark,
      );
      shinPlate.position.set(side * 0.02, -0.66, 0.04);
      leg.add(shinPlate);
      root.add(leg);
    }

    torso.position.set(0, 1.0, 0);
    root.add(torso);

    const chest = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.54, 0.68, 0.34)),
      mats.enemyAlienArmor,
    );
    chest.position.y = 0.34;
    chest.castShadow = true;
    torso.add(chest);

    const chestCore = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.14, 0.24, 0.06)),
      mats.enemyAlienEmissive,
    );
    chestCore.position.set(0, 0.38, 0.17);
    torso.add(chestCore);

    // Swept alien soldier head with twin mandible breathers
    const head = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.19, 14, 12)),
      mats.enemyAlienArmor,
    );
    head.scale.set(0.84, 1.15, 1.35);
    head.position.set(0, 0.88, 0.02);
    torso.add(head);

    const visor = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.24, 0.055, 0.12)),
      mats.enemyAlienEmissive,
    );
    visor.position.set(0, 0.89, 0.18);
    torso.add(visor);

    leftArm.position.set(-0.34, 0.56, 0);
    rightArm.position.set(0.34, 0.56, 0);
    torso.add(leftArm, rightArm);

    const armGeo = track(new THREE.CylinderGeometry(0.065, 0.055, 0.56, 8));
    for (const [arm, side] of [
      [leftArm, -1],
      [rightArm, 1],
    ] as const) {
      const pauldron = new THREE.Mesh(
        track(new THREE.ConeGeometry(0.19, 0.28, 6)),
        mats.alienObsidian,
      );
      pauldron.rotation.z = side * -0.5;
      arm.add(pauldron);
      const aMesh = new THREE.Mesh(armGeo, mats.enemyAlienArmor);
      aMesh.position.y = -0.26;
      arm.add(aMesh);
    }

    const rifle = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.1, 0.15, 0.98)),
      mats.alienHullDark,
    );
    rifle.position.set(0.04, -0.22, 0.42);
    rightArm.add(rifle);
    const rifleGlow = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.05, 0.05, 0.56)),
      mats.enemyAlienEmissive,
    );
    rifleGlow.position.set(0.04, -0.17, 0.54);
    rightArm.add(rifleGlow);

    muzzleNode.position.set(0.04, -0.2, 0.95);
    rightArm.add(muzzleNode);
  } else if (classId === 'ravager_brute') {
    // 2. RAVAGER BRUTE — Colossal hunched gorilla-proportioned melee juggernaut (~2.95m)
    leftLeg.position.set(-0.34, 1.08, 0);
    rightLeg.position.set(0.34, 1.08, 0);
    const legGeo = track(new THREE.CylinderGeometry(0.21, 0.17, 1.06, 10));
    for (const leg of [leftLeg, rightLeg]) {
      const m = new THREE.Mesh(legGeo, mats.alienBruteHide);
      m.position.y = -0.53;
      m.castShadow = true;
      leg.add(m);
      const foot = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.36, 0.2, 0.54)),
        mats.sovereignArmorPrimary,
      );
      foot.position.set(0, -1.0, 0.1);
      leg.add(foot);
      root.add(leg);
    }

    torso.position.set(0, 1.15, 0.06);
    root.add(torso);

    // Massive hunched muscular barrel torso & dorsal armored hump
    const chest = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.68, 16, 14)),
      mats.alienBruteHide,
    );
    chest.scale.set(1.25, 1.08, 0.95);
    chest.position.set(0, 0.65, 0.06);
    chest.castShadow = true;
    torso.add(chest);

    const armorShell = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.18, 0.72, 0.64)),
      mats.sovereignArmorPrimary,
    );
    armorShell.position.set(0, 0.88, -0.08);
    armorShell.rotation.x = 0.22;
    armorShell.castShadow = true;
    torso.add(armorShell);

    // Low-set snarling horned brute head
    const head = new THREE.Mesh(
      track(new THREE.DodecahedronGeometry(0.32, 1)),
      mats.alienBruteHide,
    );
    head.scale.set(1.05, 0.92, 1.18);
    head.position.set(0, 1.28, 0.44);
    torso.add(head);

    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(
        track(new THREE.ConeGeometry(0.08, 0.42, 6)),
        mats.sovereignFangBone,
      );
      horn.position.set(side * 0.26, 1.48, 0.48);
      horn.rotation.z = side * -0.55;
      horn.rotation.x = 0.45;
      torso.add(horn);

      const eye = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.08, 0.035, 0.04)),
        mats.enemyAlienEmissive,
      );
      eye.position.set(side * 0.11, 1.32, 0.72);
      torso.add(eye);
    }

    // Oversized smashing arms & spiked siege gauntlets
    leftArm.position.set(-0.88, 0.95, 0.08);
    rightArm.position.set(0.88, 0.95, 0.08);
    torso.add(leftArm, rightArm);

    for (const [arm, side] of [
      [leftArm, -1],
      [rightArm, 1],
    ] as const) {
      const pauldron = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.38, 12, 10)),
        mats.sovereignChestCrimson,
      );
      pauldron.position.set(side * 0.06, 0.08, 0);
      arm.add(pauldron);

      const bicep = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.18, 0.15, 0.68, 10)),
        mats.alienBruteHide,
      );
      bicep.position.y = -0.36;
      bicep.castShadow = true;
      arm.add(bicep);

      const gauntlet = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.38, 0.62, 0.38)),
        mats.sovereignArmorPrimary,
      );
      gauntlet.position.set(0, -0.88, 0.08);
      gauntlet.castShadow = true;
      arm.add(gauntlet);

      const knuckleGlow = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.28, 0.14, 0.42)),
        mats.alienEnergyAmber,
      );
      knuckleGlow.position.set(0, -1.06, 0.1);
      arm.add(knuckleGlow);
    }

    muzzleNode.position.set(0, -0.9, 0.3);
    rightArm.add(muzzleNode);
  } else if (classId === 'void_stalker') {
    // 3. VOID STALKER — Elongated glossy-chitin spider-hunter with glowing dome head (Ref #3!)
    leftLeg.position.set(-0.22, 1.32, 0);
    rightLeg.position.set(0.22, 1.32, 0);
    for (const leg of [leftLeg, rightLeg]) {
      const upper = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.06, 0.042, 0.72, 7)),
        mats.alienVoidChitin,
      );
      upper.position.set(0, -0.32, -0.14);
      upper.rotation.x = 0.42;
      upper.castShadow = true;
      leg.add(upper);

      const lower = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.04, 0.022, 0.84, 7)),
        mats.alienVoidChitin,
      );
      lower.position.set(0, -0.92, -0.06);
      lower.rotation.x = -0.3;
      lower.castShadow = true;
      leg.add(lower);
      root.add(leg);
    }

    torso.position.set(0, 1.38, 0);
    root.add(torso);

    // Lean skeletal ribbed chitin torso
    const spine = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.18, 0.09, 0.74, 8)),
      mats.alienVoidChitin,
    );
    spine.position.set(0, 0.36, 0.04);
    spine.rotation.x = 0.24;
    spine.castShadow = true;
    torso.add(spine);

    // Iconic bulbous glossy domed alien hunter skull + blazing amber optical face (Ref #3!)
    const skull = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.28, 18, 14)),
      mats.alienVoidChitin,
    );
    skull.scale.set(0.82, 0.96, 1.52);
    skull.position.set(0, 0.86, 0.16);
    skull.rotation.x = 0.22;
    skull.castShadow = true;
    torso.add(skull);

    const opticalDome = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.17, 14, 12)),
      mats.alienEnergyAmber,
    );
    opticalDome.scale.set(0.82, 0.95, 0.72);
    opticalDome.position.set(0, 0.82, 0.42);
    torso.add(opticalDome);

    // Thin elongated whip-like clawed arms
    leftArm.position.set(-0.24, 0.62, 0.06);
    rightArm.position.set(0.24, 0.62, 0.06);
    torso.add(leftArm, rightArm);

    for (const [arm, side] of [
      [leftArm, -1],
      [rightArm, 1],
    ] as const) {
      const limb = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.042, 0.025, 1.15, 7)),
        mats.alienVoidChitin,
      );
      limb.position.set(side * 0.08, -0.48, 0.12);
      limb.rotation.x = -0.35;
      arm.add(limb);

      const claw = new THREE.Mesh(
        track(new THREE.ConeGeometry(0.04, 0.34, 5)),
        mats.alienEnergyAmber,
      );
      claw.rotation.x = Math.PI * 0.75;
      claw.position.set(side * 0.1, -1.02, 0.34);
      arm.add(claw);
    }

    muzzleNode.position.set(0.1, -0.95, 0.46);
    rightArm.add(muzzleNode);
  } else if (classId === 'aerial_reaver') {
    // 4. AERIAL REAVER — Flying bio-mechanical winged strike unit with glowing propulsion pods
    torso.position.set(0, 1.0, 0);
    root.add(torso);

    const body = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.42, 1.65, 7)),
      mats.alienObsidian,
    );
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    torso.add(body);

    const head = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.24, 14, 10)),
      mats.alienVoidChitin,
    );
    head.scale.set(0.9, 0.75, 1.35);
    head.position.set(0, 0.14, 0.72);
    torso.add(head);

    const sensor = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.26, 0.07, 0.12)),
      mats.alienEnergyCyan,
    );
    sensor.position.set(0, 0.12, 0.96);
    torso.add(sensor);

    // Swept articulated razor-wings + glowing turbine pods
    wingsGroup = new THREE.Group();
    torso.add(wingsGroup);

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.45, 0.09, 0.62)),
        mats.alienHullDark,
      );
      wing.position.set(side * 0.92, 0.16, -0.05);
      wing.rotation.y = side * -0.34;
      wing.rotation.z = side * 0.16;
      wing.castShadow = true;
      wingsGroup.add(wing);

      const thruster = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.16, 0.22, 0.36, 10)),
        mats.alienEnergyCyan,
      );
      thruster.position.set(side * 0.64, -0.14, -0.2);
      wingsGroup.add(thruster);
    }

    // Underslung twin plasma cannons
    for (const side of [-0.28, 0.28]) {
      const gun = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.05, 0.06, 0.82, 8)),
        mats.weaponGunmetal,
      );
      gun.rotation.x = Math.PI / 2;
      gun.position.set(side, -0.22, 0.45);
      torso.add(gun);
    }

    muzzleNode.position.set(0, -0.22, 0.95);
    torso.add(muzzleNode);
    root.add(leftLeg, rightLeg);
    torso.add(leftArm, rightArm);
  } else if (classId === 'siege_guardian') {
    // 5. SIEGE GUARDIAN — Towering 3.55m heavily armored bipedal siege artillery walker
    leftLeg.position.set(-0.52, 1.38, 0);
    rightLeg.position.set(0.52, 1.38, 0);
    for (const leg of [leftLeg, rightLeg]) {
      const strut = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.38, 1.34, 0.44)),
        mats.alienObsidian,
      );
      strut.position.y = -0.66;
      strut.castShadow = true;
      leg.add(strut);

      const foot = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.56, 0.26, 0.78)),
        mats.alienHullDark,
      );
      foot.position.set(0, -1.28, 0.08);
      leg.add(foot);
      root.add(leg);
    }

    torso.position.set(0, 1.48, 0);
    root.add(torso);

    // Fortress-like armored shield carapace
    const hull = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.52, 1.48, 1.12)),
      mats.alienObsidian,
    );
    hull.position.set(0, 0.85, 0);
    hull.castShadow = true;
    torso.add(hull);

    // Glowing furnace reactor aperture
    const reactor = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.34, 14, 12)),
      mats.alienEnergyAmber,
    );
    reactor.position.set(0, 0.82, 0.48);
    torso.add(reactor);

    // Armored sensor dome head
    const head = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.32, 0.44, 0.42, 8)),
      mats.sovereignArmorTrim,
    );
    head.position.set(0, 1.72, 0.14);
    torso.add(head);

    const visor = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.42, 0.1, 0.12)),
      mats.enemyAlienEmissive,
    );
    visor.position.set(0, 1.72, 0.44);
    torso.add(visor);

    // Twin heavy shoulder-mounted plasma siege cannons
    leftArm.position.set(-0.96, 1.25, 0.12);
    rightArm.position.set(0.96, 1.25, 0.12);
    torso.add(leftArm, rightArm);

    for (const arm of [leftArm, rightArm]) {
      const pod = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.42, 0.46, 0.92)),
        mats.alienHullDark,
      );
      pod.castShadow = true;
      arm.add(pod);

      const barrel = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.12, 0.16, 1.35, 10)),
        mats.weaponGunmetal,
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0, 0.92);
      arm.add(barrel);

      const coil = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.17, 0.035, 8, 16)),
        mats.alienEnergyAmber,
      );
      coil.position.set(0, 0, 1.28);
      arm.add(coil);
    }

    muzzleNode.position.set(0, 0, 1.62);
    rightArm.add(muzzleNode);
  } else {
    // 6. SOVEREIGN'S ELITE GUARD — Tall 2.55m regal crimson-obsidian shock commander with plasma halberd
    leftLeg.position.set(-0.19, 1.12, 0);
    rightLeg.position.set(0.19, 1.12, 0);
    for (const leg of [leftLeg, rightLeg]) {
      const m = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.115, 0.085, 1.1, 10)),
        mats.sovereignArmorPrimary,
      );
      m.position.y = -0.55;
      m.castShadow = true;
      leg.add(m);
      root.add(leg);
    }

    torso.position.set(0, 1.18, 0);
    root.add(torso);

    const chest = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.68, 0.82, 0.4)),
      mats.alienEliteCrimson,
    );
    chest.position.y = 0.44;
    chest.castShadow = true;
    torso.add(chest);

    // Flowing dark crimson commander back cape
    const cape = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.86, 1.75)),
      mats.sovereignCape,
    );
    cape.position.set(0, 0.02, -0.26);
    cape.rotation.x = 0.12;
    torso.add(cape);

    // Tall crested alien royal war-helm
    const helm = new THREE.Mesh(
      track(new THREE.OctahedronGeometry(0.24, 1)),
      mats.sovereignArmorPrimary,
    );
    helm.scale.set(0.88, 1.38, 1.05);
    helm.position.set(0, 1.08, 0.02);
    torso.add(helm);

    const crownFin = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.06, 0.44, 0.28)),
      mats.sovereignArmorTrim,
    );
    crownFin.position.set(0, 1.32, -0.04);
    torso.add(crownFin);

    const visor = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.24, 0.06, 0.1)),
      mats.sovereignEmissive,
    );
    visor.position.set(0, 1.08, 0.2);
    torso.add(visor);

    leftArm.position.set(-0.44, 0.72, 0);
    rightArm.position.set(0.44, 0.72, 0);
    torso.add(leftArm, rightArm);

    for (const [arm, side] of [
      [leftArm, -1],
      [rightArm, 1],
    ] as const) {
      const pauldron = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.22, 12, 10)),
        mats.alienEliteCrimson,
      );
      pauldron.position.set(side * 0.06, 0.06, 0);
      arm.add(pauldron);

      const limb = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.08, 0.068, 0.68, 8)),
        mats.sovereignArmorPrimary,
      );
      limb.position.y = -0.34;
      arm.add(limb);
    }

    // Glowing Plasma War-Halberd Lance
    const shaft = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.032, 0.032, 2.25, 8)),
      mats.sovereignArmorTrim,
    );
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0.04, -0.32, 0.56);
    rightArm.add(shaft);

    const blade = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.11, 0.58, 4)),
      mats.sovereignEmissive,
    );
    blade.rotation.x = Math.PI / 2;
    blade.position.set(0.04, -0.32, 1.78);
    rightArm.add(blade);

    muzzleNode.position.set(0.04, -0.32, 1.95);
    rightArm.add(muzzleNode);
  }

  return {
    root,
    torso,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    muzzleNode,
    wingsGroup,
    dispose: () => {
      for (const g of geos) g.dispose();
    },
  };
}

/**
 * Builds an Allied Human Vanguard Defender holding street barricades in the war zone.
 */
export function buildAlliedDefender(mats: WorldMaterialLibrary): {
  root: THREE.Group;
  muzzleNode: THREE.Object3D;
  dispose: () => void;
} {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };

  const torso = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.42, 0.58, 0.28)),
    mats.militaryArmor,
  );
  torso.position.y = 1.15;
  torso.castShadow = true;
  root.add(torso);

  const legs = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.36, 0.84, 0.24)),
    mats.sovereignUnderSuit,
  );
  legs.position.y = 0.42;
  root.add(legs);

  const helm = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.145, 12, 10)),
    mats.militaryArmor,
  );
  helm.position.y = 1.62;
  root.add(helm);

  const visor = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.18, 0.06, 0.1)),
    mats.cityCyanAccent,
  );
  visor.position.set(0, 1.63, 0.11);
  root.add(visor);

  const rifle = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.08, 0.12, 0.72)),
    mats.weaponGunmetal,
  );
  rifle.position.set(0.2, 1.24, 0.36);
  root.add(rifle);

  const muzzleNode = new THREE.Object3D();
  muzzleNode.position.set(0.2, 1.25, 0.78);
  root.add(muzzleNode);

  return {
    root,
    muzzleNode,
    dispose: () => {
      for (const g of geos) g.dispose();
    },
  };
}
