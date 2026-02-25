import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      navigate("/supabase/dashboard");
      return;
    }

    setSuccess("Sign-up successful. Check your email to confirm your account.");
  };

  return (
    <main style={styles.container}>
      <form onSubmit={handleSignup} style={styles.card}>
        <h1>Sign Up</h1>
        <p style={styles.muted}>Create an account with Supabase Auth</p>

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
          minLength={6}
          style={styles.input}
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}

        <p style={styles.muted}>
          Already have an account? <Link to="/supabase/login">Log in</Link>
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
  success: {
    color: "#166534",
    margin: 0,
  },
};

