import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CRATERS,
  INSPECTION_PRESETS,
  PLAYER_START_POS,
  REGIONS,
  REGION_LIST,
  SOVEREIGN_WORLD_POS,
  WORLD_PLAYABLE_HALF,
  getRegionWeights,
  getTerrainHeight,
  resolveHorizontalColliders,
  type WorldCollider,
} from './worldConfig';
import {
  DestructionRegistry,
  buildTowerDestructionSpec,
} from './destructionSystem';
import {
  computeFpsStats,
  evaluateRegionStreaming,
} from './streamingManager';

test('world expanded to 8km x 8km and region weights identify each region center', () => {
  assert.equal(WORLD_PLAYABLE_HALF, 4000);
  for (const r of REGION_LIST) {
    const w = getRegionWeights(r.center[0], r.center[1]);
    const sum =
      w.crown_city +
      w.ruined_district +
      w.war_plains +
      w.fallen_fleet +
      w.arrival_zone;
    assert.ok(Math.abs(sum - 1) < 1e-5, `weights must sum to 1 at ${r.id}`);
    assert.equal(w.dominant, r.id, `${r.id} should be dominant at its center`);
  }
});

test('terrain height creates elevated Arrival Citadel plateau, river valley, and outer mountain ring', () => {
  const arrivalH = getTerrainHeight(REGIONS.arrival_zone.center[0], REGIONS.arrival_zone.center[1]);
  const cityH = getTerrainHeight(REGIONS.crown_city.center[0], REGIONS.crown_city.center[1]);
  const mountainH = getTerrainHeight(5200, 0);

  assert.ok(
    arrivalH > cityH + 55,
    `Arrival Citadel plateau (${arrivalH}) must rise dramatically above Crown City (${cityH})`,
  );
  assert.ok(
    mountainH > 220,
    `Outer planetary mountain ring (${mountainH}) must frame the 8km horizon`,
  );
  assert.ok(
    Math.abs(getTerrainHeight(PLAYER_START_POS[0], PLAYER_START_POS[2]) - 18) < 2.5,
    'Player Crown City spawn boulevard must sit cleanly on the metropolitan shelf',
  );
});

test('Fallen Fleet main impact crater creates deep depression surrounded by ejecta rim', () => {
  const main = CRATERS[0];
  const centerH = getTerrainHeight(main.x, main.z);
  const rimH = getTerrainHeight(main.x + main.radius * 1.05, main.z);
  assert.ok(
    rimH > centerH + 14,
    `Crater rim (${rimH}) should rise well above crater bowl (${centerH})`,
  );
});

test('AABB collider resolution pushes player out cleanly without tunneling', () => {
  const colliders: WorldCollider[] = [
    { id: 'tower_a', minX: -10, maxX: 10, minY: 0, maxY: 120, minZ: -10, maxZ: 10 },
  ];
  const hit = resolveHorizontalColliders(10.2, 18, 0, 0.8, 1.8, colliders);
  assert.equal(hit.collided, true);
  assert.ok(hit.x >= 10.79, `Player should be pushed outside tower edge, got x=${hit.x}`);

  const clear = resolveHorizontalColliders(25, 18, 0, 0.8, 1.8, colliders);
  assert.equal(clear.collided, false);
  assert.equal(clear.x, 25);
});

test('destruction registry validates connected load-bearing graphs and tracks stats', () => {
  const reg = new DestructionRegistry();
  const spire = buildTowerDestructionSpec({
    id: 'test_spire',
    name: 'Test Spire',
    regionId: 'crown_city',
    category: 'skyscraper',
    position: [-1200, 18, -900],
    width: 34,
    depth: 34,
    height: 260,
    primaryMaterial: 'reinforced_titanium',
  });
  reg.register(spire);
  const check = DestructionRegistry.validateStructureGraph(spire);
  assert.equal(check.valid, true, check.errors.join('; '));
  const summary = reg.getSummary();
  assert.equal(summary.totalStructures, 1);
  assert.equal(summary.fractureReadySections, 3);
});

test('8km streaming manager switches LOD tiers cleanly and FPS stats compute 1% lows', () => {
  const report = evaluateRegionStreaming(
    SOVEREIGN_WORLD_POS[0],
    SOVEREIGN_WORLD_POS[2],
    1.0,
  );
  assert.equal(report.regions.arrival_zone.lodTier, 'high');
  assert.equal(report.regions.fallen_fleet.lodTier, 'distant');

  const stats = computeFpsStats([16.6, 16.7, 16.5, 33.3, 16.8, 16.6, 16.6, 16.7]);
  assert.ok(stats.avgFps >= 45 && stats.avgFps <= 60);
  assert.ok(stats.onePercentLowFps <= stats.avgFps);
});

test('all 14 inspection presets remain above terrain elevation', () => {
  assert.equal(INSPECTION_PRESETS.length, 14);
  for (const p of INSPECTION_PRESETS) {
    const gy = getTerrainHeight(p.position[0], p.position[2]);
    assert.ok(
      p.position[1] > gy - 2,
      `Preset ${p.id} (y=${p.position[1]}) should sit above terrain (gy=${gy})`,
    );
  }
});
