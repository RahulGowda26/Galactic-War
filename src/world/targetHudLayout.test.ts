import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHudExclusionZones,
  classifyTargetInfoTier,
  estimateProjectedSilhouetteRadius,
  isTargetOccludedBySpheres,
  layoutEnemyTargetIndicators,
  makeCenterRect,
  rectOverlapArea,
  type TargetHudCandidate,
  type TargetHudViewportContext,
} from './targetHudLayout';

const DESKTOP_CTX: TargetHudViewportContext = {
  viewportWidth: 1440,
  viewportHeight: 900,
  fovDeg: 62,
  isTouchMode: false,
  isCompactPhone: false,
  orientation: 'landscape',
  cameraMode: 'chase',
  hasCapitalPanel: false,
};

const MOBILE_PORTRAIT_CTX: TargetHudViewportContext = {
  viewportWidth: 390,
  viewportHeight: 844,
  fovDeg: 62,
  isTouchMode: true,
  isCompactPhone: true,
  orientation: 'portrait',
  cameraMode: 'chase',
  hasCapitalPanel: false,
};

function makeCandidate(overrides: Partial<TargetHudCandidate> = {}): TargetHudCandidate {
  return {
    id: 'enemy-1',
    name: 'Void Interceptor',
    role: 'interceptor',
    shipClass: 'fighter',
    threatLevel: 'standard',
    anchorX: 0.42,
    anchorY: 0.36,
    inFront: true,
    distanceMeters: 220,
    worldRadiusMeters: 9.5,
    shieldPct: 80,
    hullPct: 95,
    hasShields: true,
    isTargeted: false,
    isAttacking: false,
    wasRecentlyHit: false,
    justDestroyed: false,
    isOccluded: false,
    lockProgress: 0,
    ...overrides,
  };
}

test('three information tiers differentiate distant unselected, active combat, targeted, and capital ship', () => {
  const distantUnselected = makeCandidate({ distanceMeters: 2100, hullPct: 100, shieldPct: 100 });
  assert.equal(classifyTargetInfoTier(distantUnselected, DESKTOP_CTX), 'minimal');

  const nearbyAttacking = makeCandidate({ distanceMeters: 420, isAttacking: true });
  assert.equal(classifyTargetInfoTier(nearbyAttacking, DESKTOP_CTX), 'compact_combat');

  const occludedUnselected = makeCandidate({ distanceMeters: 420, isAttacking: true, isOccluded: true });
  assert.equal(classifyTargetInfoTier(occludedUnselected, DESKTOP_CTX), 'minimal');

  const targetedElite = makeCandidate({
    role: 'elite_ace',
    threatLevel: 'elite',
    isTargeted: true,
    distanceMeters: 620,
  });
  assert.equal(classifyTargetInfoTier(targetedElite, DESKTOP_CTX), 'targeted');

  const capital = makeCandidate({
    shipClass: 'capital',
    threatLevel: 'capital',
    name: 'Alien Siege Frigate Vor-02',
    distanceMeters: 2400,
    worldRadiusMeters: 165,
  });
  assert.equal(classifyTargetInfoTier(capital, DESKTOP_CTX), 'capital_anchor');
});

test('floating label strictly clears enemy silhouette and leader line starts outside ship body', () => {
  const nearbyTargeted = makeCandidate({
    id: 'ace-1',
    name: 'Sovereign Elite Ace',
    role: 'elite_ace',
    threatLevel: 'elite',
    anchorX: 0.38,
    anchorY: 0.36,
    distanceMeters: 95,
    worldRadiusMeters: 11.5,
    isTargeted: true,
    lockProgress: 1.0,
  });

  const { markers } = layoutEnemyTargetIndicators([nearbyTargeted], DESKTOP_CTX);
  assert.equal(markers.length, 1);
  const m = markers[0];
  assert.equal(m.tier, 'targeted');
  assert.equal(m.showName, true);
  assert.equal(m.showBars, true);
  assert.equal(m.showThreat, true);
  assert.equal(m.showLeaderLine, true);

  const silRect = makeCenterRect(m.anchorX, m.anchorY, m.silhouetteRadiusX, m.silhouetteRadiusY);
  const labelRect = makeCenterRect(
    m.labelX,
    m.labelY,
    (m.labelWidthPx * 0.5) / DESKTOP_CTX.viewportWidth,
    (m.labelHeightPx * 0.5) / DESKTOP_CTX.viewportHeight,
  );
  assert.equal(
    rectOverlapArea(silRect, labelRect),
    0,
    'floating telemetry box must never overlap the spacecraft silhouette',
  );

  // Leader line start point must lie strictly outside the ship silhouette radius
  const startDistNorm = Math.hypot(
    (m.leaderFromX - m.anchorX) / Math.max(0.001, m.silhouetteRadiusX),
    (m.leaderFromY - m.anchorY) / Math.max(0.001, m.silhouetteRadiusY),
  );
  assert.ok(
    startDistNorm >= 0.99,
    `leader start must be outside ship perimeter, got normalized radius ${startDistNorm}`,
  );
});

test('overlapping enemy cluster fans out labels cleanly without label-to-label or ship collisions', () => {
  const cluster: TargetHudCandidate[] = [
    makeCandidate({ id: 'c1', anchorX: 0.34, anchorY: 0.36, distanceMeters: 240, isTargeted: true, role: 'elite_ace', threatLevel: 'elite' }),
    makeCandidate({ id: 'c2', anchorX: 0.36, anchorY: 0.38, distanceMeters: 260, isAttacking: true }),
    makeCandidate({ id: 'c3', anchorX: 0.33, anchorY: 0.40, distanceMeters: 290, isAttacking: true }),
    makeCandidate({ id: 'c4', anchorX: 0.38, anchorY: 0.34, distanceMeters: 310, wasRecentlyHit: true }),
  ];

  const { markers } = layoutEnemyTargetIndicators(cluster, DESKTOP_CTX);
  assert.equal(markers.length, 4);

  const boxes = markers
    .filter((m) => m.tier !== 'minimal')
    .map((m) =>
      makeCenterRect(
        m.labelX,
        m.labelY,
        (m.labelWidthPx * 0.5) / DESKTOP_CTX.viewportWidth,
        (m.labelHeightPx * 0.5) / DESKTOP_CTX.viewportHeight,
      ),
    );

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      assert.equal(
        rectOverlapArea(boxes[i], boxes[j]),
        0,
        `clustered markers ${i} and ${j} must not overlap`,
      );
    }
  }
});

test('labels avoid center crosshair, player ship silhouette, and mobile touchscreen controls', () => {
  const onCrosshair = makeCandidate({
    id: 'center-hostile',
    anchorX: 0.5,
    anchorY: 0.5,
    distanceMeters: 300,
    isTargeted: true,
  });

  const desktopRes = layoutEnemyTargetIndicators([onCrosshair], DESKTOP_CTX);
  const dm = desktopRes.markers[0];
  const dLabel = makeCenterRect(
    dm.labelX,
    dm.labelY,
    (dm.labelWidthPx * 0.5) / DESKTOP_CTX.viewportWidth,
    (dm.labelHeightPx * 0.5) / DESKTOP_CTX.viewportHeight,
  );
  const crosshairRect = { left: 0.455, top: 0.445, right: 0.545, bottom: 0.555 };
  assert.equal(rectOverlapArea(dLabel, crosshairRect), 0, 'targeted callout must clear center crosshair');

  // Mobile portrait enemy near bottom touch area must push label above joystick/fire zone
  const lowMobileTarget = makeCandidate({
    id: 'low-mobile',
    anchorX: 0.72,
    anchorY: 0.68,
    distanceMeters: 350,
    isTargeted: true,
  });
  const mobRes = layoutEnemyTargetIndicators([lowMobileTarget], MOBILE_PORTRAIT_CTX);
  const mm = mobRes.markers[0];
  const mLabel = makeCenterRect(
    mm.labelX,
    mm.labelY,
    (mm.labelWidthPx * 0.5) / MOBILE_PORTRAIT_CTX.viewportWidth,
    (mm.labelHeightPx * 0.5) / MOBILE_PORTRAIT_CTX.viewportHeight,
  );
  const { safeBounds } = buildHudExclusionZones(MOBILE_PORTRAIT_CTX);
  assert.ok(
    mLabel.bottom <= safeBounds.bottom + 0.005,
    `mobile label bottom (${mLabel.bottom}) must stay above touch controls (${safeBounds.bottom})`,
  );
});

test('temporal smoothing damps fast movement without allowing enemy silhouette to overtake label', () => {
  const frame1 = makeCandidate({ id: 'fast-1', anchorX: 0.30, anchorY: 0.36, distanceMeters: 160, isTargeted: true });
  const r1 = layoutEnemyTargetIndicators([frame1], DESKTOP_CTX, {}, 0.016);

  // Enemy zips right rapidly in next frame
  const frame2 = makeCandidate({ id: 'fast-1', anchorX: 0.42, anchorY: 0.36, distanceMeters: 160, isTargeted: true });
  const r2 = layoutEnemyTargetIndicators([frame2], DESKTOP_CTX, r1.nextState, 0.016);

  const m2 = r2.markers[0];
  const silRect = makeCenterRect(m2.anchorX, m2.anchorY, m2.silhouetteRadiusX, m2.silhouetteRadiusY);
  const labelRect = makeCenterRect(
    m2.labelX,
    m2.labelY,
    (m2.labelWidthPx * 0.5) / DESKTOP_CTX.viewportWidth,
    (m2.labelHeightPx * 0.5) / DESKTOP_CTX.viewportHeight,
  );
  assert.equal(rectOverlapArea(silRect, labelRect), 0, 'fast-moving fighter must never overtake smoothed label');
});

test('asteroid occlusion detects blocked line of sight and behind-camera enemy yields edge chevron', () => {
  const asteroid = [{ x: 0, y: 0, z: -200, radius: 55 }];
  assert.equal(
    isTargetOccludedBySpheres({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -450 }, asteroid),
    true,
  );
  assert.equal(
    isTargetOccludedBySpheres({ x: 0, y: 0, z: 0 }, { x: 140, y: 0, z: -450 }, asteroid),
    false,
  );

  const behindTarget = makeCandidate({
    id: 'behind-1',
    anchorX: 0.72,
    anchorY: 0.45,
    inFront: false,
    isTargeted: true,
    distanceMeters: 480,
  });
  const res = layoutEnemyTargetIndicators([behindTarget], DESKTOP_CTX);
  assert.equal(res.markers.length, 0);
  assert.equal(res.offscreen.length, 1);
  assert.ok(res.offscreen[0].edgeX >= 0.04 && res.offscreen[0].edgeX <= 0.96);
  assert.ok(res.offscreen[0].edgeY >= 0.1 && res.offscreen[0].edgeY <= 0.85);

  // Projected radius grows as distance shrinks
  const nearR = estimateProjectedSilhouetteRadius(9.5, 90, 62, 1440, 900);
  const farR = estimateProjectedSilhouetteRadius(9.5, 900, 62, 1440, 900);
  assert.ok(nearR.ry > farR.ry * 2.5);
});

test('Enemy Information Display modes (FULL / MINIMAL / OFF) keep living ships unobstructed and remove all enemy info in OFF', () => {
  const livingTargeted = makeCandidate({
    id: 'ace-live',
    name: 'Sovereign Striker',
    role: 'heavy_fighter',
    anchorX: 0.42,
    anchorY: 0.44,
    distanceMeters: 260,
    isTargeted: true,
    lockProgress: 1.0,
  });
  const livingUnselected = makeCandidate({
    id: 'wing-2',
    name: 'Void Interceptor',
    anchorX: 0.58,
    anchorY: 0.42,
    distanceMeters: 310,
    isAttacking: true,
  });
  const offscreenEnemy = makeCandidate({
    id: 'behind-ace',
    anchorX: 0.8,
    anchorY: 0.5,
    inFront: false,
    isTargeted: false,
    isAttacking: true,
    distanceMeters: 420,
  });

  // FULL mode: living ships never float a text/health panel over their silhouette (showWorldLabel === false)
  const fullRes = layoutEnemyTargetIndicators(
    [livingTargeted, livingUnselected, offscreenEnemy],
    { ...DESKTOP_CTX, enemyInfoMode: 'full' },
  );
  assert.equal(fullRes.markers.length, 2);
  for (const m of fullRes.markers) {
    assert.equal(m.showWorldLabel, false, 'living spacecraft must never render floating label boxes over 3D craft');
  }
  const targetedFull = fullRes.markers.find((m) => m.id === 'ace-live')!;
  assert.equal(targetedFull.classification, 'HEAVY FIGHTER');

  // MINIMAL mode: unselected stays minimal, targeted keeps essential bars only (no name/threat)
  const minRes = layoutEnemyTargetIndicators(
    [livingTargeted, livingUnselected, offscreenEnemy],
    { ...DESKTOP_CTX, enemyInfoMode: 'minimal' },
  );
  const targetedMin = minRes.markers.find((m) => m.id === 'ace-live')!;
  const unselectedMin = minRes.markers.find((m) => m.id === 'wing-2')!;
  assert.equal(targetedMin.showName, false);
  assert.equal(targetedMin.showBars, true);
  assert.equal(targetedMin.showThreat, false);
  assert.equal(unselectedMin.tier, 'minimal');

  // OFF mode: genuinely emits zero markers and zero off-screen indicators
  const offRes = layoutEnemyTargetIndicators(
    [livingTargeted, livingUnselected, offscreenEnemy],
    { ...DESKTOP_CTX, enemyInfoMode: 'off' },
  );
  assert.equal(offRes.markers.length, 0);
  assert.equal(offRes.offscreen.length, 0);
});

