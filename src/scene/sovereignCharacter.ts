import * as THREE from 'three';
import type { WorldMaterialLibrary } from './materials';
import {
  SOVEREIGN_FACING_YAW,
  SOVEREIGN_WORLD_POS,
} from '../world/worldConfig';

export type SovereignAnimState =
  | 'idle_authority'
  | 'aggressive_idle'
  | 'command_walk'
  | 'combat_stance'
  | 'roar_command'
  | 'attack_strike'
  | 'command_gesture'
  | 'stagger_hit'
  | 'cinematic_reveal';

export interface SovereignCharacterController {
  root: THREE.Group;
  headTargetWorld: THREE.Vector3;
  setState: (state: SovereignAnimState) => void;
  getState: () => SovereignAnimState;
  triggerRoar: () => void;
  update: (elapsed: number, dt: number, cameraWorldPos?: THREE.Vector3) => void;
  dispose: () => void;
}

/**
 * PHASE 3 REDESIGN — THE SOVEREIGN (~3.22m Terrifying Ancient Alien Warlord).
 * Directly inspired by Reference #2:
 * - Pronounced bone-plated alien forehead dome with sagittal crest & deep-set furrowed brows
 * - Deep-set glowing fiery-amber irises with sharp dark vertical slit pupils
 * - Exposed snarling articulated jaws lined with individual jagged alien fangs & battle scars
 * - 8 thick curved bio-mechanical cranial conduits sweeping from skull into heavy collar armor
 * - Massive muscular warlord frame with weathered crimson-oxide chest war-plates, layered
 *   battle-scarred obsidian shoulder pauldrons, 4-fingered clawed hands, dorsal war-reactor
 *   machinery, and real-time per-vertex billowing war-mantle.
 */
export function buildSovereignCharacter(
  mats: WorldMaterialLibrary,
): SovereignCharacterController {
  const root = new THREE.Group();
  root.name = 'HeroAntagonist_TheSovereign_Warlord';
  root.position.set(
    SOVEREIGN_WORLD_POS[0],
    SOVEREIGN_WORLD_POS[1],
    SOVEREIGN_WORLD_POS[2],
  );
  root.rotation.y = SOVEREIGN_FACING_YAW;

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

  const pupilMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x090606 }),
  );
  const scarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b1f1e,
      roughness: 0.72,
      metalness: 0.1,
    }),
  );

  // Ground contact shadow
  const contactDisc = new THREE.Mesh(
    track(new THREE.PlaneGeometry(3.8, 3.8)),
    mats.contactShadowMat,
  );
  contactDisc.rotation.x = -Math.PI / 2;
  contactDisc.position.y = 0.03;
  root.add(contactDisc);

  const actorPivot = new THREE.Group();
  root.add(actorPivot);

  // =========================================================================
  // 1. HEAVY MUSCULAR PELVIS & POWERFUL ARTICULATED LEGS
  // =========================================================================
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.56, 0);
  actorPivot.add(pelvis);

  const waistShape = new THREE.Shape();
  waistShape.moveTo(-0.36, 0.16);
  waistShape.lineTo(0.36, 0.16);
  waistShape.lineTo(0.28, -0.18);
  waistShape.lineTo(0, -0.3);
  waistShape.lineTo(-0.28, -0.18);
  waistShape.closePath();

  const pelvisPlate = new THREE.Mesh(
    track(
      new THREE.ExtrudeGeometry(waistShape, {
        depth: 0.38,
        bevelEnabled: true,
        bevelThickness: 0.045,
        bevelSize: 0.04,
        bevelSegments: 3,
      }),
    ),
    mats.sovereignArmorPrimary,
  );
  pelvisPlate.position.set(0, 0.02, -0.19);
  pelvisPlate.castShadow = true;
  pelvis.add(pelvisPlate);

  // Segmented armored tasset plates with weathered crimson trim
  for (const side of [-1, 0, 1]) {
    const tasset = new THREE.Mesh(
      track(
        new THREE.BoxGeometry(
          side === 0 ? 0.26 : 0.25,
          side === 0 ? 0.64 : 0.56,
          0.06,
        ),
      ),
      side === 0 ? mats.sovereignChestCrimson : mats.sovereignArmorPrimary,
    );
    tasset.position.set(side * 0.26, -0.34, 0.22 - Math.abs(side) * 0.04);
    tasset.rotation.x = -0.07;
    tasset.rotation.y = side * 0.28;
    tasset.castShadow = true;
    pelvis.add(tasset);
  }

  const thighProfile = [
    new THREE.Vector2(0.13, 0),
    new THREE.Vector2(0.19, 0.2),
    new THREE.Vector2(0.22, 0.52),
    new THREE.Vector2(0.16, 0.72),
  ];
  const thighGeo = track(new THREE.LatheGeometry(thighProfile, 14));

  const shinProfile = [
    new THREE.Vector2(0.1, 0),
    new THREE.Vector2(0.125, 0.16),
    new THREE.Vector2(0.175, 0.52),
    new THREE.Vector2(0.145, 0.74),
  ];
  const shinGeo = track(new THREE.LatheGeometry(shinProfile, 14));

  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.27, -0.06, 0);
    pelvis.add(hip);

    const thigh = new THREE.Mesh(thighGeo, mats.sovereignArmorPrimary);
    thigh.position.y = -0.72;
    thigh.castShadow = true;
    hip.add(thigh);

    const thighArmor = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.08, 0.54, 0.22)),
      mats.sovereignChestCrimson,
    );
    thighArmor.position.set(side * 0.19, -0.34, 0.03);
    thighArmor.rotation.z = side * 0.12;
    hip.add(thighArmor);

    const knee = new THREE.Group();
    knee.position.set(0, -0.74, 0.02);
    hip.add(knee);

    const kneeGuard = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.145, 0.26, 6)),
      mats.sovereignArmorTrim,
    );
    kneeGuard.rotation.x = Math.PI * 0.44;
    kneeGuard.position.set(0, 0.02, 0.17);
    knee.add(kneeGuard);

    const shin = new THREE.Mesh(shinGeo, mats.sovereignArmorPrimary);
    shin.position.y = -0.74;
    shin.castShadow = true;
    knee.add(shin);

    const greavePlate = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.1, 0.62, 0.14)),
      mats.sovereignArmorTrim,
    );
    greavePlate.position.set(0, -0.38, 0.14);
    knee.add(greavePlate);

    // Heavy armored 3-toed warlord sabaton
    const boot = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.26, 0.16, 0.46)),
      mats.sovereignArmorPrimary,
    );
    boot.position.set(0, -0.74, 0.1);
    boot.castShadow = true;
    knee.add(boot);

    return { hip, knee };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // =========================================================================
  // 2. MASSIVE WARLORD TORSO, CRIMSON CHEST PLATES & DORSAL WAR-MACHINERY
  // =========================================================================
  const torso = new THREE.Group();
  torso.position.set(0, 0.14, 0);
  pelvis.add(torso);

  // Ribbed muscular alien abdomen core
  const abdomen = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.38, 0.29, 0.44, 14)),
    mats.sovereignUnderSuit,
  );
  abdomen.position.set(0, 0.2, 0);
  abdomen.scale.set(1.18, 1, 0.84);
  torso.add(abdomen);

  for (let i = 0; i < 3; i++) {
    const abPlate = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.52 - i * 0.04, 0.095, 0.25)),
      mats.sovereignArmorPrimary,
    );
    abPlate.position.set(0, 0.34 - i * 0.115, 0.14);
    abPlate.rotation.x = 0.14;
    torso.add(abPlate);
  }

  // Massive broad chest cuirass
  const chestShape = new THREE.Shape();
  chestShape.moveTo(-0.56, 0.42);
  chestShape.lineTo(0.56, 0.42);
  chestShape.lineTo(0.48, -0.02);
  chestShape.lineTo(0.28, -0.28);
  chestShape.lineTo(0, -0.36);
  chestShape.lineTo(-0.28, -0.28);
  chestShape.lineTo(-0.48, -0.02);
  chestShape.closePath();

  const cuirass = new THREE.Mesh(
    track(
      new THREE.ExtrudeGeometry(chestShape, {
        depth: 0.48,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.065,
        bevelSegments: 4,
      }),
    ),
    mats.sovereignArmorPrimary,
  );
  cuirass.position.set(0, 0.64, -0.24);
  cuirass.castShadow = true;
  torso.add(cuirass);

  // Iconic sculpted weathered crimson-oxide pectoral war-plates (Ref #6)
  for (const side of [-1, 1]) {
    const pec = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.26, 18, 14)),
      mats.sovereignChestCrimson,
    );
    pec.scale.set(1.05, 0.78, 0.56);
    pec.position.set(side * 0.25, 0.77, 0.24);
    pec.rotation.y = side * -0.26;
    pec.rotation.z = side * -0.14;
    pec.castShadow = true;
    torso.add(pec);

    // Armored collar bolt / harness latch
    const latch = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.068, 0.078, 0.09, 12)),
      mats.sovereignArmorTrim,
    );
    latch.rotation.x = Math.PI / 2;
    latch.position.set(side * 0.44, 0.94, 0.24);
    torso.add(latch);

    // Controlled fiery energy conduit seam beneath crimson plates
    const seam = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.028, 0.26, 0.04)),
      mats.sovereignEmissive,
    );
    seam.position.set(side * 0.15, 0.6, 0.31);
    seam.rotation.z = side * 0.35;
    torso.add(seam);
  }

  // Central sculpted sternum trophy crest & glowing core slit
  const sternumBuckle = new THREE.Mesh(
    track(new THREE.DodecahedronGeometry(0.13, 0)),
    mats.sovereignArmorTrim,
  );
  sternumBuckle.scale.set(0.85, 1.35, 0.6);
  sternumBuckle.position.set(0, 0.72, 0.32);
  torso.add(sternumBuckle);

  const coreSlit = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.045, 0.18, 0.04)),
    mats.sovereignEmissive,
  );
  coreSlit.position.set(0, 0.72, 0.37);
  torso.add(coreSlit);

  // Intricate Dorsal War-Reactor & Angled Mechanical Exhaust Stacks (Ref #2 back machinery)
  const backPack = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.66, 0.68, 0.32)),
    mats.sovereignArmorPrimary,
  );
  backPack.position.set(0, 0.74, -0.38);
  backPack.castShadow = true;
  torso.add(backPack);

  const backCore = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.13, 0.16, 0.36, 10)),
    mats.sovereignEmissive,
  );
  backCore.rotation.x = Math.PI / 2;
  backCore.position.set(0, 0.76, -0.42);
  torso.add(backCore);

  for (const side of [-1, 1]) {
    for (let s = 0; s < 2; s++) {
      const stack = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.048, 0.068, 0.56 - s * 0.12, 8)),
        mats.sovereignArmorTrim,
      );
      stack.position.set(side * (0.28 + s * 0.11), 1.18 - s * 0.06, -0.38 - s * 0.06);
      stack.rotation.z = side * -(0.28 + s * 0.12);
      stack.rotation.x = -0.22;
      stack.castShadow = true;
      torso.add(stack);
    }
  }

  // Heavy neck gorget collar framing the alien head
  const gorget = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.36, 0.09, 10, 22, Math.PI * 1.35)),
    mats.sovereignArmorPrimary,
  );
  gorget.position.set(0, 1.04, -0.02);
  gorget.rotation.x = Math.PI * 0.45;
  gorget.rotation.z = -Math.PI * 0.175;
  torso.add(gorget);

  // =========================================================================
  // 3. TERRIFYING SCULPTED ALIEN WARLORD HEAD & ANGRY FANGED VISAGE (Ref #6!)
  // Smooth vertex-sculpted organic alien cranium + sweeping brow-crown ridges +
  // deep recessed glowing molten eyes + snarling dark crimson fanged maw (ZERO boxy cubes!)
  // =========================================================================
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.14, 0.07);
  torso.add(headPivot);

  const mawMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x160506,
      roughness: 0.75,
      metalness: 0.05,
    }),
  );

  // Thick muscular corded alien neck with lateral tendon ridges
  const neck = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.14, 0.2, 0.28, 16)),
    mats.sovereignSkinFace,
  );
  neck.position.set(0, 0.04, -0.02);
  headPivot.add(neck);

  // Vertex-sculpted organic alien skull & face (elongated cranium, furrowed V-brows,
  // sunken eye sockets, flared cheekbones, tapered predatory snout)
  const skullGeo = track(new THREE.SphereGeometry(0.235, 36, 28));
  const sp = skullGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sp.count; i++) {
    let vx = sp.getX(i);
    let vy = sp.getY(i);
    let vz = sp.getZ(i);

    // Elongate cranium vertically and pull occiput back like an ancient warlord skull
    vy *= 1.34;
    vz *= 1.16;
    vx *= 0.94;

    // Taper lower face into sharp predatory V-jawline
    if (vy < 0) {
      const lowerT = Math.min(1, -vy / 0.31);
      vx *= 1.0 - lowerT * 0.34;
      vz += lowerT * 0.035 * Math.max(0, vz / 0.22);
    }

    // Pronounced sweeping sagittal crest running over top of forehead dome
    if (vy > 0.06) {
      const centerRidge = Math.exp(-(vx * vx) / 0.0028);
      const crestH = centerRidge * 0.052 * Math.min(1, (vy - 0.06) / 0.14);
      vy += crestH;
      vz += crestH * 0.35;
    }

    // Angry V-furrowed supraorbital brow overhang (deep scowl in center, rising outward)
    if (vz > 0.09) {
      const browY = 0.038 + Math.abs(vx) * 0.38;
      const browBand = Math.exp(-Math.pow((vy - browY) / 0.036, 2)) * Math.exp(-Math.pow(vx / 0.17, 2));
      vz += browBand * 0.068;

      // Deep shadowed recessed eye sockets directly beneath the furrowed brow
      const eyeDistL = Math.hypot((vx + 0.078) * 1.1, (vy - 0.015) * 1.8);
      const eyeDistR = Math.hypot((vx - 0.078) * 1.1, (vy - 0.015) * 1.8);
      const eyeIndent = Math.exp(-Math.pow(Math.min(eyeDistL, eyeDistR) / 0.048, 2));
      vz -= eyeIndent * 0.052;

      // Sharp flared alien zygomatic cheekbones sweeping laterally
      const cheekDist = Math.hypot((Math.abs(vx) - 0.135) * 1.2, (vy + 0.055) * 1.5);
      const cheekRidge = Math.exp(-Math.pow(cheekDist / 0.068, 2));
      vx += Math.sign(vx) * cheekRidge * 0.045;
      vz += cheekRidge * 0.035;

      // Predatory nasal bridge ridge tapering downward
      const noseBand = Math.exp(-Math.pow(vx / 0.032, 2)) * Math.exp(-Math.pow((vy + 0.042) / 0.06, 2));
      vz += noseBand * 0.038;
    }

    sp.setXYZ(i, vx, vy, vz);
  }
  skullGeo.computeVertexNormals();

  const skullMesh = new THREE.Mesh(skullGeo, mats.sovereignSkinFace);
  skullMesh.position.set(0, 0.285, 0.01);
  skullMesh.castShadow = true;
  headPivot.add(skullMesh);

  // Swept dark-metallic cranial armor crest & armored brow-crown plates (Ref #6)
  const crestCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.35, 0.245),
    new THREE.Vector3(0, 0.56, 0.16),
    new THREE.Vector3(0, 0.65, -0.03),
    new THREE.Vector3(0, 0.49, -0.26),
  ]);
  const sagittalCrest = new THREE.Mesh(
    track(new THREE.TubeGeometry(crestCurve, 18, 0.032, 8, false)),
    mats.sovereignArmorPrimary,
  );
  headPivot.add(sagittalCrest);

  for (const side of [-1, 1]) {
    // Sweeping curved armored temple-brow plate curving back along the alien skull
    const browPlateCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.018, 0.315, 0.258),
      new THREE.Vector3(side * 0.115, 0.355, 0.225),
      new THREE.Vector3(side * 0.205, 0.375, 0.095),
      new THREE.Vector3(side * 0.185, 0.31, -0.14),
    ]);
    const browPlate = new THREE.Mesh(
      track(new THREE.TubeGeometry(browPlateCurve, 16, 0.026, 7, false)),
      mats.sovereignArmorPrimary,
    );
    headPivot.add(browPlate);

    // Sweeping organic cheekbone-mandible armor ridge framing the snarling mouth
    const cheekArmorCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.195, 0.26, 0.08),
      new THREE.Vector3(side * 0.162, 0.19, 0.185),
      new THREE.Vector3(side * 0.105, 0.115, 0.215),
    ]);
    const cheekArmor = new THREE.Mesh(
      track(new THREE.TubeGeometry(cheekArmorCurve, 12, 0.022, 7, false)),
      mats.sovereignArmorPrimary,
    );
    headPivot.add(cheekArmor);

    // Deep shadowed eye socket recess
    const socket = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.044, 12, 10)),
      pupilMat,
    );
    socket.scale.set(1.3, 0.56, 0.62);
    socket.position.set(side * 0.078, 0.278, 0.218);
    socket.rotation.z = side * 0.26;
    headPivot.add(socket);

    // Fierce narrow fiery orange-red alien iris glowing beneath the angry scowl
    const iris = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.029, 12, 10)),
      mats.sovereignEmissive,
    );
    iris.scale.set(1.32, 0.44, 0.45);
    iris.position.set(side * 0.078, 0.278, 0.236);
    iris.rotation.z = side * 0.26;
    headPivot.add(iris);

    // Razor-sharp vertical alien slit pupil
    const pupil = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.011, 8, 8)),
      pupilMat,
    );
    pupil.scale.set(0.45, 1.35, 0.5);
    pupil.position.set(side * 0.078, 0.278, 0.249);
    headPivot.add(pupil);
  }

  // Diagonal battle scar etched across left temple & cheekbone
  const scarCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.055, 0.345, 0.255),
    new THREE.Vector3(-0.095, 0.275, 0.246),
    new THREE.Vector3(-0.125, 0.205, 0.222),
  ]);
  const scar = new THREE.Mesh(
    track(new THREE.TubeGeometry(scarCurve, 8, 0.006, 6, false)),
    scarMat,
  );
  headPivot.add(scar);

  // Dark inner mouth cavity behind the snarling fangs
  const innerMaw = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.105, 14, 12)),
    mawMat,
  );
  innerMaw.scale.set(0.95, 0.85, 1.05);
  innerMaw.position.set(0, 0.145, 0.15);
  headPivot.add(innerMaw);

  // Sculpted curved upper maxilla arch + 9 jagged tapered upper alien fangs
  const upperLipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.105, 0.175, 0.145),
    new THREE.Vector3(-0.065, 0.168, 0.222),
    new THREE.Vector3(0, 0.176, 0.245),
    new THREE.Vector3(0.065, 0.168, 0.222),
    new THREE.Vector3(0.105, 0.175, 0.145),
  ]);
  const upperArch = new THREE.Mesh(
    track(new THREE.TubeGeometry(upperLipCurve, 14, 0.024, 7, false)),
    mats.sovereignSkinFace,
  );
  headPivot.add(upperArch);

  const fangGeo = track(new THREE.ConeGeometry(0.01, 0.058, 6));
  for (let t = -4; t <= 4; t++) {
    const fang = new THREE.Mesh(fangGeo, mats.sovereignFangBone);
    const angle = t * 0.21;
    const isCanine = Math.abs(t) === 2 || Math.abs(t) === 3;
    fang.position.set(
      Math.sin(angle) * 0.088,
      0.132 - (isCanine ? 0.012 : 0),
      0.155 + Math.cos(angle) * 0.086,
    );
    fang.rotation.x = Math.PI + 0.08;
    fang.rotation.z = -t * 0.04;
    fang.scale.set(isCanine ? 1.15 : 0.85, isCanine ? 1.38 : 0.92, isCanine ? 1.15 : 0.85);
    headPivot.add(fang);
  }

  // Articulated Sculpted Lower Mandible Jaw + Chin Spine + 9 Lower Fangs (opens wide during ROAR!)
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, 0.115, 0.085);
  headPivot.add(jawPivot);

  const lowerJawCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.105, 0.015, 0.03),
    new THREE.Vector3(-0.078, -0.042, 0.115),
    new THREE.Vector3(0, -0.068, 0.155),
    new THREE.Vector3(0.078, -0.042, 0.115),
    new THREE.Vector3(0.105, 0.015, 0.03),
  ]);
  const lowerMandible = new THREE.Mesh(
    track(new THREE.TubeGeometry(lowerJawCurve, 16, 0.032, 8, false)),
    mats.sovereignSkinFace,
  );
  jawPivot.add(lowerMandible);

  const chinPlate = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.052, 0.125, 7)),
    mats.sovereignArmorPrimary,
  );
  chinPlate.rotation.x = Math.PI * 0.86;
  chinPlate.position.set(0, -0.095, 0.152);
  jawPivot.add(chinPlate);

  for (let t = -4; t <= 4; t++) {
    const lFang = new THREE.Mesh(fangGeo, mats.sovereignFangBone);
    const angle = t * 0.2;
    const isCanine = Math.abs(t) === 2;
    lFang.position.set(
      Math.sin(angle) * 0.078,
      -0.008 + (isCanine ? 0.008 : 0),
      0.068 + Math.cos(angle) * 0.08,
    );
    lFang.rotation.x = -0.08;
    lFang.scale.set(isCanine ? 1.1 : 0.82, isCanine ? 1.25 : 0.85, isCanine ? 1.1 : 0.82);
    jawPivot.add(lFang);
  }

  // 8 Thick Curved Bio-Mechanical Cranial Conduits / Tendrils sweeping into collar (Ref #2!)
  for (const side of [-1, 1]) {
    for (let c = 0; c < 4; c++) {
      const zOff = -0.02 - c * 0.055;
      const spread = 0.21 + c * 0.045;
      const conduitCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * (0.17 + c * 0.01), 0.34 - c * 0.02, zOff + 0.04),
        new THREE.Vector3(side * (spread + 0.09), 0.18 - c * 0.03, zOff + 0.06),
        new THREE.Vector3(side * (spread + 0.04), -0.08 - c * 0.03, zOff + 0.1),
        new THREE.Vector3(side * (0.14 + c * 0.04), -0.26, 0.16 - c * 0.06),
      ]);
      const conduit = new THREE.Mesh(
        track(new THREE.TubeGeometry(conduitCurve, 14, 0.028 - c * 0.002, 7, false)),
        c % 2 === 0 ? mats.sovereignArmorPrimary : mats.sovereignUnderSuit,
      );
      conduit.castShadow = true;
      headPivot.add(conduit);
    }
  }

  // =========================================================================
  // 4. LAYERED BATTLE-SCARRED PAULDRONS, MUSCULAR ARMS & CLAWED ALIEN HANDS
  // =========================================================================
  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.66, 0.9, 0.02);
    torso.add(shoulder);

    // Massive layered dark-iron shoulder pauldron with short warlord spurs (Ref #2)
    const pauldronMain = new THREE.Mesh(
      track(
        new THREE.SphereGeometry(
          0.34,
          16,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.64,
        ),
      ),
      mats.sovereignArmorPrimary,
    );
    pauldronMain.scale.set(1.24, 0.94, 1.12);
    pauldronMain.position.set(side * 0.1, 0.08, 0);
    pauldronMain.rotation.z = side * -0.38;
    pauldronMain.castShadow = true;
    shoulder.add(pauldronMain);

    const pauldronSub = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.32, 0.14, 0.36)),
      mats.sovereignChestCrimson,
    );
    pauldronSub.position.set(side * 0.22, -0.06, 0);
    pauldronSub.rotation.z = side * -0.48;
    shoulder.add(pauldronSub);

    // Controlled brutal shoulder spikes (2 per pauldron — restrained, not cluttered)
    for (const spOff of [-0.08, 0.1]) {
      const spur = new THREE.Mesh(
        track(new THREE.ConeGeometry(0.042, 0.22, 5)),
        mats.sovereignArmorTrim,
      );
      spur.position.set(side * 0.22, 0.27, spOff);
      spur.rotation.z = side * -0.45;
      shoulder.add(spur);
    }

    // Muscular bicep + armored sleeve
    const upperArm = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.145, 0.12, 0.56, 12)),
      mats.sovereignSkinFace,
    );
    upperArm.position.set(side * 0.05, -0.28, 0);
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(side * 0.05, -0.56, 0.02);
    shoulder.add(elbow);

    // Heavy hydraulic armored gauntlet
    const vambrace = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.14, 0.105, 0.54, 12)),
      mats.sovereignArmorPrimary,
    );
    vambrace.position.set(0, -0.26, 0.02);
    vambrace.castShadow = true;
    elbow.add(vambrace);

    const wristBlade = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.05, 0.44, 0.16)),
      mats.sovereignArmorTrim,
    );
    wristBlade.position.set(side * 0.13, -0.26, -0.02);
    elbow.add(wristBlade);

    const wristConduit = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.032, 0.22, 0.035)),
      mats.sovereignEmissive,
    );
    wristConduit.position.set(side * 0.115, -0.26, 0.085);
    elbow.add(wristConduit);

    // Strong alien hand with 4 articulated clawed fingers
    const hand = new THREE.Group();
    hand.position.set(0, -0.56, 0.03);
    elbow.add(hand);

    const palm = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.14, 0.16, 0.1)),
      mats.sovereignArmorPrimary,
    );
    hand.add(palm);

    const clawGeo = track(new THREE.ConeGeometry(0.018, 0.14, 5));
    for (let f = 0; f < 4; f++) {
      const claw = new THREE.Mesh(clawGeo, mats.sovereignArmorTrim);
      claw.position.set(-0.048 + f * 0.032, -0.11, 0.025);
      claw.rotation.x = Math.PI + 0.25;
      hand.add(claw);
    }

    return { shoulder, elbow, hand };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // =========================================================================
  // 5. PER-VERTEX REAL-TIME BILLOWING WARLORD MANTLE
  // =========================================================================
  const capeGeo = track(new THREE.PlaneGeometry(1.9, 2.75, 14, 24));
  capeGeo.translate(0, -1.375, 0);
  const capeBasePos = new Float32Array(
    (capeGeo.attributes.position as THREE.BufferAttribute).array as Float32Array,
  );
  for (let i = 0; i < capeBasePos.length; i += 3) {
    const y = capeBasePos[i + 1];
    const t = Math.min(1, Math.max(0, -y / 2.75));
    capeBasePos[i] *= 0.5 + t * 0.85;
    capeBasePos[i + 2] = -0.22 - t * 0.42 - Math.pow(t, 2.2) * 0.25;
  }
  (capeGeo.attributes.position as THREE.BufferAttribute).copyArray(capeBasePos);
  capeGeo.computeVertexNormals();

  const capeMesh = new THREE.Mesh(capeGeo, mats.sovereignCape);
  capeMesh.position.set(0, 1.0, -0.24);
  capeMesh.castShadow = true;
  torso.add(capeMesh);

  // Dramatic warm rim-key light on face so jaw fangs, brow ridges, and battle scars read crisply!
  const visageKey = new THREE.PointLight(0xffb474, 4.6, 13, 1.5);
  visageKey.position.set(0.65, 2.95, 1.65);
  root.add(visageKey);

  const visageRimCool = new THREE.PointLight(0x6da4dc, 2.6, 12, 1.5);
  visageRimCool.position.set(-1.3, 3.05, -0.8);
  root.add(visageRimCool);

  // =========================================================================
  // 6. FULL SKELETAL ANIMATION STATE MACHINE & SMOOTH BLENDING
  // =========================================================================
  let currentState: SovereignAnimState = 'aggressive_idle';
  let roarTimer = 0;
  let lastNormalUpdate = 0;
  const headTargetWorld = new THREE.Vector3();
  const localCamPos = new THREE.Vector3();

  let walkBlend = 0;
  let roarBlend = 0;
  let combatBlend = 0;
  let gestureBlend = 0;
  let strikeBlend = 0;
  let staggerBlend = 0;

  const update = (elapsed: number, dt: number, cameraWorldPos?: THREE.Vector3) => {
    const safeDt = Math.min(dt, 0.05);
    const rate = Math.min(1, safeDt * 5.2);

    if (roarTimer > 0) {
      roarTimer = Math.max(0, roarTimer - safeDt);
      if (roarTimer === 0 && currentState === 'roar_command') {
        currentState = 'aggressive_idle';
      }
    }

    walkBlend += ((currentState === 'command_walk' ? 1 : 0) - walkBlend) * rate;
    roarBlend += ((currentState === 'roar_command' ? 1 : 0) - roarBlend) * rate;
    combatBlend += ((currentState === 'combat_stance' ? 1 : 0) - combatBlend) * rate;
    gestureBlend +=
      (((currentState === 'command_gesture' || currentState === 'cinematic_reveal') ? 1 : 0) -
        gestureBlend) *
      rate;
    strikeBlend += ((currentState === 'attack_strike' ? 1 : 0) - strikeBlend) * rate;
    staggerBlend += ((currentState === 'stagger_hit' ? 1 : 0) - staggerBlend) * rate;

    const breathe = Math.sin(elapsed * 2.0);
    const heavyBreathe = Math.sin(elapsed * 2.6);
    const stride = elapsed * 2.75;
    const stepSin = Math.sin(stride) * walkBlend;
    const stepCos = Math.cos(stride) * walkBlend;
    const strikeSwing = Math.sin(elapsed * 5.2) * strikeBlend;

    // Grounded heavy warlord stance & weight shift (no sliding)
    pelvis.position.y =
      1.56 + Math.abs(stepSin) * 0.065 + breathe * 0.016 - combatBlend * 0.09;
    pelvis.rotation.y =
      stepSin * 0.12 + combatBlend * -0.26 + strikeSwing * 0.35;
    actorPivot.position.z = Math.sin(elapsed * 0.6) * 0.22 * walkBlend;

    // Legs
    leftLeg.hip.rotation.x = stepSin * 0.38 - combatBlend * 0.22 - 0.04;
    leftLeg.knee.rotation.x = Math.max(0, -stepCos) * 0.44 + combatBlend * 0.26 + 0.05;
    rightLeg.hip.rotation.x = -stepSin * 0.38 + combatBlend * 0.18 + 0.04;
    rightLeg.knee.rotation.x = Math.max(0, stepCos) * 0.44 + combatBlend * 0.2 + 0.04;

    // Aggressive hunched warlord chest + roar arch-back
    torso.rotation.x =
      0.08 +
      heavyBreathe * 0.025 +
      combatBlend * 0.14 -
      roarBlend * 0.24 -
      staggerBlend * 0.22;
    torso.rotation.y = -stepSin * 0.14 + gestureBlend * -0.18 + strikeSwing * 0.45;

    // Left arm
    leftArm.shoulder.rotation.x =
      -stepSin * 0.28 +
      0.1 -
      roarBlend * 0.42 -
      combatBlend * 0.55;
    leftArm.shoulder.rotation.z =
      0.22 + heavyBreathe * 0.03 + roarBlend * 0.58 + combatBlend * 0.16;
    leftArm.elbow.rotation.x = -0.38 - combatBlend * 0.48 - roarBlend * 0.35;

    // Right arm (threatening command / roar / melee strike)
    const rightRaise =
      gestureBlend * (-0.98 + Math.sin(elapsed * 1.8) * 0.08) +
      roarBlend * -0.52 +
      combatBlend * -0.65 +
      strikeSwing * -1.15;
    rightArm.shoulder.rotation.x = stepSin * 0.28 + rightRaise + 0.06;
    rightArm.shoulder.rotation.z =
      -0.22 - roarBlend * 0.58 - gestureBlend * 0.28 - combatBlend * 0.14;
    rightArm.elbow.rotation.x = -0.36 - gestureBlend * 0.35 - combatBlend * 0.45 - roarBlend * 0.32;

    // Snarling jaw articulation: menacing breathing snarl + wide-open ROAR!
    jawPivot.rotation.x =
      0.08 +
      Math.max(0, heavyBreathe) * 0.07 +
      roarBlend * (0.44 + Math.sin(elapsed * 18) * 0.05) +
      strikeBlend * 0.26;

    // Natural predatory head tracking toward camera / target
    let targetHeadYaw = Math.sin(elapsed * 0.72) * 0.14;
    let targetHeadPitch = 0.04 + heavyBreathe * 0.025 - roarBlend * 0.36;

    if (cameraWorldPos && roarBlend < 0.4) {
      localCamPos.copy(cameraWorldPos);
      root.worldToLocal(localCamPos);
      const dist = localCamPos.length();
      if (dist < 48 && localCamPos.z > -1.8) {
        const desiredYaw = Math.atan2(localCamPos.x, Math.max(0.5, localCamPos.z));
        const desiredPitch = -Math.atan2(
          localCamPos.y - 2.95,
          Math.hypot(localCamPos.x, localCamPos.z),
        );
        targetHeadYaw = THREE.MathUtils.clamp(desiredYaw, -0.58, 0.58);
        targetHeadPitch = THREE.MathUtils.clamp(desiredPitch, -0.26, 0.24);
      }
    }

    headPivot.rotation.y += (targetHeadYaw - headPivot.rotation.y) * Math.min(1, safeDt * 4.2);
    headPivot.rotation.x += (targetHeadPitch - headPivot.rotation.x) * Math.min(1, safeDt * 4.2);
    headPivot.getWorldPosition(headTargetWorld);

    // Visage intensity flare during Roar
    visageKey.intensity = 4.6 + roarBlend * 3.5;

    // Real-time cloth-wave crimson war-mantle
    const posAttr = capeGeo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const windStrength = 1.0 + walkBlend * 0.45 + roarBlend * 0.85;
    for (let i = 0; i < arr.length; i += 3) {
      const bx = capeBasePos[i];
      const by = capeBasePos[i + 1];
      const bz = capeBasePos[i + 2];
      const t = Math.min(1, Math.max(0, -by / 2.75));
      const flutter =
        (Math.sin(elapsed * 3.4 - t * 5.2 + bx * 2.4) * 0.17 +
          Math.cos(elapsed * 5.2 - t * 8.0 - bx * 1.9) * 0.07) *
        t *
        t *
        windStrength;
      arr[i] = bx + Math.sin(elapsed * 1.9 - t * 2.8) * 0.14 * t * t;
      arr[i + 1] = by + Math.abs(flutter) * 0.12;
      arr[i + 2] = bz - Math.abs(flutter) * 0.36 + flutter;
    }
    posAttr.needsUpdate = true;
    if (elapsed - lastNormalUpdate > 0.05) {
      capeGeo.computeVertexNormals();
      lastNormalUpdate = elapsed;
    }
  };

  return {
    root,
    headTargetWorld,
    setState: (state) => {
      currentState = state;
      if (state === 'roar_command') roarTimer = 3.2;
    },
    getState: () => currentState,
    triggerRoar: () => {
      currentState = 'roar_command';
      roarTimer = 3.2;
    },
    update,
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of localMats) m.dispose();
    },
  };
}
