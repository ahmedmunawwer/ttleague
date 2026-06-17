// Test harness for standings.js tiebreaker logic
// Run with: node scripts/standings-prototype.js

const { computeStandings, computeTiebreakerBreakdown } = require('../client/src/utils/standings.js');

function testCase(name, fixtures, players, pointsPerWin, expectedRanks) {
  console.log(`\n=== ${name} ===`);
  const result = computeStandings(fixtures, players, pointsPerWin, 10);

  console.log('Result:');
  result.forEach(row => {
    const tieIndicator = row.tieGroup && row.tieGroup.length > 1 ? ` (tied with ${row.tieGroup.join(', ')})` : '';
    console.log(
      `  ${row.rank}. ${row.player} - ${row.wins}W ${row.losses}L, ${row.leaguePoints}pts, diff:${row.pointDiff > 0 ? '+' : ''}${row.pointDiff}${tieIndicator}`
    );
  });

  console.log('Expected ranks:', expectedRanks);
  const actualRanks = result.map(r => `${r.rank}.${r.player}`).join(' ');
  console.log('Actual ranks:  ', actualRanks);

  const pass = expectedRanks.every((expected, idx) => expected === result[idx].player);
  console.log(pass ? '✓ PASS' : '✗ FAIL');
  return pass;
}

const allPass = [];

// Case 1: 2 players, 1 match, decisive winner
allPass.push(testCase(
  'Case 1: 2 players, 1 match',
  [
    { id: '1', playerA: 'Alice', playerB: 'Bob', scoreA: 11, scoreB: 9, table: 1, slot: 1, order: 1 },
  ],
  ['Alice', 'Bob'],
  1,
  ['Alice', 'Bob']
));

// Case 2: 4 players, full round-robin, no ties
allPass.push(testCase(
  'Case 2: 4 players, full RR, no ties',
  [
    { id: '1', playerA: 'A', playerB: 'B', scoreA: 11, scoreB: 9, table: 1, slot: 1, order: 1 },
    { id: '2', playerA: 'A', playerB: 'C', scoreA: 11, scoreB: 8, table: 1, slot: 2, order: 1 },
    { id: '3', playerA: 'A', playerB: 'D', scoreA: 9, scoreB: 11, table: 1, slot: 3, order: 1 },
    { id: '4', playerA: 'B', playerB: 'C', scoreA: 11, scoreB: 7, table: 1, slot: 4, order: 1 },
    { id: '5', playerA: 'B', playerB: 'D', scoreA: 11, scoreB: 6, table: 1, slot: 5, order: 1 },
    { id: '6', playerA: 'C', playerB: 'D', scoreA: 11, scoreB: 9, table: 1, slot: 6, order: 1 },
  ],
  ['A', 'B', 'C', 'D'],
  1,
  ['A', 'B', 'C', 'D']
));

// Case 3: 4 players, all tied at same league points - 3+ way recursion stress test
// Setup: all 4 finish with 1 win each (1 league point)
// A beats B, B beats C, C beats D, D beats A → round. Then A beats C, B beats D to split point diffs
allPass.push(testCase(
  'Case 3: 4 players, all tied at 1 point, H2H recursion',
  [
    { id: '1', playerA: 'A', playerB: 'B', scoreA: 11, scoreB: 9, table: 1, slot: 1, order: 1 },
    { id: '2', playerA: 'B', playerB: 'C', scoreA: 11, scoreB: 8, table: 1, slot: 2, order: 1 },
    { id: '3', playerA: 'C', playerB: 'D', scoreA: 11, scoreB: 6, table: 1, slot: 3, order: 1 },
    { id: '4', playerA: 'D', playerB: 'A', scoreA: 11, scoreB: 7, table: 1, slot: 4, order: 1 },
    { id: '5', playerA: 'A', playerB: 'C', scoreA: 11, scoreB: 5, table: 1, slot: 5, order: 1 },
    { id: '6', playerA: 'B', playerB: 'D', scoreA: 11, scoreB: 3, table: 1, slot: 6, order: 1 },
  ],
  ['A', 'B', 'C', 'D'],
  1,
  ['A', 'B', 'C', 'D']
));

// Case 4: 4 players, only 4 of 6 matches played
allPass.push(testCase(
  'Case 4: Partial play (unplayed excluded)',
  [
    { id: '1', playerA: 'A', playerB: 'B', scoreA: 11, scoreB: 9, table: 1, slot: 1, order: 1 },
    { id: '2', playerA: 'A', playerB: 'C', scoreA: 11, scoreB: 8, table: 1, slot: 2, order: 1 },
    { id: '3', playerA: 'A', playerB: 'D', scoreA: null, scoreB: null, table: 1, slot: 3, order: 1 },
    { id: '4', playerA: 'B', playerB: 'C', scoreA: 11, scoreB: 7, table: 1, slot: 4, order: 1 },
    { id: '5', playerA: 'B', playerB: 'D', scoreA: null, scoreB: null, table: 1, slot: 5, order: 1 },
    { id: '6', playerA: 'C', playerB: 'D', scoreA: 11, scoreB: 9, table: 1, slot: 6, order: 1 },
  ],
  ['A', 'B', 'C', 'D'],
  1,
  ['A', 'B', 'C', 'D']
));

// Case 5: 6 players, 3-way tie at top that needs recursion to split
// A, B, C each have 3 wins (3 league points)
// H2H among {A,B,C}: A beats B, B beats C, C beats A (all 1-1) → still tied
// H2H point diff among {A,B,C}: A+2, B+1, C-3 → A resolves first
// B vs C resolve via H2H point diff
// D, E, F each have 2 wins (2 league points)
const case5Fixtures = [
  // A, B, C round-robin: A beats B, B beats C, C beats A
  { id: '1', playerA: 'A', playerB: 'B', scoreA: 11, scoreB: 9, table: 1, slot: 1, order: 1 },
  { id: '2', playerA: 'B', playerB: 'C', scoreA: 11, scoreB: 8, table: 1, slot: 2, order: 1 },
  { id: '3', playerA: 'C', playerB: 'A', scoreA: 11, scoreB: 10, table: 1, slot: 3, order: 1 },

  // A, D, E, F matches: A beats D, E, F
  { id: '4', playerA: 'A', playerB: 'D', scoreA: 11, scoreB: 5, table: 1, slot: 4, order: 1 },
  { id: '5', playerA: 'A', playerB: 'E', scoreA: 11, scoreB: 7, table: 1, slot: 5, order: 1 },
  { id: '6', playerA: 'A', playerB: 'F', scoreA: 11, scoreB: 9, table: 1, slot: 6, order: 1 },

  // B, D, E, F matches: B beats D, E, F
  { id: '7', playerA: 'B', playerB: 'D', scoreA: 11, scoreB: 6, table: 1, slot: 7, order: 1 },
  { id: '8', playerA: 'B', playerB: 'E', scoreA: 11, scoreB: 8, table: 1, slot: 8, order: 1 },
  { id: '9', playerA: 'B', playerB: 'F', scoreA: 11, scoreB: 5, table: 1, slot: 9, order: 1 },

  // C, D, E, F matches: C beats D, E, F
  { id: '10', playerA: 'C', playerB: 'D', scoreA: 11, scoreB: 4, table: 1, slot: 10, order: 1 },
  { id: '11', playerA: 'C', playerB: 'E', scoreA: 11, scoreB: 6, table: 1, slot: 11, order: 1 },
  { id: '12', playerA: 'C', playerB: 'F', scoreA: 11, scoreB: 7, table: 1, slot: 12, order: 1 },

  // D, E, F round-robin: D beats E, E beats F, F beats D (1-1 each)
  { id: '13', playerA: 'D', playerB: 'E', scoreA: 11, scoreB: 8, table: 1, slot: 13, order: 1 },
  { id: '14', playerA: 'E', playerB: 'F', scoreA: 11, scoreB: 7, table: 1, slot: 14, order: 1 },
  { id: '15', playerA: 'F', playerB: 'D', scoreA: 11, scoreB: 9, table: 1, slot: 15, order: 1 },
];

allPass.push(testCase(
  'Case 5: 6 players, 3-way H2H recursion',
  case5Fixtures,
  ['A', 'B', 'C', 'D', 'E', 'F'],
  1,
  ['A', 'B', 'C', 'D', 'E', 'F']
));

// Case 6: 3-way tie fully resolved — assert all 3 retain tieGroup with all 3 names
const case6Fixtures = [
  { id: '1', playerA: 'A', playerB: 'B', scoreA: 11, scoreB: 9, table: 1, slot: 1, order: 1 },
  { id: '2', playerA: 'B', playerB: 'C', scoreA: 11, scoreB: 8, table: 1, slot: 2, order: 1 },
  { id: '3', playerA: 'C', playerB: 'A', scoreA: 11, scoreB: 10, table: 1, slot: 3, order: 1 },
];

allPass.push(testCase(
  'Case 6: 3-way tie fully resolved, tieGroup preserved',
  case6Fixtures,
  ['A', 'B', 'C'],
  1,
  ['A', 'B', 'C']
));

const case6Result = computeStandings(case6Fixtures, ['A', 'B', 'C'], 1, 10);
const tieGroupPreserved = case6Result.every(stat =>
  stat.tieGroup !== null &&
  stat.tieGroup.length === 3 &&
  new Set(stat.tieGroup).has('A') &&
  new Set(stat.tieGroup).has('B') &&
  new Set(stat.tieGroup).has('C')
);
console.log(tieGroupPreserved ? '\nCase 6 tieGroup assertion: ✓ PASS' : '\nCase 6 tieGroup assertion: ✗ FAIL');
allPass.push(tieGroupPreserved);

// Case 7: 2-way tie, metrics 0-2 tied, metric 3 (net efficiency) breaks
allPass.push(testCase(
  'Case 7: 2-way tie, metrics 0-2 tied, metric 3 (net efficiency) breaks',
  [
    { id: '1', playerA: 'A', playerB: 'B', scoreA: 11, scoreB: 10, table: 1, slot: 1, order: 1 },
    { id: '2', playerA: 'B', playerB: 'A', scoreA: 12, scoreB: 11, table: 1, slot: 2, order: 1 },
  ],
  ['A', 'B'],
  1,
  ['A', 'B']  // A ranks 1st (net efficiency 21 vs B's 20)
));

// Case 8: Verify breakdown structure on Case 5's 3-way tie
const case8Breakdown = computeTiebreakerBreakdown(['A', 'B', 'C'], case5Fixtures, 10);

console.log('\nCase 8: Cascade steps on 3-way tie');
console.log('breakdown.originalGroup:', case8Breakdown.originalGroup);
console.log('breakdown.steps.length:', case8Breakdown.steps.length);
console.log('breakdown.finalUnresolved:', case8Breakdown.finalUnresolved);

const step1 = case8Breakdown.steps[0];
const step1Pass = step1.subgroup.sort().join(',') === 'A,B,C' &&
  step1.metric === 'h2hWins' &&
  step1.values.A === 1 && step1.values.B === 1 && step1.values.C === 1 &&
  step1.madeProgress === false &&
  step1.resolvedAtThisStep.length === 0;
console.log('Step 1 assertions:', step1Pass ? '✓ PASS' : '✗ FAIL');

const step2 = case8Breakdown.steps[1];
const step2Pass = step2.subgroup.sort().join(',') === 'A,B,C' &&
  step2.metric === 'h2hPointDiff' &&
  step2.values.A === 1 && step2.values.B === 1 && step2.values.C === -2 &&
  step2.madeProgress === true &&
  step2.resolvedAtThisStep.includes('C');
console.log('Step 2 assertions:', step2Pass ? '✓ PASS' : '✗ FAIL');

const step3 = case8Breakdown.steps[2];
const step3Pass = step3.subgroup.sort().join(',') === 'A,B' &&
  step3.metric === 'h2hWins' &&
  step3.madeProgress === true &&
  step3.resolvedAtThisStep.length === 2;
console.log('Step 3 assertions:', step3Pass ? '✓ PASS' : '✗ FAIL');

const case8Pass = case8Breakdown.steps.length === 3 &&
  case8Breakdown.finalUnresolved.length === 0 &&
  step1Pass && step2Pass && step3Pass;
allPass.push(case8Pass);
console.log(case8Pass ? 'Case 8 cascade assertion: ✓ PASS' : 'Case 8 cascade assertion: ✗ FAIL');

console.log('\n=== SUMMARY ===');
console.log(`${allPass.filter(p => p).length}/${allPass.length} tests passed`);
process.exit(allPass.every(p => p) ? 0 : 1);
