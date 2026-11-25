import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Map,
  Navigation,
  Pause,
  ShieldAlert,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from 'lucide-react';
import type { EngineHudSnapshot } from '../scene/AetherPrimeEngine';
import {
  CAPITAL_SUBSYSTEM_KEYS,
  SPACE_REGION_LIST,
  SPACE_WEAPON_LIST,
  type SpaceRegionId,
  type SpaceWeaponId,
} from '../world/spacePhysics';
import type { WingmanCommandId } from '../world/combatExpansion';
import { WEAPON_BALLISTICS } from '../world/ballistics';
import { getEnemyInfoDisplayModeLabel } from '../world/targetHudLayout';
import { MobileTouchControls } from './MobileTouchControls';

interface GameHudProps {
  hud: EngineHudSnapshot;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onOpenWarMap: () => void;
  onRespawnInOrbit: () => void;
  onTravelSpaceRegion: (regionId: SpaceRegionId) => void;
  onSelectSpaceWeapon: (weapon: SpaceWeaponId) => void;
  onCycleSpaceWeapon: () => void;
  onCycleSpaceTarget: () => void;
  onFireMissile: () => void;
  onTriggerCountermeasure: () => void;
  onUseRepairKit: () => void;
  onToggleSupercruise: () => void;
  onToggleAutopilot: () => void;
  onToggleFlightAssist: () => void;
  onToggleSpaceCameraMode: () => void;
  onTouchJoystickChange: (x: number, y: number) => void;
  onTouchCameraLook: (dx: number, dy: number) => void;
  onTouchPrimaryFireChange: (down: boolean) => void;
  onTouchFlightButtonChange: (
    button: 'boost' | 'brake' | 'rollLeft' | 'rollRight' | 'throttleForward' | 'throttleReverse',
    down: boolean,
  ) => void;
  onDismissPortraitHint: () => void;
  onIssueWingmanCommand: (cmd: WingmanCommandId) => void;
  onSkipHyperspace: () => void;
  onCycleEnemyInfoDisplayMode: () => void;
}

function formatDistanceCompact(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatTimerMMSS(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function formatShortcutCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

function getThreatChevron(threat: 'standard' | 'high' | 'elite' | 'warship' | 'capital'): {
  glyph: string;
  tone: string;
  label: string;
} | null {
  if (threat === 'capital' || threat === 'elite') {
    return { glyph: '▲▲', tone: 'text-rose-400', label: threat === 'capital' ? 'Capital threat' : 'Elite threat' };
  }
  if (threat === 'warship' || threat === 'high') {
    return { glyph: '▲', tone: 'text-amber-300', label: threat === 'warship' ? 'Warship threat' : 'High threat' };
  }
  return null;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onToggleMute,
  onTogglePause,
  onOpenWarMap,
  onRespawnInOrbit,
  onTravelSpaceRegion,
  onSelectSpaceWeapon,
  onCycleSpaceWeapon,
  onCycleSpaceTarget,
  onFireMissile,
  onTriggerCountermeasure,
  onUseRepairKit,
  onToggleSupercruise,
  onToggleAutopilot,
  onToggleFlightAssist,
  onToggleSpaceCameraMode,
  onTouchJoystickChange,
  onTouchCameraLook,
  onTouchPrimaryFireChange,
  onTouchFlightButtonChange,
  onDismissPortraitHint,
  onIssueWingmanCommand,
  onSkipHyperspace,
  onCycleEnemyInfoDisplayMode,
}) => {
  const [subsystemsManualToggle, setSubsystemsManualToggle] = useState<boolean | null>(null);

  const { space, deviceProfile, mobileSettings, hyperspace } = hud;
  const isTouchMode = deviceProfile.useTouchControls;
  const isCompactPhone = isTouchMode && deviceProfile.formFactor === 'small_phone';
  const isCompactLandscapeTouch =
    isTouchMode && deviceProfile.orientation === 'landscape' && deviceProfile.viewportHeight < 460;
  const isCompactHud = isCompactPhone || isCompactLandscapeTouch;
  const isCockpit = space.cameraMode === 'cockpit';
  const enemyInfoMode = hud.flightSettings.enemyInfoDisplayMode ?? 'full';
  const showEnemyInfo = enemyInfoMode !== 'off';
  const toggleKeyLabel = formatShortcutCode(hud.flightSettings.enemyInfoToggleKey || 'F5');

  const shieldPct = Math.max(0, Math.min(100, Math.round((space.shield / Math.max(1, space.maxShield)) * 100)));
  const hullPct = Math.max(0, Math.min(100, Math.round((space.hull / Math.max(1, space.maxHull)) * 100)));
  const cap = space.capitalShip;
  const selectedTarget = space.selectedTargetInfo;
  const showSubsystems =
    subsystemsManualToggle !== null ? subsystemsManualToggle : Boolean(space.selectedSubsystem);

  return (
    <div
      data-testid="space-hud-root"
      data-input-mode={isTouchMode ? 'touch' : 'desktop'}
      data-camera-mode={space.cameraMode}
      data-enemy-info-mode={enemyInfoMode}
      className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden text-[#e6edf5]"
    >
      {/* Severe Asteroid Impact / Damage Edge Flash */}
      {space.collisionSeverityFlash && (
        <div
          className={`fixed inset-0 pointer-events-none border-2 ${
            space.collisionSeverityFlash === 'severe'
              ? 'border-rose-500/85 bg-rose-950/15'
              : 'border-amber-400/65 bg-amber-950/10'
          }`}
        />
      )}

      {/* Critical Hull / Engine Damage Subtle Crimson Warning Frame */}
      {space.criticalDamageWarning && !space.collisionSeverityFlash && !hyperspace.active && (
        <div
          data-testid="critical-damage-frame"
          className="fixed inset-0 pointer-events-none border-2 border-rose-500/60"
          style={{ boxShadow: 'inset 0 0 42px rgba(225,29,72,0.22)' }}
        />
      )}

      {/* Skippable Hyperspace Transit & Sector Jump Sequence Overlay (Zero backdrop-blur) */}
      {hyperspace.active && (
        <div
          data-testid="hyperspace-overlay"
          className="fixed inset-0 z-40 pointer-events-none flex flex-col items-center justify-between py-10 px-6"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(14,165,233,0.12) 0%, rgba(5,10,22,0.52) 62%, rgba(3,6,14,0.86) 100%)',
          }}
        >
          {/* Radial Star-Streak Warp Field */}
          <svg
            viewBox="0 0 1000 562"
            preserveAspectRatio="xMidYMid slice"
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.28 + hyperspace.streakIntensity * 0.68 }}
            aria-hidden="true"
          >
            {Array.from({ length: 36 }).map((_, idx) => {
              const angle = (idx / 36) * Math.PI * 2;
              const innerR = 48 + (idx % 4) * 26;
              const outerR = innerR + 120 + hyperspace.streakIntensity * 340 + (idx % 3) * 65;
              const x1 = 500 + Math.cos(angle) * innerR;
              const y1 = 281 + Math.sin(angle) * innerR * 0.68;
              const x2 = 500 + Math.cos(angle) * outerR;
              const y2 = 281 + Math.sin(angle) * outerR * 0.68;
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={idx % 3 === 0 ? '#bae6fd' : '#7dd3fc'}
                  strokeWidth={idx % 4 === 0 ? 2.1 : 1.1}
                  strokeLinecap="round"
                  opacity={idx % 2 === 0 ? 0.85 : 0.48}
                />
              );
            })}
          </svg>

          <div className="relative z-10 text-center avionics-panel px-5 py-2.5 border-sky-400/60">
            <div className="text-[10px] font-mono-tabular uppercase tracking-[0.24em] text-sky-300">
              {hyperspace.phase === 'charging'
                ? 'CHARGING HYPERDRIVE'
                : hyperspace.phase === 'tunnel'
                  ? 'HYPERSPACE TRANSIT'
                  : 'EXITING HYPERSPACE'}
            </div>
            <div className="mt-1 font-display text-lg md:text-xl font-bold uppercase tracking-[0.1em] text-white">
              {hyperspace.destinationLabel}
            </div>
            <div className="text-[10px] font-mono-tabular text-slate-300 mt-0.5">
              ORIGIN: {hyperspace.originLabel}
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-2.5 w-full max-w-sm">
            <div className="w-full h-1.5 bg-slate-900/90 border border-sky-400/40 overflow-hidden">
              <div
                className="h-full bg-sky-300 transition-[width] duration-75"
                style={{ width: `${Math.round(hyperspace.progress * 100)}%` }}
              />
            </div>
            <button
              type="button"
              data-testid="hyperspace-skip-btn"
              onClick={onSkipHyperspace}
              className="pointer-events-auto px-4 py-1.5 border border-sky-300/70 bg-[#070b11]/90 hover:bg-sky-300 hover:text-[#05080f] text-[10.5px] font-mono-tabular uppercase tracking-[0.18em] text-sky-200 transition-colors cursor-pointer"
            >
              [SPACE] Skip Jump
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* COMBAT HUD LAYERS (Hidden during Hyperspace Transit for clean cinema) */}
      {/* ===================================================================== */}
      {!hyperspace.active && (
        <>
          {/* ===================================================================== */}
          {/* INTEGRATED 90%/10% COLLIMATED COCKPIT AVIONICS OVERLAY                */}
          {/* Zero opaque panels — keeps >= 90% of screen pure open space           */}
          {/* ===================================================================== */}
          {isCockpit && (
        <div
          data-testid="cockpit-collimated-hud"
          className="fixed inset-0 pointer-events-none"
        >
          <svg
            viewBox="0 0 1000 562"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full opacity-75"
          >
            {/* Top heading tape */}
            <line x1="390" y1="62" x2="610" y2="62" stroke="rgba(125,211,252,0.42)" strokeWidth="1" />
            {[410, 440, 470, 500, 530, 560, 590].map((x, idx) => (
              <line
                key={x}
                x1={x}
                y1={idx === 3 ? 54 : 58}
                x2={x}
                y2="62"
                stroke="rgba(125,211,252,0.55)"
                strokeWidth={idx === 3 ? '1.6' : '1'}
              />
            ))}
            <polygon points="500,65 495,72 505,72" fill="rgba(125,211,252,0.75)" />

            {/* Delicate pitch & horizon ladder around center */}
            <line x1="396" y1="281" x2="442" y2="281" stroke="rgba(125,211,252,0.48)" strokeWidth="1.1" />
            <line x1="558" y1="281" x2="604" y2="281" stroke="rgba(125,211,252,0.48)" strokeWidth="1.1" />
            <line x1="428" y1="241" x2="452" y2="241" stroke="rgba(125,211,252,0.3)" strokeWidth="1" />
            <line x1="548" y1="241" x2="572" y2="241" stroke="rgba(125,211,252,0.3)" strokeWidth="1" />
            <line x1="428" y1="321" x2="452" y2="321" stroke="rgba(125,211,252,0.3)" strokeWidth="1" strokeDasharray="5 3" />
            <line x1="548" y1="321" x2="572" y2="321" stroke="rgba(125,211,252,0.3)" strokeWidth="1" strokeDasharray="5 3" />

            {/* Left thin velocity ladder */}
            <line x1="312" y1="205" x2="312" y2="357" stroke="rgba(125,211,252,0.32)" strokeWidth="1" />
            {[215, 248, 281, 314, 347].map((y) => (
              <line key={y} x1="304" y1={y} x2="312" y2={y} stroke="rgba(125,211,252,0.42)" strokeWidth="1" />
            ))}
            <polygon points="315,281 322,277 322,285" fill="rgba(125,211,252,0.75)" />

            {/* Right thin integrity & altitude ladder */}
            <line x1="688" y1="205" x2="688" y2="357" stroke="rgba(125,211,252,0.32)" strokeWidth="1" />
            {[215, 248, 281, 314, 347].map((y) => (
              <line key={y} x1="688" y1={y} x2="696" y2={y} stroke="rgba(125,211,252,0.42)" strokeWidth="1" />
            ))}
            <polygon points="685,281 678,277 678,285" fill="rgba(52,211,153,0.75)" />
          </svg>

          {/* Subtle velocity & altitude numeric readouts floating beside ladders */}
          <div className="hidden md:block absolute left-[24%] top-1/2 -translate-y-1/2 text-right font-mono-tabular text-[11px] text-sky-200/85 hud-text-shadow">
            <div className="text-[9px] text-sky-300/70 tracking-[0.16em]">VEL</div>
            <div className="font-semibold">{space.speed}</div>
            <div className="text-[8px] text-slate-400">M/S</div>
          </div>
          <div className="hidden md:block absolute right-[24%] top-1/2 -translate-y-1/2 text-left font-mono-tabular text-[11px] text-emerald-200/85 hud-text-shadow">
            <div className="text-[9px] text-emerald-300/70 tracking-[0.16em]">INT</div>
            <div className="font-semibold">{hullPct}%</div>
            <div className="text-[8px] text-sky-300/80">SHD {shieldPct}%</div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* NON-OBSTRUCTIVE ENEMY TARGETING LAYER                                 */}
      {/* Unmounted completely in OFF mode; in FULL/MINIMAL keeps silhouettes   */}
      {/* 100% clear with open perimeter markers only (details live on edge!)   */}
      {/* ===================================================================== */}
      {showEnemyInfo && (space.targetMarkers ?? []).map((marker) => {
        // Open perimeter bracket strictly outside projected ship silhouette
        const bracketW = Math.max(
          36,
          Math.min(160, Math.round(marker.silhouetteRadiusX * 2 * deviceProfile.viewportWidth + 16)),
        );
        const bracketH = Math.max(
          36,
          Math.min(152, Math.round(marker.silhouetteRadiusY * 2 * deviceProfile.viewportHeight + 16)),
        );
        const bracketTone = marker.justDestroyed
          ? 'border-rose-400/90'
          : marker.lockProgress >= 0.99
            ? 'border-rose-400/90'
            : marker.isOccluded
              ? 'border-slate-400/55'
              : 'border-amber-300/85';

        return (
          <React.Fragment key={marker.id}>
            {marker.tier === 'targeted' ? (
              <div
                data-testid="target-perimeter-bracket"
                data-enemy-id={marker.id}
                data-enemy-class={marker.shipClass}
                style={{
                  left: `${marker.anchorX * 100}%`,
                  top: `${marker.anchorY * 100}%`,
                  width: `${bracketW}px`,
                  height: `${bracketH}px`,
                  opacity: marker.opacity,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              >
                <span className={`absolute top-0 left-0 w-2.5 h-2.5 border-t-[1.5px] border-l-[1.5px] ${bracketTone}`} />
                <span className={`absolute top-0 right-0 w-2.5 h-2.5 border-t-[1.5px] border-r-[1.5px] ${bracketTone}`} />
                <span className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-b-[1.5px] border-l-[1.5px] ${bracketTone}`} />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-b-[1.5px] border-r-[1.5px] ${bracketTone}`} />
              </div>
            ) : (
              <div
                data-testid="target-unselected-marker"
                data-enemy-id={marker.id}
                data-tier={marker.tier}
                data-occluded={marker.isOccluded ? 'true' : 'false'}
                style={{
                  left: `${marker.anchorX * 100}%`,
                  top: `${marker.anchorY * 100}%`,
                  opacity: marker.opacity * 0.86,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
              >
                <span
                  className={`rotate-45 border ${
                    marker.tier === 'capital_anchor'
                      ? 'w-3 h-3 border-rose-400/85'
                      : marker.threatLevel === 'warship' || marker.threatLevel === 'elite'
                        ? 'w-2 h-2 border-amber-300/80'
                        : marker.isOccluded
                          ? 'w-1.5 h-1.5 border-slate-400/50 border-dashed'
                          : 'w-1.5 h-1.5 border-slate-200/75'
                  }`}
                />
              </div>
            )}

            {/* Brief confirmation chip ONLY after target destruction (never over living spacecraft) */}
            {marker.showWorldLabel && marker.justDestroyed && (
              <div
                data-testid="world-enemy-destroyed-chip"
                data-enemy-id={marker.id}
                style={{
                  left: `${marker.labelX * 100}%`,
                  top: `${marker.labelY * 100}%`,
                  opacity: marker.opacity,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none px-1.5 py-0.5 bg-[#050911]/80 border-b border-rose-400/80 text-[8.5px] font-mono-tabular uppercase tracking-[0.12em] text-rose-300 whitespace-nowrap"
              >
                Destroyed
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* Subtle Predictive Lead Aim Pip for Locked Target (FULL & MINIMAL only) */}
      {showEnemyInfo &&
        space.predictiveLeadReticle &&
        space.predictiveLeadReticle.visible &&
        selectedTarget &&
        !selectedTarget.isCapital && (
          <div
            data-testid="predictive-lead-reticle"
            style={{
              left: `${space.predictiveLeadReticle.x * 100}%`,
              top: `${space.predictiveLeadReticle.y * 100}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 rounded-full border border-sky-300/75 flex items-center justify-center"
          >
            <span className="w-1 h-1 rounded-full bg-sky-200/85" />
          </div>
        )}

      {/* Minimal Off-Screen Directional Edge Chevrons (Unmounted in OFF mode) */}
      {showEnemyInfo && (space.offscreenTargets ?? []).map((off) => (
        <div
          key={`off-${off.id}`}
          data-testid="offscreen-target-indicator"
          data-targeted={off.isTargeted ? 'true' : 'false'}
          style={{
            left: `${off.edgeX * 100}%`,
            top: `${off.edgeY * 100}%`,
            opacity: off.opacity,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-0.5 hud-text-shadow"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            style={{ transform: `rotate(${off.angleDeg}deg)` }}
            aria-hidden="true"
          >
            <polyline
              points="3,10 7,3 11,10"
              fill="none"
              stroke={
                off.isTargeted
                  ? '#fb7185'
                  : off.shipClass === 'capital'
                    ? '#f59e0b'
                    : '#cbd5e1'
              }
              strokeWidth="1.6"
              strokeLinecap="square"
            />
          </svg>
          {enemyInfoMode === 'full' && (off.isTargeted || off.shipClass === 'capital') && (
            <span className="text-[7.5px] font-mono-tabular text-slate-200/90 whitespace-nowrap leading-none">
              {formatDistanceCompact(off.distanceMeters)}
            </span>
          )}
        </div>
      ))}

      {/* ===================================================================== */}
      {/* 3D SCREEN-SPACE WAYPOINTS & TARGET LOCK BRACKET                       */}
      {/* ===================================================================== */}
      {(() => {
        const visibleWps = space.waypoints.filter((wp) => wp.inView && !wp.cleared);
        const limitedWps = isCompactPhone ? visibleWps.slice(0, 1) : visibleWps.slice(0, 2);
        return limitedWps.map((wp) => (
          <div
            key={wp.id}
            style={{
              left: `${Math.max(14, Math.min(86, wp.screenX * 100))}%`,
              top: `${Math.max(18, Math.min(isTouchMode ? 58 : 76, wp.screenY * 100))}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
          >
            <div className="w-2.5 h-2.5 rotate-45 border border-sky-300/90 bg-sky-400/15" />
            <span className="mt-1 px-1.5 py-0.5 bg-[#070b11]/75 border border-sky-400/35 text-[8.5px] font-mono-tabular uppercase tracking-[0.12em] text-sky-200 max-w-[175px] truncate">
              {wp.label} · {wp.distanceKm.toFixed(1)} KM
            </span>
          </div>
        ));
      })()}

      {/* Center Aerospace Boresight Reticle + Crisp Hitmarker Flash (Preserved across ALL modes including OFF!) */}
      <div
        data-testid="center-boresight-reticle"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
      >
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-2.5 bg-sky-200/80" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-2.5 bg-sky-200/80" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] w-2.5 bg-sky-200/80" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[1px] w-2.5 bg-sky-200/80" />
          <div
            className={`w-1 h-1 rounded-full ${
              space.weaponOverheated
                ? 'bg-rose-400'
                : space.lockProgress >= 0.99
                  ? 'bg-rose-300'
                  : 'bg-amber-300'
            }`}
          />
          {space.hitMarkerTimer > 0 && (
            <svg
              viewBox="0 0 32 32"
              className="absolute inset-0 w-10 h-10"
              aria-hidden="true"
            >
              <line
                x1="6"
                y1="6"
                x2="12"
                y2="12"
                stroke={space.hitMarkerKill ? '#fb7185' : '#fde047'}
                strokeWidth={space.hitMarkerKill ? '2.2' : '1.6'}
              />
              <line
                x1="26"
                y1="6"
                x2="20"
                y2="12"
                stroke={space.hitMarkerKill ? '#fb7185' : '#fde047'}
                strokeWidth={space.hitMarkerKill ? '2.2' : '1.6'}
              />
              <line
                x1="6"
                y1="26"
                x2="12"
                y2="20"
                stroke={space.hitMarkerKill ? '#fb7185' : '#fde047'}
                strokeWidth={space.hitMarkerKill ? '2.2' : '1.6'}
              />
              <line
                x1="26"
                y1="26"
                x2="20"
                y2="20"
                stroke={space.hitMarkerKill ? '#fb7185' : '#fde047'}
                strokeWidth={space.hitMarkerKill ? '2.2' : '1.6'}
              />
            </svg>
          )}
          {/* Directional Incoming-Fire Warning Arc around Reticle */}
          {space.incomingDamageAngleDeg !== null && (
            <svg
              data-testid="incoming-fire-arc"
              viewBox="0 0 80 80"
              className="absolute -inset-5 w-20 h-20 pointer-events-none"
              style={{ transform: `rotate(${space.incomingDamageAngleDeg}deg)` }}
              aria-hidden="true"
            >
              <path
                d="M 22 10 A 34 34 0 0 1 58 10"
                fill="none"
                stroke="#fb7185"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
        {space.activeWeapon === 'rail_cannon' && space.railChargePct > 2 && (
          <div className="mt-1 w-24 h-1 bg-[#070b11]/85 border border-sky-300/50 overflow-hidden">
            <div
              className="h-full bg-sky-300"
              style={{ width: `${Math.min(100, Math.round(space.railChargePct))}%` }}
            />
          </div>
        )}
      </div>

      {/* Capital Ship Active Subsystem Precision Reticle (Hidden in OFF mode) */}
      {showEnemyInfo &&
        space.selectedSubsystem &&
        space.capitalShip &&
        !space.capitalShip.destroyed &&
        space.targetInView && (
          <div
            data-testid="capital-subsystem-reticle"
            style={{
              left: `${Math.max(10, Math.min(90, space.targetScreenX * 100))}%`,
              top: `${Math.max(18, Math.min(isTouchMode ? 62 : 78, space.targetScreenY * 100))}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2"
          >
            <div className="relative w-7 h-7 shrink-0">
              <span
                className={`absolute top-0 left-0 w-2 h-2 border-t-[1.5px] border-l-[1.5px] ${
                  space.lockProgress >= 0.99 ? 'border-rose-400' : 'border-amber-300'
                }`}
              />
              <span
                className={`absolute top-0 right-0 w-2 h-2 border-t-[1.5px] border-r-[1.5px] ${
                  space.lockProgress >= 0.99 ? 'border-rose-400' : 'border-amber-300'
                }`}
              />
              <span
                className={`absolute bottom-0 left-0 w-2 h-2 border-b-[1.5px] border-l-[1.5px] ${
                  space.lockProgress >= 0.99 ? 'border-rose-400' : 'border-amber-300'
                }`}
              />
              <span
                className={`absolute bottom-0 right-0 w-2 h-2 border-b-[1.5px] border-r-[1.5px] ${
                  space.lockProgress >= 0.99 ? 'border-rose-400' : 'border-amber-300'
                }`}
              />
            </div>
            {enemyInfoMode === 'full' && (
              <span className="px-1.5 py-0.5 bg-[#050911]/75 border-b border-amber-300/60 text-[8.5px] font-mono-tabular uppercase tracking-[0.1em] text-amber-200 whitespace-nowrap hud-text-shadow">
                {space.selectedSubsystem}
                {space.lockProgress >= 0.99 ? ' · LOCKED' : ''}
              </span>
            )}
          </div>
        )}

      {/* ===================================================================== */}
      {/* TOP HUD BAR (z-30 strictly above MobileTouchControls z-20)            */}
      {/* ===================================================================== */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-start justify-between gap-2 px-3 pt-2 md:px-5 md:pt-3.5"
        style={{
          paddingTop: 'max(0.55rem, var(--safe-top))',
          paddingLeft: 'max(0.75rem, var(--safe-left))',
          paddingRight: 'max(0.75rem, var(--safe-right))',
        }}
      >
        {/* TOP-LEFT: Open-Frame Craft Integrity & Operation Header */}
        <div
          className={`avionics-bracket ${
            isCompactLandscapeTouch
              ? 'px-2 py-1 w-[212px]'
              : isCompactPhone
                ? 'px-2 py-1.5 max-w-[54vw]'
                : 'px-3 py-2 min-w-[240px] max-w-[310px]'
          }`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-xs font-bold uppercase tracking-[0.12em] text-amber-300 truncate">
              {space.activeLevelCode ?? space.campaignMissionCode}
              {!isCompactLandscapeTouch ? ` · ${space.selectedShipName}` : ''}
            </span>
            {!isCompactHud && (
              <span className="text-[10px] font-mono-tabular text-sky-300 shrink-0">
                {space.speed} M/S
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-1.5 mt-0.5">
            <p className="text-[10px] text-slate-200 leading-tight line-clamp-1">
              {isCompactLandscapeTouch
                ? space.activeLevelName ?? space.missionObjectiveLabel
                : space.activeLevelName
                  ? `${space.activeLevelName} — ${space.missionObjectiveLabel}`
                  : space.missionObjectiveLabel}
            </p>
            {space.activeLevelObjectiveBadge && !isCompactHud && (
              <span className="px-1 py-0.5 border border-sky-400/40 bg-sky-950/45 text-[7.5px] font-mono-tabular uppercase tracking-wider text-sky-200 shrink-0">
                {space.activeLevelObjectiveBadge}
              </span>
            )}
          </div>

          {/* Level Countdown Timer & Protected Asset Integrity (shown only when active for this level) */}
          {(space.levelTimerRemainingSec !== null || space.protectedEntity) && (
            <div
              data-testid="level-objective-telemetry"
              className={`${isCompactLandscapeTouch ? 'mt-1 pt-0.5' : 'mt-1.5 pt-1'} border-t border-slate-700/40 space-y-0.5 text-[8.5px] font-mono-tabular`}
            >
              {space.levelTimerRemainingSec !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase tracking-wider">
                    {space.levelTimerKind === 'survival'
                      ? 'SURVIVE'
                      : space.levelTimerKind === 'escape'
                        ? 'INTERCEPT'
                        : 'TIME LEFT'}
                  </span>
                  <span
                    className={`font-semibold ${
                      space.levelTimerKind !== 'survival' && space.levelTimerRemainingSec <= 30
                        ? 'text-rose-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {formatTimerMMSS(space.levelTimerRemainingSec)}
                  </span>
                </div>
              )}
              {space.protectedEntity && (
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="text-emerald-300 truncate">{space.protectedEntity.name}</span>
                    <span
                      className={
                        space.protectedEntity.hpPct < 35 ? 'text-rose-400 font-semibold' : 'text-emerald-200'
                      }
                    >
                      {space.protectedEntity.hpPct}%
                    </span>
                  </div>
                  <div className="h-[2.5px] bg-slate-900 overflow-hidden">
                    <div
                      className={`h-full ${
                        space.protectedEntity.hpPct < 35 ? 'bg-rose-500' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${space.protectedEntity.hpPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extinction Stage, EW Interference, Extraction & Orbital Pylon Telemetry */}
          {(space.battleStage || space.ewInterference?.active || space.extractionState?.active || space.orbitalPylonsRemaining > 0) && (
            <div
              data-testid="extinction-mission-telemetry"
              className="mt-1 pt-1 border-t border-slate-700/45 space-y-0.5 text-[8.5px] font-mono-tabular"
            >
              {space.battleStage && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="truncate">{space.battleStage.label}</span>
                  <span className="text-amber-300 shrink-0">
                    STAGE {space.battleStage.stageNumber}/{space.battleStage.totalStages}
                  </span>
                </div>
              )}
              {space.ewInterference?.active && (
                <div
                  data-testid="ew-interference-indicator"
                  className="px-1.5 py-0.5 bg-fuchsia-950/80 border border-fuchsia-400/70 text-fuchsia-200 font-semibold uppercase tracking-wider"
                >
                  EW JAMMING · MISSILE LOCK SLOWED ({Math.round(space.ewInterference.lockSpeedMultiplier * 100)}%)
                </div>
              )}
              {space.extractionState?.active && (
                <div
                  data-testid="extraction-indicator"
                  className="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-400/80 text-emerald-200 font-semibold uppercase tracking-wider flex items-center justify-between"
                >
                  <span>EXTRACTION BEACON</span>
                  <span>
                    {space.extractionState.reached
                      ? 'REACHED'
                      : space.extractionState.distanceMeters !== null
                        ? `${space.extractionState.distanceMeters}M`
                        : 'OPEN'}
                  </span>
                </div>
              )}
              {space.orbitalPylonsRemaining > 0 && (
                <div className="text-amber-300 uppercase">
                  KILL ZONE PYLONS ACTIVE: {space.orbitalPylonsRemaining}
                </div>
              )}
            </div>
          )}

          {!isTouchMode && space.activeLevelOptionalText && (
            <div className="mt-1 text-[8.5px] font-mono-tabular flex items-center justify-between gap-1.5 text-slate-400">
              <span className="truncate">
                OPT: {space.activeLevelOptionalText}
              </span>
              <span
                className={
                  space.activeLevelOptionalCompleted ? 'text-emerald-300 font-semibold shrink-0' : 'text-slate-500 shrink-0'
                }
              >
                {space.activeLevelOptionalCompleted ? 'DONE' : 'ACTIVE'}
              </span>
            </div>
          )}

          {/* Hairline Shield & Hull Gauges */}
          <div className={`${isCompactLandscapeTouch ? 'mt-1' : 'mt-2'} space-y-1`}>
            <div className="flex items-center gap-2">
              <span className="w-7 text-[8.5px] font-mono-tabular uppercase tracking-wider text-sky-300">
                SHD
              </span>
              <div className="flex-1 h-[4px] bg-slate-900/90 overflow-hidden">
                <div className="h-full bg-[#5cc8ff]" style={{ width: `${shieldPct}%` }} />
              </div>
              <span className="w-7 text-right text-[9.5px] font-mono-tabular text-sky-200">
                {shieldPct}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-7 text-[8.5px] font-mono-tabular uppercase tracking-wider text-emerald-300">
                HULL
              </span>
              <div className="flex-1 h-[4px] bg-slate-900/90 overflow-hidden">
                <div
                  className={`h-full ${
                    hullPct < 30 ? 'bg-rose-500' : hullPct < 60 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${hullPct}%` }}
                />
              </div>
              <span className="w-7 text-right text-[9.5px] font-mono-tabular text-emerald-200">
                {hullPct}%
              </span>
            </div>
          </div>

          {/* Sector & Flight State Footer */}
          {!isCompactLandscapeTouch && (
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] font-mono-tabular text-slate-400">
              <span>
                {space.regionCode} · ZONES {space.zonesClearedCount}/{space.zonesTotalCount}
              </span>
              <span className="text-amber-300">
                {space.isSupercruise
                  ? 'SUPERCRUISE'
                  : space.autopilotActive
                    ? 'AUTOPILOT'
                    : `${space.distanceTraveledKm.toFixed(1)} KM`}
              </span>
            </div>
          )}

          {!isTouchMode && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-700/35 flex items-center justify-between text-[9px] font-mono-tabular text-slate-400">
              <span>ENG {Math.round(space.engineIntegrity)}%</span>
              <span>CTL {Math.round(space.controlIntegrity)}%</span>
              <span>WPN {Math.round(space.weaponIntegrity)}%</span>
              <button
                type="button"
                onClick={onUseRepairKit}
                disabled={space.repairKits <= 0}
                className="pointer-events-auto flex items-center gap-1 px-1.5 py-0.5 border border-emerald-400/45 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-35 cursor-pointer"
              >
                <Wrench className="w-2.5 h-2.5" />
                [H] {space.repairKits}
              </button>
            </div>
          )}
        </div>

        {/* TOP-CENTER (Desktop/Tablet): Compact Sector Bar & Capital Ship Subsystem Strip */}
        <div className="hidden md:flex flex-col items-center gap-1.5 max-w-[46vw]">
          {!isTouchMode && !isCockpit && (
            <div className="pointer-events-auto flex items-center gap-0.5 avionics-panel p-0.5">
              {SPACE_REGION_LIST.map((reg) => {
                const active = reg.id === space.currentRegionId;
                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => onTravelSpaceRegion(reg.id)}
                    className={`px-2 py-1 text-[9px] font-mono-tabular uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#e6edf5] text-[#05080f] font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {reg.code}
                  </button>
                );
              })}
            </div>
          )}

          {/* Dedicated Non-Extinction-Boss Capital Target Panel (Unmounted when Extinction Boss card is active to avoid stacked overlap) */}
          {showEnemyInfo && cap && !cap.destroyed && !space.extinctionBoss && (
            <div
              data-testid="capital-ship-hud"
              className="w-full min-w-[350px] avionics-bracket border-rose-400/45 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[8px] text-rose-400 leading-none shrink-0" aria-hidden="true">
                    ▲▲
                  </span>
                  <span className="font-display text-xs font-bold uppercase tracking-[0.12em] text-rose-200 truncate">
                    {cap.name}
                    {enemyInfoMode === 'full' && cap.bossPhase ? ` · Phase ${cap.bossPhase}/3` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono-tabular shrink-0">
                  {space.capitalShipDistanceMeters !== null && (
                    <span className="text-slate-300">
                      {formatDistanceCompact(space.capitalShipDistanceMeters)}
                    </span>
                  )}
                  <span className="text-sky-300">
                    SHD {Math.round((cap.shield / Math.max(1, cap.maxShield)) * 100)}%
                  </span>
                  <span className="text-amber-300">
                    HULL {Math.round((cap.hull / Math.max(1, cap.maxHull)) * 100)}%
                  </span>
                  {enemyInfoMode === 'full' && (
                    <button
                      type="button"
                      data-testid="capital-subsystems-toggle"
                      onClick={() => setSubsystemsManualToggle(!showSubsystems)}
                      className="pointer-events-auto flex items-center gap-0.5 px-1.5 py-0.5 border border-slate-700/70 bg-[#070b11]/85 text-[8px] text-slate-300 hover:border-amber-300/70 hover:text-amber-200 uppercase tracking-wider cursor-pointer"
                    >
                      <span>Subsystems</span>
                      {showSubsystems ? (
                        <ChevronUp className="w-2.5 h-2.5" />
                      ) : (
                        <ChevronDown className="w-2.5 h-2.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <div className="h-[3.5px] bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-[#5cc8ff] transition-[width] duration-75"
                    style={{ width: `${Math.round((cap.shield / Math.max(1, cap.maxShield)) * 100)}%` }}
                  />
                </div>
                <div className="h-[3.5px] bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-[width] duration-75"
                    style={{ width: `${Math.round((cap.hull / Math.max(1, cap.maxHull)) * 100)}%` }}
                  />
                </div>
              </div>
              {enemyInfoMode === 'full' && showSubsystems && (
                <div data-testid="capital-subsystems-grid" className="mt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[8px] font-mono-tabular text-slate-400">
                    <span className={cap.bridgeDestroyed ? 'text-rose-400 line-through' : 'text-slate-300'}>
                      BRIDGE {cap.bridgeDestroyed ? 'OFFLINE' : `${Math.round((cap.bridgeHealth / Math.max(1, cap.bridgeMaxHealth)) * 100)}%`}
                    </span>
                    <span>ARMOR PLATES {cap.armorPlatesRemaining}/3</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {CAPITAL_SUBSYSTEM_KEYS.map((key) => {
                      const sub = cap.subsystems[key];
                      const selected = space.selectedSubsystem === key;
                      const pct = Math.round((sub.health / Math.max(1, sub.maxHealth)) * 100);
                      return (
                        <div
                          key={key}
                          className={`px-1 py-0.5 border text-center font-mono-tabular ${
                            sub.destroyed
                              ? 'bg-slate-950/60 border-slate-800 text-slate-600 line-through'
                              : sub.empDisabledTimer > 0
                                ? 'bg-sky-950/75 border-sky-400/70 text-sky-200'
                                : selected
                                  ? 'bg-amber-950/75 border-amber-400/80 text-amber-200'
                                  : 'bg-[#070b11]/75 border-slate-700/45 text-slate-300'
                          }`}
                        >
                          <div className="text-[7.5px] font-semibold uppercase truncate">{key}</div>
                          <div className="text-[8px]">
                            {sub.destroyed ? 'OFF' : sub.empDisabledTimer > 0 ? 'EMP' : `${pct}%`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extinction Mini-Boss & Major Boss Unified Tactical Phase, Subsystems, Core & Telegraph HUD */}
          {showEnemyInfo && space.extinctionBoss && (!space.extinctionBoss.meltdownActive || space.extinctionBoss.bossId === 'sovereign_extinction') && (
            <div
              data-testid="extinction-boss-hud"
              className={`w-full max-w-[460px] avionics-panel px-3 py-2 ${
                space.extinctionBoss.bossKind === 'major_boss'
                  ? 'border-rose-500/80'
                  : 'border-amber-400/75'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[9.5px] font-mono-tabular">
                <span className="font-semibold uppercase tracking-wider text-rose-300 truncate">
                  {space.extinctionBoss.bossKind === 'major_boss' ? 'MAJOR BOSS' : 'MINI-BOSS'} ·{' '}
                  {space.extinctionBoss.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {space.capitalShipDistanceMeters !== null && cap && !cap.destroyed && (
                    <span className="text-slate-300">
                      {formatDistanceCompact(space.capitalShipDistanceMeters)}
                    </span>
                  )}
                  <span className="text-amber-300 font-semibold">
                    {space.extinctionBoss.phaseLabel}
                  </span>
                </div>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] font-mono-tabular text-sky-300">
                    <span>SHIELD</span>
                    <span>{space.extinctionBoss.shieldPct}%</span>
                  </div>
                  <div className="h-[3.5px] bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-[#5cc8ff] transition-[width] duration-75"
                      style={{ width: `${space.extinctionBoss.shieldPct}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] font-mono-tabular text-rose-300">
                    <span>HULL</span>
                    <span>{space.extinctionBoss.hpPct}%</span>
                  </div>
                  <div className="h-[3.5px] bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 transition-[width] duration-75"
                      style={{ width: `${space.extinctionBoss.hpPct}%` }}
                    />
                  </div>
                </div>
              </div>
              {cap && !cap.destroyed && enemyInfoMode === 'full' && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[8px] font-mono-tabular text-slate-400">
                    <span className={cap.bridgeDestroyed ? 'text-rose-400 line-through' : 'text-slate-300'}>
                      BRIDGE {cap.bridgeDestroyed ? 'OFFLINE' : `${Math.round((cap.bridgeHealth / Math.max(1, cap.bridgeMaxHealth)) * 100)}%`} · PLATES {cap.armorPlatesRemaining}/3
                    </span>
                    <button
                      type="button"
                      data-testid="capital-subsystems-toggle"
                      onClick={() => setSubsystemsManualToggle(!showSubsystems)}
                      className="pointer-events-auto flex items-center gap-0.5 px-1.5 py-0.5 border border-slate-700/70 bg-[#070b11]/85 text-[8px] text-slate-300 hover:border-amber-300/70 hover:text-amber-200 uppercase tracking-wider cursor-pointer"
                    >
                      <span>Subsystems</span>
                      {showSubsystems ? (
                        <ChevronUp className="w-2.5 h-2.5" />
                      ) : (
                        <ChevronDown className="w-2.5 h-2.5" />
                      )}
                    </button>
                  </div>
                  {showSubsystems && (
                    <div data-testid="capital-subsystems-grid" className="grid grid-cols-5 gap-1">
                      {CAPITAL_SUBSYSTEM_KEYS.map((key) => {
                        const sub = cap.subsystems[key];
                        const selected = space.selectedSubsystem === key;
                        const pct = Math.round((sub.health / Math.max(1, sub.maxHealth)) * 100);
                        return (
                          <div
                            key={key}
                            className={`px-1 py-0.5 border text-center font-mono-tabular ${
                              sub.destroyed
                                ? 'bg-slate-950/60 border-slate-800 text-slate-600 line-through'
                                : sub.empDisabledTimer > 0
                                  ? 'bg-sky-950/75 border-sky-400/70 text-sky-200'
                                  : selected
                                    ? 'bg-amber-950/75 border-amber-400/80 text-amber-200'
                                    : 'bg-[#070b11]/75 border-slate-700/45 text-slate-300'
                            }`}
                          >
                            <div className="text-[7.5px] font-semibold uppercase truncate">{key}</div>
                            <div className="text-[8px]">
                              {sub.destroyed ? 'OFF' : sub.empDisabledTimer > 0 ? 'EMP' : `${pct}%`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {space.extinctionBoss.mainHullInvulnerable && space.extinctionBoss.invulnerableReason && (
                <div className="mt-1.5 px-2 py-0.5 bg-cyan-950/75 border border-cyan-400/75 text-[8.5px] font-mono-tabular text-cyan-200 uppercase text-center">
                  CENTRAL BARRIER LOCKED — {space.extinctionBoss.invulnerableReason}
                </div>
              )}
              {space.extinctionBoss.cores && (
                <div
                  data-testid="harvester-cores-strip"
                  className="mt-1.5 grid grid-cols-3 gap-1 text-[8px] font-mono-tabular"
                >
                  {space.extinctionBoss.cores.map((core) => (
                    <div
                      key={core.id}
                      className={`px-1.5 py-0.5 border text-center uppercase ${
                        core.destroyed
                          ? 'bg-slate-950/70 border-slate-800 text-slate-600 line-through'
                          : 'bg-cyan-950/60 border-cyan-400/70 text-cyan-200'
                      }`}
                    >
                      {core.id.replace('core_', '').toUpperCase()} {core.destroyed ? 'SEVERED' : `${core.hpPct}%`}
                    </div>
                  ))}
                </div>
              )}
              {space.extinctionBoss.telegraphActive && (
                <div
                  data-testid="boss-telegraph-warning"
                  className="mt-1.5 px-2 py-0.5 bg-rose-950/90 border border-rose-400 text-[9px] font-mono-tabular text-rose-200 font-bold uppercase text-center animate-pulse"
                >
                  INCOMING {space.extinctionBoss.telegraphLabel} ({space.extinctionBoss.telegraphRemainingSec}s) — EVADE!
                </div>
              )}
              {space.extinctionBoss.meltdownActive && (
                <div className="mt-1.5 px-2 py-0.5 bg-amber-950/90 border border-amber-400 text-[9px] font-mono-tabular text-amber-200 font-bold uppercase text-center">
                  OMEGA COLLAPSE SEQUENCE — STEP {space.extinctionBoss.meltdownStep ?? 0}/10
                </div>
              )}
            </div>
          )}

          {/* Legendary Ace Boss Compact Telemetry Strip (Unmounted in OFF mode) */}
          {showEnemyInfo && space.legendaryPilot && space.legendaryPilot.alive && (
            <div
              data-testid="legendary-pilot-hud"
              className="w-full max-w-[440px] avionics-panel border-amber-400/65 px-3 py-1.5"
            >
              <div className="flex items-center justify-between gap-2 text-[9.5px] font-mono-tabular">
                <span className="text-amber-300 font-semibold uppercase truncate">
                  {enemyInfoMode === 'full'
                    ? `ACE · ${space.legendaryPilot.name} "${space.legendaryPilot.callsign}"`
                    : `ACE · ${space.legendaryPilot.callsign}`}
                </span>
                <span className="text-slate-300 shrink-0">
                  SHD {space.legendaryPilot.shieldPct}% · HULL {space.legendaryPilot.hullPct}%
                </span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <div className="h-[3px] bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-[#5cc8ff]"
                    style={{ width: `${space.legendaryPilot.shieldPct}%` }}
                  />
                </div>
                <div className="h-[3px] bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${space.legendaryPilot.hullPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TOP-RIGHT: Clean Action Strip + Vector Tactical Radar */}
        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex items-center gap-1">
            <button
              type="button"
              aria-label="Open Space Navigation Map"
              data-testid="hud-map-btn"
              onClick={onOpenWarMap}
              className={`${
                isTouchMode ? 'min-w-[44px] min-h-[44px] px-2.5' : 'px-2.5 py-1.5'
              } flex items-center gap-1.5 avionics-panel border-amber-400/55 text-amber-300 hover:bg-amber-400 hover:text-[#05080f] text-[10px] font-mono-tabular uppercase tracking-[0.12em] transition-colors cursor-pointer`}
            >
              <Map className="w-3.5 h-3.5" />
              {!isCompactPhone && <span>Map{!isTouchMode ? ' [M]' : ''}</span>}
            </button>

            {!isTouchMode && (
              <>
                <button
                  type="button"
                  aria-label="Toggle Supercruise"
                  onClick={onToggleSupercruise}
                  className={`px-2 py-1.5 flex items-center gap-1 border text-[10px] font-mono-tabular uppercase tracking-wider transition-colors cursor-pointer ${
                    space.isSupercruise
                      ? 'bg-sky-400 border-sky-200 text-[#05080f] font-semibold'
                      : 'avionics-panel text-sky-300 hover:border-sky-300/70'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  [V]
                </button>
                <button
                  type="button"
                  aria-label="Toggle Navigation Autopilot"
                  onClick={onToggleAutopilot}
                  className={`px-2 py-1.5 flex items-center gap-1 border text-[10px] font-mono-tabular uppercase tracking-wider transition-colors cursor-pointer ${
                    space.autopilotActive
                      ? 'bg-emerald-400 border-emerald-200 text-[#05080f] font-semibold'
                      : 'avionics-panel text-emerald-300 hover:border-emerald-300/70'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  [G]
                </button>
                <button
                  type="button"
                  aria-label="Toggle Chase or Cockpit View"
                  onClick={onToggleSpaceCameraMode}
                  className={`px-2 py-1.5 flex items-center gap-1 border text-[10px] font-mono-tabular uppercase tracking-wider transition-colors cursor-pointer ${
                    isCockpit
                      ? 'bg-[#e6edf5] border-white text-[#05080f] font-semibold'
                      : 'avionics-panel text-slate-200 hover:border-slate-400'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  [C]
                </button>
              </>
            )}

            <button
              type="button"
              aria-label={hud.muted ? 'Unmute Audio' : 'Mute Audio'}
              onClick={onToggleMute}
              className={`${
                isTouchMode ? 'min-w-[44px] min-h-[44px]' : 'p-1.5'
              } flex items-center justify-center avionics-panel text-slate-300 hover:text-white hover:border-slate-400 cursor-pointer`}
            >
              {hud.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              aria-label="Pause and Settings"
              data-testid="hud-pause-btn"
              onClick={onTogglePause}
              className={`${
                isTouchMode ? 'min-w-[44px] min-h-[44px]' : 'p-1.5'
              } flex items-center justify-center avionics-panel text-slate-300 hover:text-white hover:border-slate-400 cursor-pointer`}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vector Orbital Radar (Hairline rings, zero neon glow) */}
          <div
            className={`relative rounded-full bg-[#070b11]/72 border border-slate-500/40 overflow-hidden ${
              isCompactPhone ? 'w-16 h-16' : 'w-24 h-24 md:w-28 md:h-28'
            }`}
          >
            <svg viewBox="-1 -1 2 2" className="w-full h-full">
              <circle cx="0" cy="0" r="0.34" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="0.018" />
              <circle cx="0" cy="0" r="0.68" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="0.018" />
              <line x1="-1" y1="0" x2="1" y2="0" stroke="rgba(148,163,184,0.16)" strokeWidth="0.016" />
              <line x1="0" y1="-1" x2="0" y2="1" stroke="rgba(148,163,184,0.16)" strokeWidth="0.016" />
              <polygon points="0,-0.12 -0.08,0.08 0.08,0.08" fill="#e6edf5" />
              {space.radarBlips.slice(0, 36).map((b) => (
                <circle
                  key={b.id}
                  cx={b.x * 0.88}
                  cy={b.z * 0.88}
                  r={b.kind === 'capital' ? 0.1 : b.isLocked ? 0.08 : 0.052}
                  fill={
                    b.kind === 'capital'
                      ? '#ef4444'
                      : b.kind === 'fighter'
                        ? b.isLocked
                          ? '#f59e0b'
                          : '#f87171'
                        : b.kind === 'friendly'
                          ? '#7dd3fc'
                          : b.kind === 'beacon'
                            ? '#34d399'
                            : b.kind === 'waypoint'
                              ? '#fbbf24'
                              : '#64748b'
                  }
                />
              ))}
            </svg>
          </div>

          {/* Dedicated Non-Obstructive Selected Target Edge Panel (Desktop right edge below radar; avoids duplicating active Capital HUD) */}
          {showEnemyInfo &&
            selectedTarget &&
            !isTouchMode &&
            !(selectedTarget.isCapital && cap && !cap.destroyed) && (
            <div
              data-testid="selected-target-panel"
              data-mode={enemyInfoMode}
              className={`w-60 avionics-bracket px-2.5 py-2 ${
                selectedTarget.isLocked
                  ? 'border-rose-400/70'
                  : selectedTarget.threatLevel === 'elite' || selectedTarget.threatLevel === 'capital'
                    ? 'border-amber-400/60'
                    : 'border-sky-400/50'
              }`}
            >
              {enemyInfoMode === 'full' ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-[8.5px] font-mono-tabular uppercase tracking-[0.12em]">
                    <span className="text-sky-300 truncate">{selectedTarget.classification}</span>
                    <span className="text-slate-300 shrink-0">
                      {formatDistanceCompact(selectedTarget.distanceMeters)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      {(() => {
                        const threat = getThreatChevron(selectedTarget.threatLevel);
                        return threat ? (
                          <span className={`text-[8px] shrink-0 ${threat.tone}`} aria-label={threat.label}>
                            {threat.glyph}
                          </span>
                        ) : null;
                      })()}
                      <span className="font-display text-xs font-bold uppercase tracking-[0.06em] text-slate-100 truncate">
                        {selectedTarget.name}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {selectedTarget.hasShields && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 text-[8px] font-mono-tabular text-sky-300">SHD</span>
                        <div className="flex-1 h-[3px] bg-slate-900 overflow-hidden">
                          <div
                            className="h-full bg-[#5cc8ff] transition-[width] duration-75"
                            style={{ width: `${selectedTarget.shieldPct}%` }}
                          />
                        </div>
                        <span className="w-7 text-right text-[8.5px] font-mono-tabular text-sky-200">
                          {selectedTarget.shieldPct}%
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 text-[8px] font-mono-tabular text-slate-300">HULL</span>
                      <div className="flex-1 h-[3.5px] bg-slate-900 overflow-hidden">
                        <div
                          className={`h-full transition-[width] duration-75 ${
                            selectedTarget.hullPct < 30
                              ? 'bg-rose-500'
                              : selectedTarget.hullPct < 60
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                          }`}
                          style={{ width: `${selectedTarget.hullPct}%` }}
                        />
                      </div>
                      <span className="w-7 text-right text-[8.5px] font-mono-tabular text-slate-200">
                        {selectedTarget.hullPct}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 pt-1 border-t border-slate-700/35 flex items-center justify-between text-[8px] font-mono-tabular uppercase tracking-[0.12em]">
                    <span
                      className={
                        selectedTarget.isOccluded
                          ? 'text-slate-400'
                          : selectedTarget.isLocked
                            ? 'text-rose-300 font-semibold'
                            : 'text-amber-300'
                      }
                    >
                      {selectedTarget.isOccluded
                        ? 'OCCLUDED'
                        : selectedTarget.isLocked
                          ? 'LOCKED'
                          : `LOCK ${Math.round(selectedTarget.lockProgress * 100)}%`}
                    </span>
                    <span className="text-slate-400">[{toggleKeyLabel}] {getEnemyInfoDisplayModeLabel(enemyInfoMode)}</span>
                  </div>
                </>
              ) : (
                /* MINIMAL mode: essential health % + distance only */
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-mono-tabular">
                    <span className="text-slate-300">TGT {selectedTarget.hullPct}%</span>
                    <span className="text-sky-300">
                      {formatDistanceCompact(selectedTarget.distanceMeters)}
                    </span>
                  </div>
                  <div className="h-[3.5px] bg-slate-900 overflow-hidden">
                    <div
                      className={`h-full transition-[width] duration-75 ${
                        selectedTarget.hullPct < 30
                          ? 'bg-rose-500'
                          : selectedTarget.hullPct < 60
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                      }`}
                      style={{ width: `${selectedTarget.hullPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compact Mobile Selected Target Strip (Safe top-center edge on landscape, clear of SYS drawer/joystick/reticle) */}
      {showEnemyInfo && isTouchMode && selectedTarget && !selectedTarget.isCapital && (
        <div
          data-testid="selected-target-panel-mobile"
          data-mode={enemyInfoMode}
          className={`absolute z-15 w-[176px] avionics-panel border-sky-400/50 px-2 py-1 pointer-events-none ${
            deviceProfile.orientation === 'landscape' ? 'left-1/2 -translate-x-1/2' : 'right-3'
          }`}
          style={{
            top:
              deviceProfile.orientation === 'landscape'
                ? cap && !cap.destroyed
                  ? 'calc(var(--safe-top) + 62px)'
                  : 'calc(var(--safe-top) + 10px)'
                : isCompactPhone
                  ? 'calc(var(--safe-top) + 124px)'
                  : 'calc(var(--safe-top) + 158px)',
          }}
        >
          {enemyInfoMode === 'full' ? (
            <>
              <div className="flex items-center justify-between gap-1 text-[8px] font-mono-tabular leading-tight">
                <span className="text-slate-100 font-semibold truncate">{selectedTarget.name}</span>
                <span className="text-sky-300 shrink-0">
                  {formatDistanceCompact(selectedTarget.distanceMeters)}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {selectedTarget.hasShields && (
                  <div className="h-[2.5px] bg-slate-900 overflow-hidden">
                    <div className="h-full bg-[#5cc8ff]" style={{ width: `${selectedTarget.shieldPct}%` }} />
                  </div>
                )}
                <div className="h-[3px] bg-slate-900 overflow-hidden">
                  <div
                    className={`h-full ${
                      selectedTarget.hullPct < 30
                        ? 'bg-rose-500'
                        : selectedTarget.hullPct < 60
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                    }`}
                    style={{ width: `${selectedTarget.hullPct}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[8px] font-mono-tabular">
                <span className="text-slate-200">{selectedTarget.hullPct}%</span>
                <span className="text-sky-300">{formatDistanceCompact(selectedTarget.distanceMeters)}</span>
              </div>
              <div className="h-[3px] bg-slate-900 overflow-hidden">
                <div
                  className={`h-full ${selectedTarget.hullPct < 30 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                  style={{ width: `${selectedTarget.hullPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact Mobile Capital Target Strip (< md viewport, unmounted in OFF mode) */}
      {showEnemyInfo && cap && !cap.destroyed && (
        <div
          data-testid="capital-ship-hud-mobile"
          className="md:hidden absolute left-1/2 -translate-x-1/2 top-[112px] w-[74vw] max-w-[310px] avionics-panel border-rose-400/50 px-2.5 py-1.5"
        >
          <div className="flex items-center justify-between gap-2 text-[8.5px] font-mono-tabular text-rose-200">
            <span className="truncate font-semibold uppercase">{cap.name}</span>
            <span className="shrink-0 text-slate-300">
              {space.capitalShipDistanceMeters !== null
                ? `${formatDistanceCompact(space.capitalShipDistanceMeters)} · `
                : ''}
              {Math.round((cap.hull / Math.max(1, cap.maxHull)) * 100)}%
            </span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            <div className="h-[3px] bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-[#5cc8ff]"
                style={{ width: `${Math.round((cap.shield / Math.max(1, cap.maxShield)) * 100)}%` }}
              />
            </div>
            <div className="h-[3px] bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-rose-500"
                style={{ width: `${Math.round((cap.hull / Math.max(1, cap.maxHull)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TACTICAL ALERTS (Asteroid Proximity, Missile Lock, Mode Switch Toast) */}
      {/* ===================================================================== */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-25 flex flex-col items-center gap-1.5 pointer-events-none ${
          isCompactLandscapeTouch
            ? 'top-[22%] max-w-[44vw]'
            : deviceProfile.orientation === 'portrait' && isTouchMode
              ? 'top-[27%] max-w-[88vw]'
              : space.extinctionBoss
                ? 'top-[27%] max-w-[88vw]'
                : cap && !cap.destroyed
                  ? 'top-[24%] max-w-[88vw]'
                  : 'top-[19%] max-w-[88vw]'
        }`}
      >
        {typeof window !== 'undefined' &&
          window.location.search.includes('debugEncounter=1') &&
          space.encounterDiagnostics && (
            <div
              data-testid="encounter-diagnostics-overlay"
              className="w-[460px] max-w-[92vw] bg-black/90 border border-emerald-400/75 px-2.5 py-2 text-[9px] font-mono-tabular text-emerald-200 leading-tight"
            >
              <div className="font-bold text-emerald-300 uppercase mb-0.5">
                ENCOUNTER DIAGNOSTICS ({space.encounterDiagnostics.activeCampaignTrack} · {space.encounterDiagnostics.activeLevelId ?? 'free'})
              </div>
              <div>
                STAGE: {space.encounterDiagnostics.encounterStage}/{space.encounterDiagnostics.totalStages} ({space.encounterDiagnostics.stageLabel}) · COND: {space.encounterDiagnostics.advanceWhen}
              </div>
              <div>
                SPAWN_COND: {space.encounterDiagnostics.bossSpawnCondition} · ATTEMPTS: {space.encounterDiagnostics.bossSpawnAttemptCount} · CREATED: {String(space.encounterDiagnostics.bossEntityCreated)} · REG: {String(space.encounterDiagnostics.sceneRegistered)}
              </div>
              <div>
                BOSS_ID: {space.encounterDiagnostics.bossEntityId ?? 'none'} · PHASE: {space.encounterDiagnostics.bossPhase} · DIST: {space.encounterDiagnostics.distanceToPlayerMeters ?? 'n/a'}m · IN_VIEW: {String(space.encounterDiagnostics.bossInCameraView)} · HP: {space.encounterDiagnostics.bossHealth ?? 0} SHD: {space.encounterDiagnostics.bossShield ?? 0}
              </div>
              <div>
                AI: {space.encounterDiagnostics.bossAiState} · TGT: {String(space.encounterDiagnostics.targetAssigned)} · DEFEAT: {space.encounterDiagnostics.defeatState}
              </div>
            </div>
          )}
        {hud.enemyInfoModeToast && (
          <div
            data-testid="enemy-info-mode-toast"
            className="avionics-panel border-sky-300/75 px-3.5 py-1 text-[10px] font-mono-tabular uppercase tracking-[0.14em] text-sky-100 text-center"
          >
            {isTouchMode ? hud.enemyInfoModeToast.replace(/\s*\[[^\]]+\]\s*$/, '') : hud.enemyInfoModeToast}
          </div>
        )}
        {space.capitalCriticalCountdown?.active && (
          <div
            data-testid="capital-critical-countdown-banner"
            className="flex flex-col items-center justify-center bg-rose-950/95 border-2 border-rose-500 px-5 py-2 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.55)] animate-pulse"
          >
            <div className="flex items-center gap-2 text-[12px] md:text-[14px] font-mono-tabular font-bold tracking-[0.2em] text-rose-200 uppercase">
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
              CAPITAL SHIP CRITICAL — ESCAPE NOW
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] font-mono tracking-wider text-rose-300">
              <span>DETONATION IN:</span>
              <span
                data-testid="capital-critical-countdown-digit"
                className="text-[18px] md:text-[22px] font-bold text-white bg-rose-900/90 px-3 py-0.5 rounded border border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)]"
              >
                {space.capitalCriticalCountdown.displayDigit > 0
                  ? space.capitalCriticalCountdown.displayDigit
                  : 'DETONATING'}
              </span>
              <span className="text-[10px] text-rose-400/90 font-mono uppercase">
                (DANGER RADIUS: 620M)
              </span>
            </div>
          </div>
        )}
        {space.solidProximityWarning && (
          <div
            data-testid="solid-proximity-warning"
            className={`flex items-center gap-2 px-3.5 py-1.5 border text-[10.5px] font-mono-tabular uppercase tracking-[0.14em] shadow-lg ${
              space.solidProximityWarning.risk === 'critical'
                ? 'bg-rose-950/95 border-rose-400 text-rose-100 animate-pulse'
                : 'bg-amber-950/90 border-amber-400/80 text-amber-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>SOLID OBSTACLE PROXIMITY · CLOSING AT {Math.round(space.solidProximityWarning.closingSpeed)} M/S</span>
            {space.solidProximityWarning.timeToImpactSec !== null && (
              <span className="font-bold text-rose-300">
                · IMPACT IN {space.solidProximityWarning.timeToImpactSec.toFixed(1)}S
              </span>
            )}
          </div>
        )}
        {space.incomingMissile && (
          <div className="flex items-center gap-2 bg-rose-950/90 border border-rose-400/80 px-3 py-1 text-[10.5px] font-mono-tabular uppercase tracking-[0.14em] text-rose-100">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
            INCOMING MISSILE — DEPLOY FLARES {!isTouchMode && '[R]'}
          </div>
        )}

        {(space.asteroidAlert.risk === 'critical' || space.asteroidAlert.risk === 'caution') && (
          <div
            className={`flex items-center gap-2 px-3 py-1 border text-[10px] font-mono-tabular uppercase tracking-[0.14em] ${
              space.asteroidAlert.risk === 'critical'
                ? 'bg-rose-950/90 border-rose-400/80 text-rose-100'
                : 'bg-amber-950/85 border-amber-400/75 text-amber-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            PROXIMITY ALERT · {Math.round(space.asteroidAlert.nearestDistance)}M
          </div>
        )}

        {space.collisionWarningBanner && (
          <div className="bg-rose-950/90 border border-rose-400/80 px-3 py-1 text-[10px] font-mono-tabular uppercase tracking-[0.12em] text-rose-100 text-center">
            {space.collisionWarningBanner}
          </div>
        )}

        {space.criticalDamageWarning && !space.collisionWarningBanner && (
          <div className="bg-rose-950/90 border border-rose-400/80 px-3 py-1 text-[10px] font-mono-tabular uppercase tracking-[0.14em] text-rose-100 text-center">
            CRITICAL AIRFRAME / ENGINE DAMAGE — {space.repairKits > 0 ? 'REPAIR [H]' : 'SEEK REPAIR BEACON'}
          </div>
        )}

        {space.reinforcementBanner && !space.collisionWarningBanner && (
          <div
            data-testid="reinforcement-banner"
            className="bg-amber-950/90 border border-amber-400/80 px-3 py-1 text-[10px] font-mono-tabular uppercase tracking-[0.12em] text-amber-100 text-center"
          >
            {space.reinforcementBanner}
          </div>
        )}

        {space.activeMissionEvent && !space.collisionWarningBanner && !space.reinforcementBanner && (
          <div
            data-testid="mission-event-banner"
            className="avionics-panel border-amber-300/60 px-3 py-1 text-[10px] font-mono-tabular uppercase tracking-[0.12em] text-amber-200 text-center"
          >
            {space.activeMissionEvent}
          </div>
        )}

        {space.statusToast && !space.collisionWarningBanner && !space.reinforcementBanner && (
          <div className="avionics-panel border-sky-300/45 px-3 py-1 text-[9.5px] md:text-[10.5px] font-mono-tabular uppercase tracking-[0.1em] text-sky-100 text-center">
            {space.statusToast}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* DESKTOP BOTTOM HUD (Slim Open-Frame Avionics — Clear Viewport Center) */}
      {/* ===================================================================== */}
      {!isTouchMode && (
        <div className="absolute bottom-3.5 left-5 right-5 flex items-end justify-between gap-4">
          {/* Bottom-Left: Wingman Squadron Strip + Minimal Scrolling Tactical Comms Strip */}
          <div className="w-72 flex flex-col gap-1.5">
            {space.wingmen && space.wingmen.length > 0 && (
              <div
                data-testid="wingman-hud-panel"
                className="avionics-bracket px-2.5 py-1.5 space-y-1"
              >
                <div className="flex items-center justify-between text-[8.5px] font-mono-tabular uppercase tracking-[0.14em] text-sky-300">
                  <span>VANGUARD WING</span>
                  <span className="text-amber-300">{space.wingmanCommand.toUpperCase()}</span>
                </div>
                <div className="pointer-events-auto grid grid-cols-4 gap-1">
                  {(
                    [
                      { id: 'attack', key: 'F1', label: 'ATK' },
                      { id: 'defend', key: 'F2', label: 'DEF' },
                      { id: 'cover', key: 'F3', label: 'CVR' },
                      { id: 'regroup', key: 'F4', label: 'RGP' },
                    ] as const
                  ).map((btn) => {
                    const active = space.wingmanCommand === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        data-testid={`wingman-cmd-${btn.id}`}
                        onClick={() => onIssueWingmanCommand(btn.id)}
                        className={`px-1 py-0.5 border text-[8.5px] font-mono-tabular uppercase transition-colors cursor-pointer ${
                          active
                            ? 'bg-sky-300 border-white text-[#05080f] font-semibold'
                            : 'bg-[#070b11]/80 border-slate-700/60 text-slate-300 hover:border-sky-300/70'
                        }`}
                      >
                        {btn.key} {btn.label}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-0.5">
                  {space.wingmen.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between gap-2 text-[8.5px] font-mono-tabular"
                    >
                      <span
                        className={
                          w.status === 'disabled'
                            ? 'text-rose-400/80 line-through truncate'
                            : 'text-slate-200 truncate'
                        }
                      >
                        {w.callsign}
                      </span>
                      <span className="shrink-0 text-slate-400">
                        {w.status === 'disabled'
                          ? 'DISABLED'
                          : `${w.hullPct}% · ${w.kills}K`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="avionics-bracket px-2.5 py-2">
              <div className="flex items-center justify-between text-[9px] font-mono-tabular uppercase tracking-[0.16em] text-slate-400 mb-1">
                <span>COMMS LOG</span>
                <span className="text-sky-300">HOSTILES {space.hostilesRemaining}</span>
              </div>
              <div className="space-y-0.5 max-h-16 overflow-hidden">
                {hud.combatFeed.slice(-3).map((entry) => (
                  <div key={entry.id} className="text-[9.5px] leading-snug flex items-start gap-1.5">
                    <span
                      className={`font-mono-tabular font-semibold uppercase shrink-0 ${
                        entry.severity === 'critical'
                          ? 'text-rose-400'
                          : entry.severity === 'warning'
                            ? 'text-amber-300'
                            : entry.severity === 'combat'
                              ? 'text-sky-300'
                              : 'text-slate-400'
                      }`}
                    >
                      [{entry.tag}]
                    </span>
                    <span className="text-slate-200 line-clamp-1">{entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom-Center: Sleek Low-Profile 5-Weapon Rail */}
          <div className="pointer-events-auto flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 avionics-panel p-1">
              {SPACE_WEAPON_LIST.map((wpn) => {
                const active = space.activeWeapon === wpn.id;
                const ballisticsTag = WEAPON_BALLISTICS[wpn.id].hudRangeTag;
                const missileSubLabel =
                  wpn.id === 'missile'
                    ? `${space.missilesRemaining}/${space.maxMissiles} · ${
                        space.missileLockReady ? 'LOCKED' : 'LOCK REQ'
                      }`
                    : ballisticsTag;
                return (
                  <button
                    key={wpn.id}
                    type="button"
                    data-testid={`weapon-btn-${wpn.id}`}
                    onClick={() => onSelectSpaceWeapon(wpn.id)}
                    className={`px-2.5 py-1 border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#e6edf5] border-white text-[#05080f]'
                        : 'bg-[#070b11]/70 border-slate-700/50 text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="text-[9.5px] font-mono-tabular font-semibold uppercase tracking-wider leading-none">
                      [{wpn.keyBind}] {wpn.shortName}
                    </div>
                    <div
                      className={`text-[8px] font-mono-tabular mt-0.5 ${
                        wpn.id === 'missile' && space.missileLockReady && !active
                          ? 'text-rose-300 font-semibold'
                          : 'opacity-80'
                      }`}
                    >
                      {missileSubLabel}
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onTriggerCountermeasure}
                className={`px-2.5 py-1 border cursor-pointer transition-colors ${
                  space.flareDecoyActive
                    ? 'bg-amber-400/25 border-amber-300 text-amber-200'
                    : 'bg-[#070b11]/70 border-sky-400/45 text-sky-200 hover:border-sky-300'
                }`}
              >
                <div className="text-[9.5px] font-mono-tabular font-semibold uppercase leading-none">
                  [R] {space.flareDecoyActive ? 'DECOY ON' : 'FLARES'}
                </div>
                <div className="text-[8.5px] font-mono-tabular mt-0.5 text-sky-300">
                  {space.countermeasuresRemaining}/{space.maxCountermeasures}
                  {space.flareCooldownPct > 0 && !space.flareDecoyActive ? ' · CD' : ''}
                </div>
              </button>
            </div>

            {!isCockpit && (
              <div className="text-[9px] font-mono-tabular tracking-[0.06em] text-slate-400 hud-text-shadow">
                WASD FLY · SHIFT BOOST · [V] CRUISE · [C] VIEW · [{toggleKeyLabel}] INFO ({getEnemyInfoDisplayModeLabel(enemyInfoMode).toUpperCase()}) · TAB TARGET · LMB FIRE
              </div>
            )}
          </div>

          {/* Bottom-Right: Compact Skill Score/Combo + Boost & Thermal Telemetry */}
          <div className="w-56 flex flex-col gap-1.5">
            {/* Non-cluttered Combat Score & Skill Combo Strip */}
            <div
              data-testid="combat-score-hud"
              className="avionics-bracket px-2.5 py-1.5 space-y-1"
            >
              <div className="flex items-baseline justify-between gap-2 font-mono-tabular">
                <span className="text-[8.5px] uppercase tracking-[0.14em] text-slate-400">
                  SCORE
                </span>
                <span className="text-xs font-bold text-white">
                  {space.combatScore.toLocaleString()}
                </span>
              </div>
              {space.comboCount > 0 && (
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[8.5px] font-mono-tabular">
                    <span className="text-amber-300 font-semibold">
                      COMBO {space.comboCount} · x{space.comboMultiplier.toFixed(2)}
                    </span>
                    {space.consecutiveHits >= 3 && (
                      <span className="text-sky-300">STREAK {space.consecutiveHits}</span>
                    )}
                  </div>
                  <div className="h-[2.5px] bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-[width] duration-75"
                      style={{ width: `${Math.round(space.comboTimerRatio * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {space.activeBonusCallout && (
                <div
                  data-testid="combat-bonus-callout"
                  className="text-[8.5px] font-mono-tabular uppercase tracking-wider text-emerald-300 flex items-center justify-between gap-1"
                >
                  <span className="truncate">{space.activeBonusCallout.label}</span>
                  <span className="shrink-0 font-semibold">+{space.activeBonusCallout.points}</span>
                </div>
              )}
            </div>

            <div className="avionics-bracket px-2.5 py-2 space-y-1.5">
              <div>
                <div className="flex items-center justify-between text-[9px] font-mono-tabular uppercase tracking-wider">
                  <span className="text-slate-400">THRUST BOOST</span>
                  <span
                    data-testid="boost-status-badge"
                    className={
                      space.boostState === 'boosting'
                        ? 'text-amber-300 font-semibold'
                        : space.boostState === 'low'
                          ? 'text-rose-400 font-semibold'
                          : space.boostState === 'recharging'
                            ? 'text-sky-300'
                            : 'text-emerald-300'
                    }
                  >
                    {space.boostState.toUpperCase()} · {Math.round(space.boostEnergy)}%
                  </span>
                </div>
                <div className="mt-0.5 h-[3.5px] bg-slate-900 overflow-hidden">
                  <div
                    className={`h-full transition-[width] duration-75 ${
                      space.boostState === 'low'
                        ? 'bg-rose-500'
                        : space.boostState === 'boosting'
                          ? 'bg-amber-300'
                          : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.round(space.boostEnergy)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[9px] font-mono-tabular uppercase tracking-wider">
                  <span className={space.weaponOverheated ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                    {space.weaponOverheated ? 'OVERHEATED' : 'WEAPON HEAT'}
                  </span>
                  <span className={space.weaponOverheated || space.weaponHeat > 75 ? 'text-rose-400' : 'text-sky-300'}>
                    {Math.round(space.weaponHeat)}%
                  </span>
                </div>
                <div className="mt-0.5 h-[3.5px] bg-slate-900 overflow-hidden">
                  <div
                    className={`h-full ${space.weaponOverheated || space.weaponHeat > 75 ? 'bg-rose-500' : 'bg-[#5cc8ff]'}`}
                    style={{ width: `${Math.round(space.weaponHeat)}%` }}
                  />
                </div>
              </div>

              <div className="pt-1 border-t border-slate-700/35 flex items-center justify-between text-[8.5px] font-mono-tabular text-slate-400">
                <span>KILLS {space.kills}</span>
                <span>ASSIST {space.flightAssist ? 'ON' : 'OFF'}</span>
                <span className="text-sky-300">{space.cameraMode.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile & Tablet Touch Controls Layer */}
      {isTouchMode && !space.isDestroyed && (
        <MobileTouchControls
          space={space}
          deviceProfile={deviceProfile}
          mobileSettings={mobileSettings}
          onJoystickChange={onTouchJoystickChange}
          onCameraLook={onTouchCameraLook}
          onPrimaryFireChange={onTouchPrimaryFireChange}
          onFlightButtonChange={onTouchFlightButtonChange}
          onFireMissile={onFireMissile}
          onCycleWeapon={onCycleSpaceWeapon}
          onCycleTarget={onCycleSpaceTarget}
          onTriggerCountermeasure={onTriggerCountermeasure}
          onUseRepairKit={onUseRepairKit}
          onToggleSupercruise={onToggleSupercruise}
          onToggleAutopilot={onToggleAutopilot}
          onToggleFlightAssist={onToggleFlightAssist}
          onToggleCameraMode={onToggleSpaceCameraMode}
          onDismissPortraitHint={onDismissPortraitHint}
          onIssueWingmanCommand={onIssueWingmanCommand}
          onCycleEnemyInfoDisplayMode={onCycleEnemyInfoDisplayMode}
        />
      )}
        </>
      )}
    </div>
  );
};
