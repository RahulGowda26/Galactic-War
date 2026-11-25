import React, { useState } from 'react';
import {
  Compass,
  Cpu,
  Home,
  Map,
  Play,
  RotateCcw,
  Sliders,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { EngineHudSnapshot } from '../scene/AetherPrimeEngine';
import type { DifficultyId } from '../world/campaignConfig';
import type {
  ControlModeOverride,
  MobileControlSettings,
  TouchControlScale,
} from '../world/mobileControls';
import {
  SPACE_REGION_LIST,
  type FlightControlSettings,
  type SpaceRegionId,
  type SpaceWeaponId,
} from '../world/spacePhysics';
import type { CameraShakeMode } from '../world/weaponFeedback';
import type { EnemyInfoDisplayMode } from '../world/targetHudLayout';
import type { AimAssistMode } from '../world/ballistics';
import {
  GRAPHICS_PRESETS,
  type GraphicsPresetId,
  type PlayerControlSettings,
} from '../world/streamingManager';

interface PauseModalProps {
  hud: EngineHudSnapshot;
  onResume: () => void;
  onOpenWarMap: () => void;
  onReturnToTitle: () => void;
  onTravelSpaceRegion: (regionId: SpaceRegionId) => void;
  onSetDifficulty: (diff: DifficultyId) => void;
  onSelectGraphicsPreset: (preset: GraphicsPresetId) => void;
  onUpdateControlSettings: (partial: Partial<PlayerControlSettings>) => void;
  onUpdateFlightSettings: (partial: Partial<FlightControlSettings>) => void;
  onUpdateMobileSettings: (partial: Partial<MobileControlSettings>) => void;
  onResetMobileSettings: () => void;
  onSetMasterVolume?: (vol: number) => void;
  onSetWeaponVolume?: (vol: number) => void;
  onToggleMute?: () => void;
  onTestFireWeapon?: (weapon: SpaceWeaponId) => void;
}

type PauseTab = 'flight' | 'mobile' | 'graphics' | 'audio';

export const PauseModal: React.FC<PauseModalProps> = ({
  hud,
  onResume,
  onOpenWarMap,
  onReturnToTitle,
  onTravelSpaceRegion,
  onSetDifficulty,
  onSelectGraphicsPreset,
  onUpdateControlSettings,
  onUpdateFlightSettings,
  onUpdateMobileSettings,
  onResetMobileSettings,
  onSetMasterVolume,
  onSetWeaponVolume,
  onToggleMute,
  onTestFireWeapon,
}) => {
  const [tab, setTab] = useState<PauseTab>(
    hud.deviceProfile.useTouchControls ? 'mobile' : 'flight',
  );
  const { flightSettings, mobileSettings, deviceProfile, controlSettings, performance } = hud;

  const mobilePresets: GraphicsPresetId[] = ['mobile_low', 'mobile_balanced', 'mobile_high'];
  const desktopPresets: GraphicsPresetId[] = ['low', 'medium', 'high', 'ultra'];

  return (
    <div
      data-testid="pause-modal"
      className="fixed inset-0 z-40 bg-[#05080f]/92 flex items-center justify-center p-3 md:p-6 overflow-y-auto"
      style={{
        paddingTop: 'max(0.75rem, var(--safe-top))',
        paddingBottom: 'max(0.75rem, var(--safe-bottom))',
      }}
    >
      <div className="w-full max-w-3xl max-h-[92vh] avionics-panel-solid border-t-2 border-t-sky-300/75 flex flex-col overflow-hidden text-[#e6edf5]">
        {/* Header */}
        <div className="shrink-0 px-5 py-3.5 border-b border-slate-800 bg-[#070b11] flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-sky-300">
              SYSTEM PAUSED · {deviceProfile.formFactor.replace('_', ' ').toUpperCase()} ({deviceProfile.orientation.toUpperCase()})
            </div>
            <h2 className="font-display text-xl font-bold uppercase tracking-[0.08em] text-white mt-0.5">
              Flight &amp; Interface Configuration
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onResume}
              className="min-h-[42px] px-4 py-2 bg-[#e6edf5] hover:bg-white text-[#05080f] text-xs font-bold uppercase tracking-[0.14em] flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Resume
            </button>
            <button
              type="button"
              onClick={onOpenWarMap}
              className="min-h-[42px] px-3 py-2 border border-slate-700 bg-[#05080f] hover:border-sky-300 text-sky-200 text-xs font-mono-tabular uppercase flex items-center gap-1.5 cursor-pointer"
            >
              <Map className="w-3.5 h-3.5" />
              Map
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="min-h-[42px] px-3 py-2 border border-slate-700 bg-[#05080f] hover:border-slate-400 text-slate-300 text-xs font-mono-tabular uppercase flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              Title
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="shrink-0 px-5 pt-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto bg-[#060a10]">
          <button
            type="button"
            data-testid="pause-tab-flight"
            onClick={() => setTab('flight')}
            className={`min-h-[40px] px-3.5 py-2 border-b-2 text-xs font-mono-tabular uppercase tracking-[0.12em] flex items-center gap-1.5 cursor-pointer shrink-0 ${
              tab === 'flight'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Flight &amp; Sectors
          </button>
          <button
            type="button"
            data-testid="pause-tab-mobile"
            onClick={() => setTab('mobile')}
            className={`min-h-[40px] px-3.5 py-2 border-b-2 text-xs font-mono-tabular uppercase tracking-[0.12em] flex items-center gap-1.5 cursor-pointer shrink-0 ${
              tab === 'mobile'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile &amp; Touch
          </button>
          <button
            type="button"
            data-testid="pause-tab-graphics"
            onClick={() => setTab('graphics')}
            className={`min-h-[40px] px-3.5 py-2 border-b-2 text-xs font-mono-tabular uppercase tracking-[0.12em] flex items-center gap-1.5 cursor-pointer shrink-0 ${
              tab === 'graphics'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Graphics &amp; Telemetry
          </button>
          <button
            type="button"
            data-testid="pause-tab-audio"
            onClick={() => setTab('audio')}
            className={`min-h-[40px] px-3.5 py-2 border-b-2 text-xs font-mono-tabular uppercase tracking-[0.12em] flex items-center gap-1.5 cursor-pointer shrink-0 ${
              tab === 'audio'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Audio &amp; Weapons (GT 650)
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: FLIGHT & SECTORS */}
          {tab === 'flight' && (
            <>
              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-amber-300 mb-2">
                  CAMPAIGN DIFFICULTY
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['story', 'normal', 'hard', 'nightmare'] as DifficultyId[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      data-testid={`difficulty-${d}`}
                      onClick={() => onSetDifficulty(d)}
                      className={`min-h-[42px] px-3 py-2 border text-xs font-mono-tabular uppercase tracking-wider cursor-pointer ${
                        hud.campaign.difficulty === d
                          ? 'bg-[#e6edf5] border-white text-[#05080f] font-semibold'
                          : 'bg-[#05080f] border-slate-800 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-emerald-300">
                    AIM ASSISTANCE (SKILL-BASED BALLISTICS)
                  </div>
                  <div className="text-[9.5px] font-mono-tabular text-slate-400">
                    MICRO-BORESIGHT ONLY
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['off', 'Off', 'Pure manual aim — zero boresight convergence'],
                      ['subtle', 'Subtle', 'Default micro-assist (≤1.35° Pulse · 0° Rail)'],
                      ['standard', 'Standard', 'Gentle boresight convergence (≤2.4° Pulse)'],
                    ] as Array<[AimAssistMode, string, string]>
                  ).map(([mode, label, desc]) => {
                    const currentAim: AimAssistMode =
                      flightSettings.aimAssistMode ??
                      (flightSettings.gentleAimAssist ? 'subtle' : 'off');
                    return (
                      <button
                        key={mode}
                        type="button"
                        data-testid={`aim-assist-mode-${mode}`}
                        onClick={() =>
                          onUpdateFlightSettings({
                            aimAssistMode: mode,
                            gentleAimAssist: mode !== 'off',
                          })
                        }
                        className={`min-h-[54px] px-3 py-2 border text-left cursor-pointer ${
                          currentAim === mode
                            ? 'bg-emerald-400 border-emerald-200 text-[#05080f]'
                            : 'bg-[#05080f] border-slate-800 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="text-xs font-mono-tabular font-semibold uppercase tracking-wider">
                          {label}
                        </div>
                        <div
                          className={`text-[9.5px] leading-snug mt-0.5 ${
                            currentAim === mode ? 'text-[#052018]' : 'text-slate-400'
                          }`}
                        >
                          {desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400 leading-snug">
                  Ballistic cannons always require aiming, target lead, and range discipline — Aim Assistance never turns cannons into homing weapons.
                </p>
              </div>

              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-sky-300 mb-2">
                  CAMERA SHAKE &amp; IMPACT DISTORTION (ACCESSIBILITY)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['full', 'Full Impact'],
                      ['reduced', 'Reduced Shake'],
                      ['off', 'Off (Comfort)'],
                    ] as Array<[CameraShakeMode, string]>
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      data-testid={`shake-mode-${mode}`}
                      onClick={() => onUpdateFlightSettings({ cameraShakeMode: mode })}
                      className={`min-h-[42px] px-3 py-2 border text-xs font-mono-tabular uppercase tracking-wider cursor-pointer ${
                        (flightSettings.cameraShakeMode ?? 'full') === mode
                          ? 'bg-sky-400 border-sky-200 text-[#05080f] font-semibold'
                          : 'bg-[#05080f] border-slate-800 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-amber-300">
                    ENEMY INFORMATION DISPLAY
                  </div>
                  <div className="text-[9.5px] font-mono-tabular text-slate-400">
                    QUICK TOGGLE KEY
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['full', 'Full', 'Edge target panel, names, shields & capital details'],
                      ['minimal', 'Minimal', 'Subtle markers, selected health & distance only'],
                      ['off', 'Off', 'Pure cinematic space — reticle & weapons preserved'],
                    ] as Array<[EnemyInfoDisplayMode, string, string]>
                  ).map(([mode, label, desc]) => (
                    <button
                      key={mode}
                      type="button"
                      data-testid={`enemy-info-mode-${mode}`}
                      onClick={() => onUpdateFlightSettings({ enemyInfoDisplayMode: mode })}
                      className={`min-h-[54px] px-3 py-2 border text-left cursor-pointer ${
                        (flightSettings.enemyInfoDisplayMode ?? 'full') === mode
                          ? 'bg-amber-400 border-amber-200 text-[#05080f]'
                          : 'bg-[#05080f] border-slate-800 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-xs font-mono-tabular font-semibold uppercase tracking-wider">
                        {label}
                      </div>
                      <div
                        className={`text-[9.5px] leading-snug mt-0.5 ${
                          (flightSettings.enemyInfoDisplayMode ?? 'full') === mode
                            ? 'text-[#0b1322]'
                            : 'text-slate-400'
                        }`}
                      >
                        {desc}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#05080f] border border-slate-800 text-xs">
                  <span className="text-slate-300">Desktop Quick-Toggle Shortcut</span>
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        ['F5', 'F5'],
                        ['KeyI', 'I'],
                        ['KeyT', 'T'],
                        ['KeyU', 'U'],
                      ] as const
                    ).map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        data-testid={`enemy-info-key-${code}`}
                        onClick={() => onUpdateFlightSettings({ enemyInfoToggleKey: code })}
                        className={`min-w-[36px] min-h-[30px] px-2 border text-[10.5px] font-mono-tabular uppercase cursor-pointer ${
                          (flightSettings.enemyInfoToggleKey ?? 'F5') === code
                            ? 'bg-sky-400 border-sky-200 text-[#05080f] font-semibold'
                            : 'bg-[#070b11] border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-sky-300 mb-2">
                  QUICK SECTOR JUMP (5 REGIONS · 80 KM THEATER)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SPACE_REGION_LIST.map((reg) => (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => {
                        onTravelSpaceRegion(reg.id);
                        onResume();
                      }}
                      className={`min-h-[44px] px-3 py-2 border text-left flex items-center justify-between gap-2 cursor-pointer ${
                        hud.space.currentRegionId === reg.id
                          ? 'bg-[#0e1928] border-sky-400 text-white'
                          : 'bg-[#05080f] border-slate-800 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div>
                        <div className="text-[9.5px] font-mono-tabular uppercase text-amber-300">{reg.code}</div>
                        <div className="text-xs font-semibold">{reg.label}</div>
                      </div>
                      <Compass className="w-4 h-4 text-sky-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Flight Sensitivity</span>
                    <span className="font-mono-tabular text-sky-300">{flightSettings.flightSensitivity.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.0"
                    step="0.05"
                    value={flightSettings.flightSensitivity}
                    onChange={(e) =>
                      onUpdateFlightSettings({ flightSensitivity: Number(e.target.value) })
                    }
                    className="w-full accent-sky-300"
                  />
                </label>

                <label className="block space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Camera Sensitivity</span>
                    <span className="font-mono-tabular text-sky-300">{flightSettings.cameraSensitivity.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.0"
                    step="0.05"
                    value={flightSettings.cameraSensitivity}
                    onChange={(e) =>
                      onUpdateFlightSettings({ cameraSensitivity: Number(e.target.value) })
                    }
                    className="w-full accent-sky-300"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    ['invertFlightY', 'Invert Pitch Axis'],
                    ['flightAssist', 'Flight Stabilization Assist'],
                    ['autoRollStabilize', 'Auto-Roll Horizon Stabilizer'],
                    ['targetTrackingAssist', 'Target Lead Reticle Assist'],
                  ] as Array<[keyof FlightControlSettings, string]>
                ).map(([key, label]) => {
                  const enabled = Boolean(flightSettings[key]);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onUpdateFlightSettings({ [key]: !enabled })}
                      className={`min-h-[42px] px-3 py-2 border flex items-center justify-between text-xs font-medium cursor-pointer ${
                        enabled
                          ? 'bg-[#0e1928] border-sky-400/70 text-sky-100'
                          : 'bg-[#05080f] border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="font-mono-tabular text-[10px]">{enabled ? 'ON' : 'OFF'}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* TAB 2: MOBILE & TOUCH CONTROLS */}
          {tab === 'mobile' && (
            <>
              <div className="p-3 bg-[#05080f] border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-300">
                  Detected: <strong className="text-sky-300">{deviceProfile.formFactor.replace('_', ' ')}</strong> ·{' '}
                  {deviceProfile.viewportWidth}×{deviceProfile.viewportHeight} ({deviceProfile.orientation}) · Touch{' '}
                  {deviceProfile.isTouchCapable ? 'Available' : 'Not Detected'}
                </span>
                <span className="font-mono-tabular text-amber-300">
                  ACTIVE UI: {deviceProfile.useTouchControls ? 'MOBILE TOUCH' : 'DESKTOP'}
                </span>
              </div>

              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-amber-300 mb-2">
                  CONTROL INTERFACE MODE
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['auto', 'Auto Detect'],
                      ['touch', 'Force Touch'],
                      ['desktop', 'Force Desktop'],
                    ] as Array<[ControlModeOverride, string]>
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      data-testid={`control-mode-${val}`}
                      onClick={() => onUpdateMobileSettings({ controlModeOverride: val })}
                      className={`min-h-[42px] px-3 py-2 border text-xs font-mono-tabular uppercase cursor-pointer ${
                        mobileSettings.controlModeOverride === val
                          ? 'bg-[#e6edf5] border-white text-[#05080f] font-semibold'
                          : 'bg-[#05080f] border-slate-800 text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-emerald-300 mb-2">
                  TOUCH AIM ASSISTANCE
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['off', 'Off'],
                      ['subtle', 'Subtle'],
                      ['standard', 'Standard'],
                    ] as Array<[AimAssistMode, string]>
                  ).map(([val, label]) => {
                    const currentAim: AimAssistMode =
                      mobileSettings.aimAssistMode ??
                      (mobileSettings.gentleAimAssist ? 'subtle' : 'off');
                    return (
                      <button
                        key={val}
                        type="button"
                        data-testid={`mobile-aim-assist-${val}`}
                        onClick={() =>
                          onUpdateMobileSettings({
                            aimAssistMode: val,
                            gentleAimAssist: val !== 'off',
                          })
                        }
                        className={`min-h-[42px] px-3 py-2 border text-xs font-mono-tabular uppercase cursor-pointer ${
                          currentAim === val
                            ? 'bg-emerald-400 border-emerald-200 text-[#05080f] font-semibold'
                            : 'bg-[#05080f] border-slate-800 text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-sky-300 mb-2">
                  ENEMY INFORMATION DISPLAY
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['full', 'Full'],
                      ['minimal', 'Minimal'],
                      ['off', 'Off'],
                    ] as Array<[EnemyInfoDisplayMode, string]>
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      data-testid={`mobile-enemy-info-mode-${val}`}
                      onClick={() => onUpdateMobileSettings({ enemyInfoDisplayMode: val })}
                      className={`min-h-[42px] px-3 py-2 border text-xs font-mono-tabular uppercase cursor-pointer ${
                        (mobileSettings.enemyInfoDisplayMode ?? 'full') === val
                          ? 'bg-amber-400 border-amber-200 text-[#05080f] font-semibold'
                          : 'bg-[#05080f] border-slate-800 text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1.5">
                    VIRTUAL JOYSTICK SIZE
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['compact', 'standard', 'large'] as TouchControlScale[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => onUpdateMobileSettings({ joystickSize: sz })}
                        className={`min-h-[40px] border text-[11px] font-mono-tabular uppercase cursor-pointer ${
                          mobileSettings.joystickSize === sz
                            ? 'bg-sky-400 border-sky-200 text-[#05080f] font-semibold'
                            : 'bg-[#05080f] border-slate-800 text-slate-300'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1.5">
                    COMBAT BUTTON SIZE
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['compact', 'standard', 'large'] as TouchControlScale[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => onUpdateMobileSettings({ buttonSize: sz })}
                        className={`min-h-[40px] border text-[11px] font-mono-tabular uppercase cursor-pointer ${
                          mobileSettings.buttonSize === sz
                            ? 'bg-sky-400 border-sky-200 text-[#05080f] font-semibold'
                            : 'bg-[#05080f] border-slate-800 text-slate-300'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Button Opacity</span>
                    <span className="font-mono-tabular text-sky-300">{Math.round(mobileSettings.buttonOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.45"
                    max="1.0"
                    step="0.05"
                    value={mobileSettings.buttonOpacity}
                    onChange={(e) =>
                      onUpdateMobileSettings({ buttonOpacity: Number(e.target.value) })
                    }
                    className="w-full accent-sky-300"
                  />
                </label>

                <label className="block space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Joystick Sensitivity</span>
                    <span className="font-mono-tabular text-sky-300">{mobileSettings.joystickSensitivity.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.0"
                    step="0.05"
                    value={mobileSettings.joystickSensitivity}
                    onChange={(e) =>
                      onUpdateMobileSettings({ joystickSensitivity: Number(e.target.value) })
                    }
                    className="w-full accent-sky-300"
                  />
                </label>

                <label className="block space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Horizontal Position Offset</span>
                    <span className="font-mono-tabular text-sky-300">{mobileSettings.buttonOffsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-32"
                    max="32"
                    step="2"
                    value={mobileSettings.buttonOffsetX}
                    onChange={(e) =>
                      onUpdateMobileSettings({ buttonOffsetX: Number(e.target.value) })
                    }
                    className="w-full accent-sky-300"
                  />
                </label>

                <label className="block space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Vertical Position Offset</span>
                    <span className="font-mono-tabular text-sky-300">{mobileSettings.buttonOffsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="2"
                    value={mobileSettings.buttonOffsetY}
                    onChange={(e) =>
                      onUpdateMobileSettings({ buttonOffsetY: Number(e.target.value) })
                    }
                    className="w-full accent-sky-300"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="toggle-left-handed-btn"
                  onClick={() => onUpdateMobileSettings({ leftHanded: !mobileSettings.leftHanded })}
                  className={`min-h-[44px] px-3 py-2 border flex items-center justify-between text-xs font-medium cursor-pointer ${
                    mobileSettings.leftHanded
                      ? 'bg-[#1a1812] border-amber-400 text-amber-200'
                      : 'bg-[#05080f] border-slate-800 text-slate-300'
                  }`}
                >
                  <span>Left-Handed Layout Flip</span>
                  <span className="font-mono-tabular">{mobileSettings.leftHanded ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateMobileSettings({ hapticsEnabled: !mobileSettings.hapticsEnabled })
                  }
                  className={`min-h-[44px] px-3 py-2 border flex items-center justify-between text-xs font-medium cursor-pointer ${
                    mobileSettings.hapticsEnabled
                      ? 'bg-[#0e1928] border-sky-400/70 text-sky-200'
                      : 'bg-[#05080f] border-slate-800 text-slate-400'
                  }`}
                >
                  <span>Haptic Vibration Feedback</span>
                  <span className="font-mono-tabular">{mobileSettings.hapticsEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onResetMobileSettings}
                className="min-h-[42px] px-4 py-2 border border-slate-800 bg-[#05080f] hover:border-rose-400 text-slate-300 hover:text-rose-200 text-xs font-mono-tabular uppercase flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Touch Controls to Default
              </button>
            </>
          )}

          {/* TAB 3: GRAPHICS & PERFORMANCE TELEMETRY */}
          {tab === 'graphics' && (
            <>
              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-amber-300 mb-2">
                  MOBILE PERFORMANCE PRESETS
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {mobilePresets.map((id) => {
                    const cfg = GRAPHICS_PRESETS[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onSelectGraphicsPreset(id)}
                        className={`min-h-[44px] px-3 py-2 border text-xs font-mono-tabular text-left cursor-pointer ${
                          hud.graphicsPreset === id
                            ? 'bg-[#e6edf5] border-white text-[#05080f] font-semibold'
                            : 'bg-[#05080f] border-slate-800 text-slate-200'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-sky-300 mb-2">
                  DESKTOP GRAPHICS PRESETS
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {desktopPresets.map((id) => {
                    const cfg = GRAPHICS_PRESETS[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onSelectGraphicsPreset(id)}
                        className={`min-h-[44px] px-3 py-2 border text-xs font-mono-tabular cursor-pointer ${
                          hud.graphicsPreset === id
                            ? 'bg-sky-400 border-sky-200 text-[#05080f] font-semibold'
                            : 'bg-[#05080f] border-slate-800 text-slate-200'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateControlSettings({
                    adaptiveResolution: !controlSettings.adaptiveResolution,
                  })
                }
                className={`w-full min-h-[44px] px-3 py-2 border flex items-center justify-between text-xs font-medium cursor-pointer ${
                  controlSettings.adaptiveResolution
                    ? 'bg-[#0a1d19] border-emerald-400/60 text-emerald-200'
                    : 'bg-[#05080f] border-slate-800 text-slate-400'
                }`}
              >
                <span>Adaptive Dynamic Resolution Scaling</span>
                <span className="font-mono-tabular">{controlSettings.adaptiveResolution ? 'ON' : 'OFF'}</span>
              </button>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center font-mono-tabular">
                <div className="p-2.5 bg-[#05080f] border border-slate-800">
                  <div className="text-[9.5px] text-slate-400">AVG FPS</div>
                  <div className="text-sm font-semibold text-emerald-300 mt-0.5" data-testid="telemetry-avg-fps">{performance.avgFps}</div>
                </div>
                <div className="p-2.5 bg-[#05080f] border border-slate-800">
                  <div className="text-[9.5px] text-slate-400">1% LOW FPS</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-0.5" data-testid="telemetry-1pct-low">{performance.onePercentLowFps}</div>
                </div>
                <div className="p-2.5 bg-[#05080f] border border-slate-800">
                  <div className="text-[9.5px] text-slate-400">FRAME TIME</div>
                  <div className="text-sm font-semibold text-sky-200 mt-0.5" data-testid="telemetry-frame-time">{(1000 / Math.max(1, performance.avgFps)).toFixed(1)} ms</div>
                </div>
                <div className="p-2.5 bg-[#05080f] border border-slate-800">
                  <div className="text-[9.5px] text-slate-400">DRAW CALLS</div>
                  <div className="text-sm font-semibold text-sky-300 mt-0.5" data-testid="telemetry-draw-calls">{performance.drawCalls}</div>
                </div>
                <div className="p-2.5 bg-[#05080f] border border-slate-800">
                  <div className="text-[9.5px] text-slate-400">TRIANGLES</div>
                  <div className="text-sm font-semibold text-amber-300 mt-0.5" data-testid="telemetry-triangles">
                    {(performance.triangles / 1000).toFixed(1)}K
                  </div>
                </div>
                <div className="p-2.5 bg-[#05080f] border border-slate-800">
                  <div className="text-[9.5px] text-slate-400">MEMORY</div>
                  <div className="text-sm font-semibold text-purple-300 mt-0.5" data-testid="telemetry-memory">
                    {performance.jsHeapMB ? `${performance.jsHeapMB} MB` : '38 MB'}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'audio' && (
            <>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-white">
                  Audio &amp; Weapon Acoustics Architecture
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Royal Enfield Continental GT 650 270° twin-cylinder exhaust gunfire sound profile.
                </p>
              </div>

              {/* Master Volume & Weapon Volume Sliders */}
              <div className="space-y-4 bg-[#070c14] border border-slate-800 p-4">
                <div>
                  <div className="flex justify-between items-center text-xs font-mono-tabular uppercase mb-1.5">
                    <span className="text-slate-300">Weapon SFX Volume (GT 650 Punch Level)</span>
                    <span className="text-amber-400 font-bold" data-testid="weapon-volume-display">
                      {Math.round((hud.weaponVolume ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={Math.round((hud.weaponVolume ?? 1.0) * 100)}
                    onChange={(e) => onSetWeaponVolume?.(Number(e.target.value) / 100)}
                    data-testid="weapon-volume-slider"
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-mono-tabular uppercase mb-1.5">
                    <span className="text-slate-300">Master Audio Volume</span>
                    <span className="text-sky-300 font-bold" data-testid="master-volume-display">
                      {Math.round((hud.masterVolume ?? 0.44) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round((hud.masterVolume ?? 0.44) * 100)}
                    onChange={(e) => onSetMasterVolume?.(Number(e.target.value) / 100)}
                    data-testid="master-volume-slider"
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <span className="text-xs font-mono-tabular uppercase text-slate-300">Audio Mute State</span>
                  <button
                    type="button"
                    onClick={onToggleMute}
                    data-testid="audio-toggle-mute"
                    className={`px-3 py-1.5 text-xs font-mono-tabular uppercase border flex items-center gap-1.5 cursor-pointer ${
                      hud.muted
                        ? 'bg-rose-950/40 border-rose-600 text-rose-300'
                        : 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                    }`}
                  >
                    {hud.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {hud.muted ? 'Muted' : 'Sound Active'}
                  </button>
                </div>
              </div>

              {/* Acoustic Profile Description Card */}
              <div className="bg-[#05080f] border border-amber-900/40 p-4 space-y-2">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <span>GT 650 Twin Exhaust Weapon Identity</span>
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded">
                    4-Stage Acoustic Synthesis
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono-tabular">
                  <div className="p-2 bg-[#080d17] border border-slate-800/80">
                    <span className="text-amber-400 font-semibold">1. Gunshot Crack:</span> 1.7kHz initial metallic unsealing snap (&lt;16ms)
                  </div>
                  <div className="p-2 bg-[#080d17] border border-slate-800/80">
                    <span className="text-amber-400 font-semibold">2. Piston Thump:</span> 155Hz &rarr; 48Hz saturated sub-bass punch (270° twin pulse)
                  </div>
                  <div className="p-2 bg-[#080d17] border border-slate-800/80">
                    <span className="text-amber-400 font-semibold">3. Megaphone Body:</span> 215Hz tuned exhaust resonance with aggressive throat
                  </div>
                  <div className="p-2 bg-[#080d17] border border-slate-800/80">
                    <span className="text-amber-400 font-semibold">4. Gas Clearance:</span> Short gas expansion tail (&lt;80ms total) for crisp rapid fire
                  </div>
                </div>
              </div>

              {/* Interactive Test Fire Suite */}
              <div className="space-y-2">
                <div className="text-xs font-mono-tabular uppercase tracking-wider text-slate-400">
                  Interactive Weapon Audio Test Suite
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onTestFireWeapon?.('pulse')}
                    data-testid="audio-test-pulse"
                    className="p-3 bg-[#0a101d] hover:bg-[#121c32] border border-amber-500/40 hover:border-amber-400 text-amber-200 text-xs font-mono-tabular uppercase font-semibold flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <span>Pulse Cannon</span>
                    <span className="text-[10px] text-amber-400/80 font-normal">GT 650 Exhaust Gun</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTestFireWeapon?.('heavy_plasma')}
                    data-testid="audio-test-plasma"
                    className="p-3 bg-[#0a101d] hover:bg-[#121c32] border border-orange-500/40 hover:border-orange-400 text-orange-200 text-xs font-mono-tabular uppercase font-semibold flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <span>Heavy Plasma</span>
                    <span className="text-[10px] text-orange-400/80 font-normal">GT 650 Supercannon</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTestFireWeapon?.('rail_cannon')}
                    data-testid="audio-test-rail"
                    className="p-3 bg-[#0a101d] hover:bg-[#121c32] border border-sky-500/40 hover:border-sky-400 text-sky-200 text-xs font-mono-tabular uppercase font-semibold flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <span>Rail Cannon</span>
                    <span className="text-[10px] text-sky-400/80 font-normal">Kinetic Crack &amp; Recoil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTestFireWeapon?.('missile')}
                    data-testid="audio-test-missile"
                    className="p-3 bg-[#0a101d] hover:bg-[#121c32] border border-emerald-500/40 hover:border-emerald-400 text-emerald-200 text-xs font-mono-tabular uppercase font-semibold flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <span>Homing Missile</span>
                    <span className="text-[10px] text-emerald-400/80 font-normal">Pneumatic Launch &amp; Plume</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTestFireWeapon?.('emp')}
                    data-testid="audio-test-emp"
                    className="p-3 bg-[#0a101d] hover:bg-[#121c32] border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 text-xs font-mono-tabular uppercase font-semibold flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <span>EMP Discharger</span>
                    <span className="text-[10px] text-cyan-400/80 font-normal">High-Voltage Arc</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
