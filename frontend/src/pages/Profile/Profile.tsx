import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCopy,
  FiCreditCard,
  FiExternalLink,
  FiInbox,
  FiLogOut,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import {
  getCurrentMerchant,
  logoutMerchant,
} from "../../services/auth.service";
import {
  createPayment,
  getAllPayments,
  type CreatedPayment,
  type CreatePaymentDto,
  type MerchantPayment,
} from "../../services/payments.service";
import { createRefund } from "../../services/refunds.service";

type MerchantProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

const initialPaymentForm: CreatePaymentDto = {
  customerName: "",
  email: "",
  phone: "",
  amount: 0,
  description: "",
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

/** Sum of successful refunds already issued against a payment. */
const getRefundedAmount = (payment: MerchantPayment) =>
  payment.refunds
    .filter((refund) => refund.status !== "FAILED")
    .reduce((sum, refund) => sum + Number(refund.amount), 0);

const getRemainingAmount = (payment: MerchantPayment) =>
  Math.max(Number(payment.amount) - getRefundedAmount(payment), 0);

/** A payment can be refunded once it has succeeded and isn't fully refunded yet. */
const isRefundEligible = (payment: MerchantPayment) =>
  payment.status === "SUCCESS" && getRemainingAmount(payment) > 0.004;

function Profile() {
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] =
    useState<CreatePaymentDto>(initialPaymentForm);
  const [paymentError, setPaymentError] = useState("");
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [createdPayment, setCreatedPayment] = useState<CreatedPayment | null>(null);
  const [copied, setCopied] = useState(false);
  const [payments, setPayments] = useState<MerchantPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState("");
  const [refundTarget, setRefundTarget] = useState<MerchantPayment | null>(null);
  const [refundPercentage, setRefundPercentage] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [showRefundedPayments, setShowRefundedPayments] = useState(false);
  const navigate = useNavigate();

  const loadProfile = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await getCurrentMerchant();
      setMerchant(data);
    } catch {
      setError("Please sign in again to view your profile.");
      setMerchant(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutMerchant();
    navigate("/login");
  };

  const handleLogin = async() => {
    navigate('/login')
  }

  const loadPayments = async () => {
    setPaymentsError("");
    setPaymentsLoading(true);

    try {
      const data = await getAllPayments();
      // Sort payments by creation date in descending order (most recent first)
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPayments(data);
    } catch {
      setPaymentsError("Unable to load your payment history. Please refresh and try again.");
    } finally {
      setPaymentsLoading(false);
    }
  };

  const refreshDashboard = () => {
    void loadProfile();
    void loadPayments();
  };

  const updatePaymentField = <K extends keyof CreatePaymentDto>(
    field: K,
    value: CreatePaymentDto[K],
  ) => {
    setPaymentForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreatePayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentError("");
    setCreatedPayment(null);

    const payload: CreatePaymentDto = {
      customerName: paymentForm.customerName.trim(),
      amount: Number(paymentForm.amount),
      ...(paymentForm.email?.trim()
        ? { email: paymentForm.email.trim() }
        : {}),
      ...(paymentForm.phone?.trim()
        ? { phone: paymentForm.phone.trim() }
        : {}),
      ...(paymentForm.description?.trim()
        ? { description: paymentForm.description.trim() }
        : {}),
    };

    if (!payload.email && !payload.phone) {
      setPaymentError("Enter either the customer's email address or mobile number.");
      return;
    }

    if (!payload.customerName || !Number.isFinite(payload.amount) || payload.amount <= 0) {
      setPaymentError("Enter a customer name and a payment amount greater than zero.");
      return;
    }

    setCreatingPayment(true);
    try {
      const result = await createPayment(payload);
      setCreatedPayment(result);
      setPaymentForm(initialPaymentForm);
      void loadPayments();
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const message = requestError.response?.data?.message;
        setPaymentError(
          Array.isArray(message)
            ? message.join(" ")
            : message ?? "Unable to create the payment. Please try again.",
        );
      } else {
        setPaymentError("Unable to create the payment. Please try again.");
      }
    } finally {
      setCreatingPayment(false);
    }
  };

  const copyPaymentUrl = async () => {
    if (!createdPayment) return;

    await navigator.clipboard.writeText(createdPayment.paymentUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const openRefundModal = (payment: MerchantPayment) => {
    setRefundTarget(payment);
    setRefundPercentage("");
    setRefundReason("");
    setRefundError("");
  };

  const closeRefundModal = () => {
    setRefundTarget(null);
  };

  const handleRefundSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!refundTarget) return;
    setRefundError("");

    const percentage = Number(refundPercentage);
    const remainingAmount = getRemainingAmount(refundTarget);
    const remainingPercentage = (remainingAmount / Number(refundTarget.amount)) * 100;

    if (!Number.isFinite(percentage) || percentage <= 0) {
      setRefundError("Enter a refund percentage greater than zero.");
      return;
    }
    if (percentage > 100) {
      setRefundError("Refund percentage cannot exceed 100%.");
      return;
    }
    // Small epsilon to tolerate rounding when a customer refunds "the rest".
    if (percentage - remainingPercentage > 0.01) {
      setRefundError(
        `This would refund ${currency((Number(refundTarget.amount) * percentage) / 100)}, but only ${currency(remainingAmount)} (${remainingPercentage.toFixed(2)}%) remains refundable. The refund amount cannot exceed the payment amount.`,
      );
      return;
    }

    setRefundSubmitting(true);
    try {
      await createRefund(refundTarget.id, {
        percentage,
        reason: refundReason.trim() || undefined,
      });
      closeRefundModal();
      void loadPayments();
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const message = requestError.response?.data?.message;
        setRefundError(
          Array.isArray(message)
            ? message.join(" ")
            : message ?? "Unable to process the refund. Please try again.",
        );
      } else {
        setRefundError("Unable to process the refund. Please try again.");
      }
    } finally {
      setRefundSubmitting(false);
    }
  };

  useEffect(() => {
    void loadProfile();
    void loadPayments();
  }, []);

  const paymentStatusClass = (status: MerchantPayment["status"]) => {
    if (status === "SUCCESS") return "bg-emerald-100 text-emerald-700";
    if (status === "FAILED" || status === "CANCELLED") return "bg-red-100 text-red-700";
    if (status === "EXPIRED") return "bg-amber-100 text-amber-700";
    return "bg-blue-100 text-blue-700";
  };

  const refundedPayments = useMemo(
    () => payments.filter((payment) => getRefundedAmount(payment) > 0),
    [payments],
  );
  const totalRefunded = refundedPayments.reduce(
    (sum, payment) => sum + getRefundedAmount(payment),
    0,
  );

  const totalPaymentsCount = payments.length;
  const grossRevenue = payments
    .filter((payment) => payment.status === "SUCCESS")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const netRevenue = Math.max(grossRevenue - totalRefunded, 0);

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Merchant Account</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">
              Profile
            </h1>
          </div>

          <div className="flex gap-2">
            {merchant && (
              <button
                type="button"
                onClick={() => {
                  setShowPaymentForm((visible) => !visible);
                  setPaymentError("");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                {showPaymentForm ? <FiX /> : <FiPlus />}
                {showPaymentForm ? "Close form" : "Create payment"}
              </button>
            )}
            <button
              type="button"
              onClick={refreshDashboard}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-blue-400 hover:text-blue-700"
            >
              <FiRefreshCw />
              Refresh
            </button>
            {merchant!=null ? (<button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              <FiLogOut />
              Logout
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              <FiLogOut />
              Login
            </button>
          )}
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {loading && <p className="text-sm text-slate-500">Loading profile...</p>}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {!loading && merchant && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Name</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{merchant.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{merchant.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Phone</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{merchant.phone}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Created</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {new Date(merchant.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </section>

        {merchant && showPaymentForm && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <FiCreditCard className="text-lg" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Create a payment link</h2>
                  <p className="text-sm text-slate-500">
                    Enter the customer details and send them a secure payment link.
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                INR payments
              </span>
            </div>

            <form onSubmit={handleCreatePayment} className="p-6 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Customer name</span>
                  <input
                    required
                    value={paymentForm.customerName}
                    onChange={(event) => updatePaymentField("customerName", event.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Email address <span className="font-normal text-slate-400">(one required)</span></span>
                  <input
                    type="email"
                    value={paymentForm.email}
                    onChange={(event) => updatePaymentField("email", event.target.value)}
                    placeholder="customer@example.com"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Mobile number <span className="font-normal text-slate-400">(one required)</span></span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={paymentForm.phone}
                    onChange={(event) => updatePaymentField("phone", event.target.value)}
                    placeholder="9876543210"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Amount (INR)</span>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentForm.amount || ""}
                    onChange={(event) => updatePaymentField("amount", Number(event.target.value))}
                    placeholder="0.00"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span></span>
                  <textarea
                    rows={3}
                    value={paymentForm.description}
                    onChange={(event) => updatePaymentField("description", event.target.value)}
                    placeholder="What is this payment for?"
                    className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>

              {paymentError && (
                <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {paymentError}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">Email or mobile number is required.</p>
                <button
                  type="submit"
                  disabled={creatingPayment}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  <FiCreditCard />
                  {creatingPayment ? "Creating payment..." : "Create payment link"}
                </button>
              </div>
            </form>
          </section>
        )}

        {createdPayment && (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="flex gap-3">
              <FiCheckCircle className="mt-0.5 shrink-0 text-xl text-emerald-600" />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-emerald-950">Payment link created</h2>
                <p className="mt-1 text-sm text-emerald-800">Share this link with your customer to continue with the payment.</p>
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-white p-3 sm:flex-row sm:items-center">
                  <a
                    href={createdPayment.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900"
                  >
                    {createdPayment.paymentUrl}
                  </a>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void copyPaymentUrl()}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-500"
                    >
                      <FiCopy /> {copied ? "Copied" : "Copy"}
                    </button>
                    <a
                      href={createdPayment.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Open <FiExternalLink />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {merchant && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Payments dashboard</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Recent payment links</h2>
                <p className="mt-1 text-sm text-slate-500">{payments.length} payment{payments.length === 1 ? "" : "s"} created</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {refundedPayments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRefundedPayments(true)}
                    className="inline-flex items-center gap-2 self-start rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 hover:border-purple-400"
                  >
                    <FiRotateCcw />
                    Refunded ({refundedPayments.length}) · {currency(totalRefunded)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void loadPayments()}
                  className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700"
                >
                  <FiRefreshCw className={paymentsLoading ? "animate-spin" : ""} />
                  Refresh payments
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <FiCreditCard className="text-base" />
                  <p className="text-xs font-medium uppercase tracking-wide">Total payments</p>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                  {totalPaymentsCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <FiTrendingUp className="text-base" />
                  <p className="text-xs font-medium uppercase tracking-wide">Total revenue</p>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-700">
                  {currency(netRevenue)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <FiRotateCcw className="text-base" />
                  <p className="text-xs font-medium uppercase tracking-wide">Total refunds</p>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-purple-700">
                  {currency(totalRefunded)}
                </p>
              </div>
            </div>

            {paymentsError && (
              <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {paymentsError}
              </p>
            )}

            {paymentsLoading ? (
              <div className="mt-6 space-y-3" aria-label="Loading payments">
                <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : !paymentsError && payments.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <FiInbox className="mx-auto text-3xl text-slate-400" />
                <h3 className="mt-3 font-semibold text-slate-800">No payment links yet</h3>
                <p className="mt-1 text-sm text-slate-500">Create your first payment link to see it here.</p>
              </div>
            ) : !paymentsError ? (
              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 font-medium">Link</th>
                      <th className="px-4 py-3 text-right font-medium">Refund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-sm">
                    {payments.map((payment) => {
                      const refundedAmount = getRefundedAmount(payment);
                      const refundedPercentage =
                        Number(payment.amount) > 0
                          ? (refundedAmount / Number(payment.amount)) * 100
                          : 0;
                      const fullyRefunded = getRemainingAmount(payment) <= 0.004 && refundedAmount > 0;

                      return (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-900">{payment.customerName}</p>
                            <p className="mt-0.5 max-w-48 truncate text-slate-500">{payment.email ?? payment.phone ?? "No contact"}</p>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {currency(Number(payment.amount))}
                            {refundedAmount > 0 && (
                              <p className="mt-0.5 text-xs font-semibold text-purple-600">
                                −{currency(refundedAmount)} refunded ({refundedPercentage.toFixed(0)}%)
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(payment.status)}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                            {new Date(payment.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-4">
                            {payment.paymentUrl ? (
                              <a
                                href={payment.paymentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-800"
                              >
                                Open <FiExternalLink />
                              </a>
                            ) : (
                              <span className="text-slate-400">Unavailable</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {isRefundEligible(payment) ? (
                              <button
                                type="button"
                                onClick={() => openRefundModal(payment)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:border-purple-400"
                              >
                                <FiRotateCcw /> Refund
                              </button>
                            ) : fullyRefunded ? (
                              <span className="text-xs font-semibold text-purple-600">Fully refunded</span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        )}

      </div>

      {refundTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="refund-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-7">
            {(() => {
              const remainingAmount = getRemainingAmount(refundTarget);
              const refundedAmount = getRefundedAmount(refundTarget);
              const remainingPercentage =
                (remainingAmount / Number(refundTarget.amount)) * 100;
              const previewAmount = Number(refundPercentage) > 0
                ? (Number(refundTarget.amount) * Number(refundPercentage)) / 100
                : 0;

              return (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Issue a refund</p>
                      <h2 id="refund-modal-title" className="mt-1 text-lg font-semibold text-slate-900">
                        {refundTarget.customerName}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={closeRefundModal}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Close"
                    >
                      <FiX />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Payment amount</p>
                      <p className="mt-1 font-semibold text-slate-900">{currency(Number(refundTarget.amount))}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Already refunded</p>
                      <p className="mt-1 font-semibold text-slate-900">{currency(refundedAmount)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-semibold uppercase text-slate-400">Max refundable now</p>
                      <p className="mt-1 font-semibold text-emerald-600">
                        {currency(remainingAmount)} ({remainingPercentage.toFixed(2)}%)
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleRefundSubmit} className="mt-5">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Refund percentage of payment</span>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min="0.01"
                          max={100}
                          step="0.01"
                          value={refundPercentage}
                          onChange={(event) => setRefundPercentage(event.target.value)}
                          placeholder="e.g. 50"
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                        />
                        <span className="font-semibold text-slate-500">%</span>
                      </div>
                    </label>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {[25, 50, 100].map((preset) => {
                        const presetValue = Math.min(preset, remainingPercentage);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setRefundPercentage(presetValue.toFixed(2))}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-purple-400 hover:text-purple-700"
                          >
                            {preset === 100 ? "Refund remaining" : `${preset}%`}
                          </button>
                        );
                      })}
                    </div>

                    {previewAmount > 0 && (
                      <p className="mt-3 text-sm text-slate-500">
                        This will refund <span className="font-semibold text-slate-800">{currency(previewAmount)}</span>.
                      </p>
                    )}

                    <label className="mt-4 block">
                      <span className="text-sm font-medium text-slate-700">
                        Reason <span className="font-normal text-slate-400">(optional)</span>
                      </span>
                      <input
                        value={refundReason}
                        onChange={(event) => setRefundReason(event.target.value)}
                        placeholder="e.g. Customer requested cancellation"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                      />
                    </label>

                    {refundError && (
                      <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                        <FiAlertTriangle className="mt-0.5 shrink-0" /> {refundError}
                      </p>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeRefundModal}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={refundSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                      >
                        <FiRotateCcw /> {refundSubmitting ? "Processing…" : "Confirm refund"}
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {showRefundedPayments && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="refunded-payments-title"
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Refund history</p>
                <h2 id="refunded-payments-title" className="mt-1 text-lg font-semibold text-slate-900">
                  Refunded payments
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {refundedPayments.length} payment{refundedPayments.length === 1 ? "" : "s"} ·{" "}
                  {currency(totalRefunded)} refunded in total
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRefundedPayments(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              {refundedPayments.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">No refunds have been issued yet.</p>
              ) : (
                <div className="space-y-4">
                  {refundedPayments.map((payment) => {
                    const refundedAmount = getRefundedAmount(payment);
                    const refundedPercentage =
                      Number(payment.amount) > 0 ? (refundedAmount / Number(payment.amount)) * 100 : 0;
                    const fullyRefunded = getRemainingAmount(payment) <= 0.004;

                    return (
                      <div key={payment.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{payment.customerName}</p>
                            <p className="text-sm text-slate-500">
                              {payment.email ?? payment.phone ?? "No contact"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              fullyRefunded
                                ? "bg-purple-100 text-purple-700"
                                : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {fullyRefunded ? "Fully refunded" : `Partially refunded (${refundedPercentage.toFixed(0)}%)`}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-400">Payment</p>
                            <p className="mt-0.5 font-semibold text-slate-900">{currency(Number(payment.amount))}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-400">Refunded</p>
                            <p className="mt-0.5 font-semibold text-purple-600">{currency(refundedAmount)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-400">Remaining</p>
                            <p className="mt-0.5 font-semibold text-slate-900">
                              {currency(getRemainingAmount(payment))}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {payment.refunds.map((refund) => (
                            <div
                              key={refund.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <FiRotateCcw className="text-purple-500" />
                                <span className="font-semibold text-slate-800">
                                  {currency(Number(refund.amount))}
                                </span>
                                {refund.reason && (
                                  <span className="text-slate-500">— {refund.reason}</span>
                                )}
                              </div>
                              <span className="whitespace-nowrap text-xs text-slate-400">
                                {new Date(refund.createdAt).toLocaleString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          ))}
                        </div>

                        {isRefundEligible(payment) && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowRefundedPayments(false);
                              openRefundModal(payment);
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900"
                          >
                            <FiRotateCcw /> Refund more
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
