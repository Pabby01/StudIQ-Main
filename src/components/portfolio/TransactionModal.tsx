/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Send, ArrowDownToLine, ArrowUpFromLine, Loader2, CheckCircle, Copy, Check, Download, Upload, AlertCircle, Wallet } from 'lucide-react';
import { walletDataService } from '@/lib/wallet-data';
import { secureLogger } from '@/lib/secure-logger';
import { usePrivy } from '@privy-io/react-auth';
import { PublicKey } from '@solana/web3.js';
import { useWalletConnection, useWalletTransactions } from '@/contexts/SolflareWalletContext';
import { SolflareWalletButton } from '@/components/SolflareWalletButton';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'send' | 'receive' | 'deposit' | 'withdraw';
  walletAddress: string;
  availableTokens: string[];
  onTransactionComplete: () => void;
}

export function TransactionModal({
  isOpen,
  onClose,
  type,
  walletAddress,
  availableTokens,
  onTransactionComplete,
}: TransactionModalProps) {
  const { user } = usePrivy();
  const { isConnected: isSolflareConnected, publicKey: solflarePublicKey, balance: solflareBalance } = useWalletConnection();
  const { sendTransaction: sendSolflareTransaction, isTransactionPending } = useWalletTransactions();
  
  const [formData, setFormData] = useState({
    toAddress: '',
    amount: '',
    token: 'SOL',
    memo: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'confirm' | 'processing' | 'complete'>('form');
  const [transactionSignature, setTransactionSignature] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [useSolflare, setUseSolflare] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (type === 'send' || type === 'withdraw') {
      if (!formData.toAddress || !formData.amount) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate Solana address format
      try {
        new PublicKey(formData.toAddress);
      } catch {
        setError('Invalid Solana wallet address format');
        return;
      }

      if (parseFloat(formData.amount) <= 0) {
        setError('Amount must be greater than 0');
        return;
      }
    }

    setStep('confirm');
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    setStep('processing');

    try {
      const amount = parseFloat(formData.amount);

      switch (type) {
        case 'send':
          let sendResult;
          if (useSolflare && isSolflareConnected) {
            // Use Solflare wallet for transaction
            sendResult = await sendSolflareTransaction({
              recipientAddress: formData.toAddress,
              amount,
              memo: formData.memo || undefined
            });
          } else {
            // Use traditional wallet service
            sendResult = await walletDataService.sendTransaction(
              walletAddress,
              formData.toAddress,
              amount,
              formData.token === 'SOL' ? undefined : formData.token
            );
          }
          
          setTransactionSignature(sendResult.signature);
          
          // Monitor transaction confirmation
          await walletDataService.monitorTransaction(sendResult.signature);
          break;

        case 'deposit':
          // For deposit, we just show the wallet address (similar to receive)
          setStep('complete');
          setIsLoading(false);
          return;

        case 'withdraw':
          let withdrawResult;
          if (useSolflare && isSolflareConnected) {
            // Use Solflare wallet for transaction
            withdrawResult = await sendSolflareTransaction({
              recipientAddress: formData.toAddress,
              amount,
              memo: formData.memo || undefined
            });
          } else {
            // Use traditional wallet service
            withdrawResult = await walletDataService.sendTransaction(
              walletAddress,
              formData.toAddress,
              amount,
              formData.token === 'SOL' ? undefined : formData.token
            );
          }
          
          setTransactionSignature(withdrawResult.signature);
          
          // Monitor transaction confirmation
          await walletDataService.monitorTransaction(withdrawResult.signature);
          break;

        case 'receive':
          // For receive, we just show the wallet address
          setStep('complete');
          setIsLoading(false);
          return;
      }

      setStep('complete');
      onTransactionComplete();
      secureLogger.info('Transaction completed successfully', {
        type,
        token: formData.token,
        amount,
        signature: transactionSignature,
        walletAddress: (useSolflare ? solflarePublicKey?.toString() : walletAddress)?.slice(0, 8) + '...', // Log only first 8 chars for privacy
        usedSolflare: useSolflare
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStep('form');
      secureLogger.error('Transaction failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ toAddress: '', amount: '', token: 'SOL', memo: '' });
    setError(null);
    setStep('form');
    setTransactionSignature('');
    setCopied(false);
    setUseSolflare(false);
    onClose();
  };

  const copySignature = async () => {
    if (transactionSignature) {
      await navigator.clipboard.writeText(transactionSignature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getModalTitle = () => {
    switch (type) {
      case 'send': return 'Send Cryptocurrency';
      case 'receive': return 'Receive Cryptocurrency';
      case 'deposit': return 'Deposit Funds';
      case 'withdraw': return 'Withdraw Funds';
      default: return 'Transaction';
    }
  };

  const getSubmitButtonText = () => {
    switch (type) {
      case 'send': return 'Send';
      case 'receive': return 'Show Address';
      case 'deposit': return 'Deposit';
      case 'withdraw': return 'Withdraw';
      default: return 'Submit';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'send' && <Send className="h-5 w-5" />}
            {type === 'receive' && <Download className="h-5 w-5" />}
            {type === 'deposit' && <Upload className="h-5 w-5" />}
            {type === 'withdraw' && <Download className="h-5 w-5" />}
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Solflare Wallet Integration */}
            {(type === 'send' || type === 'withdraw') && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Wallet Method</Label>
                  {isSolflareConnected && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Wallet className="h-3 w-3" />
                      Solflare Ready
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="traditional"
                      name="walletMethod"
                      checked={!useSolflare}
                      onChange={() => setUseSolflare(false)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Label htmlFor="traditional" className="text-sm">
                      Traditional Wallet ({walletAddress.slice(0, 8)}...)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="solflare"
                      name="walletMethod"
                      checked={useSolflare}
                      onChange={() => setUseSolflare(true)}
                      disabled={!isSolflareConnected}
                      className="w-4 h-4 text-blue-600 disabled:opacity-50"
                    />
                    <Label htmlFor="solflare" className={`text-sm ${!isSolflareConnected ? 'text-gray-400' : ''}`}>
                      Solflare Wallet {isSolflareConnected ? `(${solflareBalance.toFixed(4)} SOL)` : '(Not Connected)'}
                    </Label>
                  </div>
                </div>

                {!isSolflareConnected && (
                  <div className="mt-2">
                    <SolflareWalletButton size="sm" variant="outline" showBalance={false} showAddress={false} />
                  </div>
                )}
              </div>
            )}

            {type !== 'receive' && (
              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <Select
                  value={formData.token}
                  onValueChange={(value) => setFormData({ ...formData, token: value })}
                  disabled={useSolflare} // Solflare integration currently supports SOL only
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTokens.map((token) => (
                      <SelectItem key={token} value={token}>
                        {token}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {useSolflare && formData.token !== 'SOL' && (
                  <p className="text-xs text-amber-600">
                    ⚠️ Solflare integration currently supports SOL only
                  </p>
                )}
              </div>
            )}

            {(type === 'send' || type === 'withdraw') && (
              <div className="space-y-2">
                <Label htmlFor="toAddress">Recipient Address</Label>
                <Input
                  id="toAddress"
                  placeholder="Enter wallet address"
                  value={formData.toAddress}
                  onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
                  required
                />
              </div>
            )}

            {type !== 'receive' && (
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    max={useSolflare ? solflareBalance : undefined}
                  />
                  {useSolflare && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, amount: Math.max(0, solflareBalance - 0.000005).toString() })}
                      className="absolute right-1 top-1 h-8 px-2 text-xs"
                    >
                      MAX
                    </Button>
                  )}
                </div>
                {useSolflare && (
                  <p className="text-xs text-gray-600">
                    Available: {solflareBalance.toFixed(6)} SOL (excluding ~0.000005 SOL for fees)
                  </p>
                )}
                {useSolflare && formData.amount && parseFloat(formData.amount) > solflareBalance && (
                  <p className="text-xs text-red-600">
                    ⚠️ Amount exceeds available balance
                  </p>
                )}
              </div>
            )}

            {(type === 'send' || type === 'withdraw') && (
              <div className="space-y-2">
                <Label htmlFor="memo">Memo (Optional)</Label>
                <Input
                  id="memo"
                  type="text"
                  placeholder="Add a note for this transaction"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  maxLength={100}
                />
              </div>
            )}

            {type === 'receive' && (
              <div className="space-y-2">
                <Label>Your Wallet Address</Label>
                <div className="p-3 bg-gray-100 rounded-md break-all text-sm font-mono">
                  {walletAddress}
                </div>
                <p className="text-xs text-gray-500">
                  Share this address to receive cryptocurrency
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={
                  !!(useSolflare && !isSolflareConnected) ||
                  !!(useSolflare && formData.token !== 'SOL') ||
                  !!(useSolflare && formData.amount && parseFloat(formData.amount) > solflareBalance)
                }
              >
                {getSubmitButtonText()}
              </Button>
            </div>
          </form>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Confirm Transaction</h3>
              <p className="text-gray-600 mb-4">
                Please review your transaction details before confirming.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">{type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Wallet:</span>
                <span className="font-medium">
                  {useSolflare ? 'Solflare' : 'Traditional'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Token:</span>
                <span className="font-medium">{formData.token}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">{formData.amount}</span>
              </div>
              {(type === 'send' || type === 'withdraw') && (
                <div className="flex justify-between">
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium text-xs">
                    {formData.toAddress.slice(0, 8)}...{formData.toAddress.slice(-8)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('form')}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleConfirm} 
                className="flex-1"
                disabled={isLoading || (useSolflare && isTransactionPending)}
              >
                {(isLoading || (useSolflare && isTransactionPending)) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {useSolflare ? 'Signing...' : 'Processing...'}
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
            <h3 className="text-lg font-semibold">Processing Transaction</h3>
            <p className="text-gray-600">
              Please wait while we process your transaction...
            </p>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {type === 'receive' || type === 'deposit' ? 'Ready to Receive' : 'Transaction Complete'}
              </h3>
              <p className="text-gray-600 mt-2">
                {type === 'receive' || type === 'deposit'
                  ? 'Share your wallet address to receive funds'
                  : 'Your transaction has been processed successfully'}
              </p>
            </div>
            
            {transactionSignature && (type === 'send' || type === 'withdraw') && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <Label className="text-sm font-medium text-gray-700">Transaction Signature</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={transactionSignature}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copySignature}
                    className="shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  You can use this signature to track your transaction on Solana Explorer
                </p>
              </div>
            )}
            
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}