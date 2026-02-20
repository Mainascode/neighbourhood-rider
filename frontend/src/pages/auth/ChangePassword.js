import { useState } from "react";
import { Link } from "react-router-dom";
import { FaLock, FaArrowLeft } from "react-icons/fa";
import { apiFetch } from "../../lib/api";
import { useNotify } from "../../context/NotificationContext";

export default function ChangePassword() {
  const { notify } = useNotify();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      notify("New passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmNewPassword }),
      });
      notify("Password changed successfully", "success");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      notify(err.message || "Failed to change password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-riderLight relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-riderMaroon/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-riderBlue/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="bg-riderBlack/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-riderBlue/20 w-full max-w-md relative z-10">
        <Link to="/" className="text-sm text-gray-500 hover:text-riderLight flex items-center gap-2 mb-6">
          <FaArrowLeft /> Back
        </Link>

        <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-riderBlue to-riderMaroon bg-clip-text text-transparent">
          Change Password
        </h1>
        <p className="text-gray-500 mb-8">Use your old password to set a new one.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordField label="Old Password" value={oldPassword} setValue={setOldPassword} show={showOld} setShow={setShowOld} />
          <PasswordField label="New Password" value={newPassword} setValue={setNewPassword} show={showNew} setShow={setShowNew} />
          <PasswordField label="Confirm New Password" value={confirmNewPassword} setValue={setConfirmNewPassword} show={showConfirm} setShow={setShowConfirm} />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-riderBlue to-riderMaroon text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-riderBlue/20 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({ label, value, setValue, show, setShow }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">{label}</label>
      <div className="relative">
        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type={show ? "text" : "password"}
          required
          minLength={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-riderDark/50 border border-riderBlue/10 rounded-xl py-3 pl-12 pr-16 outline-none focus:border-riderBlue focus:ring-1 focus:ring-riderBlue transition-all"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 hover:text-riderBlue"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
