// Timing constants (in ms) for card dealing suspense per game

export const BLACKJACK_TIMINGS = {
  /** Delay between dealing each card in the initial 4-card sequence */
  dealInterval: 400,
  /** Pause before a card flips face-up after being dealt face-down */
  flipDelay: 300,
  /** Delay between dealing each hit card */
  hitDealDelay: 400,
  /** Flip delay for hit cards */
  hitFlipDelay: 400,
};

export const BACCARAT_TIMINGS = {
  /** Delay between dealing each of the 4 initial face-down cards */
  dealInterval: 350,
  /** Dramatic pause before player cards start flipping */
  preFlipPause: 800,
  /** Delay between flipping individual cards within a hand */
  flipInterval: 600,
  /** Dramatic pause between player and banker reveals */
  betweenHandsPause: 800,
  /** Delay before 3rd card deals face-down */
  thirdCardDealDelay: 500,
  /** Flip delay for 3rd card */
  thirdCardFlipDelay: 500,
};

export const UTH_TIMINGS = {
  /** Delay between dealing player hole cards */
  dealInterval: 350,
  /** Flip delay for player cards */
  flipDelay: 300,
  /** Delay between flop cards */
  flopInterval: 300,
  /** Delay before river card flips */
  riverFlipDelay: 400,
  /** Delay between dealer card reveals at showdown */
  showdownInterval: 500,
};
