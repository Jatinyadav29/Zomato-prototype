import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { refreshAccessToken, setAccessToken, setSessionExpiredHandler } from "../api/client";
import { authApi } from "../api/endpoints";
import { PageLoader } from "../components/States";

const AuthContext = createContext(null);

// Boot runs once per page load, even under StrictMode's double effects:
// refresh -> me. A rotated refresh cookie must never be sent twice.
let bootPromise = null;
function boot() {
  bootPromise ??= refreshAccessToken()
    .then(() => authApi.me())
    .then(({ user }) => user)
    .catch(() => null);
  return bootPromise;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = booting, null = logged out
  const qc = useQueryClient();

  useEffect(() => {
    let alive = true;
    boot().then((u) => alive && setUser(u));
    return () => {
      alive = false;
    };
  }, []);

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setSessionExpiredHandler(clear);
  }, [clear]);

  const login = useCallback(async (body) => {
    const { user, accessToken } = await authApi.login(body);
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (body) => {
    const { user, accessToken } = await authApi.register(body);
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clear();
    }
  }, [clear]);

  const value = useMemo(() => ({ user, booting: user === undefined, login, register, logout }), [user, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function RequireRole({ role, children }) {
  const { user, booting } = useAuth();
  const loc = useLocation();
  if (booting) return <PageLoader label="Warming up the kitchen" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (role && user.role !== role) return <Navigate to={user.role === "owner" ? "/owner" : "/"} replace />;
  return children;
}
