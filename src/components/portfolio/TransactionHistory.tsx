/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Upload, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { walletDataService, Transaction } from '@/lib/wallet-data';
import { heliusTransactionService, ProcessedTransaction } from '@/lib/helius-transaction-service';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TransactionHistoryProps {
  walletAddress: string;
  className?: string;
}

interface TransactionFilters {
  search: string;
  type: 'all' | 'send' | 'receive' | 'deposit' | 'withdraw';
  status: 'all' | 'pending' | 'confirmed' | 'failed';
  token: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export function TransactionHistory({ walletAddress, className }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<ProcessedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    type: 'all',
    status: 'all',
    token: 'all',
    dateRange: 'all',
  });
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadTransactionHistory();
    
    // Set up polling for real-time updates
    const pollInterval = setInterval(() => {
      if (!isLoading && walletAddress && lastSignature) {
        pollForNewTransactions();
      }
    }, 30000); // Poll every 30 seconds to respect rate limits

    return () => clearInterval(pollInterval);
  }, [walletAddress, lastSignature]);

  const loadTransactionHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the new Helius transaction service
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
        throw new Error('Invalid Solana wallet address');
      }
      const history = await heliusTransactionService.getTransactionHistory(walletAddress, 50);
      setTransactions(history);
      
      // Set the last signature for polling
      if (history.length > 0) {
        setLastSignature(history[0].signature);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429')) {
        setError('Rate limited by Solana indexer. Please retry in a minute.');
      } else {
        setError('Failed to load transaction history');
      }
      console.error('Error loading transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const pollForNewTransactions = async () => {
    try {
      setIsPolling(true);
      
      const newTransactions = await heliusTransactionService.getLatestTransactions(
        walletAddress, 
        lastSignature || undefined
      );
      
      if (newTransactions.length > 0) {
        setTransactions(prev => [...newTransactions, ...prev]);
        setLastSignature(newTransactions[0].signature);
      }
    } catch (err) {
      console.error('Error polling for new transactions:', err);
    } finally {
      setIsPolling(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(tx => 
        (tx.to?.toLowerCase().includes(searchLower)) ||
        (tx.from?.toLowerCase().includes(searchLower)) ||
        (tx.counterparty?.toLowerCase().includes(searchLower)) ||
        tx.signature.toLowerCase().includes(searchLower) ||
        tx.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.type !== 'all') {
      filtered = filtered.filter(tx => {
        if (filters.type === 'send') return tx.type === 'send';
        if (filters.type === 'receive') return tx.type === 'receive';
        if (filters.type === 'deposit') return tx.type === 'receive';
        if (filters.type === 'withdraw') return tx.type === 'send';
        return true;
      });
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(tx => tx.status === filters.status);
    }

    if (filters.token !== 'all') {
      filtered = filtered.filter(tx => tx.symbol === filters.token || tx.tokenSymbol === filters.token);
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(tx => new Date(tx.timestamp) >= cutoffDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [transactions, filters, sortBy, sortOrder]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const getTransactionIcon = (transaction: ProcessedTransaction) => {
    switch (transaction.type) {
      case 'send':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'receive':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'swap':
        return <Upload className="h-4 w-4 text-blue-500" />;
      case 'nft':
        return <Upload className="h-4 w-4 text-purple-500" />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'outline',
      confirmed: 'default',
      failed: 'destructive',
    } as const;

    const icons = {
      pending: <Clock className="h-3 w-3" />,
      confirmed: <CheckCircle className="h-3 w-3" />,
      failed: <XCircle className="h-3 w-3" />,
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className="gap-1">
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTransactionType = (transaction: ProcessedTransaction) => {
    return transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
  };

  const getTransactionDescription = (transaction: ProcessedTransaction) => {
    return transaction.description || transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
  };

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 animate-spin" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading transactions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Transaction History</span>
            {isPolling && (
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="text-xs">Live</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTransactionHistory}
            disabled={isLoading}
            className="gap-2"
          >
            <Clock className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({ ...filters, type: value as 'all' | 'send' | 'receive' | 'deposit' | 'withdraw' })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="send">Send</SelectItem>
                <SelectItem value="receive">Receive</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdraw">Withdraw</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value as 'all' | 'pending' | 'confirmed' | 'failed' })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters({ ...filters, dateRange: value as 'all' | 'today' | 'week' | 'month' })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transaction Table */}
        {paginatedTransactions.length === 0 ? (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No transactions found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your filters or check back later
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">USD Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction, index) => (
                    <TableRow key={transaction.signature + index}>
                      <TableCell>{getTransactionIcon(transaction)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(transaction.timestamp), 'MMM dd, yyyy')}</div>
                          <div className="text-gray-500">{format(new Date(transaction.timestamp), 'HH:mm')}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'font-medium',
                          transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
                        )}>
                          {transaction.amount < 0 ? '-' : '+'}
                          {Math.abs(transaction.amount).toFixed(6)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.symbol}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell className="text-right text-sm text-gray-600">
                        {transaction.usdValue ? `$${transaction.usdValue.toFixed(2)}` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}