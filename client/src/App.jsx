import { Route, Routes } from "react-router-dom";
import { RequireRole } from "./auth/AuthProvider";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Restaurant from "./pages/Restaurant";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import { Login, Register } from "./pages/Auth";
import NotFound from "./pages/NotFound";
import OwnerHome from "./pages/owner/OwnerHome";
import RestaurantForm from "./pages/owner/RestaurantForm";
import OwnerShell from "./pages/owner/OwnerShell";
import Dashboard from "./pages/owner/Dashboard";
import LiveOrders from "./pages/owner/LiveOrders";
import MenuManager from "./pages/owner/MenuManager";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="r/:id" element={<Restaurant />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="orders" element={<RequireRole role="customer"><Orders /></RequireRole>} />
        <Route path="owner" element={<RequireRole role="owner"><OwnerHome /></RequireRole>} />
        <Route path="owner/new" element={<RequireRole role="owner"><RestaurantForm /></RequireRole>} />
        <Route path="owner/:id" element={<RequireRole role="owner"><OwnerShell /></RequireRole>}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<LiveOrders />} />
          <Route path="menu" element={<MenuManager />} />
          <Route path="edit" element={<RestaurantForm />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
