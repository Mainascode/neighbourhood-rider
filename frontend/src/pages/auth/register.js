import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotify } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import AuthCard from "./AuthCard";
import { Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const { notify, enableNotifications } = useNotify();
  const navigate = useNavigate();

  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptPrivacyPolicy, setAcceptPrivacyPolicy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const googleOnly = String(process.env.REACT_APP_GOOGLE_AUTH_ONLY || "false").toLowerCase() === "true";

  const submit = async (e) => {
    e.preventDefault();
    if (googleOnly) {
      notify("Email/password registration is disabled. Please continue with Google.", "error");
      return;
    }

    if (password !== confirmPassword) {
      notify("Passwords do not match", "error");
      return;
    }

    try {
      await register(name, email, password, confirmPassword, acceptPrivacyPolicy, acceptTerms);
      notify("Account created successfully 🎉", "success");
      await enableNotifications({ prompt: true });
      navigate("/");
    } catch (err) {
      notify(err.message || "Registration failed", "error");
    }
  };

  const handleGoogleSuccess = async (cred) => {
    if (!acceptPrivacyPolicy || !acceptTerms) {
      notify("Please accept Privacy Policy and Terms first.", "error");
      return;
    }
    try {
      await loginWithGoogle(cred.credential, true, true);
      notify("Account created successfully 🎉", "success");
      await enableNotifications({ prompt: true });
      navigate("/");
    } catch (err) {
      notify(err.message || "Google registration failed", "error");
    }
  };

  return (
    <AuthCard
      title="Create Account"
      subtitle="Join Neighborhood Rider"
    >
      <form onSubmit={submit}>
        {!googleOnly && (
          <>
            <input
              type="text"
              placeholder="Full Name"
              className="w-full mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-riderBlue text-riderLight placeholder-gray-400 transition-all focus:bg-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              type="email"
              placeholder="Email"
              className="w-full mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-riderBlue text-riderLight placeholder-gray-400 transition-all focus:bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative mb-4">
              <input
                type={show ? "text" : "password"}
                placeholder="Password"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-riderBlue text-riderLight placeholder-gray-400 transition-all focus:bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span
                onClick={() => setShow(!show)}
                className="absolute right-4 top-4 cursor-pointer text-sm text-gray-500 hover:text-riderBlue transition-colors select-none font-bold"
              >
                {show ? "Hide" : "Show"}
              </span>
            </div>

            <input
              type={show ? "text" : "password"}
              placeholder="Confirm Password"
              className="w-full mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-riderBlue text-riderLight placeholder-gray-400 transition-all focus:bg-white"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button className="w-full bg-riderMaroon hover:bg-rose-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-riderMaroon/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 uppercase tracking-wide">
              Register
            </button>
          </>
        )}

        <label className="flex items-start gap-2 mt-4 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={acceptPrivacyPolicy}
            onChange={(e) => setAcceptPrivacyPolicy(e.target.checked)}
            required
            className="mt-0.5"
          />
          <span>
            I accept the <Link to="/privacy" className="text-riderBlue font-bold hover:underline">Privacy Policy</Link>.
          </span>
        </label>

        <label className="flex items-start gap-2 mt-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            required
            className="mt-0.5"
          />
          <span>
            I accept the <Link to="/terms" className="text-riderBlue font-bold hover:underline">Terms and Conditions</Link>.
          </span>
        </label>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span className="text-xs text-gray-400">OR</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>

        <div className="flex justify-center mb-3">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => notify("Google registration failed", "error")}
          />
        </div>
        {googleOnly && (
          <p className="text-center text-xs text-gray-500 mb-2">
            Google sign-in is required for account creation.
          </p>
        )}

        <p className="text-center text-sm text-gray-500 mt-6 font-medium">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-riderBlue font-bold cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>

      </form>
    </AuthCard>
  );
}
