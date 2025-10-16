'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SAVINGS_POOLS } from '@/lib/data';
import { 
  TrendingUp, 
  Shield, 
  Info, 
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function SavingsPools() {
  const [depositAmount, setDepositAmount] = useState('');

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'Low': return <CheckCircle className="h-4 w-4" />;
      case 'Medium': return <Clock className="h-4 w-4" />;
      case 'High': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Savings Pools</h1>
          </div>
          <p className="text-gray-600 max-w-2xl">
            Discover curated DeFi opportunities designed for students. Each pool is carefully selected 
            and explained by our AI to help you understand the risks and rewards.
          </p>
        </div>

        {/* Risk Warning */}
        <Card className="mb-8 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800">Important Reminder</h3>
                <p className="text-yellow-700 text-sm mt-1">
                  DeFi investments carry risks. Only invest what you can afford to lose. 
                  Start small and learn as you go. Our AI tutor can help explain any concepts you don&apos;t understand.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAVINGS_POOLS.map((pool) => (
            <Card key={pool.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{pool.name}</CardTitle>
                    <CardDescription className="mt-1">{pool.type}</CardDescription>
                  </div>
                  <Badge className={getRiskColor(pool.risk)}>
                    <div className="flex items-center space-x-1">
                      {getRiskIcon(pool.risk)}
                      <span>{pool.risk}</span>
                    </div>
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* APY Display */}
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{pool.apy}</div>
                  <div className="text-sm text-gray-600">Annual Percentage Yield</div>
                </div>

                {/* Pool Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Min Deposit:</span>
                    <span className="font-medium">{pool.minDeposit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Locked:</span>
                    <span className="font-medium">{pool.totalLocked}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600">{pool.description}</p>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="flex-1"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Deposit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Deposit to {pool.name}</DialogTitle>
                        <DialogDescription>
                          Enter the amount you&apos;d like to deposit into this pool.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Amount</label>
                          <Input
                            placeholder={`Min: ${pool.minDeposit}`}
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                          />
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">AI Explanation:</h4>
                          <p className="text-sm text-blue-800">
                            This is a {pool.risk.toLowerCase()}-risk pool with {pool.apy} APY. 
                            {pool.risk === 'Low' && "Your principal is relatively safe, but returns are modest."}
                            {pool.risk === 'Medium' && "Balanced risk-reward with moderate volatility."}
                            {pool.risk === 'High' && "Higher potential returns but significant risk of loss."}
                            {" "}Always start with small amounts to learn how it works.
                          </p>
                        </div>
                        
                        <Button className="w-full" disabled>
                          Deposit {depositAmount || '0'} (Demo Mode)
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Educational Section */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>Safety Tips</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Start with low-risk pools to learn the basics</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Never invest more than you can afford to lose</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Diversify across multiple pools and strategies</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Ask our AI tutor if you&apos;re not sure about something</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span>Community Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Students:</span>
                <span className="font-semibold">2,847</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Deposited:</span>
                <span className="font-semibold">$4.2M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Monthly Return:</span>
                <span className="font-semibold text-green-600">+6.8%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Success Rate:</span>
                <span className="font-semibold text-green-600">94.2%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}