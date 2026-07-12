import axios from "axios";
import { useEffect, useState } from "react";
import { FiCheckCircle, FiCreditCard, FiLock, FiShield, FiSmartphone } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import {
  completePublicPayment,
  getPublicPayment,
  type PublicPayment,
} from "../../services/public-payments.service";

const formatAmount = (amount: string) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(amount));

function Pay() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<PublicPayment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<"UPI" | "CARD">("UPI");

  useEffect(() => {
    if (!paymentId) return;
    getPublicPayment(paymentId)
      .then(setPayment)
      .catch((requestError) => {
        const message = axios.isAxiosError(requestError)
          ? requestError.response?.data?.message
          : null;
        setError(Array.isArray(message) ? message.join(" ") : message ?? "Unable to open this payment link.");
      })
      .finally(() => setLoading(false));
  }, [paymentId]);

  useEffect(() => {
    if (payment?.status !== "SUCCESS") return;

    const redirectTimer = window.setTimeout(() => navigate("/profile"), 10000);
    return () => window.clearTimeout(redirectTimer);
  }, [navigate, payment?.status]);

  const payNow = async () => {
    if (!paymentId) return;
    setPaying(true);
    setError("");
    try {
      const result = await completePublicPayment(paymentId);
      setPayment((current) => current ? { ...current, status: result.status, paidAt: result.paidAt } : current);
    } catch (requestError) {
      const message = axios.isAxiosError(requestError) ? requestError.response?.data?.message : null;
      setError(Array.isArray(message) ? message.join(" ") : message ?? "Payment could not be completed.");
    } finally {
      setPaying(false);
    }
  };

  const paid = payment?.status === "SUCCESS";
  const payable = payment?.status === "PENDING";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-300/60">
        <header className="bg-gradient-to-r from-blue-700 to-indigo-700 px-7 py-7 text-white">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-white/15 p-2.5"><FiShield /></span><span className="font-bold">PayPortal</span></div>
          <p className="mt-7 text-sm text-blue-100">Payment requested by</p>
          <h1 className="mt-1 text-2xl font-extrabold">{payment?.merchantName ?? "Merchant"}</h1>
        </header>

        <div className="p-7">
          {loading && <p className="py-12 text-center text-slate-500">Loading secure payment link…</p>}
          {!loading && error && !payment && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-center font-medium text-red-700">{error}</p>}
          {!loading && payment && (
            <>
              {paid ? (
                <div className="py-8 text-center"><FiCheckCircle className="mx-auto text-6xl text-emerald-500" /><h2 className="mt-5 text-2xl font-extrabold text-slate-900">Payment successful</h2><p className="mt-2 text-slate-500">Your payment to {payment.merchantName} is complete.</p><p className="mt-6 text-2xl font-bold text-slate-900">{formatAmount(payment.amount)}</p><p className="mt-5 text-sm text-slate-500">Returning to dashboard…</p><button type="button" onClick={() => navigate("/profile")} className="mt-3 font-semibold text-blue-600 hover:text-blue-800">Go to dashboard now</button></div>
              ) : (
                <>
                  <div className="border-b border-slate-100 pb-6"><p className="text-sm font-semibold text-slate-500">AMOUNT TO PAY</p><p className="mt-1 text-4xl font-extrabold text-slate-900">{formatAmount(payment.amount)}</p>{payment.description && <p className="mt-4 text-sm text-slate-600">{payment.description}</p>}<p className="mt-3 text-sm text-slate-500">For {payment.customerName}</p></div>
                  {payable ? <><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={() => setMethod("UPI")} className={`rounded-xl border p-3 text-sm font-bold ${method === "UPI" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}><FiSmartphone className="mx-auto mb-1" />UPI</button><button onClick={() => setMethod("CARD")} className={`rounded-xl border p-3 text-sm font-bold ${method === "CARD" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}><FiCreditCard className="mx-auto mb-1" />Card</button></div><button type="button" onClick={() => void payNow()} disabled={paying} className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:bg-blue-300">{paying ? "Processing…" : `Pay ${formatAmount(payment.amount)}`}</button><p className="mt-3 text-center text-xs text-slate-400">Demo checkout — no payment details are collected.</p></> : <div className="mt-6 rounded-xl bg-amber-50 p-4 text-center font-medium text-amber-800">This payment link is {payment.status.toLowerCase()} and cannot be paid.</div>}
                  {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
                </>
              )}
            </>
          )}
          <p className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400"><FiLock /> Secured payment link</p>
        </div>
      </div>
    </main>
  );
}

export default Pay;
