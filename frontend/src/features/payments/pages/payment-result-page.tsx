import { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { paths } from '../../../config/paths';
import { useVerifyPayment } from '../api/verify-payment';

export const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const orderId = searchParams.get('orderId') || searchParams.get('vnp_TxnRef');
  const queryParams = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );

  const { data, isLoading, isError, error } = useVerifyPayment(
    orderId,
    queryParams,
  );

  // Invalidate and immediately refetch user profile, coins & transactions when payment verifies
  useEffect(() => {
    if (data?.success) {
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      queryClient.refetchQueries({ queryKey: ['auth-user'] });
      queryClient.invalidateQueries({ queryKey: ['my-transactions'] });
      queryClient.refetchQueries({ queryKey: ['my-transactions'] });
    }
  }, [data?.success, queryClient]);

  const isSuccess = Boolean(data?.success);
  const transaction = data?.transaction;
  const statusMessage =
    data?.message ||
    (error instanceof Error ? error.message : 'Không thể xác thực giao dịch.');

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-8 shadow-sm text-center">
        {isLoading && (
          <div className="py-12 space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-3 border-[var(--border-color)] border-t-[var(--accent-gold)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Đang xác thực giao dịch...
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Hệ thống đang đối soát với cổng thanh toán, vui lòng chờ trong giây lát.
            </p>
          </div>
        )}

        {!isLoading && isSuccess && (
          <div className="py-4 space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Nạp Linh Thạch Thành Công!
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Linh Thạch đã được cộng trực tiếp vào tài khoản của bạn.
              </p>
            </div>

            {transaction && (
              <div className="bg-[var(--bg-surface-elevated)] rounded-xl p-4 text-xs space-y-2.5 text-left border border-[var(--border-color)]">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Mã đơn hàng:</span>
                  <span className="font-mono font-medium text-[var(--text-primary)]">
                    {transaction.orderId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Cổng thanh toán:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {transaction.paymentMethod === 'VNPAY' ? 'Cổng VNPay' : 'Ví MoMo'}
                  </span>
                </div>
                {transaction.transId && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Mã giao dịch:</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">
                      {transaction.transId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Số tiền thanh toán:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {transaction.amount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--border-color)]">
                  <span className="font-medium text-[var(--text-primary)]">
                    Linh Thạch nhận được:
                  </span>
                  <span className="font-bold text-sm text-[var(--accent-gold)]">
                    +{transaction.coins.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(paths.home.getHref())}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--accent-gold)] text-slate-900 font-semibold text-xs hover:brightness-105 transition-all cursor-pointer shadow-2xs"
              >
                Đọc truyện ngay
              </button>
              <button
                type="button"
                onClick={() => navigate(paths.payments.recharge.getHref())}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium text-xs hover:border-[var(--accent-gold)] transition-colors cursor-pointer"
              >
                Nạp thêm
              </button>
            </div>
          </div>
        )}

        {!isLoading && (!isSuccess || isError) && (
          <div className="py-4 space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Giao Dịch Thất Bại
              </h2>
              <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">
                {statusMessage || 'Thanh toán không hoàn tất hoặc đã bị hủy.'}
              </p>
            </div>

            {orderId && (
              <p className="text-2xs font-mono text-[var(--text-secondary)]">
                Mã đơn: {orderId}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(paths.payments.recharge.getHref())}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--accent-gold)] text-slate-900 font-semibold text-xs hover:brightness-105 transition-all cursor-pointer shadow-2xs"
              >
                Thử lại
              </button>
              <button
                type="button"
                onClick={() => navigate(paths.home.getHref())}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium text-xs hover:border-[var(--accent-gold)] transition-colors cursor-pointer"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResultPage;
