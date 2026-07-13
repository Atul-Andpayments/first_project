import api from "./api";
import type { Refund } from "./payments.service";

export interface CreateRefundDto {
  percentage: number;
  reason?: string;
}

export interface CreateRefundResult {
  refund: Refund;
  totalRefunded: string;
  remainingRefundable: string;
  fullyRefunded: boolean;
}

export const createRefund = async (paymentId: string, data: CreateRefundDto) => {
  const response = await api.post<CreateRefundResult>(
    `/payments/${paymentId}/refund`,
    data,
  );
  return response.data;
};

export const getRefunds = async (paymentId: string) => {
  const response = await api.get<Refund[]>(`/payments/${paymentId}/refunds`);
  return response.data;
};
