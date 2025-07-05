import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../features/authSlice';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { status, error, isAuthenticated } = useSelector(state => state.auth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Dispatch login action
      await dispatch(login({ username, password })).unwrap(); // .unwrap() to handle rejected promises
      // Navigation will be handled by the useEffect once isAuthenticated becomes true
    } catch (err) {
      console.error("Login failed:", err);
      // The error message will be in the Redux state, displayed by `error` JSX
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Login to Your Account</h2>

        {status === 'loading' && (
          <div className="mb-4 text-sm text-blue-600 text-center">Logging in...</div>
        )}

        {error && (
          <div className="mb-4 text-sm text-red-600 text-center">{error}</div>
        )}

        {/* No need for isAuthenticated message here as we redirect */}
        {/* {isAuthenticated && (
          <div className="mb-4 text-sm text-green-600 text-center">Logged in successfully!</div>
        )} */}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-medium py-2 rounded-xl hover:bg-blue-700 transition-colors duration-300"
            disabled={status === 'loading'} // Disable button during loading
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}