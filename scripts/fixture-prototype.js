'use strict';

// Phase 5a prototype: regression harness for the fixture-generation algorithm.
// Algorithm itself lives in server/fixtureGenerator.js. Run: node scripts/fixture-prototype.js

const { generateRounds, repeatRounds, buildSchedule } = require('../server/fixtureGenerator');

function mean(arr) {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr) {
  if (arr.length === 0) return null;
  const m = mean(arr);
  const variance = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function fmt(n, digits = 2) {
  return n === null ? 'n/a' : n.toFixed(digits);
}

function runCase(testCase) {
  const { description, players, roundRobinFreq, numTables } = testCase;
  const n = players.length;

  const rounds = generateRounds(n);
  const repeatedRounds = repeatRounds(rounds, roundRobinFreq);
  const schedule = buildSchedule(repeatedRounds, numTables);

  console.log(`=== ${description} ===`);
  console.log('');
  console.log('Schedule:');
  schedule.forEach((slot, i) => {
    const line = slot.length > 0
      ? slot.map(([a, b]) => `${players[a]} vs ${players[b]}`).join(' | ')
      : '(empty)';
    console.log(`  Slot ${i + 1}: ${line}`);
  });
  console.log('');

  const slotsPlayedMap = new Map();
  for (let i = 0; i < n; i++) slotsPlayedMap.set(i, []);
  schedule.forEach((slot, slotIdx) => {
    slot.forEach(([a, b]) => {
      slotsPlayedMap.get(a).push(slotIdx + 1);
      slotsPlayedMap.get(b).push(slotIdx + 1);
    });
  });

  console.log('Per-player slots played:');
  const allGaps = [];
  for (let i = 0; i < n; i++) {
    const slots = slotsPlayedMap.get(i);
    const gaps = [];
    for (let j = 1; j < slots.length; j++) {
      gaps.push(slots[j] - slots[j - 1]);
    }
    allGaps.push(...gaps);
    const gMean = mean(gaps);
    const gStd = std(gaps);
    const gMin = gaps.length ? Math.min(...gaps) : null;
    const gMax = gaps.length ? Math.max(...gaps) : null;
    console.log(
      `  ${players[i]}: [${slots.join(', ')}]  gaps: [${gaps.join(', ')}]  ` +
      `mean=${fmt(gMean)}, std=${fmt(gStd)}, min=${gMin === null ? 'n/a' : gMin}, max=${gMax === null ? 'n/a' : gMax}`
    );
  }
  console.log('');

  console.log('Aggregate rest-gap stats:');
  const aggMean = mean(allGaps);
  const aggStd = std(allGaps);
  const aggMin = allGaps.length ? Math.min(...allGaps) : null;
  const aggMax = allGaps.length ? Math.max(...allGaps) : null;
  console.log(`  Mean gap across all players: ${fmt(aggMean)}`);
  console.log(`  Std of all gaps: ${fmt(aggStd)}`);
  console.log(`  Min gap (worst back-to-back): ${aggMin === null ? 'n/a' : aggMin}`);
  console.log(`  Max gap (longest wait): ${aggMax === null ? 'n/a' : aggMax}`);
  console.log('');

  const pairCounts = new Map();
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairCounts.set(`${i}-${j}`, 0);
    }
  }
  let noDoubleBooking = true;
  schedule.forEach((slot) => {
    const seen = new Set();
    slot.forEach(([a, b]) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      if (seen.has(a) || seen.has(b)) noDoubleBooking = false;
      seen.add(a);
      seen.add(b);
    });
  });
  let pairsCorrect = true;
  for (const count of pairCounts.values()) {
    if (count !== roundRobinFreq) pairsCorrect = false;
  }

  console.log('Constraints verified:');
  console.log(`  [${pairsCorrect ? '✓' : '✗'}] Every pair plays exactly ${roundRobinFreq} time(s)`);
  console.log(`  [${noDoubleBooking ? '✓' : '✗'}] No player in two matches per slot`);
  console.log(`  [✓] Total slots: ${schedule.length}`);
  console.log('');
}

const testCases = [
  {
    description: 'Case 1: 4 players, numTables=1, roundRobinFreq=1',
    players: ['Alice', 'Bob', 'Carol', 'Dave'],
    roundRobinFreq: 1,
    numTables: 1,
  },
  {
    description: 'Case 2: 4 players, numTables=2, roundRobinFreq=1',
    players: ['Alice', 'Bob', 'Carol', 'Dave'],
    roundRobinFreq: 1,
    numTables: 2,
  },
  {
    description: 'Case 3: 6 players, numTables=1, roundRobinFreq=1',
    players: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'],
    roundRobinFreq: 1,
    numTables: 1,
  },
  {
    description: 'Case 4: 6 players, numTables=2, roundRobinFreq=1',
    players: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'],
    roundRobinFreq: 1,
    numTables: 2,
  },
  {
    description: 'Case 5: 6 players, numTables=3, roundRobinFreq=1',
    players: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'],
    roundRobinFreq: 1,
    numTables: 3,
  },
  {
    description: 'Case 6: 8 players, numTables=1, roundRobinFreq=1',
    players: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi'],
    roundRobinFreq: 1,
    numTables: 1,
  },
  {
    description: 'Case 7: 10 players, numTables=2, roundRobinFreq=1',
    players: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'],
    roundRobinFreq: 1,
    numTables: 2,
  },
  {
    description: 'Case 8: 4 players, numTables=1, roundRobinFreq=2',
    players: ['Alice', 'Bob', 'Carol', 'Dave'],
    roundRobinFreq: 2,
    numTables: 1,
  },
  {
    description: 'Case 9: 5 players, numTables=1, roundRobinFreq=1 (odd N — one bye per round)',
    players: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'],
    roundRobinFreq: 1,
    numTables: 1,
  },
  {
    description: 'Case 10: 5 players, numTables=2, roundRobinFreq=1',
    players: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'],
    roundRobinFreq: 1,
    numTables: 2,
  },
];

testCases.forEach(runCase);
