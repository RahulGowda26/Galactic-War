import React, { useEffect, useRef, useState } from 'react';
import {
  AetherPrimeEngine,
  type EngineHudSnapshot,
} from './scene/AetherPrimeEngine';
import { TitleOverlay } from './components/TitleOverlay';
import { GameHud } from './components/GameHud';
import { CinematicOverlay } from './components/CinematicOverlay';
import { PauseModal } from './components/PauseModal';
import { StrategicCommandModal } from './components/StrategicCommandModal';
import { CampaignEndingOverlay } from './components/CampaignEndingOverlay';
import { MissionLifecycleOverlay } from './components/MissionLifecycleOverlay';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<AetherPrimeEngine | null>(null);
  const [hud, setHud] = useState<EngineHudSnapshot | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const initialAutoStart = params.get('autostart') === '1';
    const initialCinematic = params.get('cinematic') === '1';

    const engine = new AetherPrimeEngine({
      container,
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      initialAutoStart,
      initialCinematic,
    });
    engineRef.current = engine;
    (window as unknown as { __AETHER_ENGINE__?: AetherPrimeEngine }).__AETHER_ENGINE__ = engine;

    return () => {
      delete (window as unknown as { __AETHER_ENGINE__?: AetherPrimeEngine }).__AETHER_ENGINE__;
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!hud) return;
    document.body.dataset.state = hud.mode;
    document.body.dataset.inputMode = hud.deviceProfile.useTouchControls ? 'touch' : 'desktop';
    document.body.dataset.formFactor = hud.deviceProfile.formFactor;
  }, [hud]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#04070e]">
      {/* Fullscreen Three.js 80 km Space Theater Canvas */}
      <div ref={containerRef} className="w-full h-full touch-surface" />

      {/* Title Screen */}
      {hud && hud.mode === 'title' && (
        <TitleOverlay
          hud={hud}
          onContinueCampaign={() => engineRef.current?.continueCampaign()}
          onSelectCampaignTrack={(track) => engineRef.current?.setCampaignTrack(track)}
          onStartNewCampaign={() => engineRef.current?.startNewCampaign()}
          onOpenSpaceMap={() => engineRef.current?.openWarMap('map')}
          onOpenFleetHangar={() => engineRef.current?.openWarMap('hangar')}
          onWatchIntro={() => engineRef.current?.startCinematic()}
          onToggleMute={() => engineRef.current?.setMuted(!hud.muted)}
        />
      )}

      {/* Strategic Space Navigation Map & Fleet Hangar */}
      {hud && hud.mode === 'war_map' && (
        <StrategicCommandModal
          hud={hud}
          onChangeTab={(tab) => engineRef.current?.openWarMap(tab)}
          onCloseToCombat={() => engineRef.current?.closeWarMap()}
          onSelectCampaignTrack={(track) => engineRef.current?.setCampaignTrack(track)}
          onDeployMission={(missionId) => engineRef.current?.deployCampaignMission(missionId)}
          onDeployLevel={(levelId) => engineRef.current?.deployCampaignLevel(levelId)}
          onTravelRegion={(regionId) => engineRef.current?.travelSpaceRegion(regionId)}
          onSelectShipClass={(shipId) => engineRef.current?.selectShipClass(shipId)}
          onPurchaseUpgrade={(action) => engineRef.current?.purchaseUpgrade(action)}
          onPurchaseTradeOffModule={(moduleId) =>
            engineRef.current?.purchaseTradeOffModule(moduleId)
          }
          onToggleTradeOffModule={(moduleId) => engineRef.current?.toggleTradeOffModule(moduleId)}
          onChooseDecision={(decId, choiceId) =>
            engineRef.current?.chooseStrategicDecision(decId, choiceId)
          }
          onSelectCosmeticLivery={(cosmeticId) =>
            engineRef.current?.selectCosmeticLivery(cosmeticId)
          }
          onExchangeCreditsForHangarKit={() =>
            engineRef.current?.exchangeCreditsForHangarKit()
          }
        />
      )}

      {/* Orbital Introduction Cinematic */}
      {hud && hud.mode === 'cinematic' && (
        <CinematicOverlay
          cinematic={hud.cinematic}
          onSkip={() => engineRef.current?.skipCinematic()}
        />
      )}

      {/* Mission Lifecycle Screens: Transition, Debrief Results, Next Briefing, Failure & Retry */}
      {hud &&
        (hud.mode === 'mission_transition' ||
          hud.mode === 'mission_results' ||
          hud.mode === 'mission_briefing' ||
          hud.mode === 'mission_failed') && (
          <MissionLifecycleOverlay
            hud={hud}
            onSkipTransition={() => engineRef.current?.skipMissionTransition()}
            onContinueFromResults={() => engineRef.current?.continueFromMissionResults()}
            onReplayMission={() => engineRef.current?.replayLastMission()}
            onLaunchBriefedMission={() => engineRef.current?.launchBriefedMission()}
            onRetryMission={() => engineRef.current?.retryCurrentMission()}
            onOpenHangar={() => engineRef.current?.openWarMap('hangar')}
            onOpenWarMap={() => engineRef.current?.openWarMap('map')}
            onChooseDecision={(decId, choiceId) =>
              engineRef.current?.chooseStrategicDecision(decId, choiceId)
            }
          />
        )}

      {/* Space Warfare HUD + Automatic Mobile/Tablet Touch Controls */}
      {hud && hud.mode === 'space' && (
        <GameHud
          hud={hud}
          onToggleMute={() => engineRef.current?.setMuted(!hud.muted)}
          onTogglePause={() => engineRef.current?.togglePause()}
          onOpenWarMap={() => engineRef.current?.openWarMap('map')}
          onRespawnInOrbit={() => engineRef.current?.respawnInOrbit()}
          onTravelSpaceRegion={(regionId) => engineRef.current?.travelSpaceRegion(regionId)}
          onSelectSpaceWeapon={(weapon) => engineRef.current?.selectSpaceWeapon(weapon)}
          onCycleSpaceWeapon={() => engineRef.current?.cycleSpaceWeapon()}
          onCycleSpaceTarget={() => engineRef.current?.cycleSpaceTarget()}
          onFireMissile={() => engineRef.current?.fireMissile()}
          onTriggerCountermeasure={() => engineRef.current?.triggerCountermeasure()}
          onUseRepairKit={() => engineRef.current?.useRepairKit()}
          onToggleSupercruise={() => engineRef.current?.toggleSupercruise()}
          onToggleAutopilot={() => engineRef.current?.toggleAutopilot()}
          onToggleFlightAssist={() =>
            engineRef.current?.updateFlightSettings({
              flightAssist: !hud.flightSettings.flightAssist,
            })
          }
          onToggleSpaceCameraMode={() => engineRef.current?.toggleSpaceCameraMode()}
          onTouchJoystickChange={(x, y) => engineRef.current?.setTouchJoystick(x, y)}
          onTouchCameraLook={(dx, dy) => engineRef.current?.addTouchCameraLook(dx, dy)}
          onTouchPrimaryFireChange={(down) => engineRef.current?.setTouchPrimaryFire(down)}
          onTouchFlightButtonChange={(btn, down) =>
            engineRef.current?.setTouchFlightButton(btn, down)
          }
          onDismissPortraitHint={() => engineRef.current?.dismissPortraitHint()}
          onIssueWingmanCommand={(cmd) => engineRef.current?.issueWingmanCommand(cmd)}
          onSkipHyperspace={() => engineRef.current?.skipHyperspace()}
          onCycleEnemyInfoDisplayMode={() => engineRef.current?.cycleEnemyInfoDisplayMode()}
        />
      )}

      {/* Pause & Flight / Mobile Touch / Graphics Configuration Modal */}
      {hud && hud.mode === 'paused' && (
        <PauseModal
          hud={hud}
          onResume={() => engineRef.current?.togglePause()}
          onOpenWarMap={() => engineRef.current?.openWarMap('map')}
          onReturnToTitle={() => engineRef.current?.returnToTitle()}
          onTravelSpaceRegion={(regionId) => engineRef.current?.travelSpaceRegion(regionId)}
          onSetDifficulty={(diff) => engineRef.current?.setDifficulty(diff)}
          onSelectGraphicsPreset={(preset) => engineRef.current?.applyGraphicsPreset(preset)}
          onUpdateControlSettings={(partial) => engineRef.current?.updateControlSettings(partial)}
          onUpdateFlightSettings={(partial) => engineRef.current?.updateFlightSettings(partial)}
          onUpdateMobileSettings={(partial) => engineRef.current?.updateMobileSettings(partial)}
          onResetMobileSettings={() => engineRef.current?.resetMobileSettings()}
          onSetMasterVolume={(vol) => engineRef.current?.setMasterVolume(vol)}
          onSetWeaponVolume={(vol) => engineRef.current?.setWeaponVolume(vol)}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onTestFireWeapon={(w) => engineRef.current?.testFireWeaponAudio(w)}
        />
      )}

      {/* Definitive Campaign Ending */}
      {hud && hud.mode === 'ending' && (
        <CampaignEndingOverlay
          hud={hud}
          onStartNewCampaign={() => engineRef.current?.startNewCampaign()}
          onOpenWarMap={() => engineRef.current?.openWarMap('map')}
          onReturnToTitle={() => engineRef.current?.returnToTitle()}
        />
      )}
    </main>
  );
}
