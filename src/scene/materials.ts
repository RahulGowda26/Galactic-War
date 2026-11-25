import * as THREE from 'three';
import type { ProceduralTexturePack } from './textures';

export interface WorldMaterialLibrary {
  cityTowerDark: THREE.MeshStandardMaterial;
  cityTowerSilver: THREE.MeshStandardMaterial;
  cityTowerLimestone: THREE.MeshStandardMaterial;
  cityGlassCyan: THREE.MeshPhysicalMaterial;
  cityTrimSteel: THREE.MeshStandardMaterial;
  cityConcretePodium: THREE.MeshStandardMaterial;
  cityAmberAccent: THREE.MeshStandardMaterial;
  cityCyanAccent: THREE.MeshStandardMaterial;
  cityParkFoliage: THREE.MeshStandardMaterial;
  roadAsphalt: THREE.MeshStandardMaterial;
  concreteBarrier: THREE.MeshStandardMaterial;
  ruinFacade: THREE.MeshStandardMaterial;
  ruinConcrete: THREE.MeshStandardMaterial;
  exposedSteel: THREE.MeshStandardMaterial;
  rubbleDark: THREE.MeshStandardMaterial;
  militaryArmor: THREE.MeshStandardMaterial;
  militaryVisor: THREE.MeshPhysicalMaterial;
  weaponGunmetal: THREE.MeshStandardMaterial;
  scorchedHull: THREE.MeshStandardMaterial;
  alienObsidian: THREE.MeshPhysicalMaterial;
  alienHullDark: THREE.MeshStandardMaterial;
  alienEnergyAmber: THREE.MeshStandardMaterial;
  alienEnergyCyan: THREE.MeshStandardMaterial;
  enemyAlienArmor: THREE.MeshPhysicalMaterial;
  enemyAlienEmissive: THREE.MeshStandardMaterial;
  fireCore: THREE.MeshBasicMaterial;
  hologramMat: THREE.MeshBasicMaterial;
  sovereignArmorPrimary: THREE.MeshPhysicalMaterial;
  sovereignArmorTrim: THREE.MeshPhysicalMaterial;
  sovereignChestCrimson: THREE.MeshPhysicalMaterial;
  sovereignUnderSuit: THREE.MeshStandardMaterial;
  sovereignSkinFace: THREE.MeshStandardMaterial;
  sovereignFangBone: THREE.MeshStandardMaterial;
  sovereignCape: THREE.MeshPhysicalMaterial;
  sovereignEmissive: THREE.MeshStandardMaterial;
  alienVoidChitin: THREE.MeshPhysicalMaterial;
  alienBruteHide: THREE.MeshStandardMaterial;
  alienEliteCrimson: THREE.MeshPhysicalMaterial;
  emergencyRedGlow: THREE.MeshStandardMaterial;
  valkyrieHullWhite: THREE.MeshPhysicalMaterial;
  valkyrieHullDark: THREE.MeshStandardMaterial;
  valkyrieCanopyGlass: THREE.MeshPhysicalMaterial;
  valkyrieThrusterCyan: THREE.MeshStandardMaterial;
  dreadnoughtCrimsonHull: THREE.MeshStandardMaterial;
  contactShadowMat: THREE.MeshBasicMaterial;
  // Phase 4: Realistic Soldier Protagonist & Orbital Asteroid Materials
  soldierSkin: THREE.MeshStandardMaterial;
  soldierNeckSkin: THREE.MeshStandardMaterial;
  soldierHair: THREE.MeshPhysicalMaterial;
  soldierPlateCarrier: THREE.MeshStandardMaterial;
  soldierArmorOlive: THREE.MeshStandardMaterial;
  soldierFabric: THREE.MeshStandardMaterial;
  soldierBootRubber: THREE.MeshStandardMaterial;
  asteroidRock: THREE.MeshStandardMaterial;
  asteroidIronOre: THREE.MeshStandardMaterial;
  // Phase 5: Kael Voss Graphite Spec-Ops + Capital Ship Subsystems
  kaelHelmetVisor: THREE.MeshPhysicalMaterial;
  kaelTrimAccent: THREE.MeshStandardMaterial;
  subsystemShieldMat: THREE.MeshStandardMaterial;
  subsystemEngineMat: THREE.MeshStandardMaterial;
  subsystemWeaponMat: THREE.MeshStandardMaterial;
  friendlyCarrierMat: THREE.MeshStandardMaterial;
  // AAA Space Redesign: Realistic Military Aerospace & Warship Materials
  playerHullPrimary: THREE.MeshPhysicalMaterial;
  playerHullDarkComposite: THREE.MeshStandardMaterial;
  playerHullCrimsonTrim: THREE.MeshStandardMaterial;
  thrusterNozzleMetal: THREE.MeshStandardMaterial;
  enemyWarshipArmor: THREE.MeshStandardMaterial;
  enemyMediumArmor: THREE.MeshStandardMaterial;
  enemyFighterArmor: THREE.MeshStandardMaterial;
  asteroidBasalt: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createWorldMaterials(
  tex: ProceduralTexturePack,
): WorldMaterialLibrary {
  const all: THREE.Material[] = [];
  const reg = <T extends THREE.Material>(m: T): T => {
    all.push(m);
    return m;
  };

  // Dark storm-lit curtain-wall steel & reflective glass skyscraper (Phase 3 Darkness Rising)
  const cityTowerDark = reg(
    new THREE.MeshStandardMaterial({
      color: 0x5c6678,
      map: tex.cityGlassAlbedo,
      normalMap: tex.cityGlassNormal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughnessMap: tex.cityGlassRoughness,
      roughness: 0.68,
      metalness: 0.62,
      emissive: 0xff9248,
      emissiveMap: tex.cityGlassEmissive,
      emissiveIntensity: 0.42,
      envMapIntensity: 1.05,
    }),
  );

  // Dark weathered silver-steel corporate facade under storm lightning
  const cityTowerSilver = reg(
    new THREE.MeshStandardMaterial({
      color: 0x6a7688,
      map: tex.cityGlassAlbedo,
      normalMap: tex.cityGlassNormal,
      normalScale: new THREE.Vector2(1.05, 1.05),
      roughnessMap: tex.cityGlassRoughness,
      roughness: 0.56,
      metalness: 0.72,
      emissive: 0x9ac4ee,
      emissiveMap: tex.cityGlassEmissive,
      emissiveIntensity: 0.24,
      envMapIntensity: 1.1,
    }),
  );

  // Soot-darkened carved limestone & recessed glass urban skyscraper
  const cityTowerLimestone = reg(
    new THREE.MeshStandardMaterial({
      color: 0x64676e,
      map: tex.cityStoneAlbedo,
      normalMap: tex.cityStoneNormal,
      normalScale: new THREE.Vector2(1.4, 1.4),
      roughnessMap: tex.cityStoneRoughness,
      roughness: 0.88,
      metalness: 0.16,
      envMapIntensity: 0.72,
    }),
  );

  const cityGlassCyan = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x263848,
      roughness: 0.14,
      metalness: 0.42,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.25,
    }),
  );

  const cityTrimSteel = reg(
    new THREE.MeshStandardMaterial({
      color: 0x3b424d,
      normalMap: tex.obsidianNormal,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 0.42,
      metalness: 0.8,
      envMapIntensity: 1.0,
    }),
  );

  const cityConcretePodium = reg(
    new THREE.MeshStandardMaterial({
      color: 0x45484f,
      normalMap: tex.terrainNormal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.9,
      metalness: 0.08,
    }),
  );

  // Restrained architectural accent lighting (no neon overkill)
  const cityAmberAccent = reg(
    new THREE.MeshStandardMaterial({
      color: 0xe6a85c,
      emissive: 0xd98432,
      emissiveIntensity: 1.15,
      roughness: 0.3,
      metalness: 0.2,
    }),
  );

  const cityCyanAccent = reg(
    new THREE.MeshStandardMaterial({
      color: 0x8ad9f5,
      emissive: 0x45b2dc,
      emissiveIntensity: 1.1,
      roughness: 0.28,
      metalness: 0.18,
    }),
  );

  const cityParkFoliage = reg(
    new THREE.MeshStandardMaterial({
      color: 0x3b4f3a,
      roughness: 0.9,
      metalness: 0.02,
    }),
  );

  const roadAsphalt = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.roadAlbedo,
      normalMap: tex.roadNormal,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughness: 0.86,
      metalness: 0.08,
    }),
  );

  const concreteBarrier = reg(
    new THREE.MeshStandardMaterial({
      color: 0x7c7a74,
      normalMap: tex.terrainNormal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.92,
      metalness: 0.05,
    }),
  );

  // Devastated shattered concrete facade (ZERO emissive polka dots!)
  const ruinFacade = reg(
    new THREE.MeshStandardMaterial({
      color: 0xc8c3bc,
      map: tex.ruinFacadeAlbedo,
      normalMap: tex.ruinFacadeNormal,
      normalScale: new THREE.Vector2(1.4, 1.4),
      roughness: 0.92,
      metalness: 0.08,
    }),
  );

  const ruinConcrete = reg(
    new THREE.MeshStandardMaterial({
      color: 0x5c5854,
      normalMap: tex.terrainNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.94,
      metalness: 0.06,
    }),
  );

  const exposedSteel = reg(
    new THREE.MeshStandardMaterial({
      color: 0x4a3f39,
      roughness: 0.56,
      metalness: 0.82,
    }),
  );

  const rubbleDark = reg(
    new THREE.MeshStandardMaterial({
      color: 0x46423f,
      normalMap: tex.terrainNormal,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: 0.95,
      metalness: 0.06,
    }),
  );

  // Playable Human Vanguard Tactical Armor
  const militaryArmor = reg(
    new THREE.MeshStandardMaterial({
      color: 0x4d564c,
      normalMap: tex.sovereignArmorNormal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.62,
      metalness: 0.38,
    }),
  );

  const militaryVisor = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x2a455a,
      emissive: 0x163850,
      emissiveIntensity: 0.4,
      roughness: 0.14,
      metalness: 0.8,
      clearcoat: 1.0,
    }),
  );

  const weaponGunmetal = reg(
    new THREE.MeshStandardMaterial({
      color: 0x2b2f36,
      roughness: 0.36,
      metalness: 0.86,
    }),
  );

  const scorchedHull = reg(
    new THREE.MeshStandardMaterial({
      color: 0x30343c,
      normalMap: tex.obsidianNormal,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.52,
      metalness: 0.72,
    }),
  );

  // Alien Fortress Obsidian Architecture
  const alienObsidian = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x20242c,
      map: tex.obsidianAlbedo,
      normalMap: tex.obsidianNormal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughness: 0.28,
      metalness: 0.86,
      clearcoat: 0.65,
      clearcoatRoughness: 0.24,
      envMapIntensity: 1.35,
    }),
  );

  const alienHullDark = reg(
    new THREE.MeshStandardMaterial({
      color: 0x313642,
      normalMap: tex.obsidianNormal,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughness: 0.38,
      metalness: 0.82,
    }),
  );

  const alienEnergyAmber = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffab4a,
      emissive: 0xff6b1c,
      emissiveIntensity: 2.1,
      roughness: 0.22,
      metalness: 0.1,
    }),
  );

  const alienEnergyCyan = reg(
    new THREE.MeshStandardMaterial({
      color: 0x6de4ff,
      emissive: 0x2cbce6,
      emissiveIntensity: 1.9,
      roughness: 0.2,
      metalness: 0.1,
    }),
  );

  // Hostile Alien Shock-Trooper Materials
  const enemyAlienArmor = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x252834,
      normalMap: tex.sovereignArmorNormal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughness: 0.3,
      metalness: 0.88,
      clearcoat: 0.55,
    }),
  );

  const enemyAlienEmissive = reg(
    new THREE.MeshStandardMaterial({
      color: 0xff6a3c,
      emissive: 0xff3c18,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.1,
    }),
  );

  const fireCore = reg(
    new THREE.MeshBasicMaterial({
      color: 0xff8c2e,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const hologramMat = reg(
    new THREE.MeshBasicMaterial({
      map: tex.hologramSign,
      transparent: true,
      opacity: 0.84,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  // THE SOVEREIGN — weathered dark gunmetal-obsidian carapace + battle-scarred crimson war-plates
  const sovereignArmorPrimary = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x2b323d,
      normalMap: tex.obsidianNormal,
      normalScale: new THREE.Vector2(0.68, 0.68),
      roughnessMap: tex.sovereignArmorRoughness,
      roughness: 0.38,
      metalness: 0.84,
      clearcoat: 0.45,
      clearcoatRoughness: 0.28,
      envMapIntensity: 1.4,
    }),
  );

  const sovereignArmorTrim = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x666d78,
      normalMap: tex.obsidianNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.3,
      metalness: 0.88,
      clearcoat: 0.5,
      clearcoatRoughness: 0.22,
      envMapIntensity: 1.5,
    }),
  );

  const sovereignChestCrimson = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x7e211b,
      normalMap: tex.obsidianNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: tex.sovereignArmorRoughness,
      roughness: 0.44,
      metalness: 0.62,
      clearcoat: 0.35,
      clearcoatRoughness: 0.32,
      envMapIntensity: 1.2,
    }),
  );

  const sovereignUnderSuit = reg(
    new THREE.MeshStandardMaterial({
      color: 0x161920,
      normalMap: tex.obsidianNormal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.72,
      metalness: 0.34,
    }),
  );

  const sovereignSkinFace = reg(
    new THREE.MeshStandardMaterial({
      color: 0x424854,
      normalMap: tex.terrainNormal,
      normalScale: new THREE.Vector2(0.88, 0.88),
      roughness: 0.52,
      metalness: 0.36,
      envMapIntensity: 1.15,
    }),
  );

  const sovereignFangBone = reg(
    new THREE.MeshStandardMaterial({
      color: 0xc8b288,
      roughness: 0.4,
      metalness: 0.1,
    }),
  );

  const sovereignCape = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x521116,
      normalMap: tex.sovereignCapeNormal,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughness: 0.84,
      metalness: 0.06,
      sheen: 0.75,
      sheenRoughness: 0.52,
      sheenColor: new THREE.Color(0x9e242c),
      side: THREE.DoubleSide,
    }),
  );

  const sovereignEmissive = reg(
    new THREE.MeshStandardMaterial({
      color: 0xff6b1e,
      emissive: 0xff3608,
      emissiveIntensity: 3.1,
      roughness: 0.16,
      metalness: 0.08,
    }),
  );

  // Phase 3 Distinct Alien Species Materials
  const alienVoidChitin = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x151822,
      normalMap: tex.obsidianNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.2,
      metalness: 0.74,
      clearcoat: 0.95,
      clearcoatRoughness: 0.14,
    }),
  );

  const alienBruteHide = reg(
    new THREE.MeshStandardMaterial({
      color: 0x433b39,
      normalMap: tex.terrainNormal,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughness: 0.78,
      metalness: 0.18,
    }),
  );

  const alienEliteCrimson = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x6e1920,
      normalMap: tex.sovereignArmorNormal,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.28,
      metalness: 0.84,
      clearcoat: 0.65,
    }),
  );

  const emergencyRedGlow = reg(
    new THREE.MeshStandardMaterial({
      color: 0xff3b2f,
      emissive: 0xe61e12,
      emissiveIntensity: 2.4,
      roughness: 0.25,
      metalness: 0.1,
    }),
  );

  // VX-94 Valkyrie Interceptor & Orbital Capital Ship Materials (Ref #4)
  const valkyrieHullWhite = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0xcfd6de,
      map: tex.sovereignArmorAlbedo,
      normalMap: tex.sovereignArmorNormal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.36,
      metalness: 0.72,
      clearcoat: 0.55,
      clearcoatRoughness: 0.22,
    }),
  );

  const valkyrieHullDark = reg(
    new THREE.MeshStandardMaterial({
      color: 0x262c36,
      normalMap: tex.obsidianNormal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.4,
      metalness: 0.85,
    }),
  );

  const valkyrieCanopyGlass = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x1d3448,
      roughness: 0.08,
      metalness: 0.25,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.76,
    }),
  );

  const valkyrieThrusterCyan = reg(
    new THREE.MeshStandardMaterial({
      color: 0x7be8ff,
      emissive: 0x24c6ff,
      emissiveIntensity: 2.8,
      roughness: 0.15,
      metalness: 0.1,
    }),
  );

  const dreadnoughtCrimsonHull = reg(
    new THREE.MeshStandardMaterial({
      color: 0x4b1d20,
      map: tex.enemyWarshipAlbedo,
      normalMap: tex.enemyWarshipNormal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughness: 0.44,
      metalness: 0.72,
      envMapIntensity: 1.15,
    }),
  );

  const contactShadowMat = reg(
    new THREE.MeshBasicMaterial({
      map: tex.contactShadow,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );

  // Phase 4: Realistic Adult Male Soldier Protagonist PBR Material Separation
  const soldierSkin = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.soldierFaceAlbedo,
      normalMap: tex.soldierFaceNormal,
      normalScale: new THREE.Vector2(0.82, 0.82),
      roughnessMap: tex.soldierFaceRoughness,
      roughness: 0.64,
      metalness: 0.03,
      envMapIntensity: 0.82,
    }),
  );

  const soldierNeckSkin = reg(
    new THREE.MeshStandardMaterial({
      color: 0xb18266,
      normalMap: tex.soldierFaceNormal,
      normalScale: new THREE.Vector2(0.25, 0.25),
      roughness: 0.68,
      metalness: 0.02,
    }),
  );

  const soldierHair = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x1c1714,
      normalMap: tex.sovereignCapeNormal,
      normalScale: new THREE.Vector2(0.42, 0.42),
      roughness: 0.52,
      metalness: 0.06,
      sheen: 0.55,
      sheenRoughness: 0.45,
      sheenColor: new THREE.Color(0x4b3f37),
    }),
  );

  const soldierPlateCarrier = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.soldierVestAlbedo,
      normalMap: tex.soldierVestNormal,
      normalScale: new THREE.Vector2(1.12, 1.12),
      roughnessMap: tex.soldierVestRoughness,
      roughness: 0.46,
      metalness: 0.48,
      envMapIntensity: 1.08,
    }),
  );

  // Phase 5 Kael Voss Signature Dark Graphite Titanium Combat Armor
  const soldierArmorOlive = reg(
    new THREE.MeshStandardMaterial({
      color: 0x2b313a,
      normalMap: tex.soldierVestNormal,
      normalScale: new THREE.Vector2(0.62, 0.62),
      roughness: 0.42,
      metalness: 0.56,
      envMapIntensity: 1.12,
    }),
  );

  const soldierFabric = reg(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.soldierFabricAlbedo,
      normalMap: tex.soldierFabricNormal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughness: 0.88,
      metalness: 0.04,
      envMapIntensity: 0.65,
    }),
  );

  const soldierBootRubber = reg(
    new THREE.MeshStandardMaterial({
      color: 0x1b1d20,
      normalMap: tex.terrainNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.78,
      metalness: 0.08,
    }),
  );

  // Phase 4 / Art Redesign: Dry Geological Orbital Asteroids with baked vertex cavity AO
  const asteroidRock = reg(
    new THREE.MeshStandardMaterial({
      color: 0xb2a89d,
      map: tex.asteroidRockAlbedo,
      normalMap: tex.asteroidRockNormal,
      normalScale: new THREE.Vector2(1.55, 1.55),
      roughnessMap: tex.asteroidRockRoughness,
      roughness: 0.96,
      metalness: 0.04,
      vertexColors: true,
      envMapIntensity: 0.30,
    }),
  );

  const asteroidIronOre = reg(
    new THREE.MeshStandardMaterial({
      color: 0x86848a,
      map: tex.asteroidRockAlbedo,
      normalMap: tex.asteroidRockNormal,
      normalScale: new THREE.Vector2(1.6, 1.6),
      roughnessMap: tex.asteroidRockRoughness,
      roughness: 0.86,
      metalness: 0.22,
      vertexColors: true,
      envMapIntensity: 0.42,
    }),
  );

  // Phase 5: Kael Voss Tactical Visor, Gunmetal-Bronze Trim & Space Capital Subsystems
  const kaelHelmetVisor = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x182b3b,
      emissive: 0x0c2438,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.45,
    }),
  );

  const kaelTrimAccent = reg(
    new THREE.MeshStandardMaterial({
      color: 0x8f5936,
      roughness: 0.44,
      metalness: 0.65,
      envMapIntensity: 1.05,
    }),
  );

  const subsystemShieldMat = reg(
    new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      emissive: 0x3b82f6,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.3,
    }),
  );

  const subsystemEngineMat = reg(
    new THREE.MeshStandardMaterial({
      color: 0x38f2d4,
      emissive: 0x14b8a6,
      emissiveIntensity: 2.4,
      roughness: 0.18,
      metalness: 0.2,
    }),
  );

  const subsystemWeaponMat = reg(
    new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      emissive: 0xea3c12,
      emissiveIntensity: 2.3,
      roughness: 0.24,
      metalness: 0.4,
    }),
  );

  const friendlyCarrierMat = reg(
    new THREE.MeshStandardMaterial({
      color: 0x6b7888,
      map: tex.shipHullAlbedo,
      normalMap: tex.shipHullNormal,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughnessMap: tex.shipHullRoughness,
      roughness: 0.42,
      metalness: 0.74,
      envMapIntensity: 1.15,
    }),
  );

  // AAA Space Redesign: Brushed ceramic-titanium starfighter hull with strong roughness contrast
  const playerHullPrimary = reg(
    new THREE.MeshPhysicalMaterial({
      color: 0x8e99a8,
      map: tex.shipHullAlbedo,
      normalMap: tex.shipHullNormal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughnessMap: tex.shipHullRoughness,
      roughness: 0.34,
      metalness: 0.78,
      clearcoat: 0.34,
      clearcoatRoughness: 0.24,
      envMapIntensity: 1.42,
    }),
  );

  const playerHullDarkComposite = reg(
    new THREE.MeshStandardMaterial({
      color: 0x242a34,
      map: tex.shipHullAlbedo,
      normalMap: tex.shipHullNormal,
      normalScale: new THREE.Vector2(0.88, 0.88),
      roughnessMap: tex.shipHullRoughness,
      roughness: 0.68,
      metalness: 0.42,
      envMapIntensity: 0.95,
    }),
  );

  const playerHullCrimsonTrim = reg(
    new THREE.MeshStandardMaterial({
      color: 0x9c2824,
      map: tex.shipHullAlbedo,
      normalMap: tex.shipHullNormal,
      normalScale: new THREE.Vector2(0.62, 0.62),
      roughness: 0.46,
      metalness: 0.44,
      envMapIntensity: 1.0,
    }),
  );

  const thrusterNozzleMetal = reg(
    new THREE.MeshStandardMaterial({
      color: 0x454e5d,
      normalMap: tex.enemyWarshipNormal,
      normalScale: new THREE.Vector2(0.72, 0.72),
      roughness: 0.22,
      metalness: 0.94,
      envMapIntensity: 1.5,
    }),
  );

  // Class A Capital Warship layered steel armor
  const enemyWarshipArmor = reg(
    new THREE.MeshStandardMaterial({
      color: 0x848e9c,
      map: tex.enemyWarshipAlbedo,
      normalMap: tex.enemyWarshipNormal,
      normalScale: new THREE.Vector2(1.42, 1.42),
      roughness: 0.46,
      metalness: 0.76,
      envMapIntensity: 1.22,
    }),
  );

  // Class B Medium Warship stealth gunmetal plating
  const enemyMediumArmor = reg(
    new THREE.MeshStandardMaterial({
      color: 0x424a58,
      map: tex.enemyWarshipAlbedo,
      normalMap: tex.enemyWarshipNormal,
      normalScale: new THREE.Vector2(1.32, 1.32),
      roughness: 0.36,
      metalness: 0.84,
      envMapIntensity: 1.32,
    }),
  );

  // Class C Standard Fighter matte dark carbon-steel hull
  const enemyFighterArmor = reg(
    new THREE.MeshStandardMaterial({
      color: 0x3a414e,
      map: tex.enemyWarshipAlbedo,
      normalMap: tex.enemyWarshipNormal,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughness: 0.42,
      metalness: 0.8,
      envMapIntensity: 1.25,
    }),
  );

  // Dark carbonaceous basalt asteroid rock variant with vertex cavity AO
  const asteroidBasalt = reg(
    new THREE.MeshStandardMaterial({
      color: 0x6c6762,
      map: tex.asteroidRockAlbedo,
      normalMap: tex.asteroidRockNormal,
      normalScale: new THREE.Vector2(1.65, 1.65),
      roughnessMap: tex.asteroidRockRoughness,
      roughness: 0.96,
      metalness: 0.05,
      vertexColors: true,
      envMapIntensity: 0.26,
    }),
  );

  return {
    cityTowerDark,
    cityTowerSilver,
    cityTowerLimestone,
    cityGlassCyan,
    cityTrimSteel,
    cityConcretePodium,
    cityAmberAccent,
    cityCyanAccent,
    cityParkFoliage,
    roadAsphalt,
    concreteBarrier,
    ruinFacade,
    ruinConcrete,
    exposedSteel,
    rubbleDark,
    militaryArmor,
    militaryVisor,
    weaponGunmetal,
    scorchedHull,
    alienObsidian,
    alienHullDark,
    alienEnergyAmber,
    alienEnergyCyan,
    enemyAlienArmor,
    enemyAlienEmissive,
    fireCore,
    hologramMat,
    sovereignArmorPrimary,
    sovereignArmorTrim,
    sovereignChestCrimson,
    sovereignUnderSuit,
    sovereignSkinFace,
    sovereignFangBone,
    sovereignCape,
    sovereignEmissive,
    alienVoidChitin,
    alienBruteHide,
    alienEliteCrimson,
    emergencyRedGlow,
    valkyrieHullWhite,
    valkyrieHullDark,
    valkyrieCanopyGlass,
    valkyrieThrusterCyan,
    dreadnoughtCrimsonHull,
    contactShadowMat,
    soldierSkin,
    soldierNeckSkin,
    soldierHair,
    soldierPlateCarrier,
    soldierArmorOlive,
    soldierFabric,
    soldierBootRubber,
    asteroidRock,
    asteroidIronOre,
    kaelHelmetVisor,
    kaelTrimAccent,
    subsystemShieldMat,
    subsystemEngineMat,
    subsystemWeaponMat,
    friendlyCarrierMat,
    playerHullPrimary,
    playerHullDarkComposite,
    playerHullCrimsonTrim,
    thrusterNozzleMetal,
    enemyWarshipArmor,
    enemyMediumArmor,
    enemyFighterArmor,
    asteroidBasalt,
    dispose: () => {
      for (const m of all) m.dispose();
    },
  };
}
