import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/state/types/auth";

export interface AuthStateType {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: number | null;
  refreshTokenExpiresAt: number | null;
  isAuthenticated: boolean;
  user: AuthUser | null;
}

// /////////////////////////////////////////////
//
// ////////////////////////////////////////////

const initialState: AuthStateType = {
  accessToken: null,
  refreshToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  isAuthenticated: false,
  user: null,
};

// /////////////////////////////////////////////
//
// ////////////////////////////////////////////

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken?: string;
        accessExpiresIn?: number;
        refreshExpiresIn?: number;
        user?: AuthUser;
      }>
    ) => {
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;

      if (action.payload.refreshToken !== undefined) {
        state.refreshToken = action.payload.refreshToken;
      }
      if (action.payload.accessExpiresIn !== undefined) {
        state.accessTokenExpiresAt = Date.now() + action.payload.accessExpiresIn * 1000;
      }
      if (action.payload.refreshExpiresIn !== undefined) {
        state.refreshTokenExpiresAt = Date.now() + action.payload.refreshExpiresIn * 1000;
      }
      // A silent refresh returns no user; keep the one already in state.
      if (action.payload.user !== undefined) {
        state.user = action.payload.user;
      }
    },
    setUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.user = action.payload;
    },
    clearCredentials: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.accessTokenExpiresAt = null;
      state.refreshTokenExpiresAt = null;
      state.isAuthenticated = false;
      state.user = null;
    },
  },
});

// /////////////////////////////////////////////
//
// ////////////////////////////////////////////

export const { setCredentials, setUser, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
