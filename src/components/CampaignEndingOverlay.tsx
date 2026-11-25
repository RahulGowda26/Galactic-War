import React from 'react';
import { Award, Home, Map, RotateCcw } from 'lucide-react';
import type { EngineHudSnapshot } from '../scene/AetherPrimeEngine';
import { evaluateCampaignEnding } from '../world/strategicCampaign';
import {
  evaluateExtinctionEnding,
  normalizeExtinctionState,
} from '../world/extinctionCampaign';

interface CampaignEndingOverlayProps {
  hud: EngineHudSnapshot;
  onStartNewCampaign: () => void;
  onOpenWarMap: () => void;
  onReturnToTitle: () => void;
}

export const CampaignEndingOverlay: React.FC<CampaignEndingOverlayProps> = ({
  hud,
  onStartNewCampaign,
  onOpenWarMap,
  onReturnToTitle,
}) => {
  const { campaign } = hud;
  const isExtinctionEnding =
    hud.lastMissionSummary?.campaignTrack === 'extinction' ||
    (campaign.activeCampaignTrack === 'extinction' &&
      Boolean(campaign.extinctionState?.extinctionCompleted));

  if (isExtinctionEnding) {
    const extState = normalizeExtinctionState(campaign.extinctionState);
    const extEnding = evaluateExtinctionEnding(extState);
    return (
      <div
        data-testid="campaign-ending-overlay"
        data-campaign-track="extinction"
        className="fixed inset-0 z-40 bg-[#05080f]/95 text-slate-100 overflow-y-auto flex items-center justify-center p-4 md:p-8"
        style={{
          paddingTop: 'max(1rem, var(--safe-top))',
          paddingBottom: 'max(1rem, var(--safe-bottom))',
        }}
      >
        <div className="max-w-3xl w-full avionics-panel-solid border-t-2 border-t-rose-500 p-5 md:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="text-[10px] font-mono-tabular uppercase tracking-[0.24em] text-rose-400">
                EXTINCTION CAMPAIGN COMPLETE · SOVEREIGN OMEGA DEFEATED
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-[0.06em] text-white mt-1">
                {extEnding.outcomeTitle}
              </h1>
              <p className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-amber-300 mt-1">
                EXTINCTION APEX TROPHY LIVERY &amp; CAMPAIGN MEDALS UNLOCKED
              </p>
            </div>
            <div className="px-4 py-2.5 bg-[#05080f] border border-rose-500/70 text-center shrink-0">
              <div className="text-[9px] font-mono-tabular uppercase tracking-[0.2em] text-slate-400">
                EXTINCTION TIER
              </div>
              <div className="font-display text-2xl font-bold text-rose-300 leading-none mt-1 uppercase flex items-center justify-center gap-1.5">
                <Award className="w-5 h-5" />
                {extEnding.tier.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#05080f]/80 border border-slate-800 text-xs leading-relaxed text-slate-200">
            {extEnding.epilogue}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono-tabular">
            <div className="p-2.5 bg-[#05080f] border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">EXT LEVELS</div>
              <div className="text-sm font-semibold text-rose-300 mt-0.5">
                {extEnding.statsSummary.levelsCleared}/10
              </div>
            </div>
            <div className="p-2.5 bg-[#05080f] border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">BOSSES DOWN</div>
              <div className="text-sm font-semibold text-amber-300 mt-0.5">
                {extEnding.statsSummary.bossesDefeated}/6
              </div>
            </div>
            <div className="p-2.5 bg-[#05080f] border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">S-GRADES</div>
              <div className="text-sm font-semibold text-sky-300 mt-0.5">
                {extEnding.statsSummary.sGrades}
              </div>
            </div>
            <div className="p-2.5 bg-[#05080f] border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">EXT KILLS</div>
              <div className="text-sm font-semibold text-emerald-300 mt-0.5">
                {extState.stats.totalKills}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onOpenWarMap}
              className="min-h-[44px] px-4 py-2.5 avionics-panel hover:border-sky-300 text-sky-200 text-xs font-semibold uppercase tracking-[0.14em] flex items-center gap-1.5 cursor-pointer"
            >
              <Map className="w-4 h-4" />
              Campaign Map &amp; Replay
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="min-h-[44px] px-4 py-2.5 border border-slate-700 bg-[#05080f] hover:border-slate-400 text-slate-200 text-xs font-medium uppercase tracking-[0.14em] flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ending = evaluateCampaignEnding(campaign);

  return (
    <div
      data-testid="campaign-ending-overlay"
      className="fixed inset-0 z-40 bg-[#05080f]/94 text-slate-100 overflow-y-auto flex items-center justify-center p-4 md:p-8"
      style={{
        paddingTop: 'max(1rem, var(--safe-top))',
        paddingBottom: 'max(1rem, var(--safe-bottom))',
      }}
    >
      <div className="max-w-3xl w-full avionics-panel-solid border-t-2 border-t-amber-400 p-5 md:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="text-[10px] font-mono-tabular uppercase tracking-[0.24em] text-amber-400">
              CAMPAIGN COMPLETE · AFTER-ACTION ARCHIVE
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-[0.06em] text-white mt-1">
              {ending.title}
            </h1>
            <p className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-sky-300 mt-1">
              {ending.subtitle}
            </p>
          </div>

          <div className="px-4 py-2.5 bg-[#05080f] border border-amber-400/70 text-center shrink-0">
            <div className="text-[9px] font-mono-tabular uppercase tracking-[0.2em] text-slate-400">
              FLEET RANK
            </div>
            <div className="font-display text-3xl font-bold text-amber-300 leading-none mt-1 flex items-center justify-center gap-1.5">
              <Award className="w-5 h-5" />
              {ending.masteryRank}
            </div>
          </div>
        </div>

        {/* Narrative Epilogue */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div className="p-4 bg-[#05080f]/80 border border-slate-800">
            <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-amber-400 mb-2">
              WING COMMANDER KAEL VOSS
            </div>
            <p className="text-slate-200">{ending.commanderFate}</p>
          </div>
          <div className="p-4 bg-[#05080f]/80 border border-slate-800">
            <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-sky-300 mb-2">
              AETHER PRIME &amp; VANGUARD FLEET
            </div>
            <p className="text-slate-200">{ending.planetFate}</p>
          </div>
        </div>

        {/* Strategic Decision Consequences */}
        <div className="p-4 bg-[#05080f]/80 border border-slate-800 space-y-2">
          <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-emerald-300">
            STRATEGIC FLEET CONSEQUENCES
          </div>
          {ending.consequences.map((line, i) => (
            <p key={i} className="text-xs text-slate-300 leading-relaxed">
              — {line}
            </p>
          ))}
        </div>

        {/* Space-Only Campaign Telemetry Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center font-mono-tabular">
          <div className="p-2.5 bg-[#05080f] border border-slate-800">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">MAIN OPS</div>
            <div className="text-sm font-semibold text-amber-300 mt-0.5">
              {campaign.completedMainMissions.length}/10
            </div>
          </div>
          <div className="p-2.5 bg-[#05080f] border border-slate-800">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">HOSTILES</div>
            <div className="text-sm font-semibold text-rose-300 mt-0.5">
              {campaign.stats.totalSpaceKills}
            </div>
          </div>
          <div className="p-2.5 bg-[#05080f] border border-slate-800">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">CAPITALS</div>
            <div className="text-sm font-semibold text-amber-300 mt-0.5">
              {campaign.stats.capitalShipsDestroyed}
            </div>
          </div>
          <div className="p-2.5 bg-[#05080f] border border-slate-800">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">SUBSYSTEMS</div>
            <div className="text-sm font-semibold text-sky-300 mt-0.5">
              {campaign.stats.capitalSubsystemsDestroyed}
            </div>
          </div>
          <div className="p-2.5 bg-[#05080f] border border-slate-800">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">DISTANCE</div>
            <div className="text-sm font-semibold text-emerald-300 mt-0.5">
              {campaign.stats.distanceTraveledKm.toFixed(1)} KM
            </div>
          </div>
          <div className="p-2.5 bg-[#05080f] border border-slate-800">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">READINESS</div>
            <div className="text-sm font-semibold text-white mt-0.5">
              {campaign.resources.fleetReadiness}%
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onOpenWarMap}
            className="min-h-[44px] px-4 py-2.5 avionics-panel hover:border-sky-300 text-sky-200 text-xs font-semibold uppercase tracking-[0.14em] flex items-center gap-1.5 cursor-pointer"
          >
            <Map className="w-4 h-4" />
            Explore 80 km Theater
          </button>
          <button
            type="button"
            onClick={onStartNewCampaign}
            className="min-h-[44px] px-5 py-2.5 bg-[#e6edf5] hover:bg-white text-[#05080f] text-xs font-bold uppercase tracking-[0.16em] flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            New Space Campaign
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="min-h-[44px] px-4 py-2.5 border border-slate-700 bg-[#05080f] hover:border-slate-400 text-slate-200 text-xs font-medium uppercase tracking-[0.14em] flex items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
