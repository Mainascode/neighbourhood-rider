import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotify } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import AuthCard from "./AuthCard";

export default function Login() {
  const { login } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      notify("Welcome back 👋", "success");
      navigate("/");
    } catch (err) {
      notify(err.message || "Login failed", "error");
    }
  };

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Login to Neighborhood Rider"
    >
      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-4 bg-riderDark/50 border border-riderBlue/10 rounded-xl focus:outline-none focus:border-riderMaroon text-riderLight placeholder-gray-400 transition-all focus:bg-riderDark/50"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="relative mb-6">
          <input
            type={show ? "text" : "password"}
            placeholder="Password"
            className="w-full p-4 bg-riderDark/50 border border-riderBlue/10 rounded-xl focus:outline-none focus:border-riderMaroon text-riderLight placeholder-gray-400 transition-all focus:bg-riderDark/50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span
            onClick={() => setShow(!show)}
            className="absolute right-4 top-4 cursor-pointer text-sm text-gray-600 hover:text-riderLight transition-colors select-none font-medium"
          >
            {show ? "Hide" : "Show"}
          </span>
        </div>

        <button className="w-full bg-riderMaroon hover:bg-rose-800 text-riderLight py-4 rounded-xl font-bold shadow-lg shadow-rose-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 uppercase tracking-wide">
          Login
        </button>
        <p className="text-center text-sm text-gray-600 mt-6 font-medium">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-riderLight font-bold cursor-pointer hover:underline"
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
