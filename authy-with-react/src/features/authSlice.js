import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../Services/authService';

const initialState = {
  user: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
  otpRequested: false,
  loginUsername: null,
  usernameCheckStatus: 'idle',
  usernameCheckError: null,
  isUsernameAvailable: false,
};

// Thunks
export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, thunkAPI) => {
  try {
    const res = await authService.checkUserAuth();
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue("Not authenticated");
  }
});

export const requestOtpAction = createAsyncThunk('auth/requestOtp', async (data, thunkAPI) => {
  try {
    const res = await authService.requestOtp(data.username, data.password);
    return { ...res.data, username: data.username };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to request OTP');
  }
});

export const verifyOtpAction = createAsyncThunk('auth/verifyOtp', async (data, thunkAPI) => {
  try {
    const res = await authService.verifyOtpAndLogin(data.username, data.otp);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Invalid OTP');
  }
});

export const checkUsernameAvailability = createAsyncThunk(
  'auth/checkUsernameAvailability',
  async (username, thunkAPI) => {
    try {
      const response = await authService.checkUsernameAvailability(username);
      console.log(response);
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const registerAction = createAsyncThunk('auth/register', async (data, thunkAPI) => {
  try {
    const res = await authService.register(data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const logoutAction = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetOtpState: (state) => {
      state.otpRequested = false;
      state.error = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      // checkAuth
      .addCase(checkAuth.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.status = 'failed';
        state.user = null;
        state.isAuthenticated = false;
      })

      // requestOtp
      .addCase(requestOtpAction.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(requestOtpAction.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.otpRequested = true;
        state.loginUsername = action.payload.username;
      })
      .addCase(requestOtpAction.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.otpRequested = false;
        state.loginUsername = null;
      })

      // verifyOtp
      .addCase(verifyOtpAction.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifyOtpAction.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.isAuthenticated = true;
        state.otpRequested = false;
        state.loginUsername = null;
      })
      .addCase(verifyOtpAction.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // register
      .addCase(registerAction.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(registerAction.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(registerAction.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // logout
      .addCase(logoutAction.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.status = 'idle';
        state.error = null;
        state.otpRequested = false;
        state.loginUsername = null;
      })

      // ✅ checkUsernameAvailability
      .addCase(checkUsernameAvailability.pending, (state) => {
        state.usernameCheckStatus = 'loading';
        state.usernameCheckError = null;
      })
      .addCase(checkUsernameAvailability.fulfilled, (state, action) => {
        state.usernameCheckStatus = 'succeeded';
        state.isUsernameAvailable = action.payload.available; // depends on API response
      })
      .addCase(checkUsernameAvailability.rejected, (state, action) => {
        state.usernameCheckStatus = 'failed';
        state.usernameCheckError = action.payload;
        state.isUsernameAvailable = false;
      });
  },
});

export const { resetOtpState } = authSlice.actions;
export default authSlice.reducer;
