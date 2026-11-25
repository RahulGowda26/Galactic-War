import type { SpaceWeaponId } from '../world/spacePhysics';

export interface SpatialAudioCue {
  pan?: number; // -1 (left) .. +1 (right)
  gain?: number; // 0.08 .. 1.0 distance attenuation
  lowpassHz?: number; // optional behind-camera / distance dulling
}

export interface AudioDiagnosticsSnapshot {
  initialized: boolean;
  contextState: AudioContextState | 'uninitialized';
  muted: boolean;
  masterVolume?: number;
  weaponVolume?: number;
  cuesPlayed: number;
  weaponFireCues: number;
  weaponImpactCues: number;
  lastWeaponImpact: SpaceWeaponId | null;
  lastSpatialPan: number;
}

/**
 * Procedural Spatial Web Audio Space Warfare Soundscape Engine.
 * Synthesizes dynamic spacecraft thruster/boost/supercruise hum, distinct spatial weapon fire
 * and weapon impact cues for all 5 spacecraft weapons (Pulse, Plasma, Missile, EMP, Rail Cannon),
 * directional explosions, capital ship cannons, countermeasures, collisions, and mission cues.
 * Uses a master DynamicsCompressorNode + voice throttling for clean, clipping-free dogfight mixes.
 */
export class BattlefieldAudioEngine {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private weaponGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Royal Enfield Continental GT 650 270° twin-cylinder exhaust gunfire sound buffers
  private pulseGt650Buffers: AudioBuffer[] = [];
  private plasmaGt650Buffers: AudioBuffer[] = [];
  private pulseBufferIndex = 0;
  private plasmaBufferIndex = 0;

  // Dynamic spacecraft thruster & deep-space hull resonance nodes
  private thrusterOsc: OscillatorNode | null = null;
  private thrusterSubOsc: OscillatorNode | null = null;
  private thrusterFilter: BiquadFilterNode | null = null;
  private thrusterGain: GainNode | null = null;
  private boostNoiseFilter: BiquadFilterNode | null = null;
  private boostNoiseGain: GainNode | null = null;

  private muted = false;
  private masterVolume = 0.44;
  private weaponVolume = 1.0;
  private initialized = false;

  // Voice rate limiter & runtime diagnostics
  private lastCueMs: Map<string, number> = new Map();
  private cuesPlayed = 0;
  private weaponFireCues = 0;
  private weaponImpactCues = 0;
  private lastWeaponImpact: SpaceWeaponId | null = null;
  private lastSpatialPan = 0;

  public unlock(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      this.ctx = ctx;

      // Soft-knee dynamics compressor prevents clipping when multiple explosions + cannons overlap
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 18;
      comp.ratio.value = 6;
      comp.attack.value = 0.004;
      comp.release.value = 0.14;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : this.masterVolume;
      comp.connect(master);
      master.connect(ctx.destination);
      this.compressor = comp;
      this.masterGain = master;

      // Dedicated weapon audio stage routed into master compressor
      const weaponBus = ctx.createGain();
      weaponBus.gain.value = this.weaponVolume;
      weaponBus.connect(comp);
      this.weaponGain = weaponBus;

      // Pre-synthesize organic Royal Enfield GT 650 270° twin-cylinder exhaust gunfire soundscapes
      this.generateGt650Buffers(ctx);

      // Pre-generate 2.5s reusable white noise buffer for exhaust, weapons, shrapnel & explosions
      const bufSize = Math.floor(ctx.sampleRate * 2.5);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;

      // Subtle deep-space cabin / hull resonance (replaces ground planetary storm wind)
      const hullDrone = ctx.createOscillator();
      hullDrone.type = 'sine';
      hullDrone.frequency.value = 42;
      const hullLp = ctx.createBiquadFilter();
      hullLp.type = 'lowpass';
      hullLp.frequency.value = 88;
      const hullGain = ctx.createGain();
      hullGain.gain.value = 0.075;
      hullDrone.connect(hullLp).connect(hullGain).connect(comp);
      hullDrone.start();

      // Dynamic continuous spacecraft ion-thruster & afterburner hum
      const tOsc = ctx.createOscillator();
      tOsc.type = 'sawtooth';
      tOsc.frequency.value = 56;
      const tSub = ctx.createOscillator();
      tSub.type = 'triangle';
      tSub.frequency.value = 28;
      const tFilter = ctx.createBiquadFilter();
      tFilter.type = 'lowpass';
      tFilter.frequency.value = 135;
      tFilter.Q.value = 1.6;
      const tGain = ctx.createGain();
      tGain.gain.value = 0.001;
      tOsc.connect(tFilter);
      tSub.connect(tFilter);
      tFilter.connect(tGain).connect(comp);
      tOsc.start();
      tSub.start();
      this.thrusterOsc = tOsc;
      this.thrusterSubOsc = tSub;
      this.thrusterFilter = tFilter;
      this.thrusterGain = tGain;

      // Boost / Supercruise plasma exhaust wash (silent when idle)
      const boostSrc = ctx.createBufferSource();
      boostSrc.buffer = buf;
      boostSrc.loop = true;
      const bFilter = ctx.createBiquadFilter();
      bFilter.type = 'bandpass';
      bFilter.frequency.value = 240;
      bFilter.Q.value = 1.1;
      const bGain = ctx.createGain();
      bGain.gain.value = 0.001;
      boostSrc.connect(bFilter).connect(bGain).connect(comp);
      boostSrc.start();
      this.boostNoiseFilter = bFilter;
      this.boostNoiseGain = bGain;

      this.initialized = true;
    } catch {
      // Ignore autoplay restrictions until next user gesture
    }
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1.0, vol));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setWeaponVolume(vol: number): void {
    this.weaponVolume = Math.max(0, Math.min(1.5, vol));
    if (this.weaponGain && this.ctx) {
      this.weaponGain.gain.setTargetAtTime(this.weaponVolume, this.ctx.currentTime, 0.05);
    }
  }

  public getWeaponVolume(): number {
    return this.weaponVolume;
  }

  public getDiagnostics(): AudioDiagnosticsSnapshot {
    return {
      initialized: this.initialized,
      contextState: this.ctx ? this.ctx.state : 'uninitialized',
      muted: this.muted,
      masterVolume: this.masterVolume,
      weaponVolume: this.weaponVolume,
      cuesPlayed: this.cuesPlayed,
      weaponFireCues: this.weaponFireCues,
      weaponImpactCues: this.weaponImpactCues,
      lastWeaponImpact: this.lastWeaponImpact,
      lastSpatialPan: this.lastSpatialPan,
    };
  }

  /**
   * Smoothly modulates continuous spacecraft engine pitch, filter resonance, and plasma wash
   * based on throttle speed, boost, supercruise, and active flight mode.
   */
  public updateEngineThruster(
    speedRatio: number,
    boosting: boolean,
    supercruise: boolean,
    activeInFlight: boolean,
  ): void {
    if (
      !this.ctx ||
      !this.thrusterOsc ||
      !this.thrusterSubOsc ||
      !this.thrusterFilter ||
      !this.thrusterGain ||
      !this.boostNoiseFilter ||
      !this.boostNoiseGain
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!activeInFlight || this.muted) {
      this.thrusterGain.gain.setTargetAtTime(0.001, now, 0.12);
      this.boostNoiseGain.gain.setTargetAtTime(0.001, now, 0.12);
      return;
    }

    const clampedSpeed = Math.max(0, Math.min(1.6, speedRatio));
    const baseFreq = supercruise
      ? 112 + clampedSpeed * 18
      : boosting
        ? 86 + clampedSpeed * 22
        : 48 + clampedSpeed * 34;
    const filterHz = supercruise
      ? 420
      : boosting
        ? 310
        : 115 + clampedSpeed * 135;
    const engineGain = supercruise ? 0.125 : boosting ? 0.115 : 0.045 + Math.min(1, clampedSpeed) * 0.045;
    const washGain = supercruise ? 0.095 : boosting ? 0.08 : Math.max(0.001, (clampedSpeed - 0.55) * 0.035);
    const washFreq = supercruise ? 560 : boosting ? 380 : 210;

    this.thrusterOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.thrusterSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.08);
    this.thrusterFilter.frequency.setTargetAtTime(filterHz, now, 0.08);
    this.thrusterGain.gain.setTargetAtTime(engineGain, now, 0.1);
    this.boostNoiseFilter.frequency.setTargetAtTime(washFreq, now, 0.1);
    this.boostNoiseGain.gain.setTargetAtTime(washGain, now, 0.1);
  }

  private canTriggerVoice(key: string, minGapMs: number): boolean {
    const nowMs = performance.now();
    const prev = this.lastCueMs.get(key) ?? -1e9;
    if (nowMs - prev < minGapMs) return false;
    this.lastCueMs.set(key, nowMs);
    return true;
  }

  /**
   * Builds a lightweight spatial output stage (StereoPannerNode + distance GainNode + optional
   * behind-camera lowpass filter) routed into either the weapon bus or the master compressor bus.
   */
  private createSpatialBus(spatial?: SpatialAudioCue, isWeapon = false): AudioNode {
    const dest = isWeapon && this.weaponGain ? this.weaponGain : (this.compressor ?? this.masterGain!);
    if (!this.ctx || !spatial) return dest;

    const gainVal = Math.max(0.08, Math.min(1.0, spatial.gain ?? 1.0));
    const panVal = Math.max(-0.95, Math.min(0.95, spatial.pan ?? 0));
    this.lastSpatialPan = Number(panVal.toFixed(3));

    const atten = this.ctx.createGain();
    atten.gain.value = gainVal;

    let tail: AudioNode = atten;
    if (typeof this.ctx.createStereoPanner === 'function' && Math.abs(panVal) > 0.005) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = panVal;
      tail.connect(panner);
      tail = panner;
    }
    tail.connect(dest);

    if (spatial.lowpassHz && spatial.lowpassHz < 16500) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = Math.max(1600, Math.min(18000, spatial.lowpassHz));
      lp.connect(atten);
      return lp;
    }

    return atten;
  }

  private recordCue(kind: 'other' | 'fire' | 'impact', weapon?: SpaceWeaponId): void {
    this.cuesPlayed++;
    if (kind === 'fire') this.weaponFireCues++;
    if (kind === 'impact') {
      this.weaponImpactCues++;
      if (weapon) this.lastWeaponImpact = weapon;
    }
  }

  public playRifleShot(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('fire');

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1650, now);
    bp.frequency.exponentialRampToValueAtTime(340, now + 0.09);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.45, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    src.connect(bp).connect(ng).connect(out);
    src.start(now, Math.random() * 1.2, 0.12);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.085);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.38, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(og).connect(out);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playReload(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    const clicks = [0, 0.42, 0.96];
    clicks.forEach((delay, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 2 ? 620 : 380, now + delay);
      osc.frequency.exponentialRampToValueAtTime(160, now + delay + 0.05);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.14, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);
      osc.connect(g).connect(out);
      osc.start(now + delay);
      osc.stop(now + delay + 0.07);
    });
  }

  public playHitmarker(killed: boolean): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!killed && !this.canTriggerVoice('hitmarker', 38)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(killed ? 1280 : 960, now);
    osc.frequency.exponentialRampToValueAtTime(killed ? 640 : 1420, now + 0.07);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(killed ? 0.28 : 0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playEnemyPlasma(spatial?: SpatialAudioCue): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('enemy_plasma', 65)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial);
    this.recordCue('other');
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(125, now + 0.14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playPlayerHit(spatial?: SpatialAudioCue): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial);
    this.recordCue('other');
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.22);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playFootstep(sprinting: boolean): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = sprinting ? 260 : 190;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(sprinting ? 0.12 : 0.075, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    src.connect(lp).connect(g).connect(out);
    src.start(now, Math.random() * 1.4, 0.08);
  }

  public playDistantExplosion(spatial?: SpatialAudioCue): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial);
    this.recordCue('other');
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(220, now);
    lp.frequency.exponentialRampToValueAtTime(42, now + 1.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.35);
    src.connect(lp).connect(g).connect(out);
    src.start(now, 0, 1.4);
  }

  public playSovereignHorn(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(56, now);
    osc.frequency.linearRampToValueAtTime(48, now + 2.4);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(240, now);
    lp.frequency.exponentialRampToValueAtTime(95, now + 2.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.32, now + 0.35);
    g.gain.exponentialRampToValueAtTime(0.001, now + 2.6);
    osc.connect(lp).connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 2.7);
  }

  public playSovereignRoar(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(118, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 1.35);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(340, now);
    bp.Q.value = 2.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, now);
    g.gain.linearRampToValueAtTime(0.42, now + 0.14);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
    osc.connect(bp).connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 1.5);
  }

  public playBruteSlam(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.36);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.55, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playEngineIgnite(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(180, now);
    lp.frequency.exponentialRampToValueAtTime(1400, now + 1.8);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, now);
    g.gain.linearRampToValueAtTime(0.44, now + 0.9);
    g.gain.exponentialRampToValueAtTime(0.001, now + 2.3);
    src.connect(lp).connect(g).connect(out);
    src.start(now, 0, 2.35);
  }

  // =========================================================================
  // SPATIALIZED 5-WEAPON FIRING CUES (Distinct Sonic Signatures + Wing Pan!)
  // =========================================================================
  public playSpaceLaser(pan = 0): void {
    this.playPulseCannon(pan);
  }

  public playWeaponFire(weapon: SpaceWeaponId, pan = 0): void {
    if (weapon === 'pulse') this.playPulseCannon(pan);
    else if (weapon === 'heavy_plasma') this.playHeavyPlasma(pan);
    else if (weapon === 'missile') this.playMissileLaunch(pan);
    else if (weapon === 'emp') this.playEmpDischarge(pan);
    else if (weapon === 'rail_cannon') this.playRailCannon(pan);
  }

  /**
   * Procedural AudioBuffer generator for the Royal Enfield Continental GT 650
   * 270° parallel-twin exhaust gunfire sound identity.
   *
   * Recreates the iconic mechanical motorcycle exhaust character in 4 tight layers:
   * 1. Gunshot Attack Crack: High-pressure unsealing shockwave (<16ms)
   * 2. Signature 270° Twin Piston Thump: Asymmetric saturated compression wave (155Hz -> 48Hz with sub-harmonic)
   * 3. Megaphone Exhaust Body Resonance: Tuned stainless cone acoustic chamber throat (205-225Hz bark)
   * 4. Gas Blast Tail: Short supersonic gas air expansion (<48ms)
   */
  private generateGt650Buffers(ctx: AudioContext): void {
    const pulseConfigs = [
      { resHz: 212, crackHz: 1680, dropStartHz: 155, dropEndHz: 48, subHz: 38 },
      { resHz: 218, crackHz: 1820, dropStartHz: 160, dropEndHz: 50, subHz: 40 },
      { resHz: 206, crackHz: 1620, dropStartHz: 152, dropEndHz: 47, subHz: 37 },
      { resHz: 224, crackHz: 1750, dropStartHz: 158, dropEndHz: 49, subHz: 39 },
    ];

    const sampleRate = ctx.sampleRate;
    const pulseDuration = 0.082; // 82ms tight decay
    const pulseSamples = Math.floor(sampleRate * pulseDuration);

    this.pulseGt650Buffers = pulseConfigs.map((cfg) => {
      const buf = ctx.createBuffer(1, pulseSamples, sampleRate);
      const data = buf.getChannelData(0);

      let phaseA = 0;
      let phaseSub = 0;
      let phaseRes = 0;

      for (let i = 0; i < pulseSamples; i++) {
        const t = i / sampleRate;

        // 1. Sharp Gunshot Crack (Mechanical valve & breech snap: 0..16ms)
        let crack = 0;
        if (t <= 0.02) {
          const noise = (Math.random() * 2 - 1) * Math.exp(-t / 0.0045);
          const click = Math.sin(2 * Math.PI * cfg.crackHz * t) * Math.exp(-t / 0.0035);
          const snap = Math.sin(2 * Math.PI * (cfg.crackHz * 1.5) * t) * Math.exp(-t / 0.002);
          crack = (noise * 0.35 + click * 0.45 + snap * 0.3) * 0.55;
        }

        // 2. GT 650 270° Twin Piston / Cylinder Thump (Deep Sub-Bass Thump: 0..65ms)
        let thump = 0;
        if (t <= 0.065) {
          const freqA = cfg.dropEndHz + (cfg.dropStartHz - cfg.dropEndHz) * Math.exp(-t / 0.018);
          phaseA += (2 * Math.PI * freqA) / sampleRate;

          const freqSub = cfg.subHz + 16 * Math.exp(-t / 0.024);
          phaseSub += (2 * Math.PI * freqSub) / sampleRate;

          const rawThump = Math.sin(phaseA);
          const shapedThump = Math.tanh(rawThump * 1.8) * 0.85;
          const subThump = Math.sin(phaseSub);
          const env = Math.exp(-t / 0.022);
          thump = (shapedThump * 0.65 + subThump * 0.45) * env * 0.75;
        }

        // 3. Megaphone Exhaust Body Resonance (The GT 650 throat / bark: 0..55ms)
        let res = 0;
        if (t <= 0.055) {
          const freqRes = cfg.resHz + 75 * Math.exp(-t / 0.015);
          phaseRes += (2 * Math.PI * freqRes) / sampleRate;
          const sawRes = ((phaseRes % (2 * Math.PI)) / Math.PI) - 1;
          const envRes = Math.exp(-t / 0.016);
          res = sawRes * envRes * 0.28;
        }

        // 4. Gas Blast Tail (Short turbulent air expulsion: 0..48ms)
        let gas = 0;
        if (t <= 0.048) {
          gas = (Math.random() * 2 - 1) * Math.exp(-t / 0.014) * 0.18;
        }

        data[i] = Math.tanh((crack + thump + res + gas) * 1.25);
      }
      return buf;
    });

    // 3 organic variations for Heavy Plasma (155ms duration)
    // Deeper, heavier GT 650-derived supercannon
    const plasmaConfigs = [
      { resHz: 120, breechHz: 980, dropStartHz: 96, dropEndHz: 28, subHz: 22 },
      { resHz: 128, breechHz: 1050, dropStartHz: 100, dropEndHz: 30, subHz: 24 },
      { resHz: 114, breechHz: 920, dropStartHz: 92, dropEndHz: 26, subHz: 20 },
    ];

    const plasmaDuration = 0.155;
    const plasmaSamples = Math.floor(sampleRate * plasmaDuration);

    this.plasmaGt650Buffers = plasmaConfigs.map((cfg) => {
      const buf = ctx.createBuffer(1, plasmaSamples, sampleRate);
      const data = buf.getChannelData(0);

      let phaseA = 0;
      let phaseSub = 0;
      let phaseRes = 0;

      for (let i = 0; i < plasmaSamples; i++) {
        const t = i / sampleRate;

        // 1. Heavy Mechanical Breech Slam Crack (0..30ms)
        let crack = 0;
        if (t <= 0.032) {
          const noise = (Math.random() * 2 - 1) * Math.exp(-t / 0.008);
          const click = Math.sin(2 * Math.PI * cfg.breechHz * t) * Math.exp(-t / 0.006);
          const snap = Math.sin(2 * Math.PI * (cfg.breechHz * 1.5) * t) * Math.exp(-t / 0.004);
          crack = (noise * 0.4 + click * 0.5 + snap * 0.3) * 0.65;
        }

        // 2. Massive Sub-Bass Compression Shock (0..130ms)
        let thump = 0;
        if (t <= 0.13) {
          const freqA = cfg.dropEndHz + (cfg.dropStartHz - cfg.dropEndHz) * Math.exp(-t / 0.035);
          phaseA += (2 * Math.PI * freqA) / sampleRate;

          const freqSub = cfg.subHz + 22 * Math.exp(-t / 0.045);
          phaseSub += (2 * Math.PI * freqSub) / sampleRate;

          const raw = Math.sin(phaseA);
          const shaped = Math.tanh(raw * 2.2) * 0.9;
          const sub = Math.sin(phaseSub);
          const env = Math.exp(-t / 0.038);
          thump = (shaped * 0.75 + sub * 0.55) * env * 0.85;
        }

        // 3. Oversized Exhaust Bore Resonance (0..110ms)
        let res = 0;
        if (t <= 0.11) {
          const freqRes = cfg.resHz + 60 * Math.exp(-t / 0.028);
          phaseRes += (2 * Math.PI * freqRes) / sampleRate;
          const sawRes = ((phaseRes % (2 * Math.PI)) / Math.PI) - 1;
          const envRes = Math.exp(-t / 0.032);
          res = sawRes * envRes * 0.38;
        }

        // 4. Superheated Turbulent Gas Blast (0..120ms)
        let gas = 0;
        if (t <= 0.12) {
          gas = (Math.random() * 2 - 1) * Math.exp(-t / 0.03) * 0.25;
        }

        data[i] = Math.tanh((crack + thump + res + gas) * 1.3);
      }
      return buf;
    });
  }

  public playPulseCannon(pan = 0): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('fire_pulse', 38)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus({ pan, gain: 1.0 }, true);
    this.recordCue('fire', 'pulse');

    // 1. Play GT 650 mechanical gunshot impulse from organic pre-rendered twin cylinder buffers
    if (this.pulseGt650Buffers.length > 0) {
      const buf = this.pulseGt650Buffers[this.pulseBufferIndex];
      this.pulseBufferIndex = (this.pulseBufferIndex + 1) % this.pulseGt650Buffers.length;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      // Subtle pitch micro-variance (±1.5%) prevents machine-gun phasing
      src.playbackRate.value = 0.985 + Math.random() * 0.03;
      src.connect(out);
      src.start(now);
    }

    // 2. Real-time dynamic sub-bass physical air-thump (48Hz chest punch)
    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(145 + (Math.random() - 0.5) * 10, now);
    sub.frequency.exponentialRampToValueAtTime(46, now + 0.038);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.36, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.046);
    sub.connect(subGain).connect(out);
    sub.start(now);
    sub.stop(now + 0.05);

    // 3. Crisp mechanical strike transient (adds gunmetal click to the muzzle)
    if (this.noiseBuffer) {
      const snapSrc = this.ctx.createBufferSource();
      snapSrc.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2400 + (Math.random() - 0.5) * 150, now);
      bp.Q.value = 4.2;
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.28, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.016);
      snapSrc.connect(bp).connect(sg).connect(out);
      snapSrc.start(now, Math.random() * 0.8, 0.02);
    }
  }

  public playHeavyPlasma(pan = 0): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('fire_heavy_plasma', 78)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus({ pan, gain: 1.0 }, true);
    this.recordCue('fire', 'heavy_plasma');

    // 1. Play Heavy GT 650 supercannon buffer
    if (this.plasmaGt650Buffers.length > 0) {
      const buf = this.plasmaGt650Buffers[this.plasmaBufferIndex];
      this.plasmaBufferIndex = (this.plasmaBufferIndex + 1) % this.plasmaGt650Buffers.length;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 0.98 + Math.random() * 0.04;
      src.connect(out);
      src.start(now);
    }

    // 2. Real-time massive sub-bass shockwave (24Hz deep concussive foundation)
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(56, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.12);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.48, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    sub.connect(subGain).connect(out);
    sub.start(now);
    sub.stop(now + 0.15);

    // 3. Heavy mechanical breech recoil
    const breach = this.ctx.createOscillator();
    breach.type = 'sawtooth';
    breach.frequency.setValueAtTime(190, now);
    breach.frequency.exponentialRampToValueAtTime(48, now + 0.08);
    const breachLp = this.ctx.createBiquadFilter();
    breachLp.type = 'lowpass';
    breachLp.frequency.setValueAtTime(650, now);
    breachLp.frequency.exponentialRampToValueAtTime(140, now + 0.09);
    const breachGain = this.ctx.createGain();
    breachGain.gain.setValueAtTime(0.34, now);
    breachGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    breach.connect(breachLp).connect(breachGain).connect(out);
    breach.start(now);
    breach.stop(now + 0.11);
  }

  public playEmpDischarge(pan = 0): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('fire_emp', 95)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus({ pan, gain: 1.0 }, true);
    this.recordCue('fire', 'emp');

    // 1. High-voltage arc discharge crack (sharp electrical transient)
    if (this.noiseBuffer) {
      const arc = this.ctx.createBufferSource();
      arc.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(3600, now);
      bp.Q.value = 4.5;
      const ag = this.ctx.createGain();
      ag.gain.setValueAtTime(0.35, now);
      ag.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      arc.connect(bp).connect(ag).connect(out);
      arc.start(now, 0.1, 0.05);
    }

    // 2. Ionization resonance sweep (high-frequency shimmer down to deep magnetic hum)
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1850, now);
    osc.frequency.exponentialRampToValueAtTime(94, now + 0.35);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.4);

    // 3. Modulated electromagnetic pulse field
    const mod = this.ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(420, now);
    mod.frequency.exponentialRampToValueAtTime(140, now + 0.26);
    const mg = this.ctx.createGain();
    mg.gain.setValueAtTime(0.22, now);
    mg.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    mod.connect(mg).connect(out);
    mod.start(now);
    mod.stop(now + 0.3);
  }

  public playRailCannon(pan = 0): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    if (!this.canTriggerVoice('fire_rail_cannon', 110)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus({ pan, gain: 1.0 }, true);
    this.recordCue('fire', 'rail_cannon');

    // 1. Supersonic kinetic crack (ultra-sharp highpass impulse < 3ms)
    const crack = this.ctx.createBufferSource();
    crack.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2200, now);
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.55, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    crack.connect(hp).connect(cg).connect(out);
    crack.start(now, 0.02, 0.04);

    // 2. High-energy electromagnetic projectile report (violent sawtooth tear)
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.28);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3600, now);
    lp.frequency.exponentialRampToValueAtTime(320, now + 0.28);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.46, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(lp).connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.35);

    // 3. Massive breech recoil sub-thump (38Hz shockwave)
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(78, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.32);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.52, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    sub.connect(sg).connect(out);
    sub.start(now);
    sub.stop(now + 0.38);

    // 4. Expanding electromagnetic spatial shockwave
    const shock = this.ctx.createBufferSource();
    shock.buffer = this.noiseBuffer;
    const shockBp = this.ctx.createBiquadFilter();
    shockBp.type = 'bandpass';
    shockBp.frequency.setValueAtTime(850, now);
    shockBp.frequency.exponentialRampToValueAtTime(140, now + 0.38);
    shockBp.Q.value = 1.4;
    const shockGain = this.ctx.createGain();
    shockGain.gain.setValueAtTime(0.38, now);
    shockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    shock.connect(shockBp).connect(shockGain).connect(out);
    shock.start(now, 0.08, 0.44);
  }

  // =========================================================================
  // SPATIALIZED DISTINCT 5-WEAPON IMPACT CUES (Hull vs Shield + 3D Panning!)
  // =========================================================================
  public playWeaponImpact(
    weapon: SpaceWeaponId,
    isShield: boolean,
    spatial?: SpatialAudioCue,
    heavy = false,
  ): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    if (!this.canTriggerVoice(`impact_${weapon}`, weapon === 'pulse' ? 42 : 28)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial, true);
    this.recordCue('impact', weapon);

    if (weapon === 'pulse') {
      // Pulse impact: crisp electric micro-snap or crystalline shield ping
      const osc = this.ctx.createOscillator();
      osc.type = isShield ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isShield ? 1180 : 680, now);
      osc.frequency.exponentialRampToValueAtTime(isShield ? 420 : 190, now + 0.095);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(isShield ? 0.19 : 0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.105);
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 0.115);

      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(isShield ? 2400 : 1350, now);
      bp.Q.value = 1.6;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.14, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      src.connect(bp).connect(ng).connect(out);
      src.start(now, Math.random() * 0.9, 0.085);
      return;
    }

    if (weapon === 'heavy_plasma') {
      // Heavy Plasma impact: deep thermal sizzle + molten concussive sub-thud
      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(heavy ? 140 : 165, now);
      sub.frequency.exponentialRampToValueAtTime(42, now + 0.22);
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.32, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      sub.connect(sg).connect(out);
      sub.start(now);
      sub.stop(now + 0.25);

      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2100, now);
      bp.frequency.exponentialRampToValueAtTime(480, now + 0.22);
      bp.Q.value = 1.2;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.26, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      src.connect(bp).connect(ng).connect(out);
      src.start(now, Math.random() * 0.7, 0.26);
      return;
    }

    if (weapon === 'missile') {
      // Missile impact: punchy warhead detonation boom + metallic shrapnel burst
      const boom = this.ctx.createBufferSource();
      boom.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(heavy ? 640 : 520, now);
      lp.frequency.exponentialRampToValueAtTime(58, now + 0.48);
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(heavy ? 0.44 : 0.36, now);
      bg.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
      boom.connect(lp).connect(bg).connect(out);
      boom.start(now, 0.08, 0.55);

      const punch = this.ctx.createOscillator();
      punch.type = 'triangle';
      punch.frequency.setValueAtTime(118, now);
      punch.frequency.exponentialRampToValueAtTime(28, now + 0.3);
      const pg = this.ctx.createGain();
      pg.gain.setValueAtTime(0.34, now);
      pg.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      punch.connect(pg).connect(out);
      punch.start(now);
      punch.stop(now + 0.34);
      return;
    }

    if (weapon === 'emp') {
      // EMP impact: resonant electric arc-discharge + descending disruptor power-down whine
      const arc = this.ctx.createOscillator();
      arc.type = 'sawtooth';
      arc.frequency.setValueAtTime(1480, now);
      arc.frequency.exponentialRampToValueAtTime(165, now + 0.32);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(920, now);
      bp.Q.value = 2.6;
      const ag = this.ctx.createGain();
      ag.gain.setValueAtTime(0.28, now);
      ag.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      arc.connect(bp).connect(ag).connect(out);
      arc.start(now);
      arc.stop(now + 0.36);

      const crackle = this.ctx.createBufferSource();
      crackle.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(2600, now);
      const cg = this.ctx.createGain();
      cg.gain.setValueAtTime(0.22, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      crackle.connect(hp).connect(cg).connect(out);
      crackle.start(now, Math.random() * 0.8, 0.18);
      return;
    }

    // Rail Cannon impact: deep tungsten armor-plate shear + sub-bass kinetic thump
    this.playRailImpactThump(heavy, spatial);
  }

  public playShieldImpact(spatial?: SpatialAudioCue): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('shield_hit', 42)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial);
    this.recordCue('other');
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(780, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playHullImpact(spatial?: SpatialAudioCue): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    if (!this.canTriggerVoice('hull_hit', 42)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial);
    this.recordCue('other');
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(520, now);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(bp).connect(g).connect(out);
    src.start(now, 0.1, 0.14);
  }

  public playRailImpactThump(heavy = false, spatial?: SpatialAudioCue): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial);
    // Deep metallic hull-plate kinetic thump
    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(heavy ? 128 : 148, now);
    sub.frequency.exponentialRampToValueAtTime(26, now + (heavy ? 0.34 : 0.24));
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(heavy ? 0.44 : 0.32, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.36 : 0.26));
    sub.connect(subGain).connect(out);
    sub.start(now);
    sub.stop(now + 0.38);

    // High-energy tungsten armor-plate shear transient
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1650, now);
    bp.Q.setValueAtTime(1.8, now);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(heavy ? 0.34 : 0.26, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    src.connect(bp).connect(ng).connect(out);
    src.start(now, 0.04, 0.17);
  }

  public playCapitalCannon(spatial?: SpatialAudioCue): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('cap_cannon', 120)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial);
    this.recordCue('other');
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.42);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.48);
  }

  public playMissileLockBeep(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('lock_beep', 140)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, now);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playMissileLaunch(pan = 0): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus({ pan, gain: 1.0 }, true);
    this.recordCue('fire', 'missile');

    // 1. Mechanical missile rail latch unlock / pneumatic ejection impulse
    const latchSrc = this.ctx.createBufferSource();
    latchSrc.buffer = this.noiseBuffer;
    const latchHp = this.ctx.createBiquadFilter();
    latchHp.type = 'highpass';
    latchHp.frequency.setValueAtTime(2400, now);
    const latchG = this.ctx.createGain();
    latchG.gain.setValueAtTime(0.42, now);
    latchG.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
    latchSrc.connect(latchHp).connect(latchG).connect(out);
    latchSrc.start(now, 0.05, 0.042);

    // 2. Solid propellant rocket motor mechanical ignition pop
    const ign = this.ctx.createOscillator();
    ign.type = 'sawtooth';
    ign.frequency.setValueAtTime(160, now + 0.02);
    ign.frequency.exponentialRampToValueAtTime(440, now + 0.08);
    const ig = this.ctx.createGain();
    ig.gain.setValueAtTime(0.001, now);
    ig.gain.setValueAtTime(0.34, now + 0.02);
    ig.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    ign.connect(ig).connect(out);
    ign.start(now + 0.02);
    ign.stop(now + 0.18);

    // 3. Sustained high-thrust rocket exhaust plume wash
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(840, now + 0.03);
    bp.frequency.exponentialRampToValueAtTime(320, now + 0.48);
    bp.Q.value = 1.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.setValueAtTime(0.44, now + 0.035);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    src.connect(bp).connect(g).connect(out);
    src.start(now + 0.03, 0.15, 0.52);
  }

  /**
   * Audible Doppler pass-by effect for missiles streaking past the player spacecraft.
   */
  public playMissilePassBy(spatial?: SpatialAudioCue): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    if (!this.canTriggerVoice('missile_passby', 120)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial, true);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    // Steep supersonic Doppler frequency pitch drop
    bp.frequency.setValueAtTime(1650, now);
    bp.frequency.exponentialRampToValueAtTime(260, now + 0.32);
    bp.Q.value = 2.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.32, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    src.connect(bp).connect(g).connect(out);
    src.start(now, Math.random() * 0.8, 0.38);
  }

  /**
   * Distant warhead detonation with deep concussive core and audible shrapnel ring.
   */
  public playMissileDetonation(spatial?: SpatialAudioCue): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    if (!this.canTriggerVoice('missile_detonation', 80)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial, true);

    // Deep concussive core
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(115, now);
    sub.frequency.exponentialRampToValueAtTime(32, now + 0.35);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.42, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    sub.connect(sg).connect(out);
    sub.start(now);
    sub.stop(now + 0.4);

    // Explosive fragment cloud
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(680, now);
    lp.frequency.exponentialRampToValueAtTime(110, now + 0.45);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.48, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    src.connect(lp).connect(g).connect(out);
    src.start(now, Math.random() * 0.5, 0.5);
  }

  /**
   * High-alert 3-second critical countdown warning beep for capital-ship core breach.
   */
  public playCriticalCountdownBeep(digit: number): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus({ gain: 1.0 });

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    // Frequency escalates as core breach approaches: 3 -> 880Hz, 2 -> 1100Hz, 1 -> 1440Hz
    const freq = digit === 1 ? 1440 : digit === 2 ? 1100 : 880;
    osc.frequency.setValueAtTime(freq, now);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.38, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.2);

    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(freq * 0.5, now);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.24, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    sub.connect(sg).connect(out);
    sub.start(now);
    sub.stop(now + 0.2);
  }

  public playSpaceExplosion(spatial?: SpatialAudioCue, scale = 1.0): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    if (!this.canTriggerVoice('space_explosion', 75)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial);
    this.recordCue('other');
    const dur = Math.min(1.45, 0.72 + scale * 0.16);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(460, now);
    lp.frequency.exponentialRampToValueAtTime(48, now + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.min(0.55, 0.4 + scale * 0.06), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.06);
    src.connect(lp).connect(g).connect(out);
    src.start(now, 0.1, dur + 0.08);
  }

  public playShotgunBlast(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1150, now);
    lp.frequency.exponentialRampToValueAtTime(120, now + 0.22);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.62, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    src.connect(lp).connect(ng).connect(out);
    src.start(now, Math.random(), 0.26);
  }

  public playMedStim(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.22);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playAsteroidCollision(severe: boolean, spatial?: SpatialAudioCue): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    if (!this.canTriggerVoice('asteroid_collision', 140)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial);
    this.recordCue('other');

    if (!severe) {
      // Light grazing impact: metallic scrape + silicate debris ping
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);
      const og = this.ctx.createGain();
      og.gain.setValueAtTime(0.24, now);
      og.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(og).connect(out);
      osc.start(now);
      osc.stop(now + 0.18);

      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1800, now);
      bp.Q.value = 2.4;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.22, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      src.connect(bp).connect(ng).connect(out);
      src.start(now, Math.random() * 0.8, 0.16);
      return;
    }

    // Heavy violent collision: massive structural groan + hull deformation crunch
    const sub = this.ctx.createOscillator();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(82, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + 0.65);
    const subLp = this.ctx.createBiquadFilter();
    subLp.type = 'lowpass';
    subLp.frequency.setValueAtTime(240, now);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.68, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
    sub.connect(subLp).connect(og).connect(out);
    sub.start(now);
    sub.stop(now + 0.72);

    const crunch = this.ctx.createBufferSource();
    crunch.buffer = this.noiseBuffer;
    const crunchBp = this.ctx.createBiquadFilter();
    crunchBp.type = 'bandpass';
    crunchBp.frequency.setValueAtTime(640, now);
    crunchBp.frequency.exponentialRampToValueAtTime(120, now + 0.55);
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.55, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    crunch.connect(crunchBp).connect(cg).connect(out);
    crunch.start(now, 0.1, 0.6);

    for (const delay of [0.14, 0.38]) {
      const al = this.ctx.createOscillator();
      al.type = 'square';
      al.frequency.setValueAtTime(820, now + delay);
      const ag = this.ctx.createGain();
      ag.gain.setValueAtTime(0.18, now + delay);
      ag.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
      al.connect(ag).connect(out);
      al.start(now + delay);
      al.stop(now + delay + 0.15);
    }
  }

  public playShipRepair(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    for (const [idx, freq] of [440, 660, 880].entries()) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.2, now + idx * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);
      osc.connect(g).connect(out);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.2);
    }
  }

  public playFlareDeploy(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    this.recordCue('other');
    // Dual stereo-spread pneumatic pop (port & starboard flare pods) + thermal sizzle
    const pods = [
      { delay: 0, pan: -0.35 },
      { delay: 0.065, pan: 0.35 },
    ];
    for (const pod of pods) {
      const out = this.createSpatialBus({ pan: pod.pan, gain: 1.0 });
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2200, now + pod.delay);
      bp.frequency.exponentialRampToValueAtTime(620, now + pod.delay + 0.18);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.3, now + pod.delay);
      ng.gain.exponentialRampToValueAtTime(0.001, now + pod.delay + 0.2);
      src.connect(bp).connect(ng).connect(out);
      src.start(now + pod.delay, 0.15 + pod.delay, 0.22);

      const pop = this.ctx.createOscillator();
      pop.type = 'triangle';
      pop.frequency.setValueAtTime(420, now + pod.delay);
      pop.frequency.exponentialRampToValueAtTime(110, now + pod.delay + 0.07);
      const pg = this.ctx.createGain();
      pg.gain.setValueAtTime(0.22, now + pod.delay);
      pg.gain.exponentialRampToValueAtTime(0.001, now + pod.delay + 0.08);
      pop.connect(pg).connect(out);
      pop.start(now + pod.delay);
      pop.stop(now + pod.delay + 0.09);
    }
  }

  public playRailChargeTick(chargeRatio: number): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const baseFreq = 320 + Math.max(0, Math.min(1, chargeRatio)) * 960;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.12, now + 0.07);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playEmptyClick(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('empty_click', 150)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.045);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playMissionVictory(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    const notes = [330, 440, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now + idx * 0.11);
      g.gain.linearRampToValueAtTime(0.22, now + idx * 0.11 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.55);
      osc.connect(g).connect(out);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.6);
    });
  }

  public playMissionDefeat(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    const notes = [220, 174.61, 130.81];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18, now + idx * 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.55);
      osc.connect(lp).connect(g).connect(out);
      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 0.6);
    });
  }

  public playHyperspaceJump(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('hyperspace', 600)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');

    // Deep rising warp-core charge harmonic
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(58, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.85);
    osc.frequency.exponentialRampToValueAtTime(140, now + 1.9);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(240, now);
    lp.frequency.exponentialRampToValueAtTime(2400, now + 0.9);
    lp.frequency.exponentialRampToValueAtTime(360, now + 2.0);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.24, now + 0.72);
    g.gain.exponentialRampToValueAtTime(0.001, now + 2.05);
    osc.connect(lp).connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 2.1);

    // Filtered slipstream whoosh
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(320, now + 0.55);
      bp.frequency.exponentialRampToValueAtTime(1850, now + 1.15);
      bp.frequency.exponentialRampToValueAtTime(280, now + 2.0);
      bp.Q.value = 1.8;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.001, now + 0.5);
      ng.gain.linearRampToValueAtTime(0.2, now + 0.95);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 2.05);
      src.connect(bp).connect(ng).connect(out);
      src.start(now + 0.5);
      src.stop(now + 2.1);
    }
  }

  public playWingmanCommandAck(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('wingman_ack', 160)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    [740, 980].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.12, now + i * 0.065);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.09);
      osc.connect(g).connect(out);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.1);
    });
  }

  public playCriticalDamageAlert(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('crit_damage', 1600)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    [620, 440].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1150;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.11, now + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.12);
      osc.connect(lp).connect(g).connect(out);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.13);
    });
  }

  public playLegendaryAceIntro(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice('ace_intro', 1200)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(72, now + 0.9);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 340;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.24, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    osc.connect(lp).connect(g).connect(out);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  public playShipDestruction(
    destructionClass: 'fighter' | 'heavy' | 'capital',
    isSecondary: boolean,
    kind: string,
    spatial?: SpatialAudioCue,
  ): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const throttleKey = `ship_dest_${destructionClass}_${isSecondary ? 'sec' : 'main'}`;
    if (!this.canTriggerVoice(throttleKey, isSecondary ? 90 : 65)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus(spatial);
    this.recordCue('other');

    if (kind === 'ion_discharge') {
      // High-energy capital engine ion discharge whine + plasma snap
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.72);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(520, now);
      bp.Q.value = 1.9;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.38, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.76);
      osc.connect(bp).connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 0.78);
      return;
    }

    const isCapitalMain = destructionClass === 'capital' && !isSecondary;
    const isHeavyMain = destructionClass === 'heavy' && !isSecondary;
    const dur = isCapitalMain ? 2.25 : isHeavyMain ? 1.35 : isSecondary ? 0.65 : 0.88;
    const peakGain = isCapitalMain ? 0.62 : isHeavyMain ? 0.48 : isSecondary ? 0.34 : 0.42;

    // 1. Sub-bass pressure shockwave thump
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(isCapitalMain ? 92 : isHeavyMain ? 115 : 142, now);
    sub.frequency.exponentialRampToValueAtTime(isCapitalMain ? 22 : 30, now + dur * 0.72);
    const subG = this.ctx.createGain();
    subG.gain.setValueAtTime(peakGain * 0.9, now);
    subG.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.78);
    sub.connect(subG).connect(out);
    sub.start(now);
    sub.stop(now + dur * 0.8);

    // 2. Layered broadband plasma roar & metallic hull rupture crackle
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(isCapitalMain ? 720 : isHeavyMain ? 860 : 1080, now);
    lp.frequency.exponentialRampToValueAtTime(isCapitalMain ? 42 : 76, now + dur);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(peakGain, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(lp).connect(ng).connect(out);
    src.start(now, Math.random() * 0.35, Math.min(2.45, dur + 0.05));
  }

  public playExtinctionCue(
    kind:
      | 'boss_intro'
      | 'boss_phase'
      | 'disruptor_pulse'
      | 'phantom_cloak'
      | 'telegraph_warning'
      | 'extraction_beacon'
      | 'sovereign_collapse',
  ): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (!this.canTriggerVoice(`ext_${kind}`, kind === 'telegraph_warning' ? 950 : 650)) return;
    const now = this.ctx.currentTime;
    const out = this.createSpatialBus();
    this.recordCue('other');

    if (kind === 'boss_intro' || kind === 'boss_phase') {
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      sub.type = 'sine';
      osc.frequency.setValueAtTime(kind === 'boss_intro' ? 98 : 135, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.95);
      sub.frequency.setValueAtTime(55, now);
      sub.frequency.exponentialRampToValueAtTime(34, now + 0.95);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 390;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.32, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc.connect(lp).connect(g).connect(out);
      sub.connect(g);
      osc.start(now);
      sub.start(now);
      osc.stop(now + 1.05);
      sub.stop(now + 1.05);
      return;
    }

    if (kind === 'disruptor_pulse' || kind === 'phantom_cloak') {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      const startFreq = kind === 'disruptor_pulse' ? 520 : 880;
      const endFreq = kind === 'disruptor_pulse' ? 140 : 290;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.36);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 0.4);
      return;
    }

    if (kind === 'telegraph_warning' || kind === 'extraction_beacon') {
      const isExtract = kind === 'extraction_beacon';
      const osc = this.ctx.createOscillator();
      osc.type = isExtract ? 'sine' : 'square';
      const f = isExtract ? 640 : 410;
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.setValueAtTime(f * 1.25, now + 0.14);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 0.36);
      return;
    }

    // sovereign_collapse: deep resonant reactor implosion + tail rumble
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(20, now + 1.9);
    const subG = this.ctx.createGain();
    subG.gain.setValueAtTime(0.54, now);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 1.95);
    sub.connect(subG).connect(out);
    sub.start(now);
    sub.stop(now + 2.0);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.compressor = null;
    this.masterGain = null;
    this.weaponGain = null;
    this.pulseGt650Buffers = [];
    this.plasmaGt650Buffers = [];
    this.thrusterOsc = null;
    this.thrusterSubOsc = null;
    this.thrusterFilter = null;
    this.thrusterGain = null;
    this.boostNoiseFilter = null;
    this.boostNoiseGain = null;
    this.initialized = false;
  }
}
