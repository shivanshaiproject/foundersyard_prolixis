import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Unregister any existing service workers from previous PWA setup
navigator.serviceWorker?.getRegistrations().then((registrations) => {
  registrations.forEach((r) => r.unregister());
});

createRoot(document.getElementById("root")!).render(<App />);
