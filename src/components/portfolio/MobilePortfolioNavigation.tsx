'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Menu, 
  Send, 
  Download, 
  DollarSign, 
  TrendingUp,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { useBalanceVisibility } from './BalanceToggle';

interface MobilePortfolioNavigationProps {
  onQuickAction: (action: 'send' | 'receive' | 'deposit' | 'withdraw') => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function MobilePortfolioNavigation({ 
  onQuickAction, 
  onRefresh, 
  isLoading 
}: MobilePortfolioNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isBalanceVisible, toggleBalanceVisibility } = useBalanceVisibility();

  const handleAction = (action: 'send' | 'receive' | 'deposit' | 'withdraw') => {
    onQuickAction(action);
    setIsOpen(false);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="flex items-center justify-around p-2">
        {/* Quick Actions */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction('send')}
          className="flex flex-col items-center space-y-1 h-auto py-2"
        >
          <Send className="h-5 w-5" />
          <span className="text-xs">Send</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction('receive')}
          className="flex flex-col items-center space-y-1 h-auto py-2"
        >
          <Download className="h-5 w-5" />
          <span className="text-xs">Receive</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction('deposit')}
          className="flex flex-col items-center space-y-1 h-auto py-2"
        >
          <DollarSign className="h-5 w-5" />
          <span className="text-xs">Deposit</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction('withdraw')}
          className="flex flex-col items-center space-y-1 h-auto py-2"
        >
          <TrendingUp className="h-5 w-5" />
          <span className="text-xs">Withdraw</span>
        </Button>

        {/* Balance Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleBalanceVisibility()}
          className="flex flex-col items-center space-y-1 h-auto py-2"
        >
          {isBalanceVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          <span className="text-xs">{isBalanceVisible ? 'Hide' : 'Show'}</span>
        </Button>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex flex-col items-center space-y-1 h-auto py-2"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-xs">Refresh</span>
        </Button>

        {/* More Options */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center space-y-1 h-auto py-2"
            >
              <Menu className="h-5 w-5" />
              <span className="text-xs">More</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Portfolio Actions</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleAction('send')}
                  className="justify-start"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Tokens
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleAction('receive')}
                  className="justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Receive Tokens
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleAction('deposit')}
                  className="justify-start"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Deposit Funds
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleAction('withdraw')}
                  className="justify-start"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Withdraw Funds
                </Button>
              </div>

              <div className="border-t pt-4">
                <Button
                  variant="ghost"
                  onClick={() => toggleBalanceVisibility()}
                  className="w-full justify-start"
                >
                  {isBalanceVisible ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {isBalanceVisible ? 'Hide Balance' : 'Show Balance'}
                </Button>

                <Button
                  variant="ghost"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="w-full justify-start"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Portfolio
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}