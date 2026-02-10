// ============ Auth ============
export interface RegisterRequest {
  username: string;
  pin: string;
}

export interface LoginRequest {
  username: string;
  pin: string;
}

export interface AuthResponse {
  token: string;
  user: { id: number; username: string; balance_cents: number };
}

// ============ Wallet ============
export interface WalletResponse {
  balance_cents: number;
  username: string;
}

// ============ Common ============
export interface BetRequest {
  amount_cents: number;
}

export interface GameResult {
  payout_cents: number;
  new_balance_cents: number;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  new_achievements?: AchievementUnlock[];
}

// ============ Wheel ============
export type WheelSymbol = 'sampaguita' | 'kalesa' | 'coconut_tree' | 'jeepney' | 'nipa_hut' | 'logo_red' | 'logo_yellow';

export interface WheelSymbolConfig {
  symbol: WheelSymbol;
  name: string;
  emoji: string;
  sections: number;
  payout: number; // N:1 — player gets bet back + N × bet
  color: string;
  labelColor: string;
}

export const WHEEL_SYMBOL_CONFIGS: WheelSymbolConfig[] = [
  { symbol: 'sampaguita', name: 'Sampaguita', emoji: '🌸', sections: 24, payout: 1, color: '#f5f0e1', labelColor: '#333333' },
  { symbol: 'kalesa', name: 'Kalesa', emoji: '🐴', sections: 12, payout: 3, color: '#e84393', labelColor: '#ffffff' },
  { symbol: 'coconut_tree', name: 'Coconut Tree', emoji: '🌴', sections: 8, payout: 5, color: '#00b894', labelColor: '#ffffff' },
  { symbol: 'jeepney', name: 'Jeepney', emoji: '🚌', sections: 4, payout: 11, color: '#e17055', labelColor: '#ffffff' },
  { symbol: 'nipa_hut', name: 'Nipa Hut', emoji: '🛖', sections: 2, payout: 23, color: '#6c5ce7', labelColor: '#ffffff' },
  { symbol: 'logo_red', name: 'Logo Red', emoji: '🔴', sections: 1, payout: 47, color: '#d63031', labelColor: '#ffffff' },
  { symbol: 'logo_yellow', name: 'Logo Yellow', emoji: '🟡', sections: 1, payout: 47, color: '#fdcb6e', labelColor: '#333333' },
];

export function getSymbolConfig(symbol: WheelSymbol): WheelSymbolConfig {
  return WHEEL_SYMBOL_CONFIGS.find(c => c.symbol === symbol)!;
}

// 52 segments laid out around the wheel
// Distribution: 24 sampaguita, 12 kalesa, 8 coconut_tree, 4 jeepney, 2 nipa_hut, 1 logo_red, 1 logo_yellow
export const WHEEL_SEGMENTS: WheelSymbol[] = [
  // 24 sampaguita, 12 kalesa, 8 coconut_tree, 4 jeepney, 2 nipa_hut, 1 logo_red, 1 logo_yellow = 52
  'sampaguita', 'kalesa', 'sampaguita', 'coconut_tree', 'sampaguita', 'kalesa',
  'sampaguita', 'jeepney', 'sampaguita', 'kalesa', 'sampaguita', 'coconut_tree',
  'sampaguita', 'kalesa', 'sampaguita', 'nipa_hut', 'sampaguita', 'kalesa',
  'sampaguita', 'coconut_tree', 'sampaguita', 'kalesa', 'sampaguita', 'jeepney',
  'sampaguita', 'coconut_tree', 'logo_red', 'kalesa', 'sampaguita', 'coconut_tree',
  'sampaguita', 'jeepney', 'sampaguita', 'kalesa', 'sampaguita', 'coconut_tree',
  'sampaguita', 'kalesa', 'sampaguita', 'nipa_hut', 'sampaguita', 'coconut_tree',
  'kalesa', 'sampaguita', 'kalesa', 'sampaguita', 'sampaguita', 'jeepney',
  'sampaguita', 'coconut_tree', 'kalesa', 'logo_yellow',
];

export const WHEEL_SEGMENT_COUNT = 52;

export const WHEEL_SYMBOLS: WheelSymbol[] = ['sampaguita', 'kalesa', 'coconut_tree', 'jeepney', 'nipa_hut', 'logo_red', 'logo_yellow'];

export interface WheelSpinRequest {
  bets: Partial<Record<WheelSymbol, number>>;
}

export interface WheelSpinResult extends GameResult {
  target_segment: number;
  winning_symbol: WheelSymbol;
  bets: Partial<Record<WheelSymbol, number>>;
  total_bet_cents: number;
}

// ============ Slots ============
export type SlotSymbol = 'cherry' | 'lemon' | 'orange' | 'grape' | 'watermelon' | 'bell' | 'star' | 'seven' | 'diamond';

export interface SlotsSpinRequest extends BetRequest {}

export interface SlotsSpinResult extends GameResult {
  reel_stops: number[];
  symbols: SlotSymbol[][];
  paylines: { line: number; symbols: SlotSymbol[]; multiplier: number }[];
  is_near_miss: boolean;
}

export const SLOT_SYMBOLS: SlotSymbol[] = ['cherry', 'lemon', 'orange', 'grape', 'watermelon', 'bell', 'star', 'seven', 'diamond'];

export const SLOT_PAYOUTS: Record<SlotSymbol, number> = {
  cherry: 10,
  lemon: 15,
  orange: 20,
  grape: 25,
  watermelon: 30,
  bell: 50,
  star: 75,
  seven: 100,
  diamond: 500,
};

// ============ Blackjack ============
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | '?';

export interface CardData {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type BlackjackAction = 'hit' | 'stand' | 'double' | 'split' | 'surrender' | 'insurance_yes' | 'insurance_no';

export interface BlackjackDealRequest extends BetRequest {
  num_hands?: number;
}

export interface BlackjackActionRequest {
  session_id: string;
  action: BlackjackAction;
}

export interface BlackjackHandState {
  cards: CardData[];
  value: number;
  status: 'playing' | 'standing' | 'busted' | 'blackjack' | 'surrendered';
  bet_cents: number;
  is_from_split: boolean;
}

export interface BlackjackState {
  session_id: string;
  hands: BlackjackHandState[];
  active_hand_index: number;
  dealer_hand: CardData[];
  dealer_value: number | null;
  game_status: 'insurance_prompt' | 'playing' | 'resolved';
  hand_outcomes: (string | null)[];
  available_actions: BlackjackAction[];
  insurance_bet_cents: number;
  insurance_payout_cents: number;
  total_payout_cents: number;
  new_balance_cents: number;
  // Backward-compat fields (mirror hands[0])
  player_hand: CardData[];
  player_value: number;
  status: 'playing' | 'dealer_turn' | 'player_bust' | 'dealer_bust' | 'player_win' | 'dealer_win' | 'push' | 'blackjack';
  can_double: boolean;
  payout_cents: number;
  new_achievements?: AchievementUnlock[];
}

// ============ Baccarat ============
export type BaccaratBetType = 'player' | 'banker' | 'tie';

export interface BaccaratDealRequest extends BetRequest {
  bet_type: BaccaratBetType;
}

export interface BaccaratResult extends GameResult {
  player_hand: CardData[];
  banker_hand: CardData[];
  player_value: number;
  banker_value: number;
  winner: BaccaratBetType;
}

// ============ Ultimate Texas Hold'em ============
export type UTHPhase = 'preflop' | 'flop' | 'river' | 'showdown';
export type UTHAction = 'check' | 'bet4x' | 'bet3x' | 'bet2x' | 'bet1x' | 'fold';

export type PokerHandRank =
  | 'royal_flush' | 'straight_flush' | 'four_of_a_kind'
  | 'full_house' | 'flush' | 'straight'
  | 'three_of_a_kind' | 'two_pair' | 'one_pair' | 'high_card';

export interface UTHDealRequest {
  ante_cents: number;
  trips_cents?: number;
}

export interface UTHActionRequest {
  session_id: string;
  action: UTHAction;
}

export interface UTHBetBreakdown {
  ante_cents: number;
  blind_cents: number;
  trips_cents: number;
  play_cents: number;
}

export interface UTHState {
  session_id: string;
  phase: UTHPhase;
  player_hand: CardData[];
  dealer_hand: CardData[];
  community_cards: CardData[];
  bets: UTHBetBreakdown;
  available_actions: UTHAction[];
  player_hand_rank?: PokerHandRank;
  player_hand_name?: string;
  dealer_hand_rank?: PokerHandRank;
  dealer_hand_name?: string;
  result?: UTHResult;
  new_balance_cents: number;
  new_achievements?: AchievementUnlock[];
}

export interface UTHResult {
  outcome: 'player_wins' | 'dealer_wins' | 'push' | 'fold';
  dealer_qualifies: boolean;
  ante_payout_cents: number;
  blind_payout_cents: number;
  play_payout_cents: number;
  trips_payout_cents: number;
  total_payout_cents: number;
  new_balance_cents: number;
}

export const BLIND_PAY_TABLE: Record<string, number> = {
  royal_flush: 500,
  straight_flush: 50,
  four_of_a_kind: 10,
  full_house: 3,
  flush: 1.5,
  straight: 1,
};

export const TRIPS_PAY_TABLE: Record<string, number> = {
  royal_flush: 50,
  straight_flush: 40,
  four_of_a_kind: 30,
  full_house: 8,
  flush: 7,
  straight: 4,
  three_of_a_kind: 3,
};

// ============ Game History ============
export interface GameHistoryEntry {
  id: number;
  game_type: string;
  result_data: any;
  timestamp: number;
}

// ============ Bank ============
export interface BankAccountState {
  balance_cents: number;
  wallet_balance_cents: number;
  last_interest_at: number;
  total_interest_earned_cents: number;
  pending_interest_cents: number;
}

export interface BankDepositRequest {
  amount_cents: number;
}

export interface BankWithdrawRequest {
  amount_cents: number;
}

export interface BankTransaction {
  id: number;
  amount_cents: number;
  type: 'DEPOSIT' | 'WITHDRAW' | 'INTEREST';
  balance_after_cents: number;
  timestamp: number;
}

// ============ Achievements ============
export type AchievementCategory = 'wealth' | 'gambling' | 'streak' | 'collection' | 'bank';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  threshold: number;
  reward_cents: number;
  unlocked: boolean;
  unlocked_at?: number;
}

export interface AchievementUnlock {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward_cents: number;
}

export interface UserStats {
  total_wagered_cents: number;
  total_won_cents: number;
  biggest_win_cents: number;
  total_games_played: number;
  current_win_streak: number;
  best_win_streak: number;
  current_loss_streak: number;
  worst_loss_streak: number;
  games_per_type: Record<string, number>;
  peak_balance_cents: number;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  stats: UserStats;
}

// ============ Market ============
export type MarketCategory = 'collectible' | 'stock' | 'property' | 'vehicle';
export type MarketRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface MarketItemWithPrice {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: MarketCategory;
  base_price_cents: number;
  volatility: number;
  rarity: MarketRarity;
  rent_rate: number;
  current_price_cents: number;
  previous_price_cents: number;
  trend_percent: number;
}

export interface MarketItemDetail extends MarketItemWithPrice {
  price_history: PricePoint[];
}

export interface PricePoint {
  timestamp: number;
  price_cents: number;
}

export interface MarketBuyRequest {
  item_id: string;
  quantity: number;
}

export interface MarketBuyResult {
  item_id: string;
  quantity: number;
  price_cents: number;
  total_cost_cents: number;
  new_balance_cents: number;
}

export interface MarketSellRequest {
  inventory_id: number;
}

export interface MarketSellResult {
  item_id: string;
  quantity: number;
  price_cents: number;
  total_revenue_cents: number;
  profit_cents: number;
  new_balance_cents: number;
}

export interface InventoryItem {
  id: number;
  item_id: string;
  name: string;
  icon: string;
  category: MarketCategory;
  rarity: MarketRarity;
  quantity: number;
  purchased_price_cents: number;
  current_price_cents: number;
  profit_cents: number;
  purchased_at: number;
  rent_rate: number;
  pending_rent_cents: number;
}

export interface RentCollectionResult {
  total_rent_cents: number;
  properties_collected: number;
  new_balance_cents: number;
}

export interface MarketTransaction {
  id: number;
  item_id: string;
  item_name: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price_cents: number;
  timestamp: number;
}

// ============ Pinball Slots ============
export type PinballSymbol = 'cherry' | 'lemon' | 'bell' | 'star' | 'seven' | 'diamond' | 'pinball';

export const PINBALL_SYMBOLS: PinballSymbol[] = ['cherry', 'lemon', 'bell', 'star', 'seven', 'diamond', 'pinball'];

export const PINBALL_REEL_LENGTH = 22;

export const PINBALL_REEL_STRIPS: PinballSymbol[][] = [
  // Reel 1: No pinball symbol
  ['cherry', 'lemon', 'bell', 'cherry', 'star', 'lemon', 'cherry', 'bell', 'lemon', 'cherry', 'seven', 'lemon', 'cherry', 'bell', 'star', 'cherry', 'lemon', 'diamond', 'cherry', 'bell', 'lemon', 'cherry'],
  // Reel 2: No pinball symbol
  ['lemon', 'cherry', 'bell', 'lemon', 'cherry', 'star', 'cherry', 'lemon', 'bell', 'cherry', 'lemon', 'seven', 'cherry', 'bell', 'cherry', 'lemon', 'star', 'cherry', 'diamond', 'bell', 'cherry', 'lemon'],
  // Reel 3: Has pinball symbol (~1/22 chance)
  ['cherry', 'bell', 'lemon', 'cherry', 'star', 'lemon', 'cherry', 'bell', 'cherry', 'lemon', 'seven', 'cherry', 'lemon', 'bell', 'cherry', 'star', 'lemon', 'cherry', 'diamond', 'bell', 'cherry', 'pinball'],
];

export const PINBALL_PAYOUTS: Record<PinballSymbol, number> = {
  cherry: 5,
  lemon: 10,
  bell: 20,
  star: 40,
  seven: 100,
  diamond: 500,
  pinball: 0, // triggers bonus, no direct payout
};

export const PINBALL_POCKET_MULTIPLIERS: number[] = [2, 5, 10, 25, 100, 25, 10, 5, 2];

export interface PinballBonusBallResult {
  pocket_index: number;
  multiplier: number;
  path: { x: number; y: number }[];
}

export interface PinballSpinResult extends GameResult {
  reel_stops: number[];
  symbols: PinballSymbol[];  // center row (payline) symbols
  all_symbols: PinballSymbol[][]; // all visible symbols per reel
  win_multiplier: number;
  winning_symbol: PinballSymbol | null;
  bonus_triggered: boolean;
  bonus?: {
    balls_count: number;
    balls: PinballBonusBallResult[];
    total_bonus_multiplier: number;
    bonus_payout_cents: number;
  };
  bet_level: number;
}

// ============ Sic Bo ============
export type SicBoBetType =
  | 'big' | 'small' | 'odd' | 'even'
  | 'total_4' | 'total_5' | 'total_6' | 'total_7' | 'total_8' | 'total_9' | 'total_10'
  | 'total_11' | 'total_12' | 'total_13' | 'total_14' | 'total_15' | 'total_16' | 'total_17'
  | 'double_1' | 'double_2' | 'double_3' | 'double_4' | 'double_5' | 'double_6'
  | 'triple_1' | 'triple_2' | 'triple_3' | 'triple_4' | 'triple_5' | 'triple_6'
  | 'any_triple'
  | 'single_1' | 'single_2' | 'single_3' | 'single_4' | 'single_5' | 'single_6';

export const SIC_BO_PAYOUTS: Record<SicBoBetType, number> = {
  big: 1, small: 1, odd: 1, even: 1,
  total_4: 60, total_5: 30, total_6: 17, total_7: 12, total_8: 8, total_9: 6, total_10: 6,
  total_11: 6, total_12: 6, total_13: 8, total_14: 12, total_15: 17, total_16: 30, total_17: 60,
  double_1: 10, double_2: 10, double_3: 10, double_4: 10, double_5: 10, double_6: 10,
  triple_1: 180, triple_2: 180, triple_3: 180, triple_4: 180, triple_5: 180, triple_6: 180,
  any_triple: 30,
  single_1: 1, single_2: 1, single_3: 1, single_4: 1, single_5: 1, single_6: 1,
};

export const SIC_BO_BET_TYPES: SicBoBetType[] = Object.keys(SIC_BO_PAYOUTS) as SicBoBetType[];

export interface SicBoRollRequest {
  bets: Partial<Record<SicBoBetType, number>>;
}

export interface SicBoRollResult extends GameResult {
  dice: [number, number, number];
  total: number;
  bets: Partial<Record<SicBoBetType, number>>;
  total_bet_cents: number;
  winning_bets: SicBoBetType[];
}

// ============ Roulette ============
export type RouletteBetType =
  | 'straight' | 'split' | 'street' | 'corner' | 'line'
  | 'dozen_1' | 'dozen_2' | 'dozen_3'
  | 'column_1' | 'column_2' | 'column_3'
  | 'red' | 'black' | 'odd' | 'even' | 'high' | 'low';

export const ROULETTE_PAYOUTS: Record<RouletteBetType, number> = {
  straight: 35, split: 17, street: 11, corner: 8, line: 5,
  dozen_1: 2, dozen_2: 2, dozen_3: 2,
  column_1: 2, column_2: 2, column_3: 2,
  red: 1, black: 1, odd: 1, even: 1, high: 1, low: 1,
};

export const ROULETTE_RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const ROULETTE_BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export interface RouletteBet {
  type: RouletteBetType;
  numbers: number[];
  amount_cents: number;
}

export interface RouletteSpinRequest {
  bets: RouletteBet[];
}

export interface RouletteSpinResult extends GameResult {
  winning_number: number;
  winning_color: 'red' | 'black' | 'green';
  bets: RouletteBet[];
  total_bet_cents: number;
  winning_bets: number[];
}

// ============ Net Worth ============
export interface PortfolioBreakdownItem {
  item_id: string;
  name: string;
  icon: string;
  category: MarketCategory;
  quantity: number;
  current_value_cents: number;
  cost_basis_cents: number;
  profit_cents: number;
}

export interface NetWorthResponse {
  wallet_cents: number;
  bank_cents: number;
  portfolio_value_cents: number;
  pending_rent_cents: number;
  pending_interest_cents: number;
  total_net_worth_cents: number;
  portfolio_breakdown: PortfolioBreakdownItem[];
}

// ============ Stats Deep Dive ============
export interface BalanceHistoryPoint {
  timestamp: number;
  balance_cents: number;
}

export interface GameTypeStats {
  game_type: string;
  games_played: number;
  total_wagered_cents: number;
  total_won_cents: number;
  net_profit_cents: number;
  win_rate: number;
}

export interface ProfitLossPoint {
  timestamp: number;
  cumulative_profit_cents: number;
}

export interface StatsDeepDiveResponse {
  balance_history: BalanceHistoryPoint[];
  game_type_stats: GameTypeStats[];
  market_roi: {
    total_invested_cents: number;
    total_sold_cents: number;
    current_holdings_value_cents: number;
    realized_pl_cents: number;
    unrealized_pl_cents: number;
    rent_earned_cents: number;
  };
  profit_loss_timeline: ProfitLossPoint[];
}

// ============ Error ============
export interface ApiError {
  error: string;
}
