export const SAVINGS_POOLS = [
  { id: 'sol', name: 'SOL Savings', apy: 4.5, risk: 'Medium', type: 'Crypto', minDeposit: '$10', totalLocked: '$100k', description: 'Stable SOL savings' },
  { id: 'usdc', name: 'USDC Savings', apy: 3.0, risk: 'Low', type: 'Stablecoin', minDeposit: '$10', totalLocked: '$250k', description: 'Low risk USDC savings' },
];

export type CampusStore = {
  id: string;
  name: string;
  category: string;
  location: string;
  hours: string;
  rating: number;
  reviews: number;
  description: string;
  cashbackRate: number;
  specialOffer?: string;
};

export const CAMPUS_STORES: CampusStore[] = [
  { id: 'bookstore', name: 'Campus Bookstore', category: 'Retail', location: 'Main Hall', hours: '9am-6pm', rating: 4.4, reviews: 120, description: 'Textbooks and supplies', cashbackRate: 5, specialOffer: '10% off stationery' },
  { id: 'cafeteria', name: 'Student Cafeteria', category: 'Food', location: 'North Wing', hours: '7am-9pm', rating: 4.1, reviews: 80, description: 'Meals and snacks', cashbackRate: 3 },
];

export const DEFAULT_USER_REWARDS = {
  points: 0,
  cashback: 0,
  totalPoints: 0,
  totalCashback: 0,
  level: 1,
};
