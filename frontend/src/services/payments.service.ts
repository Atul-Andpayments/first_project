import api from "./api";

export interface CreatePaymentDto {
  customerName: string;
  email?: string;
  phone?: string;
  amount: number;
  description?: string;
}

export interface CreatedPayment {
  paymentId: string;
  paymentUrl: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED" | "CANCELLED";
}

export interface Refund {
  id: string;
  amount: string;
  reason: string | null;
  status: "PENDING" | "SUCCESS" | "FAILED";
  paymentId: string;
  createdAt: string;
}

export interface MerchantPayment {
  id: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  amount: string;
  description: string | null;
  status: CreatedPayment["status"];
  paymentUrl: string | null;
  createdAt: string;
  refunds: Refund[];
}

export const createPayment = async (data: CreatePaymentDto) => {
  const response = await api.post<CreatedPayment>("/payments/create", data);
  return response.data;
};

export const getAllPayments = async () => {
  const response = await api.get<MerchantPayment[]>("/payments/all");
  return response.data;
};
