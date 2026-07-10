import { useState } from "react";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import payment from "../../assets/illustrations/payments.svg";
import { loginMerchant } from "../../services/auth.service";

type LoginForm = {
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof LoginForm, string>>;

const initialFormData: LoginForm = {
  email: "",
  password: "",
};

const getApiErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const data = error.response.data as { message?: string | string[] };

    if (Array.isArray(data.message)) {
      return data.message.join(", ");
    }

    if (data.message) {
      return data.message;
    }
  }

  if (typeof error === "object" && error !== null && "request" in error) {
    return "Unable to connect to the backend. Please make sure the server is running.";
  }

  return "Something went wrong. Please try again.";
};

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginForm>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const errors: FieldErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!emailPattern.test(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (!formData.password) {
      errors.password = "Password is required.";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setError("");
    setSuccess("");
    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await loginMerchant({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      setSuccess("Login successful!");
      setFormData(initialFormData);
      setFieldErrors({});
      navigate("/profile");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-3xl border border-white/30 bg-white/80 p-10 shadow-2xl backdrop-blur-xl">
          <h1 className="text-4xl font-extrabold text-slate-900">
            Welcome Back
          </h1>

          <p className="mt-2 text-slate-500">
            Sign in to your merchant account
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {success}
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Email
              </label>

              <div className="flex items-center rounded-xl border border-slate-300 px-4 py-3 transition focus-within:border-blue-600">
                <FaEnvelope className="text-slate-400" />

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="merchant@example.com"
                  className="ml-3 w-full bg-transparent outline-none"
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-2 text-sm text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Password
              </label>

              <div className="flex items-center rounded-xl border border-slate-300 px-4 py-3 transition focus-within:border-blue-600">
                <FaLock className="text-slate-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="ml-3 w-full bg-transparent outline-none"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="text-slate-500"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <FiEyeOff className="text-xl" />
                  ) : (
                    <FiEye className="text-xl" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-2 text-sm text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-600">
            Don't have an account?
            <Link
              to="/register"
              className="ml-2 cursor-pointer font-semibold text-blue-600 hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 lg:flex">
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,#ffffff22_1px,transparent_1px),linear-gradient(to_bottom,#ffffff22_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="relative z-10 flex flex-col items-center px-10 text-center ">
          <img
            src={payment}
            alt="Payment Illustration"
            className="w-[420px] max-w-full animate-float"
          />

          <h1 className="mt-8 text-5xl font-extrabold text-white animate-float">
            Payment Gateway
          </h1>

          <p className="mt-4 text-lg text-blue-100">
            Secure, fast, and reliable
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
