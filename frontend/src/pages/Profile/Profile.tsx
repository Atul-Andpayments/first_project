import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiCheckCircle,
  FiCopy,
  FiCreditCard,
  FiExternalLink,
  FiInbox,
  FiLogOut,
  FiPlus,
  FiRefreshCw,
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

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-blue-600">Merchant Account</p>
            <h1 className="mt-2 text-4xl font-extrabold text-slate-900">
              Profile
            </h1>
          </div>

          <div className="flex gap-3">
            {merchant && (
              <button
                type="button"
                onClick={() => {
                  setShowPaymentForm((visible) => !visible);
                  setPaymentError("");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                {showPaymentForm ? <FiX /> : <FiPlus />}
                {showPaymentForm ? "Close form" : "Create payment"}
              </button>
            )}
            <button
              type="button"
              onClick={refreshDashboard}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm hover:border-blue-500"
            >
              <FiRefreshCw />
              Refresh
            </button>
            {merchant!=null ? (<button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <FiLogOut />
              Logout
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <FiLogOut />
              Login
            </button>
          )}
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-white/70 bg-white p-8 shadow-xl">
          {loading && <p className="text-slate-600">Loading profile...</p>}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700">
              {error}
            </div>
          )}

          {!loading && merchant && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase text-slate-400">Name</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{merchant.name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-slate-400">Email</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{merchant.email}</p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-slate-400">Phone</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{merchant.phone}</p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-slate-400">Created</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {new Date(merchant.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </section>

        {merchant && showPaymentForm && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl">
            <div className="flex flex-col gap-4 bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-white/15 p-3">
                  <FiCreditCard className="text-xl" />
                </span>
                <div>
                  <h2 className="text-xl font-bold">Create a payment link</h2>
                  <p className="text-sm text-blue-100">
                    Enter the customer details and send them a secure payment link.
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                INR payments
              </span>
            </div>

            <form onSubmit={handleCreatePayment} className="p-6 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Customer name</span>
                  <input
                    required
                    value={paymentForm.customerName}
                    onChange={(event) => updatePaymentField("customerName", event.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Email address <span className="font-normal text-slate-400">(one required)</span></span>
                  <input
                    type="email"
                    value={paymentForm.email}
                    onChange={(event) => updatePaymentField("email", event.target.value)}
                    placeholder="customer@example.com"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Mobile number <span className="font-normal text-slate-400">(one required)</span></span>
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
                  <span className="text-sm font-semibold text-slate-700">Amount (INR)</span>
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
                  <span className="text-sm font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span></span>
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
                <h2 className="font-bold text-emerald-950">Payment link created</h2>
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
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-500"
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
          <section className="mt-8 rounded-2xl border border-white/70 bg-white p-6 shadow-xl sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Payments dashboard</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Recent payment links</h2>
                <p className="mt-1 text-sm text-slate-500">{payments.length} payment{payments.length === 1 ? "" : "s"} created</p>
              </div>
              <button
                type="button"
                onClick={() => void loadPayments()}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-700"
              >
                <FiRefreshCw className={paymentsLoading ? "animate-spin" : ""} />
                Refresh payments
              </button>
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
                <h3 className="mt-3 font-bold text-slate-800">No payment links yet</h3>
                <p className="mt-1 text-sm text-slate-500">Create your first payment link to see it here.</p>
              </div>
            ) : !paymentsError ? (
              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3 text-right font-semibold">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-sm">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{payment.customerName}</p>
                          <p className="mt-0.5 max-w-48 truncate text-slate-500">{payment.email ?? payment.phone ?? "No contact"}</p>
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 2,
                          }).format(Number(payment.amount))}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${paymentStatusClass(payment.status)}`}>
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
                        <td className="px-4 py-4 text-right">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        )}

      </div>
    </div>
  );
}

export default Profile;
