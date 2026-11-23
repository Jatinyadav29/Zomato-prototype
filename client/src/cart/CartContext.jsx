import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Cart is scoped to ONE restaurant (an order belongs to one restaurant).
// Shape: { restaurant: { _id, name, area, city, cuisines } | null, items: [{ menuItemId, name, price, isVeg, quantity }] }
const CartContext = createContext(null);
const KEY = "foodhub.cart.v1";
const EMPTY = { restaurant: null, items: [] };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(load);
  // When the user adds from a different restaurant we park the item here and ask first.
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch {
      /* private mode: cart just won't persist */
    }
  }, [cart]);

  const restaurantLite = (r) => ({ _id: r._id, name: r.name, area: r.area, city: r.city, cuisines: r.cuisines, isOpen: r.isOpen });

  const addItem = useCallback(
    (restaurant, item, { force = false } = {}) => {
      if (!force && cart.restaurant && cart.restaurant._id !== restaurant._id && cart.items.length) {
        setConflict({ restaurant, item });
        return false;
      }
      setCart((c) => {
        const base = c.restaurant?._id === restaurant._id ? c : { restaurant: restaurantLite(restaurant), items: [] };
        const existing = base.items.find((i) => i.menuItemId === item._id);
        const items = existing
          ? base.items.map((i) => (i.menuItemId === item._id ? { ...i, quantity: Math.min(20, i.quantity + 1) } : i))
          : [...base.items, { menuItemId: item._id, name: item.name, price: item.price, isVeg: item.isVeg, quantity: 1 }];
        return { restaurant: restaurantLite(restaurant), items };
      });
      return true;
    },
    [cart],
  );

  const setQty = useCallback((menuItemId, quantity) => {
    setCart((c) => {
      const items = quantity <= 0 ? c.items.filter((i) => i.menuItemId !== menuItemId) : c.items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: Math.min(20, quantity) } : i));
      return items.length ? { ...c, items } : EMPTY;
    });
  }, []);

  const clear = useCallback(() => setCart(EMPTY), []);

  const resolveConflict = useCallback(
    (replace) => {
      if (replace && conflict) {
        setCart({ restaurant: restaurantLite(conflict.restaurant), items: [{ menuItemId: conflict.item._id, name: conflict.item.name, price: conflict.item.price, isVeg: conflict.item.isVeg, quantity: 1 }] });
      }
      setConflict(null);
    },
    [conflict],
  );

  const count = cart.items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.items.reduce((s, i) => s + i.quantity * i.price, 0);

  const value = useMemo(() => ({ cart, count, subtotal, addItem, setQty, clear, conflict, resolveConflict }), [cart, count, subtotal, addItem, setQty, clear, conflict, resolveConflict]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
