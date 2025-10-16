export interface SavingsPool {
  id: string;
  name: string;
  apy: string;
  type: string;
  risk: 'Low' | 'Medium' | 'High';
  description: string;
  minDeposit: string;
  totalLocked: string;
}

export interface CampusStore {
  id: string;
  name: string;
  category: string;
  cashbackRate: string;
  description: string;
  logo: string;
  featured: boolean;
  location?: string;
  hours?: string;
  rating?: number;
  reviews?: number;
  specialOffer?: string;
}

export const SAVINGS_POOLS: SavingsPool[] = [
  {
    id: '1',
    name: 'USDC Stable Pool',
    apy: '5.2%',
    type: 'Stablecoin Lending',
    risk: 'Low',
    description: 'Earn yield by lending USDC to verified borrowers. Low risk with stable returns.',
    minDeposit: '$10',
    totalLocked: '$2.4M',
  },
  {
    id: '2',
    name: 'SOL Staking',
    apy: '6.8%',
    type: 'Proof of Stake',
    risk: 'Medium',
    description: 'Stake SOL tokens to help secure the Solana network and earn rewards.',
    minDeposit: '0.1 SOL',
    totalLocked: '1.2M SOL',
  },
  {
    id: '3',
    name: 'Student Savings Circle',
    apy: '4.5%',
    type: 'Peer-to-Peer',
    risk: 'Low',
    description: 'Join other students in a collaborative savings pool with guaranteed returns.',
    minDeposit: '$25',
    totalLocked: '$156K',
  },
  {
    id: '4',
    name: 'DeFi Yield Farm',
    apy: '12.3%',
    type: 'Liquidity Mining',
    risk: 'High',
    description: 'Provide liquidity to DEX pools and earn trading fees plus token rewards.',
    minDeposit: '$50',
    totalLocked: '$890K',
  },
];

export const CAMPUS_STORES: CampusStore[] = [
  {
    id: '1',
    name: 'FUNAAB Cafeteria',
    category: 'Food & Dining',
    cashbackRate: '5%',
    description: 'Get cashback on all meals and snacks at the main campus cafeteria.',
    logo: '🍽️',
    featured: true,
    location: 'Main Campus Building A',
    hours: '7:00 AM - 9:00 PM',
    rating: 4.5,
    reviews: 234,
    specialOffer: 'Free drink with meal purchase over ₦500',
  },
  {
    id: '2',
    name: 'Campus Mart',
    category: 'Groceries',
    cashbackRate: '₦200 per ₦1000',
    description: 'Earn rebates on groceries, toiletries, and daily essentials.',
    logo: '🛒',
    featured: true,
    location: 'Student Center Ground Floor',
    hours: '8:00 AM - 10:00 PM',
    rating: 4.2,
    reviews: 156,
    specialOffer: 'Buy 2 Get 1 Free on selected items',
  },
  {
    id: '3',
    name: 'BookHub',
    category: 'Academic',
    cashbackRate: '8%',
    description: 'Save on textbooks, stationery, and academic materials.',
    logo: '📚',
    featured: false,
    location: 'Library Complex',
    hours: '9:00 AM - 6:00 PM',
    rating: 4.7,
    reviews: 89,
    specialOffer: '15% off textbooks for new semester',
  },
  {
    id: '4',
    name: 'TechZone',
    category: 'Electronics',
    cashbackRate: '3%',
    description: 'Get cashback on laptops, phones, and tech accessories.',
    logo: '💻',
    featured: false,
    location: 'Engineering Building',
    hours: '10:00 AM - 7:00 PM',
    rating: 4.3,
    reviews: 67,
    specialOffer: 'Student discount on laptop repairs',
  },
  {
    id: '5',
    name: 'Campus Laundry',
    category: 'Services',
    cashbackRate: '₦50 per wash',
    description: 'Earn points for every laundry service used.',
    logo: '👕',
    featured: false,
    location: 'Hostel Block C',
    hours: '6:00 AM - 11:00 PM',
    rating: 4.0,
    reviews: 123,
    specialOffer: 'Free ironing with wash & fold service',
  },
  {
    id: '6',
    name: 'Study Café',
    category: 'Food & Dining',
    cashbackRate: '6%',
    description: 'Cashback on coffee, snacks, and study space rentals.',
    logo: '☕',
    featured: true,
    location: 'Library 2nd Floor',
    hours: '6:00 AM - 12:00 AM',
    rating: 4.6,
    reviews: 198,
    specialOffer: 'Free WiFi and charging stations',
  },
];

export interface UserRewards {
  totalPoints: number;
  totalCashback: number;
  level: string;
  nextLevelPoints: number;
}

export const DEFAULT_USER_REWARDS: UserRewards = {
  totalPoints: 1250,
  totalCashback: 45.80,
  level: 'Bronze',
  nextLevelPoints: 2500,
};