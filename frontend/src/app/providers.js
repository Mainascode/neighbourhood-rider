'use client';

import { AuthProvider } from "../context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

export function Providers({ children }) {
    return (
        <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID"}>
            <AuthProvider>
                {children}
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}
