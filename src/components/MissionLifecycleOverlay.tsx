import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Crosshair,
  FastForward,
  Map,
  Medal,
  Rocket,
  RotateCcw,
  ShieldAlert,
  Star,
  Wrench,
} from 'lucide-react';
import type { EngineHudSnapshot } from '../scene/AetherPrimeEngine';
import { PLAYABLE_SHIPS, SPACE_REGIONS } from '../world/spacePhysics';
import {
  STRATEGIC_DECISIONS,
  type MissionFailureCause,
  type StrategicDecisionDef,
} from '../world/strategicCampaign';
import {
  computePilotRankProgress,
  type PerformanceGrade,
} from '../world/combatScoring';

interface MissionLifecycleOverlayProps {
  hud: EngineHudSnapshot;
  onSkipTransition: () => void;
  onContinueFromResults: () => void;
  onReplayMission: () => void;
  onLaunchBriefedMission: () => void;
  onRetryMission: () => void;
  onOpenHangar: () => void;
  onOpenWarMap: () => void;
  onChooseDecision: (decisionId: StrategicDecisionDef['id'], choiceId: string) => void;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function getGradeStyles(grade: PerformanceGrade): {
  border: string;
  bg: string;
  text: string;
  label: string;
} {
  if (grade === 'S') {
    return {
      border: 'border-amber-400',
      bg: 'bg-amber-950/55',
      text: 'text-amber-300',
      label: 'ACE SUPERIORITY',
    };
  }
  if (grade === 'A') {
    return {
      border: 'border-sky-400',
      bg: 'bg-sky-950/55',
      text: 'text-sky-300',
      label: 'TACTICAL EXCELLENCE',
    };
  }
  if (grade === 'B') {
    return {
      border: 'border-emerald-400',
      bg: 'bg-emerald-950/50',
      text: 'text-emerald-300',
      label: 'MISSION QUALIFIED',
    };
  }
  return {
    border: 'border-slate-500',
    bg: 'bg-slate-900/75',
    text: 'text-slate-200',
    label: 'OBJECTIVE CLEARED',
  };
}

function getFailureHeadlineAndDetail(cause?: MissionFailureCause): {
  headline: string;
  causeLabel: string;
  hint: string;
} {
  switch (cause) {
    case 'asteroid_collision':
      return {
        headline: 'AIRFRAME SHATTERED',
        causeLabel: 'Catastrophic Silicate Asteroid Impact',
        hint: 'Reduce throttle in dense debris corridors and use lateral thrusters to clear drifting boulders.',
      };
    case 'time_expired':
      return {
        headline: 'TACTICAL WINDOW CLOSED',
        causeLabel: 'Mission Time Limit Expired',
        hint: 'Use Boost [SHIFT] and high-burst Plasma/Rail volleys to eliminate primary threats before the timer expires.',
      };
    case 'escort_destroyed':
      return {
        headline: 'PROTECTED ASSET LOST',
        causeLabel: 'Allied Escort Vessel / Installation Destroyed',
        hint: 'Intercept bombers and heavy fighters early using Wingman Attack [F1] and locked Homing Missiles.',
      };
    case 'target_escaped':
      return {
        headline: 'TARGET ESCAPED SECTOR',
        causeLabel: 'High-Value Hostile Escaped to Hyperspace',
        hint: 'Pursue fleeing craft with Boost [SHIFT] and EMP Disruptor shots to strip shields and halt jump spooling.',
      };
    default:
      return {
        headline: 'HULL INTEGRITY LOST',
        causeLabel: 'Overwhelming Hostile Fleet Fire',
        hint: 'Break pursuit with Boost [SHIFT], deploy Countermeasure Flares [R] against missiles, and use Repair Kits [H].',
      };
  }
}

export const MissionLifecycleOverlay: React.FC<MissionLifecycleOverlayProps> = ({
  hud,
  onSkipTransition,
  onContinueFromResults,
  onReplayMission,
  onLaunchBriefedMission,
  onRetryMission,
  onOpenHangar,
  onOpenWarMap,
  onChooseDecision,
}) => {
  // =========================================================================
  // 1. SHORT SKIPPABLE MISSION VICTORY TRANSITION (3.2s Orbital Flyby)
  // =========================================================================
  if (hud.mode === 'mission_transition') {
    const summary = hud.lastMissionSummary;
    const pct = Math.round(hud.transitionProgress * 100);
    const displayCode = summary?.levelCode ?? summary?.missionCode ?? hud.activeLevel?.code ?? hud.activeMission.code;
    const displayTitle = summary?.levelName ?? summary?.missionTitle ?? hud.activeLevel?.name ?? hud.activeMission.title;

    return (
      <div
        data-testid="mission-transition-screen"
        className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between select-none text-[#e6edf5]"
      >
        <div className="w-full bg-[#05080f]/86 border-b border-emerald-400/35 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-mono-tabular uppercase tracking-[0.24em] text-emerald-300">
              {summary?.grade ? `LEVEL COMPLETE · GRADE ${summary.grade}` : 'OPERATION COMPLETE · TACTICAL EXTRACTION'}
            </span>
          </div>
          <span className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-slate-400">
            {displayCode}
          </span>
        </div>

        <div className="w-full bg-[#05080f]/90 border-t border-slate-600/45 px-5 py-4 md:px-10 md:py-5">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] font-mono-tabular uppercase tracking-[0.22em] text-amber-300">
                {summary?.isFinalMission ? 'FINAL VICTORY TELEMETRY LOCKED' : 'SECTOR OBJECTIVE SECURED'}
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-[0.12em] text-white mt-0.5 truncate">
                {displayTitle}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {summary?.missionSubtitle ?? `${hud.activeMission.title} · ${hud.activeMission.subtitle}`}
              </p>
              <div className="mt-2.5 w-64 max-w-full h-1 bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-100"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              data-testid="skip-transition-btn"
              onClick={onSkipTransition}
              className="pointer-events-auto min-h-[44px] px-5 py-2.5 bg-[#e6edf5] text-[#05080f] text-xs font-bold uppercase tracking-[0.16em] hover:bg-white flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <FastForward className="w-4 h-4" />
              Skip Transition
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. DEDICATED LEVEL / MISSION RESULTS & C/B/A/S GRADING SCREEN
  // =========================================================================
  if (hud.mode === 'mission_results' && hud.lastMissionSummary) {
    const s = hud.lastMissionSummary;
    const pendingDecision = hud.campaign.pendingDecisionId
      ? STRATEGIC_DECISIONS[hud.campaign.pendingDecisionId]
      : null;
    const rankProgress = computePilotRankProgress(hud.campaign.pilotProgress?.xp ?? 0);
    const gradeStyle = s.grade ? getGradeStyles(s.grade) : null;
    const displayCode = s.levelCode ?? s.missionCode;
    const displayTitle = s.levelName ?? s.missionTitle;
    const hasGradeUpgradeBonus =
      !s.firstClear && ((s.creditsEarned ?? 0) > 0 || (s.xpEarned ?? 0) > 0);

    return (
      <div
        data-testid="mission-results-screen"
        className="fixed inset-0 z-30 bg-[#04070e]/90 flex items-center justify-center p-3 md:p-5 overflow-y-auto text-[#e6edf5]"
      >
        <div className="w-full max-w-5xl avionics-panel-solid border-t-2 border-t-emerald-400 p-5 md:p-6 my-auto">
          {/* Header with Prominent Aerospace Grade Stamp */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700/60 pb-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono-tabular uppercase tracking-[0.2em] text-emerald-400">
                <Award className="w-4 h-4 shrink-0" />
                <span>DEBRIEF &amp; EVALUATION · {displayCode}</span>
                {s.isNewBestScore && (
                  <span className="px-1.5 py-0.5 bg-amber-400 text-[#05080f] text-[9px] font-bold">
                    NEW BEST
                  </span>
                )}
                {s.firstClear && (
                  <span className="px-1.5 py-0.5 border border-emerald-400/60 bg-emerald-950/60 text-emerald-300 text-[9px] font-bold">
                    FIRST CLEAR
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-[0.08em] text-white mt-1">
                {displayTitle}
              </h1>
              <div
                data-testid="results-reward-status"
                className="text-[10px] text-slate-400 mt-0.5"
              >
                {s.firstClear
                  ? 'First Clear · Full Tactical Rewards Granted'
                  : hasGradeUpgradeBonus
                    ? 'Grade Improved · Rank Bonus Awarded'
                    : 'Replay Complete · Telemetry Recorded'}
              </div>
            </div>

            {s.grade && gradeStyle && (
              <div
                data-testid="results-grade-badge"
                className={`px-5 py-2.5 border-2 ${gradeStyle.border} ${gradeStyle.bg} text-center shrink-0 min-w-[124px]`}
              >
                <div className="text-[9px] font-mono-tabular uppercase tracking-[0.2em] text-slate-300">
                  GRADE
                </div>
                <div className={`font-display text-4xl md:text-5xl font-bold leading-none mt-0.5 ${gradeStyle.text}`}>
                  {s.grade}
                </div>
                <div className="text-[8.5px] font-mono-tabular uppercase tracking-[0.14em] text-slate-300 mt-1">
                  {gradeStyle.label}
                </div>
              </div>
            )}
          </div>

          {/* Main Performance Summary (Only 4 core metrics) */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="avionics-panel p-3">
              <div className="text-[8.5px] font-mono-tabular uppercase tracking-[0.14em] text-slate-400">
                FINAL SCORE
              </div>
              <div
                data-testid="results-final-score"
                className="font-mono-tabular text-xl md:text-2xl font-bold text-amber-300 mt-0.5"
              >
                {(s.score ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="avionics-panel p-3">
              <div className="text-[8.5px] font-mono-tabular uppercase tracking-[0.14em] text-slate-400">
                ACCURACY
              </div>
              <div className="font-mono-tabular text-xl md:text-2xl font-bold text-sky-300 mt-0.5">
                {s.accuracyPct}%
              </div>
            </div>
            <div className="avionics-panel p-3">
              <div className="text-[8.5px] font-mono-tabular uppercase tracking-[0.14em] text-slate-400">
                ELIMINATIONS
              </div>
              <div className="font-mono-tabular text-xl md:text-2xl font-bold text-white mt-0.5">
                {s.spaceKills}
              </div>
            </div>
            <div className="avionics-panel p-3">
              <div className="text-[8.5px] font-mono-tabular uppercase tracking-[0.14em] text-slate-400">
                CLEAR TIME
              </div>
              <div className="font-mono-tabular text-xl md:text-2xl font-bold text-emerald-300 mt-0.5">
                {formatDuration(s.elapsedSec)}
              </div>
            </div>
          </div>

          {/* Combined Compact Progression & Rewards Section */}
          <div data-testid="results-pilot-rank-panel" className="avionics-panel p-3 mt-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-sky-300 font-bold">
                  {rankProgress.currentRank.title.toUpperCase()}
                </span>
                <span className="text-[9px] font-mono-tabular text-slate-400">
                  ({rankProgress.xp.toLocaleString()} XP)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono-tabular">
                <span className="text-sky-300 font-bold">+{s.xpEarned ?? 0} XP</span>
                <span className="text-amber-300 font-bold">+{s.creditsEarned ?? 0} CR</span>
                {s.rewardsGranted.salvage > 0 && (
                  <span className="text-slate-300 text-[10px]">+{s.rewardsGranted.salvage} Salvage</span>
                )}
              </div>
            </div>
            <div className="h-1.5 bg-slate-900 border border-slate-700/60 overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-[width] duration-300"
                style={{ width: `${Math.round(rankProgress.progressRatio * 100)}%` }}
              />
            </div>
            {/* Newly unlocked reward notification */}
            {s.newlyUnlockedShips && s.newlyUnlockedShips.length > 0 && (
              <div className="px-2.5 py-1.5 border border-sky-400/60 bg-sky-950/50 text-[10px] font-mono-tabular text-sky-200 uppercase flex items-center gap-2">
                <Rocket className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span>NEW CRAFT UNLOCKED: {s.newlyUnlockedShips.map((id) => PLAYABLE_SHIPS[id]?.name ?? id).join(', ')}</span>
              </div>
            )}
            {s.rankedUp && (
              <div className="px-2.5 py-1.5 border border-amber-400/70 bg-amber-950/45 text-[10px] font-mono-tabular text-amber-200 flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>PROMOTION: {s.newRankTitle?.toUpperCase()} — {s.rankUnlockSummary}</span>
              </div>
            )}
          </div>

          {/* Combined Compact Objectives & Earned Medals Card */}
          <div className="avionics-panel p-3 mt-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-300 font-mono-tabular text-[10px] uppercase tracking-wider font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>PRIMARY OBJECTIVE CLEARED</span>
              </div>
              {s.optionalObjectiveText && (
                <div
                  className={`font-mono-tabular text-[10px] uppercase tracking-wider font-semibold ${
                    s.optionalCompleted ? 'text-amber-300' : 'text-slate-500'
                  }`}
                >
                  {s.optionalCompleted ? 'OPTIONAL COMPLETED' : 'OPTIONAL MISSED'}
                </div>
              )}
            </div>
            {s.optionalObjectiveText && (
              <div className="text-[10.5px] text-slate-300">
                Optional: {s.optionalObjectiveText}
              </div>
            )}
            {s.medalsEarned && s.medalsEarned.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-700/50">
                <Medal className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                {s.medalsEarned.map((medal) => (
                  <span
                    key={medal}
                    className="px-2 py-0.5 border border-amber-400/45 bg-amber-950/35 text-[9px] font-mono-tabular uppercase tracking-wider text-amber-200"
                  >
                    {medal}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Compact Strategic Decision Prompt */}
          {pendingDecision && (
            <div className="avionics-panel border-amber-400/60 p-3 mt-3 bg-[#080d17]">
              <div className="flex items-center gap-2 text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-amber-300 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>COMMAND DIRECTIVE · {pendingDecision.title}</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">{pendingDecision.briefing}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {[pendingDecision.choiceA, pendingDecision.choiceB].map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => onChooseDecision(pendingDecision.id, choice.id)}
                    className="min-h-[40px] text-left p-2.5 border border-slate-600/70 bg-[#060a12] hover:border-amber-300 hover:bg-[#11192a] transition-colors cursor-pointer"
                  >
                    <div className="font-display text-xs font-bold uppercase tracking-wider text-white">
                      {choice.shortTitle}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">{choice.summary}</div>
                    <div className="text-[9.5px] font-mono-tabular text-amber-300 mt-0.5">
                      {choice.immediateEffect}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Action Footer */}
          <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenHangar}
                className="min-h-[40px] px-3.5 py-2 avionics-panel text-xs font-mono-tabular uppercase tracking-[0.12em] text-slate-200 hover:border-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                Fleet Hangar
              </button>
              <button
                type="button"
                onClick={onOpenWarMap}
                className="min-h-[40px] px-3.5 py-2 avionics-panel text-xs font-mono-tabular uppercase tracking-[0.12em] text-slate-200 hover:border-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Map className="w-3.5 h-3.5" />
                Level Select
              </button>
              <button
                type="button"
                data-testid="replay-mission-btn"
                onClick={onReplayMission}
                className="min-h-[40px] px-3.5 py-2 avionics-panel text-xs font-mono-tabular uppercase tracking-[0.12em] text-slate-300 hover:border-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Replay Level
              </button>
            </div>

            <button
              type="button"
              data-testid="continue-campaign-btn"
              onClick={onContinueFromResults}
              className="min-h-[42px] px-6 py-2.5 bg-[#e6edf5] text-[#05080f] text-xs font-bold uppercase tracking-[0.16em] hover:bg-white flex items-center gap-2 cursor-pointer"
            >
              <span>{s.isFinalMission ? 'View Campaign Epilogue' : 'Next Level Briefing'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. DEDICATED NEXT LEVEL / OPERATION BRIEFING SCREEN
  // =========================================================================
  if (hud.mode === 'mission_briefing') {
    const mission = hud.briefingMission;
    const level = hud.briefingLevel;
    const region = SPACE_REGIONS[level ? level.spaceRegionId : mission.spaceRegionId];
    const ship = PLAYABLE_SHIPS[hud.campaign.spaceLoadout.selectedShipId];
    const isExtLevel = Boolean(level && level.id.startsWith('ext_'));
    const record = level
      ? isExtLevel
        ? hud.campaign.extinctionState?.levelRecords?.[level.id]
        : hud.campaign.levelRecords?.[level.id]
      : undefined;
    const alreadyCleared = level
      ? isExtLevel
        ? Boolean(hud.campaign.extinctionState?.completedLevelIds.includes(level.id))
        : hud.campaign.completedLevelIds.includes(level.id)
      : hud.campaign.claimedRewardMissionIds.includes(mission.id);

    return (
      <div
        data-testid="mission-briefing-screen"
        className="fixed inset-0 z-30 bg-[#04070e]/90 flex items-center justify-center p-3 md:p-6 overflow-y-auto text-[#e6edf5]"
      >
        <div className="w-full max-w-4xl avionics-panel-solid border-t-2 border-t-amber-400 p-5 md:p-7 my-auto">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700/60 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono-tabular uppercase tracking-[0.2em] text-amber-300">
                <Crosshair className="w-4 h-4" />
                <span>
                  {level
                    ? `SORTIE BRIEFING · ${level.code} · ${level.objectiveBadge}`
                    : `OPERATION BRIEFING · ${mission.code}`}
                </span>
                {level?.isBossLevel && (
                  <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-bold">
                    BOSS / ACE ENCOUNTER
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-[0.1em] text-white mt-1">
                {level ? level.name : mission.title}
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                {mission.code}: {mission.title} — {mission.subtitle}
              </p>
            </div>

            <div className="text-right font-mono-tabular">
              <div className="text-[10px] uppercase tracking-[0.16em] text-sky-300">
                {region.code} · {region.label}
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-amber-300 mt-0.5">
                {level
                  ? `THREAT: ${level.threatLevel.toUpperCase()}`
                  : `HAZARD: ${region.hazardLevel}`}
              </div>
              {record && (
                <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-300 mt-0.5">
                  BEST: GRADE {record.bestGrade} · {record.bestScore.toLocaleString()} PTS
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 px-4 py-3 border-l-2 border-l-sky-400 bg-[#080f1c] text-xs text-sky-100 leading-relaxed">
            <span className="font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-sky-300 block mb-1">
              TACTICAL BRIEFING
            </span>
            {level ? level.briefing : mission.commsTransmission}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="avionics-panel p-4 space-y-3">
              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-emerald-300">
                  PRIMARY OBJECTIVE
                </div>
                <p className="text-xs text-white font-medium mt-1 leading-relaxed">
                  {level ? level.primaryObjectiveText : mission.briefingSummary}
                </p>
              </div>
              {level && (
                <div>
                  <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-amber-300">
                    OPTIONAL BONUS OBJECTIVE
                  </div>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                    {level.optionalObjectiveText}
                  </p>
                </div>
              )}
              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-rose-300">
                  FAILURE CONDITIONS
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {level ? level.failureConditionText : 'Player spacecraft hull destroyed.'}
                </p>
              </div>
            </div>

            <div className="avionics-panel p-4 space-y-3">
              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400">
                  HOSTILE INTEL &amp; FORCE COMPOSITION
                </div>
                <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                  {level ? level.enemyIntel : mission.enemyComposition.join(' · ')}
                </p>
                {level && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[9.5px] font-mono-tabular text-slate-300">
                    <span>PAR TIME: {formatDuration(level.parTimeSec)}</span>
                    {level.timeLimitSec && <span>· LIMIT: {formatDuration(level.timeLimitSec)}</span>}
                    {level.survivalDurationSec && (
                      <span>· SURVIVE: {formatDuration(level.survivalDurationSec)}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-700/55">
                <div className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400">
                  ASSIGNED SPACECRAFT &amp; BOUNTY
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-display font-bold uppercase tracking-wider text-white">
                    {ship.name}
                  </span>
                  <span className="font-mono-tabular text-[10px] text-sky-300">{ship.role}</span>
                </div>
                <div className="mt-1 text-[10px] font-mono-tabular text-slate-400">
                  {alreadyCleared
                    ? 'REPLAY SORTIE — IMPROVE GRADE FOR ONE-TIME XP & CREDIT BONUS'
                    : level
                      ? `FIRST CLEAR: +${level.rewards.baseXp} XP · +${level.rewards.credits} CREDITS`
                      : `BOUNTY: +${mission.rewards.salvage} SALVAGE · +${mission.rewards.intel} INTEL`}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenHangar}
                className="min-h-[44px] px-4 py-2 avionics-panel text-xs font-mono-tabular uppercase tracking-[0.14em] text-slate-200 hover:border-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                Fleet Hangar
              </button>
              <button
                type="button"
                onClick={onOpenWarMap}
                className="min-h-[44px] px-4 py-2 avionics-panel text-xs font-mono-tabular uppercase tracking-[0.14em] text-slate-200 hover:border-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Map className="w-3.5 h-3.5" />
                Level Select
              </button>
            </div>

            <button
              type="button"
              data-testid="launch-mission-btn"
              onClick={onLaunchBriefedMission}
              className="min-h-[44px] px-6 py-2.5 bg-amber-400 text-[#05080f] text-xs font-bold uppercase tracking-[0.16em] hover:bg-amber-300 flex items-center gap-2 cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              {level ? `Launch ${level.code}` : 'Launch Mission'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. DEDICATED MISSION FAILED & CLEAN RETRY FLOW (All 5 Failure Causes)
  // =========================================================================
  if (hud.mode === 'mission_failed') {
    const f = hud.lastMissionFailure;
    const failCopy = getFailureHeadlineAndDetail(f?.cause);

    return (
      <div
        data-testid="mission-failed-screen"
        className="fixed inset-0 z-30 bg-[#05070e]/90 flex items-center justify-center p-4 overflow-y-auto text-[#e6edf5]"
      >
        <div className="w-full max-w-xl avionics-panel-solid border-t-2 border-t-rose-500 p-6 md:p-7 my-auto">
          <div className="flex items-center gap-3 border-b border-slate-700/60 pb-4">
            <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0" />
            <div>
              <div className="text-[10px] font-mono-tabular uppercase tracking-[0.22em] text-rose-400">
                SORTIE FAILED · {f?.levelCode ?? f?.missionCode ?? hud.activeLevel?.code ?? hud.activeMission.code}
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-[0.1em] text-white mt-0.5">
                {failCopy.headline}
              </h1>
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-4 leading-relaxed">
            {f?.levelName ?? f?.missionTitle ?? hud.activeLevel?.name ?? hud.activeMission.title} failed in{' '}
            {f?.regionLabel ?? SPACE_REGIONS[hud.activeMission.spaceRegionId].label}. Campaign
            progress, Pilot XP, and hangar upgrades remain intact.
          </p>

          <div className="mt-4 px-3.5 py-2.5 border border-rose-500/45 bg-rose-950/35 text-xs font-mono-tabular text-rose-200 flex items-center justify-between gap-2">
            <span className="uppercase tracking-wider text-rose-300">CAUSE OF FAILURE</span>
            <span>{failCopy.causeLabel}</span>
          </div>

          <div className="mt-2.5 px-3.5 py-2 border border-slate-700/60 bg-[#080f1c] text-[11px] text-sky-200 leading-relaxed">
            Tactical Advisory: {failCopy.hint}
          </div>

          {f && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="avionics-panel p-2.5 text-center">
                <div className="text-[8.5px] font-mono-tabular uppercase text-slate-400">KILLS</div>
                <div className="font-mono-tabular text-lg font-bold text-white mt-0.5">
                  {f.spaceKills}
                </div>
              </div>
              <div className="avionics-panel p-2.5 text-center">
                <div className="text-[8.5px] font-mono-tabular uppercase text-slate-400">
                  SUBSYSTEMS
                </div>
                <div className="font-mono-tabular text-lg font-bold text-amber-300 mt-0.5">
                  {f.subsystemsDestroyed}
                </div>
              </div>
              <div className="avionics-panel p-2.5 text-center">
                <div className="text-[8.5px] font-mono-tabular uppercase text-slate-400">
                  HOSTILES LEFT
                </div>
                <div className="font-mono-tabular text-lg font-bold text-rose-300 mt-0.5">
                  {f.hostilesRemaining}
                </div>
              </div>
              <div className="avionics-panel p-2.5 text-center">
                <div className="text-[8.5px] font-mono-tabular uppercase text-slate-400">
                  TIME ALIVE
                </div>
                <div className="font-mono-tabular text-lg font-bold text-sky-300 mt-0.5">
                  {formatDuration(f.elapsedSec)}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <button
              type="button"
              data-testid="retry-mission-btn"
              onClick={onRetryMission}
              className="min-h-[44px] flex-1 px-5 py-2.5 bg-[#e6edf5] text-[#05080f] text-xs font-bold uppercase tracking-[0.16em] hover:bg-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Retry Level
            </button>
            <button
              type="button"
              onClick={onOpenHangar}
              className="min-h-[44px] px-4 py-2.5 avionics-panel text-xs font-mono-tabular uppercase tracking-[0.14em] text-slate-200 hover:border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              Fleet Hangar
            </button>
            <button
              type="button"
              onClick={onOpenWarMap}
              className="min-h-[44px] px-4 py-2.5 avionics-panel text-xs font-mono-tabular uppercase tracking-[0.14em] text-slate-200 hover:border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Map className="w-3.5 h-3.5" />
              Level Select
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
