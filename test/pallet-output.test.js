/**
 * Unit tests: pallet button sequences use the actual applyPalletStep logic and CSV data.
 * Run: node --test test/pallet-output.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const palletLogicPath = path.join(__dirname, '../public/pallet-logic.js');
const csvPath = path.join(__dirname, '../public/pallet-buttons.csv');

const { parseCSV, applyPalletStep } = require(palletLogicPath);

/** Load palette rows from the actual CSV and run the given button ids in order; return final code. */
function runPalletSequence(buttonIds) {
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvText);
  const byId = new Map(rows.map((r) => [r.id || r.name?.toLowerCase().replace(/\s+/g, '-'), r]));
  let state = { code: '', cursor: 0 };
  for (const id of buttonIds) {
    const row = byId.get(id);
    if (!row) throw new Error(`Pallet row not found: ${id}`);
    state = applyPalletStep(state, row);
  }
  return state.code;
}

const EXPECTED_OUTPUT =
`stack(
  note("<[c2 c3]*4 [bb1 bb2]*4 [f2 f3]*4 [eb2 eb3]*4>")
    .sound("sawtooth").lpf(800),
  stack(
    sound("hh*16").gain("[.25 1]*4"),
    sound("bd*4,[~ sd:1]*2")
  )
)`;

describe('Pallet buttons: Add Stack, Add Erika Base, Add Drum Stack 1', () => {
  it('produces correct spacing and newlines', () => {
    const actual = runPalletSequence(['add-stack', 'add-erika-base', 'add-drum-stack-1']);
    assert.strictEqual(
      actual,
      EXPECTED_OUTPUT,
      'Output should match expected spacing and newlines. Diff:\n' + diffLines(EXPECTED_OUTPUT, actual)
    );
  });
});

const EXPECTED_ADD_STACK_ERIKA_GAMEPAD =
`const gp = gamepad(0)
stack(
  note("<[c2 c3]*4 [bb1 bb2]*4 [f2 f3]*4 [eb2 eb3]*4>")
    .sound("sawtooth").lpf(800),
  note("c a f e").mask(gp.a)
)`;

describe('Pallet buttons: Add Stack, Add Erika Base, Add Gamepad', () => {
  it('produces correct output with consts and stack content', () => {
    const actual = runPalletSequence(['add-stack', 'add-erika-base', 'add-gamepad']);
    assert.strictEqual(
      actual,
      EXPECTED_ADD_STACK_ERIKA_GAMEPAD,
      'Output should match expected. Diff:\n' + diffLines(EXPECTED_ADD_STACK_ERIKA_GAMEPAD, actual)
    );
  });
});

function diffLines(a, b) {
  const al = a.split('\n');
  const bl = b.split('\n');
  const out = [];
  const max = Math.max(al.length, bl.length);
  for (let i = 0; i < max; i++) {
    const aline = al[i] ?? '(missing)';
    const bline = bl[i] ?? '(missing)';
    const eq = aline === bline ? ' ' : '!';
    out.push(`${eq} ${i + 1}: expected: ${JSON.stringify(aline)}`);
    if (aline !== bline) out.push(`   actual:   ${JSON.stringify(bline)}`);
  }
  return out.join('\n');
}
