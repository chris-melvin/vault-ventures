import db from '../db/database.js';
import { generateSeed, hashSeed } from './rng.js';
import { updateStats, checkAchievements } from './achievementService.js';
import { CardData, Suit, Rank, BaccaratBetType, BaccaratResult } from '../../../shared/types.ts';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createShoe(): CardData[] {
  const shoe: CardData[] = [];
  // 8-deck shoe
  for (let d = 0; d < 8; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ suit, rank, faceUp: true });
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function baccaratCardValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (['10', 'J', 'Q', 'K'].includes(rank)) return 0;
  return parseInt(rank);
}

function baccaratHandValue(hand: CardData[]): number {
  return hand.reduce((sum, c) => sum + baccaratCardValue(c.rank), 0) % 10;
}

export function dealBaccarat(userId: number, betCents: number, betType: BaccaratBetType): BaccaratResult {
  const serverSeed = generateSeed();
  const clientSeed = generateSeed();
  const nonce = Date.now();

  const shoe = createShoe();

  // Deal initial 2 cards each
  const playerHand: CardData[] = [shoe.pop()!, shoe.pop()!];
  const bankerHand: CardData[] = [shoe.pop()!, shoe.pop()!];

  let playerValue = baccaratHandValue(playerHand);
  let bankerValue = baccaratHandValue(bankerHand);

  // Natural check (8 or 9)
  const isNatural = playerValue >= 8 || bankerValue >= 8;

  if (!isNatural) {
    // Player third card rule
    let playerThirdCard: CardData | null = null;
    if (playerValue <= 5) {
      playerThirdCard = shoe.pop()!;
      playerHand.push(playerThirdCard);
      playerValue = baccaratHandValue(playerHand);
    }

    // Banker third card rule
    if (playerThirdCard === null) {
      // Player stood, banker draws on 0-5
      if (bankerValue <= 5) {
        bankerHand.push(shoe.pop()!);
        bankerValue = baccaratHandValue(bankerHand);
      }
    } else {
      const pThird = baccaratCardValue(playerThirdCard.rank);
      let bankerDraws = false;

      if (bankerValue <= 2) bankerDraws = true;
      else if (bankerValue === 3 && pThird !== 8) bankerDraws = true;
      else if (bankerValue === 4 && pThird >= 2 && pThird <= 7) bankerDraws = true;
      else if (bankerValue === 5 && pThird >= 4 && pThird <= 7) bankerDraws = true;
      else if (bankerValue === 6 && (pThird === 6 || pThird === 7)) bankerDraws = true;

      if (bankerDraws) {
        bankerHand.push(shoe.pop()!);
        bankerValue = baccaratHandValue(bankerHand);
      }
    }
  }

  let winner: BaccaratBetType;
  if (playerValue > bankerValue) winner = 'player';
  else if (bankerValue > playerValue) winner = 'banker';
  else winner = 'tie';

  // Calculate payout
  let payoutCents = 0;
  if (betType === winner) {
    if (winner === 'player') payoutCents = betCents * 2;
    else if (winner === 'banker') payoutCents = Math.floor(betCents * 1.95); // 5% commission
    else payoutCents = betCents * 9; // Tie pays 8:1
  } else if (winner === 'tie') {
    // Tie pushes player/banker bets — return the bet
    payoutCents = betCents;
  }

  const run = db.transaction(() => {
    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
      .run(betCents, userId);
    db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
      .run(userId, -betCents, 'BET', 'baccarat');

    if (payoutCents > 0) {
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
        .run(payoutCents, userId);
      db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
        .run(userId, payoutCents, 'WIN', 'baccarat');
    }

    db.prepare(
      'INSERT INTO game_logs (user_id, game_type, server_seed, client_seed, nonce, result_data) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'baccarat', serverSeed, clientSeed, nonce, JSON.stringify({
      playerHand, bankerHand, playerValue, bankerValue, winner, betType,
    }));

    return (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;
  });

  const newBalance = run();

  // Achievement tracking
  const isWin = betType === winner || (winner === 'tie' && betType !== 'tie');
  updateStats(userId, { wagered: betCents, won: payoutCents, isWin: payoutCents > betCents, gameType: 'baccarat' });
  const newAchievements = checkAchievements(userId);

  return {
    player_hand: playerHand,
    banker_hand: bankerHand,
    player_value: playerValue,
    banker_value: bankerValue,
    winner,
    payout_cents: payoutCents,
    new_balance_cents: newAchievements.length > 0
      ? (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents
      : newBalance,
    server_seed_hash: hashSeed(serverSeed),
    client_seed: clientSeed,
    nonce,
    new_achievements: newAchievements.length > 0 ? newAchievements : undefined,
  };
}
