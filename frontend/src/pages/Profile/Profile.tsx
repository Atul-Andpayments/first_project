import { useEffect, useState } from "react";
import { FiLogOut, FiRefreshCw } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import {
  getCurrentMerchant,
  logoutMerchant,
} from "../../services/auth.service";

type MerchantProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

function Profile() {
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
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
  useEffect(() => {
    void loadProfile();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-blue-600">Merchant Account</p>
            <h1 className="mt-2 text-4xl font-extrabold text-slate-900">
              Profile
            </h1>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={loadProfile}
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

        <div className="mt-8 rounded-2xl border border-white/70 bg-white p-8 shadow-xl">
          {loading && <p className="text-slate-600">Loading profile...</p>}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700">
              {error}
            </div>
          )}

          {!loading && merchant && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase text-slate-400">
                  Name
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {merchant.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-slate-400">
                  Email
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {merchant.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-slate-400">
                  Phone
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {merchant.phone}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-slate-400">
                  Created
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {new Date(merchant.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
