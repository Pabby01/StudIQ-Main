/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TransactionResponse } from '@/lib/crypto-api-service';
import { Loader2, Send, Download, Upload, AlertCircle } from 'lucide-react';
import { cryptoApiService } from '@/lib/crypto-api-service';
import { secureLogger } from '@/lib/secure-logger';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'send' | 'receive' | 'deposit' | 'withdraw';
  walletAddress: string;
  availableTokens: string[];
  onTransactionComplete: (transaction: TransactionResponse) => void;
}

export function TransactionModal({
  isOpen,
  onClose,
  type,
  walletAddress,
  availableTokens,
  onTransactionComplete,
}: TransactionModalProps) {
  const [formData, setFormData] = useState({
    toAddress: '',
    amount: '',
    token: 'SOL',
    twoFactorCode: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'confirm' | 'processing' | 'complete'>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (type === 'send' || type === 'withdraw') {
      if (!formData.toAddress || !formData.amount) {
        setError('Please fill in all required fields');
        return;
      }

      if (!cryptoApiService.validateWalletAddress(formData.toAddress, 'solana')) {
        setError('Invalid wallet address format');
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
      let result;
      const amount = parseFloat(formData.amount);

      switch (type) {
        case 'send':
          result = await cryptoApiService.sendTransaction({
            toAddress: formData.toAddress,
            amount,
            token: formData.token,
            walletAddress,
            twoFactorCode: formData.twoFactorCode,
          });
          break;

        case 'deposit':
          result = await cryptoApiService.processDeposit({
            token: formData.token,
            amount,
            walletAddress,
          });
          break;

        case 'withdraw':
          result = await cryptoApiService.processWithdrawal({
            toAddress: formData.toAddress,
            amount,
            token: formData.token,
            walletAddress,
            twoFactorCode: formData.twoFactorCode,
          });
          break;

        case 'receive':
          // For receive, we just show the wallet address
          setStep('complete');
          setIsLoading(false);
          return;
      }

      setStep('complete');
      onTransactionComplete(result);
      secureLogger.info('Transaction completed successfully', {
        type,
        token: formData.token,
        amount,
        walletAddress: walletAddress.slice(0, 8) + '...', // Log only first 8 chars for privacy
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
    setFormData({ toAddress: '', amount: '', token: 'SOL', twoFactorCode: '' });
    setError(null);
    setStep('form');
    onClose();
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

            {type !== 'receive' && (
              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <Select
                  value={formData.token}
                  onValueChange={(value) => setFormData({ ...formData, token: value })}
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
                <Input
                  id="amount"
                  type="number"
                  step="0.000001"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            )}

            {(type === 'send' || type === 'withdraw') && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">2FA Code (Optional)</Label>
                <Input
                  id="twoFactorCode"
                  placeholder="Enter 2FA code"
                  value={formData.twoFactorCode}
                  onChange={(e) => setFormData({ ...formData, twoFactorCode: e.target.value })}
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
              <Button type="submit" className="flex-1">
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
              <Button onClick={handleConfirm} className="flex-1">
                Confirm
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
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Transaction Complete!</h3>
            <p className="text-gray-600">
              Your transaction has been processed successfully.
            </p>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}