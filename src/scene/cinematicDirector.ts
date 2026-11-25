import * as THREE from 'three';
import {
  ORBITAL_CENTER_POS,
  SOVEREIGN_WORLD_POS,
  VALKYRIE_PAD_POS,
} from '../world/worldConfig';
import type { SovereignAnimState } from './sovereignCharacter';
import type { ValkyrieSpacecraft } from './spacecraft';

export interface CinematicFrameState {
  active: boolean;
  progress: number; // 0..1
  actIndex: number;
  actTitle: string;
  caption: string;
  sovereignState: SovereignAnimState;
}

interface CinematicAct {
  duration: number;
  title: string;
  caption: string;
  sovereignState: SovereignAnimState;
  startPos: [number, number, number];
  endPos: [number, number, number];
  startLook: [number, number, number];
  endLook: [number, number, number];
  startFov: number;
  endFov: number;
}

const SX = SOVEREIGN_WORLD_POS[0];
const SY = SOVEREIGN_WORLD_POS[1];
const SZ = SOVEREIGN_WORLD_POS[2];

/**
 * 7-Act Theatrical Sovereign Introduction across Dark Aether Prime:
 * Showcases the dark storm-lit invasion, alien armies, and the redesigned angry alien warlord.
 */
const ACTS: CinematicAct[] = [
  {
    duration: 4.5,
    title: 'ACT I · THE SKY BREAKS',
    caption: 'Dark storm clouds ignite above Aether Prime as alien warships descend upon Crown City.',
    sovereignState: 'idle_authority',
    startPos: [-1140, 140, -680],
    endPos: [-1060, 195, -790],
    startLook: [-1220, 210, -940],
    endLook: [-1150, 145, -880],
    startFov: 54,
    endFov: 50,
  },
  {
    duration: 4.2,
    title: 'ACT II · THE INVASION LEGIONS',
    caption: 'Six alien war-castes swarm the shattered districts — Void Stalkers, Brutes, and Siege Walkers.',
    sovereignState: 'aggressive_idle',
    startPos: [-310, 32, -335],
    endPos: [-275, 22, -356],
    startLook: [-238, 18, -396],
    endLook: [-240, 19, -395],
    startFov: 50,
    endFov: 44,
  },
  {
    duration: 4.2,
    title: 'ACT III · THE ARRIVAL CITADEL',
    caption: 'Above the smoking basin, the horned Arrival Citadel tears open the upper atmosphere.',
    sovereignState: 'idle_authority',
    startPos: [760, 235, -960],
    endPos: [965, 195, -1180],
    startLook: [1285, 235, -1610],
    endLook: [1280, 210, -1590],
    startFov: 52,
    endFov: 48,
  },
  {
    duration: 4.2,
    title: 'ACT IV · SHADOW OF THE WARLORD',
    caption: '"Your cities burn. Your skies belong to the Void Armada."',
    sovereignState: 'cinematic_reveal',
    startPos: [SX - 5.4, SY + 1.15, SZ + 5.6],
    endPos: [SX - 3.6, SY + 2.05, SZ + 4.2],
    startLook: [SX + 0.1, SY + 1.75, SZ],
    endLook: [SX, SY + 2.45, SZ],
    startFov: 42,
    endFov: 38,
  },
  {
    duration: 4.0,
    title: 'ACT V · WRATH UNLEASHED',
    caption: '"Stand before me, defenders of Aether Prime — and learn why worlds fall silent."',
    sovereignState: 'command_walk',
    startPos: [SX + 3.0, SY + 1.5, SZ + 4.3],
    endPos: [SX + 0.9, SY + 2.25, SZ + 3.2],
    startLook: [SX, SY + 2.0, SZ],
    endLook: [SX, SY + 2.55, SZ],
    startFov: 39,
    endFov: 35,
  },
  {
    duration: 4.8,
    title: 'ACT VI · THE SOVEREIGN',
    caption: '"REDUCE THEIR CAPITAL TO ASH! LEAVE NOTHING BREATHING!"',
    sovereignState: 'roar_command',
    startPos: [SX - 1.45, SY + 2.75, SZ + 2.15],
    endPos: [SX + 1.15, SY + 2.82, SZ + 2.05],
    startLook: [SX, SY + 2.82, SZ],
    endLook: [SX, SY + 2.82, SZ],
    startFov: 33,
    endFov: 30,
  },
  {
    duration: 4.8,
    title: 'ACT VII · THE LAST STAND',
    caption: 'Fight through Crown City, board the VX-94 Valkyrie, and strike the orbital Dreadnought.',
    sovereignState: 'combat_stance',
    startPos: [SX - 2.4, SY + 2.6, SZ + 4.2],
    endPos: [SX - 36, SY + 24, SZ + 46],
    startLook: [SX, SY + 2.4, SZ],
    endLook: [-480, 62, -740],
    startFov: 38,
    endFov: 54,
  },
];

export const TOTAL_CINEMATIC_DURATION = ACTS.reduce((acc, a) => acc + a.duration, 0);

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class CinematicDirector {
  private active = false;
  private elapsed = 0;
  private startPos = new THREE.Vector3();
  private endPos = new THREE.Vector3();
  private startLook = new THREE.Vector3();
  private endLook = new THREE.Vector3();
  private currentLook = new THREE.Vector3();

  public start(): void {
    this.active = true;
    this.elapsed = 0;
  }

  public stop(): void {
    this.active = false;
  }

  public isActive(): boolean {
    return this.active;
  }

  public seekNormalized(norm: number): void {
    this.elapsed = THREE.MathUtils.clamp(norm, 0, 0.995) * TOTAL_CINEMATIC_DURATION;
  }

  public update(
    dt: number,
    camera: THREE.PerspectiveCamera,
  ): CinematicFrameState {
    if (!this.active) {
      return {
        active: false,
        progress: 0,
        actIndex: 0,
        actTitle: '',
        caption: '',
        sovereignState: 'idle_authority',
      };
    }

    this.elapsed += dt;
    if (this.elapsed >= TOTAL_CINEMATIC_DURATION) {
      this.active = false;
      return {
        active: false,
        progress: 1,
        actIndex: ACTS.length - 1,
        actTitle: ACTS[ACTS.length - 1].title,
        caption: ACTS[ACTS.length - 1].caption,
        sovereignState: 'idle_authority',
      };
    }

    let accum = 0;
    let actIndex = 0;
    let localT = 0;
    for (let i = 0; i < ACTS.length; i++) {
      if (this.elapsed < accum + ACTS[i].duration) {
        actIndex = i;
        localT = (this.elapsed - accum) / ACTS[i].duration;
        break;
      }
      accum += ACTS[i].duration;
    }

    const act = ACTS[actIndex];
    const eased = easeInOutCubic(Math.min(1, Math.max(0, localT)));

    this.startPos.set(...act.startPos);
    this.endPos.set(...act.endPos);
    this.startLook.set(...act.startLook);
    this.endLook.set(...act.endLook);

    camera.position.lerpVectors(this.startPos, this.endPos, eased);
    this.currentLook.lerpVectors(this.startLook, this.endLook, eased);
    camera.lookAt(this.currentLook);

    const fov = THREE.MathUtils.lerp(act.startFov, act.endFov, eased);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    return {
      active: true,
      progress: this.elapsed / TOTAL_CINEMATIC_DURATION,
      actIndex,
      actTitle: act.title,
      caption: act.caption,
      sovereignState: act.sovereignState,
    };
  }
}

/**
 * Seamless 6.2-second Planetary Launch & Atmospheric Ascent Controller:
 * Blasts the VX-94 Valkyrie off the Crown City pad through storm clouds into orbital warfare.
 */
export interface LaunchFrameState {
  active: boolean;
  progress: number;
  spaceBlend: number;
  altitudeKm: number;
  title: string;
  caption: string;
}

export class LaunchCinematicController {
  private active = false;
  private elapsed = 0;
  private readonly duration = 6.2;

  private padPos = new THREE.Vector3(VALKYRIE_PAD_POS[0], VALKYRIE_PAD_POS[1] + 0.12, VALKYRIE_PAD_POS[2]);
  private cloudPos = new THREE.Vector3(-680, 1280, -420);
  private orbitEntryPos = new THREE.Vector3(
    ORBITAL_CENTER_POS[0],
    ORBITAL_CENTER_POS[1] + 18,
    ORBITAL_CENTER_POS[2] + 195,
  );
  private tmpPos = new THREE.Vector3();
  private tmpEuler = new THREE.Euler();

  public start(): void {
    this.active = true;
    this.elapsed = 0;
  }

  public stop(): void {
    this.active = false;
  }

  public isActive(): boolean {
    return this.active;
  }

  public seekNormalized(norm: number): void {
    this.active = true;
    this.elapsed = THREE.MathUtils.clamp(norm, 0, 0.99) * this.duration;
  }

  public update(
    dt: number,
    elapsedTotal: number,
    ship: ValkyrieSpacecraft,
    camera: THREE.PerspectiveCamera,
  ): LaunchFrameState {
    if (!this.active) {
      return {
        active: false,
        progress: 0,
        spaceBlend: 0,
        altitudeKm: 0,
        title: '',
        caption: '',
      };
    }

    this.elapsed += dt;
    const progress = THREE.MathUtils.clamp(this.elapsed / this.duration, 0, 1);

    let title = 'LAUNCH SEQUENCE · IGNITION';
    let caption = 'VX-94 Valkyrie thrusters engaged — clearing Crown City airspace.';
    let spaceBlend = 0;

    if (progress < 0.28) {
      // Phase 1: Vertical liftoff & gear retraction from Crown City Emergency Pad
      const u = easeInOutCubic(progress / 0.28);
      this.tmpPos.set(
        this.padPos.x,
        this.padPos.y + u * 68,
        this.padPos.z - u * 24,
      );
      this.tmpEuler.set(u * 0.42, 0.52 * (1 - u), 0);
      ship.setLandingGear(1 - u);
      ship.setThrustLevel(0.6 + u * 0.6, true);
      spaceBlend = 0;
    } else if (progress < 0.72) {
      // Phase 2: Supersonic atmospheric climb through dark storm clouds
      const u = easeInOutCubic((progress - 0.28) / 0.44);
      title = 'ATMOSPHERIC ASCENT · MAX THRUST';
      caption = 'Piercing Aether Prime storm ceiling — orbital dreadnought signatures detected.';
      this.tmpPos.lerpVectors(
        new THREE.Vector3(this.padPos.x, this.padPos.y + 68, this.padPos.z - 24),
        this.cloudPos,
        u,
      );
      this.tmpEuler.set(0.72 * (1 - u * 0.35), 0.12 * (1 - u), Math.sin(u * Math.PI) * -0.18);
      ship.setLandingGear(0);
      ship.setThrustLevel(1.35, true);
      spaceBlend = THREE.MathUtils.clamp((u - 0.15) / 0.75, 0, 0.88);
    } else {
      // Phase 3: Breaking through the glowing blue horizon into Orbital Space Warfare!
      const u = easeInOutCubic((progress - 0.72) / 0.28);
      title = 'ORBITAL INSERTION · COMBAT READY';
      caption = 'Alien Mothership Dreadnought ahead — weapons hot, engaging hostile interceptors.';
      this.tmpPos.lerpVectors(this.cloudPos, this.orbitEntryPos, u);
      this.tmpEuler.set(0.42 * (1 - u) - 0.04 * u, 0.08 * u, 0);
      ship.setLandingGear(0);
      ship.setThrustLevel(1.1, u < 0.7);
      spaceBlend = THREE.MathUtils.lerp(0.88, 1.0, u);
    }

    ship.root.position.copy(this.tmpPos);
    ship.root.quaternion.setFromEuler(this.tmpEuler);
    ship.updateVisuals(dt, elapsedTotal, 0.2, 0);

    // Dramatic heroic trailing chase camera behind the twin glowing cyan ring thrusters
    const camOffset = new THREE.Vector3(3.2 * (1 - progress), 5.2, 18.5 + progress * 3.0);
    const camLook = new THREE.Vector3(0, 1.8, -55);
    ship.root.updateMatrixWorld(true);
    camera.position.copy(camOffset.applyMatrix4(ship.root.matrixWorld));
    camera.up.set(0, 1, 0).applyQuaternion(ship.root.quaternion).normalize();
    camera.lookAt(camLook.applyMatrix4(ship.root.matrixWorld));
    camera.fov = THREE.MathUtils.lerp(56, 66, Math.sin(progress * Math.PI));
    camera.updateProjectionMatrix();

    if (progress >= 1) {
      this.active = false;
    }

    return {
      active: this.active,
      progress,
      spaceBlend,
      altitudeKm: Number((this.tmpPos.y / 100).toFixed(1)),
      title,
      caption,
    };
  }
}
