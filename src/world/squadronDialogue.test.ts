import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSquadronDialogueDirector,
  requestSquadronDialogue,
} from './squadronDialogue';

test('squadron dialogue throttles chatter to prevent overlap while allowing high-priority ace and mission beats', () => {
  const dir = createSquadronDialogueDirector();

  const start = requestSquadronDialogue(dir, 'level_start', 0);
  assert.ok(start);
  assert.equal(start.faction, 'ally');

  // Immediate follow-up low-priority kill line is suppressed by 5.5s global cooldown
  const tooSoon = requestSquadronDialogue(dir, 'enemy_eliminated', 2.0);
  assert.equal(tooSoon, null);

  // After cooldown passes, kill line plays
  const kill1 = requestSquadronDialogue(dir, 'enemy_eliminated', 8.0);
  assert.ok(kill1);

  // Same trigger within its 14s per-trigger cooldown is suppressed even after global cooldown
  const killTooSoon = requestSquadronDialogue(dir, 'enemy_eliminated', 15.0);
  assert.equal(killTooSoon, null);

  // Different trigger (multi_kill) plays cleanly after global cooldown
  const multi = requestSquadronDialogue(dir, 'multi_kill', 16.0);
  assert.ok(multi);
  assert.equal(multi.trigger, 'multi_kill');

  // High-priority ace intro always plays immediately with custom ace override
  const ace = requestSquadronDialogue(dir, 'ace_intro', 17.0, {
    speaker: 'Vexis',
    callsign: 'IRON FANG',
    text: 'Vanguard Lead — show me what you can do.',
  });
  assert.ok(ace);
  assert.equal(ace.faction, 'enemy_ace');
  assert.equal(ace.callsign, 'IRON FANG');
});
