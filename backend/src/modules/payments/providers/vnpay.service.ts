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

interface VnpayQueryResponse {
  vnp_ResponseCode?: string;
  vnp_TransactionStatus?: string;
  vnp_TransactionNo?: string;
  vnp_Amount?: number | string;
  vnp_Message?: string;
}

function toStr(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return '';
}

@Injectable()
export class VnpayService implements IPaymentProvider {
  private readonly logger = new Logger(VnpayService.name);

  private readonly tmnCode = process.env.VNPAY_TMN_CODE || 'CGXZLS0Z';
  private readonly hashSecret =
    process.env.VNPAY_HASH_SECRET || 'RAOCTXGU2JRWGJSQSMEDAHA3M0TNO29T';
  private readonly apiUrl =
    process.env.VNPAY_API_URL ||
    'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  private readonly queryUrl =
    process.env.VNPAY_QUERY_URL ||
    'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
  private readonly defaultReturnUrl =
    process.env.VNPAY_RETURN_URL || 'http://localhost:5173/nap/ket-qua';

  /**
   * Helper: Format Date to YYYYMMDDHHmmss (Vietnam GMT+7)
   */
  private formatVnpayDate(date: Date = new Date()): string {
    const vnDate = new Date(
      date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
    );
    const yyyy = vnDate.getFullYear();
    const MM = String(vnDate.getMonth() + 1).padStart(2, '0');
    const dd = String(vnDate.getDate()).padStart(2, '0');
    const HH = String(vnDate.getHours()).padStart(2, '0');
    const mm = String(vnDate.getMinutes()).padStart(2, '0');
    const ss = String(vnDate.getSeconds()).padStart(2, '0');
    return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
  }

  /**
   * Helper: Chuyển chuỗi tiếng Việt có dấu sang không dấu để chữ ký VNPay luôn khớp tuyệt đối
   */
  private sanitizeOrderInfo(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Sắp xếp object theo thứ tự A-Z chuẩn thuật toán VNPay
   */
  private sortObject(
    obj: Record<string, string | number>,
  ): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys: string[] = [];

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        keys.push(encodeURIComponent(key));
      }
    }

    keys.sort();

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const val = obj[key];
      if (val !== '' && val !== undefined && val !== null) {
        sorted[key] = encodeURIComponent(String(val)).replace(/%20/g, '+');
      }
    }

    return sorted;
  }

  /**
   * Tạo URL thanh toán VNPay Gateway v2.1.0 với HMAC-SHA512
   */
  createPaymentUrl(params: CreatePaymentUrlParams): Promise<PaymentUrlResult> {
    const {
      orderId,
      amount,
      orderInfo,
      ipAddress = '127.0.0.1',
      returnUrl = this.defaultReturnUrl,
      requestId,
    } = params;

    const createDate = this.formatVnpayDate();
    const vnpAmount = Math.round(amount * 100);
    const cleanOrderInfo =
      this.sanitizeOrderInfo(orderInfo) || `Nap don ${orderId}`;

    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: cleanOrderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: vnpAmount,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddress,
      vnp_CreateDate: createDate,
    };

    const sortedParams = this.sortObject(vnpParams);

    const signData = Object.entries(sortedParams)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    const secureHash = crypto
      .createHmac('sha512', this.hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    const payUrl = `${this.apiUrl}?${signData}&vnp_SecureHash=${secureHash}`;

    this.logger.log(
      `Generated VNPay Payment URL for orderId: ${orderId}, amount: ${amount}`,
    );

    return Promise.resolve({
      payUrl,
      orderId,
      requestId,
    });
  }

  /**
   * Xác thực chữ ký số HMAC-SHA512 và parse kết quả giao dịch từ VNPay Callback/IPN
   */
  verifyCallback(payload: Record<string, unknown>): CallbackVerificationResult {
    try {
      const secureHash = toStr(payload['vnp_SecureHash']);
      const orderId = toStr(payload['vnp_TxnRef']);
      const transId = toStr(payload['vnp_TransactionNo']);
      const vnpAmount = payload['vnp_Amount']
        ? Number(payload['vnp_Amount']) / 100
        : 0;

      if (!secureHash) {
        return {
          isValid: false,
          isPaid: false,
          orderId,
          transId,
          amount: vnpAmount,
          message: 'Missing VNPay signature',
        };
      }

      const vnpParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(payload)) {
        if (
          key.startsWith('vnp_') &&
          key !== 'vnp_SecureHash' &&
          key !== 'vnp_SecureHashType'
        ) {
          const strVal = toStr(value);
          if (strVal !== '') {
            vnpParams[key] = strVal;
          }
        }
      }

      const sortedParams = this.sortObject(vnpParams);

      const signData = Object.entries(sortedParams)
        .map(([key, val]) => `${key}=${val}`)
        .join('&');

      const expectedHash = crypto
        .createHmac('sha512', this.hashSecret)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');

      const expectedBuf = Buffer.from(expectedHash.toLowerCase(), 'utf8');
      const actualBuf = Buffer.from(secureHash.toLowerCase(), 'utf8');

      const isValid =
        expectedBuf.length === actualBuf.length &&
        crypto.timingSafeEqual(expectedBuf, actualBuf);

      const isSuccess =
        payload['vnp_ResponseCode'] === '00' &&
        (payload['vnp_TransactionStatus'] === undefined ||
          payload['vnp_TransactionStatus'] === '00');

      return {
        isValid,
        isPaid: isValid && isSuccess,
        orderId,
        transId,
        amount: vnpAmount,
        message: isSuccess
          ? 'Thành công'
          : `Lỗi mã ${toStr(payload['vnp_ResponseCode'])}`,
      };
    } catch (err) {
      this.logger.error('Error verifying VNPay signature', err);
      return {
        isValid: false,
        isPaid: false,
        orderId: toStr(payload['vnp_TxnRef']),
        transId: toStr(payload['vnp_TransactionNo']),
        amount: Number(payload['vnp_Amount'] ?? 0) / 100,
        message: 'Verification exception',
      };
    }
  }

  /**
   * Truy vấn trạng thái giao dịch từ VNPay Server-to-Server
   */
  async queryTransactionStatus(
    orderId: string,
    requestId: string,
  ): Promise<QueryTransactionResult> {
    const vnpVersion = '2.1.0';
    const vnpCommand = 'querydr';
    const createDate = this.formatVnpayDate();
    const orderInfo = `Truy van don hang ${orderId}`;
    const ipAddress = '127.0.0.1';

    const transactionDate = createDate;
    const rawData = `${requestId}|${vnpVersion}|${vnpCommand}|${this.tmnCode}|${orderId}|${transactionDate}|${createDate}|${ipAddress}|${orderInfo}`;

    const secureHash = crypto
      .createHmac('sha512', this.hashSecret)
      .update(Buffer.from(rawData, 'utf-8'))
      .digest('hex');

    const requestBody = {
      vnp_RequestId: requestId,
      vnp_Version: vnpVersion,
      vnp_Command: vnpCommand,
      vnp_TmnCode: this.tmnCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_TransactionDate: transactionDate,
      vnp_CreateDate: createDate,
      vnp_IpAddr: ipAddress,
      vnp_SecureHash: secureHash,
    };

    try {
      this.logger.log(
        `Querying VNPay transaction status for orderId: ${orderId}`,
      );
      const response = await fetch(this.queryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as VnpayQueryResponse;
      this.logger.log(
        `VNPay query response for ${orderId}: ResponseCode=${data.vnp_ResponseCode ?? ''}, TransactionStatus=${data.vnp_TransactionStatus ?? ''}`,
      );

      const isPaid =
        data.vnp_ResponseCode === '00' && data.vnp_TransactionStatus === '00';
      const amount = data.vnp_Amount ? Number(data.vnp_Amount) / 100 : 0;

      return {
        isPaid,
        orderId,
        transId: data.vnp_TransactionNo || '',
        amount,
        message: data.vnp_Message || data.vnp_ResponseCode || 'Query completed',
        rawResponse: data,
      };
    } catch (error) {
      this.logger.error(`Failed to query VNPay status for ${orderId}`, error);
      throw new InternalServerErrorException(
        'Lỗi khi truy vấn trạng thái giao dịch từ VNPay',
      );
    }
  }
}
