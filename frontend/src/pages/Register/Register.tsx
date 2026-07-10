import { useState } from "react";
import { FaEnvelope, FaLock, FaPhone, FaUser } from "react-icons/fa";
import { FiEye, FiEyeOff } from "react-icons/fi";
import payment from "../../assets/illustrations/payments.svg";
import { registerMerchant } from "../../services/auth.service";

type RegisterForm = {
  name: string;
  phone: string;
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof RegisterForm, string>>;

const initialFormData: RegisterForm = {
  name: "",
  phone: "",
  email: "",
  password: "",
};

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
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
    //console.log(data);
    if (Array.isArray(data.message)) {
      return data.message.join(", ");
    }

    if (data.message) {
      return data.message;
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "request" in error
  ) {
    return "Unable to connect to the backend. Please make sure the server is running.";
  }

  return "Something went wrong. Please try again.";
};

function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterForm>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const errors: FieldErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedPhone = normalizePhone(formData.phone);

    if (!formData.name.trim()) {
      errors.name = "Merchant name is required.";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Merchant name must be at least 2 characters.";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      errors.phone = "Enter a valid 10-digit Indian mobile number.";
    }

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
      await registerMerchant({
        name: formData.name.trim(),
        phone: normalizePhone(formData.phone),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      setSuccess("Merchant registered successfully!");
      setFormData(initialFormData);
      setFieldErrors({});
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
            Create Account
          </h1>

          <p className="mt-2 text-slate-500">Register your merchant account</p>

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
                Merchant Name
              </label>
              <div className="flex items-center rounded-xl border border-slate-300 px-4 py-3 transition focus-within:border-blue-600">
                <FaUser className="text-slate-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="ml-3 w-full bg-transparent outline-none"
                  autoComplete="name"
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-2 text-sm text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Phone Number
              </label>
              <div className="flex items-center rounded-xl border border-slate-300 px-4 py-3 transition focus-within:border-blue-600">
                <FaPhone className="text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="ml-3 w-full bg-transparent outline-none"
                  autoComplete="tel"
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-2 text-sm text-red-600">{fieldErrors.phone}</p>
              )}
            </div>

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
                <p className="mt-2 text-sm text-red-600">{fieldErrors.email}</p>
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
                  placeholder="Create password"
                  className="ml-3 w-full bg-transparent outline-none"
                  autoComplete="new-password"
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
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-600">
            Already have an account?
            <a
              href="/login"
              className="ml-2 cursor-pointer font-semibold text-blue-600 hover:underline"
            >
              Sign In
            </a>
          </p>
        </div>
      </div>

      <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 lg:flex">
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,#ffffff22_1px,transparent_1px),linear-gradient(to_bottom,#ffffff22_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="relative z-10 flex flex-col items-center px-10 text-center">
          <img
            src={payment}
            alt="Payment Illustration"
            className="w-[420px] max-w-full animate-float"
          />
          <h1 className="mt-8 text-5xl font-extrabold text-white">
            Join Payment Gateway
          </h1>
          <p className="mt-4 text-lg text-blue-100">
            Start accepting payments in minutes
          </p>
        </div>
      </div>
    </div>

);
}

export default Register;
