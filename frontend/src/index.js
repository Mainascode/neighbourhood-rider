import { AuthProvider } from "./context/AuthContext";
import ReactDOM from "react-dom/client";
import App from "./App";
import { NotificationProvider } from "./context/NotificationContext";
import "./index.css";
const root = ReactDOM.createRoot(document.getElementById("root"));


root.render(
  <AuthProvider>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </AuthProvider>
);

const splash = document.getElementById("app-splash");
if (splash) {
  requestAnimationFrame(() => {
    splash.classList.add("hide");
    setTimeout(() => splash.remove(), 450);
  });
}
