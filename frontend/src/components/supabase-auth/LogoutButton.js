import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function LogoutButton() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    navigate("/supabase/login", { replace: true });
  };

  return (
    <button type="button" onClick={handleLogout} disabled={loading} style={styles.button}>
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}

const styles = {
  button: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #111827",
    background: "#fff",
    color: "#111827",
    fontWeight: 600,
    cursor: "pointer",
  },
};

