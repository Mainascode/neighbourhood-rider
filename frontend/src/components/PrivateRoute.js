import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RouteLoader from "./RouteLoader";

export default function PrivateRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <RouteLoader />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
