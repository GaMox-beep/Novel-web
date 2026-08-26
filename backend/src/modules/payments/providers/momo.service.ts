import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type {
  IPaymentProvider,
  CreatePaymentUrlParams,
  PaymentUrlResult,
  CallbackVerificationResult,
  QueryTransactionResult,
} from '../interfaces/payment-provider.interface';

export interface MomoCreatePaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

export interface MomoQueryResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  extraData: string;
  amount: number;
  transId: number | string;
  payType: string;
  resultCode: number;
  message: string;
  responseTime: number;
}

function toStr(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return '';
}

@Injectable()
export class MomoService implements IPaymentProvider {
  private readonly logger = new Logger(MomoService.name);

  private readonly partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
  private readonly accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
  private readonly secretKey =
    process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
  private readonly apiEndpoint =
    process.env.MOMO_API_ENDPOINT ||
    'https://test-payment.momo.vn/v2/gateway/api/create';
  private readonly queryEndpoint =
    process.env.MOMO_QUERY_ENDPOINT ||
    'https://test-payment.momo.vn/v2/gateway/api/query';
  private readonly defaultReturnUrl =
    process.env.MOMO_RETURN_URL || 'http://localhost:5173/nap/ket-qua';
  private readonly defaultNotifyUrl =
    process.env.MOMO_NOTIFY_URL ||
    'http://localhost:3000/api/payments/momo/ipn';
  private readonly defaultRequestType =
    process.env.MOMO_REQUEST_TYPE || 'payWithATM';

  /**
   * Tạo Payment URL từ MoMo Gateway API v2
   */
  async createPaymentUrl(
    params: CreatePaymentUrlParams,
  ): Promise<PaymentUrlResult> {
    const {
      orderId,
      requestId,
      amount,
      orderInfo,
      returnUrl = this.defaultReturnUrl,
      notifyUrl = this.defaultNotifyUrl,
      extraData = '',
      requestType = this.defaultRequestType,
    } = params;

    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.partnerCode,
      partnerName: 'WebNovel',
      storeId: 'WebNovelStore',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl: notifyUrl,
      lang: 'vi',
      extraData,
      requestType,
      signature,
    };

    try {
      this.logger.log(
        `Sending MoMo create payment request for orderId: ${orderId}, amount: ${amount}`,
      );
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as MomoCreatePaymentResponse;

      if (data.resultCode !== 0) {
        this.logger.error(
          `MoMo create payment failed: ${data.message} (code ${data.resultCode})`,
        );
        throw new InternalServerErrorException(
          `MoMo Error: ${data.message} (resultCode: ${data.resultCode})`,
        );
      }

      if (!data.payUrl) {
        throw new InternalServerErrorException(
          'MoMo không trả về payUrl hợp lệ',
        );
      }

      return {
        payUrl: data.payUrl,
        orderId: data.orderId,
        requestId: data.requestId,
        rawResponse: data,
      };
    } catch (error) {
      this.logger.error('Error contacting MoMo API', error);
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể kết nối đến cổng thanh toán MoMo',
      );
    }
  }

  /**
   * Xác thực chữ ký số HMAC-SHA256 và parse kết quả giao dịch từ MoMo Callback/IPN
   */
  verifyCallback(payload: Record<string, unknown>): CallbackVerificationResult {
    try {
      const amount = Number(payload['amount'] ?? 0);
      const extraData = toStr(payload['extraData']);
      const message = toStr(payload['message']);
      const orderId = toStr(payload['orderId']);
      const orderInfo = toStr(payload['orderInfo']);
      const orderType = toStr(payload['orderType']);
      const partnerCode = toStr(payload['partnerCode']);
      const payType = toStr(payload['payType']);
      const requestId = toStr(payload['requestId']);
      const responseTime = Number(payload['responseTime'] ?? 0);
      const resultCode = toStr(payload['resultCode']);
      const transId = toStr(payload['transId']);
      const signature = toStr(payload['signature']);

      if (!signature) {
        return {
          isValid: false,
          isPaid: false,
          orderId,
          transId,
          amount,
          message: 'Missing MoMo signature',
        };
      }

      const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(rawSignature)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const actualBuf = Buffer.from(signature, 'utf8');

      const isValid =
        expectedBuf.length === actualBuf.length &&
        crypto.timingSafeEqual(expectedBuf, actualBuf);

      const isPaid =
        isValid && (resultCode === '0' || Number(resultCode) === 0);

      return {
        isValid,
        isPaid,
        orderId,
        transId,
        amount,
        message: message || (isPaid ? 'Thành công' : 'Thất bại'),
      };
    } catch (err) {
      this.logger.error('Error verifying MoMo callback signature', err);
      return {
        isValid: false,
        isPaid: false,
        orderId: toStr(payload['orderId']),
        transId: toStr(payload['transId']),
        amount: Number(payload['amount'] ?? 0),
        message: 'Verification exception',
      };
    }
  }

  /**
   * Truy vấn trạng thái giao dịch từ máy chủ MoMo Server-to-Server
   */
  async queryTransactionStatus(
    orderId: string,
    requestId: string,
  ): Promise<QueryTransactionResult> {
    const rawSignature = `accessKey=${this.accessKey}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}`;

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.partnerCode,
      requestId,
      orderId,
      signature,
      lang: 'vi',
    };

    try {
      this.logger.log(
        `Querying MoMo transaction status for orderId: ${orderId}`,
      );
      const response = await fetch(this.queryEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as MomoQueryResponse;
      this.logger.log(
        `MoMo query response for orderId ${orderId}: resultCode=${data.resultCode}, message=${data.message}`,
      );

      return {
        isPaid: data.resultCode === 0,
        orderId: data.orderId,
        transId: String(data.transId),
        amount: data.amount,
        message: data.message,
        rawResponse: data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to query transaction status for ${orderId}`,
        error,
      );
      throw new InternalServerErrorException(
        'Lỗi khi truy vấn trạng thái giao dịch từ MoMo',
      );
    }
  }
}
