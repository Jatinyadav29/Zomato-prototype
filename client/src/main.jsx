import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource/anton/400.css";
import "@fontsource/caveat-brush/400.css";
import "@fontsource-variable/dm-sans";
import "./styles/base.css";
import "./styles/components.css";
// Load order matters: shared page styles first, then one file per page.
import "./styles/pages/shared.css";
import "./styles/pages/home.css";
import "./styles/pages/restaurant.css";
import "./styles/pages/checkout.css";
import "./styles/pages/orders.css";
import "./styles/pages/auth.css";
import "./styles/pages/owner.css";
import { AuthProvider } from "./auth/AuthProvider";
import { CartProvider } from "./cart/CartContext";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 4xx/501 won't fix themselves on retry
      retry: (count, err) => count < 1 && !(err?.status >= 400 && err?.status < 600),
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
