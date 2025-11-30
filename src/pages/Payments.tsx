import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Driver, DriverPayment, PaymentTransaction, DriverWithdrawal } from '../types/database';
import { DollarSign, Printer, Minus, Plus } from 'lucide-react';

interface PaymentWithDriver extends DriverPayment {
  driver?: Driver;
}

interface TransactionWithDriver extends PaymentTransaction {
  driver?: Driver;
}

interface WithdrawalWithDriver extends DriverWithdrawal {
  driver?: Driver;
}

export function Payments() {
  const [payments, setPayments] = useState<PaymentWithDriver[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithDriver[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<PaymentWithDriver | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading payment data');

      // Load driver payments and drivers separately to avoid join issues
      const paymentsRes = await supabase
        .from('driver_payments')
        .select('*')
        .order('updated_at', { ascending: false });

      let paymentsWithDrivers = [];
      if (paymentsRes.error) {
        console.error('Error loading driver payments:', paymentsRes.error);
      } else {
        // Fetch driver details separately
        if (paymentsRes.data && paymentsRes.data.length > 0) {
          const driverIds = paymentsRes.data.map(p => p.driver_id);
          const { data: driversData, error: driversError } = await supabase
            .from('drivers')
            .select('*')
            .in('id', driverIds);

          if (driversError) {
            console.error('Error loading drivers for payments:', driversError);
          } else {
            // Combine payments with driver information
            paymentsWithDrivers = paymentsRes.data.map(payment => {
              const driver = driversData.find(d => d.id === payment.driver_id);
              return { ...payment, driver };
            });
          }
        } else {
          paymentsWithDrivers = paymentsRes.data || [];
        }
      }

      setPayments(paymentsWithDrivers);

      // Load payment transactions and drivers separately to avoid join issues
      const transactionsRes = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      let transactionsWithDrivers = [];
      if (transactionsRes.error) {
        console.error('Error loading payment transactions:', transactionsRes.error);
      } else {
        // Fetch driver details separately
        if (transactionsRes.data && transactionsRes.data.length > 0) {
          const driverIds = transactionsRes.data.map(t => t.driver_id);
          const { data: driversData, error: driversError } = await supabase
            .from('drivers')
            .select('*')
            .in('id', driverIds);

          if (driversError) {
            console.error('Error loading drivers for transactions:', driversError);
          } else {
            // Combine transactions with driver information
            transactionsWithDrivers = transactionsRes.data.map(transaction => {
              const driver = driversData.find(d => d.id === transaction.driver_id);
              return { ...transaction, driver };
            });
          }
        } else {
          transactionsWithDrivers = transactionsRes.data || [];
        }
      }

      setTransactions(transactionsWithDrivers);

      // Load driver withdrawals and drivers separately to avoid join issues
      const withdrawalsRes = await supabase
        .from('driver_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      let withdrawalsWithDrivers = [];
      if (withdrawalsRes.error) {
        console.error('Error loading driver withdrawals:', withdrawalsRes.error);
      } else {
        // Fetch driver details separately
        if (withdrawalsRes.data && withdrawalsRes.data.length > 0) {
          const driverIds = withdrawalsRes.data.map(w => w.driver_id);
          const { data: driversData, error: driversError } = await supabase
            .from('drivers')
            .select('*')
            .in('id', driverIds);

          if (driversError) {
            console.error('Error loading drivers for withdrawals:', driversError);
          } else {
            // Combine withdrawals with driver information
            withdrawalsWithDrivers = withdrawalsRes.data.map(withdrawal => {
              const driver = driversData.find(d => d.id === withdrawal.driver_id);
              return { ...withdrawal, driver };
            });
          }
        } else {
          withdrawalsWithDrivers = withdrawalsRes.data || [];
        }
      }

      setWithdrawals(withdrawalsWithDrivers);
    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDriver) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > (selectedDriver.pending_amount || 0)) {
      alert('Invalid payment amount');
      return;
    }

    try {
      console.log('Processing payment');
      const { error: updateError } = await supabase
        .from('driver_payments')
        .update({
          pending_amount: (selectedDriver.pending_amount || 0) - amount,
          paid_amount: (selectedDriver.paid_amount || 0) + amount,
        })
        .eq('id', selectedDriver.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      const { error: transactionError } = await supabase.from('payment_transactions').insert({
        driver_id: selectedDriver.driver_id,
        amount: amount,
        notes: paymentNotes || null,
      });

      if (transactionError) {
        console.error('Transaction error:', transactionError);
        throw transactionError;
      }

      setShowPaymentModal(false);
      setSelectedDriver(null);
      setPaymentAmount('');
      setPaymentNotes('');
      loadData();
    } catch (error) {
      console.error('Error making payment:', error);
      alert('Error processing payment. Please try again.');
    }
  };

  const openPaymentModal = (payment: PaymentWithDriver) => {
    setSelectedDriver(payment);
    setPaymentAmount(payment.pending_amount !== null ? payment.pending_amount.toString() : '0');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleRecordWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDriver) return;

    const amount = parseFloat(withdrawalAmount);
    if (amount <= 0 || amount > selectedDriver.pending_amount) {
      alert('Invalid withdrawal amount. Cannot withdraw more than pending amount.');
      return;
    }

    try {
      console.log('Processing withdrawal');

      // Update the driver payment by reducing the pending amount and increasing the paid amount
      const { error: updateError } = await supabaseService
        .from('driver_payments')
        .update({
          pending_amount: selectedDriver.pending_amount - amount,
          paid_amount: selectedDriver.paid_amount + amount,
        })
        .eq('id', selectedDriver.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Record the withdrawal in the withdrawals table
      const { error: withdrawalError } = await supabaseService.from('driver_withdrawals').insert({
        driver_id: selectedDriver.driver_id,
        amount: amount,
        withdrawal_date: new Date().toISOString(),
        notes: withdrawalNotes || null,
      });

      if (withdrawalError) {
        console.error('Withdrawal recording error:', withdrawalError);
        throw withdrawalError;
      }

      setShowWithdrawalModal(false);
      setSelectedDriver(null);
      setWithdrawalAmount('');
      setWithdrawalNotes('');
      loadData(); // Reload data to reflect changes
    } catch (error) {
      console.error('Error recording withdrawal:', error);
      alert('Error processing withdrawal. Please try again.');
    }
  };

  const openWithdrawalModal = (payment: PaymentWithDriver) => {
    setSelectedDriver(payment);
    setWithdrawalAmount(''); // Start with empty amount for withdrawal - admin will enter the withdrawal amount
    setWithdrawalNotes('');
    setShowWithdrawalModal(true);
  };

  const printHistory = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Payment Management</h1>
        <button
          onClick={printHistory}
          className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors print:hidden"
        >
          <Printer size={20} />
          Print History
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Driver Payment Cards</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {payment.driver?.full_name || 'Unknown Driver'}
                    </h3>
                    <p className="text-sm text-slate-600">{payment.driver?.phone_number}</p>
                  </div>
                  <DollarSign className="text-green-600" size={24} />
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Pending Amount</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${payment.pending_amount !== null ? payment.pending_amount.toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Paid Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${payment.paid_amount !== null ? payment.paid_amount.toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {payment.pending_amount !== null && payment.pending_amount > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openPaymentModal(payment)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Pay
                      </button>
                      <button
                        onClick={() => openWithdrawalModal(payment)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Withdraw
                      </button>
                    </div>
                  )}

                  {/* Show total withdrawal button */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const driverWithdrawals = withdrawals.filter(w => w.driver_id === payment.driver_id);
                        const totalWithdrawn = driverWithdrawals.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0);
                        alert(`Total Withdrawal Amount: $${totalWithdrawn.toFixed(2)}`);
                      }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 rounded-lg transition-colors text-xs"
                    >
                      History
                    </button>
                    <button
                      onClick={() => openWithdrawalModal(payment)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-xs flex items-center gap-1"
                    >
                      <Minus size={14} />
                      Record Withdrawal
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Driver</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {new Date(transaction.payment_date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {transaction.driver?.full_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">
                    ${transaction.amount !== null ? transaction.amount.toFixed(2) : '0.00'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {transaction.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New section for withdrawal history */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Withdrawal History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Driver</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {new Date(withdrawal.withdrawal_date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {withdrawal.driver?.full_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-red-600">
                    -${withdrawal.amount !== null ? withdrawal.amount.toFixed(2) : '0.00'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {withdrawal.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPaymentModal && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Make Payment</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Driver</p>
              <p className="text-lg font-semibold text-slate-900">{selectedDriver.driver?.full_name}</p>
              <p className="text-sm text-slate-600 mt-2">Pending Amount</p>
              <p className="text-2xl font-bold text-orange-600">
                ${selectedDriver.pending_amount !== null ? selectedDriver.pending_amount.toFixed(2) : '0.00'}
              </p>
            </div>

            <form onSubmit={handleMakePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={selectedDriver.pending_amount || 0}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedDriver(null);
                    setPaymentAmount('');
                    setPaymentNotes('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Process Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawalModal && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Record Withdrawal</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Driver</p>
              <p className="text-lg font-semibold text-slate-900">{selectedDriver.driver?.full_name}</p>
              <p className="text-sm text-slate-600 mt-2">Current Pending Amount</p>
              <p className="text-2xl font-bold text-orange-600">
                ${selectedDriver.pending_amount !== null ? selectedDriver.pending_amount.toFixed(2) : '0.00'}
              </p>
            </div>

            <form onSubmit={handleRecordWithdrawal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Withdrawal Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  max={selectedDriver.pending_amount || 0}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={withdrawalNotes}
                  onChange={(e) => setWithdrawalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawalModal(false);
                    setSelectedDriver(null);
                    setWithdrawalAmount('');
                    setWithdrawalNotes('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!withdrawalAmount || parseFloat(withdrawalAmount) <= 0 || parseFloat(withdrawalAmount) > (selectedDriver.pending_amount || 0)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    !withdrawalAmount || parseFloat(withdrawalAmount) <= 0 || parseFloat(withdrawalAmount) > (selectedDriver.pending_amount || 0)
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  Record Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
