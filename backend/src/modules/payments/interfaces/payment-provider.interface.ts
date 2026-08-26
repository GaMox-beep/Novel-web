export interface CreatePaymentUrlParams {
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  ipAddress?: string;
  returnUrl?: string;
  notifyUrl?: string;
  extraData?: string;
  requestType?: string;
}

export interface PaymentUrlResult {
  payUrl: string;
  orderId: string;
  requestId: string;
  rawResponse?: unknown;
}

export interface CallbackVerificationResult {
  isValid: boolean;
  isPaid: boolean;
  orderId: string;
  transId: string;
  amount: number;
  message?: string;
}

export interface QueryTransactionResult {
  isPaid: boolean;
  orderId: string;
  transId: string;
  amount: number;
  message: string;
  rawResponse?: unknown;
}

export interface IPaymentProvider {
  createPaymentUrl(params: CreatePaymentUrlParams): Promise<PaymentUrlResult>;
  verifyCallback(payload: Record<string, unknown>): CallbackVerificationResult;
  queryTransactionStatus(
    orderId: string,
    requestId: string,
  ): Promise<QueryTransactionResult>;
}
