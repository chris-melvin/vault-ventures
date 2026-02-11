import db from '../db/database.js';
import { getUserInventory } from './marketService.js';
import { getBusinessValue } from './businessService.js';
import type { NetWorthResponse, PortfolioBreakdownItem, MarketCategory } from '../../../shared/types.ts';

export function getNetWorth(userId: number): NetWorthResponse {
  // Wallet balance
  const wallet = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
  const walletCents = wallet.balance_cents;

  // Bank balance + pending interest
  const bankAccount = db.prepare('SELECT balance_cents, last_interest_at FROM bank_accounts WHERE user_id = ?').get(userId) as
    { balance_cents: number; last_interest_at: number } | undefined;
  const bankCents = bankAccount?.balance_cents ?? 0;

  let pendingInterestCents = 0;
  if (bankAccount && bankCents > 0) {
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - bankAccount.last_interest_at;
    const periods = elapsed / 43200; // 12-hour periods
    pendingInterestCents = Math.floor(bankCents * 0.001 * periods);
  }

  // Portfolio from inventory
  const inventory = getUserInventory(userId);
  let portfolioValueCents = 0;
  let pendingRentCents = 0;

  const portfolioBreakdown: PortfolioBreakdownItem[] = inventory.map((item) => {
    const currentValue = item.current_price_cents * item.quantity;
    const costBasis = item.purchased_price_cents * item.quantity;
    portfolioValueCents += currentValue;
    pendingRentCents += item.pending_rent_cents;

    return {
      item_id: item.item_id,
      name: item.name,
      icon: item.icon,
      category: item.category as MarketCategory,
      quantity: item.quantity,
      current_value_cents: currentValue,
      cost_basis_cents: costBasis,
      profit_cents: currentValue - costBasis,
    };
  });

  const businessValueCents = getBusinessValue(userId);
  const totalNetWorthCents = walletCents + bankCents + pendingInterestCents + portfolioValueCents + pendingRentCents + businessValueCents;

  return {
    wallet_cents: walletCents,
    bank_cents: bankCents,
    portfolio_value_cents: portfolioValueCents,
    pending_rent_cents: pendingRentCents,
    pending_interest_cents: pendingInterestCents,
    total_net_worth_cents: totalNetWorthCents,
    portfolio_breakdown: portfolioBreakdown,
  };
}
