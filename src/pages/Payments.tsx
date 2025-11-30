import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Driver, DriverPayment, PaymentTransaction, DriverWithdrawal } from '../types/database';
import { DollarSign, Printer, Minus, Plus, Search } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';

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
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithDriver[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithDriver[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithDriver[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithDriver[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<WithdrawalWithDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<PaymentWithDriver | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');
  const [adminEmail, setAdminEmail] = useState('hi@gmail.com'); // This would typically come from auth state

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading payment data');

      // Load all drivers first to ensure all are represented in the payment system
      const driversRes = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (driversRes.error) throw driversRes.error;
      const allDrivers = driversRes.data || [];

      // Then get existing payment records
      const paymentsRes = await supabase
        .from('driver_payments')
        .select('*');

      if (paymentsRes.error) throw paymentsRes.error;
      const existingPayments = paymentsRes.data || [];

      // Combine all drivers with their payment records, creating default records for drivers without payments
      let paymentsWithDrivers = allDrivers.map(driver => {
        const existingPayment = existingPayments.find(payment => payment.driver_id === driver.id);

        if (existingPayment) {
          return { ...existingPayment, driver };
        } else {
          // If no payment record exists, create a default one
          return {
            id: null, // Will be null until it's created in the database
            driver_id: driver.id,
            pending_amount: 0,
            paid_amount: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            driver
          };
        }
      });

      // Sort by most recently updated/added
      paymentsWithDrivers.sort((a, b) => {
        const aDate = a.updated_at || a.created_at;
        const bDate = b.updated_at || b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

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
    if (amount <= 0 || amount > selectedDriver.paid_amount) {
      alert('Invalid withdrawal amount. Cannot withdraw more than paid amount.');
      return;
    }

    try {
      console.log('Processing withdrawal');

      // Update the driver payment by reducing the paid amount and keeping pending unchanged
      // A withdrawal means money is taken from the paid funds, so paid decreases
      const { error: updateError } = await supabase
        .from('driver_payments')
        .update({
          paid_amount: selectedDriver.paid_amount - amount,
        })
        .eq('id', selectedDriver.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Record the withdrawal in the withdrawals table
      const { error: withdrawalError } = await supabase.from('driver_withdrawals').insert({
        driver_id: selectedDriver.driver_id,
        amount: amount,
        withdrawal_date: new Date().toISOString(),
        notes: withdrawalNotes || null,
      });

      if (withdrawalError) {
        console.error('Withdrawal recording error:', withdrawalError);
        throw withdrawalError;
      }

      // Also record the withdrawal in the payment transactions table for history
      const { error: transactionError } = await supabase.from('payment_transactions').insert({
        driver_id: selectedDriver.driver_id,
        amount: amount,
        payment_date: new Date().toISOString(),
        notes: `WITHDRAWAL: ${withdrawalNotes || 'Manual withdrawal'}`,
      });

      if (transactionError) {
        console.error('Transaction recording error:', transactionError);
        // Still consider the operation successful even if transaction recording fails
        // as the main withdrawal was recorded in the driver_withdrawals table
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
    // Set the withdrawal amount to the current pending amount as a default, but keep it empty for user input
    setWithdrawalNotes('');
    setShowWithdrawalModal(true);
  };

  const printHistory = () => {
    window.print();
  };

  const printTransaction = (transaction: TransactionWithDriver) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Transaction Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .info { margin-bottom: 15px; }
              .info div { margin-bottom: 5px; }
              .amount { font-size: 24px; font-weight: bold; color: #22c55e; text-align: center; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h2>Transaction Receipt</h2>
                <hr style="margin: 10px 0;">
              </div>

              <div class="info">
                <div><strong>Date:</strong> ${new Date(transaction.payment_date).toLocaleString()}</div>
                <div><strong>Driver:</strong> ${transaction.driver?.full_name || 'Unknown'}</div>
                <div><strong>Driver Phone:</strong> ${transaction.driver?.phone_number || 'N/A'}</div>
              </div>

              <div class="amount">$${transaction.amount !== null ? transaction.amount.toFixed(2) : '0.00'}</div>

              <div class="info">
                <div><strong>Notes:</strong> ${transaction.notes || '-'}</div>
                <div><strong>Transaction ID:</strong> ${transaction.id}</div>
              </div>

              <div class="footer">
                <p>Generated on ${new Date().toLocaleString()}</p>
                <p>Payment Management System</p>
              </div>
            </div>
          </body>
        </html>
      `;
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const printWithdrawal = (withdrawal: WithdrawalWithDriver) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Withdrawal Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .info { margin-bottom: 15px; }
              .info div { margin-bottom: 5px; }
              .amount { font-size: 24px; font-weight: bold; color: #ef4444; text-align: center; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h2>Withdrawal Receipt</h2>
                <hr style="margin: 10px 0;">
              </div>

              <div class="info">
                <div><strong>Date:</strong> ${new Date(withdrawal.withdrawal_date).toLocaleString()}</div>
                <div><strong>Driver:</strong> ${withdrawal.driver?.full_name || 'Unknown'}</div>
                <div><strong>Driver Phone:</strong> ${withdrawal.driver?.phone_number || 'N/A'}</div>
              </div>

              <div class="amount">-$${withdrawal.amount !== null ? withdrawal.amount.toFixed(2) : '0.00'}</div>

              <div class="info">
                <div><strong>Notes:</strong> ${withdrawal.notes || '-'}</div>
                <div><strong>Withdrawal ID:</strong> ${withdrawal.id}</div>
              </div>

              <div class="footer">
                <p>Generated on ${new Date().toLocaleString()}</p>
                <p>Payment Management System</p>
              </div>
            </div>
          </body>
        </html>
      `;
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const printDriverCard = (payment: PaymentWithDriver) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Driver Payment Card</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .info { margin-bottom: 15px; }
              .info div { margin-bottom: 5px; }
              .amount { font-size: 24px; font-weight: bold; text-align: center; margin: 10px 0; }
              .pending { color: #f97316; }
              .paid { color: #22c55e; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h2>Driver Payment Card</h2>
                <hr style="margin: 10px 0;">
              </div>

              <div class="info">
                <div><strong>Driver Name:</strong> ${payment.driver?.full_name || 'Unknown'}</div>
                <div><strong>Phone Number:</strong> ${payment.driver?.phone_number || 'N/A'}</div>
              </div>

              <div class="amount pending">
                <div><strong>Pending Amount:</strong></div>
                <div>$${payment.pending_amount !== null ? payment.pending_amount.toFixed(2) : '0.00'}</div>
              </div>

              <div class="amount paid">
                <div><strong>Paid Amount:</strong></div>
                <div>$${payment.paid_amount !== null ? payment.paid_amount.toFixed(2) : '0.00'}</div>
              </div>

              <div class="info">
                <div><strong>Card ID:</strong> ${payment.id || 'N/A'}</div>
                <div><strong>Driver ID:</strong> ${payment.driver_id}</div>
              </div>

              <div class="footer">
                <p>Generated on ${new Date().toLocaleString()}</p>
                <p>Payment Management System</p>
              </div>
            </div>
          </body>
        </html>
      `;
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-800 text-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center">
                <span className="font-bold">A</span>
              </div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
            </div>

            <div className="text-right">
              <div className="text-slate-300">
                {adminEmail}
              </div>
              <div className="text-slate-300 mt-1">
                Payments
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
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
                  {/* Show Pay and Withdraw buttons only when there is a pending amount to pay or withdraw */}
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

                  {/* Show action buttons */}
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
                    <button
                      onClick={() => printDriverCard(payment)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-xs flex items-center gap-1 print:hidden"
                    >
                      <Printer size={14} />
                      Print Card
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <SearchBar<TransactionWithDriver>
            items={transactions}
            placeholder="Search payment history by driver name..."
            searchFields={['driver.full_name', 'notes']}
            onSearch={setFilteredTransactions}
            className="max-w-md"
          />
        </div>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(filteredTransactions.length > 0 ? filteredTransactions : transactions).map((transaction) => (
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
                  <td className="px-6 py-4 text-sm print:hidden">
                    <button
                      onClick={() => printTransaction(transaction)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Printer size={16} />
                      Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New section for withdrawal history */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <SearchBar<WithdrawalWithDriver>
            items={withdrawals}
            placeholder="Search withdrawal history by driver name..."
            searchFields={['driver.full_name', 'notes']}
            onSearch={setFilteredWithdrawals}
            className="max-w-md"
          />
        </div>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(filteredWithdrawals.length > 0 ? filteredWithdrawals : withdrawals).map((withdrawal) => (
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
                  <td className="px-6 py-4 text-sm print:hidden">
                    <button
                      onClick={() => printWithdrawal(withdrawal)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Printer size={16} />
                      Print
                    </button>
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
              <p className="text-sm text-slate-600 mt-2">Current Paid Amount</p>
              <p className="text-2xl font-bold text-green-600">
                ${selectedDriver.paid_amount !== null ? selectedDriver.paid_amount.toFixed(2) : '0.00'}
              </p>
            </div>

            <form onSubmit={handleRecordWithdrawal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Amount to Driver ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  max={selectedDriver.paid_amount || 0}
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
                  disabled={!withdrawalAmount || parseFloat(withdrawalAmount) <= 0 || parseFloat(withdrawalAmount) > (selectedDriver.paid_amount || 0)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    !withdrawalAmount || parseFloat(withdrawalAmount) <= 0 || parseFloat(withdrawalAmount) > (selectedDriver.paid_amount || 0)
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
