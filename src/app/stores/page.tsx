'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import AppLayout from '@/components/AppLayout';
import { CAMPUS_STORES, CampusStore, DEFAULT_USER_REWARDS } from '@/lib/data';
import { 
  Store, 
  Star, 
  Gift, 
  Search,
  MapPin,
  Clock,
  Percent,
  Coins,
  ShoppingBag,
  Filter
} from 'lucide-react';

export default function CampusStores() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [userRewards] = useState(DEFAULT_USER_REWARDS);

  const categories = ['All', 'Food & Dining', 'Books & Supplies', 'Clothing', 'Electronics', 'Services'];

  const filteredStores = CAMPUS_STORES.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || store.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleRedeem = (store: CampusStore) => {
    // In a real app, this would handle the redemption logic
    alert(`Redirecting to ${store.name} with your rebate code!`);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Store className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Campus Store</h1>
          </div>
          <p className="text-gray-600 max-w-2xl">
            Earn cashback and rewards at your favorite campus stores. Use your reward points 
            to get exclusive discounts and deals.
          </p>
        </div>

        {/* Rewards Summary */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Coins className="h-6 w-6 text-yellow-600" />
                  <span className="text-2xl font-bold text-gray-900">{userRewards.totalPoints}</span>
                </div>
                <p className="text-sm text-gray-600">Reward Points</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Gift className="h-6 w-6 text-green-600" />
                  <span className="text-2xl font-bold text-gray-900">${userRewards.totalCashback}</span>
                </div>
                <p className="text-sm text-gray-600">Total Cashback</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Star className="h-6 w-6 text-purple-600" />
                  <span className="text-2xl font-bold text-gray-900">{userRewards.level}</span>
                </div>
                <p className="text-sm text-gray-600">Membership Tier</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <Card key={store.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{store.name}</CardTitle>
                    <CardDescription className="mt-1">{store.category}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {store.cashbackRate}% back
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Store Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{store.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{store.hours}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{store.rating}</span>
                    <span className="text-gray-500">({store.reviews} reviews)</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600">{store.description}</p>

                {/* Special Offers */}
                {store.specialOffer && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Gift className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Special Offer</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">{store.specialOffer}</p>
                  </div>
                )}

                {/* Cashback Info */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Percent className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Cashback Rate</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{store.cashbackRate}%</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    Earn {store.cashbackRate} points for every $1 spent
                  </p>
                </div>

                {/* Action Button */}
                <Button 
                  className="w-full"
                  onClick={() => handleRedeem(store)}
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Shop & Earn
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredStores.length === 0 && (
          <div className="text-center py-12">
            <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* How It Works */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">1. Shop</h3>
                <p className="text-sm text-gray-600">
                  Click &quot;Shop & Earn&ldquo; to visit participating stores with your unique referral link.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coins className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">2. Earn</h3>
                <p className="text-sm text-gray-600">
                  Automatically earn reward points based on your purchase amount and the store&apos;s cashback rate.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">3. Redeem</h3>
                <p className="text-sm text-gray-600">
                  Use your points for exclusive discounts, special offers, or convert to cash.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tier Benefits */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Membership Tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-center">Bronze</CardTitle>
                <CardDescription className="text-center">0 - 999 points</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-gray-600 mb-4">1x</div>
                <p className="text-sm text-gray-600">Standard cashback rates</p>
              </CardContent>
            </Card>

            <Card className="border-yellow-300 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-center text-yellow-800">Silver</CardTitle>
                <CardDescription className="text-center">1,000 - 4,999 points</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-yellow-600 mb-4">1.5x</div>
                <p className="text-sm text-gray-600">50% bonus on all cashback</p>
              </CardContent>
            </Card>

            <Card className="border-purple-300 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-center text-purple-800">Gold</CardTitle>
                <CardDescription className="text-center">5,000+ points</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-4">2x</div>
                <p className="text-sm text-gray-600">Double cashback + exclusive offers</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}