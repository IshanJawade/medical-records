import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getProfile, login, logout, signup } from "../utils/authApi.js";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const data = await getProfile();
        setUser(data);
      } catch (error) {
        console.warn("Profile bootstrap skipped", error);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (credentials) => {
        const data = await login(credentials);
        setUser(data.user);
        return data;
      },
      logout: async () => {
        await logout();
        setUser(null);
      },
      signup: async (payload) => {
        const data = await signup(payload);
        return data;
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
