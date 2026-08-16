
//---------------------------------------------------------------------------
//
// --------------------------------------------------------------------------


import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { setCredentials, clearCredentials } from "@/state/authSlice";
import type { RootState as AppRootState } from "@/app/redux";

// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------

const AUTH_ENDPOINTS = ["/auth/login", "/auth/refresh"];
const isAuthEndpoint = (args: string | FetchArgs) => {
  const url = typeof args === "string" ? args : args.url;
  return AUTH_ENDPOINTS.some((endpoint) => url === endpoint || url.endsWith(endpoint));
};

// ---------------------------------------------------------------------------
// 
// ---------------------------------------------------------------------------

const createRawBaseQuery = (skipAuthHeader: boolean) =>
  fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      if (skipAuthHeader) return headers;
      const token = (getState() as AppRootState).auth.accessToken;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  });
const rawBaseQuery = createRawBaseQuery(false);
const rawBaseQueryNoAuth = createRawBaseQuery(true);

// ---------------------------------------------------------------------------
// 
// ---------------------------------------------------------------------------

/**
 * Shared in-flight refresh. Without this, N requests failing with 401 at the
 * same time each POST /auth/refresh — and because the API rotates the refresh
 * token on every call, the later ones present a token the server has already
 * retired and the whole session is torn down. All callers await the same
 * promise instead.
 */



let refreshPromise: Promise<boolean> | null = null;

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, apiCtx, extraOptions) => {
  const query = isAuthEndpoint(args) ? rawBaseQueryNoAuth : rawBaseQuery;
  let result = await query(args, apiCtx, extraOptions);

  if (result.error?.status === 401 && !isAuthEndpoint(args)) {
    if (!refreshPromise) {
      refreshPromise = (async () => {

        const refreshResult = await rawBaseQueryNoAuth(
          { url: "/auth/refresh", method: "POST" },
          apiCtx,
          extraOptions
        );
        if (refreshResult.data) {
          const { access_token, access_expires_in } = refreshResult.data as {
            access_token: string;
            access_expires_in?: number;
          };
          apiCtx.dispatch(
            setCredentials({
              accessToken: access_token,
              accessExpiresIn: access_expires_in,
            })
          );
          return true;
        }
        apiCtx.dispatch(clearCredentials());
        return false;
      })().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      result = await rawBaseQuery(args, apiCtx, extraOptions);
    }
  }

  return result;
};



// ---------------------------------------------------------------------------
// 
// ---------------------------------------------------------------------------

export const api = createApi({
  baseQuery: baseQueryWithReauth,
  reducerPath: "api",
  tagTypes: [
    "Auth",
    "Users",
    "staff",
    "Company",
    "Communication",
    "Notification",
    "Attendance",
    "HR",
    "Inventory",
    "Quotation",
    "Audit",
    "Setting",
  ],
  endpoints: () => ({}),
});


// ---------------------------------------------------------------------------
// 
// ---------------------------------------------------------------------------
