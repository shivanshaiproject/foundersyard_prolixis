import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdsLayout } from '@/components/ads/AdsLayout';
import { MetricCard } from '@/components/ads/MetricCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Loader2, Plus, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const presetAmounts = [1000, 5000, 10000];
const PENDING_TOPUP_KEY = 'fy_pending_wallet_topup';

export default function AdsWallet() {
  const { wallet, transactions, loading, processingPayment, initiateRazorpayPayment, refreshWallet, refetch } = useWallet();
  const [customAmount, setCustomAmount] = useState('');
  const [verifyingReturn, setVerifyingReturn] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const balanceInRupees = wallet ? wallet.balance / 100 : 0;

  useEffect(() => {
    if (loading) return;

    const qpOrderId = searchParams.get('razorpay_order_id');
    const qpPaymentId = searchParams.get('razorpay_payment_id');
    const qpSignature = searchParams.get('razorpay_signature');

    let storedOrderId: string | null = null;
    try {
      const raw = localStorage.getItem(PENDING_TOPUP_KEY);
      storedOrderId = raw ? (JSON.parse(raw)?.order_id ?? null) : null;
    } catch {
      storedOrderId = null;
    }

    const orderId = qpOrderId || storedOrderId;
    if (!orderId) return;

    let cancelled = false;

    (async () => {
      setVerifyingReturn(true);
      const toastId = toast.loading('Verifying your payment…');

      try {
        // Preferred: verify using Razorpay signature if we received it as query params
        if (qpOrderId && qpPaymentId && qpSignature) {
          const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
            body: {
              razorpay_order_id: qpOrderId,
              razorpay_payment_id: qpPaymentId,
              razorpay_signature: qpSignature,
            },
          });

          if (error || !data?.success) {
            throw new Error(data?.error || 'Payment verification failed');
          }
        } else {
          // Fallback: recover after bank/UPI redirect by syncing payment from Razorpay using order id
          const { data, error } = await supabase.functions.invoke('sync-razorpay-order', {
            body: { razorpay_order_id: orderId },
          });

          if (error || !data?.success) {
            throw new Error((data as any)?.error || 'Payment verification failed');
          }

          if (data.status !== 'completed') {
            toast('Payment is still pending. If you already paid, wait 1–2 minutes and refresh this page.', {
              id: toastId,
            });
            return;
          }
        }

        localStorage.removeItem(PENDING_TOPUP_KEY);
        await refreshWallet();
        await refetch();

        toast.success('Payment confirmed. Wallet updated.', { id: toastId });

        // Clean URL (remove Razorpay query params)
        if (searchParams.toString()) {
          navigate('/ads/wallet', { replace: true });
        }
      } catch (err: any) {
        console.error('Wallet payment verification failed:', err);
        toast.error(err?.message || 'Could not verify payment', { id: toastId });
      } finally {
        if (!cancelled) setVerifyingReturn(false);
      }
    })();

    return () => {
      cancelled = true;
    };

    // We intentionally only re-check once wallet loading is done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handlePresetAmount = async (amount: number) => {
    await initiateRazorpayPayment(amount);
  };

  const handleCustomAmountAdd = async () => {
    const amount = parseInt(customAmount, 10);
    if (isNaN(amount) || amount < 100) {
      toast.error('Minimum amount is ₹100');
      return;
    }
    if (amount > 100000) {
      toast.error('Maximum amount is ₹1,00,000');
      return;
    }
    const success = await initiateRazorpayPayment(amount);
    if (success) {
      setCustomAmount('');
    }
  };

  if (loading) {
    return (
      <AdsLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdsLayout>
    );
  }

  return (
    <AdsLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground mt-1">Manage your ad funds</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Balance Card */}
          <div className="lg:col-span-1">
            <MetricCard
              title="Available Balance"
              value={`₹${balanceInRupees.toLocaleString('en-IN')}`}
              subtitle="Ready to spend"
              icon={Wallet}
              gradient="purple"
            />
          </div>

          {/* Add Funds */}
          <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Add Funds via Razorpay</h2>
            </div>
            
            {/* Preset Amounts */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              {presetAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => handlePresetAmount(amount)}
                  disabled={processingPayment || verifyingReturn}
                  className="h-12 sm:h-16 text-sm sm:text-lg font-semibold hover:border-primary hover:bg-primary/5 transition-all"
                >
                  {processingPayment ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      ₹{amount.toLocaleString('en-IN')}
                    </>
                  )}
                </Button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="border-t border-border/50 pt-6">
              <p className="text-sm text-muted-foreground mb-3">Or enter custom amount</p>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    placeholder="Enter amount (min ₹100)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-8"
                    min={100}
                    max={100000}
                  />
                </div>
                <Button 
                  onClick={handleCustomAmountAdd}
                  disabled={processingPayment || verifyingReturn || !customAmount}
                  className="px-6"
                >
                  {processingPayment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Pay Now'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Min: ₹100 • Max: ₹1,00,000
              </p>
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                🔒 Secure payment powered by Razorpay • UPI, Cards, Netbanking accepted
              </p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-lg font-semibold">Transaction History</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add funds to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm')}
                    </TableCell>
                    <TableCell>{tx.description || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={tx.type === 'credit' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }
                      >
                        {tx.type === 'credit' ? (
                          <ArrowUpCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <ArrowDownCircle className="w-3 h-3 mr-1" />
                        )}
                        {tx.type === 'credit' ? 'Credit' : 'Debit'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      tx.type === 'credit' ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {tx.type === 'credit' ? '+' : '-'}₹{Math.abs(tx.amount / 100).toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AdsLayout>
  );
}
