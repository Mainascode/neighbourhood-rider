import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    navigate("/supabase/dashboard");
  };

  return (
    <main style={styles.container}>
      <form onSubmit={handleLogin} style={styles.card}>
        <h1>Login</h1>
        <p style={styles.muted}>Sign in with your email and password</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Signing in..." : "Login"}
        </button>

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.muted}>
          Need an account? <Link to="/supabase/signup">Sign up</Link>
        </p>
      </form>
    </main>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f7f7f8",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    display: "grid",
    gap: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#111827",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  muted: {
    color: "#4b5563",
    fontSize: "14px",
    margin: 0,
  },
  error: {
    color: "#b91c1c",
    margin: 0,
  },
};

