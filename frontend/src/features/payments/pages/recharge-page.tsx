import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { paths } from '../../../config/paths';
import { useGetRechargePackages } from '../api/get-packages';
import { useCreatePayment } from '../api/create-payment';
import { useGetMyTransactions } from '../api/get-my-transactions';
import { RechargePackageCard } from '../components/recharge-package-card';
import { PaymentMethodSelector } from '../components/payment-method-selector';
import { RechargeSummary } from '../components/recharge-summary';
import { RecentTransactionsTable } from '../components/recent-transactions-table';
import type { PaymentMethod } from '../types';

export const RechargePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data: packages, isLoading: isLoadingPackages } = useGetRechargePackages();
  const { data: transactionsData, isLoading: isLoadingTransactions } =
    useGetMyTransactions(1, 5);
  const createPaymentMutation = useCreatePayment();

  const [userSelectedPackageId, setUserSelectedPackageId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VNPAY');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultPackage =
    packages && packages.length > 0
      ? packages.length > 1
        ? packages[1]
        : packages[0]
      : null;

  const selectedPackage =
    (packages && userSelectedPackageId
      ? packages.find((p) => p.id === userSelectedPackageId)
      : null) || defaultPackage;

  const handlePayment = async () => {
    if (!isAuthenticated) {
      navigate(paths.auth.login.getHref(paths.payments.recharge.getHref()));
      return;
    }

    if (!selectedPackage) {
      setErrorMessage('Vui lòng chọn một gói nạp');
      return;
    }

    setErrorMessage(null);

    try {
      const res = await createPaymentMutation.mutateAsync({
        packageId: selectedPackage.id,
        paymentMethod,
      });

      if (res.payUrl) {
        window.location.href = res.payUrl;
      } else {
        setErrorMessage(`Không nhận được đường dẫn thanh toán từ cổng ${paymentMethod}`);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo giao dịch thanh toán';
      setErrorMessage(errorMsg);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header & Balance Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Nạp Linh Thạch
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Nạp Linh Thạch để mở khóa các chương truyện VIP và ủng hộ tác giả
          </p>
        </div>

        {isAuthenticated && user && (
          <div className="flex items-center gap-4 bg-[var(--bg-surface)] border border-[var(--border-color)] px-5 py-3.5 rounded-xl shadow-2xs">
            <div className="p-2.5 rounded-lg bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="8" />
                <line x1="12" y1="2" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="22" />
                <line x1="20" y1="12" x2="22" y2="12" />
                <line x1="2" y1="12" x2="4" y2="12" />
              </svg>
            </div>
            <div>
              <span className="text-xs text-[var(--text-secondary)] block">
                Số dư hiện tại
              </span>
              <span className="text-xl font-bold text-[var(--accent-gold)]">
                {(user.coins ?? 0).toLocaleString('vi-VN')}{' '}
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  Linh Thạch
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left 2 Cols: Package Grid & Payment Methods */}
        <div className="lg:col-span-2 space-y-8">
          {/* Packages */}
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
              1. Chọn gói Linh Thạch
            </h2>

            {isLoadingPackages ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-28 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packages?.map((pkg) => (
                  <RechargePackageCard
                    key={pkg.id}
                    pkg={pkg}
                    isSelected={selectedPackage?.id === pkg.id}
                    onSelect={(p) => setUserSelectedPackageId(p.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Payment Gateway Selector */}
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
              2. Chọn cổng thanh toán
            </h2>
            <PaymentMethodSelector
              paymentMethod={paymentMethod}
              onSelect={setPaymentMethod}
            />
          </div>
        </div>

        {/* Right Col: Summary Card */}
        <div className="lg:col-span-1">
          <RechargeSummary
            selectedPackage={selectedPackage}
            paymentMethod={paymentMethod}
            isPending={createPaymentMutation.isPending}
            errorMessage={errorMessage}
            onPayment={handlePayment}
          />
        </div>
      </div>

      {/* Bottom Section: Recent 5 Transactions */}
      {isAuthenticated && (
        <div className="mt-16 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Giao dịch gần đây
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                5 giao dịch nạp Linh Thạch mới nhất của bạn
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(paths.users.profile.getHref())}
              className="text-xs text-[var(--accent-gold)] hover:underline cursor-pointer font-medium"
            >
              Xem tất cả
            </button>
          </div>

          <RecentTransactionsTable
            transactions={transactionsData?.items || []}
            isLoading={isLoadingTransactions}
          />
        </div>
      )}
    </div>
  );
};

export default RechargePage;
