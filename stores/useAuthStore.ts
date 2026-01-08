import { supabase } from "@/lib/supabase";
import { User } from "@/types/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AuthStore = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  // setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (data && data.user && !error) {
            const { user } = data;
            const loggedInUser: User = {
              id: user.id,
              email: user.email!,
              username: user.user_metadata.username,
            };
            set({
              user: loggedInUser,
              isAuthenticated: true,
            });
          }
        } catch (error) {
          console.error("Login error:", error);
          throw error;
        }
      },
      register: async (email: string, password: string, username: string) => {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username,
              },
            },
          });

          if (data && data.user && !error) {
            const { user } = data;
            const newUser: User = {
              id: user.id,
              email: user.email!,
              username: user.user_metadata.username,
            };

            set({
              user: newUser,
              isAuthenticated: true,
            });
          }
        } catch (error) {
          console.error("Registration error:", error);
          throw error;
        }
      },
      logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
          set({ user: null, isAuthenticated: false });
        } else {
          console.error("Logout error:", error);
          throw error;
        }
      },
    }),
    { name: "auth-storage", storage: createJSONStorage(() => AsyncStorage) }
  )
);
