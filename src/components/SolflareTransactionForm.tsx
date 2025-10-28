/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWalletConnection, useWalletTransactions } from '@/contexts/SolflareWalletContext';
import { Send, Loader2, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'react-hot-toast';

interface SolflareTransactionFormProps {
  onTransactionComplete?: (signature: string) => void;
  onTransactionError?: (error: string) => void;
  className?: string;
}

/**
 * Solflare Transaction Form Component
 * Allows users to send SOL transactions through their connected Solflare wallet
 */
export function SolflareTransactionForm({
  onTransactionComplete,
  onTransactionError,
  className = ''
}: SolflareTransactionFormProps) {
  const { isConnected, publicKey, balance, updateBalance } = useWalletConnection();
  const { sendTransaction, isTransactionPending } = useWalletTransactions();
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isValidRecipient, setIsValidRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [lastTransactionSignature, setLastTransactionSignature] = useState<string | null>(null);

  // Validate recipient address
  useEffect(() => {
    if (!recipient.trim()) {
      setIsValidRecipient(false);
      setRecipientError('');
      return;
    }

    try {
      new PublicKey(recipient);
      setIsValidRecipient(true);
      setRecipientError('');
    } catch (_error) {
      setIsValidRecipient(false);
      setRecipientError('Invalid Solana address format');
    }
  }, [recipient]);

  // Validate amount
  useEffect(() => {
    if (!amount.trim()) {
      setAmountError('');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError('Amount must be a positive number');
      return;
    }

    if (numAmount > balance) {
      setAmountError(`Insufficient balance. Available: ${balance.toFixed(4)} SOL`);
      return;
    }

    if (numAmount < 0.000001) {
      setAmountError('Minimum amount is 0.000001 SOL');
      return;
    }

    setAmountError('');
  }, [amount, balance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !publicKey) {
      toast.error('Please connect your Solflare wallet first');
      return;
    }

    if (!isValidRecipient) {
      toast.error('Please enter a valid recipient address');
      return;
    }

    if (amountError) {
      toast.error(amountError);
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const result = await sendTransaction({
        recipientAddress: recipient,
        amount: numAmount,
        memo: memo.trim() || undefined
      });

      setLastTransactionSignature(result.signature);
      toast.success(`Transaction sent successfully! Signature: ${result.signature.slice(0, 8)}...`);
      
      // Clear form
      setRecipient('');
      setAmount('');
      setMemo('');
      
      // Update balance after successful transaction
      setTimeout(() => {
        updateBalance();
      }, 2000);

      onTransactionComplete?.(result.signature);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
      toast.error(errorMessage);
      onTransactionError?.(errorMessage);
    }
  };

  const handleMaxAmount = () => {
    // Reserve some SOL for transaction fees (approximately 0.000005 SOL)
    const maxAmount = Math.max(0, balance - 0.000005);
    setAmount(maxAmount.toString());
  };

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <AlertCircle className="h-5 w-5" />
            <span>Please connect your Solflare wallet to send transactions</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send SOL
        </CardTitle>
        <div className="text-sm text-gray-600">
          Available Balance: {balance.toFixed(6)} SOL
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient Address */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              type="text"
              placeholder="Enter Solana wallet address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className={recipientError ? 'border-red-500' : isValidRecipient ? 'border-green-500' : ''}
            />
            {recipientError && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {recipientError}
              </div>
            )}
            {isValidRecipient && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Valid Solana address
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (SOL)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.000001"
                min="0.000001"
                max={balance}
                placeholder="0.000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={amountError ? 'border-red-500 pr-16' : 'pr-16'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMaxAmount}
                className="absolute right-1 top-1 h-8 px-2 text-xs"
              >
                MAX
              </Button>
            </div>
            {amountError && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {amountError}
              </div>
            )}
          </div>

          {/* Memo (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="memo">Memo (Optional)</Label>
            <Input
              id="memo"
              type="text"
              placeholder="Add a note to your transaction"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={32}
            />
            <div className="text-xs text-gray-500">
              {memo.length}/32 characters
            </div>
          </div>

          {/* Transaction Fee Info */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <DollarSign className="h-4 w-4" />
              <span>Estimated network fee: ~0.000005 SOL</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              isTransactionPending ||
              !isValidRecipient ||
              !amount ||
              !!amountError ||
              !!recipientError
            }
            className="w-full"
          >
            {isTransactionPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending Transaction...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send SOL
              </>
            )}
          </Button>

          {/* Last Transaction */}
          {lastTransactionSignature && (
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-800">
                <div className="font-medium">Last Transaction:</div>
                <div className="font-mono text-xs break-all">
                  {lastTransactionSignature}
                </div>
                <a
                  href={`https://explorer.solana.com/tx/${lastTransactionSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  View on Solana Explorer →
                </a>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export default SolflareTransactionForm;