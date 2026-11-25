export type SquadronDialogueTrigger =
  | 'level_start'
  | 'enemy_eliminated'
  | 'multi_kill'
  | 'near_miss'
  | 'player_critical'
  | 'subsystem_destroyed'
  | 'ace_intro'
  | 'ace_phase2'
  | 'ace_defeated'
  | 'escort_damaged'
  | 'level_victory'
  | 'level_failure';

export interface SquadronDialogueLine {
  speaker: string;
  callsign: string;
  faction: 'ally' | 'enemy_ace';
  text: string;
  trigger: SquadronDialogueTrigger;
}

export interface SquadronDialogueDirectorState {
  lastLineAtSec: number;
  lastTriggerAtSec: Partial<Record<SquadronDialogueTrigger, number>>;
  rotationCursor: Record<string, number>;
}

const GLOBAL_MIN_COOLDOWN_SEC = 5.5;

const TRIGGER_COOLDOWNS_SEC: Record<SquadronDialogueTrigger, number> = {
  level_start: 0,
  enemy_eliminated: 14,
  multi_kill: 9,
  near_miss: 16,
  player_critical: 15,
  subsystem_destroyed: 8,
  ace_intro: 0,
  ace_phase2: 0,
  ace_defeated: 0,
  escort_damaged: 14,
  level_victory: 0,
  level_failure: 0,
};

const ALLY_LINES: Record<
  Exclude<SquadronDialogueTrigger, 'ace_intro' | 'ace_phase2' | 'ace_defeated'>,
  Array<{ speaker: string; callsign: string; text: string }>
> = {
  level_start: [
    {
      speaker: 'Lt. Kira Vance',
      callsign: 'VANGUARD-2',
      text: 'Weapons hot and sensors synced. Stay tight on my wing, Lead.',
    },
    {
      speaker: 'Sgt. Marcus Hale',
      callsign: 'VANGUARD-3',
      text: 'Heavy shields online. Call your priority targets and we will break their formation.',
    },
    {
      speaker: 'Ens. Talia Sato',
      callsign: 'VANGUARD-4',
      text: 'Scanning hostile flight vectors. Watch your effective cannon range on those flankers.',
    },
  ],
  enemy_eliminated: [
    {
      speaker: 'Lt. Kira Vance',
      callsign: 'VANGUARD-2',
      text: 'Clean splash, Lead! Moving to clear your six.',
    },
    {
      speaker: 'Ens. Talia Sato',
      callsign: 'VANGUARD-4',
      text: 'Confirmed kill on scopes — keeping pressure on their flank.',
    },
    {
      speaker: 'Sgt. Marcus Hale',
      callsign: 'VANGUARD-3',
      text: 'Another Sovereign craft turned to dust. Keep pushing!',
    },
  ],
  multi_kill: [
    {
      speaker: 'Lt. Kira Vance',
      callsign: 'VANGUARD-2',
      text: 'Multiple splashes in seconds — textbook gunnery, Lead!',
    },
    {
      speaker: 'Sgt. Marcus Hale',
      callsign: 'VANGUARD-3',
      text: 'You just tore right through their formation! Keep the momentum!',
    },
  ],
  near_miss: [
    {
      speaker: 'Ens. Talia Sato',
      callsign: 'VANGUARD-4',
      text: 'Whoa — that pass nearly clipped your stabilizers! Nice evasion!',
    },
    {
      speaker: 'Lt. Kira Vance',
      callsign: 'VANGUARD-2',
      text: 'Razor-thin break, Lead! You shook their firing solution.',
    },
  ],
  player_critical: [
    {
      speaker: 'Sgt. Marcus Hale',
      callsign: 'VANGUARD-3',
      text: 'Lead, your hull is redlining! Pop a repair kit [H] or break behind cover!',
    },
    {
      speaker: 'Lt. Kira Vance',
      callsign: 'VANGUARD-2',
      text: 'Drawing hostiles off your tail — stabilize your airframe now!',
    },
  ],
  subsystem_destroyed: [
    {
      speaker: 'Ens. Talia Sato',
      callsign: 'VANGUARD-4',
      text: 'Direct hit on capital subsystem! Their power grid is destabilizing!',
    },
    {
      speaker: 'Sgt. Marcus Hale',
      callsign: 'VANGUARD-3',
      text: 'That cracked their armor wide open! Press the assault!',
    },
  ],
  escort_damaged: [
    {
      speaker: 'Lt. Kira Vance',
      callsign: 'VANGUARD-2',
      text: 'Escort ship is taking heavy fire! Intercept those bombers immediately!',
    },
    {
      speaker: 'Sgt. Marcus Hale',
      callsign: 'VANGUARD-3',
      text: 'Our transport shields are buckling — peel those strikers off!',
    },
  ],
  level_victory: [
    {
      speaker: 'Lt. Kira Vance',
      callsign: 'VANGUARD-2',
      text: 'Scopes clear across the sector. Outstanding flying, Commander!',
    },
    {
      speaker: 'Ens. Talia Sato',
      callsign: 'VANGUARD-4',
      text: 'Hostile signatures zeroed out. Plotting jump vector for the next sortie.',
    },
  ],
  level_failure: [
    {
      speaker: 'Sgt. Marcus Hale',
      callsign: 'VANGUARD-3',
      text: 'Vanguard Lead is down — pulling back to carrier orbit to regroup!',
    },
  ],
};

const ACE_LINES: Record<
  'ace_intro' | 'ace_phase2' | 'ace_defeated',
  Array<{ speaker: string; callsign: string; text: string }>
> = {
  ace_intro: [
    {
      speaker: 'Sovereign Ace',
      callsign: 'HOSTILE ACE',
      text: 'You survived our pickets, Vanguard. Let us see how you handle real precision.',
    },
  ],
  ace_phase2: [
    {
      speaker: 'Sovereign Ace',
      callsign: 'HOSTILE ACE',
      text: 'Impressive gunnery! Engaging overdrive thrusters — keep up if you can!',
    },
  ],
  ace_defeated: [
    {
      speaker: 'Sovereign Ace',
      callsign: 'HOSTILE ACE',
      text: 'Controls locked... impossible... Vanguard Lead, remember this day—',
    },
  ],
};

export function createSquadronDialogueDirector(): SquadronDialogueDirectorState {
  return {
    lastLineAtSec: -999,
    lastTriggerAtSec: {},
    rotationCursor: {},
  };
}

/**
 * Selects a context-sensitive dialogue line while strictly enforcing global and
 * per-trigger cooldowns so transmissions never spam or overlap.
 */
export function requestSquadronDialogue(
  state: SquadronDialogueDirectorState,
  trigger: SquadronDialogueTrigger,
  nowSec: number,
  override?: { speaker?: string; callsign?: string; text?: string },
): SquadronDialogueLine | null {
  const highPriority =
    trigger === 'level_start' ||
    trigger === 'ace_intro' ||
    trigger === 'ace_phase2' ||
    trigger === 'ace_defeated' ||
    trigger === 'level_victory' ||
    trigger === 'level_failure';

  if (!highPriority && nowSec - state.lastLineAtSec < GLOBAL_MIN_COOLDOWN_SEC) {
    return null;
  }

  const lastTriggerSec = state.lastTriggerAtSec[trigger] ?? -999;
  const triggerCooldown = TRIGGER_COOLDOWNS_SEC[trigger] ?? 10;
  if (!highPriority && nowSec - lastTriggerSec < triggerCooldown) {
    return null;
  }

  const isAce =
    trigger === 'ace_intro' || trigger === 'ace_phase2' || trigger === 'ace_defeated';
  const pool = isAce
    ? ACE_LINES[trigger]
    : ALLY_LINES[trigger as keyof typeof ALLY_LINES];
  const cursor = state.rotationCursor[trigger] ?? 0;
  const chosen = pool[cursor % pool.length];
  state.rotationCursor[trigger] = cursor + 1;
  state.lastLineAtSec = nowSec;
  state.lastTriggerAtSec[trigger] = nowSec;

  return {
    speaker: override?.speaker ?? chosen.speaker,
    callsign: override?.callsign ?? chosen.callsign,
    faction: isAce ? 'enemy_ace' : 'ally',
    text: override?.text ?? chosen.text,
    trigger,
  };
}
