import api from "./api";

export type PublicPaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED" | "CANCELLED";

export interface PublicPayment {
  id: string;
  customerName: string;
  amount: string;
  description: string | null;
  status: PublicPaymentStatus;
  expiresAt: string | null;
  paidAt: string | null;
  merchantName: string;
}

export const getPublicPayment = async (paymentId: string) => {
  const response = await api.get<PublicPayment>(`/public/payments/${paymentId}`);
  return response.data;
};

export const completePublicPayment = async (paymentId: string) => {
  const response = await api.post<{ id: string; status: "SUCCESS"; paidAt: string }>(
    `/public/payments/${paymentId}/complete`,
  );
  return response.data;
};
