import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Crosshair,
  Eye,
  Flame,
  Navigation,
  RotateCcw,
  RotateCw,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type { SpaceHudSnapshot } from '../scene/spaceCombat';
import {
  computeTouchLayoutMetrics,
  evaluateVirtualJoystick,
  triggerHapticFeedback,
  type DeviceProfile,
  type MobileControlSettings,
} from '../world/mobileControls';
import { SPACE_WEAPONS } from '../world/spacePhysics';
import type { WingmanCommandId } from '../world/combatExpansion';

interface MobileTouchControlsProps {
  space: SpaceHudSnapshot;
  deviceProfile: DeviceProfile;
  mobileSettings: MobileControlSettings;
  onJoystickChange: (x: number, y: number) => void;
  onCameraLook: (dx: number, dy: number) => void;
  onPrimaryFireChange: (down: boolean) => void;
  onFlightButtonChange: (
    button: 'boost' | 'brake' | 'rollLeft' | 'rollRight' | 'throttleForward' | 'throttleReverse',
    down: boolean,
  ) => void;
  onFireMissile: () => void;
  onCycleWeapon: () => void;
  onCycleTarget: () => void;
  onTriggerCountermeasure: () => void;
  onUseRepairKit: () => void;
  onToggleSupercruise: () => void;
  onToggleAutopilot: () => void;
  onToggleFlightAssist: () => void;
  onToggleCameraMode: () => void;
  onDismissPortraitHint: () => void;
  onIssueWingmanCommand: (cmd: WingmanCommandId) => void;
  onCycleEnemyInfoDisplayMode: () => void;
}

export const MobileTouchControls: React.FC<MobileTouchControlsProps> = ({
  space,
  deviceProfile,
  mobileSettings,
  onJoystickChange,
  onCameraLook,
  onPrimaryFireChange,
  onFlightButtonChange,
  onFireMissile,
  onCycleWeapon,
  onCycleTarget,
  onTriggerCountermeasure,
  onUseRepairKit,
  onToggleSupercruise,
  onToggleAutopilot,
  onToggleFlightAssist,
  onToggleCameraMode,
  onDismissPortraitHint,
  onIssueWingmanCommand,
  onCycleEnemyInfoDisplayMode,
}) => {
  const metrics = useMemo(
    () => computeTouchLayoutMetrics(deviceProfile, mobileSettings),
    [deviceProfile, mobileSettings],
  );

  // Virtual Flight Joystick state (dedicated pointer ID, auto-resets on cancel/unmount)
  const joyRef = useRef<HTMLDivElement | null>(null);
  const joyPointerIdRef = useRef<number | null>(null);
  const joyOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joyVisual, setJoyVisual] = useState<{ dx: number; dy: number; active: boolean }>({
    dx: 0,
    dy: 0,
    active: false,
  });

  // Dedicated Non-Firing Camera Look Drag surface state
  const lookPointerIdRef = useRef<number | null>(null);
  const lookLastRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Active hold states for tactile visual feedback
  const [fireHeld, setFireHeld] = useState(false);
  const [boostHeld, setBoostHeld] = useState(false);
  const [brakeHeld, setBrakeHeld] = useState(false);
  const [rollLeftHeld, setRollLeftHeld] = useState(false);
  const [rollRightHeld, setRollRightHeld] = useState(false);
  const [utilityOpen, setUtilityOpen] = useState(false);
  const [wingmanOpen, setWingmanOpen] = useState(false);

  const maxJoyRadius = Math.round((metrics.joystickDiameterPx - metrics.thumbDiameterPx) * 0.52);

  // Guarantee zero stuck touch inputs or stuck visual highlights on unmount, OS blur, or tab hide
  useEffect(() => {
    const resetAllTouchVisuals = () => {
      joyPointerIdRef.current = null;
      lookPointerIdRef.current = null;
      setJoyVisual({ dx: 0, dy: 0, active: false });
      setFireHeld(false);
      setBoostHeld(false);
      setBrakeHeld(false);
      setRollLeftHeld(false);
      setRollRightHeld(false);
      onJoystickChange(0, 0);
      onPrimaryFireChange(false);
      onFlightButtonChange('boost', false);
      onFlightButtonChange('brake', false);
      onFlightButtonChange('rollLeft', false);
      onFlightButtonChange('rollRight', false);
    };
    const handleVisibility = () => {
      if (document.hidden) resetAllTouchVisuals();
    };
    window.addEventListener('blur', resetAllTouchVisuals);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', resetAllTouchVisuals);
      document.removeEventListener('visibilitychange', handleVisibility);
      resetAllTouchVisuals();
    };
  }, [onJoystickChange, onPrimaryFireChange, onFlightButtonChange]);

  const resetJoystick = useCallback(() => {
    joyPointerIdRef.current = null;
    setJoyVisual({ dx: 0, dy: 0, active: false });
    onJoystickChange(0, 0);
  }, [onJoystickChange]);

  const handleJoyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joyPointerIdRef.current !== null) return;
    const rect = joyRef.current?.getBoundingClientRect();
    if (!rect) return;
    joyPointerIdRef.current = e.pointerId;
    joyOriginRef.current = {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const sample = evaluateVirtualJoystick(
      e.clientX - joyOriginRef.current.x,
      e.clientY - joyOriginRef.current.y,
      maxJoyRadius,
    );
    setJoyVisual({ dx: sample.clampedDx, dy: sample.clampedDy, active: true });
    onJoystickChange(sample.x, sample.y);
    triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
  };

  const handleJoyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    const sample = evaluateVirtualJoystick(
      e.clientX - joyOriginRef.current.x,
      e.clientY - joyOriginRef.current.y,
      maxJoyRadius,
    );
    setJoyVisual({ dx: sample.clampedDx, dy: sample.clampedDy, active: true });
    onJoystickChange(sample.x, sample.y);
  };

  const handleJoyPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    resetJoystick();
  };

  // Dedicated non-firing Camera Look drag zone
  const handleLookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerIdRef.current !== null) return;
    lookPointerIdRef.current = e.pointerId;
    lookLastRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleLookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - lookLastRef.current.x;
    const dy = e.clientY - lookLastRef.current.y;
    lookLastRef.current = { x: e.clientX, y: e.clientY };
    onCameraLook(dx * 1.45, dy * 1.45);
  };

  const handleLookPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerIdRef.current !== e.pointerId) return;
    lookPointerIdRef.current = null;
  };

  const handlePrimaryFireDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFireHeld(true);
    onPrimaryFireChange(true);
    triggerHapticFeedback(mobileSettings.hapticsEnabled, 'fire');
  };

  const handlePrimaryFireUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setFireHeld(false);
    onPrimaryFireChange(false);
  };

  const handleHoldFlightDown =
    (
      button: 'boost' | 'brake' | 'rollLeft' | 'rollRight',
      setter: React.Dispatch<React.SetStateAction<boolean>>,
      haptic: 'boost' | 'tap',
    ) =>
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setter(true);
      onFlightButtonChange(button, true);
      triggerHapticFeedback(mobileSettings.hapticsEnabled, haptic);
    };

  const handleHoldFlightUp =
    (
      button: 'boost' | 'brake' | 'rollLeft' | 'rollRight',
      setter: React.Dispatch<React.SetStateAction<boolean>>,
    ) =>
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setter(false);
      onFlightButtonChange(button, false);
    };

  const leftHanded = mobileSettings.leftHanded;
  const controlOpacity = mobileSettings.buttonOpacity;
  const activeWeaponSpec = SPACE_WEAPONS[space.activeWeapon];
  const lockReady = space.lockProgress >= 0.99 && space.missilesRemaining > 0;
  const showPortraitBanner =
    deviceProfile.showPortraitHint && !mobileSettings.portraitHintDismissed;

  const edgePadX = deviceProfile.formFactor === 'small_phone' ? 12 : 20;
  const edgePadY = deviceProfile.formFactor === 'small_phone' ? 12 : 18;
  const joyOffsetStyle: React.CSSProperties = leftHanded
    ? {
        right: `calc(var(--safe-right) + ${edgePadX - mobileSettings.buttonOffsetX}px)`,
        bottom: `calc(var(--safe-bottom) + ${edgePadY - mobileSettings.buttonOffsetY}px)`,
        opacity: controlOpacity,
      }
    : {
        left: `calc(var(--safe-left) + ${edgePadX + mobileSettings.buttonOffsetX}px)`,
        bottom: `calc(var(--safe-bottom) + ${edgePadY - mobileSettings.buttonOffsetY}px)`,
        opacity: controlOpacity,
      };

  const combatOffsetStyle: React.CSSProperties = leftHanded
    ? {
        left: `calc(var(--safe-left) + ${edgePadX + mobileSettings.buttonOffsetX}px)`,
        bottom: `calc(var(--safe-bottom) + ${edgePadY - mobileSettings.buttonOffsetY}px)`,
        opacity: controlOpacity,
      }
    : {
        right: `calc(var(--safe-right) + ${edgePadX - mobileSettings.buttonOffsetX}px)`,
        bottom: `calc(var(--safe-bottom) + ${edgePadY - mobileSettings.buttonOffsetY}px)`,
        opacity: controlOpacity,
      };

  // Ring progress for weapon heat / rail charge on Primary Fire button (both are 0..100)
  const primaryRingPct =
    space.activeWeapon === 'rail_cannon' && space.railChargePct > 0
      ? Math.round(space.railChargePct)
      : Math.round(space.weaponHeat);
  const ringRadius = Math.round(metrics.primaryButtonPx * 0.44);
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - Math.min(1, primaryRingPct / 100));

  const compactLandscapeDrawer = deviceProfile.viewportHeight < 460;

  return (
    <div
      data-testid="mobile-touch-controls"
      data-left-handed={leftHanded ? 'true' : 'false'}
      data-form-factor={deviceProfile.formFactor}
      className="fixed inset-0 z-20 pointer-events-none select-none touch-surface"
    >
      {/* Dedicated Non-Firing Camera Look Drag Surface (strictly below top HUD bar) */}
      <div
        data-testid="touch-camera-look-surface"
        aria-label="Drag to steer camera view"
        onPointerDown={handleLookPointerDown}
        onPointerMove={handleLookPointerMove}
        onPointerUp={handleLookPointerUp}
        onPointerCancel={handleLookPointerUp}
        className="absolute left-0 right-0 bottom-0 pointer-events-auto touch-surface"
        style={{ top: 'calc(var(--safe-top) + 74px)' }}
      />

      {/* Non-Blocking Portrait Orientation Suggestion Banner */}
      {showPortraitBanner && (
        <div
          data-testid="portrait-orientation-hint"
          className="pointer-events-auto absolute left-3 right-3 z-30 flex items-center justify-between gap-2 avionics-panel-solid border-amber-400/55 px-3 py-1.5"
          style={{ top: 'calc(var(--safe-top) + 124px)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0 rotate-90" />
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-200 truncate">
              Rotate to landscape for wider starfighter view
            </span>
          </div>
          <button
            type="button"
            aria-label="Dismiss orientation suggestion"
            onClick={(e) => {
              e.stopPropagation();
              triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
              onDismissPortraitHint();
            }}
            className="min-w-[32px] min-h-[32px] flex items-center justify-center border border-slate-700 bg-[#05080f] text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIRTUAL FLIGHT JOYSTICK CLUSTER                                   */}
      {/* ================================================================= */}
      <div
        className="pointer-events-none absolute flex flex-col items-center gap-2"
        style={joyOffsetStyle}
      >
        {/* Inline Roll Left / Right buttons for Tablets & Large Landscape Phones */}
        {metrics.showInlineRollButtons && (
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              aria-label="Roll Left"
              onPointerDown={handleHoldFlightDown('rollLeft', setRollLeftHeld, 'tap')}
              onPointerUp={handleHoldFlightUp('rollLeft', setRollLeftHeld)}
              onPointerCancel={handleHoldFlightUp('rollLeft', setRollLeftHeld)}
              className={`min-w-[46px] min-h-[36px] px-2.5 flex items-center justify-center gap-1 border text-[10px] font-mono-tabular font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                rollLeftHeld
                  ? 'bg-sky-400 border-sky-200 text-[#05080f]'
                  : 'avionics-panel text-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              L
            </button>
            <button
              type="button"
              aria-label="Roll Right"
              onPointerDown={handleHoldFlightDown('rollRight', setRollRightHeld, 'tap')}
              onPointerUp={handleHoldFlightUp('rollRight', setRollRightHeld)}
              onPointerCancel={handleHoldFlightUp('rollRight', setRollRightHeld)}
              className={`min-w-[46px] min-h-[36px] px-2.5 flex items-center justify-center gap-1 border text-[10px] font-mono-tabular font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                rollRightHeld
                  ? 'bg-sky-400 border-sky-200 text-[#05080f]'
                  : 'avionics-panel text-slate-200'
              }`}
            >
              R
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Virtual Flight Joystick Pad (Restrained Aerospace Ring) */}
        <div
          ref={joyRef}
          role="slider"
          aria-label="Virtual Flight Joystick"
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-valuenow={Math.round((joyVisual.dx / Math.max(1, maxJoyRadius)) * 100)}
          data-testid="virtual-flight-joystick"
          onPointerDown={handleJoyPointerDown}
          onPointerMove={handleJoyPointerMove}
          onPointerUp={handleJoyPointerUp}
          onPointerCancel={handleJoyPointerUp}
          style={{
            width: `${metrics.joystickDiameterPx}px`,
            height: `${metrics.joystickDiameterPx}px`,
          }}
          className={`pointer-events-auto relative rounded-full border flex items-center justify-center touch-surface transition-colors ${
            joyVisual.active
              ? 'bg-[#070b11]/78 border-sky-300/85'
              : 'bg-[#070b11]/58 border-slate-400/40'
          }`}
        >
          <div className="absolute inset-2.5 rounded-full border border-slate-500/25 pointer-events-none" />
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[1.5px] h-2 bg-sky-300/60 pointer-events-none" />
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[1.5px] h-2 bg-sky-300/60 pointer-events-none" />
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-[1.5px] w-2 bg-sky-300/60 pointer-events-none" />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-[1.5px] w-2 bg-sky-300/60 pointer-events-none" />

          {/* Movable Thumb Puck */}
          <div
            style={{
              width: `${metrics.thumbDiameterPx}px`,
              height: `${metrics.thumbDiameterPx}px`,
              transform: `translate(${joyVisual.dx}px, ${joyVisual.dy}px)`,
            }}
            className={`rounded-full border flex items-center justify-center pointer-events-none transition-transform duration-75 ${
              joyVisual.active
                ? 'bg-sky-400/90 border-white text-[#05080f]'
                : 'bg-[#0d141f]/90 border-sky-300/65 text-sky-200'
            }`}
          >
            <Compass className="w-4 h-4" />
          </div>
        </div>

        {/* Speed / Boost & Brake quick thumb row */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Boost Thrusters"
            data-testid="touch-boost-btn"
            onPointerDown={handleHoldFlightDown('boost', setBoostHeld, 'boost')}
            onPointerUp={handleHoldFlightUp('boost', setBoostHeld)}
            onPointerCancel={handleHoldFlightUp('boost', setBoostHeld)}
            className={`relative overflow-hidden min-h-[38px] px-2.5 flex items-center gap-1 border text-[10px] font-mono-tabular font-semibold uppercase tracking-wider cursor-pointer ${
              boostHeld || space.isBoosting
                ? 'bg-amber-400 border-amber-200 text-[#05080f]'
                : space.boostState === 'low'
                  ? 'avionics-panel border-rose-400/55 text-rose-300'
                  : 'avionics-panel border-amber-400/50 text-amber-300'
            }`}
          >
            <span
              className="absolute left-0 bottom-0 h-[2.5px] bg-amber-300/90 pointer-events-none"
              style={{ width: `${Math.round(space.boostEnergy)}%` }}
            />
            <Flame className="w-3.5 h-3.5" />
            <span>BOOST {Math.round(space.boostEnergy)}%</span>
          </button>
          <button
            type="button"
            aria-label="Toggle Supercruise"
            data-testid="touch-supercruise-btn"
            onClick={(e) => {
              e.stopPropagation();
              triggerHapticFeedback(mobileSettings.hapticsEnabled, 'boost');
              onToggleSupercruise();
            }}
            className={`min-h-[38px] px-2.5 flex items-center gap-1 border text-[10px] font-mono-tabular font-semibold uppercase tracking-wider cursor-pointer ${
              space.isSupercruise
                ? 'bg-sky-400 border-sky-200 text-[#05080f]'
                : 'avionics-panel border-sky-400/45 text-sky-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            CRUISE
          </button>
          <button
            type="button"
            aria-label="Air Brake"
            data-testid="touch-brake-btn"
            onPointerDown={handleHoldFlightDown('brake', setBrakeHeld, 'tap')}
            onPointerUp={handleHoldFlightUp('brake', setBrakeHeld)}
            onPointerCancel={handleHoldFlightUp('brake', setBrakeHeld)}
            className={`min-h-[38px] px-2 flex items-center border text-[10px] font-mono-tabular font-semibold uppercase tracking-wider cursor-pointer ${
              brakeHeld
                ? 'bg-rose-500 border-rose-200 text-white'
                : 'avionics-panel text-slate-300'
            }`}
          >
            BRK
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* RIGHT COMBAT ACTION CLUSTER                                       */}
      {/* ================================================================= */}
      <div
        className="pointer-events-none absolute flex flex-col items-end gap-2"
        style={combatOffsetStyle}
      >
        {/* Expandable Utility Drawer Panel */}
        {utilityOpen && (
          <div
            data-testid="mobile-utility-drawer"
            className={`pointer-events-auto avionics-panel-solid p-1.5 grid gap-1.5 ${
              compactLandscapeDrawer ? 'grid-cols-3 min-w-[260px]' : 'grid-cols-2 min-w-[188px]'
            }`}
          >
            <button
              type="button"
              aria-label="Deploy Countermeasure Flares"
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
                onTriggerCountermeasure();
              }}
              className={`min-h-[42px] px-2 flex items-center justify-between gap-1 border text-[10px] font-mono-tabular uppercase cursor-pointer ${
                space.incomingMissile
                  ? 'bg-rose-600 border-rose-300 text-white'
                  : 'bg-[#070b11] border-slate-700/70 text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Flares
              </span>
              <span className="text-amber-300">{space.countermeasuresRemaining}</span>
            </button>

            <button
              type="button"
              aria-label="Nanite Hull Repair"
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
                onUseRepairKit();
              }}
              disabled={space.repairKits <= 0}
              className="min-h-[42px] px-2 flex items-center justify-between gap-1 border bg-[#070b11] border-emerald-500/45 text-emerald-300 text-[10px] font-mono-tabular uppercase cursor-pointer disabled:opacity-40"
            >
              <span className="flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5" />
                Repair
              </span>
              <span>{space.repairKits}</span>
            </button>

            <button
              type="button"
              aria-label="Toggle Navigation Autopilot"
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
                onToggleAutopilot();
              }}
              className={`min-h-[42px] px-2 flex items-center gap-1.5 border text-[10px] font-mono-tabular uppercase cursor-pointer ${
                space.autopilotActive
                  ? 'bg-emerald-500 border-emerald-200 text-[#05080f] font-semibold'
                  : 'bg-[#070b11] border-slate-700/70 text-slate-200'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              Auto-Nav
            </button>

            <button
              type="button"
              aria-label="Switch Cockpit or Chase Camera"
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
                onToggleCameraMode();
              }}
              className="min-h-[42px] px-2 flex items-center gap-1.5 border bg-[#070b11] border-slate-700/70 text-slate-200 text-[10px] font-mono-tabular uppercase cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-sky-300" />
              {space.cameraMode === 'chase' ? 'Cockpit' : 'Chase'}
            </button>

            <button
              type="button"
              aria-label="Toggle Flight Assist"
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
                onToggleFlightAssist();
              }}
              className={`min-h-[42px] px-2 flex items-center gap-1.5 border text-[10px] font-mono-tabular uppercase cursor-pointer justify-center ${
                space.flightAssist
                  ? 'bg-sky-950/80 border-sky-400/60 text-sky-200'
                  : 'bg-[#070b11] border-slate-700/70 text-slate-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Assist: {space.flightAssist ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              aria-label="Cycle Enemy Information Display Mode"
              data-testid="mobile-enemy-info-toggle"
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
                onCycleEnemyInfoDisplayMode();
              }}
              className={`min-h-[42px] px-2 flex items-center gap-1.5 border text-[10px] font-mono-tabular uppercase cursor-pointer justify-center ${
                (mobileSettings.enemyInfoDisplayMode ?? 'full') === 'off'
                  ? 'bg-[#070b11] border-slate-700/70 text-slate-400'
                  : 'bg-[#0e1928] border-sky-400/60 text-sky-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Info: {(mobileSettings.enemyInfoDisplayMode ?? 'full') === 'minimal' ? 'MIN' : (mobileSettings.enemyInfoDisplayMode ?? 'full').toUpperCase()}
            </button>

            {!metrics.showInlineRollButtons && (
              <>
                <button
                  type="button"
                  aria-label="Roll Left"
                  onPointerDown={handleHoldFlightDown('rollLeft', setRollLeftHeld, 'tap')}
                  onPointerUp={handleHoldFlightUp('rollLeft', setRollLeftHeld)}
                  onPointerCancel={handleHoldFlightUp('rollLeft', setRollLeftHeld)}
                  className="min-h-[40px] px-2 flex items-center justify-center gap-1 border bg-[#070b11] border-slate-700/70 text-slate-200 text-[10px] font-mono-tabular uppercase cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Roll L
                </button>
                <button
                  type="button"
                  aria-label="Roll Right"
                  onPointerDown={handleHoldFlightDown('rollRight', setRollRightHeld, 'tap')}
                  onPointerUp={handleHoldFlightUp('rollRight', setRollRightHeld)}
                  onPointerCancel={handleHoldFlightUp('rollRight', setRollRightHeld)}
                  className="min-h-[40px] px-2 flex items-center justify-center gap-1 border bg-[#070b11] border-slate-700/70 text-slate-200 text-[10px] font-mono-tabular uppercase cursor-pointer"
                >
                  Roll R
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Compact Expandable Wingman Orders Bar (Zero screen clutter when closed) */}
        {wingmanOpen && (
          <div
            data-testid="mobile-wingman-bar"
            className="pointer-events-auto avionics-panel-solid p-1.5 flex items-center gap-1"
          >
            {(
              [
                { id: 'attack', label: 'ATK' },
                { id: 'defend', label: 'DEF' },
                { id: 'cover', label: 'CVR' },
                { id: 'regroup', label: 'RGP' },
              ] as const
            ).map((cmd) => {
              const active = space.wingmanCommand === cmd.id;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  data-testid={`mobile-wingman-${cmd.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
                    onIssueWingmanCommand(cmd.id);
                    setWingmanOpen(false);
                  }}
                  className={`min-w-[44px] min-h-[40px] px-2 border text-[10px] font-mono-tabular font-semibold uppercase cursor-pointer ${
                    active
                      ? 'bg-sky-400 border-white text-[#05080f]'
                      : 'bg-[#070b11] border-slate-700/70 text-sky-200'
                  }`}
                >
                  {cmd.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Top Secondary Row: Wingman Toggle, Target Switch, Weapon Cycle, Utility Drawer Toggle */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {space.wingmen && space.wingmen.length > 0 && (
            <button
              type="button"
              aria-label="Wingman Orders"
              data-testid="mobile-wingman-toggle"
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
                setWingmanOpen((v) => !v);
                setUtilityOpen(false);
              }}
              style={{
                minWidth: `${metrics.utilityButtonPx}px`,
                minHeight: `${metrics.utilityButtonPx}px`,
              }}
              className={`px-2 flex flex-col items-center justify-center border cursor-pointer ${
                wingmanOpen
                  ? 'bg-sky-400 border-white text-[#05080f]'
                  : 'avionics-panel border-sky-400/45 text-sky-200'
              }`}
            >
              <span className="text-[9.5px] font-mono-tabular font-semibold uppercase leading-none">
                WING
              </span>
              <span className="text-[7.5px] font-mono-tabular uppercase opacity-80 mt-0.5">
                {space.wingmanCommand === 'attack'
                  ? 'ATK'
                  : space.wingmanCommand === 'defend'
                    ? 'DEF'
                    : space.wingmanCommand === 'cover'
                      ? 'CVR'
                      : 'RGP'}
              </span>
            </button>
          )}
          <button
            type="button"
            aria-label="Switch Target"
            data-testid="touch-target-btn"
            onClick={(e) => {
              e.stopPropagation();
              triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
              onCycleTarget();
            }}
            style={{
              minWidth: `${metrics.utilityButtonPx}px`,
              minHeight: `${metrics.utilityButtonPx}px`,
            }}
            className="px-2.5 flex flex-col items-center justify-center avionics-panel text-slate-200 active:bg-sky-500 active:text-[#05080f] cursor-pointer"
          >
            <Crosshair className="w-4 h-4 text-sky-300" />
            <span className="text-[8.5px] font-mono-tabular uppercase tracking-wider mt-0.5">TGT</span>
          </button>

          <button
            type="button"
            aria-label="Switch Active Weapon"
            data-testid="touch-weapon-btn"
            onClick={(e) => {
              e.stopPropagation();
              triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
              onCycleWeapon();
            }}
            style={{
              minWidth: `${metrics.utilityButtonPx + 14}px`,
              minHeight: `${metrics.utilityButtonPx}px`,
            }}
            className="px-2.5 flex flex-col items-center justify-center avionics-panel border-amber-400/50 text-amber-300 active:bg-amber-400 active:text-[#05080f] cursor-pointer"
          >
            <span className="text-[10px] font-mono-tabular font-semibold uppercase tracking-wider leading-none">
              {activeWeaponSpec.shortName}
            </span>
            <span className="text-[8px] font-mono-tabular uppercase text-slate-400 mt-0.5">
              WPN [{activeWeaponSpec.keyBind}/5]
            </span>
          </button>

          <button
            type="button"
            aria-label={utilityOpen ? 'Close Utility Systems' : 'Open Utility Systems'}
            aria-expanded={utilityOpen}
            data-testid="touch-utility-toggle"
            onClick={(e) => {
              e.stopPropagation();
              triggerHapticFeedback(mobileSettings.hapticsEnabled, 'tap');
              setUtilityOpen((v) => !v);
            }}
            style={{
              minWidth: `${metrics.utilityButtonPx}px`,
              minHeight: `${metrics.utilityButtonPx}px`,
            }}
            className={`px-2 flex flex-col items-center justify-center border cursor-pointer ${
              utilityOpen || space.incomingMissile
                ? 'bg-amber-400 border-amber-200 text-[#05080f]'
                : 'avionics-panel text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-[8.5px] font-mono-tabular uppercase mt-0.5">SYS</span>
          </button>
        </div>

        {/* Main Thumb Arc: Missile Lock/Launch + Large Primary Fire Button */}
        <div className="pointer-events-auto flex items-end gap-2.5">
          {(space.incomingMissile || space.weaponOverheated) && (
            <button
              type="button"
              aria-label={space.incomingMissile ? 'Deploy Emergency Flares' : 'Vent Overheated Weapons'}
              data-testid="touch-emergency-flare-btn"
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticFeedback(mobileSettings.hapticsEnabled, 'warning');
                onTriggerCountermeasure();
              }}
              style={{
                width: `${metrics.secondaryButtonPx}px`,
                height: `${metrics.secondaryButtonPx}px`,
              }}
              className={`rounded-full border flex flex-col items-center justify-center cursor-pointer ${
                space.incomingMissile
                  ? 'bg-rose-600/95 border-rose-200 text-white'
                  : 'bg-amber-500/95 border-amber-100 text-[#05080f]'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[8.5px] font-mono-tabular font-semibold uppercase">
                {space.incomingMissile ? 'FLARE' : 'VENT'}
              </span>
            </button>
          )}

          {/* Homing Missile Lock & Fire Button */}
          <button
            type="button"
            aria-label="Launch Homing Missile"
            data-testid="touch-missile-btn"
            onClick={(e) => {
              e.stopPropagation();
              triggerHapticFeedback(
                mobileSettings.hapticsEnabled,
                lockReady ? 'lock' : 'tap',
              );
              onFireMissile();
            }}
            style={{
              width: `${metrics.secondaryButtonPx}px`,
              height: `${metrics.secondaryButtonPx}px`,
            }}
            className={`relative rounded-full border flex flex-col items-center justify-center transition-colors cursor-pointer ${
              lockReady
                ? 'bg-amber-400 border-white text-[#05080f]'
                : 'bg-[#070b11]/78 border-amber-400/60 text-amber-300'
            }`}
          >
            <span className="text-[9.5px] font-mono-tabular font-semibold uppercase leading-none">
              MSL
            </span>
            <span className="text-[11px] font-mono-tabular font-bold leading-none mt-0.5">
              {space.missilesRemaining}
            </span>
            {space.lockProgress > 0.05 && !lockReady && (
              <span className="text-[8px] font-mono-tabular text-sky-300 leading-none mt-0.5">
                {Math.round(space.lockProgress * 100)}%
              </span>
            )}
          </button>

          {/* Primary Weapon Hold-to-Fire Button with Crisp Heat / Rail Charge Ring */}
          <button
            type="button"
            aria-label="Fire Primary Weapon"
            data-testid="touch-fire-btn"
            onPointerDown={handlePrimaryFireDown}
            onPointerUp={handlePrimaryFireUp}
            onPointerCancel={handlePrimaryFireUp}
            style={{
              width: `${metrics.primaryButtonPx}px`,
              height: `${metrics.primaryButtonPx}px`,
            }}
            className={`relative rounded-full border flex flex-col items-center justify-center touch-surface transition-transform cursor-pointer ${
              fireHeld
                ? 'bg-rose-600/92 border-white text-white scale-95'
                : 'bg-[#070b11]/82 border-rose-400/75 text-rose-100'
            }`}
          >
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
              viewBox={`0 0 ${metrics.primaryButtonPx} ${metrics.primaryButtonPx}`}
            >
              <circle
                cx={metrics.primaryButtonPx / 2}
                cy={metrics.primaryButtonPx / 2}
                r={ringRadius}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="2.5"
              />
              <circle
                cx={metrics.primaryButtonPx / 2}
                cy={metrics.primaryButtonPx / 2}
                r={ringRadius}
                fill="none"
                stroke={
                  space.activeWeapon === 'rail_cannon' && space.railChargePct > 0
                    ? '#7dd3fc'
                    : primaryRingPct > 78
                      ? '#ef4444'
                      : '#f59e0b'
                }
                strokeWidth="2.8"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringDashOffset}
                strokeLinecap="round"
              />
            </svg>
            <span className="font-display text-sm font-bold uppercase tracking-[0.14em] leading-none z-10">
              FIRE
            </span>
            <span className="text-[8.5px] font-mono-tabular uppercase text-rose-200/90 mt-0.5 z-10">
              {activeWeaponSpec.shortName}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
