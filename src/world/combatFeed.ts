import { REGIONS, type RegionId } from './worldConfig';

export type CombatFeedSeverity = 'info' | 'combat' | 'warning' | 'critical';

export interface CombatFeedEntry {
  id: number;
  timestamp: string;
  tag: string;
  message: string;
  severity: CombatFeedSeverity;
}

export interface CombatThresholdSnapshot {
  elapsedSec: number;
  kills: number;
  totalEnemies: number;
  headshots: number;
  health: number;
  shield: number;
  ammoInMag: number;
  magSize: number;
  isDead: boolean;
  engagedEnemies: number;
  resupplyCount: number;
  regionId: RegionId;
  distanceToSovereign: number;
}

export function formatMissionClock(elapsedSec: number): string {
  const total = Math.max(0, Math.floor(elapsedSec));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Pure deterministic tactical combat feed state machine.
 * Evaluates combat thresholds (neutralizations, kill milestones, Sovereign proximity,
 * shield depletion, critical armor, low magazine, sector entry, resupply) and appends
 * bounded, timestamped event entries without per-frame spam.
 */
export class TacticalCombatFeed {
  private entries: CombatFeedEntry[] = [];
  private nextId = 1;
  private maxEntries: number;
  private prev: CombatThresholdSnapshot | null = null;

  private sovereignDetected = false;
  private sovereignCloseAlerted = false;
  private contactReported = false;
  private shieldWasDepleted = false;
  private lowAmmoAlerted = false;
  private killMilestone3 = false;
  private killMilestoneHalf = false;
  private killMilestoneAll = false;

  constructor(maxEntries = 28) {
    this.maxEntries = maxEntries;
    this.push(0, 'NET', 'Vanguard Tactical Feed Online — Aether Prime Frontline', 'info');
  }

  public push(
    elapsedSec: number,
    tag: string,
    message: string,
    severity: CombatFeedSeverity,
  ): CombatFeedEntry {
    const entry: CombatFeedEntry = {
      id: this.nextId++,
      timestamp: formatMissionClock(elapsedSec),
      tag,
      message,
      severity,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  public getEntries(): CombatFeedEntry[] {
    return [...this.entries];
  }

  public evaluate(curr: CombatThresholdSnapshot): CombatFeedEntry[] {
    const emitted: CombatFeedEntry[] = [];
    const emit = (tag: string, message: string, severity: CombatFeedSeverity) => {
      emitted.push(this.push(curr.elapsedSec, tag, message, severity));
    };

    const prev = this.prev;

    // 1. Sector transitions
    if (prev && curr.regionId !== prev.regionId) {
      const reg = REGIONS[curr.regionId];
      emit('SECTOR', `Entered ${reg.code} — ${reg.name}`, 'info');
    }

    // 2. Hostile contact threshold
    if (curr.engagedEnemies > 0 && !this.contactReported) {
      this.contactReported = true;
      emit(
        'CONTACT',
        `Hostile Vanguard Contact (${curr.engagedEnemies} Active) — Weapons Free`,
        'warning',
      );
    } else if (curr.engagedEnemies === 0) {
      this.contactReported = false;
    }

    // 3. Target Neutralized & Kill Milestone thresholds
    if (prev && curr.kills > prev.kills) {
      const deltaKills = curr.kills - prev.kills;
      const wasHeadshot = curr.headshots > prev.headshots;
      for (let i = 0; i < deltaKills; i++) {
        const count = prev.kills + i + 1;
        emit(
          'KILL',
          wasHeadshot && i === deltaKills - 1
            ? `Target Neutralized — Precision Kill (${count}/${curr.totalEnemies})`
            : `Target Neutralized — Vanguard Shock-Trooper (${count}/${curr.totalEnemies})`,
          'combat',
        );
      }

      if (!this.killMilestone3 && curr.kills >= 3) {
        this.killMilestone3 = true;
        emit('STREAK', 'Combat Threshold Reached — 3 Hostiles Neutralized', 'combat');
      }
      const halfThreshold = Math.max(4, Math.ceil(curr.totalEnemies * 0.5));
      if (!this.killMilestoneHalf && curr.kills >= halfThreshold) {
        this.killMilestoneHalf = true;
        emit('OBJECTIVE', 'Frontline Breakthrough — 50% Vanguard Force Eliminated', 'warning');
      }
      if (!this.killMilestoneAll && curr.totalEnemies > 0 && curr.kills >= curr.totalEnemies) {
        this.killMilestoneAll = true;
        emit(
          'VICTORY',
          'All Frontline Hostiles Neutralized — Advance on Arrival Citadel',
          'critical',
        );
      }
    }

    // 4. Sovereign Presence Detection thresholds
    const inSovereignZone =
      curr.regionId === 'arrival_zone' || curr.distanceToSovereign <= 950;
    if (inSovereignZone && !this.sovereignDetected) {
      this.sovereignDetected = true;
      emit(
        'ALERT',
        'Sovereign Presence Detected — High-Energy Command Signature Ahead',
        'critical',
      );
    } else if (!inSovereignZone && curr.distanceToSovereign > 1250) {
      this.sovereignDetected = false;
      this.sovereignCloseAlerted = false;
    }

    if (curr.distanceToSovereign <= 140 && !this.sovereignCloseAlerted) {
      this.sovereignCloseAlerted = true;
      emit('THREAT', 'Extreme Proximity — The Sovereign Identified on Command Dais', 'critical');
    }

    // 5. Shield & Armor Integrity thresholds
    if (prev && curr.shield === 0 && prev.shield > 0) {
      this.shieldWasDepleted = true;
      emit('SHIELD', 'Deflector Shield Depleted — Take Cover', 'warning');
    } else if (this.shieldWasDepleted && curr.shield >= 100) {
      this.shieldWasDepleted = false;
      emit('SHIELD', 'Deflector Shield Recharged to 100%', 'info');
    }

    if (prev && curr.health <= 35 && curr.health > 0 && prev.health > 35) {
      emit('VITALS', 'Critical Armor Integrity — Resupply Relay Advised', 'critical');
    }

    // 6. Weapon low-magazine threshold
    const lowMagThreshold = Math.max(1, Math.floor(curr.magSize * 0.2));
    if (curr.ammoInMag <= lowMagThreshold && curr.ammoInMag > 0 && !this.lowAmmoAlerted) {
      this.lowAmmoAlerted = true;
      emit('AMMO', `Low Magazine Warning — ${curr.ammoInMag} Rounds Remaining`, 'warning');
    } else if (curr.ammoInMag > lowMagThreshold) {
      this.lowAmmoAlerted = false;
    }

    // 7. Tactical resupply interaction
    if (prev && curr.resupplyCount > prev.resupplyCount) {
      emit('SUPPLY', 'Tactical Relay Sync — Ammunition & Armor Restored', 'info');
    }

    // 8. Operative KIA / Redeploy
    if (prev && curr.isDead && !prev.isDead) {
      emit('KIA', 'Operative Down — Signal Lost, Ready for Redeployment', 'critical');
    } else if (prev && !curr.isDead && prev.isDead) {
      emit('DEPLOY', 'Vanguard Operative Redeployed to Frontline', 'info');
    }

    this.prev = { ...curr };
    return emitted;
  }
}
