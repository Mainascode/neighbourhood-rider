import { useEffect, useState } from "react";
import LogoutButton from "../../components/supabase-auth/LogoutButton";
import { supabase } from "../../supabaseClient";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!error) {
        setUser(data.user);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main style={styles.container}>
      <section style={styles.card}>
        <div style={styles.header}>
          <h1>Dashboard</h1>
          <LogoutButton />
        </div>

        <p style={styles.muted}>You are logged in with Supabase.</p>

        {user ? (
          <div style={styles.infoBox}>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Email verified:</strong> {String(!!user.email_confirmed_at)}</p>
            <p><strong>Last sign in:</strong> {user.last_sign_in_at || "N/A"}</p>
          </div>
        ) : (
          <p>Loading user...</p>
        )}
      </section>
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
    maxWidth: "720px",
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    display: "grid",
    gap: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  infoBox: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "14px",
    background: "#fafafa",
  },
  muted: {
    color: "#4b5563",
    margin: 0,
  },
};

