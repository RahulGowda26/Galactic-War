import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  DEFAULT_CONTROL_SETTINGS,
  GRAPHICS_PRESETS,
  computeFpsStats,
  detectRenderCapabilities,
  type GraphicsPresetId,
  type PerformanceSnapshot,
  type PlayerControlSettings,
  type RenderCapabilities,
} from '../world/streamingManager';
import {
  DEFAULT_MOBILE_CONTROL_SETTINGS,
  detectBrowserDeviceProfile,
  loadMobileSettingsFromStorage,
  saveMobileSettingsToStorage,
  type DeviceProfile,
  type MobileControlSettings,
} from '../world/mobileControls';
import { TacticalCombatFeed, type CombatFeedEntry } from '../world/combatFeed';
import type { DifficultyId } from '../world/campaignConfig';
import {
  PLAYABLE_SHIPS,
  SPACE_REGIONS,
  type AsteroidSeverity,
  type CapitalSubsystemKey,
  type FlightControlSettings,
  type PlayableShipId,
  type SpaceRegionId,
  type SpaceWeaponId,
} from '../world/spacePhysics';
import {
  EXTINCTION_CAMPAIGN_OPERATION,
  EXTINCTION_LEVELS,
  getExtinctionLevelById,
  type CampaignTrackId,
} from '../world/extinctionCampaign';
import {
  MAIN_CAMPAIGN_MISSIONS,
  applyCampaignUpgrade,
  applyLevelCompletionWithSummary,
  applyMissionCompletionWithSummary,
  applyStrategicDecision,
  clearCampaignStorage,
  computeDecisionEffects,
  createInitialCampaignState,
  exchangeCreditsForHangarKit as applyCreditHangarExchange,
  getCampaignMissionById,
  getLastSaveLayerStatus,
  getMainMissionByNumber,
  hasCampaignProgression,
  hydrateCampaignFromAsyncStorage,
  loadCampaignFromStorage,
  purchaseTradeOffModule as applyTradeOffModulePurchase,
  saveCampaignToStorage,
  selectPilotCosmeticLivery as applyPilotCosmeticSelection,
  setActiveCampaignTrack,
  shipIdToChassisAlias,
  toggleTradeOffModule as applyTradeOffModuleToggle,
  type CampaignDecisionEffects,
  type CampaignMissionDef,
  type CampaignState,
  type MissionFailureCause,
  type MissionFailureSummary,
  type MissionRunSummary,
  type SpaceLoadout,
  type StrategicDecisionDef,
  type UpgradeActionType,
} from '../world/strategicCampaign';
import {
  getFirstLevelForOperation,
  getLevelById,
  type CampaignLevelDef,
} from '../world/campaignLevels';
import { COSMETIC_LIVERIES, PILOT_RANKS } from '../world/combatScoring';
import type { AimAssistMode } from '../world/ballistics';
import {
  createIdleHyperspaceState,
  startHyperspaceTransition,
  stepHyperspaceTransition,
  type CombatScenarioKind,
  type HyperspaceTransitionState,
  type TradeOffModuleId,
  type WingmanCommandId,
} from '../world/combatExpansion';
import { createProceduralTextures, type ProceduralTexturePack } from './textures';
import { createWorldMaterials, type WorldMaterialLibrary } from './materials';
import { buildExplosionSystem, type ExplosionSystem } from './explosionSystem';
import {
  buildValkyrieSpacecraft,
  type SpaceCameraMode,
  type ValkyrieSpacecraft,
} from './spacecraft';
import {
  buildSpaceCombatTheater,
  type SpaceCombatTheater,
  type SpaceHudSnapshot,
} from './spaceCombat';
import { BattlefieldAudioEngine } from './audioEngine';
import type { CinematicFrameState } from './cinematicDirector';
import {
  createInitialRailShakeState,
  createRailDistortionPulse,
  evaluateRailDistortionPulse,
  stepRailDistortionPulses,
  stepRailImpactShake,
  triggerRailImpactShake,
  type RailDistortionPulse,
  type RailImpactTargetClass,
  type RailShakeSample,
  type RailShakeState,
} from '../world/railImpactFx';
import {
  createRailDistortionBlitHelper,
  createRailDistortionShaderPass,
  syncRailDistortionPassUniforms,
  type RailDistortionBlitHelper,
  type RailDistortionSlotUniform,
} from './railImpactDistortion';
import {
  applyCameraShakeAccessibility,
  computeSpatialAudioParams,
  getCameraShakeMultiplier,
  getDistortionAccessibilityMultiplier,
  type CameraShakeMode,
} from '../world/weaponFeedback';
import {
  getEnemyInfoDisplayModeLabel,
  getNextEnemyInfoDisplayMode,
  type EnemyInfoDisplayMode,
} from '../world/targetHudLayout';
import {
  computeExplosionCameraShake,
  type DestructionClass,
} from '../world/shipDestruction';

export type EngineMode =
  | 'title'
  | 'war_map'
  | 'space'
  | 'cinematic'
  | 'mission_transition'
  | 'mission_results'
  | 'mission_briefing'
  | 'mission_failed'
  | 'paused'
  | 'ending';

export type WarMapTabId = 'map' | 'hangar';

export interface EngineHudSnapshot {
  mode: EngineMode;
  warMapTab: WarMapTabId;
  hasSavedCampaign: boolean;
  campaign: CampaignState;
  decisionEffects: CampaignDecisionEffects;
  activeMission: CampaignMissionDef;
  briefingMission: CampaignMissionDef;
  activeLevel: CampaignLevelDef | null;
  briefingLevel: CampaignLevelDef | null;
  lastMissionSummary: MissionRunSummary | null;
  lastMissionFailure: MissionFailureSummary | null;
  transitionProgress: number;
  deviceProfile: DeviceProfile;
  mobileSettings: MobileControlSettings;
  pointerLocked: boolean;
  cameraPos: [number, number, number];
  graphicsPreset: GraphicsPresetId;
  controlSettings: PlayerControlSettings;
  flightSettings: FlightControlSettings;
  muted: boolean;
  masterVolume: number;
  weaponVolume: number;
  capabilities: RenderCapabilities;
  performance: PerformanceSnapshot;
  cinematic: CinematicFrameState;
  hyperspace: HyperspaceTransitionState;
  space: SpaceHudSnapshot;
  combatFeed: CombatFeedEntry[];
  enemyInfoModeToast: string | null;
}

export interface AetherPrimeEngineOptions {
  container: HTMLElement;
  onHudUpdate: (snapshot: EngineHudSnapshot) => void;
  initialAutoStart?: boolean;
  initialCinematic?: boolean;
}

const ORBITAL_CINEMATIC_ACTS: Array<{
  title: string;
  caption: string;
  camStart: [number, number, number];
  camEnd: [number, number, number];
  lookAt: [number, number, number];
}> = [
  {
    title: 'ACT I — AETHER PRIME UNDER ORBITAL SIEGE',
    caption:
      'High above Crown City, the Sovereign’s invasion armada has shattered humanity’s outer perimeter. Commander Kael Voss launches with Vanguard Fleet.',
    camStart: [950, 4050, 2600],
    camEnd: [-650, 3820, 1450],
    lookAt: [0, 3250, -350],
  },
  {
    title: 'ACT II — THE SHATTERED FRONT',
    caption:
      'Eighteen kilometers out, torn Vanguard cruisers drift through the wreckage graveyard while distress beacons call for escort.',
    camStart: [15200, 4450, -9600],
    camEnd: [16450, 4250, -11800],
    lookAt: [16800, 4100, -11200],
  },
  {
    title: 'ACT III — THE OUTER FRONTIER & DEEP BELT',
    caption:
      'Across an 80-kilometer interstellar theater, dense silicate corridors and silent frontier moons conceal Sovereign listening arrays.',
    camStart: [-15600, 5200, -11200],
    camEnd: [-14400, 5850, -31200],
    lookAt: [-17500, 5900, -40000],
  },
  {
    title: 'ACT IV — THE SOVEREIGN’S DEFENCE ZONE',
    caption:
      'Beyond the obsidian bastion pylons waits Eternal Eclipse — The Sovereign’s colossal flagship. Prepare your fleet. End the war.',
    camStart: [13200, 5650, -35200],
    camEnd: [14850, 5580, -40800],
    lookAt: [14600, 5400, -43400],
  },
];

export class AetherPrimeEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: EngineHudSnapshot) => void;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmrem: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private railDistortionPass: ShaderPass | null = null;
  private railDistortionBlit: RailDistortionBlitHelper;

  // High-caliber Rail Cannon hull-plate impact procedural screen-shake & localized distortion state
  private railShakeState: RailShakeState = createInitialRailShakeState();
  private railDistortionPulses: RailDistortionPulse[] = [];
  private lastRailShakeSample: RailShakeSample = {
    active: false,
    intensity: 0,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    pitchRad: 0,
    yawRad: 0,
    rollRad: 0,
    fovPunchDeg: 0,
  };
  private lastRailImpactUv: [number, number] | null = null;
  private enemyInfoModeToast: string | null = null;
  private enemyInfoModeToastTimer = 0;
  private readonly tmpRailProj = new THREE.Vector3();
  private readonly tmpRailCamRight = new THREE.Vector3();
  private readonly tmpRailCamUp = new THREE.Vector3();
  private readonly tmpRailCamFwd = new THREE.Vector3();
  private readonly tmpRailSavedPos = new THREE.Vector3();
  private readonly tmpRailSavedQuat = new THREE.Quaternion();
  private readonly tmpRailEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly tmpRailKickQuat = new THREE.Quaternion();
  private readonly railSlot0: RailDistortionSlotUniform = {
    center: new THREE.Vector2(0.5, 0.5),
    params: new THREE.Vector4(0, 0.05, 0, 0),
  };
  private readonly railSlot1: RailDistortionSlotUniform = {
    center: new THREE.Vector2(0.5, 0.5),
    params: new THREE.Vector4(0, 0.05, 0, 0),
  };
  private readonly tmpSpatialRight = new THREE.Vector3();
  private readonly tmpSpatialFwd = new THREE.Vector3();

  private texPack: ProceduralTexturePack;
  private mats: WorldMaterialLibrary;
  private explosions: ExplosionSystem;
  private valkyrie: ValkyrieSpacecraft;
  private spaceCombat: SpaceCombatTheater;
  private audio: BattlefieldAudioEngine;
  private combatFeed: TacticalCombatFeed;

  private capabilities: RenderCapabilities;
  private mobileSettings: MobileControlSettings;
  private deviceProfile: DeviceProfile;
  private graphicsPreset: GraphicsPresetId;
  private controlSettings: PlayerControlSettings = { ...DEFAULT_CONTROL_SETTINGS };
  private mode: EngineMode = 'title';
  private prePauseMode: EngineMode = 'space';
  private returnModeAfterWarMap: EngineMode = 'space';
  private warMapTab: WarMapTabId = 'map';
  private hasSavedCampaign = false;
  private hasSessionMutation = false;
  private preferredSpaceViewMode: SpaceCameraMode = 'chase';
  private campaign: CampaignState;
  private activeMission: CampaignMissionDef;
  private briefingMission: CampaignMissionDef;
  private activeLevel: CampaignLevelDef | null = null;
  private briefingLevel: CampaignLevelDef | null = null;
  private lastMissionSummary: MissionRunSummary | null = null;
  private lastMissionFailure: MissionFailureSummary | null = null;
  private transitionTimer = 0;
  private readonly transitionDurationSec = 3.2;
  private pendingFailureDelay = 0;
  private hyperspace: HyperspaceTransitionState = createIdleHyperspaceState();
  private hyperspacePendingMission: CampaignMissionDef | null = null;
  private hyperspacePendingLevel: CampaignLevelDef | null = null;

  // Cinematic state
  private cinematicActive = false;
  private cinematicProgress = 0;
  private cinematicDurationSec = 18;
  private lastCinematicFrame: CinematicFrameState = {
    active: false,
    progress: 0,
    actIndex: 0,
    actTitle: '',
    caption: '',
    sovereignState: 'idle_authority',
  };

  // Pointer / Mouse state (desktop)
  private pointerLocked = false;
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Loop & performance
  private rafId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private elapsed = 0;
  private frameTimesMs: number[] = [];
  private resolutionScale = 1.0;
  private lastHudPush = 0;
  private lastAdaptiveCheck = 0;
  private debugCameraOverride = false;

  // Bound listeners
  private boundResize: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundContextMenu: (e: MouseEvent) => void;
  private boundPointerLockChange: () => void;
  private boundWindowBlur: () => void;
  private boundVisibilityChange: () => void;
  private boundPageHide: () => void;

  constructor(options: AetherPrimeEngineOptions) {
    this.container = options.container;
    this.onHudUpdate = options.onHudUpdate;
    this.capabilities = detectRenderCapabilities();

    // Load persisted mobile settings & detect device form factor + touch capability
    this.mobileSettings = loadMobileSettingsFromStorage();
    this.deviceProfile = detectBrowserDeviceProfile(this.mobileSettings.controlModeOverride);

    // Choose optimal default preset for detected device (mobile vs desktop vs software GL)
    if (this.capabilities.isSoftwareGl) {
      this.graphicsPreset = this.deviceProfile.useTouchControls ? 'mobile_low' : 'low';
    } else {
      this.graphicsPreset = this.deviceProfile.recommendedGraphicsPreset;
    }

    // Load saved Space Campaign from authoritative multi-layer storage or create a fresh one
    const loadedSave = loadCampaignFromStorage();
    this.hasSavedCampaign = loadedSave !== null;
    this.campaign = loadedSave ?? createInitialCampaignState('normal');
    const savedLevel = this.resolveCampaignLevelFromState(this.campaign);
    this.activeLevel = savedLevel;
    this.briefingLevel = savedLevel;
    this.activeMission =
      this.resolveMissionById(savedLevel?.operationId) ??
      getMainMissionByNumber(this.campaign.currentMissionNumber);
    this.briefingMission = this.activeMission;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.capabilities.isSoftwareGl && !this.deviceProfile.useTouchControls,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = false; // Space theater uses direct directional + IBL lighting for maximum FPS!
    this.renderer.setSize(
      Math.max(1, this.container.clientWidth),
      Math.max(1, this.container.clientHeight),
    );
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.setAttribute('data-testid', 'aether-prime-canvas');
    this.container.appendChild(this.renderer.domElement);

    // 2. Scene, PBR Environment IBL & 95 km Deep-Space Frustum
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03060d);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = this.pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.86;

    this.camera = new THREE.PerspectiveCamera(
      58,
      Math.max(1, this.container.clientWidth) / Math.max(1, this.container.clientHeight),
      0.6,
      98000,
    );

    const hemi = new THREE.HemisphereLight(0x6e95c8, 0x161f2e, 0.72);
    this.scene.add(hemi);

    // 3. Post-Processing + Localized Rail Impact Distortion (zero idle overhead on mobile & software GL)
    const initW = Math.max(1, this.container.clientWidth);
    const initH = Math.max(1, this.container.clientHeight);
    if (!this.capabilities.isSoftwareGl && !this.deviceProfile.useTouchControls) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(initW, initH), 0.18, 0.32, 0.94);
      this.composer.addPass(this.bloomPass);
      this.railDistortionPass = createRailDistortionShaderPass();
      this.composer.addPass(this.railDistortionPass);
      this.composer.addPass(new OutputPass());
    }
    this.railDistortionBlit = createRailDistortionBlitHelper(
      initW,
      initH,
      this.renderer.getPixelRatio(),
    );

    // 4. Audio Engine & Tactical Comms Feed
    this.audio = new BattlefieldAudioEngine();
    this.combatFeed = new TacticalCombatFeed(32);

    // 5. Textures, PBR Materials, Explosions, 5-Class Playable Spacecraft & 80 km Space Theater
    this.texPack = createProceduralTextures(
      Math.min(
        this.deviceProfile.useTouchControls ? 4 : 8,
        this.renderer.capabilities.getMaxAnisotropy(),
      ),
    );
    this.mats = createWorldMaterials(this.texPack);
    this.explosions = buildExplosionSystem(this.texPack);
    this.scene.add(this.explosions.group);

    this.valkyrie = buildValkyrieSpacecraft(this.mats);
    this.scene.add(this.valkyrie.root);

    this.spaceCombat = buildSpaceCombatTheater(this.mats, this.explosions, {
      onWeaponFire: (weapon, muzzlePan = 0) => {
        this.audio.playWeaponFire(weapon, muzzlePan);
      },
      onWeaponImpact: (impact) => {
        const spatial = this.computeSpatialAudio(impact.worldPos, impact.targetClass === 'capital' ? 3800 : 2400);
        this.audio.playWeaponImpact(
          impact.weapon,
          impact.isShield,
          spatial,
          impact.targetClass === 'capital' || impact.killed,
        );
      },
      onRailChargeTick: (ratio) => this.audio.playRailChargeTick(ratio),
      onEmptyOrdnance: () => this.audio.playEmptyClick(),
      onHitConfirm: (killed) => this.audio.playHitmarker(killed),
      onRailHullImpact: (impact) => {
        const shakeMode = this.spaceCombat.getFlightSettings().cameraShakeMode ?? 'full';
        if (getCameraShakeMultiplier(shakeMode) > 0) {
          this.railShakeState = triggerRailImpactShake(this.railShakeState, {
            distanceMeters: impact.distanceMeters,
            targetClass: impact.targetClass,
            directHull: impact.directHull,
            killed: impact.killed,
          });
        }
        if (getDistortionAccessibilityMultiplier(shakeMode) > 0) {
          const pulse = createRailDistortionPulse(
            { x: impact.worldPos.x, y: impact.worldPos.y, z: impact.worldPos.z },
            {
              distanceMeters: impact.distanceMeters,
              targetClass: impact.targetClass,
              directHull: impact.directHull,
              killed: impact.killed,
            },
          );
          this.railDistortionPulses = [...this.railDistortionPulses.slice(-1), pulse];
        }
      },
      onShieldHit: () => this.audio.playShieldImpact(),
      onHullHit: () => this.audio.playHullImpact(),
      onCapitalFire: (worldPos) => {
        const spatial = worldPos ? this.computeSpatialAudio(worldPos, 3200) : undefined;
        this.audio.playCapitalCannon(spatial);
      },
      onMissileLaunch: (muzzlePan = 0) => this.audio.playMissileLaunch(muzzlePan),
      onMissileLock: () => this.audio.playMissileLockBeep(),
      onEnemyDestroyed: (enemyName, worldPos) => {
        const spatial = worldPos ? this.computeSpatialAudio(worldPos, 2800) : undefined;
        this.audio.playSpaceExplosion(spatial, 1.0);
        this.combatFeed.push(
          this.elapsed,
          'KILL',
          `Target Neutralized — ${enemyName}`,
          'combat',
        );
      },
      onRegionEntered: (regionId) => {
        const reg = SPACE_REGIONS[regionId];
        if (!this.campaign.discoveredRegions.includes(regionId)) {
          this.campaign = {
            ...this.campaign,
            discoveredRegions: [...this.campaign.discoveredRegions, regionId],
          };
          this.persistCampaign();
        }
        this.combatFeed.push(
          this.elapsed,
          reg.code,
          `Entered ${reg.label} — ${reg.hazardLevel}`,
          'info',
        );
      },
      onIncomingMissile: () => {
        this.audio.playMissileLockBeep();
        this.combatFeed.push(
          this.elapsed,
          'WARNING',
          'Incoming Hostile Missile Lock — Deploy Countermeasures [R]',
          'critical',
        );
      },
      onPlayerShipDamaged: (destroyed) => {
        this.audio.playPlayerHit();
        if (destroyed) {
          this.audio.playSpaceExplosion();
          this.combatFeed.push(
            this.elapsed,
            'HULL BREACH',
            `${PLAYABLE_SHIPS[this.campaign.spaceLoadout.selectedShipId].name} Critical — Redeploying`,
            'critical',
          );
        }
      },
      onAsteroidCollision: (severity, hitZone, destroyed) => {
        this.audio.playAsteroidCollision(severity === 'severe');
        this.combatFeed.push(
          this.elapsed,
          severity === 'severe' ? 'COLLISION' : 'IMPACT',
          destroyed
            ? `Catastrophic Asteroid Impact (${hitZone.toUpperCase()})`
            : `${severity.toUpperCase()} Asteroid Impact on ${hitZone.toUpperCase()} — Nanite Repair [H]`,
          severity === 'severe' || destroyed ? 'critical' : 'warning',
        );
      },
      onShipRepaired: (source) => {
        this.audio.playShipRepair();
        this.combatFeed.push(
          this.elapsed,
          'REPAIRED',
          source === 'beacon'
            ? 'Orbital Repair Beacon — Hull, Engines & Countermeasures Restored'
            : 'Emergency Nanite Repair Deployed — Subsystems Stabilized',
          'info',
        );
      },
      onSubsystemDestroyed: (shipName, sub, worldPos) => {
        const spatial = worldPos ? this.computeSpatialAudio(worldPos, 3600) : undefined;
        this.audio.playSpaceExplosion(spatial, 1.8);
        this.combatFeed.push(
          this.elapsed,
          'SUBSYSTEM',
          `${shipName} — ${sub.toUpperCase()} Destroyed!`,
          'combat',
        );
      },
      onCapitalShipDestroyed: (shipName, worldPos) => {
        const spatial = worldPos ? this.computeSpatialAudio(worldPos, 4500) : undefined;
        this.audio.playSpaceExplosion(spatial, 2.5);
        this.audio.playSovereignHorn();
        this.combatFeed.push(
          this.elapsed,
          'CAPITAL KILL',
          `${shipName} Destroyed! Sovereign Armada Reel!`,
          'critical',
        );
      },
      onCriticalCountdownBeep: (digit) => {
        this.audio.playCriticalCountdownBeep(digit);
        this.combatFeed.push(
          this.elapsed,
          'CRITICAL COUNTDOWN',
          `CAPITAL REACTOR DETONATION IN ${digit}s — CLEAR BLAST RADIUS (620m)!`,
          'critical',
        );
      },
      onShipDestructionStage: (evt) => {
        const spatial = this.computeSpatialAudio(
          evt.pos,
          evt.destructionClass === 'capital' ? 4800 : 2800,
        );
        this.audio.playShipDestruction(evt.destructionClass, evt.isSecondary, evt.kind, spatial);
        const shakeMode = this.spaceCombat.getFlightSettings().cameraShakeMode ?? 'full';
        const shakeAmp = computeExplosionCameraShake({
          destructionClass: evt.destructionClass,
          distanceMeters: evt.distanceMeters,
          shakeMode,
          isSecondary: evt.isSecondary,
        });
        if (shakeAmp > 0.005) {
          this.valkyrie.addCameraShake(shakeAmp);
        }
      },
      onCountermeasure: () => this.audio.playFlareDeploy(),
      onMissionFailed: (failure) => {
        if (this.mode !== 'space') return;
        const shipDef = PLAYABLE_SHIPS[this.campaign.spaceLoadout.selectedShipId];
        const reg = SPACE_REGIONS[this.spaceCombat.getCurrentRegionId()];
        this.lastMissionFailure = {
          missionId: this.activeMission.id,
          missionCode: this.activeLevel ? this.activeLevel.code : this.activeMission.code,
          missionTitle: this.activeLevel ? this.activeLevel.name : this.activeMission.title,
          levelId: this.activeLevel?.id,
          levelCode: this.activeLevel?.code,
          levelName: this.activeLevel?.name,
          regionLabel: reg.label,
          shipName: shipDef.name,
          elapsedSec: Math.round(failure.elapsedSec),
          spaceKills: failure.spaceKills,
          subsystemsDestroyed: failure.subsystemsDestroyed,
          hostilesRemaining: failure.hostilesRemaining,
          cause: failure.cause,
        };
        this.pendingFailureDelay = 0.72;
        this.clearAllInputs();
        this.audio.playMissionDefeat();
        this.pushHudSnapshot(true);
      },
      onMissionComplete: (
        missionId,
        spaceKills,
        subsystemsDestroyed,
        capitalShipsDestroyed,
        distanceTraveledKm,
        extraStats,
      ) => {
        if (
          this.mode === 'mission_transition' ||
          this.mode === 'mission_results' ||
          this.mode === 'ending'
        ) {
          return;
        }
        this.audio.playMissionVictory();
        const completedLevelId = extraStats?.levelId ?? this.activeLevel?.id ?? null;
        this.recordCampaignMissionComplete(missionId || this.activeMission.id, {
          spaceKills,
          subsystemsDestroyed,
          capitalShipsDestroyed,
          distanceTraveledKm,
          elapsedSec: extraStats?.elapsedSec,
          shotsFired: extraStats?.shotsFired,
          shotsHit: extraStats?.shotsHit,
          hullRemainingPct: extraStats?.hullRemainingPct,
          levelId: completedLevelId,
          combatScore: extraStats?.combatScore,
          maxCombo: extraStats?.maxCombo,
          protectedHpPct: extraStats?.protectedHpPct,
          repairKitsUsed: extraStats?.repairKitsUsed,
          nearMissCount: extraStats?.nearMissCount,
          missilesEvaded: extraStats?.missilesEvaded,
          legendaryDefeated: extraStats?.legendaryDefeated,
        });
        if (extraStats?.wingmenDisabled && extraStats.wingmenDisabled > 0) {
          this.campaign = {
            ...this.campaign,
            stats: {
              ...this.campaign.stats,
              wingmenDisabledTotal:
                (this.campaign.stats.wingmenDisabledTotal ?? 0) + extraStats.wingmenDisabled,
            },
          };
          this.persistCampaign();
        }
        const clearedTitle = this.activeLevel
          ? `${this.activeLevel.code} ${this.activeLevel.name}`
          : this.activeMission.title;
        this.combatFeed.push(
          this.elapsed,
          'LEVEL CLEAR',
          `${clearedTitle} Cleared — Tactical Extraction Engaged`,
          'combat',
        );
        this.exitPointerLock();
        this.clearAllInputs();
        this.pendingFailureDelay = 0;
        this.transitionTimer = 0;
        this.debugCameraOverride = false;
        this.mode = 'mission_transition';
        this.pushHudSnapshot(true);
      },
      onWingmanComms: (message) => {
        this.audio.playWingmanCommandAck();
        this.combatFeed.push(this.elapsed, 'WINGMAN', message, 'info');
      },
      onReinforcementEvent: (banner) => {
        this.audio.playMissileLockBeep();
        this.combatFeed.push(this.elapsed, 'REINFORCE', banner, 'warning');
      },
      onLegendaryPilotEvent: (kind, pilot) => {
        if (kind === 'intro') {
          this.audio.playLegendaryAceIntro();
          this.combatFeed.push(this.elapsed, pilot.callsign, pilot.introTransmission, 'critical');
        } else if (kind === 'phase2') {
          this.audio.playLegendaryAceIntro();
          this.combatFeed.push(this.elapsed, pilot.callsign, pilot.phase2Transmission, 'warning');
        } else if (kind === 'defeated') {
          this.audio.playSpaceExplosion(undefined, 1.6);
          this.campaign = {
            ...this.campaign,
            resources: {
              ...this.campaign.resources,
              salvage: this.campaign.resources.salvage + pilot.bonusSalvage,
            },
            stats: {
              ...this.campaign.stats,
              legendaryPilotsDefeated: (this.campaign.stats.legendaryPilotsDefeated ?? 0) + 1,
            },
          };
          this.persistCampaign();
          this.combatFeed.push(
            this.elapsed,
            'ACE DOWN',
            `${pilot.defeatTransmission} (+${pilot.bonusSalvage} Salvage)`,
            'combat',
          );
        }
      },
      onMissionMoment: (event) => {
        if (event.effectKind === 'capital_emergence' || event.effectKind === 'flagship_overload') {
          this.audio.playSovereignHorn();
        } else if (event.effectKind === 'asteroid_fracture') {
          this.audio.playSpaceExplosion(undefined, 1.7);
        }
        this.combatFeed.push(this.elapsed, 'EVENT', event.commsMessage, 'warning');
      },
      onCriticalDamageAlert: () => {
        this.audio.playCriticalDamageAlert();
      },
      onExtinctionAudioCue: (kind) => {
        this.audio.playExtinctionCue(kind);
      },
      onStageOrBossBanner: (headline, tone) => {
        this.combatFeed.push(this.elapsed, 'EXTINCTION', headline, tone);
      },
    });
    this.scene.add(this.spaceCombat.root);

    // Sync initial campaign ship loadout, difficulty & mobile flight settings
    this.syncLoadoutsToSubsystems();
    this.spaceCombat.setCampaignDifficulty(this.campaign.difficulty);
    this.syncMobileSettingsToFlight();
    this.applyGraphicsPreset(this.graphicsPreset);

    // Position starfighter nicely in Sector I for dramatic live Orbital Title viewport
    this.valkyrie.root.position.set(0, 3660, 1850);
    this.valkyrie.root.quaternion.setFromEuler(new THREE.Euler(-0.04, 0.25, 0.08));

    if (options.initialCinematic) {
      this.startCinematic();
    } else if (options.initialAutoStart) {
      if (this.activeLevel) {
        this.deployCampaignLevel(this.activeLevel.id);
      } else {
        this.deployCampaignMission(this.activeMission.id);
      }
    } else {
      this.mode = 'title';
      this.valkyrie.setExteriorShowcaseOverride(true);
    }

    // Asynchronously hydrate from durable IndexedDB if it holds a strictly fresher save
    // (recovers full progress across browser restarts even when localStorage is partitioned/cleared)
    void hydrateCampaignFromAsyncStorage(loadedSave).then((recovered) => {
      if (this.disposed || !recovered || this.hasSessionMutation) return;
      this.campaign = recovered;
      this.hasSavedCampaign = true;
      const hydratedLevel = this.resolveCampaignLevelFromState(this.campaign);
      this.activeLevel = hydratedLevel;
      this.briefingLevel = hydratedLevel;
      this.activeMission =
        this.resolveMissionById(hydratedLevel?.operationId) ??
        getMainMissionByNumber(this.campaign.currentMissionNumber);
      this.briefingMission = this.activeMission;
      this.syncLoadoutsToSubsystems();
      this.spaceCombat.setCampaignDifficulty(this.campaign.difficulty);
      this.renderOneFrame();
      this.pushHudSnapshot(true);
    });

    // 6. Bind Window & Input Events (with strict stuck-input cleanup & unload save flush!)
    this.boundResize = this.handleResize.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundContextMenu = (e: MouseEvent) => e.preventDefault();
    this.boundPointerLockChange = this.handlePointerLockChange.bind(this);
    this.boundWindowBlur = this.clearAllInputs.bind(this);
    this.boundVisibilityChange = () => {
      if (document.hidden) {
        this.clearAllInputs();
        this.flushCampaignBeforeUnload();
      }
    };
    this.boundPageHide = () => {
      this.flushCampaignBeforeUnload();
    };

    window.addEventListener('resize', this.boundResize);
    window.addEventListener('orientationchange', this.boundResize);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundWindowBlur);
    window.addEventListener('pagehide', this.boundPageHide);
    window.addEventListener('beforeunload', this.boundPageHide);
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('pointercancel', this.boundPointerUp);
    el.addEventListener('contextmenu', this.boundContextMenu);

    // Deterministic verification hook for automated visual & mobile/desktop tests
    (window as unknown as Record<string, unknown>).__aetherDebug = {
      setMode: (m: EngineMode) => {
        this.debugCameraOverride = false;
        if (m === 'space') this.enterSpaceCombatDirect();
        else if (m === 'war_map') this.openWarMap('map');
        else if (m === 'cinematic') this.startCinematic();
        else if (m === 'title') this.returnToTitle();
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      openWarMap: (tab: WarMapTabId = 'map') => {
        this.debugCameraOverride = false;
        this.openWarMap(tab);
        this.renderOneFrame();
      },
      deployMission: (missionId: string) => {
        this.debugCameraOverride = false;
        this.deployCampaignMission(missionId);
        this.spaceCombat.update(0.05, this.elapsed + 0.1, this.valkyrie, this.camera, true);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      deployLevel: (levelId: string) => {
        this.debugCameraOverride = false;
        this.deployCampaignLevel(levelId);
        this.spaceCombat.update(0.05, this.elapsed + 0.1, this.valkyrie, this.camera, true);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      runLiveBallisticsCheck: (opts: {
        weapon: SpaceWeaponId;
        targetDistanceMeters: number;
        targetLateralSpeed?: number;
        aimOffsetDeg?: number;
        withLock?: boolean;
        maxSimSec?: number;
      }) => {
        this.debugCameraOverride = false;
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        const res = this.spaceCombat.runLiveBallisticsCheck(this.valkyrie, this.camera, opts);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
        return res;
      },
      setAimAssistMode: (mode: AimAssistMode) => {
        this.updateFlightSettings({ aimAssistMode: mode, gentleAimAssist: mode !== 'off' });
        this.renderOneFrame();
      },
      selectCosmeticLivery: (cosmeticId: string) => this.selectCosmeticLivery(cosmeticId),
      exchangeCreditsForHangarKit: () => this.exchangeCreditsForHangarKit(),
      travelSpaceRegion: (regionId: SpaceRegionId, withHyperspace = false) => {
        this.debugCameraOverride = false;
        this.travelSpaceRegion(regionId, !withHyperspace);
        if (!withHyperspace) {
          this.spaceCombat.update(0.05, this.elapsed + 0.15, this.valkyrie, this.camera, true);
        }
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      selectShipClass: (shipId: PlayableShipId) => {
        this.selectShipClass(shipId, true);
        this.valkyrie.updateVisuals(0.016, this.elapsed, 0, 0);
        if (!this.debugCameraOverride) {
          this.valkyrie.updateCamera(this.camera, 0.016, false, false, undefined, true);
        }
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      selectSpaceWeapon: (w: SpaceWeaponId) => {
        this.selectSpaceWeapon(w);
        this.renderOneFrame();
      },
      setSpaceView: (mode: SpaceCameraMode) => {
        this.debugCameraOverride = false;
        this.setSpaceCameraMode(mode);
        this.valkyrie.updateVisuals(0.016, this.elapsed, 0, 0);
        this.valkyrie.updateCamera(this.camera, 0.016, false, false, undefined, true);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      toggleSupercruise: () => {
        this.debugCameraOverride = false;
        this.toggleSupercruise();
        for (let i = 0; i < 8; i++) {
          this.spaceCombat.update(0.05, this.elapsed + i * 0.05, this.valkyrie, this.camera, true);
        }
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      fireSpaceVolley: () => {
        this.debugCameraOverride = false;
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.spaceCombat.fireDebugVolley(this.valkyrie);
        this.spaceCombat.update(0.05, this.elapsed + 0.1, this.valkyrie, this.camera, true);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      triggerRailHullImpact: (
        targetClass: RailImpactTargetClass = 'medium',
        advanceSec = 0.085,
      ) => {
        this.debugCameraOverride = false;
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        const ok = this.spaceCombat.triggerDebugRailHullImpact(
          this.camera,
          this.valkyrie,
          targetClass,
        );
        if (ok) {
          this.explosions.update(Math.max(0.02, advanceSec));
          this.stepRailImpactFx(Math.max(0.016, advanceSec));
          this.renderOneFrame();
          this.pushHudSnapshot(true);
        }
        return {
          ok,
          shake: { ...this.lastRailShakeSample },
          activeDistortions: this.railDistortionPulses.length,
          lastImpactUv: this.lastRailImpactUv,
        };
      },
      getRailImpactFxState: () => ({
        shake: { ...this.lastRailShakeSample },
        activeDistortions: this.railDistortionPulses.length,
        lastImpactUv: this.lastRailImpactUv,
        cameraShakeMode: this.spaceCombat.getFlightSettings().cameraShakeMode ?? 'full',
      }),
      setCameraShakeMode: (mode: CameraShakeMode) => {
        this.updateFlightSettings({ cameraShakeMode: mode });
        this.renderOneFrame();
      },
      getAudioDiagnostics: () => this.audio.getDiagnostics(),
      triggerWeaponImpactTest: (
        weapon: SpaceWeaponId,
        targetClass: RailImpactTargetClass = 'fighter',
      ) => {
        this.debugCameraOverride = false;
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.audio.unlock();
        const ok = this.spaceCombat.triggerDebugWeaponImpact(
          this.camera,
          this.valkyrie,
          weapon,
          targetClass,
        );
        if (ok) {
          this.explosions.update(0.08);
          this.stepRailImpactFx(0.06);
          this.renderOneFrame();
          this.pushHudSnapshot(true);
        }
        return {
          ok,
          weapon,
          audio: this.audio.getDiagnostics(),
          shake: { ...this.lastRailShakeSample },
        };
      },
      destroySubsystem: (key: CapitalSubsystemKey) => {
        this.spaceCombat.destroyDebugSubsystem(key);
        if (!this.debugCameraOverride) {
          this.spaceCombat.update(0.05, this.elapsed + 0.1, this.valkyrie, this.camera, true);
        }
        this.explosions.update(0.12);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      triggerAsteroidCollision: (severity: AsteroidSeverity = 'severe') => {
        this.debugCameraOverride = false;
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.spaceCombat.triggerDebugAsteroidCollision(this.valkyrie, severity);
        this.spaceCombat.update(0.08, this.elapsed + 0.12, this.valkyrie, this.camera, true);
        this.explosions.update(0.12);
        this.valkyrie.updateVisuals(0.08, this.elapsed + 0.12, 0.2, 0.4);
        this.valkyrie.updateCamera(this.camera, 0.6, false, false);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      inspectPlayerShip: (
        angle: 'front' | 'side' | 'rear' | 'three_quarter' | 'boost_rear' = 'three_quarter',
      ) => {
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.debugCameraOverride = true;
        this.spaceCombat.inspectPlayerShip(this.camera, this.valkyrie, angle);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      inspectBoostExhaust: () => {
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.debugCameraOverride = true;
        this.spaceCombat.inspectPlayerShip(this.camera, this.valkyrie, 'boost_rear');
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      inspectEnemyClass: (cls: 'capital' | 'medium' | 'fighter') => {
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.debugCameraOverride = true;
        const ok = this.spaceCombat.inspectEnemyClass(this.camera, this.valkyrie, cls);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
        return ok;
      },
      inspectOpenDeepSpace: () => {
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.debugCameraOverride = true;
        this.spaceCombat.inspectOpenDeepSpace(this.camera, this.valkyrie);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      inspectAsteroidCloseUp: () => {
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.debugCameraOverride = true;
        this.spaceCombat.inspectAsteroidCloseUp(this.camera, this.valkyrie);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      inspectAsteroidCombat: () => {
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.debugCameraOverride = false;
        this.spaceCombat.inspectAsteroidCombat(this.camera, this.valkyrie);
        this.explosions.update(0.08);
        this.spaceCombat.update(0.02, this.elapsed + 0.02, this.valkyrie, this.camera, true);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      focusAsteroidBelt: () => {
        this.debugCameraOverride = false;
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.spaceCombat.focusAsteroidBelt(this.camera, this.valkyrie);
        this.spaceCombat.update(0.04, this.elapsed + 0.04, this.valkyrie, this.camera, true);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      damageTargetedEnemy: (amount = 110) => {
        const res = this.spaceCombat.damageTargetedEnemy(amount);
        this.explosions.update(0.06);
        if (!this.debugCameraOverride) {
          this.spaceCombat.update(0.02, this.elapsed + 0.02, this.valkyrie, this.camera, true);
        }
        this.renderOneFrame();
        this.pushHudSnapshot(true);
        return res;
      },
      clearDebugCamera: () => {
        this.debugCameraOverride = false;
        this.valkyrie.updateCamera(this.camera, 0.016, false, false, undefined, true);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      setTopDownOverview: (theaterWide = false) => {
        this.debugCameraOverride = true;
        this.spaceCombat.setTopDownOverviewCamera(this.camera, theaterWide);
        this.renderOneFrame();
      },
      stepFlightFrames: (steps = 10) => {
        this.debugCameraOverride = false;
        for (let i = 0; i < steps; i++) {
          this.elapsed += 0.04;
          this.spaceCombat.update(0.04, this.elapsed, this.valkyrie, this.camera, true);
          this.explosions.update(0.04);
          this.stepRailImpactFx(0.04);
        }
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      completeCurrentMission: () => {
        this.completeActiveMission();
        this.renderOneFrame();
      },
      skipMissionTransition: () => {
        this.skipMissionTransition();
        this.renderOneFrame();
      },
      triggerMissionFailure: (cause: MissionFailureCause = 'enemy_fire') => {
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.spaceCombat.triggerDebugPlayerDestruction(this.valkyrie, cause);
        this.pendingFailureDelay = 0;
        this.exitPointerLock();
        this.clearAllInputs();
        this.mode = 'mission_failed';
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      triggerDecision: (decisionId: StrategicDecisionDef['id']) => {
        this.campaign = { ...this.campaign, pendingDecisionId: decisionId };
        this.openWarMap('map');
        this.renderOneFrame();
      },
      triggerEnding: () => {
        this.campaign = {
          ...this.campaign,
          completedMainMissions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          completedOptionalIds: ['opt_salvage_run', 'opt_intercept_relay'],
          resources: { salvage: 640, supplies: 240, intel: 175, fleetReadiness: 88 },
          decisions: {
            dec_fleet_vs_platform: 'save_allied_fleet',
            dec_rescue_vs_supply: 'rescue_stranded_pilots',
            dec_comms_vs_carrier: 'protect_allied_carrier',
          },
          stats: {
            ...this.campaign.stats,
            totalSpaceKills: 86,
            capitalSubsystemsDestroyed: 14,
            capitalShipsDestroyed: 5,
            distanceTraveledKm: 64.8,
            missionsCompletedCount: 12,
            optionalOpsCompletedCount: 2,
            decisionsMadeCount: 3,
          },
          campaignCompleted: true,
        };
        this.openCampaignEnding();
        this.renderOneFrame();
      },
      updateMobileSettings: (partial: Partial<MobileControlSettings>) => {
        this.updateMobileSettings(partial);
        this.renderOneFrame();
      },
      stageTargetHudScenario: (
        scenario:
          | 'distant_fighter'
          | 'nearby_fighter'
          | 'formation'
          | 'elite_ace'
          | 'medium_warship'
          | 'capital_ship'
          | 'overlapping_cluster'
          | 'fast_crossing'
          | 'behind_asteroid',
      ) => {
        this.debugCameraOverride = false;
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.syncHudViewportToSpaceCombat();
        const ok = this.spaceCombat.stageTargetHudScenario(this.camera, this.valkyrie, scenario);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
        return ok;
      },
      togglePause: () => {
        this.togglePause();
        this.renderOneFrame();
      },
      issueWingmanCommand: (cmd: WingmanCommandId) => {
        this.issueWingmanCommand(cmd);
        this.renderOneFrame();
      },
      triggerHyperspace: (regionId: SpaceRegionId) => {
        this.startHyperspaceJump(regionId);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      skipHyperspace: () => {
        this.skipHyperspace();
        this.renderOneFrame();
      },
      stageCombatScenario: (scenario: CombatScenarioKind) => {
        this.debugCameraOverride = false;
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        const ok = this.spaceCombat.stageCombatScenario(this.camera, this.valkyrie, scenario);
        this.valkyrie.updateCamera(this.camera, 0.016, false, false, undefined, true);
        this.spaceCombat.update(0.03, this.elapsed + 0.03, this.valkyrie, this.camera, true);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
        return ok;
      },
      purchaseTradeOffModule: (moduleId: TradeOffModuleId) => this.purchaseTradeOffModule(moduleId),
      toggleTradeOffModule: (moduleId: TradeOffModuleId) => this.toggleTradeOffModule(moduleId),
      grantCampaignResources: (salvage = 500, supplies = 200, intel = 150) => {
        this.campaign = {
          ...this.campaign,
          resources: {
            ...this.campaign.resources,
            salvage: this.campaign.resources.salvage + salvage,
            supplies: this.campaign.resources.supplies + supplies,
            intel: this.campaign.resources.intel + intel,
          },
        };
        this.persistCampaign();
        this.pushHudSnapshot(true);
      },
      setEnemyInfoDisplayMode: (mode: EnemyInfoDisplayMode, showBanner = true) => {
        this.setEnemyInfoDisplayMode(mode, showBanner);
        this.spaceCombat.update(0.02, this.elapsed + 0.02, this.valkyrie, this.camera, true);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
      },
      cycleEnemyInfoDisplayMode: () => {
        this.cycleEnemyInfoDisplayMode();
        this.spaceCombat.update(0.02, this.elapsed + 0.02, this.valkyrie, this.camera, true);
        this.renderOneFrame();
        this.pushHudSnapshot(true);
        return this.spaceCombat.getFlightSettings().enemyInfoDisplayMode;
      },
      triggerShipDestructionTest: (
        destructionClass: DestructionClass = 'fighter',
        advanceSec = 0.28,
      ) => {
        this.debugCameraOverride = false;
        if (this.mode !== 'space') this.enterSpaceCombatDirect();
        this.audio.unlock();
        const ok = this.spaceCombat.triggerDebugShipDestruction(
          this.camera,
          this.valkyrie,
          destructionClass,
        );
        if (ok) {
          const steps = Math.max(1, Math.ceil(advanceSec / 0.04));
          const stepDt = advanceSec / steps;
          for (let i = 0; i < steps; i++) {
            this.explosions.update(stepDt);
          }
          this.valkyrie.updateCamera(this.camera, 0.016, false, false, undefined, true);
          this.renderOneFrame();
          this.pushHudSnapshot(true);
        }
        return {
          ok,
          destructionClass,
          diagnostics: this.explosions.getDiagnostics(),
          audio: this.audio.getDiagnostics(),
        };
      },
      advanceExplosions: (seconds = 1.0) => {
        const steps = Math.max(1, Math.ceil(seconds / 0.05));
        const stepDt = seconds / steps;
        for (let i = 0; i < steps; i++) {
          this.explosions.update(stepDt);
        }
        this.renderOneFrame();
        return this.explosions.getDiagnostics();
      },
      getExplosionDiagnostics: () => this.explosions.getDiagnostics(),
      getCombatDiagnostics: () => this.spaceCombat.getCombatDiagnostics(),
      getEncounterDiagnostics: () => this.spaceCombat.getEncounterDiagnostics(),
      getPersistenceDiagnostics: () => ({
        hasSavedCampaign: this.hasSavedCampaign,
        saveRevision: this.campaign.saveRevision ?? 0,
        savedAtIso: this.campaign.savedAtIso,
        layerStatus: getLastSaveLayerStatus(),
        activeCampaignTrack: this.campaign.activeCampaignTrack ?? 'original',
        completedLevelIds: this.campaign.completedLevelIds,
        unlockedLevelIds: this.campaign.unlockedLevelIds,
        currentLevelId: this.campaign.currentLevelId,
        extinctionState: this.campaign.extinctionState,
        pilotProgress: this.campaign.pilotProgress,
      }),
      getSnapshot: () => this.buildHudSnapshot(),
    };

    this.syncHudViewportToSpaceCombat();
    this.pushHudSnapshot(true);
    this.animate();
  }

  // =========================================================================
  // CAMPAIGN, LOADOUT & SHIP MANAGEMENT
  // =========================================================================
  private persistCampaign(): void {
    this.hasSessionMutation = true;
    const saved = saveCampaignToStorage(this.campaign);
    this.hasSavedCampaign = saved || hasCampaignProgression(this.campaign);
  }

  private flushCampaignBeforeUnload(): void {
    if (this.hasSessionMutation || hasCampaignProgression(this.campaign)) {
      saveCampaignToStorage(this.campaign);
    }
  }

  private applyActiveCosmeticLivery(): void {
    const selectedId = this.campaign.pilotProgress?.activeCosmeticId ?? 'vanguard_standard';
    const livery = COSMETIC_LIVERIES.find((c) => c.id === selectedId) ?? null;
    this.valkyrie.setCosmeticLivery(livery);
  }

  private syncLoadoutsToSubsystems(): void {
    const effects = computeDecisionEffects(this.campaign);
    const rankIdx = this.campaign.pilotProgress?.rankIndex ?? 0;
    let rankMissileBonus = 0;
    let wingmanBonusPct = 0;
    for (const rank of PILOT_RANKS) {
      if (rank.rankIndex <= rankIdx) {
        if (rank.bonusMissileCapacity) rankMissileBonus += rank.bonusMissileCapacity;
        if (rank.wingmanEffectivenessBonusPct) {
          wingmanBonusPct = Math.max(wingmanBonusPct, rank.wingmanEffectivenessBonusPct);
        }
      }
    }
    const effectiveLoadout: SpaceLoadout =
      rankMissileBonus > 0
        ? {
            ...this.campaign.spaceLoadout,
            missileCapacity: this.campaign.spaceLoadout.missileCapacity + rankMissileBonus,
          }
        : this.campaign.spaceLoadout;
    this.spaceCombat.applySpaceLoadout(effectiveLoadout, effects, this.valkyrie, wingmanBonusPct);
    this.applyActiveCosmeticLivery();
  }

  private computeSpatialAudio(worldPos: THREE.Vector3, maxRangeMeters = 2600) {
    this.tmpSpatialRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion).normalize();
    this.tmpSpatialFwd.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    return computeSpatialAudioParams(
      this.camera.position,
      this.tmpSpatialRight,
      this.tmpSpatialFwd,
      worldPos,
      maxRangeMeters,
    );
  }

  private syncMobileSettingsToFlight(): void {
    const cur = this.spaceCombat.getFlightSettings();
    const shakeMode = this.mobileSettings.cameraShakeMode ?? 'full';
    const enemyInfoDisplayMode = this.mobileSettings.enemyInfoDisplayMode ?? 'full';
    const enemyInfoToggleKey = this.mobileSettings.enemyInfoToggleKey ?? 'F5';
    const aimAssistMode: AimAssistMode =
      this.mobileSettings.aimAssistMode ?? (this.mobileSettings.gentleAimAssist ? 'subtle' : 'off');
    this.spaceCombat.setFlightSettings({
      ...cur,
      flightSensitivity: this.mobileSettings.joystickSensitivity,
      cameraSensitivity: this.mobileSettings.cameraSensitivity,
      invertFlightY: this.mobileSettings.invertFlightY,
      flightAssist: this.mobileSettings.flightAssist,
      autoRollStabilize: this.mobileSettings.autoRollStabilize,
      gentleAimAssist: aimAssistMode !== 'off',
      aimAssistMode,
      targetTrackingAssist: this.mobileSettings.targetTrackingAssist,
      cameraShakeMode: shakeMode,
      enemyInfoDisplayMode,
      enemyInfoToggleKey,
    });
    this.valkyrie.setShakeMultiplier(getCameraShakeMultiplier(shakeMode));
    if (shakeMode === 'off') {
      this.resetRailImpactFx();
    }
  }

  private resolveLevelById(levelId: string | null | undefined): CampaignLevelDef | null {
    if (!levelId) return null;
    return getExtinctionLevelById(levelId) ?? getLevelById(levelId);
  }

  private resolveMissionById(missionId: string | null | undefined): CampaignMissionDef | null {
    if (!missionId) return null;
    if (missionId === EXTINCTION_CAMPAIGN_OPERATION.id) {
      return EXTINCTION_CAMPAIGN_OPERATION;
    }
    return getCampaignMissionById(missionId) ?? null;
  }

  private resolveCampaignLevelFromState(c: CampaignState): CampaignLevelDef | null {
    if (c.activeCampaignTrack === 'extinction') {
      return (
        getExtinctionLevelById(c.extinctionState?.currentLevelId ?? 'ext_l01') ??
        EXTINCTION_LEVELS[0]
      );
    }
    return (
      getLevelById(c.currentLevelId) ??
      getFirstLevelForOperation(c.currentMissionNumber)
    );
  }

  public setCampaignTrack(track: CampaignTrackId): void {
    this.campaign = setActiveCampaignTrack(this.campaign, track);
    const resolved = this.resolveCampaignLevelFromState(this.campaign);
    this.briefingLevel = resolved;
    this.briefingMission =
      this.resolveMissionById(resolved?.operationId) ??
      getMainMissionByNumber(this.campaign.currentMissionNumber);
    this.persistCampaign();
    this.pushHudSnapshot(true);
  }

  private recordCampaignMissionComplete(
    missionId: string,
    stats: {
      spaceKills?: number;
      subsystemsDestroyed?: number;
      capitalShipsDestroyed?: number;
      distanceTraveledKm?: number;
      elapsedSec?: number;
      shotsFired?: number;
      shotsHit?: number;
      hullRemainingPct?: number;
      levelId?: string | null;
      combatScore?: number;
      maxCombo?: number;
      protectedHpPct?: number | null;
      repairKitsUsed?: number;
      nearMissCount?: number;
      missilesEvaded?: number;
      legendaryDefeated?: boolean;
    },
  ): void {
    const resolved = this.resolveLevelById(stats.levelId);
    const levelId = resolved ? resolved.id : null;
    const result = levelId
      ? applyLevelCompletionWithSummary(this.campaign, levelId, {
          spaceKills: stats.spaceKills ?? 0,
          subsystemsDestroyed: stats.subsystemsDestroyed ?? 0,
          capitalShipsDestroyed: stats.capitalShipsDestroyed ?? 0,
          distanceTraveledKm: stats.distanceTraveledKm ?? 0,
          elapsedSec: stats.elapsedSec ?? 60,
          shotsFired: stats.shotsFired ?? 0,
          shotsHit: stats.shotsHit ?? 0,
          hullRemainingPct: stats.hullRemainingPct ?? 100,
          combatScore: stats.combatScore ?? 0,
          maxCombo: stats.maxCombo ?? 0,
          protectedHpPct: stats.protectedHpPct ?? null,
          repairKitsUsed: stats.repairKitsUsed ?? 0,
          nearMissCount: stats.nearMissCount ?? 0,
          missilesEvaded: stats.missilesEvaded ?? 0,
          legendaryDefeated: stats.legendaryDefeated ?? false,
        })
      : applyMissionCompletionWithSummary(this.campaign, missionId, stats);
    this.campaign = result.state;
    this.lastMissionSummary = result.summary;
    this.persistCampaign();
    this.syncLoadoutsToSubsystems();
    if (result.summary?.nextLevelId) {
      const nextLvl = this.resolveLevelById(result.summary.nextLevelId);
      if (nextLvl) {
        this.briefingLevel = nextLvl;
        const nextParent = this.resolveMissionById(nextLvl.operationId);
        if (nextParent) this.briefingMission = nextParent;
        return;
      }
    }
    if (result.summary?.nextMissionId) {
      const next = this.resolveMissionById(result.summary.nextMissionId);
      if (next) {
        this.briefingMission = next;
        this.briefingLevel =
          next.id === EXTINCTION_CAMPAIGN_OPERATION.id
            ? EXTINCTION_LEVELS[0]
            : getFirstLevelForOperation(next.missionNumber);
        return;
      }
    }
    const fallbackLevel = this.resolveCampaignLevelFromState(this.campaign);
    this.briefingLevel = fallbackLevel;
    this.briefingMission =
      this.resolveMissionById(fallbackLevel?.operationId) ??
      getMainMissionByNumber(this.campaign.currentMissionNumber);
  }

  public skipMissionTransition(): void {
    if (this.mode !== 'mission_transition') return;
    this.transitionTimer = this.transitionDurationSec;
    this.debugCameraOverride = false;
    if (
      this.lastMissionSummary?.isFinalMission &&
      this.lastMissionSummary?.campaignTrack !== 'extinction'
    ) {
      this.openCampaignEnding();
    } else {
      this.mode = 'mission_results';
      this.pushHudSnapshot(true);
    }
  }

  public continueFromMissionResults(): void {
    this.audio.unlock();
    if (
      this.lastMissionSummary?.isFinalMission ||
      (this.lastMissionSummary?.campaignTrack !== 'extinction' &&
        this.campaign.campaignCompleted &&
        this.campaign.completedMainMissions.includes(10))
    ) {
      this.openCampaignEnding();
      return;
    }
    const nextLevel = this.lastMissionSummary?.nextLevelId
      ? this.resolveLevelById(this.lastMissionSummary.nextLevelId)
      : this.resolveCampaignLevelFromState(this.campaign);
    if (nextLevel) {
      this.briefingLevel = nextLevel;
      this.briefingMission =
        this.resolveMissionById(nextLevel.operationId) ??
        getMainMissionByNumber(this.campaign.currentMissionNumber);
      this.mode = 'mission_briefing';
      this.pushHudSnapshot(true);
      return;
    }
    const nextMission =
      (this.lastMissionSummary?.nextMissionId
        ? this.resolveMissionById(this.lastMissionSummary.nextMissionId)
        : null) ?? getMainMissionByNumber(this.campaign.currentMissionNumber);
    this.briefingMission = nextMission;
    this.briefingLevel = getFirstLevelForOperation(nextMission.missionNumber);
    this.mode = 'mission_briefing';
    this.pushHudSnapshot(true);
  }

  public openMissionBriefing(missionId?: string): void {
    this.audio.unlock();
    this.exitPointerLock();
    this.clearAllInputs();
    const m = missionId
      ? this.resolveMissionById(missionId) ?? getMainMissionByNumber(this.campaign.currentMissionNumber)
      : getMainMissionByNumber(this.campaign.currentMissionNumber);
    this.briefingMission = m;
    this.briefingLevel = m.isOptional ? null : getFirstLevelForOperation(m.missionNumber);
    this.mode = 'mission_briefing';
    this.pushHudSnapshot(true);
  }

  public openLevelBriefing(levelId: string): void {
    const level = this.resolveLevelById(levelId);
    if (!level) return;
    const parentOp = this.resolveMissionById(level.operationId);
    if (!parentOp) return;
    const isExt = Boolean(getExtinctionLevelById(level.id));
    if (isExt && this.campaign.activeCampaignTrack !== 'extinction') {
      this.campaign = setActiveCampaignTrack(this.campaign, 'extinction');
    } else if (!isExt && this.campaign.activeCampaignTrack === 'extinction') {
      this.campaign = setActiveCampaignTrack(this.campaign, 'original');
    }
    this.audio.unlock();
    this.exitPointerLock();
    this.clearAllInputs();
    this.briefingLevel = level;
    this.briefingMission = parentOp;
    this.mode = 'mission_briefing';
    this.pushHudSnapshot(true);
  }

  public launchBriefedMission(): void {
    const curRegion = this.spaceCombat.getCurrentRegionId();
    const targetRegion = this.briefingLevel
      ? this.briefingLevel.spaceRegionId
      : this.briefingMission.spaceRegionId;
    if (targetRegion !== curRegion) {
      this.startHyperspaceJump(targetRegion, this.briefingMission, this.briefingLevel);
    } else if (this.briefingLevel) {
      this.deployCampaignLevel(this.briefingLevel.id);
    } else {
      this.deployCampaignMission(this.briefingMission.id);
    }
  }

  public retryCurrentMission(): void {
    this.lastMissionFailure = null;
    this.pendingFailureDelay = 0;
    if (this.activeLevel) {
      this.deployCampaignLevel(this.activeLevel.id);
    } else {
      this.deployCampaignMission(this.activeMission.id);
    }
  }

  public replayLastMission(): void {
    if (this.lastMissionSummary?.levelId) {
      this.deployCampaignLevel(this.lastMissionSummary.levelId);
      return;
    }
    const id = this.lastMissionSummary?.missionId ?? this.activeMission.id;
    this.deployCampaignMission(id);
  }

  public continueCampaign(track?: CampaignTrackId): void {
    this.audio.unlock();
    if (track) {
      this.campaign = setActiveCampaignTrack(this.campaign, track);
    }
    if (this.campaign.activeCampaignTrack === 'extinction') {
      const nextExt =
        getExtinctionLevelById(this.campaign.extinctionState?.currentLevelId ?? 'ext_l01') ??
        EXTINCTION_LEVELS[0];
      this.activeMission = EXTINCTION_CAMPAIGN_OPERATION;
      this.briefingMission = EXTINCTION_CAMPAIGN_OPERATION;
      this.activeLevel = nextExt;
      this.briefingLevel = nextExt;
      if ((this.campaign.extinctionState?.completedLevelIds?.length ?? 0) === 0) {
        this.deployCampaignLevel(nextExt.id);
      } else {
        this.openLevelBriefing(nextExt.id);
      }
      return;
    }

    const nextLevel =
      getLevelById(this.campaign.currentLevelId) ??
      getFirstLevelForOperation(this.campaign.currentMissionNumber);
    const nextMission =
      (nextLevel ? getCampaignMissionById(nextLevel.operationId) : null) ??
      getMainMissionByNumber(this.campaign.currentMissionNumber);
    this.activeMission = nextMission;
    this.briefingMission = nextMission;
    this.activeLevel = nextLevel;
    this.briefingLevel = nextLevel;
    if (this.campaign.completedLevelIds.length === 0 && this.campaign.completedMainMissions.length === 0) {
      if (nextLevel) this.deployCampaignLevel(nextLevel.id);
      else this.deployCampaignMission(nextMission.id);
    } else if (nextLevel) {
      this.openLevelBriefing(nextLevel.id);
    } else {
      this.openMissionBriefing(nextMission.id);
    }
  }

  public startNewCampaign(difficulty?: DifficultyId): void {
    this.audio.unlock();
    clearCampaignStorage();
    this.campaign = createInitialCampaignState(difficulty ?? this.campaign.difficulty);
    this.lastMissionSummary = null;
    this.lastMissionFailure = null;
    this.pendingFailureDelay = 0;
    this.persistCampaign();
    this.syncLoadoutsToSubsystems();
    this.spaceCombat.setCampaignDifficulty(this.campaign.difficulty);
    this.activeMission = MAIN_CAMPAIGN_MISSIONS[0];
    this.briefingMission = MAIN_CAMPAIGN_MISSIONS[0];
    const firstLevel = getFirstLevelForOperation(MAIN_CAMPAIGN_MISSIONS[0].missionNumber);
    this.activeLevel = firstLevel;
    this.briefingLevel = firstLevel;
    if (firstLevel) {
      this.deployCampaignLevel(firstLevel.id);
    } else {
      this.deployCampaignMission(this.activeMission.id);
    }
  }

  public setDifficulty(diff: DifficultyId): void {
    this.campaign = { ...this.campaign, difficulty: diff };
    this.spaceCombat.setCampaignDifficulty(diff);
    this.persistCampaign();
    this.pushHudSnapshot(true);
  }

  public openWarMap(tab: WarMapTabId = 'map'): void {
    this.audio.unlock();
    this.exitPointerLock();
    this.clearAllInputs();
    if (
      this.mode === 'mission_results' ||
      this.mode === 'mission_briefing' ||
      this.mode === 'mission_failed' ||
      this.mode === 'space'
    ) {
      this.returnModeAfterWarMap = this.mode;
    }
    this.warMapTab = tab;
    this.mode = 'war_map';
    this.pushHudSnapshot(true);
  }

  public closeWarMap(): void {
    if (
      this.returnModeAfterWarMap === 'mission_results' ||
      this.returnModeAfterWarMap === 'mission_briefing' ||
      this.returnModeAfterWarMap === 'mission_failed'
    ) {
      this.mode = this.returnModeAfterWarMap;
      this.pushHudSnapshot(true);
      return;
    }
    this.enterSpaceCombatDirect();
  }

  public openCampaignEnding(): void {
    this.exitPointerLock();
    this.clearAllInputs();
    this.mode = 'ending';
    this.pushHudSnapshot(true);
  }

  public returnToTitle(): void {
    this.exitPointerLock();
    this.cinematicActive = false;
    this.pendingFailureDelay = 0;
    this.clearAllInputs();
    this.mode = 'title';
    this.pushHudSnapshot(true);
  }

  public deployCampaignLevel(levelId: string): void {
    const extLvl = getExtinctionLevelById(levelId);
    const level = extLvl ?? getLevelById(levelId);
    if (!level) return;
    const mission = this.resolveMissionById(level.operationId);
    if (!mission) return;
    const targetTrack: CampaignTrackId = extLvl ? 'extinction' : 'original';
    if (this.campaign.activeCampaignTrack !== targetTrack) {
      this.campaign = setActiveCampaignTrack(this.campaign, targetTrack);
      this.persistCampaign();
    }
    this.audio.unlock();
    this.cinematicActive = false;
    this.pendingFailureDelay = 0;
    this.lastMissionFailure = null;
    this.debugCameraOverride = false;
    this.resetRailImpactFx();
    this.clearAllInputs();
    this.activeMission = mission;
    this.briefingMission = mission;
    this.activeLevel = level;
    this.briefingLevel = level;
    this.syncLoadoutsToSubsystems();
    this.spaceCombat.setCampaignDifficulty(this.campaign.difficulty);
    this.mode = 'space';
    this.returnModeAfterWarMap = 'space';
    this.valkyrie.setViewMode(this.preferredSpaceViewMode);
    this.valkyrie.setExteriorShowcaseOverride(false);
    this.spaceCombat.enterCombat(this.valkyrie, level.spaceRegionId, mission, level);
    this.valkyrie.updateCamera(this.camera, 0.016, false, false, undefined, true);
    this.combatFeed.push(
      this.elapsed,
      level.code,
      level.briefing,
      level.isBossLevel || mission.isFinalMission ? 'critical' : 'warning',
    );
    this.pushHudSnapshot(true);
  }

  public deployCampaignMission(missionId: string): void {
    const mission = getCampaignMissionById(missionId);
    if (!mission) return;
    if (!mission.isOptional) {
      const firstLevel = getFirstLevelForOperation(mission.missionNumber);
      if (firstLevel) {
        this.deployCampaignLevel(firstLevel.id);
        return;
      }
    }
    this.audio.unlock();
    this.cinematicActive = false;
    this.pendingFailureDelay = 0;
    this.lastMissionFailure = null;
    this.debugCameraOverride = false;
    this.resetRailImpactFx();
    this.clearAllInputs();
    this.activeMission = mission;
    this.briefingMission = mission;
    this.activeLevel = null;
    this.briefingLevel = null;
    this.syncLoadoutsToSubsystems();
    this.spaceCombat.setCampaignDifficulty(this.campaign.difficulty);
    this.mode = 'space';
    this.returnModeAfterWarMap = 'space';
    this.valkyrie.setViewMode(this.preferredSpaceViewMode);
    this.valkyrie.setExteriorShowcaseOverride(false);
    this.spaceCombat.enterCombat(this.valkyrie, mission.spaceRegionId, mission, null);
    this.valkyrie.updateCamera(this.camera, 0.016, false, false, undefined, true);
    this.combatFeed.push(
      this.elapsed,
      mission.code,
      mission.commsTransmission,
      mission.isFinalMission ? 'critical' : 'warning',
    );
    this.pushHudSnapshot(true);
  }

  public enterSpaceCombatDirect(): void {
    this.audio.unlock();
    this.cinematicActive = false;
    this.pendingFailureDelay = 0;
    this.clearAllInputs();
    this.mode = 'space';
    this.returnModeAfterWarMap = 'space';
    this.valkyrie.setViewMode(this.preferredSpaceViewMode);
    this.valkyrie.setExteriorShowcaseOverride(false);
    const targetRegion = this.activeLevel
      ? this.activeLevel.spaceRegionId
      : this.activeMission.spaceRegionId;
    this.spaceCombat.enterCombat(this.valkyrie, targetRegion, this.activeMission, this.activeLevel);
    this.valkyrie.updateCamera(this.camera, 0.016, false, false, undefined, true);
    this.pushHudSnapshot(true);
  }

  public completeActiveMission(): void {
    this.spaceCombat.forceCompleteMission();
    this.pushHudSnapshot(true);
  }

  public chooseStrategicDecision(decisionId: StrategicDecisionDef['id'], choiceId: string): void {
    this.campaign = applyStrategicDecision(this.campaign, decisionId, choiceId);
    this.persistCampaign();
    this.syncLoadoutsToSubsystems();
    this.combatFeed.push(
      this.elapsed,
      'DECISION',
      'Strategic Fleet Directive Executed — Campaign Fleet Updated',
      'warning',
    );
    this.pushHudSnapshot(true);
  }

  public selectShipClass(shipId: PlayableShipId, forceUnlock = false): void {
    const unlocked = this.campaign.spaceLoadout.unlockedShips;
    if (!forceUnlock && !unlocked.includes(shipId)) return;
    const nextUnlocked = unlocked.includes(shipId) ? unlocked : [...unlocked, shipId];
    this.campaign = {
      ...this.campaign,
      spaceLoadout: {
        ...this.campaign.spaceLoadout,
        selectedShipId: shipId,
        unlockedShips: nextUnlocked,
        chassisConfig: shipIdToChassisAlias(shipId),
      },
    };
    this.persistCampaign();
    this.syncLoadoutsToSubsystems();
    this.pushHudSnapshot(true);
  }

  public updateSpaceLoadout(partial: Partial<SpaceLoadout>): void {
    this.campaign = {
      ...this.campaign,
      spaceLoadout: { ...this.campaign.spaceLoadout, ...partial },
    };
    this.persistCampaign();
    this.syncLoadoutsToSubsystems();
    this.pushHudSnapshot(true);
  }

  public purchaseUpgrade(action: UpgradeActionType): boolean {
    const res = applyCampaignUpgrade(this.campaign, action);
    if (!res.applied) return false;
    this.campaign = res.state;
    this.persistCampaign();
    this.syncLoadoutsToSubsystems();
    this.audio.playReload();
    this.pushHudSnapshot(true);
    return true;
  }

  public purchaseTradeOffModule(moduleId: TradeOffModuleId): boolean {
    const res = applyTradeOffModulePurchase(this.campaign, moduleId);
    if (!res.applied) return false;
    this.campaign = res.state;
    this.persistCampaign();
    this.syncLoadoutsToSubsystems();
    this.audio.playReload();
    this.pushHudSnapshot(true);
    return true;
  }

  public toggleTradeOffModule(moduleId: TradeOffModuleId): boolean {
    const res = applyTradeOffModuleToggle(this.campaign, moduleId);
    if (!res.changed) return false;
    this.campaign = res.state;
    this.persistCampaign();
    this.syncLoadoutsToSubsystems();
    this.audio.playReload();
    this.pushHudSnapshot(true);
    return true;
  }

  public selectCosmeticLivery(cosmeticId: string): boolean {
    const res = applyPilotCosmeticSelection(this.campaign, cosmeticId);
    if (!res.applied) return false;
    this.campaign = res.state;
    this.applyActiveCosmeticLivery();
    this.persistCampaign();
    this.audio.playReload();
    this.renderOneFrame();
    this.pushHudSnapshot(true);
    return true;
  }

  public exchangeCreditsForHangarKit(): boolean {
    const res = applyCreditHangarExchange(this.campaign);
    if (!res.applied) return false;
    this.campaign = res.state;
    this.persistCampaign();
    this.audio.playReload();
    this.pushHudSnapshot(true);
    return true;
  }

  // =========================================================================
  // SPACE FLIGHT, WEAPONS, SUPERCRUISE, WINGMEN & HYPERSPACE TRANSIT
  // =========================================================================
  public issueWingmanCommand(cmd: WingmanCommandId): void {
    this.audio.unlock();
    this.spaceCombat.issueWingmanCommand(cmd);
    this.pushHudSnapshot(true);
  }

  public startHyperspaceJump(
    regionId: SpaceRegionId,
    missionOverride?: CampaignMissionDef,
    levelOverride?: CampaignLevelDef | null,
  ): void {
    this.audio.unlock();
    this.cinematicActive = false;
    this.pendingFailureDelay = 0;
    this.lastMissionFailure = null;
    this.debugCameraOverride = false;
    this.clearAllInputs();
    const curReg = SPACE_REGIONS[this.spaceCombat.getCurrentRegionId()];
    const destReg = SPACE_REGIONS[regionId];
    this.hyperspacePendingMission = missionOverride ?? null;
    this.hyperspacePendingLevel = levelOverride ?? null;
    if (missionOverride) {
      this.activeMission = missionOverride;
      this.briefingMission = missionOverride;
    }
    if (levelOverride !== undefined) {
      this.activeLevel = levelOverride;
      this.briefingLevel = levelOverride;
    }
    this.mode = 'space';
    this.returnModeAfterWarMap = 'space';
    this.valkyrie.setViewMode('chase');
    this.hyperspace = startHyperspaceTransition({
      originLabel: `${curReg.code} · ${curReg.label}`,
      destinationLabel: `${destReg.code} · ${destReg.label}`,
      destinationRegionId: regionId,
      destinationMissionId: missionOverride?.id ?? null,
    });
    this.audio.playHyperspaceJump();
    this.combatFeed.push(
      this.elapsed,
      'HYPERDRIVE',
      `Spooling Jump Drive -> ${destReg.code} ${destReg.label}`,
      'info',
    );
    this.pushHudSnapshot(true);
  }

  public skipHyperspace(): void {
    if (!this.hyperspace.active) return;
    const destRegion = this.hyperspace.destinationRegionId;
    const pendingMission = this.hyperspacePendingMission;
    const pendingLevel = this.hyperspacePendingLevel;
    if (destRegion && !this.hyperspace.arrivalCommitted) {
      this.commitHyperspaceArrival(destRegion, pendingMission, pendingLevel);
    }
    this.hyperspace = createIdleHyperspaceState();
    this.hyperspacePendingMission = null;
    this.hyperspacePendingLevel = null;
    this.camera.fov = this.valkyrie.getViewMode() === 'cockpit' ? 68 : 60;
    this.camera.updateProjectionMatrix();
    this.pushHudSnapshot(true);
  }

  private commitHyperspaceArrival(
    regionId: SpaceRegionId,
    missionOverride: CampaignMissionDef | null,
    levelOverride: CampaignLevelDef | null = null,
  ): void {
    this.syncLoadoutsToSubsystems();
    this.spaceCombat.setCampaignDifficulty(this.campaign.difficulty);
    if (missionOverride) {
      this.spaceCombat.enterCombat(this.valkyrie, regionId, missionOverride, levelOverride);
      this.combatFeed.push(
        this.elapsed,
        levelOverride ? levelOverride.code : missionOverride.code,
        levelOverride ? levelOverride.briefing : missionOverride.commsTransmission,
        levelOverride?.isBossLevel || missionOverride.isFinalMission ? 'critical' : 'warning',
      );
    } else {
      this.spaceCombat.travelToRegion(regionId, this.valkyrie, undefined, true);
    }
    this.valkyrie.updateCamera(this.camera, 0.016, false, false, undefined, true);
  }

  public travelSpaceRegion(regionId: SpaceRegionId, instant = false): void {
    const curRegion = this.spaceCombat.getCurrentRegionId();
    if (!instant && regionId !== curRegion) {
      this.startHyperspaceJump(regionId);
      return;
    }
    if (this.mode !== 'space') {
      this.mode = 'space';
    }
    this.spaceCombat.travelToRegion(regionId, this.valkyrie, undefined, true);
    this.valkyrie.updateCamera(this.camera, 0.016, false, false, undefined, true);
    this.pushHudSnapshot(true);
  }

  public selectSpaceWeapon(weapon: SpaceWeaponId): void {
    this.spaceCombat.selectWeapon(weapon);
    this.pushHudSnapshot(true);
  }

  public cycleSpaceWeapon(): void {
    this.spaceCombat.cycleWeapon();
    this.pushHudSnapshot(true);
  }

  public cycleSpaceTarget(): void {
    this.spaceCombat.cycleTarget();
    this.pushHudSnapshot(true);
  }

  public toggleSupercruise(): void {
    this.spaceCombat.toggleSupercruise();
    this.pushHudSnapshot(true);
  }

  public toggleAutopilot(): void {
    this.spaceCombat.toggleAutopilot();
    this.pushHudSnapshot(true);
  }

  public toggleSpaceCameraMode(): void {
    const next: SpaceCameraMode = this.valkyrie.getViewMode() === 'chase' ? 'cockpit' : 'chase';
    this.setSpaceCameraMode(next);
  }

  public setSpaceCameraMode(mode: SpaceCameraMode): void {
    this.preferredSpaceViewMode = mode;
    this.valkyrie.setViewMode(mode);
    this.pushHudSnapshot(true);
  }

  public triggerCountermeasure(): void {
    this.spaceCombat.triggerCountermeasure();
    this.pushHudSnapshot(true);
  }

  public fireMissile(): void {
    this.spaceCombat.fireMissile();
    this.pushHudSnapshot(true);
  }

  public useRepairKit(): void {
    this.spaceCombat.useRepairKit();
    this.pushHudSnapshot(true);
  }

  public respawnInOrbit(): void {
    this.spaceCombat.respawnInOrbit(this.valkyrie);
    this.pushHudSnapshot(true);
  }

  // Unified Mobile Touch Controls Hooks
  public setTouchJoystick(x: number, y: number): void {
    this.spaceCombat.setInputState({
      joyYaw: x,
      joyPitch: y,
    });
  }

  public addTouchCameraLook(dx: number, dy: number): void {
    this.spaceCombat.addLookDelta(dx, dy);
  }

  public setTouchPrimaryFire(down: boolean): void {
    this.audio.unlock();
    this.spaceCombat.setFiringPrimary(down);
  }

  public setTouchFlightButton(
    button: 'boost' | 'brake' | 'rollLeft' | 'rollRight' | 'throttleForward' | 'throttleReverse',
    down: boolean,
  ): void {
    this.audio.unlock();
    this.spaceCombat.setInputState({ [button]: down });
  }

  public clearAllInputs(): void {
    this.spaceCombat.clearFlightInputs();
    this.isDragging = false;
  }

  // =========================================================================
  // MOBILE SETTINGS, FLIGHT SETTINGS, GRAPHICS & PAUSE
  // =========================================================================
  private syncHudViewportToSpaceCombat(): void {
    const w = Math.max(320, this.container.clientWidth || window.innerWidth || 1440);
    const h = Math.max(240, this.container.clientHeight || window.innerHeight || 900);
    this.spaceCombat.setHudViewportContext({
      viewportWidth: w,
      viewportHeight: h,
      isTouchMode: this.deviceProfile.useTouchControls,
      isCompactPhone:
        this.deviceProfile.useTouchControls && this.deviceProfile.formFactor === 'small_phone',
      orientation: this.deviceProfile.orientation,
    });
  }

  public updateMobileSettings(partial: Partial<MobileControlSettings>): void {
    this.mobileSettings = { ...this.mobileSettings, ...partial };
    saveMobileSettingsToStorage(this.mobileSettings);
    this.deviceProfile = detectBrowserDeviceProfile(this.mobileSettings.controlModeOverride);
    this.syncMobileSettingsToFlight();
    this.syncHudViewportToSpaceCombat();
    this.pushHudSnapshot(true);
  }

  public resetMobileSettings(): void {
    this.mobileSettings = { ...DEFAULT_MOBILE_CONTROL_SETTINGS };
    saveMobileSettingsToStorage(this.mobileSettings);
    this.deviceProfile = detectBrowserDeviceProfile(this.mobileSettings.controlModeOverride);
    this.syncMobileSettingsToFlight();
    this.syncHudViewportToSpaceCombat();
    this.pushHudSnapshot(true);
  }

  public dismissPortraitHint(): void {
    this.updateMobileSettings({ portraitHintDismissed: true });
  }

  public updateFlightSettings(partial: Partial<FlightControlSettings>): void {
    const prev = this.spaceCombat.getFlightSettings();
    const resolvedAimAssist: AimAssistMode =
      partial.aimAssistMode !== undefined
        ? partial.aimAssistMode
        : partial.gentleAimAssist !== undefined
          ? partial.gentleAimAssist
            ? 'subtle'
            : 'off'
          : prev.aimAssistMode ?? (prev.gentleAimAssist ? 'subtle' : 'off');
    const next: FlightControlSettings = {
      ...prev,
      ...partial,
      aimAssistMode: resolvedAimAssist,
      gentleAimAssist: resolvedAimAssist !== 'off',
    };
    this.spaceCombat.setFlightSettings(next);
    const shakeMode = next.cameraShakeMode ?? 'full';
    const enemyInfoDisplayMode = next.enemyInfoDisplayMode ?? 'full';
    const enemyInfoToggleKey = next.enemyInfoToggleKey ?? 'F5';
    this.valkyrie.setShakeMultiplier(getCameraShakeMultiplier(shakeMode));
    if (shakeMode === 'off') {
      this.resetRailImpactFx();
    }
    // Keep matching mobile settings synced too
    this.mobileSettings = {
      ...this.mobileSettings,
      joystickSensitivity: next.flightSensitivity,
      cameraSensitivity: next.cameraSensitivity,
      invertFlightY: next.invertFlightY,
      flightAssist: next.flightAssist,
      autoRollStabilize: next.autoRollStabilize,
      gentleAimAssist: resolvedAimAssist !== 'off',
      aimAssistMode: resolvedAimAssist,
      targetTrackingAssist: next.targetTrackingAssist,
      cameraShakeMode: shakeMode,
      enemyInfoDisplayMode,
      enemyInfoToggleKey,
    };
    saveMobileSettingsToStorage(this.mobileSettings);
    this.pushHudSnapshot(true);
  }

  public setEnemyInfoDisplayMode(mode: EnemyInfoDisplayMode, showBanner = true): void {
    this.updateFlightSettings({ enemyInfoDisplayMode: mode });
    if (showBanner) {
      const toggleKey = this.spaceCombat.getFlightSettings().enemyInfoToggleKey ?? 'F5';
      const keyLabel = toggleKey.startsWith('Key') ? toggleKey.slice(3) : toggleKey;
      this.enemyInfoModeToast = `ENEMY INFO DISPLAY: ${getEnemyInfoDisplayModeLabel(mode).toUpperCase()} [${keyLabel}]`;
      this.enemyInfoModeToastTimer = 2.4;
      this.pushHudSnapshot(true);
    }
  }

  public cycleEnemyInfoDisplayMode(): void {
    const cur = this.spaceCombat.getFlightSettings().enemyInfoDisplayMode ?? 'full';
    const next = getNextEnemyInfoDisplayMode(cur);
    this.setEnemyInfoDisplayMode(next, true);
  }

  public setEnemyInfoToggleKey(code: string): void {
    if (!code || code.length > 24) return;
    this.updateFlightSettings({ enemyInfoToggleKey: code });
  }

  public updateControlSettings(partial: Partial<PlayerControlSettings>): void {
    this.controlSettings = { ...this.controlSettings, ...partial };
    if (!this.controlSettings.adaptiveResolution) {
      this.resolutionScale = 1.0;
      this.applyGraphicsPreset(this.graphicsPreset);
    }
    this.pushHudSnapshot(true);
  }

  public applyGraphicsPreset(presetId: GraphicsPresetId): void {
    this.graphicsPreset = presetId;
    const cfg = GRAPHICS_PRESETS[presetId];
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.maxPixelRatio) * this.resolutionScale;
    const clampedDpr = Math.max(0.55, dpr);
    this.renderer.setPixelRatio(clampedDpr);
    this.railDistortionBlit.setSize(
      Math.max(1, this.container.clientWidth),
      Math.max(1, this.container.clientHeight),
      clampedDpr,
    );
    this.spaceCombat.setAiUpdateMultiplier(cfg.aiUpdateIntervalMultiplier);
    this.pushHudSnapshot(true);
  }

  public startCinematic(): void {
    this.audio.unlock();
    this.exitPointerLock();
    this.clearAllInputs();
    this.cinematicActive = true;
    this.cinematicProgress = 0;
    this.mode = 'cinematic';
    this.updateOrbitalCinematic(0);
    this.pushHudSnapshot(true);
  }

  public skipCinematic(): void {
    this.cinematicActive = false;
    if (this.activeLevel) {
      this.deployCampaignLevel(this.activeLevel.id);
    } else {
      this.deployCampaignMission(this.activeMission.id);
    }
  }

  public togglePause(): void {
    if (this.mode === 'paused') {
      this.mode = this.prePauseMode;
    } else if (this.mode === 'space' || this.mode === 'war_map') {
      this.prePauseMode = this.mode;
      this.exitPointerLock();
      this.clearAllInputs();
      this.mode = 'paused';
    }
    this.pushHudSnapshot(true);
  }

  public setMuted(muted: boolean): void {
    this.audio.unlock();
    this.audio.setMuted(muted);
    this.pushHudSnapshot(true);
  }

  public toggleMute(): boolean {
    const next = !this.audio.isMuted();
    this.setMuted(next);
    return next;
  }

  public setMasterVolume(vol: number): void {
    this.audio.unlock();
    this.audio.setMasterVolume(vol);
    this.pushHudSnapshot(true);
  }

  public getMasterVolume(): number {
    return this.audio.getMasterVolume();
  }

  public setWeaponVolume(vol: number): void {
    this.audio.unlock();
    this.audio.setWeaponVolume(vol);
    this.pushHudSnapshot(true);
  }

  public getWeaponVolume(): number {
    return this.audio.getWeaponVolume();
  }

  public testFireWeaponAudio(weapon: SpaceWeaponId = 'pulse'): void {
    this.audio.unlock();
    this.audio.playWeaponFire(weapon, 0);
  }

  private requestPointerLock(): void {
    if (this.deviceProfile.useTouchControls) return;
    if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
    const canvas = this.renderer.domElement;
    if (!canvas || !canvas.isConnected || document.pointerLockElement === canvas) return;
    if (typeof canvas.requestPointerLock !== 'function') return;
    try {
      const maybePromise = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {
          // Graceful fallback to click-drag when pointer lock is unavailable or window loses focus
        });
      }
    } catch {
      // Fallback to click-drag
    }
  }

  private exitPointerLock(): void {
    try {
      if (document.pointerLockElement && typeof document.exitPointerLock === 'function') {
        const maybePromise = document.exitPointerLock() as unknown as Promise<void> | undefined;
        if (maybePromise && typeof maybePromise.catch === 'function') {
          maybePromise.catch(() => {
            // Ignore exitPointerLock rejection
          });
        }
      }
    } catch {
      // Ignore
    }
  }

  // =========================================================================
  // DESKTOP INPUT HANDLERS (UNTOUCHED EXPERIENCE FOR KEYBOARD & MOUSE!)
  // =========================================================================
  private handleResize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
    if (this.bloomPass) this.bloomPass.setSize(w, h);
    this.railDistortionBlit.setSize(w, h, this.renderer.getPixelRatio());

    // Clear active touch inputs on orientation change & recompute responsive DeviceProfile
    this.clearAllInputs();
    this.deviceProfile = detectBrowserDeviceProfile(this.mobileSettings.controlModeOverride);
    this.syncHudViewportToSpaceCombat();
    this.renderOneFrame();
    this.pushHudSnapshot(true);
  }

  private handlePointerLockChange(): void {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.pushHudSnapshot(true);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    if (e.code === 'Escape') {
      if (this.hyperspace.active) {
        e.preventDefault();
        this.skipHyperspace();
        return;
      }
      if (this.mode === 'cinematic') {
        this.skipCinematic();
        return;
      }
      if (this.mode === 'mission_transition') {
        this.skipMissionTransition();
        return;
      }
      if (this.mode === 'space' || this.mode === 'war_map' || this.mode === 'paused') {
        this.togglePause();
        return;
      }
      return;
    }

    if (this.hyperspace.active && (e.code === 'Space' || e.code === 'Enter')) {
      e.preventDefault();
      this.skipHyperspace();
      return;
    }

    if (this.mode === 'cinematic' && (e.code === 'Space' || e.code === 'Enter')) {
      this.skipCinematic();
      return;
    }

    if (this.mode === 'mission_transition' && (e.code === 'Space' || e.code === 'Enter')) {
      e.preventDefault();
      this.skipMissionTransition();
      return;
    }

    if (this.mode === 'war_map') {
      if (e.code === 'KeyM') {
        this.closeWarMap();
      }
      return;
    }

    if (this.mode === 'space') {
      if (e.code === 'F1') {
        e.preventDefault();
        this.issueWingmanCommand('attack');
        return;
      }
      if (e.code === 'F2') {
        e.preventDefault();
        this.issueWingmanCommand('defend');
        return;
      }
      if (e.code === 'F3') {
        e.preventDefault();
        this.issueWingmanCommand('cover');
        return;
      }
      if (e.code === 'F4') {
        e.preventDefault();
        this.issueWingmanCommand('regroup');
        return;
      }
      const enemyInfoToggleKey = this.spaceCombat.getFlightSettings().enemyInfoToggleKey || 'F5';
      if (e.code === enemyInfoToggleKey) {
        e.preventDefault();
        this.cycleEnemyInfoDisplayMode();
        return;
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp')
        this.spaceCombat.setInputState({ throttleForward: true });
      if (e.code === 'KeyS' || e.code === 'ArrowDown')
        this.spaceCombat.setInputState({ throttleReverse: true });
      if (e.code === 'KeyA' || e.code === 'ArrowLeft')
        this.spaceCombat.setInputState({ strafeLeft: true });
      if (e.code === 'KeyD' || e.code === 'ArrowRight')
        this.spaceCombat.setInputState({ strafeRight: true });
      if (e.code === 'KeyQ') this.spaceCombat.setInputState({ rollLeft: true });
      if (e.code === 'KeyE') this.spaceCombat.setInputState({ rollRight: true });
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight')
        this.spaceCombat.setInputState({ boost: true });
      if (e.code === 'Space') {
        e.preventDefault();
        this.spaceCombat.setInputState({ brake: true });
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        this.cycleSpaceTarget();
      }
      if (e.code === 'KeyV') this.toggleSupercruise();
      if (e.code === 'KeyG') this.toggleAutopilot();
      if (e.code === 'KeyC') this.toggleSpaceCameraMode();
      if (e.code === 'KeyF') {
        const cur = this.spaceCombat.getFlightSettings();
        this.updateFlightSettings({ flightAssist: !cur.flightAssist });
      }
      if (e.code === 'KeyR') {
        if (this.spaceCombat.getHudSnapshot().isDestroyed) {
          this.respawnInOrbit();
        } else {
          this.triggerCountermeasure();
        }
      }
      if (e.code === 'KeyH') this.useRepairKit();
      if (e.code === 'Digit1') this.selectSpaceWeapon('pulse');
      if (e.code === 'Digit2') this.selectSpaceWeapon('heavy_plasma');
      if (e.code === 'Digit3') this.selectSpaceWeapon('missile');
      if (e.code === 'Digit4') this.selectSpaceWeapon('emp');
      if (e.code === 'Digit5') this.selectSpaceWeapon('rail_cannon');
      if (e.code === 'KeyM') {
        this.prePauseMode = 'space';
        this.openWarMap('map');
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.code === 'KeyW' || e.code === 'ArrowUp')
      this.spaceCombat.setInputState({ throttleForward: false });
    if (e.code === 'KeyS' || e.code === 'ArrowDown')
      this.spaceCombat.setInputState({ throttleReverse: false });
    if (e.code === 'KeyA' || e.code === 'ArrowLeft')
      this.spaceCombat.setInputState({ strafeLeft: false });
    if (e.code === 'KeyD' || e.code === 'ArrowRight')
      this.spaceCombat.setInputState({ strafeRight: false });
    if (e.code === 'KeyQ') this.spaceCombat.setInputState({ rollLeft: false });
    if (e.code === 'KeyE') this.spaceCombat.setInputState({ rollRight: false });
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight')
      this.spaceCombat.setInputState({ boost: false });
    if (e.code === 'Space') this.spaceCombat.setInputState({ brake: false });
  }

  private handlePointerDown(e: PointerEvent): void {
    if (this.deviceProfile.useTouchControls || e.pointerType === 'touch') {
      // Touch input is cleanly managed by dedicated MobileTouchControls layer so look drags never misfire!
      return;
    }
    this.audio.unlock();
    if (this.mode === 'space') {
      if (e.button === 0) {
        if (!this.pointerLocked) this.requestPointerLock();
        this.spaceCombat.setFiringPrimary(true);
        this.isDragging = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      } else if (e.button === 2) {
        this.spaceCombat.fireMissile();
        this.pushHudSnapshot(true);
      }
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.deviceProfile.useTouchControls || e.pointerType === 'touch') return;
    if (this.mode === 'space') {
      if (this.pointerLocked) {
        this.spaceCombat.addLookDelta(e.movementX, e.movementY);
      } else if (this.isDragging) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.spaceCombat.addLookDelta(dx * 1.35, dy * 1.35);
      }
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    if (this.deviceProfile.useTouchControls || e.pointerType === 'touch') return;
    if (e.button === 0) {
      this.spaceCombat.setFiringPrimary(false);
    }
    this.isDragging = false;
  }

  // =========================================================================
  // ORBITAL TITLE CAMERA & 4-ACT ORBITAL CINEMATIC
  // =========================================================================
  private updateTitleCamera(): void {
    // Crisp 3/4 hero aerospace framing showcasing the sculpted VX-94 Valkyrie on the right half against orbital deep space
    const drift = Math.sin(this.elapsed * 0.14) * 1.4;
    const shipPos = this.valkyrie.root.position;
    this.camera.position.set(
      shipPos.x + 12.8 + Math.cos(this.elapsed * 0.08) * 1.6,
      shipPos.y + 4.4 + drift * 0.35,
      shipPos.z - 15.2,
    );
    this.camera.up.set(0, 1, 0);
    // Offset look target slightly left of the ship so the starfighter sits cleanly on the right of the hero composition
    this.camera.lookAt(shipPos.x - 4.2, shipPos.y + 1.2, shipPos.z + 1.2);
    if (Math.abs(this.camera.fov - 46) > 0.2) {
      this.camera.fov = 46;
      this.camera.updateProjectionMatrix();
    }
  }

  private updateOrbitalCinematic(dt: number): void {
    this.cinematicProgress = Math.min(1, this.cinematicProgress + dt / this.cinematicDurationSec);
    const actCount = ORBITAL_CINEMATIC_ACTS.length;
    const scaled = this.cinematicProgress * actCount;
    const actIdx = Math.min(actCount - 1, Math.floor(scaled));
    const localT = Math.min(1, scaled - actIdx);
    const act = ORBITAL_CINEMATIC_ACTS[actIdx];

    this.camera.position.set(
      THREE.MathUtils.lerp(act.camStart[0], act.camEnd[0], localT),
      THREE.MathUtils.lerp(act.camStart[1], act.camEnd[1], localT),
      THREE.MathUtils.lerp(act.camStart[2], act.camEnd[2], localT),
    );
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(...act.lookAt);

    this.lastCinematicFrame = {
      active: this.cinematicProgress < 1,
      progress: this.cinematicProgress,
      actIndex: actIdx,
      actTitle: act.title,
      caption: act.caption,
      sovereignState: 'idle_authority',
    };

    if (this.cinematicProgress >= 1) {
      this.skipCinematic();
    }
  }

  // =========================================================================
  // SNAPSHOT, RENDER & SOFTWARE-WEBGL FRIENDLY LOOP
  // =========================================================================
  public buildHudSnapshot(): EngineHudSnapshot {
    const fpsStats = computeFpsStats(this.frameTimesMs);
    const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const jsHeapMB = perfMem ? Math.round(perfMem.usedJSHeapSize / (1024 * 1024)) : null;

    return {
      mode: this.mode,
      warMapTab: this.warMapTab,
      hasSavedCampaign: this.hasSavedCampaign,
      campaign: this.campaign,
      decisionEffects: computeDecisionEffects(this.campaign),
      activeMission: this.activeMission,
      briefingMission: this.briefingMission,
      activeLevel: this.activeLevel,
      briefingLevel: this.briefingLevel,
      lastMissionSummary: this.lastMissionSummary,
      lastMissionFailure: this.lastMissionFailure,
      transitionProgress: Math.min(1, this.transitionTimer / this.transitionDurationSec),
      deviceProfile: this.deviceProfile,
      mobileSettings: this.mobileSettings,
      pointerLocked: this.pointerLocked,
      cameraPos: [
        Math.round(this.camera.position.x),
        Math.round(this.camera.position.y),
        Math.round(this.camera.position.z),
      ],
      graphicsPreset: this.graphicsPreset,
      controlSettings: { ...this.controlSettings },
      flightSettings: this.spaceCombat.getFlightSettings(),
      muted: this.audio.isMuted(),
      masterVolume: this.audio.getMasterVolume(),
      weaponVolume: this.audio.getWeaponVolume(),
      capabilities: this.capabilities,
      performance: {
        avgFps: fpsStats.avgFps,
        onePercentLowFps: fpsStats.onePercentLowFps,
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        geometries: this.renderer.info.memory.geometries,
        textures: this.renderer.info.memory.textures,
        jsHeapMB,
        resolutionScale: Number(this.resolutionScale.toFixed(2)),
      },
      cinematic: this.lastCinematicFrame,
      hyperspace: { ...this.hyperspace },
      space: this.spaceCombat.getHudSnapshot(),
      combatFeed: this.combatFeed.getEntries(),
      enemyInfoModeToast: this.enemyInfoModeToast,
    };
  }

  private pushHudSnapshot(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastHudPush < 90) return;
    this.lastHudPush = now;
    this.onHudUpdate(this.buildHudSnapshot());
  }

  private resetRailImpactFx(): void {
    this.railShakeState = createInitialRailShakeState();
    this.railDistortionPulses = [];
    this.lastRailImpactUv = null;
    this.lastRailShakeSample = {
      active: false,
      intensity: 0,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitchRad: 0,
      yawRad: 0,
      rollRad: 0,
      fovPunchDeg: 0,
    };
  }

  private stepRailImpactFx(dt: number): void {
    const isCockpit = this.valkyrie.getViewMode() === 'cockpit';
    const shakeMode = this.spaceCombat.getFlightSettings().cameraShakeMode ?? 'full';
    const shakeRes = stepRailImpactShake(this.railShakeState, dt, isCockpit);
    this.railShakeState = shakeRes.state;
    this.lastRailShakeSample = applyCameraShakeAccessibility(shakeRes.sample, shakeMode);
    this.railDistortionPulses = stepRailDistortionPulses(this.railDistortionPulses, dt);
    if (this.railDistortionPulses.length === 0 || getDistortionAccessibilityMultiplier(shakeMode) <= 0) {
      this.lastRailImpactUv = null;
    }
  }

  private updateRailDistortionUniforms(): boolean {
    this.railSlot0.params.set(0, 0.05, 0, 0);
    this.railSlot1.params.set(0, 0.05, 0, 0);

    const shakeMode = this.spaceCombat.getFlightSettings().cameraShakeMode ?? 'full';
    const distortionScale = getDistortionAccessibilityMultiplier(shakeMode);
    if (distortionScale <= 0) {
      if (this.railDistortionPass) {
        syncRailDistortionPassUniforms(
          this.railDistortionPass,
          Math.max(0.5, this.camera.aspect),
          this.railSlot0,
          this.railSlot1,
          false,
        );
      }
      return false;
    }

    let activeCount = 0;
    const slots = [this.railSlot0, this.railSlot1];
    this.camera.updateMatrixWorld();

    for (let i = 0; i < this.railDistortionPulses.length && activeCount < 2; i++) {
      const pulse = this.railDistortionPulses[i];
      const evaluated = evaluateRailDistortionPulse(pulse);
      if (!evaluated.active) continue;

      this.tmpRailProj.set(pulse.worldX, pulse.worldY, pulse.worldZ).project(this.camera);
      // Skip pulses completely behind the camera frustum
      if (this.tmpRailProj.z > 1.0) continue;

      const u = THREE.MathUtils.clamp(0.5 + this.tmpRailProj.x * 0.5, -0.15, 1.15);
      const v = THREE.MathUtils.clamp(0.5 + this.tmpRailProj.y * 0.5, -0.15, 1.15);
      const slot = slots[activeCount];
      slot.center.set(u, v);
      slot.params.set(
        evaluated.radius,
        evaluated.thickness,
        evaluated.intensity * distortionScale,
        evaluated.chromatic * distortionScale,
      );
      if (activeCount === 0) {
        this.lastRailImpactUv = [Number(u.toFixed(3)), Number(v.toFixed(3))];
      }
      activeCount++;
    }

    const hasActive = activeCount > 0;
    const aspect = Math.max(0.5, this.camera.aspect);
    if (this.railDistortionPass) {
      syncRailDistortionPassUniforms(
        this.railDistortionPass,
        aspect,
        this.railSlot0,
        this.railSlot1,
        hasActive,
      );
    }
    if (hasActive) {
      this.railDistortionBlit.syncUniforms(aspect, this.railSlot0, this.railSlot1);
    }
    return hasActive;
  }

  private renderOneFrame(): void {
    // Guarantee full exterior spacecraft visibility whenever an external showcase/victory/title camera is active
    // (fixes floating cockpit frame when completing or failing a level while in cockpit view)
    this.valkyrie.setExteriorShowcaseOverride(this.mode !== 'space' || this.hyperspace.active);
    const shake = this.lastRailShakeSample;
    const applyShake = shake.active && this.mode === 'space';
    const savedFov = this.camera.fov;

    if (applyShake) {
      this.tmpRailSavedPos.copy(this.camera.position);
      this.tmpRailSavedQuat.copy(this.camera.quaternion);

      this.tmpRailCamRight.set(1, 0, 0).applyQuaternion(this.tmpRailSavedQuat);
      this.tmpRailCamUp.set(0, 1, 0).applyQuaternion(this.tmpRailSavedQuat);
      this.tmpRailCamFwd.set(0, 0, -1).applyQuaternion(this.tmpRailSavedQuat);

      this.camera.position
        .addScaledVector(this.tmpRailCamRight, shake.offsetX)
        .addScaledVector(this.tmpRailCamUp, shake.offsetY)
        .addScaledVector(this.tmpRailCamFwd, shake.offsetZ);

      this.tmpRailEuler.set(shake.pitchRad, shake.yawRad, shake.rollRad, 'YXZ');
      this.tmpRailKickQuat.setFromEuler(this.tmpRailEuler);
      this.camera.quaternion.multiply(this.tmpRailKickQuat);

      if (Math.abs(shake.fovPunchDeg) > 0.02) {
        this.camera.fov = THREE.MathUtils.clamp(savedFov + shake.fovPunchDeg, 44, 82);
        this.camera.updateProjectionMatrix();
      }
    }

    const hasRailDistortion = this.mode === 'space' && this.updateRailDistortionUniforms();

    const usePost =
      !this.capabilities.isSoftwareGl &&
      this.composer !== null &&
      GRAPHICS_PRESETS[this.graphicsPreset].postProcessingEnabled;
    if (usePost && this.composer) {
      this.composer.render();
    } else if (hasRailDistortion) {
      this.railDistortionBlit.renderWithDistortion(this.renderer, this.scene, this.camera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    if (applyShake) {
      this.camera.position.copy(this.tmpRailSavedPos);
      this.camera.quaternion.copy(this.tmpRailSavedQuat);
      if (this.camera.fov !== savedFov) {
        this.camera.fov = savedFov;
        this.camera.updateProjectionMatrix();
      }
    }
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (!this.capabilities.isSoftwareGl) {
      this.rafId = requestAnimationFrame(() => this.animate());
      return;
    }

    // Software WebGL fence-sync pacing so browser inputs & Playwright stay crisp without flooding SwiftShader
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      window.setTimeout(() => {
        if (!this.disposed) this.rafId = requestAnimationFrame(() => this.animate());
      }, 120);
      return;
    }
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      if (gl.clientWaitSync(sync, 0, 0) === gl.TIMEOUT_EXPIRED) {
        window.setTimeout(poll, 20);
        return;
      }
      gl.deleteSync(sync);
      window.setTimeout(() => {
        if (!this.disposed) this.rafId = requestAnimationFrame(() => this.animate());
      }, 85);
    };
    window.setTimeout(poll, 20);
  }

  private animate(): void {
    if (this.disposed) return;

    const now = performance.now();
    const rawDtMs = now - this.lastTime;
    const dt = Math.min(rawDtMs / 1000, 0.05);
    this.lastTime = now;

    if (rawDtMs > 0.5 && rawDtMs < 2000) {
      this.frameTimesMs.push(rawDtMs);
      if (this.frameTimesMs.length > 90) this.frameTimesMs.shift();
    }

    if (this.mode !== 'paused') {
      this.elapsed += dt;

      if (
        this.mode === 'title' ||
        this.mode === 'war_map' ||
        this.mode === 'ending' ||
        this.mode === 'mission_results' ||
        this.mode === 'mission_briefing' ||
        this.mode === 'mission_failed'
      ) {
        this.updateTitleCamera();
        this.valkyrie.updateVisuals(dt, this.elapsed, 0, 0);
        this.spaceCombat.update(dt, this.elapsed, this.valkyrie, this.camera, false);
      } else if (this.mode === 'mission_transition') {
        this.transitionTimer += dt;
        const p = Math.min(1, this.transitionTimer / this.transitionDurationSec);
        const shipPos = this.valkyrie.root.position;
        const angle = p * Math.PI * 1.15 + 0.45;
        const radius = 21 - p * 3.5;
        this.camera.position.set(
          shipPos.x + Math.cos(angle) * radius,
          shipPos.y + 4.8 + Math.sin(p * Math.PI) * 2.2,
          shipPos.z + Math.sin(angle) * radius,
        );
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(shipPos.x, shipPos.y + 0.6, shipPos.z);
        if (Math.abs(this.camera.fov - 50) > 0.2) {
          this.camera.fov = 50;
          this.camera.updateProjectionMatrix();
        }
        this.valkyrie.setThrustLevel(0.68, false, false);
        this.valkyrie.updateVisuals(dt, this.elapsed, 0.08, 0);
        this.spaceCombat.update(dt, this.elapsed, this.valkyrie, this.camera, false);
        if (this.transitionTimer >= this.transitionDurationSec) {
          this.skipMissionTransition();
        }
      } else if (this.mode === 'cinematic') {
        this.updateOrbitalCinematic(dt);
        this.spaceCombat.update(dt, this.elapsed, this.valkyrie, this.camera, false);
      } else if (this.mode === 'space') {
        if (this.hyperspace.active) {
          const destRegion = this.hyperspace.destinationRegionId;
          const pendingMission = this.hyperspacePendingMission;
          const pendingLevel = this.hyperspacePendingLevel;
          const stepRes = stepHyperspaceTransition(this.hyperspace, dt);
          this.hyperspace = stepRes.state;
          this.valkyrie.setThrustLevel(1.85, true, true);
          this.valkyrie.updateVisuals(dt, this.elapsed, 0, 0);
          const targetFov = 58 + this.hyperspace.streakIntensity * 22;
          if (Math.abs(this.camera.fov - targetFov) > 0.25) {
            this.camera.fov = targetFov;
            this.camera.updateProjectionMatrix();
          }
          if (stepRes.shouldCommitArrivalNow && destRegion) {
            this.commitHyperspaceArrival(destRegion, pendingMission, pendingLevel);
          }
          if (stepRes.completedNow) {
            this.hyperspacePendingMission = null;
            this.hyperspacePendingLevel = null;
            this.camera.fov = this.valkyrie.getViewMode() === 'cockpit' ? 68 : 60;
            this.camera.updateProjectionMatrix();
            this.pushHudSnapshot(true);
          }
        } else if (!this.debugCameraOverride) {
          this.spaceCombat.update(dt, this.elapsed, this.valkyrie, this.camera, true);
        } else {
          this.valkyrie.updateVisuals(dt, this.elapsed, 0, 0);
        }
        if (this.pendingFailureDelay > 0) {
          this.pendingFailureDelay -= dt;
          if (this.pendingFailureDelay <= 0) {
            this.pendingFailureDelay = 0;
            this.exitPointerLock();
            this.clearAllInputs();
            this.mode = 'mission_failed';
            this.pushHudSnapshot(true);
          }
        }
      }

      this.explosions.update(dt);
      this.stepRailImpactFx(dt);
      if (this.enemyInfoModeToastTimer > 0) {
        this.enemyInfoModeToastTimer = Math.max(0, this.enemyInfoModeToastTimer - dt);
        if (this.enemyInfoModeToastTimer <= 0) {
          this.enemyInfoModeToast = null;
        }
      }

      // Modulate continuous spacecraft engine & boost/supercruise thruster soundscape
      if (this.mode === 'space') {
        const sp = this.spaceCombat.getHudSnapshot();
        this.audio.updateEngineThruster(
          sp.throttlePct / 100,
          sp.isBoosting,
          sp.isSupercruise,
          !sp.isDestroyed,
        );
      } else {
        this.audio.updateEngineThruster(0, false, false, false);
      }

      if (
        !this.capabilities.isSoftwareGl &&
        this.controlSettings.adaptiveResolution &&
        now - this.lastAdaptiveCheck > 900 &&
        this.frameTimesMs.length >= 40
      ) {
        this.lastAdaptiveCheck = now;
        const stats = computeFpsStats(this.frameTimesMs);
        const cfg = GRAPHICS_PRESETS[this.graphicsPreset];
        if (stats.avgFps < 46 && this.resolutionScale > cfg.dynamicResolutionMin) {
          this.resolutionScale = Math.max(cfg.dynamicResolutionMin, this.resolutionScale - 0.08);
          this.applyGraphicsPreset(this.graphicsPreset);
        } else if (stats.avgFps > 57 && this.resolutionScale < 1.0) {
          this.resolutionScale = Math.min(1.0, this.resolutionScale + 0.05);
          this.applyGraphicsPreset(this.graphicsPreset);
        }
      }
    } else {
      this.audio.updateEngineThruster(0, false, false, false);
    }

    this.renderOneFrame();
    this.pushHudSnapshot(false);
    this.scheduleNextFrame();
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.exitPointerLock();

    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('orientationchange', this.boundResize);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundWindowBlur);
    window.removeEventListener('pagehide', this.boundPageHide);
    window.removeEventListener('beforeunload', this.boundPageHide);
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.boundPointerDown);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointercancel', this.boundPointerUp);
    el.removeEventListener('contextmenu', this.boundContextMenu);

    this.audio.dispose();
    this.explosions.dispose();
    this.valkyrie.dispose();
    this.spaceCombat.dispose();
    this.composer?.dispose();
    this.railDistortionBlit.dispose();
    this.mats.dispose();
    this.texPack.dispose();
    this.envRT.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    if (el.parentNode === this.container) {
      this.container.removeChild(el);
    }
  }
}
