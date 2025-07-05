import axios from 'axios';

const API_URL = 'http://localhost:8080/api/auth/';

// Create an Axios instance for common configurations, especially withCredentials
// This instance will be used for all API calls that require authentication
const instance = axios.create({
  baseURL: API_URL, // Base URL for auth endpoints
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // IMPORTANT: Allows sending and receiving HttpOnly cookies
});

// Interceptor for response errors, specifically 401 Unauthorized
// This will attempt to refresh the token automatically
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is 401 Unauthorized AND it's not a login/refresh request
    // and we haven't already retried this request
    if (error.response.status === 401 && !originalRequest._retry && originalRequest.url !== 'refreshtoken' && originalRequest.url !== 'signin') {
      originalRequest._retry = true; // Mark as retried

      try {
        // Attempt to get a new access token using the refresh token
        // The browser will automatically send the refresh token cookie
        await instance.post('refreshtoken');

        // If refresh is successful, retry the original failed request
        // Ensure the original request's URL is relative to the base if 'instance' is configured with baseURL
        return instance(originalRequest);
      } catch (refreshError) {
        // If refresh token fails (e.g., refresh token expired or invalid)
        // This is where you'd typically dispatch a Redux action to logout the user
        // and redirect to the login page.
        // authService.logout() will be called from the slice for consistency.
        return Promise.reject(refreshError); // Propagate the error so authSlice can handle logout
      }
    }

    return Promise.reject(error);
  }
);


const login = (username, password) => {
  return instance.post('signin', { username, password });
};

const logout = () => {
  return instance.post('signout'); // No body needed for signout
};

const register = ({ username, email, password, role }) => {
  return instance.post('signup', { username, email, password, role });
};

// New: Function to call the refresh token endpoint
const refreshToken = () => {
    // The browser will automatically send the refresh token cookie with this request
    return instance.post('refreshtoken');
};


export default {
  login,
  logout,
  register,
  refreshToken, // Export the new refresh token function
};