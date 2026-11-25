import type { GraphicsPresetId } from './streamingManager';
import { isCameraShakeMode, type CameraShakeMode } from './weaponFeedback';
import { isEnemyInfoDisplayMode, type EnemyInfoDisplayMode } from './targetHudLayout';
import type { AimAssistMode } from './ballistics';

export type DeviceFormFactor = 'small_phone' | 'large_phone' | 'tablet' | 'desktop';
export type ControlModeOverride = 'auto' | 'touch' | 'desktop';
export type TouchControlScale = 'compact' | 'standard' | 'large';
export type ScreenOrientationKind = 'landscape' | 'portrait';

export interface DeviceDetectionInput {
  viewportWidth: number;
  viewportHeight: number;
  maxTouchPoints: number;
  hasTouchEvent: boolean;
  coarsePointer: boolean;
  anyCoarsePointer: boolean;
  finePointer: boolean;
  devicePixelRatio: number;
  hardwareConcurrency?: number;
}

export interface DeviceProfile {
  formFactor: DeviceFormFactor;
  orientation: ScreenOrientationKind;
  isTouchCapable: boolean;
  useTouchControls: boolean;
  viewportWidth: number;
  viewportHeight: number;
  recommendedGraphicsPreset: GraphicsPresetId;
  recommendedJoystickSize: TouchControlScale;
  recommendedButtonSize: TouchControlScale;
  showPortraitHint: boolean;
}

export interface MobileControlSettings {
  controlModeOverride: ControlModeOverride;
  joystickSensitivity: number; // 0.4 .. 2.0
  cameraSensitivity: number; // 0.4 .. 2.0
  targetTrackingAssist: boolean;
  gentleAimAssist: boolean;
  aimAssistMode: AimAssistMode;
  autoRollStabilize: boolean;
  flightAssist: boolean;
  invertFlightY: boolean;
  joystickSize: TouchControlScale;
  buttonSize: TouchControlScale;
  buttonOpacity: number; // 0.45 .. 1.0
  leftHanded: boolean;
  buttonOffsetX: number; // -32 .. +32 px
  buttonOffsetY: number; // -40 .. +40 px
  hapticsEnabled: boolean;
  portraitHintDismissed: boolean;
  cameraShakeMode: CameraShakeMode;
  enemyInfoDisplayMode: EnemyInfoDisplayMode;
  enemyInfoToggleKey: string;
}

export const MOBILE_SETTINGS_STORAGE_KEY = 'aether_prime_mobile_controls_v1';

export const DEFAULT_MOBILE_CONTROL_SETTINGS: MobileControlSettings = {
  controlModeOverride: 'auto',
  joystickSensitivity: 1.0,
  cameraSensitivity: 1.0,
  targetTrackingAssist: true,
  gentleAimAssist: true,
  aimAssistMode: 'subtle',
  autoRollStabilize: true,
  flightAssist: true,
  invertFlightY: false,
  joystickSize: 'standard',
  buttonSize: 'standard',
  buttonOpacity: 0.86,
  leftHanded: false,
  buttonOffsetX: 0,
  buttonOffsetY: 0,
  hapticsEnabled: true,
  portraitHintDismissed: false,
  cameraShakeMode: 'full',
  enemyInfoDisplayMode: 'full',
  enemyInfoToggleKey: 'F5',
};

/**
 * Pure device and input capability classifier.
 * Never relies solely on user-agent strings; evaluates real touch points, pointer media queries,
 * viewport dimensions, and orientation.
 */
export function classifyDeviceProfile(
  input: DeviceDetectionInput,
  override: ControlModeOverride = 'auto',
): DeviceProfile {
  const w = Math.max(240, Math.round(input.viewportWidth));
  const h = Math.max(240, Math.round(input.viewportHeight));
  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);
  const orientation: ScreenOrientationKind = w >= h ? 'landscape' : 'portrait';

  const isTouchCapable =
    input.maxTouchPoints > 0 ||
    input.hasTouchEvent ||
    input.coarsePointer ||
    input.anyCoarsePointer;

  let formFactor: DeviceFormFactor = 'desktop';
  if (isTouchCapable) {
    if (minDim <= 390 && maxDim <= 740) {
      formFactor = 'small_phone';
    } else if (minDim < 600 && maxDim < 1000) {
      formFactor = 'large_phone';
    } else if (maxDim <= 1400 && (input.coarsePointer || !input.finePointer || minDim <= 900)) {
      formFactor = 'tablet';
    } else {
      // Large touchscreen desktop/laptop with mouse — default to desktop unless coarse-only
      formFactor = input.coarsePointer && !input.finePointer ? 'tablet' : 'desktop';
    }
  } else if (maxDim < 920 && minDim < 520) {
    // Narrow mobile viewport without touch API (e.g., mobile preview window)
    formFactor = minDim <= 390 ? 'small_phone' : 'large_phone';
  }

  let useTouchControls = formFactor !== 'desktop';
  if (override === 'touch') useTouchControls = true;
  else if (override === 'desktop') useTouchControls = false;

  const cores = input.hardwareConcurrency ?? 4;
  let recommendedGraphicsPreset: GraphicsPresetId = 'high';
  if (formFactor === 'small_phone') {
    recommendedGraphicsPreset = cores >= 6 ? 'mobile_balanced' : 'mobile_low';
  } else if (formFactor === 'large_phone') {
    recommendedGraphicsPreset = cores >= 6 ? 'mobile_balanced' : 'mobile_low';
  } else if (formFactor === 'tablet') {
    recommendedGraphicsPreset = cores >= 6 ? 'mobile_high' : 'mobile_balanced';
  } else {
    recommendedGraphicsPreset = 'high';
  }

  const recommendedJoystickSize: TouchControlScale =
    formFactor === 'small_phone' ? 'compact' : formFactor === 'tablet' ? 'large' : 'standard';
  const recommendedButtonSize: TouchControlScale =
    formFactor === 'small_phone' ? 'compact' : formFactor === 'tablet' ? 'large' : 'standard';

  const showPortraitHint =
    useTouchControls &&
    orientation === 'portrait' &&
    (formFactor === 'small_phone' || formFactor === 'large_phone');

  return {
    formFactor,
    orientation,
    isTouchCapable,
    useTouchControls,
    viewportWidth: w,
    viewportHeight: h,
    recommendedGraphicsPreset,
    recommendedJoystickSize,
    recommendedButtonSize,
    showPortraitHint,
  };
}

/**
 * Reads real browser viewport, pointer media queries, and touch capabilities.
 */
export function detectBrowserDeviceProfile(
  override: ControlModeOverride = 'auto',
): DeviceProfile {
  if (typeof window === 'undefined') {
    return classifyDeviceProfile(
      {
        viewportWidth: 1440,
        viewportHeight: 900,
        maxTouchPoints: 0,
        hasTouchEvent: false,
        coarsePointer: false,
        anyCoarsePointer: false,
        finePointer: true,
        devicePixelRatio: 1,
        hardwareConcurrency: 8,
      },
      override,
    );
  }

  const mm = (q: string): boolean => {
    try {
      return typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
    } catch {
      return false;
    }
  };

  return classifyDeviceProfile(
    {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0,
      hasTouchEvent: 'ontouchstart' in window,
      coarsePointer: mm('(pointer: coarse)'),
      anyCoarsePointer: mm('(any-pointer: coarse)'),
      finePointer: mm('(pointer: fine)'),
      devicePixelRatio: window.devicePixelRatio || 1,
      hardwareConcurrency:
        typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
    },
    override,
  );
}

export interface VirtualJoystickSample {
  x: number; // -1..1 (left/right yaw)
  y: number; // -1..1 (up/down pitch)
  magnitude: number; // 0..1
  clampedDx: number; // px for visual thumb puck
  clampedDy: number; // px for visual thumb puck
}

/**
 * Pure virtual flight joystick evaluation with radial clamp, deadzone, and smooth response curve.
 */
export function evaluateVirtualJoystick(
  dx: number,
  dy: number,
  maxRadiusPx: number,
  deadzone = 0.12,
): VirtualJoystickSample {
  const safeMax = Math.max(20, maxRadiusPx);
  const rawDist = Math.hypot(dx, dy);
  if (rawDist < 0.001) {
    return { x: 0, y: 0, magnitude: 0, clampedDx: 0, clampedDy: 0 };
  }

  const clampedDist = Math.min(safeMax, rawDist);
  const dirX = dx / rawDist;
  const dirY = dy / rawDist;
  const normMag = clampedDist / safeMax;

  if (normMag <= deadzone) {
    return {
      x: 0,
      y: 0,
      magnitude: 0,
      clampedDx: dirX * clampedDist,
      clampedDy: dirY * clampedDist,
    };
  }

  // Remap [deadzone..1] -> [0..1] with gentle quadratic curve for fine aiming near center
  const remapped = (normMag - deadzone) / (1 - deadzone);
  const curved = remapped * (0.45 + 0.55 * remapped);

  return {
    x: Number((dirX * curved).toFixed(4)),
    y: Number((dirY * curved).toFixed(4)),
    magnitude: Number(curved.toFixed(4)),
    clampedDx: Number((dirX * clampedDist).toFixed(1)),
    clampedDy: Number((dirY * clampedDist).toFixed(1)),
  };
}

export interface TouchLayoutMetrics {
  joystickDiameterPx: number;
  thumbDiameterPx: number;
  primaryButtonPx: number;
  secondaryButtonPx: number;
  utilityButtonPx: number;
  showInlineRollButtons: boolean;
  compactTopHud: boolean;
}

/**
 * Computes ergonomic touch control dimensions scaled cleanly for small phones, large phones, and tablets.
 */
export function computeTouchLayoutMetrics(
  profile: DeviceProfile,
  settings: MobileControlSettings,
): TouchLayoutMetrics {
  const joyScale =
    settings.joystickSize === 'compact' ? 0.86 : settings.joystickSize === 'large' ? 1.18 : 1.0;
  const btnScale =
    settings.buttonSize === 'compact' ? 0.88 : settings.buttonSize === 'large' ? 1.16 : 1.0;

  if (profile.formFactor === 'small_phone') {
    return {
      joystickDiameterPx: Math.round(108 * joyScale),
      thumbDiameterPx: Math.round(44 * joyScale),
      primaryButtonPx: Math.round(62 * btnScale),
      secondaryButtonPx: Math.round(46 * btnScale),
      utilityButtonPx: 40,
      showInlineRollButtons: false,
      compactTopHud: true,
    };
  }

  if (profile.formFactor === 'tablet') {
    return {
      joystickDiameterPx: Math.round(142 * joyScale),
      thumbDiameterPx: Math.round(56 * joyScale),
      primaryButtonPx: Math.round(76 * btnScale),
      secondaryButtonPx: Math.round(56 * btnScale),
      utilityButtonPx: 48,
      showInlineRollButtons: true,
      compactTopHud: false,
    };
  }

  // large_phone or forced touch on desktop
  return {
    joystickDiameterPx: Math.round(124 * joyScale),
    thumbDiameterPx: Math.round(50 * joyScale),
    primaryButtonPx: Math.round(68 * btnScale),
    secondaryButtonPx: Math.round(50 * btnScale),
    utilityButtonPx: 44,
    showInlineRollButtons: profile.orientation === 'landscape' && profile.viewportWidth >= 780,
    compactTopHud: profile.viewportHeight < 460,
  };
}

export function triggerHapticFeedback(
  enabled: boolean,
  pattern: 'tap' | 'fire' | 'lock' | 'boost' | 'impact' | 'warning',
): void {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    if (pattern === 'tap') navigator.vibrate(10);
    else if (pattern === 'fire') navigator.vibrate(8);
    else if (pattern === 'lock') navigator.vibrate([14, 24, 14]);
    else if (pattern === 'boost') navigator.vibrate(22);
    else if (pattern === 'warning') navigator.vibrate([25, 35, 25]);
    else if (pattern === 'impact') navigator.vibrate([45, 20, 35]);
  } catch {
    // Ignore unsupported vibration environments
  }
}

export function serializeMobileSettings(settings: MobileControlSettings): string {
  return JSON.stringify(settings);
}

export function deserializeMobileSettings(raw: string | null): MobileControlSettings {
  if (!raw) return { ...DEFAULT_MOBILE_CONTROL_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<MobileControlSettings>;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_MOBILE_CONTROL_SETTINGS };
    const parsedAimAssist =
      parsed.aimAssistMode === 'off' ||
      parsed.aimAssistMode === 'subtle' ||
      parsed.aimAssistMode === 'standard'
        ? parsed.aimAssistMode
        : parsed.gentleAimAssist === false
          ? 'off'
          : 'subtle';
    return {
      ...DEFAULT_MOBILE_CONTROL_SETTINGS,
      ...parsed,
      aimAssistMode: parsedAimAssist,
      gentleAimAssist: parsedAimAssist !== 'off',
      joystickSensitivity: Math.max(0.4, Math.min(2.0, Number(parsed.joystickSensitivity ?? 1.0))),
      cameraSensitivity: Math.max(0.4, Math.min(2.0, Number(parsed.cameraSensitivity ?? 1.0))),
      buttonOpacity: Math.max(0.45, Math.min(1.0, Number(parsed.buttonOpacity ?? 0.86))),
      buttonOffsetX: Math.max(-32, Math.min(32, Math.round(Number(parsed.buttonOffsetX ?? 0)))),
      buttonOffsetY: Math.max(-40, Math.min(40, Math.round(Number(parsed.buttonOffsetY ?? 0)))),
      cameraShakeMode: isCameraShakeMode(parsed.cameraShakeMode) ? parsed.cameraShakeMode : 'full',
      enemyInfoDisplayMode: isEnemyInfoDisplayMode(parsed.enemyInfoDisplayMode)
        ? parsed.enemyInfoDisplayMode
        : 'full',
      enemyInfoToggleKey:
        typeof parsed.enemyInfoToggleKey === 'string' &&
        /^[A-Za-z0-9]{1,12}$/.test(parsed.enemyInfoToggleKey)
          ? parsed.enemyInfoToggleKey
          : 'F5',
    };
  } catch {
    return { ...DEFAULT_MOBILE_CONTROL_SETTINGS };
  }
}

export function loadMobileSettingsFromStorage(): MobileControlSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_MOBILE_CONTROL_SETTINGS };
    }
    return deserializeMobileSettings(window.localStorage.getItem(MOBILE_SETTINGS_STORAGE_KEY));
  } catch {
    return { ...DEFAULT_MOBILE_CONTROL_SETTINGS };
  }
}

export function saveMobileSettingsToStorage(settings: MobileControlSettings): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(MOBILE_SETTINGS_STORAGE_KEY, serializeMobileSettings(settings));
    return true;
  } catch {
    return false;
  }
}
