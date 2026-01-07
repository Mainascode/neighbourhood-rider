import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="text-center p-10">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
