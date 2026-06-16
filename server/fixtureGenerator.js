'use strict';

function generateRounds(n) {
  const hasBye = n % 2 !== 0;
  const m = hasBye ? n + 1 : n;
  const byeIndex = hasBye ? n : -1;
  let arr = [];
  for (let i = 0; i < m; i++) arr.push(i);

  const rounds = [];
  for (let r = 0; r < m - 1; r++) {
    const roundPairs = [];
    for (let i = 0; i < m / 2; i++) {
      const a = arr[i];
      const b = arr[m - 1 - i];
      if (a !== byeIndex && b !== byeIndex) {
        roundPairs.push([a, b]);
      }
    }
    rounds.push(roundPairs);

    const fixed = arr[0];
    const rest = arr.slice(1);
    const lastEl = rest.pop();
    rest.unshift(lastEl);
    arr = [fixed, ...rest];
  }
  return rounds;
}

function repeatRounds(rounds, freq) {
  const repeated = [];
  for (let cycle = 0; cycle < freq; cycle++) {
    repeated.push(...rounds);
  }
  return repeated;
}

function buildSchedule(repeatedRounds, numTables) {
  const schedule = [];
  const lastSlotPlayed = new Map();
  let slotIndex = 0;

  for (const round of repeatedRounds) {
    const pool = round.slice();
    const slotsNeeded = Math.ceil(pool.length / numTables);
    for (let s = 0; s < slotsNeeded; s++) {
      pool.sort((m1, m2) => {
        const score1 = Math.min(
          lastSlotPlayed.has(m1[0]) ? lastSlotPlayed.get(m1[0]) : -1,
          lastSlotPlayed.has(m1[1]) ? lastSlotPlayed.get(m1[1]) : -1
        );
        const score2 = Math.min(
          lastSlotPlayed.has(m2[0]) ? lastSlotPlayed.get(m2[0]) : -1,
          lastSlotPlayed.has(m2[1]) ? lastSlotPlayed.get(m2[1]) : -1
        );
        return score1 - score2;
      });
      const chosen = pool.splice(0, numTables);
      schedule.push(chosen);
      for (const [a, b] of chosen) {
        lastSlotPlayed.set(a, slotIndex);
        lastSlotPlayed.set(b, slotIndex);
      }
      slotIndex++;
    }
  }
  return schedule;
}

function generateFixtures(players, roundRobinFreq, numTables) {
  const rounds = generateRounds(players.length);
  const repeatedRounds = repeatRounds(rounds, roundRobinFreq);
  const schedule = buildSchedule(repeatedRounds, numTables);

  return schedule.map((slot) =>
    slot.map(([a, b]) => ({ playerA: players[a], playerB: players[b] }))
  );
}

module.exports = { generateRounds, repeatRounds, buildSchedule, generateFixtures };
