import { AuthProvider } from "./context/AuthContext";
import ReactDOM from "react-dom/client";
import App from "./App";
import { NotificationProvider } from "./context/NotificationContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
const root = ReactDOM.createRoot(document.getElementById("root"));


root.render(
  <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ""}>
    <NotificationProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </NotificationProvider>
  </GoogleOAuthProvider>
);
