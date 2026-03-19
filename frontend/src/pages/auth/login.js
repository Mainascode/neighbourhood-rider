import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotify } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import AuthCard from "./AuthCard";

export default function Login() {
  const { login, loginWithGoogle, completeProfile } = useAuth();
  const { notify, enableNotifications } = useNotify();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const finalizeFirstTimeRequirements = async (loggedInUser) => {
    const needsPhone = !loggedInUser?.phone;

    if (needsPhone && !phone.trim()) {
      throw new Error("Phone number is required for delivery updates.");
    }

    if (needsPhone) {
      await completeProfile({
        phone,
        location: "Ruaka - Gathigi Estate",
      });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const loggedInUser = await login(email, password);
      await finalizeFirstTimeRequirements(loggedInUser);
      notify("Welcome back 👋", "success");
      await enableNotifications({ prompt: true });
      navigate("/");
    } catch (err) {
      notify(err.message || "Login failed", "error");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const loggedInUser = await loginWithGoogle();
      await finalizeFirstTimeRequirements(loggedInUser);
      notify("Welcome back 👋", "success");
      await enableNotifications({ prompt: true });
      navigate("/");
    } catch (err) {
      notify(err.message || "Google login failed", "error");
    }
  };

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Login to Neighbourhood Rider"
    >
      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-riderBlue text-riderLight placeholder-gray-400 transition-all focus:bg-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="tel"
          placeholder="Phone Number"
          className="w-full mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-riderBlue text-riderLight placeholder-gray-400 transition-all focus:bg-white"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full mt-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-4 rounded-xl font-bold transition-all duration-300"
        >
          Continue with Google
        </button>

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
