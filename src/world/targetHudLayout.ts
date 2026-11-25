import type { EnemyFighterRole, EnemyShipClass } from './spacePhysics';
import type { ExtinctionEnemyRole } from './extinctionCampaign';

export type TargetHudCameraMode = 'chase' | 'cockpit';

export type EnemyInfoDisplayMode = 'full' | 'minimal' | 'off';

export const ENEMY_INFO_DISPLAY_MODES: readonly EnemyInfoDisplayMode[] = [
  'full',
  'minimal',
  'off',
] as const;

export function isEnemyInfoDisplayMode(value: unknown): value is EnemyInfoDisplayMode {
  return value === 'full' || value === 'minimal' || value === 'off';
}

export function getNextEnemyInfoDisplayMode(current: EnemyInfoDisplayMode): EnemyInfoDisplayMode {
  if (current === 'full') return 'minimal';
  if (current === 'minimal') return 'off';
  return 'full';
}

export function getEnemyInfoDisplayModeLabel(mode: EnemyInfoDisplayMode): string {
  if (mode === 'full') return 'FULL';
  if (mode === 'minimal') return 'MINIMAL';
  return 'OFF';
}

export type TargetInfoTier = 'minimal' | 'compact_combat' | 'targeted' | 'capital_anchor';

export type TargetThreatLevel = 'standard' | 'high' | 'elite' | 'warship' | 'capital';

export type PlacementSide =
  | 'top-right'
  | 'top-left'
  | 'right'
  | 'left'
  | 'top'
  | 'bottom-right'
  | 'bottom-left';

export interface NormRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface TargetHudCandidate {
  id: string;
  name: string;
  role?: ExtinctionEnemyRole;
  shipClass: EnemyShipClass;
  threatLevel: TargetThreatLevel;
  anchorX: number; // normalized 0..1 projected center of 3D spacecraft
  anchorY: number; // normalized 0..1 projected center of 3D spacecraft
  inFront: boolean;
  distanceMeters: number;
  worldRadiusMeters: number;
  shieldPct: number; // 0..100
  hullPct: number; // 0..100
  hasShields: boolean;
  isTargeted: boolean;
  isAttacking: boolean;
  wasRecentlyHit: boolean;
  justDestroyed: boolean;
  isOccluded: boolean;
  lockProgress?: number; // 0..1
  activeSubsystems?: number;
  totalSubsystems?: number;
}

export interface TargetHudViewportContext {
  viewportWidth: number;
  viewportHeight: number;
  fovDeg: number;
  isTouchMode: boolean;
  isCompactPhone: boolean;
  orientation: 'portrait' | 'landscape';
  cameraMode: TargetHudCameraMode;
  hasCapitalPanel: boolean;
  enemyInfoMode?: EnemyInfoDisplayMode;
  waypointRects?: readonly NormRect[];
}

export interface ResolvedTargetMarker {
  id: string;
  displayName: string;
  classification: string;
  shipClass: EnemyShipClass;
  threatLevel: TargetThreatLevel;
  tier: TargetInfoTier;
  anchorX: number; // 0..1 ship center for open perimeter reticle
  anchorY: number;
  silhouetteRadiusX: number; // 0..1 half-width of ship silhouette on screen
  silhouetteRadiusY: number; // 0..1 half-height of ship silhouette on screen
  labelX: number; // 0..1 center of floating info block (guaranteed outside silhouette)
  labelY: number;
  labelWidthPx: number;
  labelHeightPx: number;
  placementSide: PlacementSide;
  showLeaderLine: boolean;
  leaderFromX: number; // 0..1 outer edge of ship reticle (never crosses ship)
  leaderFromY: number;
  leaderToX: number; // 0..1 nearest edge of floating label
  leaderToY: number;
  distanceMeters: number;
  shieldPct: number;
  hullPct: number;
  hasShields: boolean;
  isTargeted: boolean;
  isCritical: boolean;
  wasRecentlyHit: boolean;
  justDestroyed: boolean;
  isOccluded: boolean;
  lockProgress: number;
  opacity: number; // 0.25..1.0 smooth distance & occlusion fade
  showName: boolean;
  showDistance: boolean;
  showBars: boolean;
  showThreat: boolean;
  showWorldLabel: boolean; // false when telemetry lives in dedicated edge HUD panel instead of floating over space
  activeSubsystems?: number;
  totalSubsystems?: number;
}

export interface OffscreenTargetIndicator {
  id: string;
  displayName: string;
  shipClass: EnemyShipClass;
  threatLevel: TargetThreatLevel;
  isTargeted: boolean;
  distanceMeters: number;
  edgeX: number; // 0..1 along safe viewport perimeter
  edgeY: number;
  angleDeg: number; // arrow pointing toward off-screen target (0 = up, 90 = right)
  opacity: number;
}

export interface TargetHudMemoryEntry {
  labelX: number;
  labelY: number;
  side: PlacementSide;
  opacity: number;
}

export type TargetHudSmoothingState = Record<string, TargetHudMemoryEntry>;

export interface TargetHudLayoutResult {
  markers: ResolvedTargetMarker[];
  offscreen: OffscreenTargetIndicator[];
  nextState: TargetHudSmoothingState;
}

export interface OccluderSphere {
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

const CANDIDATE_SIDES: readonly PlacementSide[] = [
  'top-right',
  'top-left',
  'right',
  'left',
  'top',
  'bottom-right',
  'bottom-left',
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function formatCleanTargetName(
  name: string,
  shipClass: EnemyShipClass,
  role?: ExtinctionEnemyRole,
): string {
  if (shipClass === 'capital') {
    return name.replace(/^(Alien|Sovereign)\s+/i, '').trim() || 'Capital Warship';
  }
  if (role === 'elite_ace') return name.includes('Executioner') ? 'Executioner' : 'Elite Ace';
  if (role === 'phantom_interceptor') return 'Phantom Interceptor';
  if (role === 'hunter_drone') return 'Hunter Drone';
  if (role === 'disruptor_ship') return 'EW Disruptor';
  if (role === 'medium_warship') return 'Assault Corvette';
  if (role === 'heavy_fighter') return 'Armored Striker';
  if (role === 'bomber') return 'Siege Bomber';
  if (role === 'scout') return 'Recon Scout';
  if (role === 'interceptor') return 'Interceptor';
  const cleaned = name.replace(/^(Void|Alien|Sovereign)\s+/i, '').trim();
  return cleaned || (shipClass === 'medium' ? 'Warship' : 'Fighter');
}

export function formatEnemyClassification(
  shipClass: EnemyShipClass,
  role?: ExtinctionEnemyRole,
): string {
  if (shipClass === 'capital') return 'CAPITAL WARSHIP';
  if (role === 'disruptor_ship') return 'EW DISRUPTOR';
  if (shipClass === 'medium' || role === 'medium_warship') return 'MEDIUM WARSHIP';
  if (role === 'elite_ace') return 'ELITE ACE';
  if (role === 'phantom_interceptor') return 'PHANTOM STEALTH';
  if (role === 'hunter_drone') return 'HUNTER DRONE';
  if (role === 'heavy_fighter') return 'HEAVY FIGHTER';
  if (role === 'bomber') return 'STRIKE BOMBER';
  if (role === 'scout') return 'RECON SCOUT';
  return 'INTERCEPTOR';
}

export function deriveThreatLevel(
  shipClass: EnemyShipClass,
  role?: ExtinctionEnemyRole,
): TargetThreatLevel {
  if (shipClass === 'capital') return 'capital';
  if (shipClass === 'medium' || role === 'medium_warship' || role === 'disruptor_ship') return 'warship';
  if (role === 'elite_ace' || role === 'phantom_interceptor') return 'elite';
  if (role === 'heavy_fighter' || role === 'bomber') return 'high';
  return 'standard';
}

/**
 * Pure 3D segment-vs-sphere occlusion check from camera position to enemy center.
 * Used to dim/simplify targeting telemetry when an enemy spacecraft passes behind an asteroid.
 */
export function isTargetOccludedBySpheres(
  cameraPos: Vec3Like,
  targetPos: Vec3Like,
  obstacles: readonly OccluderSphere[],
  minRadiusMeters = 18,
): boolean {
  const dx = targetPos.x - cameraPos.x;
  const dy = targetPos.y - cameraPos.y;
  const dz = targetPos.z - cameraPos.z;
  const segLenSq = dx * dx + dy * dy + dz * dz;
  if (segLenSq < 1) return false;
  const segLen = Math.sqrt(segLenSq);
  const invLen = 1 / segLen;
  const ux = dx * invLen;
  const uy = dy * invLen;
  const uz = dz * invLen;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (obs.radius < minRadiusMeters) continue;
    const ox = obs.x - cameraPos.x;
    const oy = obs.y - cameraPos.y;
    const oz = obs.z - cameraPos.z;
    const proj = ox * ux + oy * uy + oz * uz;
    // Must lie strictly between camera and enemy (with small margin so target near rock edge stays visible)
    if (proj <= obs.radius * 0.4 || proj >= segLen - obs.radius * 0.4) continue;
    const distSq = ox * ox + oy * oy + oz * oz - proj * proj;
    const effectiveR = obs.radius * 0.86;
    if (distSq < effectiveR * effectiveR) {
      return true;
    }
  }
  return false;
}

/**
 * Projects a spacecraft's 3D world bounding radius into normalized screen-space half-extents (0..1).
 * Ensures nearby or large craft receive a proportionally wider clearance halo so telemetry never overlaps hulls.
 */
export function estimateProjectedSilhouetteRadius(
  worldRadiusMeters: number,
  distanceMeters: number,
  fovDeg: number,
  viewportWidth: number,
  viewportHeight: number,
): { rx: number; ry: number } {
  const safeW = Math.max(320, viewportWidth);
  const safeH = Math.max(240, viewportHeight);
  const aspect = safeW / safeH;
  const safeDist = Math.max(12, distanceMeters);
  const halfTan = Math.tan(((clamp(fovDeg, 35, 95) * Math.PI) / 180) * 0.5);

  const ndcHalfY = worldRadiusMeters / (safeDist * halfTan);
  const screenRy = clamp(ndcHalfY * 0.5, 0.015, 0.21);
  const screenRx = clamp(screenRy / aspect, 0.013, 0.21);
  return {
    rx: Number(screenRx.toFixed(4)),
    ry: Number(screenRy.toFixed(4)),
  };
}

/**
 * Assigns one of the three targeting information levels (plus dedicated capital anchor)
 * based on selection state, distance, combat activity, occlusion, and mobile simplification.
 */
export function classifyTargetInfoTier(
  c: TargetHudCandidate,
  ctx: Pick<TargetHudViewportContext, 'isTouchMode' | 'isCompactPhone'>,
): TargetInfoTier {
  if (c.shipClass === 'capital') {
    return 'capital_anchor';
  }
  if (c.isTargeted || c.justDestroyed) {
    return 'targeted';
  }
  if (c.isOccluded) {
    return 'minimal';
  }
  const activeCombatRange = ctx.isCompactPhone ? 850 : ctx.isTouchMode ? 1050 : 1280;
  const isDamaged = c.hullPct < 98 || (c.hasShields && c.shieldPct < 98);
  if (
    c.shipClass === 'medium' ||
    c.wasRecentlyHit ||
    c.isAttacking ||
    isDamaged ||
    c.distanceMeters <= activeCombatRange
  ) {
    return 'compact_combat';
  }
  return 'minimal';
}

export function rectOverlapArea(a: NormRect, b: NormRect): number {
  const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  if (ox <= 0) return 0;
  const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (oy <= 0) return 0;
  return ox * oy;
}

export function makeCenterRect(cx: number, cy: number, halfW: number, halfH: number): NormRect {
  return {
    left: cx - halfW,
    top: cy - halfH,
    right: cx + halfW,
    bottom: cy + halfH,
  };
}

/**
 * Builds normalized screen exclusion rectangles protecting HUD chrome, crosshair,
 * player spacecraft silhouette (in chase view), active waypoints, and mobile touch controls.
 */
export function buildHudExclusionZones(ctx: TargetHudViewportContext): {
  hardZones: NormRect[];
  softZones: NormRect[];
  safeBounds: NormRect;
} {
  const hardZones: NormRect[] = [];
  const softZones: NormRect[] = [];

  if (ctx.isTouchMode) {
    const isPortrait = ctx.orientation === 'portrait';
    // Top-left integrity + objective block
    hardZones.push({ left: 0, top: 0, right: isPortrait ? 0.6 : 0.34, bottom: isPortrait ? 0.19 : 0.28 });
    // Top-right actions + radar
    hardZones.push({ left: isPortrait ? 0.62 : 0.74, top: 0, right: 1, bottom: isPortrait ? 0.2 : 0.34 });
    // Mobile Capital boss bar if active (also guards proximity alert strip in compact landscape)
    if (ctx.hasCapitalPanel) {
      hardZones.push({
        left: 0.14,
        top: isPortrait ? 0.13 : 0.02,
        right: 0.86,
        bottom: isPortrait ? 0.24 : 0.3,
      });
    }
    // Mobile portrait rotate banner band
    if (isPortrait) {
      softZones.push({ left: 0.04, top: 0.17, right: 0.96, bottom: 0.25 });
    }
    // Bottom-left virtual joystick & throttle cluster
    hardZones.push({
      left: 0,
      top: isPortrait ? 0.72 : 0.56,
      right: isPortrait ? 0.54 : 0.36,
      bottom: 1,
    });
    // Bottom-right fire / missile / weapon / utility buttons
    hardZones.push({
      left: isPortrait ? 0.52 : 0.66,
      top: isPortrait ? 0.76 : 0.56,
      right: 1,
      bottom: 1,
    });
  } else {
    // Desktop top-left ship status card
    hardZones.push({ left: 0, top: 0, right: 0.24, bottom: 0.21 });
    // Desktop top-center sector bar + optional Capital Target Panel
    hardZones.push({
      left: 0.31,
      top: 0,
      right: 0.69,
      bottom: ctx.hasCapitalPanel ? 0.18 : 0.08,
    });
    // Desktop top-right toolbar + vector radar + dedicated Selected Target Edge Panel
    hardZones.push({ left: 0.76, top: 0, right: 1, bottom: 0.44 });
    // Desktop bottom weapon rail + comms + boost + bottom-left Wingman panel
    hardZones.push({ left: 0, top: 0.85, right: 1, bottom: 1 });
    hardZones.push({ left: 0, top: 0.72, right: 0.24, bottom: 1 });
  }

  // Center boresight reticle safe zone
  hardZones.push({ left: 0.455, top: 0.445, right: 0.545, bottom: 0.555 });

  // Player spacecraft silhouette zone (enlarged 1.42x craft in chase camera)
  if (ctx.cameraMode === 'chase') {
    hardZones.push({
      left: ctx.isTouchMode && ctx.orientation === 'portrait' ? 0.16 : 0.28,
      top: 0.48,
      right: ctx.isTouchMode && ctx.orientation === 'portrait' ? 0.84 : 0.72,
      bottom: 0.76,
    });
  }

  // Active screen-space waypoints (soft-high exclusion so labels never collide with waypoint badges)
  if (ctx.waypointRects) {
    for (const wp of ctx.waypointRects) {
      softZones.push(wp);
    }
  }

  const safeBounds: NormRect = {
    left: ctx.isTouchMode ? 0.035 : 0.025,
    top: ctx.isTouchMode ? 0.08 : 0.06,
    right: ctx.isTouchMode ? 0.965 : 0.975,
    bottom: ctx.isTouchMode ? (ctx.orientation === 'portrait' ? 0.72 : 0.68) : 0.84,
  };

  return { hardZones, softZones, safeBounds };
}

function getLabelPixelSize(
  tier: TargetInfoTier,
  c: TargetHudCandidate,
  ctx: TargetHudViewportContext,
): { width: number; height: number } {
  if (tier === 'minimal') {
    return { width: 0, height: 0 };
  }
  if (tier === 'capital_anchor') {
    return { width: ctx.isCompactPhone ? 108 : 148, height: 22 };
  }
  if (tier === 'compact_combat') {
    return {
      width: ctx.isCompactPhone ? 46 : 56,
      height: c.hasShields ? 14 : 10,
    };
  }
  // Targeted enemy callout
  if (c.justDestroyed) {
    return { width: 92, height: 22 };
  }
  if (ctx.isCompactPhone) {
    return { width: 122, height: c.hasShields ? 38 : 32 };
  }
  return { width: 152, height: c.hasShields ? 44 : 38 };
}

function computeSideCandidateCenter(
  anchorX: number,
  anchorY: number,
  silRx: number,
  silRy: number,
  halfW: number,
  halfH: number,
  gapX: number,
  gapY: number,
  side: PlacementSide,
  ringScale: number,
): { cx: number; cy: number } {
  const rx = (silRx + gapX) * ringScale;
  const ry = (silRy + gapY) * ringScale;

  switch (side) {
    case 'top-right':
      return { cx: anchorX + rx + halfW * 0.85, cy: anchorY - ry - halfH * 0.82 };
    case 'top-left':
      return { cx: anchorX - rx - halfW * 0.85, cy: anchorY - ry - halfH * 0.82 };
    case 'right':
      return { cx: anchorX + rx + halfW, cy: anchorY };
    case 'left':
      return { cx: anchorX - rx - halfW, cy: anchorY };
    case 'top':
      return { cx: anchorX, cy: anchorY - ry - halfH };
    case 'bottom-right':
      return { cx: anchorX + rx + halfW * 0.85, cy: anchorY + ry + halfH * 0.85 };
    case 'bottom-left':
      return { cx: anchorX - rx - halfW * 0.85, cy: anchorY + ry + halfH * 0.85 };
  }
}

function pushLabelOutsideSilhouette(
  cx: number,
  cy: number,
  anchorX: number,
  anchorY: number,
  silRx: number,
  silRy: number,
  halfW: number,
  halfH: number,
  gapX: number,
  gapY: number,
): { x: number; y: number } {
  const minSepX = silRx + halfW + gapX * 0.85;
  const minSepY = silRy + halfH + gapY * 0.85;
  const dx = cx - anchorX;
  const dy = cy - anchorY;
  if (Math.abs(dx) >= minSepX || Math.abs(dy) >= minSepY) {
    return { x: cx, y: cy };
  }
  const pushX = minSepX - Math.abs(dx);
  const pushY = minSepY - Math.abs(dy);
  if (pushY <= pushX) {
    const signY = dy <= 0 ? -1 : 1;
    return { x: cx, y: anchorY + signY * minSepY };
  }
  const signX = dx >= 0 ? 1 : -1;
  return { x: anchorX + signX * minSepX, y: cy };
}

function computeLeaderEndpoints(
  anchorX: number,
  anchorY: number,
  silRx: number,
  silRy: number,
  labelX: number,
  labelY: number,
  halfW: number,
  halfH: number,
): { fromX: number; fromY: number; toX: number; toY: number } {
  const dx = labelX - anchorX;
  const dy = labelY - anchorY;
  const len = Math.hypot(dx, dy) || 0.0001;
  const ux = dx / len;
  const uy = dy / len;

  // Start strictly on the OUTER perimeter of the targeting reticle (never inside silhouette!)
  const startRx = silRx + 0.006;
  const startRy = silRy + 0.008;
  const fromX = anchorX + ux * startRx;
  const fromY = anchorY + uy * startRy;

  // Terminate cleanly at the nearest side boundary of the floating label box
  const scaleX = Math.abs(ux) > 0.001 ? halfW / Math.abs(ux) : 999;
  const scaleY = Math.abs(uy) > 0.001 ? halfH / Math.abs(uy) : 999;
  const edgeT = Math.min(scaleX, scaleY);
  const toX = labelX - ux * Math.min(edgeT + 0.003, len * 0.48);
  const toY = labelY - uy * Math.min(edgeT + 0.003, len * 0.48);

  return {
    fromX: Number(fromX.toFixed(4)),
    fromY: Number(fromY.toFixed(4)),
    toX: Number(toX.toFixed(4)),
    toY: Number(toY.toFixed(4)),
  };
}

function computeDistanceOpacity(
  c: TargetHudCandidate,
  tier: TargetInfoTier,
  maxRange: number,
): number {
  if (c.justDestroyed) return 0.92;
  if (c.isTargeted) return c.isOccluded ? 0.68 : 1.0;
  if (c.isOccluded) return 0.34;

  const distRatio = clamp(c.distanceMeters / Math.max(400, maxRange), 0, 1);
  if (tier === 'capital_anchor') {
    return Number((0.92 - distRatio * 0.24).toFixed(2));
  }
  if (tier === 'compact_combat') {
    const boost = c.wasRecentlyHit || c.isAttacking ? 0.14 : 0;
    return Number(clamp(0.94 - distRatio * 0.32 + boost, 0.56, 0.98).toFixed(2));
  }
  // Minimal distant unselected marker
  return Number(clamp(0.68 - distRatio * 0.38, 0.28, 0.7).toFixed(2));
}

function buildOffscreenIndicator(
  c: TargetHudCandidate,
  ctx: TargetHudViewportContext,
): OffscreenTargetIndicator {
  // Vector from viewport center toward projected point; flip when behind camera
  let vx = c.anchorX - 0.5;
  let vy = c.anchorY - 0.5;
  if (!c.inFront) {
    vx = -vx;
    vy = -vy;
  }
  if (Math.hypot(vx, vy) < 0.001) {
    vy = 1; // directly behind -> bottom edge indicator
  }

  const marginX = ctx.isTouchMode ? 0.07 : 0.045;
  const marginTop = ctx.isTouchMode ? 0.15 : 0.11;
  const marginBottom = ctx.isTouchMode ? (ctx.orientation === 'portrait' ? 0.29 : 0.33) : 0.16;

  const halfSpanX = 0.5 - marginX;
  const topSpan = 0.5 - marginTop;
  const bottomSpan = 0.5 - marginBottom;

  const tx = Math.abs(vx) > 0.0001 ? halfSpanX / Math.abs(vx) : 999;
  const ty =
    vy < -0.0001 ? topSpan / -vy : vy > 0.0001 ? bottomSpan / vy : 999;
  const t = Math.min(tx, ty);

  const edgeX = clamp(0.5 + vx * t, marginX, 1 - marginX);
  const edgeY = clamp(0.5 + vy * t, marginTop, 1 - marginBottom);
  const angleDeg = Math.round(((Math.atan2(vy, vx) * 180) / Math.PI + 90 + 360) % 360);

  return {
    id: c.id,
    displayName: formatCleanTargetName(c.name, c.shipClass, c.role),
    shipClass: c.shipClass,
    threatLevel: c.threatLevel,
    isTargeted: c.isTargeted,
    distanceMeters: Math.round(c.distanceMeters),
    edgeX: Number(edgeX.toFixed(4)),
    edgeY: Number(edgeY.toFixed(4)),
    angleDeg,
    opacity: c.isTargeted ? 0.95 : c.shipClass === 'capital' ? 0.85 : 0.68,
  };
}

/**
 * Intelligent, non-obstructive screen-space enemy targeting layout engine.
 * - Guarantees floating telemetry sits outside enemy silhouettes with a clear visual gap.
 * - Resolves indicator-vs-indicator, indicator-vs-silhouette, crosshair, player ship, and HUD collisions.
 * - Implements 3 distinct information tiers (minimal unselected, active compact, full targeted + capital anchor).
 * - Smoothly damps repositioning with side-flip hysteresis to eliminate label jitter.
 */
export function layoutEnemyTargetIndicators(
  candidates: readonly TargetHudCandidate[],
  ctx: TargetHudViewportContext,
  prevState: TargetHudSmoothingState = {},
  dtSec = 0.016,
): TargetHudLayoutResult {
  const infoMode: EnemyInfoDisplayMode = ctx.enemyInfoMode ?? 'full';
  if (infoMode === 'off') {
    return { markers: [], offscreen: [], nextState: {} };
  }

  const safeW = Math.max(320, ctx.viewportWidth);
  const safeH = Math.max(240, ctx.viewportHeight);
  const fighterMaxRange = 2900;
  const warshipMaxRange = 5400;
  const maxVisibleMarkers =
    infoMode === 'minimal'
      ? ctx.isCompactPhone
        ? 3
        : 5
      : ctx.isCompactPhone
        ? 4
        : ctx.isTouchMode
          ? 5
          : 8;

  const onScreenCandidates: TargetHudCandidate[] = [];
  const offScreenCandidates: TargetHudCandidate[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const rangeLimit = c.shipClass === 'fighter' ? fighterMaxRange : warshipMaxRange;
    const withinRange = c.isTargeted || c.justDestroyed || c.distanceMeters <= rangeLimit;
    if (!withinRange) continue;

    const insideView =
      c.inFront &&
      c.anchorX >= 0.03 &&
      c.anchorX <= 0.97 &&
      c.anchorY >= 0.05 &&
      c.anchorY <= 0.94;

    if (insideView) {
      onScreenCandidates.push(c);
    } else if (
      !c.justDestroyed &&
      (c.isTargeted ||
        c.shipClass === 'capital' ||
        (infoMode === 'full' && c.isAttacking && c.distanceMeters <= 1500))
    ) {
      offScreenCandidates.push(c);
    }
  }

  const priorityScore = (c: TargetHudCandidate): number => {
    let s = 0;
    if (c.isTargeted) s += 12000;
    if (c.justDestroyed) s += 7500;
    if (c.shipClass === 'capital') s += 4600;
    else if (c.shipClass === 'medium') s += 3200;
    else if (c.threatLevel === 'elite') s += 2400;
    if (c.wasRecentlyHit) s += 1500;
    if (c.isAttacking) s += 950;
    if (c.hullPct < 98 || (c.hasShields && c.shieldPct < 98)) s += 650;
    if (c.isOccluded && !c.isTargeted) s -= 900;
    s -= c.distanceMeters * 0.42;
    return s;
  };

  onScreenCandidates.sort((a, b) => priorityScore(b) - priorityScore(a));
  offScreenCandidates.sort((a, b) => priorityScore(b) - priorityScore(a));

  const selectedOnScreen = onScreenCandidates.slice(0, maxVisibleMarkers);
  const offscreenLimit = infoMode === 'minimal' ? 1 : ctx.isCompactPhone ? 2 : 3;
  const offscreen = offScreenCandidates
    .slice(0, offscreenLimit)
    .map((c) => buildOffscreenIndicator(c, ctx));

  const { hardZones, softZones, safeBounds } = buildHudExclusionZones(ctx);

  // Pre-compute projected silhouette rectangles for EVERY visible enemy so no label covers another ship!
  const projectedSilhouettes = selectedOnScreen.map((c) => {
    const { rx, ry } = estimateProjectedSilhouetteRadius(
      c.worldRadiusMeters,
      c.distanceMeters,
      ctx.fovDeg,
      safeW,
      safeH,
    );
    return {
      id: c.id,
      rx,
      ry,
      rect: makeCenterRect(c.anchorX, c.anchorY, rx + 0.006, ry + 0.008),
    };
  });

  const placedLabelRects: NormRect[] = [];
  const markers: ResolvedTargetMarker[] = [];
  const nextState: TargetHudSmoothingState = {};

  // Exponential temporal smoothing factor (snaps if dt <= 0 or huge jump)
  const smoothAlpha = dtSec > 0 && dtSec < 0.25 ? 1 - Math.exp(-11.5 * dtSec) : 1.0;

  // Minimum clear visual gap between spacecraft silhouette edge and indicator block
  const gapX = Math.max(0.012, 16 / safeW);
  const gapY = Math.max(0.014, 14 / safeH);

  // Cap how many non-targeted active compact bars appear simultaneously on mobile to stay airy
  let activeCompactCount = 0;
  const maxActiveCompact = ctx.isCompactPhone ? 2 : ctx.isTouchMode ? 3 : 5;

  for (let i = 0; i < selectedOnScreen.length; i++) {
    const c = selectedOnScreen[i];
    const sil = projectedSilhouettes[i];
    let tier = classifyTargetInfoTier(c, ctx);
    if (tier === 'compact_combat') {
      if (infoMode === 'minimal' || activeCompactCount >= maxActiveCompact) {
        tier = 'minimal';
      } else {
        activeCompactCount++;
      }
    }

    const maxRef = c.shipClass === 'fighter' ? fighterMaxRange : warshipMaxRange;
    const targetOpacity = computeDistanceOpacity(c, tier, maxRef);
    const prev = prevState[c.id];
    const { width: labelWidthPx, height: labelHeightPx } = getLabelPixelSize(tier, c, ctx);
    const halfW = (labelWidthPx * 0.5) / safeW;
    const halfH = (labelHeightPx * 0.5) / safeH;

    let chosenSide: PlacementSide = prev?.side ?? 'top-right';
    let labelX = c.anchorX;
    let labelY = c.anchorY;
    let showLeaderLine = false;

    if (tier !== 'minimal') {
      let bestScore = Infinity;
      let bestX = c.anchorX;
      let bestY = c.anchorY;
      let bestSide: PlacementSide = chosenSide;
      let bestRing = 1.0;

      // Evaluate inner clearance ring first, then outer clearance ring for crowded clusters
      const ringScales = [1.0, 1.55];
      for (let rIdx = 0; rIdx < ringScales.length; rIdx++) {
        const ringScale = ringScales[rIdx];
        for (let sIdx = 0; sIdx < CANDIDATE_SIDES.length; sIdx++) {
          const side = CANDIDATE_SIDES[sIdx];
          // Capital ship anchor strongly prefers clean top/top-right above superstructure
          const raw = computeSideCandidateCenter(
            c.anchorX,
            c.anchorY,
            sil.rx,
            sil.ry,
            halfW,
            halfH,
            gapX,
            gapY,
            side,
            ringScale,
          );

          const clampedX = clamp(raw.cx, safeBounds.left + halfW, safeBounds.right - halfW);
          const clampedY = clamp(raw.cy, safeBounds.top + halfH, safeBounds.bottom - halfH);
          const clampDist = Math.hypot(clampedX - raw.cx, clampedY - raw.cy);
          const rect = makeCenterRect(clampedX, clampedY, halfW + 0.004, halfH + 0.005);

          let score = sIdx * 14 + (ringScale > 1 ? 165 : 0) + clampDist * 2200;

          // Capital anchor prefers top or top-right above hull
          if (tier === 'capital_anchor' && (side === 'top' || side === 'top-right')) {
            score -= 60;
          }

          // Hysteresis: reward keeping previous placement side so labels never jitter across sides
          if (prev && prev.side === side) {
            score -= 135;
          }

          // 1. STRICT avoidance of own spacecraft silhouette
          const ownOverlap = rectOverlapArea(rect, sil.rect);
          if (ownOverlap > 0) {
            score += 90000 + ownOverlap * 250000;
          }

          // 2. Avoidance of ALL other visible enemies' silhouettes
          for (let j = 0; j < projectedSilhouettes.length; j++) {
            if (j === i) continue;
            const ov = rectOverlapArea(rect, projectedSilhouettes[j].rect);
            if (ov > 0) {
              score += 24000 + ov * 160000;
            }
          }

          // 3. Avoidance of already-placed higher-priority labels
          for (let j = 0; j < placedLabelRects.length; j++) {
            const ov = rectOverlapArea(rect, placedLabelRects[j]);
            if (ov > 0) {
              score += 18000 + ov * 150000;
            }
          }

          // 4. Avoidance of hard HUD exclusion zones (crosshair, player ship, top/bottom HUD, touch controls)
          for (let j = 0; j < hardZones.length; j++) {
            const ov = rectOverlapArea(rect, hardZones[j]);
            if (ov > 0) {
              score += 14000 + ov * 120000;
            }
          }

          // 5. Avoidance of soft exclusion zones (waypoints, mobile banner)
          for (let j = 0; j < softZones.length; j++) {
            const ov = rectOverlapArea(rect, softZones[j]);
            if (ov > 0) {
              score += 3600 + ov * 55000;
            }
          }

          if (score < bestScore) {
            bestScore = score;
            bestX = clampedX;
            bestY = clampedY;
            bestSide = side;
            bestRing = ringScale;
          }
        }
      }

      chosenSide = bestSide;

      // Temporal position smoothing (prevents jitter during fast dogfights while keeping clear of own silhouette)
      if (prev && Math.hypot(bestX - prev.labelX, bestY - prev.labelY) < 0.36) {
        labelX = prev.labelX + (bestX - prev.labelX) * smoothAlpha;
        labelY = prev.labelY + (bestY - prev.labelY) * smoothAlpha;
      } else {
        labelX = bestX;
        labelY = bestY;
      }

      // Hard post-smoothing safety pushout so a fast fighter NEVER enters its own smoothed label!
      const pushed = pushLabelOutsideSilhouette(
        labelX,
        labelY,
        c.anchorX,
        c.anchorY,
        sil.rx,
        sil.ry,
        halfW,
        halfH,
        gapX,
        gapY,
      );
      labelX = clamp(pushed.x, safeBounds.left + halfW, safeBounds.right - halfW);
      labelY = clamp(pushed.y, safeBounds.top + halfH, safeBounds.bottom - halfH);

      placedLabelRects.push(makeCenterRect(labelX, labelY, halfW + 0.005, halfH + 0.006));

      // Use a thin subtle leader connector ONLY for targeted craft, or when an active indicator had to offset outward
      showLeaderLine =
        tier === 'targeted' ||
        (tier === 'compact_combat' && bestRing > 1.05) ||
        tier === 'capital_anchor';
    }

    const smoothedOpacity = prev
      ? Number((prev.opacity + (targetOpacity - prev.opacity) * Math.min(1, smoothAlpha * 1.15)).toFixed(2))
      : targetOpacity;

    nextState[c.id] = {
      labelX: Number(labelX.toFixed(4)),
      labelY: Number(labelY.toFixed(4)),
      side: chosenSide,
      opacity: smoothedOpacity,
    };

    const leader = showLeaderLine
      ? computeLeaderEndpoints(
          c.anchorX,
          c.anchorY,
          sil.rx,
          sil.ry,
          labelX,
          labelY,
          halfW,
          halfH,
        )
      : { fromX: c.anchorX, fromY: c.anchorY, toX: labelX, toY: labelY };

    markers.push({
      id: c.id,
      displayName: formatCleanTargetName(c.name, c.shipClass, c.role),
      classification: formatEnemyClassification(c.shipClass, c.role),
      shipClass: c.shipClass,
      threatLevel: c.threatLevel,
      tier,
      anchorX: Number(c.anchorX.toFixed(4)),
      anchorY: Number(c.anchorY.toFixed(4)),
      silhouetteRadiusX: sil.rx,
      silhouetteRadiusY: sil.ry,
      labelX: Number(labelX.toFixed(4)),
      labelY: Number(labelY.toFixed(4)),
      labelWidthPx,
      labelHeightPx,
      placementSide: chosenSide,
      showLeaderLine,
      leaderFromX: leader.fromX,
      leaderFromY: leader.fromY,
      leaderToX: leader.toX,
      leaderToY: leader.toY,
      distanceMeters: Math.round(c.distanceMeters),
      shieldPct: clamp(Math.round(c.shieldPct), 0, 100),
      hullPct: clamp(Math.round(c.hullPct), 0, 100),
      hasShields: c.hasShields,
      isTargeted: c.isTargeted,
      isCritical: !c.justDestroyed && c.hullPct <= 30,
      wasRecentlyHit: c.wasRecentlyHit,
      justDestroyed: c.justDestroyed,
      isOccluded: c.isOccluded,
      lockProgress: Number(clamp(c.lockProgress ?? 0, 0, 1).toFixed(2)),
      opacity: smoothedOpacity,
      showName:
        infoMode === 'full' &&
        (tier === 'targeted' || (tier === 'capital_anchor' && !ctx.isCompactPhone)),
      showDistance: tier === 'targeted' || (infoMode === 'full' && tier === 'capital_anchor'),
      showBars: (tier === 'targeted' || tier === 'compact_combat') && !c.justDestroyed,
      showThreat:
        infoMode === 'full' &&
        tier === 'targeted' &&
        (c.threatLevel === 'high' ||
          c.threatLevel === 'elite' ||
          c.threatLevel === 'warship' ||
          c.threatLevel === 'capital'),
      // Never float large permanent info panels/names over 3D ships:
      // selected enemy & capital details live in dedicated screen-edge HUD panels.
      // Only a brief 'DESTROYED' badge may float outside the silhouette.
      showWorldLabel: c.justDestroyed,
      activeSubsystems: c.activeSubsystems,
      totalSubsystems: c.totalSubsystems,
    });
  }

  return { markers, offscreen, nextState };
}
