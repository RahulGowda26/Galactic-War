import React, { useState } from 'react';
import {
  Film,
  Info,
  Map,
  Monitor,
  Play,
  Rocket,
  RotateCcw,
  Smartphone,
  Tablet,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { EngineHudSnapshot } from '../scene/AetherPrimeEngine';
import { EXPANDED_SPACE_THEATER_KM, PLAYABLE_SHIPS } from '../world/spacePhysics';
import { CAMPAIGN_LEVELS, getLevelById } from '../world/campaignLevels';
import {
  EXTINCTION_LEVELS,
  getExtinctionLevelById,
  type CampaignTrackId,
} from '../world/extinctionCampaign';
import { computePilotRankProgress } from '../world/combatScoring';

interface TitleOverlayProps {
  hud: EngineHudSnapshot;
  onContinueCampaign: () => void;
  onSelectCampaignTrack: (track: CampaignTrackId) => void;
  onStartNewCampaign: () => void;
  onOpenSpaceMap: () => void;
  onOpenFleetHangar: () => void;
  onWatchIntro: () => void;
  onToggleMute: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  hud,
  onContinueCampaign,
  onSelectCampaignTrack,
  onStartNewCampaign,
  onOpenSpaceMap,
  onOpenFleetHangar,
  onWatchIntro,
  onToggleMute,
}) => {
  const [showCredits, setShowCredits] = useState(false);
  const { campaign, hasSavedCampaign, deviceProfile } = hud;
  const activeShip = PLAYABLE_SHIPS[campaign.spaceLoadout.selectedShipId];
  const activeTrack: CampaignTrackId = campaign.activeCampaignTrack === 'extinction' ? 'extinction' : 'original';
  const isExtinctionTrack = activeTrack === 'extinction';
  const extState = campaign.extinctionState;
  const extClearedCount = extState?.completedLevelIds.length ?? 0;
  const extActiveLevel = getExtinctionLevelById(extState?.currentLevelId ?? 'ext_l01') ?? EXTINCTION_LEVELS[0];
  const activeLevel = getLevelById(campaign.currentLevelId);
  const rankProgress = computePilotRankProgress(campaign.pilotProgress?.xp ?? 0);
  const hasProgress =
    hasSavedCampaign &&
    ((campaign.completedLevelIds?.length ?? 0) > 0 || campaign.completedMainMissions.length > 0);
  const continueLabel = isExtinctionTrack
    ? extClearedCount > 0
      ? `Continue Extinction (${extActiveLevel.code})`
      : 'Launch Extinction Campaign (EXT · LVL 01)'
    : hasProgress
      ? `Continue Campaign (${activeLevel?.code ?? `OP ${String(campaign.currentMissionNumber).padStart(2, '0')}`})`
      : 'Launch Space Campaign (OP 01 · LVL 1)';

  const DeviceIcon =
    deviceProfile.formFactor === 'tablet'
      ? Tablet
      : deviceProfile.useTouchControls
        ? Smartphone
        : Monitor;

  const deviceModeLabel = deviceProfile.useTouchControls
    ? `TOUCH INTERFACE · ${deviceProfile.formFactor.replace('_', ' ').toUpperCase()}`
    : 'FLIGHT DECK · KEYBOARD & MOUSE';

  return (
    <div
      data-testid="title-overlay"
      className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none select-none overflow-y-auto"
      style={{
        background:
          'linear-gradient(100deg, rgba(5,8,15,0.92) 0%, rgba(5,8,15,0.68) 38%, rgba(5,8,15,0.08) 76%, rgba(5,8,15,0.22) 100%)',
        paddingTop: 'max(1rem, var(--safe-top))',
        paddingBottom: 'max(1rem, var(--safe-bottom))',
        paddingLeft: 'max(1.5rem, var(--safe-left))',
        paddingRight: 'max(1.5rem, var(--safe-right))',
      }}
    >
      {/* Top Aerospace Command Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-slate-300">
          <span className="text-sky-300 font-semibold">VANGUARD FLEET COMMAND</span>
          <span className="hidden sm:inline text-slate-600">/</span>
          <span className="hidden sm:inline text-slate-400">
            {EXPANDED_SPACE_THEATER_KM} KM ORBITAL THEATER
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 avionics-panel text-[10px] font-mono-tabular uppercase tracking-[0.14em] text-slate-300">
            <DeviceIcon className="w-3.5 h-3.5 text-sky-300" />
            <span>{deviceModeLabel}</span>
          </div>
          <button
            type="button"
            aria-label={hud.muted ? 'Unmute Audio' : 'Mute Audio'}
            onClick={onToggleMute}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center avionics-panel text-slate-300 hover:text-white hover:border-sky-300/60 transition-colors cursor-pointer"
          >
            {hud.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Left Editorial Aerospace Title Stack (Keeps Right Viewport Clear for 3D Starfighter) */}
      <div className="my-auto py-4 max-w-lg pointer-events-auto">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-7 h-[1.5px] bg-amber-400" />
          <span className="text-[11px] font-mono-tabular uppercase tracking-[0.24em] text-amber-300/95">
            5 SECTORS · 10 OPERATIONS · {CAMPAIGN_LEVELS.length} LEVELS
          </span>
        </div>

        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold uppercase tracking-[0.06em] text-white leading-[0.92] hud-text-shadow">
          GALACTIC WAR
          <span className="block text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[0.22em] text-sky-200/95 mt-2">
            THE LAST STAND
          </span>
        </h1>

        <div className="avionics-hairline my-4 max-w-md" />

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
          {isExtinctionTrack ? (
            <>
              Deploy into the isolated <span className="text-rose-300 font-semibold">Extinction Protocol</span> —
              10 escalating gauntlets against cloaked Phantoms, Hunter swarms, EW Disruptors, and{' '}
              <span className="text-amber-300 font-semibold">6 Multi-Phase Bosses</span>.
            </>
          ) : (
            <>
              Pilot five specialized strike craft across an 80-kilometer combat theater above Aether Prime.
              Neutralize Sovereign corvettes, dismantle capital warship subsystems, and confront{' '}
              <span className="text-white font-semibold">Eternal Eclipse</span>.
            </>
          )}
        </p>

        {/* Dual-Campaign Mode Switcher */}
        <div
          className="mt-4 inline-flex flex-wrap gap-1.5 p-1 border border-slate-700/80 bg-[#070b11]/90"
          role="tablist"
          aria-label="Campaign Mode Selector"
        >
          <button
            type="button"
            data-testid="title-track-original"
            onClick={() => onSelectCampaignTrack('original')}
            className={`min-h-[38px] px-3.5 py-1.5 text-[11px] font-mono-tabular uppercase tracking-[0.14em] transition-colors cursor-pointer ${
              !isExtinctionTrack
                ? 'bg-sky-400/20 text-sky-200 border border-sky-400/70 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Original Campaign · 31 Levels ({campaign.completedLevelIds?.length ?? 0}/31)
          </button>
          <button
            type="button"
            data-testid="title-track-extinction"
            onClick={() => onSelectCampaignTrack('extinction')}
            className={`min-h-[38px] px-3.5 py-1.5 text-[11px] font-mono-tabular uppercase tracking-[0.14em] transition-colors cursor-pointer ${
              isExtinctionTrack
                ? 'bg-rose-500/25 text-rose-200 border border-rose-400/80 font-semibold'
                : 'text-slate-400 hover:text-rose-200 border border-transparent'
            }`}
          >
            Extinction Campaign · 10 Levels ({extClearedCount}/10)
          </button>
        </div>

        {/* Primary & Secondary Action Stack */}
        <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2.5">
          <button
            type="button"
            data-testid="title-primary-cta"
            onClick={onContinueCampaign}
            className={`min-h-[48px] px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] flex items-center justify-center gap-2.5 transition-colors cursor-pointer ${
              isExtinctionTrack
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'bg-[#e6edf5] hover:bg-white text-[#05080f]'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {continueLabel}
          </button>

          <button
            type="button"
            data-testid="title-map-btn"
            onClick={onOpenSpaceMap}
            className="min-h-[48px] px-5 py-3 avionics-panel hover:border-sky-300/70 hover:text-white text-sky-200 text-xs font-semibold uppercase tracking-[0.16em] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Map className="w-4 h-4 text-sky-300" />
            Space Map
          </button>

          <button
            type="button"
            data-testid="title-hangar-btn"
            onClick={onOpenFleetHangar}
            className="min-h-[48px] px-5 py-3 avionics-panel hover:border-amber-400/70 hover:text-white text-slate-200 text-xs font-semibold uppercase tracking-[0.16em] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Rocket className="w-4 h-4 text-amber-400" />
            Fleet Hangar
          </button>
        </div>

        {/* Utility Links Row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onWatchIntro}
            className="min-h-[40px] px-3.5 py-2 border border-slate-700/70 bg-[#070b11]/70 hover:border-slate-400 text-slate-300 hover:text-white text-[11px] font-medium uppercase tracking-[0.14em] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Film className="w-3.5 h-3.5 text-amber-400" />
            Orbital Intro
          </button>

          {hasSavedCampaign && (
            <button
              type="button"
              onClick={onStartNewCampaign}
              className="min-h-[40px] px-3.5 py-2 border border-slate-700/70 bg-[#070b11]/70 hover:border-rose-400/70 text-slate-300 hover:text-rose-200 text-[11px] font-medium uppercase tracking-[0.14em] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Campaign
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCredits(true)}
            className="min-h-[40px] px-3.5 py-2 border border-slate-700/70 bg-[#070b11]/70 hover:border-slate-400 text-slate-300 hover:text-white text-[11px] font-medium uppercase tracking-[0.14em] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-sky-300" />
            Briefing &amp; Controls
          </button>
        </div>
      </div>

      {/* Bottom Aerospace Telemetry Baseline */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-tabular uppercase tracking-[0.14em] text-slate-400 border-t border-slate-800/80 pt-2.5">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            ACTIVE CRAFT <strong className="text-slate-100 ml-1">{activeShip.name}</strong>
          </span>
          <span>
            PILOT RANK <strong className="text-sky-300 ml-1">{rankProgress.currentRank.title}</strong>
          </span>
          <span>
            CAMPAIGN{' '}
            <strong className="text-amber-300 ml-1">
              {campaign.completedLevelIds?.length ?? 0}/{CAMPAIGN_LEVELS.length} ORIG ·{' '}
              {extClearedCount}/{EXTINCTION_LEVELS.length} EXTINCTION
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <DeviceIcon className="w-3.5 h-3.5 text-sky-300" />
          <span>{deviceProfile.useTouchControls ? 'Auto Mobile Touch Ready' : 'Keyboard & Mouse Ready'}</span>
        </div>
      </div>

      {/* Briefing & Controls Modal */}
      {showCredits && (
        <div className="pointer-events-auto fixed inset-0 z-40 bg-[#05080f]/90 flex items-center justify-center p-4">
          <div className="max-w-lg w-full avionics-panel-solid p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-sky-300">
                  VANGUARD FLIGHT MANUAL
                </div>
                <h2 className="font-display text-xl font-bold uppercase tracking-[0.08em] text-white mt-0.5">
                  Controls &amp; Fleet Systems
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close Flight Manual"
                onClick={() => setShowCredits(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center border border-slate-700 text-slate-300 hover:text-white hover:border-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong className="text-sky-300 uppercase font-mono-tabular tracking-wider">Desktop Flight:</strong>{' '}
                WASD throttle &amp; strafe, Mouse steer, Q/E roll, Shift Boost, Space Air Brake, [V] Supercruise,
                [G] Nav Autopilot, [C] Chase/Cockpit Camera, [1–5] Weapons (Pulse, Heavy Plasma, Missiles, EMP,
                Rail Cannon), LMB Fire, RMB Homing Missile, [R] Countermeasure Flares, [H] Repair, [M] Space Map.
              </p>
              <p>
                <strong className="text-amber-300 uppercase font-mono-tabular tracking-wider">Mobile &amp; Tablet:</strong>{' '}
                Automatically activates on touchscreens. Virtual Joystick controls flight pitch &amp; yaw, open-screen
                drag steers camera without misfiring, and the right combat cluster handles Fire, Missiles, Weapons,
                Target Lock, Boost, Supercruise, and Utility Systems.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
