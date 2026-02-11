import db from '../db/database.js';
import { generateSeed, hashSeed } from './rng.js';
import { updateStats, checkAchievements } from './achievementService.js';
import { applyPrestigeBonus } from './prestigeService.js';
import {
  CardData, Suit, Rank,
  UTHPhase, UTHAction, UTHState, UTHResult, UTHBetBreakdown,
  PokerHandRank, BLIND_PAY_TABLE, TRIPS_PAY_TABLE, AchievementUnlock,
} from '../../../shared/types.ts';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ============ Session Store ============
interface UTHSession {
  userId: number;
  deck: CardData[];
  playerHand: CardData[];
  dealerHand: CardData[];
  communityCards: CardData[];   // all 5 pre-dealt
  revealedCommunity: number;    // how many revealed
  phase: UTHPhase;
  bets: UTHBetBreakdown;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

const sessions = new Map<string, UTHSession>();

// ============ Deck ============
function createDeck(): CardData[] {
  const deck: CardData[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: true });
    }
  }
  return deck;
}

function shuffleDeck(deck: CardData[]): void {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function dealCard(deck: CardData[]): CardData {
  return deck.pop()!;
}

// ============ Poker Hand Evaluator ============
function rankValue(rank: Rank): number {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank);
}

interface HandEval {
  score: number;
  rank: PokerHandRank;
  name: string;
}

const HAND_NAMES: Record<PokerHandRank, string> = {
  royal_flush: 'Royal Flush',
  straight_flush: 'Straight Flush',
  four_of_a_kind: 'Four of a Kind',
  full_house: 'Full House',
  flush: 'Flush',
  straight: 'Straight',
  three_of_a_kind: 'Three of a Kind',
  two_pair: 'Two Pair',
  one_pair: 'One Pair',
  high_card: 'High Card',
};

const HAND_TYPE_VALUES: Record<PokerHandRank, number> = {
  royal_flush: 9,
  straight_flush: 8,
  four_of_a_kind: 7,
  full_house: 6,
  flush: 5,
  straight: 4,
  three_of_a_kind: 3,
  two_pair: 2,
  one_pair: 1,
  high_card: 0,
};

function evaluate5(cards: CardData[]): HandEval {
  const values = cards.map(c => rankValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = values[0];
  if (values[0] - values[4] === 4 && new Set(values).size === 5) {
    isStraight = true;
  }
  // Ace-low straight (A-2-3-4-5)
  if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
    isStraight = true;
    straightHigh = 5;
  }

  // Count frequencies
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) || 0) + 1);
  const counts = Array.from(freq.entries()).sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  const base = 10_000_000_000;

  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return { score: base * 9 + 14, rank: 'royal_flush', name: 'Royal Flush' };
    }
    return { score: base * 8 + straightHigh, rank: 'straight_flush', name: `Straight Flush (${straightHigh} high)` };
  }

  if (counts[0][1] === 4) {
    const quad = counts[0][0];
    const kicker = counts[1][0];
    return { score: base * 7 + quad * 100 + kicker, rank: 'four_of_a_kind', name: `Four ${rankName(quad)}s` };
  }

  if (counts[0][1] === 3 && counts[1][1] === 2) {
    const trips = counts[0][0];
    const pair = counts[1][0];
    return { score: base * 6 + trips * 100 + pair, rank: 'full_house', name: `Full House (${rankName(trips)}s full of ${rankName(pair)}s)` };
  }

  if (isFlush) {
    const tiebreaker = values[0] * 10000 + values[1] * 1000 + values[2] * 100 + values[3] * 10 + values[4];
    return { score: base * 5 + tiebreaker, rank: 'flush', name: `Flush (${rankName(values[0])} high)` };
  }

  if (isStraight) {
    return { score: base * 4 + straightHigh, rank: 'straight', name: `Straight (${rankName(straightHigh)} high)` };
  }

  if (counts[0][1] === 3) {
    const trips = counts[0][0];
    const kickers = counts.slice(1).map(c => c[0]);
    return { score: base * 3 + trips * 10000 + kickers[0] * 100 + kickers[1], rank: 'three_of_a_kind', name: `Three ${rankName(trips)}s` };
  }

  if (counts[0][1] === 2 && counts[1][1] === 2) {
    const high = Math.max(counts[0][0], counts[1][0]);
    const low = Math.min(counts[0][0], counts[1][0]);
    const kicker = counts[2][0];
    return { score: base * 2 + high * 10000 + low * 100 + kicker, rank: 'two_pair', name: `Two Pair (${rankName(high)}s and ${rankName(low)}s)` };
  }

  if (counts[0][1] === 2) {
    const pair = counts[0][0];
    const kickers = counts.slice(1).map(c => c[0]);
    return { score: base * 1 + pair * 1000000 + kickers[0] * 10000 + kickers[1] * 100 + kickers[2], rank: 'one_pair', name: `Pair of ${rankName(pair)}s` };
  }

  const tiebreaker = values[0] * 100000000 + values[1] * 1000000 + values[2] * 10000 + values[3] * 100 + values[4];
  return { score: base * 0 + tiebreaker, rank: 'high_card', name: `${rankName(values[0])} High` };
}

function rankName(value: number): string {
  if (value === 14) return 'Ace';
  if (value === 13) return 'King';
  if (value === 12) return 'Queen';
  if (value === 11) return 'Jack';
  return String(value);
}

function combinations5(cards: CardData[]): CardData[][] {
  const result: CardData[][] = [];
  const n = cards.length;
  for (let i = 0; i < n - 4; i++)
    for (let j = i + 1; j < n - 3; j++)
      for (let k = j + 1; k < n - 2; k++)
        for (let l = k + 1; l < n - 1; l++)
          for (let m = l + 1; m < n; m++)
            result.push([cards[i], cards[j], cards[k], cards[l], cards[m]]);
  return result;
}

function bestHand(sevenCards: CardData[]): HandEval {
  const combos = combinations5(sevenCards);
  let best: HandEval | null = null;
  for (const combo of combos) {
    const ev = evaluate5(combo);
    if (!best || ev.score > best.score) best = ev;
  }
  return best!;
}

// ============ Game Logic ============
function getBalance(userId: number): number {
  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
  return user.balance_cents;
}

function deductBalance(userId: number, amount: number): void {
  db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?').run(amount, userId);
  db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)').run(userId, -amount, 'BET', 'uth');
}

function addBalance(userId: number, amount: number, type: string): void {
  db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(amount, userId);
  db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)').run(userId, amount, type, 'uth');
}

function getAvailableActions(session: UTHSession): UTHAction[] {
  const balance = getBalance(session.userId);
  const ante = session.bets.ante_cents;

  switch (session.phase) {
    case 'preflop': {
      const actions: UTHAction[] = ['check'];
      if (balance >= ante * 4) actions.push('bet4x');
      if (balance >= ante * 3) actions.push('bet3x');
      return actions;
    }
    case 'flop': {
      const actions: UTHAction[] = ['check'];
      if (balance >= ante * 2) actions.push('bet2x');
      return actions;
    }
    case 'river': {
      const actions: UTHAction[] = ['fold'];
      if (balance >= ante) actions.push('bet1x');
      return actions;
    }
    default:
      return [];
  }
}

function buildState(sessionId: string, session: UTHSession): UTHState {
  const state: UTHState = {
    session_id: sessionId,
    phase: session.phase,
    player_hand: session.playerHand,
    dealer_hand: session.phase === 'showdown'
      ? session.dealerHand
      : session.dealerHand.map(c => ({ ...c, rank: '?' as Rank, suit: 'spades' as Suit, faceUp: false })),
    community_cards: session.communityCards.slice(0, session.revealedCommunity),
    bets: { ...session.bets },
    available_actions: session.phase === 'showdown' ? [] : getAvailableActions(session),
    new_balance_cents: getBalance(session.userId),
  };

  if (session.phase === 'showdown') {
    const allPlayer = [...session.playerHand, ...session.communityCards];
    const allDealer = [...session.dealerHand, ...session.communityCards];
    const playerEval = bestHand(allPlayer);
    const dealerEval = bestHand(allDealer);
    state.player_hand_rank = playerEval.rank;
    state.player_hand_name = playerEval.name;
    state.dealer_hand_rank = dealerEval.rank;
    state.dealer_hand_name = dealerEval.name;
  }

  return state;
}

function resolveShowdown(sessionId: string, session: UTHSession): UTHResult {
  const allPlayer = [...session.playerHand, ...session.communityCards];
  const allDealer = [...session.dealerHand, ...session.communityCards];
  const playerEval = bestHand(allPlayer);
  const dealerEval = bestHand(allDealer);

  const { ante_cents, blind_cents, play_cents, trips_cents } = session.bets;

  // Dealer qualifies with pair or better
  const dealerQualifies = HAND_TYPE_VALUES[dealerEval.rank] >= 1; // one_pair or better

  let antePayout = 0;
  let blindPayout = 0;
  let playPayout = 0;
  let tripsPayout = 0;
  let outcome: UTHResult['outcome'];

  if (playerEval.score > dealerEval.score) {
    outcome = 'player_wins';

    // Play bet: 1:1
    playPayout = play_cents * 2;

    // Ante: 1:1 if dealer qualifies, push if not
    antePayout = dealerQualifies ? ante_cents * 2 : ante_cents;

    // Blind: pay table for strong hands, 1:1 push for weaker
    const blindMultiplier = BLIND_PAY_TABLE[playerEval.rank];
    if (blindMultiplier) {
      blindPayout = blind_cents + Math.floor(blind_cents * blindMultiplier);
    } else {
      blindPayout = blind_cents; // push - return blind
    }
  } else if (playerEval.score < dealerEval.score) {
    outcome = 'dealer_wins';
    // Player loses ante, blind, play
    antePayout = 0;
    blindPayout = 0;
    playPayout = 0;
  } else {
    outcome = 'push';
    // All bets returned
    antePayout = ante_cents;
    blindPayout = blind_cents;
    playPayout = play_cents;
  }

  // Trips: independent - evaluate player hand regardless of outcome
  if (trips_cents > 0) {
    const tripsMultiplier = TRIPS_PAY_TABLE[playerEval.rank];
    if (tripsMultiplier) {
      tripsPayout = trips_cents + Math.floor(trips_cents * tripsMultiplier);
    }
    // else trips_cents is lost
  }

  let totalPayout = antePayout + blindPayout + playPayout + tripsPayout;

  // Apply prestige bonus
  const totalWageredUTH = ante_cents + blind_cents + trips_cents + play_cents;
  if (totalPayout > totalWageredUTH) {
    totalPayout = applyPrestigeBonus(session.userId, totalPayout, totalWageredUTH);
  }

  if (totalPayout > 0) {
    addBalance(session.userId, totalPayout, outcome === 'push' ? 'PUSH' : 'WIN');
  }

  logGame(session);

  // Achievement tracking
  const totalWagered = ante_cents + blind_cents + trips_cents + play_cents;
  updateStats(session.userId, { wagered: totalWagered, won: totalPayout, isWin: outcome === 'player_wins', gameType: 'uth' });
  const newAchievements = checkAchievements(session.userId);

  sessions.delete(sessionId);

  return {
    outcome,
    dealer_qualifies: dealerQualifies,
    ante_payout_cents: antePayout,
    blind_payout_cents: blindPayout,
    play_payout_cents: playPayout,
    trips_payout_cents: tripsPayout,
    total_payout_cents: totalPayout,
    new_balance_cents: getBalance(session.userId),
    _newAchievements: newAchievements.length > 0 ? newAchievements : undefined,
  } as UTHResult & { _newAchievements?: AchievementUnlock[] };
}

function logGame(session: UTHSession): void {
  db.prepare(
    'INSERT INTO game_logs (user_id, game_type, server_seed, client_seed, nonce, result_data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    session.userId, 'uth', session.serverSeed, session.clientSeed, session.nonce,
    JSON.stringify({
      playerHand: session.playerHand,
      dealerHand: session.dealerHand,
      communityCards: session.communityCards,
      bets: session.bets,
      phase: session.phase,
    })
  );
}

// ============ Public API ============
export function dealUTH(userId: number, anteCents: number, tripsCents: number = 0): UTHState {
  const blindCents = anteCents; // blind always equals ante
  const totalDeduct = anteCents + blindCents + tripsCents;

  const balance = getBalance(userId);
  if (balance < totalDeduct) throw new Error('Insufficient balance');

  deductBalance(userId, totalDeduct);

  const serverSeed = generateSeed();
  const clientSeed = generateSeed();
  const nonce = Date.now();

  const deck = createDeck();
  shuffleDeck(deck);

  const playerHand = [dealCard(deck), dealCard(deck)];
  const dealerHand = [dealCard(deck), dealCard(deck)];
  const communityCards = [dealCard(deck), dealCard(deck), dealCard(deck), dealCard(deck), dealCard(deck)];

  const sessionId = generateSeed().substring(0, 16);

  const session: UTHSession = {
    userId,
    deck,
    playerHand,
    dealerHand,
    communityCards,
    revealedCommunity: 0,
    phase: 'preflop',
    bets: { ante_cents: anteCents, blind_cents: blindCents, trips_cents: tripsCents, play_cents: 0 },
    serverSeed,
    clientSeed,
    nonce,
  };

  sessions.set(sessionId, session);

  return buildState(sessionId, session);
}

export function uthAction(sessionId: string, userId: number, action: UTHAction): UTHState {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) throw new Error('Invalid session');

  const available = getAvailableActions(session);
  if (!available.includes(action)) throw new Error(`Action '${action}' not available`);

  const ante = session.bets.ante_cents;

  switch (session.phase) {
    case 'preflop': {
      if (action === 'bet4x' || action === 'bet3x') {
        const multiplier = action === 'bet4x' ? 4 : 3;
        const playBet = ante * multiplier;
        deductBalance(session.userId, playBet);
        session.bets.play_cents = playBet;
        // Reveal all community + dealer, go to showdown
        session.revealedCommunity = 5;
        session.phase = 'showdown';
        const state = buildState(sessionId, session);
        const rawResult = resolveShowdown(sessionId, session) as UTHResult & { _newAchievements?: AchievementUnlock[] };
        state.result = rawResult;
        state.new_balance_cents = rawResult.new_balance_cents;
        state.new_achievements = rawResult._newAchievements;
        return state;
      }
      // Check -> reveal flop
      session.revealedCommunity = 3;
      session.phase = 'flop';
      return buildState(sessionId, session);
    }

    case 'flop': {
      if (action === 'bet2x') {
        const playBet = ante * 2;
        deductBalance(session.userId, playBet);
        session.bets.play_cents = playBet;
        // Reveal remaining community + dealer, go to showdown
        session.revealedCommunity = 5;
        session.phase = 'showdown';
        const state = buildState(sessionId, session);
        const rawResult = resolveShowdown(sessionId, session) as UTHResult & { _newAchievements?: AchievementUnlock[] };
        state.result = rawResult;
        state.new_balance_cents = rawResult.new_balance_cents;
        state.new_achievements = rawResult._newAchievements;
        return state;
      }
      // Check -> reveal turn + river
      session.revealedCommunity = 5;
      session.phase = 'river';
      return buildState(sessionId, session);
    }

    case 'river': {
      if (action === 'bet1x') {
        const playBet = ante;
        deductBalance(session.userId, playBet);
        session.bets.play_cents = playBet;
        session.phase = 'showdown';
        const state = buildState(sessionId, session);
        const rawResult = resolveShowdown(sessionId, session) as UTHResult & { _newAchievements?: AchievementUnlock[] };
        state.result = rawResult;
        state.new_balance_cents = rawResult.new_balance_cents;
        state.new_achievements = rawResult._newAchievements;
        return state;
      }
      // Fold
      session.phase = 'showdown';

      // Evaluate trips independently on fold
      let tripsPayout = 0;
      if (session.bets.trips_cents > 0) {
        const allPlayer = [...session.playerHand, ...session.communityCards];
        const playerEval = bestHand(allPlayer);
        const tripsMultiplier = TRIPS_PAY_TABLE[playerEval.rank];
        if (tripsMultiplier) {
          tripsPayout = session.bets.trips_cents + Math.floor(session.bets.trips_cents * tripsMultiplier);
          addBalance(session.userId, tripsPayout, 'WIN');
        }
      }

      logGame(session);

      // Achievement tracking for fold
      const foldWagered = session.bets.ante_cents + session.bets.blind_cents + session.bets.trips_cents;
      updateStats(session.userId, { wagered: foldWagered, won: tripsPayout, isWin: false, gameType: 'uth' });
      const foldAchievements = checkAchievements(session.userId);

      sessions.delete(sessionId);

      const allPlayerForName = [...session.playerHand, ...session.communityCards];
      const playerEvalForName = bestHand(allPlayerForName);
      const dealerEvalForName = bestHand([...session.dealerHand, ...session.communityCards]);

      const result: UTHResult = {
        outcome: 'fold',
        dealer_qualifies: false,
        ante_payout_cents: 0,
        blind_payout_cents: 0,
        play_payout_cents: 0,
        trips_payout_cents: tripsPayout,
        total_payout_cents: tripsPayout,
        new_balance_cents: getBalance(session.userId),
      };

      return {
        session_id: sessionId,
        phase: 'showdown',
        player_hand: session.playerHand,
        dealer_hand: session.dealerHand,
        community_cards: session.communityCards,
        bets: session.bets,
        available_actions: [],
        player_hand_rank: playerEvalForName.rank,
        player_hand_name: playerEvalForName.name,
        dealer_hand_rank: dealerEvalForName.rank,
        dealer_hand_name: dealerEvalForName.name,
        result,
        new_balance_cents: result.new_balance_cents,
        new_achievements: foldAchievements.length > 0 ? foldAchievements : undefined,
      };
    }

    default:
      throw new Error('Game already ended');
  }
}
