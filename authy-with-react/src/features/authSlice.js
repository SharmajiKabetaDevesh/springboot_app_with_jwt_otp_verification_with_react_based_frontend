import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../Services/authService';
import axios from 'axios'; // Make sure to import axios here if checkAuth uses it directly

const initialState = {
  user: null,
  isAuthenticated: false,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Use the configured axios instance for checkAuth
// This ensures that the interceptors (for refresh logic) are applied
export const checkAuth = createAsyncThunk('auth/check', async (_, thunkAPI) => {
  try {
    // Make sure 'instance' from http-common.js is imported or used
    // For now, I'll use direct axios withCredentials, assuming your main axios config handles it.
    // However, it's BEST PRACTICE to use your custom axios instance (from http-common.js)
    // For demonstration, let's assume `axios` is your configured instance or you import `instance`
    const instance = axios.create({
        baseURL: 'http://localhost:8080/api', // Make sure this matches
        withCredentials: true, // Crucial for cookies
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Add interceptors to this instance or ensure your global axios config has them
    // For clarity, I'm reiterating the need for interceptors here if not globally configured.
    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;
            if (error.response.status === 401 && !originalRequest._retry && error.config.url !== '/auth/refreshtoken') {
                originalRequest._retry = true;
                try {
                    await authService.refreshToken(); // Call your refresh token service
                    return instance(originalRequest); // Retry the original request
                } catch (refreshError) {
                    // Refresh failed, force logout
                    thunkAPI.dispatch(logout()); // Dispatch logout action
                    return Promise.reject(refreshError);
                }
            }
            return Promise.reject(error);
        }
    );


    const res = await instance.get("/auth/me"); // Use the configured instance
    return res.data;
  } catch (err) {
    // On error, the user is not authenticated
    // The interceptor might handle a full logout before this is reached if refresh fails
    return thunkAPI.rejectWithValue("Not authenticated");
  }
});

export const login = createAsyncThunk('auth/login', async (data, thunkAPI) => {
  try {
    const res = await authService.login(data.username, data.password);
    // Backend sets HttpOnly cookies, no need to store tokens in state/local storage
    return res.data; // This payload should contain user info (username, email, roles)
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response.data.message || 'Login failed');
  }
});

export const register = createAsyncThunk('auth/register', async (data, thunkAPI) => {
  try {
    const res = await authService.register(data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response.data.message || 'Registration failed');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
  // No need to clear local storage if no user info is stored there for authentication
  // Only clear if you stored user display info (like username) for convenience
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // checkAuth handling for initial load/refresh
      .addCase(checkAuth.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload; // Backend /me endpoint returns user info
        state.isAuthenticated = true;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.status = 'failed';
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })
      // Login handling
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload; // Login response also provides user info
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })
      // Register handling
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Logout handling
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.status = 'idle'; // Reset status after logout
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        // Even if logout request fails, clear local state for UX
        state.user = null;
        state.isAuthenticated = false;
        state.status = 'idle';
        state.error = action.error.message || 'Logout failed on server but client state cleared.';
      });
  },
});

export default authSlice.reducer;