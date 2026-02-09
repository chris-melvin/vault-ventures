import db from '../db/database.js';
import { generateSeed, hashSeed } from './rng.js';
import { CardData, Suit, Rank, BlackjackState } from '../../../shared/types.ts';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// In-memory session store
const sessions = new Map<string, {
  userId: number;
  betCents: number;
  deck: CardData[];
  playerHand: CardData[];
  dealerHand: CardData[];
  status: BlackjackState['status'];
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}>();

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

export function dealBlackjack(userId: number, betCents: number): BlackjackState {
  const serverSeed = generateSeed();
  const clientSeed = generateSeed();
  const nonce = Date.now();

  // Deduct bet
  db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
    .run(betCents, userId);
  db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
    .run(userId, -betCents, 'BET', 'blackjack');

  const deck = createDeck();
  shuffleDeck(deck);

  const playerHand = [dealCard(deck), dealCard(deck)];
  const dealerHand = [dealCard(deck, true), dealCard(deck, false)];

  const sessionId = generateSeed().substring(0, 16);
  const playerVal = handValue(playerHand);

  let status: BlackjackState['status'] = 'playing';

  // Check for natural blackjack
  if (playerVal === 21) {
    dealerHand[1].faceUp = true;
    const dealerVal = handValue(dealerHand);
    if (dealerVal === 21) {
      status = 'push';
      // Return bet
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
        .run(betCents, userId);
    } else {
      status = 'blackjack';
      // Pay 3:2
      const payout = Math.floor(betCents * 2.5);
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
        .run(payout, userId);
      db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
        .run(userId, payout, 'WIN', 'blackjack');
    }
  }

  sessions.set(sessionId, {
    userId, betCents, deck, playerHand, dealerHand, status, serverSeed, clientSeed, nonce,
  });

  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };

  return {
    session_id: sessionId,
    player_hand: playerHand,
    dealer_hand: dealerHand.map(c => c.faceUp ? c : { ...c, rank: '?', suit: 'spades' }),
    player_value: playerVal,
    dealer_value: status !== 'playing' ? handValue(dealerHand) : null,
    status,
    can_double: playerHand.length === 2 && status === 'playing',
    payout_cents: 0,
    new_balance_cents: user.balance_cents,
  };
}

export function playerHit(sessionId: string, userId: number): BlackjackState {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) throw new Error('Invalid session');
  if (session.status !== 'playing') throw new Error('Game already ended');

  session.playerHand.push(dealCard(session.deck));
  const playerVal = handValue(session.playerHand);

  if (playerVal > 21) {
    session.status = 'player_bust';
    session.dealerHand[1].faceUp = true;
    logGame(session);
  }

  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };

  return {
    session_id: sessionId,
    player_hand: session.playerHand,
    dealer_hand: session.dealerHand.map(c => c.faceUp ? c : { ...c, rank: '?', suit: 'spades' }),
    player_value: playerVal,
    dealer_value: session.status !== 'playing' ? handValue(session.dealerHand) : null,
    status: session.status,
    can_double: false,
    payout_cents: 0,
    new_balance_cents: user.balance_cents,
  };
}

export function playerStand(sessionId: string, userId: number): BlackjackState {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) throw new Error('Invalid session');
  if (session.status !== 'playing') throw new Error('Game already ended');

  // Reveal dealer card
  session.dealerHand[1].faceUp = true;

  // Dealer draws on 16 or less, stands on 17+
  while (handValue(session.dealerHand) < 17) {
    session.dealerHand.push(dealCard(session.deck));
  }

  const playerVal = handValue(session.playerHand);
  const dealerVal = handValue(session.dealerHand);

  let payoutCents = 0;

  if (dealerVal > 21) {
    session.status = 'dealer_bust';
    payoutCents = session.betCents * 2;
  } else if (playerVal > dealerVal) {
    session.status = 'player_win';
    payoutCents = session.betCents * 2;
  } else if (dealerVal > playerVal) {
    session.status = 'dealer_win';
  } else {
    session.status = 'push';
    payoutCents = session.betCents; // Return bet
  }

  if (payoutCents > 0) {
    db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
      .run(payoutCents, userId);
    if (session.status !== 'push') {
      db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
        .run(userId, payoutCents, 'WIN', 'blackjack');
    }
  }

  logGame(session);

  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };

  return {
    session_id: sessionId,
    player_hand: session.playerHand,
    dealer_hand: session.dealerHand,
    player_value: playerVal,
    dealer_value: dealerVal,
    status: session.status,
    can_double: false,
    payout_cents: payoutCents,
    new_balance_cents: user.balance_cents,
  };
}

export function playerDouble(sessionId: string, userId: number): BlackjackState {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) throw new Error('Invalid session');
  if (session.status !== 'playing' || session.playerHand.length !== 2) throw new Error('Cannot double');

  // Deduct additional bet
  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
  if (user.balance_cents < session.betCents) throw new Error('Insufficient balance to double');

  db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
    .run(session.betCents, userId);
  db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
    .run(userId, -session.betCents, 'BET', 'blackjack');
  session.betCents *= 2;

  // Deal one card and auto-stand
  session.playerHand.push(dealCard(session.deck));
  const playerVal = handValue(session.playerHand);

  if (playerVal > 21) {
    session.status = 'player_bust';
    session.dealerHand[1].faceUp = true;
    logGame(session);

    const updatedUser = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
    return {
      session_id: sessionId,
      player_hand: session.playerHand,
      dealer_hand: session.dealerHand,
      player_value: playerVal,
      dealer_value: handValue(session.dealerHand),
      status: session.status,
      can_double: false,
      payout_cents: 0,
      new_balance_cents: updatedUser.balance_cents,
    };
  }

  // Auto-stand
  return playerStand(sessionId, userId);
}

function logGame(session: typeof sessions extends Map<string, infer V> ? V : never): void {
  db.prepare(
    'INSERT INTO game_logs (user_id, game_type, server_seed, client_seed, nonce, result_data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    session.userId, 'blackjack', session.serverSeed, session.clientSeed, session.nonce,
    JSON.stringify({
      playerHand: session.playerHand,
      dealerHand: session.dealerHand,
      status: session.status,
    })
  );
  sessions.delete(session.serverSeed.substring(0, 16));
}
