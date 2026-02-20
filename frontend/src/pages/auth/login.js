import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotify } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import AuthCard from "./AuthCard";
import { Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const { notify, enableNotifications } = useNotify();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [acceptPrivacyPolicy, setAcceptPrivacyPolicy] = useState(false);
  const googleOnly = String(process.env.REACT_APP_GOOGLE_AUTH_ONLY || "false").toLowerCase() === "true";

  const submit = async (e) => {
    e.preventDefault();
    if (googleOnly) {
      notify("Email/password login is disabled. Please continue with Google.", "error");
      return;
    }
    try {
      await login(email, password, acceptPrivacyPolicy);
      notify("Welcome back 👋", "success");
      await enableNotifications({ prompt: true });
      navigate("/");
    } catch (err) {
      notify(err.message || "Login failed", "error");
    }
  };

  const handleGoogleSuccess = async (cred) => {
    if (!acceptPrivacyPolicy) {
      notify("Please accept the Privacy Policy first.", "error");
      return;
    }
    try {
      await loginWithGoogle(cred.credential, true, true);
      notify("Welcome 👋", "success");
      await enableNotifications({ prompt: true });
      navigate("/");
    } catch (err) {
      notify(err.message || "Google login failed", "error");
    }
  };

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Login to Neighborhood Rider"
    >
      <form onSubmit={submit}>
        {!googleOnly && (
          <>
            <input
              type="email"
              placeholder="Email"
              className="w-full mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-riderBlue text-riderLight placeholder-gray-400 transition-all focus:bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative mb-6">
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

            <button className="w-full bg-riderMaroon hover:bg-rose-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-riderMaroon/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 uppercase tracking-wide">
              Login
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

        <div className="my-4 flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span className="text-xs text-gray-400">OR</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>

        <div className="flex justify-center mb-3">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => notify("Google login failed", "error")}
          />
        </div>
        {googleOnly && (
          <p className="text-center text-xs text-gray-500 mb-2">
            Google sign-in is required for this app.
          </p>
        )}
        <p className="text-center text-sm text-gray-500 mt-6 font-medium">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-riderBlue font-bold cursor-pointer hover:underline"
          >
            Create one
          </span>
        </p>

        <p className="text-center text-xs text-riderBlue/80 mt-4 cursor-pointer hover:text-riderBlue transition-colors" onClick={() => navigate("/forgot-password")}>
          Forgot Password?
        </p>

      </form>
    </AuthCard>
  );
}
