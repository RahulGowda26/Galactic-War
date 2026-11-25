import type { RegionId } from './worldConfig';

export type MaterialClass =
  | 'reinforced_titanium'
  | 'composite_glass'
  | 'ferroconcrete'
  | 'structural_steel'
  | 'alien_obsidian'
  | 'energy_conduit';

export type DamageState = 'intact' | 'damaged' | 'critical' | 'collapsed';

export type StructureCategory =
  | 'skyscraper'
  | 'bridge'
  | 'military_tower'
  | 'alien_structure'
  | 'industrial'
  | 'landmark';

export interface CollisionProxy {
  center: [number, number, number];
  halfExtents: [number, number, number];
}

export interface StructuralSection {
  sectionId: string;
  label: string;
  material: MaterialClass;
  integrityMax: number;
  currentIntegrity: number;
  damageState: DamageState;
  connectedTo: string[];
  loadBearing: boolean;
  fractureReady: boolean;
  localOffset: [number, number, number];
  dimensions: [number, number, number];
}

export interface DestructionReadyAsset {
  id: string;
  name: string;
  regionId: RegionId;
  category: StructureCategory;
  worldPosition: [number, number, number];
  collisionProxy: CollisionProxy;
  sections: StructuralSection[];
  rubbleFootprintRadius: number;
  lodDistances: [number, number, number]; // [high->med, med->low, low->cull]
  initialDamageState: DamageState;
}

export interface DestructionRegistrySummary {
  totalStructures: number;
  totalSections: number;
  fractureReadySections: number;
  byCategory: Record<StructureCategory, number>;
  byMaterial: Record<MaterialClass, number>;
  byDamageState: Record<DamageState, number>;
}

export class DestructionRegistry {
  private assets: DestructionReadyAsset[] = [];

  public register(asset: DestructionReadyAsset): void {
    this.assets.push(asset);
  }

  public getAll(): readonly DestructionReadyAsset[] {
    return this.assets;
  }

  public getByRegion(regionId: RegionId): DestructionReadyAsset[] {
    return this.assets.filter((a) => a.regionId === regionId);
  }

  public clear(): void {
    this.assets = [];
  }

  /**
   * Simulates damage state classification from normalized integrity ratio (0..1).
   */
  public static classifyDamageState(integrityRatio: number): DamageState {
    if (integrityRatio <= 0.05) return 'collapsed';
    if (integrityRatio <= 0.35) return 'critical';
    if (integrityRatio <= 0.75) return 'damaged';
    return 'intact';
  }

  /**
   * Checks structural graph integrity: verifies every connectedTo target exists inside the structure
   * and at least one foundation/loadBearing section exists.
   */
  public static validateStructureGraph(asset: DestructionReadyAsset): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const ids = new Set(asset.sections.map((s) => s.sectionId));
    if (asset.sections.length === 0) {
      errors.push(`${asset.id}: has no structural sections`);
    }
    const hasLoadBearing = asset.sections.some((s) => s.loadBearing);
    if (!hasLoadBearing) {
      errors.push(`${asset.id}: lacks load-bearing foundation section`);
    }
    for (const sec of asset.sections) {
      for (const target of sec.connectedTo) {
        if (!ids.has(target)) {
          errors.push(`${asset.id}.${sec.sectionId}: broken connection to "${target}"`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  public getSummary(): DestructionRegistrySummary {
    const byCategory: Record<StructureCategory, number> = {
      skyscraper: 0,
      bridge: 0,
      military_tower: 0,
      alien_structure: 0,
      industrial: 0,
      landmark: 0,
    };
    const byMaterial: Record<MaterialClass, number> = {
      reinforced_titanium: 0,
      composite_glass: 0,
      ferroconcrete: 0,
      structural_steel: 0,
      alien_obsidian: 0,
      energy_conduit: 0,
    };
    const byDamageState: Record<DamageState, number> = {
      intact: 0,
      damaged: 0,
      critical: 0,
      collapsed: 0,
    };

    let totalSections = 0;
    let fractureReadySections = 0;

    for (const asset of this.assets) {
      byCategory[asset.category]++;
      byDamageState[asset.initialDamageState]++;
      for (const sec of asset.sections) {
        totalSections++;
        if (sec.fractureReady) fractureReadySections++;
        byMaterial[sec.material]++;
      }
    }

    return {
      totalStructures: this.assets.length,
      totalSections,
      fractureReadySections,
      byCategory,
      byMaterial,
      byDamageState,
    };
  }
}

/**
 * Helper to create a standard multi-section vertical skyscraper destruction spec.
 */
export function buildTowerDestructionSpec(params: {
  id: string;
  name: string;
  regionId: RegionId;
  category: StructureCategory;
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  primaryMaterial: MaterialClass;
  damageState?: DamageState;
}): DestructionReadyAsset {
  const {
    id,
    name,
    regionId,
    category,
    position,
    width,
    depth,
    height,
    primaryMaterial,
    damageState = 'intact',
  } = params;

  const hBase = height * 0.25;
  const hMid = height * 0.45;
  const hCrown = height * 0.3;
  const integrityMult =
    damageState === 'intact'
      ? 1.0
      : damageState === 'damaged'
      ? 0.62
      : damageState === 'critical'
      ? 0.28
      : 0.0;

  return {
    id,
    name,
    regionId,
    category,
    worldPosition: position,
    collisionProxy: {
      center: [position[0], position[1] + height * 0.5, position[2]],
      halfExtents: [width * 0.52, height * 0.5, depth * 0.52],
    },
    rubbleFootprintRadius: Math.max(width, depth) * 0.95,
    lodDistances: [280, 720, 1850],
    initialDamageState: damageState,
    sections: [
      {
        sectionId: 'foundation_podium',
        label: 'Foundation & Podium Core',
        material: primaryMaterial,
        integrityMax: 2400,
        currentIntegrity: Math.round(2400 * Math.max(0.25, integrityMult)),
        damageState: DestructionRegistry.classifyDamageState(Math.max(0.25, integrityMult)),
        connectedTo: ['mid_shaft'],
        loadBearing: true,
        fractureReady: true,
        localOffset: [0, hBase * 0.5, 0],
        dimensions: [width, hBase, depth],
      },
      {
        sectionId: 'mid_shaft',
        label: 'Primary Structural Shaft',
        material: primaryMaterial === 'alien_obsidian' ? 'alien_obsidian' : 'structural_steel',
        integrityMax: 1800,
        currentIntegrity: Math.round(1800 * integrityMult),
        damageState,
        connectedTo: ['foundation_podium', 'upper_crown'],
        loadBearing: true,
        fractureReady: true,
        localOffset: [0, hBase + hMid * 0.5, 0],
        dimensions: [width * 0.86, hMid, depth * 0.86],
      },
      {
        sectionId: 'upper_crown',
        label: 'Upper Spire & Facade Shell',
        material: primaryMaterial === 'alien_obsidian' ? 'energy_conduit' : 'composite_glass',
        integrityMax: 1100,
        currentIntegrity: Math.round(1100 * Math.max(0, integrityMult - 0.1)),
        damageState: DestructionRegistry.classifyDamageState(Math.max(0, integrityMult - 0.1)),
        connectedTo: ['mid_shaft'],
        loadBearing: false,
        fractureReady: true,
        localOffset: [0, hBase + hMid + hCrown * 0.5, 0],
        dimensions: [width * 0.64, hCrown, depth * 0.64],
      },
    ],
  };
}
