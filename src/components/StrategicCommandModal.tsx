import React, { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Compass,
  Lock,
  Map,
  Rocket,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import type { EngineHudSnapshot, WarMapTabId } from '../scene/AetherPrimeEngine';
import {
  EXPANDED_SPACE_THEATER_KM,
  PLAYABLE_SHIPS,
  PLAYABLE_SHIP_LIST,
  SPACE_REGIONS,
  SPACE_REGION_LIST,
  type PlayableShipId,
  type SpaceRegionId,
} from '../world/spacePhysics';
import {
  MAIN_CAMPAIGN_MISSIONS,
  OPTIONAL_CAMPAIGN_MISSIONS,
  STRATEGIC_DECISIONS,
  canAffordCost,
  getUpgradeCost,
  type CampaignMissionDef,
  type StrategicDecisionDef,
  type UpgradeActionType,
} from '../world/strategicCampaign';
import {
  CAMPAIGN_LEVELS,
  getLevelsForOperation,
  getOperationCompletionCounts,
  isLevelUnlockedByProgress,
  type CampaignLevelDef,
} from '../world/campaignLevels';
import {
  EXTINCTION_LEVELS,
  getExtinctionLevelById,
  isExtinctionLevelUnlocked,
  type CampaignTrackId,
  type ExtinctionLevelDef,
} from '../world/extinctionCampaign';
import {
  COSMETIC_LIVERIES,
  PILOT_RANKS,
  computePilotRankProgress,
  type PerformanceGrade,
} from '../world/combatScoring';
import {
  UPGRADE_TRADE_OFF_MODULES,
  computeShipComparisonStats,
  type TradeOffModuleId,
} from '../world/combatExpansion';

interface StrategicCommandModalProps {
  hud: EngineHudSnapshot;
  onChangeTab: (tab: WarMapTabId) => void;
  onCloseToCombat: () => void;
  onSelectCampaignTrack?: (track: CampaignTrackId) => void;
  onDeployMission: (missionId: string) => void;
  onDeployLevel: (levelId: string) => void;
  onTravelRegion: (regionId: SpaceRegionId) => void;
  onSelectShipClass: (shipId: PlayableShipId) => void;
  onPurchaseUpgrade: (action: UpgradeActionType) => void;
  onPurchaseTradeOffModule: (moduleId: TradeOffModuleId) => void;
  onToggleTradeOffModule: (moduleId: TradeOffModuleId) => void;
  onChooseDecision: (decisionId: StrategicDecisionDef['id'], choiceId: string) => void;
  onSelectCosmeticLivery: (cosmeticId: string) => void;
  onExchangeCreditsForHangarKit: () => void;
}

function gradeChipTone(grade: PerformanceGrade): string {
  if (grade === 'S') return 'border-amber-400 bg-amber-950/60 text-amber-300';
  if (grade === 'A') return 'border-sky-400 bg-sky-950/60 text-sky-300';
  if (grade === 'B') return 'border-emerald-400 bg-emerald-950/55 text-emerald-300';
  return 'border-slate-500 bg-slate-900/75 text-slate-200';
}

export const StrategicCommandModal: React.FC<StrategicCommandModalProps> = ({
  hud,
  onChangeTab,
  onCloseToCombat,
  onSelectCampaignTrack,
  onDeployMission,
  onDeployLevel,
  onTravelRegion,
  onSelectShipClass,
  onPurchaseUpgrade,
  onPurchaseTradeOffModule,
  onToggleTradeOffModule,
  onChooseDecision,
  onSelectCosmeticLivery,
  onExchangeCreditsForHangarKit,
}) => {
  const { campaign, decisionEffects, warMapTab, space } = hud;
  const [mapTrack, setMapTrack] = useState<CampaignTrackId>(
    campaign.activeCampaignTrack === 'extinction' ? 'extinction' : 'original',
  );
  const [selectedMissionId, setSelectedMissionId] = useState<string>(hud.activeMission.id);
  const [selectedLevelId, setSelectedLevelId] = useState<string>(
    hud.activeLevel?.id ?? campaign.currentLevelId ?? CAMPAIGN_LEVELS[0].id,
  );
  const [selectedExtLevelId, setSelectedExtLevelId] = useState<string>(
    getExtinctionLevelById(hud.activeLevel?.id ?? '')?.id ??
      campaign.extinctionState?.currentLevelId ??
      EXTINCTION_LEVELS[0].id,
  );
  const [selectedRegionId, setSelectedRegionId] = useState<SpaceRegionId>(space.currentRegionId);
  const [previewModuleId, setPreviewModuleId] = useState<TradeOffModuleId | null>(null);
  const [confirmBuyModuleId, setConfirmBuyModuleId] = useState<TradeOffModuleId | null>(null);

  const ownedModules = campaign.spaceLoadout.ownedModules ?? [];
  const equippedModules = campaign.spaceLoadout.equippedModules ?? [];
  const pilotProgress = campaign.pilotProgress;
  const rankProgress = useMemo(
    () => computePilotRankProgress(pilotProgress?.xp ?? 0),
    [pilotProgress?.xp],
  );

  const currentShipStats = useMemo(
    () =>
      computeShipComparisonStats(
        campaign.spaceLoadout.selectedShipId,
        {
          engineLevel: campaign.spaceLoadout.engineLevel,
          shieldLevel: campaign.spaceLoadout.shieldLevel,
          pulseLevel: campaign.spaceLoadout.pulseLevel,
          missileCapacity: campaign.spaceLoadout.missileCapacity,
        },
        equippedModules,
      ),
    [campaign.spaceLoadout, equippedModules],
  );

  const previewShipStats = useMemo(() => {
    if (!previewModuleId) return null;
    const isEq = equippedModules.includes(previewModuleId);
    const nextList: TradeOffModuleId[] = isEq
      ? equippedModules.filter((id) => id !== previewModuleId)
      : [...equippedModules.slice(-1), previewModuleId];
    return computeShipComparisonStats(
      campaign.spaceLoadout.selectedShipId,
      {
        engineLevel: campaign.spaceLoadout.engineLevel,
        shieldLevel: campaign.spaceLoadout.shieldLevel,
        pulseLevel: campaign.spaceLoadout.pulseLevel,
        missileCapacity: campaign.spaceLoadout.missileCapacity,
      },
      nextList,
    );
  }, [campaign.spaceLoadout, equippedModules, previewModuleId]);

  const selectedMission: CampaignMissionDef = useMemo(() => {
    const all = [...MAIN_CAMPAIGN_MISSIONS, ...OPTIONAL_CAMPAIGN_MISSIONS];
    return all.find((m) => m.id === selectedMissionId) ?? MAIN_CAMPAIGN_MISSIONS[0];
  }, [selectedMissionId]);

  const operationLevels: CampaignLevelDef[] = useMemo(
    () => (selectedMission.isOptional ? [] : getLevelsForOperation(selectedMission.missionNumber)),
    [selectedMission],
  );

  const selectedLevel: CampaignLevelDef | null = useMemo(() => {
    if (selectedMission.isOptional || operationLevels.length === 0) return null;
    return operationLevels.find((l) => l.id === selectedLevelId) ?? operationLevels[0];
  }, [operationLevels, selectedLevelId, selectedMission.isOptional]);

  const pendingDecision = campaign.pendingDecisionId
    ? STRATEGIC_DECISIONS[campaign.pendingDecisionId]
    : null;

  const isMissionUnlocked = (m: CampaignMissionDef): boolean => {
    if (m.unlockAfterMission <= 0) return true;
    return campaign.completedMainMissions.includes(m.unlockAfterMission);
  };

  const isMissionDone = (m: CampaignMissionDef): boolean =>
    m.isOptional
      ? campaign.completedOptionalIds.includes(m.id)
      : campaign.completedMainMissions.includes(m.missionNumber);

  const upgradeRows: Array<{
    action: UpgradeActionType;
    title: string;
    detail: string;
    levelLabel: string;
    maxed: boolean;
  }> = [
    {
      action: 'space_pulse',
      title: 'Rapid Pulse Cannons',
      detail: 'Higher muzzle output & thermal dissipation against interceptors',
      levelLabel: `LVL ${campaign.spaceLoadout.pulseLevel}/3`,
      maxed: campaign.spaceLoadout.pulseLevel >= 3,
    },
    {
      action: 'space_plasma',
      title: 'Heavy Plasma Cannons',
      detail: 'Armor-piercing yield vs corvettes & capital ship hulls',
      levelLabel: `LVL ${campaign.spaceLoadout.plasmaLevel}/3`,
      maxed: campaign.spaceLoadout.plasmaLevel >= 3,
    },
    {
      action: 'space_emp',
      title: 'EMP Disruptor Array',
      detail: 'Extends deflector strip & subsystem lockout window',
      levelLabel: `LVL ${campaign.spaceLoadout.empLevel}/3`,
      maxed: campaign.spaceLoadout.empLevel >= 3,
    },
    {
      action: 'space_rail',
      title: 'Precision Rail Cannon',
      detail: 'Faster capacitor charge & high-velocity subsystem penetration',
      levelLabel: `LVL ${campaign.spaceLoadout.railLevel}/3`,
      maxed: campaign.spaceLoadout.railLevel >= 3,
    },
    {
      action: 'space_missiles',
      title: 'Homing Missile Bays',
      detail: '+2 Homing Missiles per sortie (up to 24 base capacity)',
      levelLabel: `${campaign.spaceLoadout.missileCapacity}/24`,
      maxed: campaign.spaceLoadout.missileCapacity >= 24,
    },
    {
      action: 'space_countermeasures',
      title: 'Countermeasure Flares',
      detail: 'Expanded decoy magazine & faster thermal venting',
      levelLabel: `LVL ${campaign.spaceLoadout.countermeasureLevel}/3`,
      maxed: campaign.spaceLoadout.countermeasureLevel >= 3,
    },
    {
      action: 'space_shields',
      title: 'Deflector Shield Core',
      detail: 'Increased maximum deflector barrier & recharge cadence',
      levelLabel: `LVL ${campaign.spaceLoadout.shieldLevel}/3`,
      maxed: campaign.spaceLoadout.shieldLevel >= 3,
    },
    {
      action: 'space_engines',
      title: 'Supercruise & Thruster Drive',
      detail: 'Higher combat top speed, boost reserve & supercruise velocity',
      levelLabel: `LVL ${campaign.spaceLoadout.engineLevel}/3`,
      maxed: campaign.spaceLoadout.engineLevel >= 3,
    },
    {
      action: 'space_allied_support',
      title: 'Vanguard Wingman Support',
      detail: 'Assigns additional allied escort craft to sector patrols',
      levelLabel: `LVL ${campaign.spaceLoadout.alliedSupportLevel}/3`,
      maxed: campaign.spaceLoadout.alliedSupportLevel >= 3,
    },
    {
      action: 'repair_ship',
      title: 'Full Drydock Hull Repair',
      detail: 'Restores airframe integrity to 100% prior to sortie launch',
      levelLabel: `${campaign.spaceLoadout.shipHullCondition}%`,
      maxed: campaign.spaceLoadout.shipHullCondition >= 100,
    },
  ];

  const unlockActionForShip = (shipId: PlayableShipId): UpgradeActionType | null => {
    if (shipId === 'strike_bomber') return 'unlock_strike_bomber';
    if (shipId === 'recon_craft') return 'unlock_recon_craft';
    if (shipId === 'advanced_prototype') return 'unlock_prototype';
    return null;
  };

  return (
    <div
      data-testid="strategic-command-modal"
      className="fixed inset-0 z-30 bg-[#05080f]/96 text-[#e6edf5] flex flex-col overflow-hidden"
      style={{
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      {/* Top Aerospace Strategic Header */}
      <div className="shrink-0 border-b border-slate-800 bg-[#070b11] px-4 py-3 md:px-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono-tabular uppercase tracking-[0.22em] text-sky-300">
            VANGUARD FLEET COMMAND · {EXPANDED_SPACE_THEATER_KM} KM THEATER · 10 OPS · 31 LEVELS
          </div>
          <h1 className="font-display text-xl md:text-2xl font-bold uppercase tracking-[0.08em] text-white leading-none mt-1">
            Galactic War — Operations &amp; Fleet Command
          </h1>
        </div>

        {/* 2-Tab Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="tab-space-map"
            onClick={() => onChangeTab('map')}
            className={`min-h-[42px] px-4 py-2 border text-xs font-mono-tabular uppercase tracking-[0.14em] flex items-center gap-1.5 transition-colors cursor-pointer ${
              warMapTab === 'map'
                ? 'bg-[#e6edf5] border-white text-[#05080f] font-semibold'
                : 'bg-[#070b11] border-slate-700/70 text-slate-300 hover:border-slate-400 hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            Operations &amp; Levels
          </button>
          <button
            type="button"
            data-testid="tab-fleet-hangar"
            onClick={() => onChangeTab('hangar')}
            className={`min-h-[42px] px-4 py-2 border text-xs font-mono-tabular uppercase tracking-[0.14em] flex items-center gap-1.5 transition-colors cursor-pointer ${
              warMapTab === 'hangar'
                ? 'bg-[#e6edf5] border-white text-[#05080f] font-semibold'
                : 'bg-[#070b11] border-slate-700/70 text-slate-300 hover:border-slate-400 hover:text-white'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            Fleet Hangar &amp; Ranks
          </button>
          <button
            type="button"
            aria-label="Return to Active Space Flight"
            onClick={onCloseToCombat}
            className="min-h-[42px] min-w-[42px] px-3 border border-slate-700/70 bg-[#05080f] text-slate-300 hover:text-white hover:border-slate-400 flex items-center justify-center gap-1.5 text-xs font-mono-tabular uppercase cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Fly</span>
          </button>
        </div>
      </div>

      {/* Resource & Pilot Rank Telemetry Ribbon */}
      <div className="shrink-0 border-b border-slate-800/80 bg-[#080d16] px-4 py-2 md:px-6 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono-tabular">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-400">
            RANK <strong className="text-sky-200 ml-1">{rankProgress.currentRank.title.toUpperCase()}</strong>
          </span>
          <span className="text-slate-400">
            CREDITS <strong className="text-amber-200 ml-1">{(pilotProgress?.credits ?? 0).toLocaleString()}</strong>
          </span>
          <span className="text-slate-400">
            SALVAGE <strong className="text-amber-300 ml-1">{campaign.resources.salvage}</strong>
          </span>
          <span className="text-slate-400">
            SUPPLIES <strong className="text-emerald-300 ml-1">{campaign.resources.supplies}</strong>
          </span>
          <span className="text-slate-400">
            INTEL <strong className="text-sky-300 ml-1">{campaign.resources.intel}</strong>
          </span>
          <span className="text-slate-400 hidden xl:inline">
            READINESS <strong className="text-white ml-1">{campaign.resources.fleetReadiness}%</strong>
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>
            ACTIVE CRAFT{' '}
            <strong className="text-sky-200 ml-1">
              {PLAYABLE_SHIPS[campaign.spaceLoadout.selectedShipId].name}
            </strong>
          </span>
          <span>
            LEVELS{' '}
            <strong className="text-emerald-300 ml-1">
              {campaign.completedLevelIds.length}/{CAMPAIGN_LEVELS.length}
            </strong>
          </span>
          <span>
            OPS{' '}
            <strong className="text-amber-300 ml-1">{campaign.completedMainMissions.length}/10</strong>
          </span>
          {decisionEffects.extraAlliedFighters > 0 && (
            <span className="hidden lg:inline text-emerald-300">
              +{decisionEffects.extraAlliedFighters} ESCORTS
            </span>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: OPERATIONS, 31-LEVEL SELECTOR, EXTINCTION 10-LEVEL & STAR-CHART */}
      {/* ===================================================================== */}
      {warMapTab === 'map' && (
        <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-3">
          {/* Dual Campaign Track Bar inside Space Map */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div className="inline-flex flex-wrap gap-1.5">
              <button
                type="button"
                data-testid="map-track-original"
                onClick={() => {
                  setMapTrack('original');
                  onSelectCampaignTrack?.('original');
                }}
                className={`min-h-[36px] px-3.5 py-1.5 border text-[11px] font-mono-tabular uppercase tracking-[0.14em] cursor-pointer ${
                  mapTrack === 'original'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-semibold'
                    : 'bg-[#070b11] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Original Campaign · 10 Ops / 31 Levels ({campaign.completedLevelIds.length}/31)
              </button>
              <button
                type="button"
                data-testid="map-track-extinction"
                onClick={() => {
                  setMapTrack('extinction');
                  onSelectCampaignTrack?.('extinction');
                }}
                className={`min-h-[36px] px-3.5 py-1.5 border text-[11px] font-mono-tabular uppercase tracking-[0.14em] cursor-pointer ${
                  mapTrack === 'extinction'
                    ? 'bg-rose-500/25 border-rose-400 text-rose-200 font-semibold'
                    : 'bg-[#070b11] border-slate-800 text-slate-400 hover:text-rose-200'
                }`}
              >
                Extinction Campaign · 10 Extreme Levels ({campaign.extinctionState?.completedLevelIds.length ?? 0}/10)
              </button>
            </div>
            {mapTrack === 'extinction' && (
              <span className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-rose-300">
                BOSSES DEFEATED: {campaign.extinctionState?.defeatedBossIds.length ?? 0}/6
              </span>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {mapTrack === 'extinction' ? (
            (() => {
              const extState = campaign.extinctionState;
              const selectedExt: ExtinctionLevelDef =
                EXTINCTION_LEVELS.find((l) => l.id === selectedExtLevelId) ?? EXTINCTION_LEVELS[0];
              const extUnlocked = isExtinctionLevelUnlocked({
                levelId: selectedExt.id,
                completedLevelIds: extState?.completedLevelIds ?? [],
                unlockedLevelIds: extState?.unlockedLevelIds,
              });
              const extRecord = extState?.levelRecords?.[selectedExt.id];

              return (
                <>
                  {/* LEFT: 10 Extinction Missions List */}
                  <div className="lg:col-span-3 flex flex-col gap-2">
                    <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-rose-400">
                      EXTINCTION PROTOCOL (10 LEVELS)
                    </div>
                    <div data-testid="extinction-levels-list" className="space-y-1">
                      {EXTINCTION_LEVELS.map((ext) => {
                        const unlocked = isExtinctionLevelUnlocked({
                          levelId: ext.id,
                          completedLevelIds: extState?.completedLevelIds ?? [],
                          unlockedLevelIds: extState?.unlockedLevelIds,
                        });
                        const done = Boolean(extState?.completedLevelIds.includes(ext.id));
                        const active = selectedExt.id === ext.id;
                        const rec = extState?.levelRecords?.[ext.id];
                        return (
                          <button
                            key={ext.id}
                            type="button"
                            data-testid={`ext-level-row-${ext.id}`}
                            onClick={() => {
                              setSelectedExtLevelId(ext.id);
                              setSelectedRegionId(ext.spaceRegionId);
                            }}
                            className={`w-full min-h-[44px] px-3 py-1.5 border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#211018] border-rose-400 text-white'
                                : unlocked
                                  ? 'bg-[#070b11] border-slate-800 text-slate-200 hover:border-rose-500/50'
                                  : 'bg-[#05080f] border-slate-900 text-slate-500'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-[9.5px] font-mono-tabular uppercase tracking-wider">
                                <span className="text-rose-300 font-semibold">{ext.code}</span>
                                {ext.bossKind && (
                                  <span
                                    className={`px-1 py-0.25 text-[8px] font-bold ${
                                      ext.bossKind === 'major_boss'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-amber-500/85 text-[#05080f]'
                                    }`}
                                  >
                                    {ext.isFinalExtinctionMission
                                      ? 'FINALE'
                                      : ext.bossKind === 'major_boss'
                                        ? 'MAJOR BOSS'
                                        : 'MINI-BOSS'}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-semibold truncate">{ext.name}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {rec && (
                                <span
                                  className={`px-1.5 py-0.5 border text-[10px] font-mono-tabular font-bold ${gradeChipTone(
                                    rec.bestGrade,
                                  )}`}
                                >
                                  {rec.bestGrade}
                                </span>
                              )}
                              {done ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : !unlocked ? (
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                              ) : (
                                <span className="text-[8.5px] font-mono-tabular uppercase text-rose-300">
                                  OPEN
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CENTER: Selected Extinction Level Tactical Briefing & Launch */}
                  <div className="lg:col-span-5 flex flex-col gap-3">
                    <div className="avionics-panel border-rose-500/40 p-4 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-rose-400">
                            {selectedExt.code} · {selectedExt.objectiveBadge}
                          </span>
                          <span className="text-[10px] font-mono-tabular text-sky-300">
                            {SPACE_REGIONS[selectedExt.spaceRegionId].label}
                          </span>
                        </div>

                        <div>
                          <h2 className="font-display text-2xl font-bold uppercase tracking-[0.06em] text-white leading-tight">
                            {selectedExt.name}
                          </h2>
                          {selectedExt.bossTitle && (
                            <div className="mt-1 text-[10.5px] font-mono-tabular uppercase tracking-wider text-amber-300">
                              TARGET: {selectedExt.bossTitle}{' '}
                              {selectedExt.bossId && extState?.defeatedBossIds.includes(selectedExt.bossId)
                                ? '· [DEFEATED]'
                                : ''}
                            </div>
                          )}
                          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                            {selectedExt.briefing}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-[9.5px] font-mono-tabular">
                          <span className="px-2 py-0.5 border border-slate-700 bg-[#05080f] text-slate-300">
                            {selectedExt.battleStages.length} COMBAT STAGES
                          </span>
                          {selectedExt.events.map((evt) => (
                            <span
                              key={evt}
                              className="px-2 py-0.5 border border-rose-500/40 bg-rose-950/35 text-rose-200 uppercase"
                            >
                              {evt.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>

                        <div className="space-y-2 pt-2 text-xs border-t border-slate-800/80">
                          <div>
                            <div className="text-[9px] font-mono-tabular uppercase tracking-[0.16em] text-emerald-300">
                              PRIMARY OBJECTIVE
                            </div>
                            <div className="text-slate-100">{selectedExt.primaryObjectiveText}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono-tabular uppercase tracking-[0.16em] text-amber-300">
                              OPTIONAL OBJECTIVE
                            </div>
                            <div className="text-slate-300">{selectedExt.optionalObjectiveText}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono-tabular uppercase tracking-[0.16em] text-rose-400">
                              EXTINCTION INTEL &amp; FAILURE RISK
                            </div>
                            <div className="text-slate-200">{selectedExt.enemyIntel}</div>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              Fail if: {selectedExt.failureConditionText}
                            </div>
                          </div>
                          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-tabular text-slate-300">
                            <span>
                              BOUNTY: +{selectedExt.rewards.baseXp} XP · +{selectedExt.rewards.credits} CR
                            </span>
                            {extRecord && (
                              <span className="text-emerald-300">
                                BEST: {extRecord.bestGrade} ({extRecord.bestScore.toLocaleString()} PTS)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid="deploy-extinction-btn"
                        disabled={!extUnlocked}
                        onClick={() => onDeployLevel(selectedExt.id)}
                        className="w-full min-h-[48px] px-4 py-3 bg-rose-500 hover:bg-rose-400 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Rocket className="w-4 h-4" />
                        {extUnlocked
                          ? `Launch ${selectedExt.code} — ${selectedExt.name}`
                          : 'Complete Previous Extinction Level First'}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()
          ) : (
            <>
          {/* LEFT: 10 Main Operations (with Level counts) + 3 Optional Side Ops */}
          <div className="lg:col-span-3 flex flex-col gap-2">
            <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-amber-300">
              CAMPAIGN OPERATIONS (10 OPS · 31 LEVELS)
            </div>
            <div className="space-y-1">
              {MAIN_CAMPAIGN_MISSIONS.map((m) => {
                const unlocked = isMissionUnlocked(m);
                const done = isMissionDone(m);
                const active = selectedMission.id === m.id;
                const counts = getOperationCompletionCounts(
                  m.missionNumber,
                  campaign.completedLevelIds,
                  campaign.completedMainMissions,
                );
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`op-select-${m.id}`}
                    onClick={() => {
                      setSelectedMissionId(m.id);
                      setSelectedRegionId(m.spaceRegionId);
                      const opLvls = getLevelsForOperation(m.missionNumber);
                      if (opLvls.length > 0) {
                        const firstUncleared =
                          opLvls.find((l) => !campaign.completedLevelIds.includes(l.id)) ?? opLvls[0];
                        setSelectedLevelId(firstUncleared.id);
                      }
                    }}
                    className={`w-full min-h-[44px] px-3 py-1.5 border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#121d2d] border-amber-400 text-white'
                        : unlocked
                          ? 'bg-[#070b11] border-slate-800 text-slate-200 hover:border-slate-600'
                          : 'bg-[#05080f] border-slate-900 text-slate-500'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[9.5px] font-mono-tabular uppercase tracking-wider text-amber-300">
                        {m.code} · {SPACE_REGIONS[m.spaceRegionId].code}
                      </div>
                      <div className="text-xs font-semibold truncate">{m.title}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9.5px] font-mono-tabular text-slate-400">
                        {counts.completed}/{counts.total}
                      </span>
                      {done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : !unlocked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                      ) : (
                        <span className="text-[8.5px] font-mono-tabular uppercase text-sky-300">
                          OPEN
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-sky-300 mt-2">
              OPTIONAL SIDE OPERATIONS (3 OPS)
            </div>
            <div className="space-y-1">
              {OPTIONAL_CAMPAIGN_MISSIONS.map((m) => {
                const unlocked = isMissionUnlocked(m);
                const done = isMissionDone(m);
                const active = selectedMission.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMissionId(m.id);
                      setSelectedRegionId(m.spaceRegionId);
                    }}
                    className={`w-full min-h-[40px] px-3 py-1.5 border text-left flex items-center justify-between gap-2 cursor-pointer ${
                      active
                        ? 'bg-[#0f1c2e] border-sky-400 text-white'
                        : unlocked
                          ? 'bg-[#070b11] border-slate-800 text-slate-200 hover:border-slate-600'
                          : 'bg-[#05080f] border-slate-900 text-slate-500'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[9.5px] font-mono-tabular uppercase text-sky-300">{m.code}</div>
                      <div className="text-xs font-semibold truncate">{m.title}</div>
                    </div>
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : !unlocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    ) : (
                      <span className="text-[9px] font-mono-tabular text-emerald-300 shrink-0">OPT</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CENTER: Operation Levels Selector + Detailed Level Briefing & Launch */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {!selectedMission.isOptional && operationLevels.length > 0 && (
              <div data-testid="operation-levels-list" className="avionics-panel p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-amber-300">
                    {selectedMission.code} · SELECT SORTIE LEVEL
                  </span>
                  <span className="text-[10px] font-mono-tabular text-slate-400">
                    {operationLevels.length} LEVELS IN OPERATION
                  </span>
                </div>

                <div className="space-y-1.5">
                  {operationLevels.map((lvl) => {
                    const unlocked = isLevelUnlockedByProgress({
                      levelId: lvl.id,
                      completedLevelIds: campaign.completedLevelIds,
                      completedMainMissions: campaign.completedMainMissions,
                      currentMissionNumber: campaign.currentMissionNumber,
                      unlockedLevelIds: campaign.unlockedLevelIds,
                    });
                    const record = campaign.levelRecords?.[lvl.id];
                    const isSelected = selectedLevel?.id === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        data-testid={`level-row-${lvl.id}`}
                        onClick={() => {
                          setSelectedLevelId(lvl.id);
                          setSelectedRegionId(lvl.spaceRegionId);
                        }}
                        className={`w-full px-3 py-2.5 border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#121e30] border-sky-300 text-white'
                            : unlocked
                              ? 'bg-[#070b11] border-slate-800 text-slate-200 hover:border-slate-600'
                              : 'bg-[#05080f] border-slate-900 text-slate-500'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono-tabular uppercase tracking-wider">
                            <span className="text-amber-300 font-semibold">{lvl.code}</span>
                            <span className="px-1 py-0.25 border border-sky-400/35 bg-sky-950/40 text-sky-200">
                              {lvl.objectiveBadge}
                            </span>
                            {lvl.isBossLevel && (
                              <span className="px-1 py-0.25 bg-rose-500/85 text-white font-semibold">
                                BOSS
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-white mt-0.5 truncate">
                            {lvl.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {lvl.primaryObjectiveText}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {record ? (
                            <div className="text-right">
                              <span
                                className={`inline-block px-2 py-0.5 border text-xs font-mono-tabular font-bold ${gradeChipTone(
                                  record.bestGrade,
                                )}`}
                              >
                                {record.bestGrade}
                              </span>
                              <div className="text-[9px] font-mono-tabular text-slate-400 mt-0.5">
                                {record.bestScore.toLocaleString()}
                              </div>
                            </div>
                          ) : !unlocked ? (
                            <Lock className="w-4 h-4 text-slate-600" />
                          ) : (
                            <span className="text-[9.5px] font-mono-tabular uppercase text-emerald-300">
                              READY
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Level or Optional Op Briefing & Launch Card */}
            <div className="avionics-panel p-4 flex-1 flex flex-col justify-between gap-4">
              {selectedLevel ? (
                (() => {
                  const unlocked = isLevelUnlockedByProgress({
                    levelId: selectedLevel.id,
                    completedLevelIds: campaign.completedLevelIds,
                    completedMainMissions: campaign.completedMainMissions,
                    currentMissionNumber: campaign.currentMissionNumber,
                    unlockedLevelIds: campaign.unlockedLevelIds,
                  });
                  const record = campaign.levelRecords?.[selectedLevel.id];
                  return (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-amber-300">
                            {selectedLevel.code} · THREAT {selectedLevel.threatLevel.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono-tabular text-sky-300">
                            {SPACE_REGIONS[selectedLevel.spaceRegionId].label}
                          </span>
                        </div>

                        <div>
                          <h2 className="font-display text-2xl font-bold uppercase tracking-[0.06em] text-white leading-tight">
                            {selectedLevel.name}
                          </h2>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {selectedLevel.briefing}
                          </p>
                        </div>

                        <div className="space-y-2 pt-2 text-xs border-t border-slate-800/80">
                          <div>
                            <div className="text-[9px] font-mono-tabular uppercase tracking-[0.16em] text-emerald-300">
                              PRIMARY OBJECTIVE
                            </div>
                            <div className="text-slate-100">{selectedLevel.primaryObjectiveText}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono-tabular uppercase tracking-[0.16em] text-amber-300">
                              OPTIONAL OBJECTIVE
                            </div>
                            <div className="text-slate-300">{selectedLevel.optionalObjectiveText}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-mono-tabular uppercase tracking-[0.16em] text-rose-400">
                              ENEMY INTEL &amp; FAILURE RISK
                            </div>
                            <div className="text-slate-200">{selectedLevel.enemyIntel}</div>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              Fail if: {selectedLevel.failureConditionText}
                            </div>
                          </div>
                          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-tabular text-slate-300">
                            <span>
                              BOUNTY: +{selectedLevel.rewards.baseXp} XP · +{selectedLevel.rewards.credits} CR
                            </span>
                            {record && (
                              <span className="text-emerald-300">
                                BEST: {record.bestGrade} ({record.bestScore.toLocaleString()} PTS)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid="deploy-mission-btn"
                        disabled={!unlocked}
                        onClick={() => onDeployLevel(selectedLevel.id)}
                        className="w-full min-h-[48px] px-4 py-3 bg-[#e6edf5] hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 text-[#05080f] text-xs font-bold uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Rocket className="w-4 h-4" />
                        {unlocked
                          ? `Launch ${selectedLevel.code} — ${selectedLevel.name}`
                          : 'Complete Previous Level First'}
                      </button>
                    </>
                  );
                })()
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-sky-300">
                        {selectedMission.code} · OPTIONAL SORTIE
                      </span>
                      <span className="text-[10px] font-mono-tabular text-sky-300">
                        {SPACE_REGIONS[selectedMission.spaceRegionId].label}
                      </span>
                    </div>
                    <h2 className="font-display text-2xl font-bold uppercase tracking-[0.06em] text-white leading-tight">
                      {selectedMission.title}
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedMission.briefingSummary}
                    </p>
                    <div className="text-xs font-mono-tabular text-emerald-300">
                      +{selectedMission.rewards.salvage} Salvage · +{selectedMission.rewards.supplies} Supplies · +{selectedMission.rewards.intel} Intel
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="deploy-mission-btn"
                    disabled={!isMissionUnlocked(selectedMission)}
                    onClick={() => onDeployMission(selectedMission.id)}
                    className="w-full min-h-[48px] px-4 py-3 bg-[#e6edf5] hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 text-[#05080f] text-xs font-bold uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Rocket className="w-4 h-4" />
                    {isMissionUnlocked(selectedMission)
                      ? `Launch ${selectedMission.code}`
                      : `Complete OP 0${selectedMission.unlockAfterMission} First`}
                  </button>
                </>
              )}
            </div>
          </div>
            </>
          )}

          {/* RIGHT: 80 km 5-Region Star-Chart SVG */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="avionics-panel p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-sky-300">
                  5-SECTOR STAR-CHART · 80 KM
                </span>
                <span className="text-[10px] font-mono-tabular text-slate-400">
                  {campaign.discoveredRegions.length}/5 CHARTED
                </span>
              </div>

              <div className="relative w-full aspect-[4/3] bg-[#04070d] border border-slate-800 overflow-hidden">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {[20, 40, 60, 80].map((v) => (
                    <g key={v}>
                      <line x1={v} y1="0" x2={v} y2="100" stroke="rgba(148,163,184,0.12)" strokeWidth="0.25" />
                      <line x1="0" y1={v} x2="100" y2={v} stroke="rgba(148,163,184,0.12)" strokeWidth="0.25" />
                    </g>
                  ))}

                  {SPACE_REGION_LIST.map((reg) =>
                    reg.connectedRegions.map((targetId) => {
                      const target = SPACE_REGIONS[targetId];
                      if (reg.index > target.index) return null;
                      return (
                        <line
                          key={`${reg.id}-${targetId}`}
                          x1={reg.mapCoord[0]}
                          y1={reg.mapCoord[1]}
                          x2={target.mapCoord[0]}
                          y2={target.mapCoord[1]}
                          stroke="rgba(125,211,252,0.34)"
                          strokeWidth="0.65"
                          strokeDasharray="1.8 1.5"
                        />
                      );
                    }),
                  )}

                  {SPACE_REGION_LIST.map((reg) => {
                    const isCurrent = reg.id === space.currentRegionId;
                    const isSelected = reg.id === selectedRegionId;
                    const distKm = space.regionDistancesKm[reg.id] ?? 0;
                    return (
                      <g
                        key={reg.id}
                        onClick={() => setSelectedRegionId(reg.id)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={reg.mapCoord[0]}
                          cy={reg.mapCoord[1]}
                          r={isSelected ? 7.2 : 5.0}
                          fill={
                            reg.id === 'sovereign_defense_zone'
                              ? 'rgba(239,68,68,0.18)'
                              : isCurrent
                                ? 'rgba(245,158,11,0.22)'
                                : 'rgba(125,211,252,0.12)'
                          }
                          stroke={
                            isSelected
                              ? '#f59e0b'
                              : reg.id === 'sovereign_defense_zone'
                                ? '#ef4444'
                                : '#7dd3fc'
                          }
                          strokeWidth={isSelected ? 1.0 : 0.6}
                        />
                        <circle
                          cx={reg.mapCoord[0]}
                          cy={reg.mapCoord[1]}
                          r="1.9"
                          fill={isCurrent ? '#fbbf24' : '#e6edf5'}
                        />
                        <text
                          x={reg.mapCoord[0]}
                          y={reg.mapCoord[1] - 7.5}
                          textAnchor="middle"
                          fill="#e6edf5"
                          fontSize="3.2"
                          fontWeight="600"
                        >
                          {reg.code}
                        </text>
                        <text
                          x={reg.mapCoord[0]}
                          y={reg.mapCoord[1] + 9.8}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="2.6"
                        >
                          {distKm > 0.2 ? `${distKm.toFixed(1)} KM` : 'HERE'}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {(() => {
                const reg = SPACE_REGIONS[selectedRegionId];
                const distKm = space.regionDistancesKm[selectedRegionId] ?? 0;
                return (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono-tabular uppercase tracking-[0.14em] text-amber-300">
                          {reg.code} · {reg.hazardLevel}
                        </div>
                        <div className="font-display text-lg font-bold uppercase tracking-wide text-white leading-tight">
                          {reg.label}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onTravelRegion(reg.id)}
                        className="min-h-[40px] px-3 py-1.5 bg-sky-400 hover:bg-sky-300 text-[#05080f] text-[10.5px] font-mono-tabular font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        Warp ({distKm.toFixed(1)} km)
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{reg.subtitle}</p>
                  </div>
                );
              })()}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: FLEET HANGAR — 5 SHIPS, RANKS/LIVERIES, MODULES & UPGRADES     */}
      {/* ===================================================================== */}
      {warMapTab === 'hangar' && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Pilot Rank Career, Cosmetic Hull Liveries & Credits Requisition */}
          <div
            data-testid="pilot-rank-hangar-section"
            className="grid grid-cols-1 xl:grid-cols-12 gap-4"
          >
            <div className="xl:col-span-5 avionics-panel p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-sky-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    PILOT RANK PROGRESSION
                  </span>
                  <span className="text-xs font-mono-tabular font-bold text-amber-300">
                    {(pilotProgress?.credits ?? 0).toLocaleString()} CREDITS
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                    {rankProgress.currentRank.title}
                  </div>
                  <div className="text-xs font-mono-tabular text-sky-300">
                    {rankProgress.xp.toLocaleString()} XP
                  </div>
                </div>
                <div className="h-2 bg-slate-900 border border-slate-700/70 overflow-hidden">
                  <div
                    className="h-full bg-sky-400"
                    style={{ width: `${Math.round(rankProgress.progressRatio * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-400">
                  <span>ACTIVE PERK: {rankProgress.currentRank.unlockSummary}</span>
                </div>
                <div className="grid grid-cols-7 gap-1 pt-1">
                  {PILOT_RANKS.map((r) => {
                    const reached = r.rankIndex <= rankProgress.currentRank.rankIndex;
                    return (
                      <div
                        key={r.rankIndex}
                        title={`${r.title} (${r.minXp} XP): ${r.unlockSummary}`}
                        className={`px-1 py-1 border text-center font-mono-tabular text-[8.5px] uppercase truncate ${
                          reached
                            ? 'bg-sky-950/60 border-sky-400/70 text-sky-200 font-semibold'
                            : 'bg-[#05080f] border-slate-800 text-slate-600'
                        }`}
                      >
                        R{r.rankIndex + 1}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[10px] font-mono-tabular text-slate-300">
                  CREDIT REQUISITION: 220 CR → +100 SALVAGE · +40 SUPPLIES
                </div>
                <button
                  type="button"
                  data-testid="exchange-credits-btn"
                  disabled={(pilotProgress?.credits ?? 0) < 220}
                  onClick={onExchangeCreditsForHangarKit}
                  className="min-h-[38px] px-3 py-1.5 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-[#05080f] text-[10px] font-mono-tabular font-bold uppercase tracking-wider cursor-pointer"
                >
                  Requisition Kit (220 CR)
                </button>
              </div>
            </div>

            <div className="xl:col-span-7 avionics-panel p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  RANK-UNLOCKED HULL LIVERIES ({rankProgress.unlockedCosmetics.length}/{COSMETIC_LIVERIES.length})
                </span>
                <span className="text-[10px] font-mono-tabular text-slate-400">
                  MEDALS EARNED: {(pilotProgress?.medals ?? []).length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {COSMETIC_LIVERIES.map((livery) => {
                  const unlocked =
                    livery.requiredRankIndex <= rankProgress.currentRank.rankIndex ||
                    (pilotProgress?.unlockedCosmetics ?? []).includes(livery.id);
                  const active = (pilotProgress?.activeCosmeticId ?? 'vanguard_standard') === livery.id;
                  const reqRank = PILOT_RANKS[livery.requiredRankIndex];
                  return (
                    <button
                      key={livery.id}
                      type="button"
                      data-testid={`livery-btn-${livery.id}`}
                      disabled={!unlocked}
                      onClick={() => onSelectCosmeticLivery(livery.id)}
                      className={`p-2.5 border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#101c2d] border-amber-400 text-white'
                          : unlocked
                            ? 'bg-[#070b11] border-slate-700 text-slate-200 hover:border-sky-300'
                            : 'bg-[#05080f] border-slate-900 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 border border-white/40"
                            style={{ backgroundColor: livery.hullAccentHex }}
                          />
                          <span
                            className="w-2.5 h-2.5 border border-white/30"
                            style={{ backgroundColor: livery.trimHex }}
                          />
                        </span>
                        <span className="text-[8.5px] font-mono-tabular uppercase">
                          {active
                            ? 'EQUIPPED'
                            : unlocked
                              ? 'EQUIP'
                              : reqRank?.title.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold mt-1.5 truncate">{livery.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5 Distinct Playable Spacecraft Grid */}
          <div>
            <div className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-amber-300 mb-3">
              VANGUARD FLEET HANGAR — 5 PLAYABLE SPACECRAFT CLASSES
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              {PLAYABLE_SHIP_LIST.map((ship) => {
                const unlocked = campaign.spaceLoadout.unlockedShips.includes(ship.id);
                const selected = campaign.spaceLoadout.selectedShipId === ship.id;
                const unlockAct = unlockActionForShip(ship.id);
                const unlockCost = unlockAct ? getUpgradeCost(campaign, unlockAct) : null;
                const affordable = unlockCost ? canAffordCost(campaign.resources, unlockCost) : false;

                return (
                  <div
                    key={ship.id}
                    data-testid={`ship-card-${ship.id}`}
                    className={`p-3.5 border flex flex-col justify-between gap-3 ${
                      selected
                        ? 'bg-[#0e1928] border-amber-400'
                        : 'bg-[#070b11] border-slate-800'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-mono-tabular uppercase tracking-wider text-sky-300">
                          {ship.code} · {ship.role}
                        </span>
                        {selected && (
                          <span className="text-[8.5px] font-mono-tabular font-semibold uppercase px-1.5 py-0.5 bg-amber-400 text-[#05080f]">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-bold uppercase tracking-wide text-white leading-tight">
                        {ship.name}
                      </h3>
                      <p className="text-[11px] text-slate-300 leading-snug">{ship.summary}</p>

                      <div className="space-y-1 pt-2 border-t border-slate-800/80 text-[10px] font-mono-tabular">
                        <div className="flex justify-between">
                          <span className="text-slate-400">HULL / SHD</span>
                          <span className="text-emerald-300">
                            {ship.maxHull} / {ship.maxShield}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">COMBAT / CRUISE</span>
                          <span className="text-sky-300">
                            {ship.topSpeed} / {ship.cruiseSpeed} M/S
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">RADAR / CAP DMG</span>
                          <span className="text-amber-300">
                            {(ship.radarRangeMeters / 1000).toFixed(1)} KM · {Math.round(ship.capitalDamageMultiplier * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => onSelectShipClass(ship.id)}
                        className={`w-full min-h-[40px] px-3 py-2 text-[10.5px] font-mono-tabular font-semibold uppercase tracking-[0.14em] transition-colors cursor-pointer ${
                          selected
                            ? 'bg-amber-400 text-[#05080f]'
                            : 'bg-[#121d2d] border border-slate-700 hover:border-sky-300 text-white'
                        }`}
                      >
                        {selected ? 'Equipped' : 'Select Craft'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!unlockAct || !affordable}
                        onClick={() => unlockAct && onPurchaseUpgrade(unlockAct)}
                        className="w-full min-h-[40px] px-2.5 py-2 border border-amber-400/55 bg-[#05080f] hover:bg-amber-400 hover:text-[#05080f] disabled:opacity-40 text-amber-300 text-[10px] font-mono-tabular font-semibold uppercase tracking-wider cursor-pointer"
                      >
                        {unlockCost
                          ? `Build (${unlockCost.salvage}S · ${unlockCost.supplies}P · ${unlockCost.intel}I)`
                          : ship.unlockRequirement}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engineering Trade-Off Modules */}
          <div data-testid="trade-off-modules-section" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                ENGINEERING TRADE-OFF MODULES ({equippedModules.length}/2 ACTIVE SLOTS)
              </div>
              <div className="text-[10px] font-mono-tabular text-slate-400">
                HOVER OR SELECT A MODULE TO COMPARE CURRENT VS. PREVIEWED PERFORMANCE
              </div>
            </div>

            <div
              data-testid="module-stat-comparison"
              className="grid grid-cols-3 md:grid-cols-6 gap-2 bg-[#070b11] border border-slate-800 p-2.5 text-[10px] font-mono-tabular"
            >
              {(
                [
                  { label: 'TOP SPEED', cur: currentShipStats.maxSpeed, prev: previewShipStats?.maxSpeed, unit: ' M/S' },
                  { label: 'MAX HULL', cur: currentShipStats.maxHull, prev: previewShipStats?.maxHull, unit: '' },
                  { label: 'MAX SHIELD', cur: currentShipStats.maxShield, prev: previewShipStats?.maxShield, unit: '' },
                  { label: 'AGILITY', cur: currentShipStats.agilityPct, prev: previewShipStats?.agilityPct, unit: '%' },
                  { label: 'FIREPOWER', cur: currentShipStats.firepowerPct, prev: previewShipStats?.firepowerPct, unit: '%' },
                  { label: 'MISSILES', cur: currentShipStats.missiles, prev: previewShipStats?.missiles, unit: '' },
                ] as const
              ).map((row) => {
                const delta = row.prev !== undefined ? row.prev - row.cur : 0;
                return (
                  <div key={row.label} className="px-2 py-1 bg-[#05080f] border border-slate-800/80">
                    <div className="text-[8.5px] text-slate-400 tracking-wider">{row.label}</div>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-white font-semibold">
                        {row.cur}
                        {row.unit}
                      </span>
                      {delta !== 0 && (
                        <span className={delta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {UPGRADE_TRADE_OFF_MODULES.map((mod) => {
                const owned = ownedModules.includes(mod.id);
                const equipped = equippedModules.includes(mod.id);
                const fullCost = {
                  salvage: mod.cost.salvage ?? 0,
                  supplies: mod.cost.supplies ?? 0,
                  intel: mod.cost.intel ?? 0,
                };
                const affordable = canAffordCost(campaign.resources, fullCost);
                const confirming = confirmBuyModuleId === mod.id;

                return (
                  <div
                    key={mod.id}
                    data-testid={`trade-off-card-${mod.id}`}
                    onMouseEnter={() => setPreviewModuleId(mod.id)}
                    onMouseLeave={() => setPreviewModuleId((prev) => (prev === mod.id ? null : prev))}
                    className={`p-3.5 border flex flex-col justify-between gap-2.5 transition-colors ${
                      equipped
                        ? 'bg-[#0e1928] border-amber-400'
                        : previewModuleId === mod.id
                          ? 'bg-[#0b1320] border-sky-400/70'
                          : 'bg-[#070b11] border-slate-800'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono-tabular uppercase tracking-wider text-sky-300">
                          {mod.category}
                        </span>
                        {equipped ? (
                          <span className="text-[8.5px] font-mono-tabular font-semibold uppercase px-1.5 py-0.5 bg-amber-400 text-[#05080f]">
                            EQUIPPED
                          </span>
                        ) : owned ? (
                          <span className="text-[8.5px] font-mono-tabular uppercase text-emerald-300">
                            OWNED
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono-tabular text-slate-400">
                            {fullCost.salvage}S
                            {fullCost.supplies > 0 ? ` · ${fullCost.supplies}P` : ''}
                            {fullCost.intel > 0 ? ` · ${fullCost.intel}I` : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white">
                        {mod.name}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{mod.summary}</p>
                      <div className="pt-1 space-y-0.5 text-[10px] font-mono-tabular">
                        <div className="text-emerald-300">{mod.bonusText}</div>
                        <div className="text-rose-300">{mod.tradeOffText}</div>
                      </div>
                    </div>

                    {owned ? (
                      <button
                        type="button"
                        data-testid={`module-toggle-${mod.id}`}
                        onClick={() => onToggleTradeOffModule(mod.id)}
                        className={`w-full min-h-[38px] px-3 py-1.5 border text-[10px] font-mono-tabular font-semibold uppercase tracking-wider cursor-pointer ${
                          equipped
                            ? 'bg-amber-400 border-amber-300 text-[#05080f]'
                            : 'bg-[#121d2d] border-sky-400/50 text-sky-200 hover:bg-sky-400 hover:text-[#05080f]'
                        }`}
                      >
                        {equipped ? 'Unequip Module' : 'Equip Module'}
                      </button>
                    ) : confirming ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          data-testid={`module-confirm-${mod.id}`}
                          disabled={!affordable}
                          onClick={() => {
                            onPurchaseTradeOffModule(mod.id);
                            setConfirmBuyModuleId(null);
                          }}
                          className="flex-1 min-h-[38px] px-2.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-[#05080f] text-[10px] font-mono-tabular font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Confirm Install
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmBuyModuleId(null)}
                          className="min-h-[38px] px-2.5 py-1.5 border border-slate-700 bg-[#05080f] text-slate-300 hover:text-white text-[10px] font-mono-tabular uppercase cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-testid={`module-buy-${mod.id}`}
                        disabled={!affordable}
                        onClick={() => {
                          setPreviewModuleId(mod.id);
                          setConfirmBuyModuleId(mod.id);
                        }}
                        className="w-full min-h-[38px] px-3 py-1.5 border text-[10px] font-mono-tabular font-semibold uppercase tracking-wider cursor-pointer bg-[#e6edf5] border-white text-[#05080f] hover:bg-white disabled:bg-slate-900 disabled:border-slate-800 disabled:text-slate-600"
                      >
                        Purchase Module
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weapons, Deflectors & Fleet Engineering */}
          <div>
            <div className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-sky-300 mb-3">
              WEAPONS, DEFLECTORS &amp; FLEET ENGINEERING
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {upgradeRows.map((row) => {
                const cost = getUpgradeCost(campaign, row.action);
                const affordable = !row.maxed && canAffordCost(campaign.resources, cost);
                return (
                  <div
                    key={row.action}
                    className="p-3.5 bg-[#070b11] border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-white truncate">
                          {row.title}
                        </span>
                        <span className="text-[10px] font-mono-tabular text-amber-300 shrink-0">
                          {row.levelLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{row.detail}</p>
                      {!row.maxed && (
                        <div className="text-[10px] font-mono-tabular text-slate-300 mt-1">
                          Cost: {cost.salvage} Salvage
                          {cost.supplies > 0 ? ` · ${cost.supplies} Supplies` : ''}
                          {cost.intel > 0 ? ` · ${cost.intel} Intel` : ''}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={row.maxed || !affordable}
                      onClick={() => onPurchaseUpgrade(row.action)}
                      className="min-h-[40px] px-3 py-2 border text-[10px] font-mono-tabular font-semibold uppercase tracking-wider shrink-0 cursor-pointer bg-[#e6edf5] border-white text-[#05080f] hover:bg-white disabled:bg-slate-900 disabled:border-slate-800 disabled:text-slate-600"
                    >
                      {row.maxed ? 'MAX' : 'UPGRADE'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STRATEGIC FLEET DECISION MODAL OVERLAY (OP 3 / OP 6 / OP 8)           */}
      {/* ===================================================================== */}
      {pendingDecision && (
        <div
          data-testid="strategic-decision-modal"
          className="fixed inset-0 z-40 bg-[#05080f]/94 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="max-w-3xl w-full avionics-panel-solid border-t-2 border-t-amber-400 p-5 md:p-6 space-y-4">
            <div className="text-amber-300 text-[10px] font-mono-tabular uppercase tracking-[0.22em]">
              COMMAND DIRECTIVE · {pendingDecision.title}
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{pendingDecision.briefing}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[pendingDecision.choiceA, pendingDecision.choiceB].map((choice) => (
                <div
                  key={choice.id}
                  className="bg-[#05080f] border border-slate-800 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="font-display text-lg font-bold uppercase tracking-wide text-white">
                      {choice.label}
                    </div>
                    <p className="text-xs text-slate-300">{choice.summary}</p>
                    <div className="text-[11px] font-mono-tabular text-emerald-300">
                      {choice.immediateEffect}
                    </div>
                    <div className="text-[11px] text-amber-200/90">
                      Consequence: {choice.longTermConsequence}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChooseDecision(pendingDecision.id, choice.id)}
                    className="w-full min-h-[44px] px-4 py-2.5 bg-[#e6edf5] hover:bg-white text-[#05080f] text-xs font-bold uppercase tracking-[0.14em] cursor-pointer"
                  >
                    Execute: {choice.shortTitle}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
