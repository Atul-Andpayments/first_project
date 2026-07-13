import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiCreditCard,
  FiHome,
  FiLock,
  FiShield,
  FiSmartphone,
  FiTruck,
  FiBriefcase,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import {
  completePublicPayment,
  getPublicPayment,
  type PublicPayment,
} from "../../services/public-payments.service";

const formatAmount = (amount: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount));

type Method = "UPI" | "CARD" | "NETBANKING" | "WALLET" | "COD";

const METHODS: { id: Method; label: string; icon: React.ReactNode }[] = [
  { id: "UPI", label: "UPI", icon: <FiSmartphone /> },
  { id: "CARD", label: "Debit / Credit Cards", icon: <FiCreditCard /> },
  { id: "NETBANKING", label: "Netbanking", icon: <FiHome /> },
  { id: "WALLET", label: "Wallets", icon: <FiBriefcase /> },
  { id: "COD", label: "Pay on Delivery", icon: <FiTruck /> },
];

/** A deterministic, purely decorative QR-code-shaped pattern — not scannable. */
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  let state = hash || 1;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function FakeQrCode({ seed, size = 176 }: { seed: string; size?: number }) {
  const grid = 21;
  const cell = size / grid;

  const modules = useMemo(() => {
    const rand = seededRandom(seed);
    const isFinder = (r: number, c: number) =>
      (r < 7 && c < 7) || (r < 7 && c >= grid - 7) || (r >= grid - 7 && c < 7);
    const cells: boolean[][] = [];
    for (let r = 0; r < grid; r += 1) {
      const row: boolean[] = [];
      for (let c = 0; c < grid; c += 1) {
        row.push(isFinder(r, c) ? false : rand() > 0.56);
      }
      cells.push(row);
    }
    return cells;
  }, [seed]);

  const finder = (top: number, left: number) => (
    <g transform={`translate(${left * cell}, ${top * cell})`}>
      <rect width={cell * 7} height={cell * 7} fill="#0f172a" />
      <rect x={cell} y={cell} width={cell * 5} height={cell * 5} fill="#fff" />
      <rect x={cell * 2} y={cell * 2} width={cell * 3} height={cell * 3} fill="#0f172a" />
    </g>
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Scan to pay QR code"
      className="rounded-lg bg-white"
    >
      <rect width={size} height={size} fill="#fff" />
      {modules.map((row, r) =>
        row.map(
          (on, c) =>
            on && (
              <rect
                key={`${r}-${c}`}
                x={c * cell}
                y={r * cell}
                width={cell}
                height={cell}
                fill="#0f172a"
              />
            ),
        ),
      )}
      {finder(0, 0)}
      {finder(0, grid - 7)}
      {finder(grid - 7, 0)}
      <rect
        x={size / 2 - size * 0.09}
        y={size / 2 - size * 0.09}
        width={size * 0.18}
        height={size * 0.18}
        rx={4}
        fill="#fff"
        stroke="#0f172a"
        strokeWidth={1.5}
      />
    </svg>
  );
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function Pay() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<PublicPayment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<Method>("UPI");
  const [secondsLeft, setSecondsLeft] = useState(2 * 60);

  useEffect(() => {
    if (!paymentId) return;
    getPublicPayment(paymentId)
      .then(setPayment)
      .catch((requestError) => {
        const message = axios.isAxiosError(requestError)
          ? requestError.response?.data?.message
          : null;
        setError(
          Array.isArray(message)
            ? message.join(" ")
            : message ?? "Unable to open this payment link.",
        );
      })
      .finally(() => setLoading(false));
      console.log(payment);
  }, [paymentId]);

  useEffect(() => {
    if (payment?.status !== "PENDING") return;
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [payment?.status]);

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
      setPayment((current) =>
        current ? { ...current, status: result.status, paidAt: result.paidAt } : current,
      );
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message
        : null;
      setError(
        Array.isArray(message) ? message.join(" ") : message ?? "Payment could not be completed.",
      );
    } finally {
      setPaying(false);
    }
  };

  const paid = payment?.status === "SUCCESS";
  const payable = payment?.status === "PENDING";

  return (
    <main className="min-h-screen bg-slate-200 px-0 py-0 sm:px-4 sm:py-10">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white shadow-2xl shadow-slate-400/40 sm:min-h-0 sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Go back"
          >
            <FiChevronLeft className="text-xl" />
          </button>
          <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
            {payment?.merchantName ?? "PayPortal"}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            100% Secured <FiShield />
          </span>
        </header>

        <div className="flex-1 px-4 pb-6 pt-4">
          {loading && <p className="py-12 text-center text-slate-500">Loading secure payment link…</p>}

          {!loading && error && !payment && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-center font-medium text-red-700">
              {error}
            </p>
          )}

          {!loading && payment && (
            <>
              {paid ? (
                <div className="py-8 text-center">
                  <FiCheckCircle className="mx-auto text-6xl text-emerald-500" />
                  <h2 className="mt-5 text-2xl font-extrabold text-slate-900">Payment successful</h2>
                  <p className="mt-2 text-slate-500">Your payment to {payment.merchantName} is complete.</p>
                  <p className="mt-6 text-2xl font-bold text-slate-900">{formatAmount(payment.amount)}</p>
                </div>
              ) : payable ? (
                <>
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-700">Payment options</p>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setMethod("UPI")}
                      className="flex w-full items-center justify-between bg-slate-50 px-4 py-3"
                    >
                      <span className="flex items-center gap-2 font-bold text-slate-800">
                        <FiSmartphone /> UPI
                      </span>
                      <FiChevronRight className={`text-slate-400 transition ${method === "UPI" ? "rotate-90" : ""}`} />
                    </button>

                    {method === "UPI" && (
                      <div className="flex flex-col items-center gap-3 border-t border-slate-100 px-4 py-6">
                        <FakeQrCode seed={payment.id} />
                        <p className="text-2xl font-extrabold text-slate-900">{formatAmount(payment.amount)}</p>
                        <p className="text-center text-sm text-slate-500">{payment.customerName}</p>
                        
                        <p className="text-center text-sm text-slate-500">Scan the QR using any UPI app</p>
                        <p className="text-xs font-semibold text-amber-600">
                          QR valid for {formatTimer(secondsLeft)} mins
                        </p>
                        <p className="mt-1 text-center text-[11px] text-slate-400">
                          Mock QR for demo purposes — use the button below to simulate approval.
                        </p>
                      </div>
                    )}

                    {METHODS.filter((m) => m.id !== "UPI").map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={`flex w-full items-center justify-between border-t border-slate-100 px-4 py-3.5 text-left ${
                          method === m.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2 font-semibold text-slate-700">
                          {m.icon} {m.label}
                        </span>
                        <span className="flex items-center gap-1 text-sm font-semibold text-slate-500">
                          {formatAmount(payment.amount)} <FiChevronRight />
                        </span>
                      </button>
                    ))}
                  </div>

                  {error && (
                    <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                      {error}
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-6 rounded-xl bg-amber-50 p-4 text-center font-medium text-amber-800">
                  This payment link is {payment.status.toLowerCase()} and cannot be paid.
                </div>
              )}
            </>
          )}
        </div>

        {!loading && payment && payable && (
          <div className="border-t border-slate-100 px-4 py-4">
            <button
              type="button"
              onClick={() => void payNow()}
              disabled={paying}
              className="w-full rounded-xl bg-blue-600 px-5 py-4 text-center font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:bg-blue-300"
            >
              {paying ? "Processing…" : `Pay now · ${formatAmount(payment.amount)}`}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
              <FiLock /> Demo checkout — no real payment details are collected
            </p>
          </div>
        )}

        <footer className="flex items-center justify-center gap-4 border-t border-slate-100 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          <span>PCI DSS</span>
          <span>·</span>
          <span>Secured Payments</span>
          <span>·</span>
          <span>Verified Merchant</span>
        </footer>
      </div>
    </main>
  );
}

export default Pay;
