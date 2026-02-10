import db from '../db/database.js';
import { generateSeed, hashSeed } from './rng.js';
import { updateStats, checkAchievements } from './achievementService.js';
import { CardData, Suit, Rank, BlackjackState, BlackjackAction, BlackjackHandState, AchievementUnlock } from '../../../shared/types.ts';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ============ Session types ============

interface HandSession {
  cards: CardData[];
  betCents: number;
  status: 'playing' | 'standing' | 'busted' | 'blackjack' | 'surrendered';
  isFromSplit: boolean;
}

interface Session {
  userId: number;
  deck: CardData[];
  hands: HandSession[];
  activeHandIndex: number;
  dealerHand: CardData[];
  gamePhase: 'insurance_prompt' | 'playing' | 'resolved';
  insuranceBetCents: number;
  insurancePayoutCents: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  newAchievements?: AchievementUnlock[];
}

const sessions = new Map<string, Session>();

// ============ Deck helpers ============

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

function cardValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return parseInt(rank);
}

export function handValue(hand: CardData[]): number {
  let value = 0;
  let aces = 0;

  for (const card of hand) {
    value += cardValue(card.rank);
    if (card.rank === 'A') aces++;
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

function dealCard(deck: CardData[], faceUp = true): CardData {
  const card = deck.pop()!;
  return { ...card, faceUp };
}

// ============ Helper: compute available actions ============

function computeAvailableActions(session: Session): BlackjackAction[] {
  if (session.gamePhase === 'insurance_prompt') {
    return ['insurance_yes', 'insurance_no'];
  }
  if (session.gamePhase === 'resolved') {
    return [];
  }

  const hand = session.hands[session.activeHandIndex];
  if (!hand || hand.status !== 'playing') return [];

  const actions: BlackjackAction[] = ['hit', 'stand'];

  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(session.userId) as { balance_cents: number };

  // Double: only with 2 cards on current hand, and player has enough balance
  if (hand.cards.length === 2 && user.balance_cents >= hand.betCents) {
    actions.push('double');
  }

  // Split: only with 2 cards of same rank, not already from split, and player has enough balance
  if (
    hand.cards.length === 2 &&
    !hand.isFromSplit &&
    hand.cards[0].rank === hand.cards[1].rank &&
    user.balance_cents >= hand.betCents
  ) {
    actions.push('split');
  }

  // Surrender: only with initial 2 cards, not from split
  if (hand.cards.length === 2 && !hand.isFromSplit) {
    actions.push('surrender');
  }

  return actions;
}

// ============ Helper: advance to next hand or dealer turn ============

function advanceHand(session: Session): void {
  let nextIdx = session.activeHandIndex + 1;
  while (nextIdx < session.hands.length && session.hands[nextIdx].status !== 'playing') {
    nextIdx++;
  }
  if (nextIdx < session.hands.length) {
    session.activeHandIndex = nextIdx;
  } else {
    // All hands done - proceed to dealer turn
    dealerPlay(session);
    resolveGame(session);
  }
}

// ============ Helper: dealer plays ============

function dealerPlay(session: Session): void {
  // Check if all player hands are busted or surrendered - dealer doesn't need to play
  const allBustedOrSurrendered = session.hands.every(h => h.status === 'busted' || h.status === 'surrendered');
  if (allBustedOrSurrendered) return;

  // Reveal hole card
  session.dealerHand[1].faceUp = true;

  // Dealer draws to 17+
  while (handValue(session.dealerHand) < 17) {
    session.dealerHand.push(dealCard(session.deck));
  }
}

// ============ Helper: resolve all hands against dealer ============

function resolveGame(session: Session): void {
  session.gamePhase = 'resolved';
  session.dealerHand[1].faceUp = true;
  const dealerVal = handValue(session.dealerHand);

  let totalPayoutCents = 0;

  for (const hand of session.hands) {
    if (hand.status === 'busted') {
      // Already lost, no payout
      continue;
    }
    if (hand.status === 'surrendered') {
      // Already returned half
      continue;
    }

    const playerVal = handValue(hand.cards);
    let payoutCents = 0;

    if (hand.status === 'blackjack' && !hand.isFromSplit) {
      // Natural blackjack pays 3:2 (already handled in deal for non-split)
      // This case shouldn't normally reach here since naturals are resolved at deal time
      payoutCents = Math.floor(hand.betCents * 2.5);
    } else if (dealerVal > 21) {
      // Dealer bust - player wins
      payoutCents = hand.betCents * 2;
    } else if (playerVal > dealerVal) {
      payoutCents = hand.betCents * 2;
    } else if (dealerVal > playerVal) {
      // Dealer wins
      payoutCents = 0;
    } else {
      // Push
      payoutCents = hand.betCents;
    }

    if (payoutCents > 0) {
      totalPayoutCents += payoutCents;
    }
  }

  // Add insurance payout if any
  totalPayoutCents += session.insurancePayoutCents;

  if (totalPayoutCents > 0) {
    db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
      .run(totalPayoutCents, session.userId);
    // Log transaction
    const netWin = totalPayoutCents - session.hands.reduce((sum, h) => sum + h.betCents, 0);
    if (netWin > 0) {
      db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
        .run(session.userId, totalPayoutCents, 'WIN', 'blackjack');
    }
  }

  logGame(session);

  // Achievement tracking
  const totalWagered = session.hands.reduce((sum, h) => sum + h.betCents, 0) + session.insuranceBetCents;
  const isWin = totalPayoutCents > totalWagered;
  updateStats(session.userId, { wagered: totalWagered, won: totalPayoutCents, isWin, gameType: 'blackjack' });
  session.newAchievements = checkAchievements(session.userId);
}

// ============ Helper: build response state ============

function buildBlackjackState(sessionId: string, session: Session): BlackjackState {
  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(session.userId) as { balance_cents: number };
  const activeHand = session.hands[session.activeHandIndex] || session.hands[0];
  const dealerVal = session.gamePhase === 'resolved' ? handValue(session.dealerHand) : null;

  // Build per-hand states
  const hands: BlackjackHandState[] = session.hands.map(h => ({
    cards: h.cards,
    value: handValue(h.cards),
    status: h.status,
    bet_cents: h.betCents,
    is_from_split: h.isFromSplit,
  }));

  // Compute hand outcomes
  const handOutcomes: (string | null)[] = session.hands.map(h => {
    if (session.gamePhase !== 'resolved') return null;
    if (h.status === 'surrendered') return 'surrendered';
    if (h.status === 'busted') return 'player_bust';
    if (h.status === 'blackjack' && !h.isFromSplit) return 'blackjack';
    const dv = handValue(session.dealerHand);
    const pv = handValue(h.cards);
    if (dv > 21) return 'dealer_bust';
    if (pv > dv) return 'player_win';
    if (dv > pv) return 'dealer_win';
    return 'push';
  });

  // Legacy status (for backward compat)
  let legacyStatus: BlackjackState['status'] = 'playing';
  if (session.gamePhase === 'resolved') {
    const firstOutcome = handOutcomes[0];
    if (firstOutcome === 'blackjack') legacyStatus = 'blackjack';
    else if (firstOutcome === 'player_bust') legacyStatus = 'player_bust';
    else if (firstOutcome === 'dealer_bust') legacyStatus = 'dealer_bust';
    else if (firstOutcome === 'player_win') legacyStatus = 'player_win';
    else if (firstOutcome === 'dealer_win') legacyStatus = 'dealer_win';
    else if (firstOutcome === 'push') legacyStatus = 'push';
    else if (firstOutcome === 'surrendered') legacyStatus = 'player_bust'; // treat as loss in legacy
  }

  // Compute total payout
  let totalPayoutCents = 0;
  if (session.gamePhase === 'resolved') {
    for (let i = 0; i < session.hands.length; i++) {
      const h = session.hands[i];
      const outcome = handOutcomes[i];
      if (outcome === 'surrendered') {
        // Half bet already returned
      } else if (outcome === 'blackjack') {
        totalPayoutCents += Math.floor(h.betCents * 2.5);
      } else if (outcome === 'player_win' || outcome === 'dealer_bust') {
        totalPayoutCents += h.betCents * 2;
      } else if (outcome === 'push') {
        totalPayoutCents += h.betCents;
      }
    }
    totalPayoutCents += session.insurancePayoutCents;
  }

  return {
    session_id: sessionId,
    hands,
    active_hand_index: session.activeHandIndex,
    dealer_hand: session.dealerHand.map(c => c.faceUp ? c : { ...c, rank: '?' as Rank, suit: 'spades' as Suit }),
    dealer_value: dealerVal,
    game_status: session.gamePhase,
    hand_outcomes: handOutcomes,
    available_actions: computeAvailableActions(session),
    insurance_bet_cents: session.insuranceBetCents,
    insurance_payout_cents: session.insurancePayoutCents,
    total_payout_cents: totalPayoutCents,
    new_balance_cents: user.balance_cents,
    // Backward-compat fields
    player_hand: activeHand.cards,
    player_value: handValue(activeHand.cards),
    status: legacyStatus,
    can_double: activeHand.cards.length === 2 && activeHand.status === 'playing',
    payout_cents: totalPayoutCents,
    new_achievements: session.newAchievements && session.newAchievements.length > 0 ? session.newAchievements : undefined,
  };
}

// ============ Main functions ============

export function dealBlackjack(userId: number, betCents: number, numHands: number = 1): BlackjackState {
  const serverSeed = generateSeed();
  const clientSeed = generateSeed();
  const nonce = Date.now();

  const totalBet = betCents * numHands;

  // Deduct total bet
  db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
    .run(totalBet, userId);
  db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
    .run(userId, -totalBet, 'BET', 'blackjack');

  const deck = createDeck();
  shuffleDeck(deck);

  // Deal N player hands (first card each)
  const hands: HandSession[] = [];
  for (let i = 0; i < numHands; i++) {
    hands.push({
      cards: [dealCard(deck)],
      betCents,
      status: 'playing',
      isFromSplit: false,
    });
  }

  // Dealer first card
  const dealerHand = [dealCard(deck, true)];

  // Second card to each player hand
  for (let i = 0; i < numHands; i++) {
    hands[i].cards.push(dealCard(deck));
  }

  // Dealer second card (hole card)
  dealerHand.push(dealCard(deck, false));

  const sessionId = generateSeed().substring(0, 16);

  const session: Session = {
    userId,
    deck,
    hands,
    activeHandIndex: 0,
    dealerHand,
    gamePhase: 'playing',
    insuranceBetCents: 0,
    insurancePayoutCents: 0,
    serverSeed,
    clientSeed,
    nonce,
  };

  // Check each hand for natural blackjack
  for (const hand of hands) {
    if (handValue(hand.cards) === 21) {
      hand.status = 'blackjack';
    }
  }

  // If all hands are natural blackjack, resolve immediately
  const allNatural = hands.every(h => h.status === 'blackjack');
  if (allNatural) {
    dealerHand[1].faceUp = true;
    const dealerVal = handValue(dealerHand);
    session.gamePhase = 'resolved';

    let totalPayout = 0;
    for (const hand of hands) {
      if (dealerVal === 21) {
        // Push
        totalPayout += hand.betCents;
      } else {
        // Blackjack 3:2 payout
        totalPayout += Math.floor(hand.betCents * 2.5);
      }
    }
    if (totalPayout > 0) {
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
        .run(totalPayout, userId);
      if (totalPayout > totalBet) {
        db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
          .run(userId, totalPayout, 'WIN', 'blackjack');
      }
    }
    logGame(session);

    // Achievement tracking for natural blackjack resolve
    updateStats(userId, { wagered: totalBet, won: totalPayout, isWin: totalPayout > totalBet, gameType: 'blackjack' });
    session.newAchievements = checkAchievements(userId);
  } else {
    // Find first playable hand
    let firstPlayable = 0;
    while (firstPlayable < hands.length && hands[firstPlayable].status !== 'playing') {
      firstPlayable++;
    }
    session.activeHandIndex = firstPlayable;

    if (firstPlayable >= hands.length) {
      // All hands are blackjack but we already handled that above — shouldn't reach here
      dealerPlay(session);
      resolveGame(session);
    } else if (dealerHand[0].rank === 'A') {
      // Dealer shows Ace - offer insurance
      session.gamePhase = 'insurance_prompt';
    }
  }

  sessions.set(sessionId, session);

  return buildBlackjackState(sessionId, session);
}

export function playerHit(sessionId: string, userId: number): BlackjackState {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) throw new Error('Invalid session');
  if (session.gamePhase !== 'playing') throw new Error('Cannot hit now');

  const hand = session.hands[session.activeHandIndex];
  if (!hand || hand.status !== 'playing') throw new Error('Hand not playing');

  hand.cards.push(dealCard(session.deck));
  const playerVal = handValue(hand.cards);

  if (playerVal > 21) {
    hand.status = 'busted';
    advanceHand(session);
  }

  return buildBlackjackState(sessionId, session);
}

export function playerStand(sessionId: string, userId: number): BlackjackState {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) throw new Error('Invalid session');
  if (session.gamePhase !== 'playing') throw new Error('Cannot stand now');

  const hand = session.hands[session.activeHandIndex];
  if (!hand || hand.status !== 'playing') throw new Error('Hand not playing');

  hand.status = 'standing';
  advanceHand(session);

  return buildBlackjackState(sessionId, session);
}

export function playerDouble(sessionId: string, userId: number): BlackjackState {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) throw new Error('Invalid session');
  if (session.gamePhase !== 'playing') throw new Error('Cannot double now');

  const hand = session.hands[session.activeHandIndex];
  if (!hand || hand.status !== 'playing' || hand.cards.length !== 2) throw new Error('Cannot double');

  // Check balance
  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
  if (user.balance_cents < hand.betCents) throw new Error('Insufficient balance to double');

  // Deduct additional bet
  db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
    .run(hand.betCents, userId);
  db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
    .run(userId, -hand.betCents, 'BET', 'blackjack');
  hand.betCents *= 2;

  // Deal one card and auto-stand
  hand.cards.push(dealCard(session.deck));
  const playerVal = handValue(hand.cards);

  if (playerVal > 21) {
    hand.status = 'busted';
  } else {
    hand.status = 'standing';
  }

  advanceHand(session);

  return buildBlackjackState(sessionId, session);
}

export function playerSplit(sessionId: string, userId: number): BlackjackState {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) throw new Error('Invalid session');
  if (session.gamePhase !== 'playing') throw new Error('Cannot split now');

  const hand = session.hands[session.activeHandIndex];
  if (!hand || hand.status !== 'playing') throw new Error('Hand not playing');
  if (hand.cards.length !== 2 || hand.cards[0].rank !== hand.cards[1].rank) throw new Error('Cannot split - cards must be same rank');
  if (hand.isFromSplit) throw new Error('Cannot re-split');

  // Check balance
  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
  if (user.balance_cents < hand.betCents) throw new Error('Insufficient balance to split');

  // Deduct second bet
  const splitBet = hand.betCents;
  db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
    .run(splitBet, userId);
  db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
    .run(userId, -splitBet, 'BET', 'blackjack');

  const card1 = hand.cards[0];
  const card2 = hand.cards[1];
  const isAces = card1.rank === 'A';

  // Create two new hands
  const hand1: HandSession = {
    cards: [card1, dealCard(session.deck)],
    betCents: splitBet,
    status: 'playing',
    isFromSplit: true,
  };

  const hand2: HandSession = {
    cards: [card2, dealCard(session.deck)],
    betCents: splitBet,
    status: 'playing',
    isFromSplit: true,
  };

  // Split aces: 1 card each, auto-stand, no BJ bonus
  if (isAces) {
    hand1.status = 'standing';
    hand2.status = 'standing';
  }

  const splitIdx = session.activeHandIndex;
  session.hands.splice(splitIdx, 1, hand1, hand2);
  session.activeHandIndex = splitIdx;

  // If split aces, auto-stand both and go to dealer
  if (isAces) {
    advanceHand(session);
  } else if (handValue(hand1.cards) === 21) {
    // First hand got 21, auto-stand
    hand1.status = 'standing';
    session.activeHandIndex = splitIdx + 1;
    if (handValue(hand2.cards) === 21) {
      hand2.status = 'standing';
      advanceHand(session);
    }
  }

  return buildBlackjackState(sessionId, session);
}

export function playerInsurance(sessionId: string, userId: number, accept: boolean): BlackjackState {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) throw new Error('Invalid session');
  if (session.gamePhase !== 'insurance_prompt') throw new Error('Insurance not offered');

  if (accept) {
    const insuranceCost = Math.floor(session.hands[0].betCents / 2);
    const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
    if (user.balance_cents < insuranceCost) throw new Error('Insufficient balance for insurance');

    // Deduct insurance bet
    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
      .run(insuranceCost, userId);
    db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
      .run(userId, -insuranceCost, 'BET', 'blackjack');

    session.insuranceBetCents = insuranceCost;

    // Peek at dealer hole card
    const dealerVal = handValue(session.dealerHand);
    if (dealerVal === 21) {
      // Dealer has blackjack - insurance pays 2:1
      session.insurancePayoutCents = insuranceCost * 3; // original insurance bet + 2:1 = 3x
      session.dealerHand[1].faceUp = true;

      // Check if player also has blackjack
      const playerVal = handValue(session.hands[0].cards);
      if (playerVal === 21) {
        session.hands[0].status = 'blackjack';
      }

      // Resolve the game
      session.gamePhase = 'resolved';
      // Return insurance payout + handle main bet
      let totalPayout = session.insurancePayoutCents;
      if (playerVal === 21) {
        // Push on main bet
        totalPayout += session.hands[0].betCents;
      }
      // else dealer wins main bet

      if (totalPayout > 0) {
        db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
          .run(totalPayout, userId);
        db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
          .run(userId, totalPayout, 'WIN', 'blackjack');
      }
      logGame(session);

      // Achievement tracking
      const totalWager = session.hands[0].betCents + insuranceCost;
      updateStats(userId, { wagered: totalWager, won: totalPayout, isWin: totalPayout > totalWager, gameType: 'blackjack' });
      session.newAchievements = checkAchievements(userId);
    } else {
      // Dealer doesn't have blackjack - insurance is lost, continue playing
      session.gamePhase = 'playing';
    }
  } else {
    // Declined insurance
    // Peek at dealer hole card
    const dealerVal = handValue(session.dealerHand);
    if (dealerVal === 21) {
      // Dealer has blackjack - resolve immediately
      session.dealerHand[1].faceUp = true;
      session.gamePhase = 'resolved';

      // Check if player also has blackjack (even money scenario)
      const playerVal = handValue(session.hands[0].cards);
      if (playerVal === 21) {
        session.hands[0].status = 'blackjack';
        // Push
        db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
          .run(session.hands[0].betCents, userId);
      }
      // else dealer wins

      logGame(session);

      // Achievement tracking
      const payout = playerVal === 21 ? session.hands[0].betCents : 0;
      updateStats(userId, { wagered: session.hands[0].betCents, won: payout, isWin: false, gameType: 'blackjack' });
      session.newAchievements = checkAchievements(userId);
    } else {
      // No dealer blackjack - continue playing
      session.gamePhase = 'playing';
    }
  }

  return buildBlackjackState(sessionId, session);
}

export function playerSurrender(sessionId: string, userId: number): BlackjackState {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) throw new Error('Invalid session');
  if (session.gamePhase !== 'playing') throw new Error('Cannot surrender now');

  const hand = session.hands[session.activeHandIndex];
  if (!hand || hand.status !== 'playing') throw new Error('Hand not playing');
  if (hand.cards.length !== 2 || hand.isFromSplit) throw new Error('Can only surrender on initial 2 cards');

  // Return half the bet
  const halfBet = Math.floor(hand.betCents / 2);
  hand.status = 'surrendered';

  db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
    .run(halfBet, userId);

  // Reveal dealer hand and resolve
  session.dealerHand[1].faceUp = true;
  session.gamePhase = 'resolved';
  logGame(session);

  return buildBlackjackState(sessionId, session);
}

function logGame(session: Session): void {
  db.prepare(
    'INSERT INTO game_logs (user_id, game_type, server_seed, client_seed, nonce, result_data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    session.userId, 'blackjack', session.serverSeed, session.clientSeed, session.nonce,
    JSON.stringify({
      hands: session.hands.map(h => ({
        cards: h.cards,
        status: h.status,
        isFromSplit: h.isFromSplit,
      })),
      dealerHand: session.dealerHand,
      gamePhase: session.gamePhase,
      insuranceBetCents: session.insuranceBetCents,
      insurancePayoutCents: session.insurancePayoutCents,
    })
  );
}
