// ─────────────────────────────────────────────────────────────────────────────
// Fixture Generator — Pure TypeScript Scheduling Engine
// src/utils/sports/fixtureGenerator.ts
//
// Algorithms: Berger Table (Round Robin) + Single Elimination (Knockout)
// No React, no side effects — pure input → output transformations.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/** Represents a single match row ready for insertion into public.sports_fixtures */
export interface FixtureRow {
  tournament_id: string;
  home_team_id: string | null;   // null = BYE slot
  away_team_id: string | null;   // null = BYE slot
  match_date: string | null;     // ISO date string e.g. "2026-08-10"
  venue: string | null;
  round_number: number;
  status: 'Scheduled' | 'Ongoing' | 'Completed' | 'Postponed';
  home_score: number;
  away_score: number;
}

/** A named round containing an ordered set of fixtures */
export interface TournamentRound {
  round_number: number;
  round_label: string;           // e.g. "Quarter-Finals", "Round 1"
  fixtures: FixtureRow[];
}

/** Input shape for date+venue allocation */
interface AllocationSlot {
  date: string | null;
  venue: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

const BYE = '__BYE__' as const;

/**
 * Distributes date+venue pairs across a list of fixture rows.
 * Cycles through available dates and venues, ensuring no two fixtures on the
 * same round share the same date+venue combination where possible.
 */
export function allocateDateVenue(
  fixtures: FixtureRow[],
  availableDates: string[],
  venues: string[],
): FixtureRow[] {
  if (!availableDates.length && !venues.length) return fixtures;

  const usedSlots = new Set<string>();

  const slots: AllocationSlot[] = [];

  if (availableDates.length && venues.length) {
    for (const d of availableDates) {
      for (const v of venues) {
        slots.push({ date: d, venue: v });
      }
    }
  } else if (availableDates.length) {
    for (const d of availableDates) slots.push({ date: d, venue: null });
  } else {
    for (const v of venues) slots.push({ date: null, venue: v });
  }

  let slotIndex = 0;

  return fixtures.map((fx) => {
    let assigned: AllocationSlot = slots[slotIndex % slots.length];
    let attempts = 0;

    while (attempts < slots.length) {
      const candidate = slots[(slotIndex + attempts) % slots.length];
      const key = `${candidate.date}::${candidate.venue}`;
      if (!usedSlots.has(key)) {
        assigned = candidate;
        usedSlots.add(key);
        slotIndex = (slotIndex + attempts + 1) % slots.length;
        break;
      }
      attempts++;
    }

    if (attempts === slots.length) {
      assigned = slots[slotIndex % slots.length];
      slotIndex = (slotIndex + 1) % slots.length;
    }

    return { ...fx, match_date: assigned.date, venue: assigned.venue };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Round Robin — Berger Table Algorithm
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a full round-robin fixture list using the Berger Table algorithm.
 * Every team plays every other team exactly once.
 *
 * - Handles odd team counts by inserting a BYE dummy (matches against BYE are
 *   omitted from the output).
 * - Returns a flat array of FixtureRow[] already populated with dates/venues.
 */
export function generateRoundRobin(
  teamIds: string[],
  tournamentId: string,
  availableDates: string[] = [],
  venues: string[] = [],
): FixtureRow[] {
  if (teamIds.length < 2) return [];

  const teams: string[] = teamIds.length % 2 === 0
    ? [...teamIds]
    : [...teamIds, BYE];

  const n = teams.length;
  const numRounds = n - 1;
  const matchesPerRound = n / 2;

  const allFixtures: FixtureRow[] = [];

  for (let round = 0; round < numRounds; round++) {
    const roundFixtures: FixtureRow[] = [];

    for (let match = 0; match < matchesPerRound; match++) {
      let homeIdx: number;
      let awayIdx: number;

      if (match === 0) {
        homeIdx = 0;
        awayIdx = n - 1;
      } else {
        homeIdx = match;
        awayIdx = n - 1 - match;
      }

      const rotatedHome = homeIdx === 0
        ? teams[0]
        : teams[((homeIdx - 1 + round) % (n - 1)) + 1];
      const rotatedAway = awayIdx === 0
        ? teams[0]
        : teams[((awayIdx - 1 + round) % (n - 1)) + 1];

      // Skip BYE matches
      if (rotatedHome === BYE || rotatedAway === BYE) continue;

      const [finalHome, finalAway] = round % 2 === 0
        ? [rotatedHome, rotatedAway]
        : [rotatedAway, rotatedHome];

      roundFixtures.push({
        tournament_id: tournamentId,
        home_team_id: finalHome,
        away_team_id: finalAway,
        match_date: null,
        venue: null,
        round_number: round + 1,
        status: 'Scheduled',
        home_score: 0,
        away_score: 0,
      });
    }

    allFixtures.push(...roundFixtures);
  }

  return allocateDateVenue(allFixtures, availableDates, venues);
}

// ─────────────────────────────────────────────────────────────────────────────
// Knockout Bracket — Single Elimination
// ─────────────────────────────────────────────────────────────────────────────

function getRoundLabel(roundNumber: number, totalRounds: number): string {
  const fromFinal = totalRounds - roundNumber;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semi-Finals';
  if (fromFinal === 2) return 'Quarter-Finals';
  if (fromFinal === 3) return 'Round of 16';
  return `Round ${roundNumber}`;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Generates a single-elimination knockout bracket.
 *
 * - Pads to the next power of 2 with BYE entries.
 * - Round 1 has real matchups; subsequent rounds are TBD placeholders (null
 *   team IDs) to be filled in as matches complete.
 */
export function generateKnockoutBracket(
  seededTeamIds: string[],
  tournamentId: string,
  availableDates: string[] = [],
  venues: string[] = [],
): TournamentRound[] {
  if (seededTeamIds.length < 2) return [];

  const bracketSize = nextPowerOfTwo(seededTeamIds.length);
  const totalRounds = Math.log2(bracketSize);

  const paddedTeams: (string | typeof BYE)[] = [
    ...seededTeamIds,
    ...Array(bracketSize - seededTeamIds.length).fill(BYE),
  ];

  // Standard bracket seeding: 1 vs last, 2 vs second-to-last, etc.
  const seededPairs: Array<[string | typeof BYE, string | typeof BYE]> = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    seededPairs.push([paddedTeams[i], paddedTeams[bracketSize - 1 - i]]);
  }

  const rounds: TournamentRound[] = [];

  const round1Fixtures: FixtureRow[] = seededPairs.map(([home, away]) => ({
    tournament_id: tournamentId,
    home_team_id: home === BYE ? null : home,
    away_team_id: away === BYE ? null : away,
    match_date: null,
    venue: null,
    round_number: 1,
    status: 'Scheduled' as const,
    home_score: 0,
    away_score: 0,
  }));

  rounds.push({
    round_number: 1,
    round_label: getRoundLabel(1, totalRounds),
    fixtures: allocateDateVenue(round1Fixtures, availableDates, venues),
  });

  let matchesInRound = bracketSize / 4;
  for (let round = 2; round <= totalRounds; round++) {
    const placeholderFixtures: FixtureRow[] = Array.from(
      { length: matchesInRound },
      () => ({
        tournament_id: tournamentId,
        home_team_id: null,
        away_team_id: null,
        match_date: null,
        venue: null,
        round_number: round,
        status: 'Scheduled' as const,
        home_score: 0,
        away_score: 0,
      }),
    );

    rounds.push({
      round_number: round,
      round_label: getRoundLabel(round, totalRounds),
      fixtures: allocateDateVenue(
        placeholderFixtures,
        availableDates.slice(Math.min(round - 1, availableDates.length - 1)),
        venues,
      ),
    });

    matchesInRound = Math.max(1, matchesInRound / 2);
  }

  return rounds;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility — Flatten TournamentRound[] → FixtureRow[]
// ─────────────────────────────────────────────────────────────────────────────

/** Flattens all rounds into a single insertable array for batch Supabase insert */
export function flattenRounds(rounds: TournamentRound[]): FixtureRow[] {
  return rounds.flatMap((r) => r.fixtures);
}
