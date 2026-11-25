import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MOBILE_CONTROL_SETTINGS,
  classifyDeviceProfile,
  computeTouchLayoutMetrics,
  deserializeMobileSettings,
  evaluateVirtualJoystick,
  serializeMobileSettings,
} from './mobileControls';

test('classifyDeviceProfile accurately detects small phone, large phone, tablet, and desktop', () => {
  const smallPhonePortrait = classifyDeviceProfile({
    viewportWidth: 375,
    viewportHeight: 667,
    maxTouchPoints: 5,
    hasTouchEvent: true,
    coarsePointer: true,
    anyCoarsePointer: true,
    finePointer: false,
    devicePixelRatio: 2,
    hardwareConcurrency: 4,
  });
  assert.equal(smallPhonePortrait.formFactor, 'small_phone');
  assert.equal(smallPhonePortrait.orientation, 'portrait');
  assert.equal(smallPhonePortrait.useTouchControls, true);
  assert.equal(smallPhonePortrait.showPortraitHint, true);
  assert.equal(smallPhonePortrait.recommendedGraphicsPreset, 'mobile_low');

  const largePhoneLandscape = classifyDeviceProfile({
    viewportWidth: 844,
    viewportHeight: 390,
    maxTouchPoints: 5,
    hasTouchEvent: true,
    coarsePointer: true,
    anyCoarsePointer: true,
    finePointer: false,
    devicePixelRatio: 3,
    hardwareConcurrency: 6,
  });
  assert.equal(largePhoneLandscape.formFactor, 'large_phone');
  assert.equal(largePhoneLandscape.orientation, 'landscape');
  assert.equal(largePhoneLandscape.useTouchControls, true);
  assert.equal(largePhoneLandscape.showPortraitHint, false);
  assert.equal(largePhoneLandscape.recommendedGraphicsPreset, 'mobile_balanced');

  const tabletLandscape = classifyDeviceProfile({
    viewportWidth: 1024,
    viewportHeight: 768,
    maxTouchPoints: 5,
    hasTouchEvent: true,
    coarsePointer: true,
    anyCoarsePointer: true,
    finePointer: false,
    devicePixelRatio: 2,
    hardwareConcurrency: 8,
  });
  assert.equal(tabletLandscape.formFactor, 'tablet');
  assert.equal(tabletLandscape.useTouchControls, true);
  assert.equal(tabletLandscape.recommendedGraphicsPreset, 'mobile_high');
  assert.equal(tabletLandscape.showPortraitHint, false);

  const desktop = classifyDeviceProfile({
    viewportWidth: 1440,
    viewportHeight: 900,
    maxTouchPoints: 0,
    hasTouchEvent: false,
    coarsePointer: false,
    anyCoarsePointer: false,
    finePointer: true,
    devicePixelRatio: 1,
    hardwareConcurrency: 8,
  });
  assert.equal(desktop.formFactor, 'desktop');
  assert.equal(desktop.useTouchControls, false);
  assert.equal(desktop.recommendedGraphicsPreset, 'high');
});

test('classifyDeviceProfile respects manual controlModeOverride (touch/desktop)', () => {
  const desktopInput = {
    viewportWidth: 1440,
    viewportHeight: 900,
    maxTouchPoints: 0,
    hasTouchEvent: false,
    coarsePointer: false,
    anyCoarsePointer: false,
    finePointer: true,
    devicePixelRatio: 1,
  };
  assert.equal(classifyDeviceProfile(desktopInput, 'touch').useTouchControls, true);

  const phoneInput = {
    viewportWidth: 844,
    viewportHeight: 390,
    maxTouchPoints: 5,
    hasTouchEvent: true,
    coarsePointer: true,
    anyCoarsePointer: true,
    finePointer: false,
    devicePixelRatio: 2,
  };
  assert.equal(classifyDeviceProfile(phoneInput, 'desktop').useTouchControls, false);
});

test('evaluateVirtualJoystick enforces deadzone, radial clamping, and smooth curve', () => {
  const neutral = evaluateVirtualJoystick(0, 0, 60, 0.12);
  assert.equal(neutral.x, 0);
  assert.equal(neutral.y, 0);
  assert.equal(neutral.magnitude, 0);

  const insideDeadzone = evaluateVirtualJoystick(4, 3, 60, 0.12);
  assert.equal(insideDeadzone.x, 0);
  assert.equal(insideDeadzone.y, 0);
  assert.equal(insideDeadzone.magnitude, 0);

  const clampedMax = evaluateVirtualJoystick(180, 0, 60, 0.12);
  assert.equal(clampedMax.clampedDx, 60);
  assert.equal(clampedMax.clampedDy, 0);
  assert.equal(clampedMax.x, 1);
  assert.equal(clampedMax.magnitude, 1);

  const mid = evaluateVirtualJoystick(0, -36, 60, 0.12);
  assert.ok(mid.y < 0 && mid.y > -0.65);
  assert.ok(mid.magnitude > 0 && mid.magnitude < 0.65);
});

test('computeTouchLayoutMetrics adapts ergonomic sizes for small phone vs tablet and respects user scale', () => {
  const smallPhone = classifyDeviceProfile({
    viewportWidth: 667,
    viewportHeight: 375,
    maxTouchPoints: 5,
    hasTouchEvent: true,
    coarsePointer: true,
    anyCoarsePointer: true,
    finePointer: false,
    devicePixelRatio: 2,
  });
  const tablet = classifyDeviceProfile({
    viewportWidth: 1024,
    viewportHeight: 768,
    maxTouchPoints: 5,
    hasTouchEvent: true,
    coarsePointer: true,
    anyCoarsePointer: true,
    finePointer: false,
    devicePixelRatio: 2,
  });

  const phoneMetrics = computeTouchLayoutMetrics(smallPhone, DEFAULT_MOBILE_CONTROL_SETTINGS);
  const tabletMetrics = computeTouchLayoutMetrics(tablet, DEFAULT_MOBILE_CONTROL_SETTINGS);

  assert.ok(tabletMetrics.joystickDiameterPx > phoneMetrics.joystickDiameterPx);
  assert.ok(tabletMetrics.primaryButtonPx > phoneMetrics.primaryButtonPx);
  assert.equal(phoneMetrics.showInlineRollButtons, false);
  assert.equal(tabletMetrics.showInlineRollButtons, true);

  const largeSettings = { ...DEFAULT_MOBILE_CONTROL_SETTINGS, joystickSize: 'large' as const };
  const scaledPhone = computeTouchLayoutMetrics(smallPhone, largeSettings);
  assert.ok(scaledPhone.joystickDiameterPx > phoneMetrics.joystickDiameterPx);
});

test('mobile settings serialize, deserialize, and clamp out-of-range values safely', () => {
  const custom = {
    ...DEFAULT_MOBILE_CONTROL_SETTINGS,
    leftHanded: true,
    joystickSensitivity: 1.45,
    buttonOpacity: 0.72,
    buttonOffsetX: 18,
    buttonOffsetY: -22,
    hapticsEnabled: false,
  };
  const roundTrip = deserializeMobileSettings(serializeMobileSettings(custom));
  assert.equal(roundTrip.leftHanded, true);
  assert.equal(roundTrip.joystickSensitivity, 1.45);
  assert.equal(roundTrip.buttonOpacity, 0.72);
  assert.equal(roundTrip.buttonOffsetX, 18);
  assert.equal(roundTrip.buttonOffsetY, -22);
  assert.equal(roundTrip.hapticsEnabled, false);

  const clamped = deserializeMobileSettings(
    JSON.stringify({
      joystickSensitivity: 99,
      buttonOpacity: 0.05,
      buttonOffsetX: 200,
      enemyInfoDisplayMode: 'bogus_mode',
      enemyInfoToggleKey: '',
    }),
  );
  assert.equal(clamped.joystickSensitivity, 2.0);
  assert.equal(clamped.buttonOpacity, 0.45);
  assert.equal(clamped.buttonOffsetX, 32);
  assert.equal(clamped.enemyInfoDisplayMode, 'full');
  assert.equal(clamped.enemyInfoToggleKey, 'F5');

  const persistedInfo = deserializeMobileSettings(
    serializeMobileSettings({
      ...DEFAULT_MOBILE_CONTROL_SETTINGS,
      enemyInfoDisplayMode: 'off',
      enemyInfoToggleKey: 'KeyI',
    }),
  );
  assert.equal(persistedInfo.enemyInfoDisplayMode, 'off');
  assert.equal(persistedInfo.enemyInfoToggleKey, 'KeyI');
});

