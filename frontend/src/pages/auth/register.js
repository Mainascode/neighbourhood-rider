import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotify } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import AuthCard from "./AuthCard";

export default function Register() {
  const { register } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();

  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      notify("Passwords do not match", "error");
      return;
    }

    try {
      await register(name, email, password, confirmPassword);
      notify("Account created successfully 🎉", "success");
      navigate("/");
    } catch (err) {
      notify(err.message || "Registration failed", "error");
    }
  };

  return (
    <AuthCard
      title="Create Account"
      subtitle="Join Neighborhood Rider"
    >
      <form onSubmit={submit}>
        <input
          type="text"
          placeholder="Full Name"
          className="w-full mb-4 p-4 bg-riderDark/50 border border-riderBlue/10 rounded-xl focus:outline-none focus:border-riderMaroon text-riderLight placeholder-gray-400 transition-all focus:bg-riderDark/50"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-4 bg-riderDark/50 border border-riderBlue/10 rounded-xl focus:outline-none focus:border-riderMaroon text-riderLight placeholder-gray-400 transition-all focus:bg-riderDark/50"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="relative mb-4">
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

        <input
          type={show ? "text" : "password"}
          placeholder="Confirm Password"
          className="w-full mb-6 p-4 bg-riderDark/50 border border-riderBlue/10 rounded-xl focus:outline-none focus:border-riderMaroon text-riderLight placeholder-gray-400 transition-all focus:bg-riderDark/50"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button className="w-full bg-riderMaroon hover:bg-rose-800 text-riderLight py-4 rounded-xl font-bold shadow-lg shadow-rose-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 uppercase tracking-wide">
          Register
        </button>

        <p className="text-center text-sm text-gray-600 mt-6 font-medium">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-riderLight font-bold cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>

      </form>
    </AuthCard>
  );
}
