import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  requestOtpAction,
  verifyOtpAction,
  resetOtpState,
} from '../features/authSlice.js';

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { status, error, isAuthenticated, otpRequested, loginUsername } =
    useSelector((state) => state.auth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    dispatch(requestOtpAction({ username, password }));
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    dispatch(verifyOtpAction({ username: loginUsername, otp }));
  };

  const handleBack = () => {
    dispatch(resetOtpState());
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {!otpRequested ? (
          <>
            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
              Login to Your Account
            </h2>
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
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
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-xl hover:bg-blue-700 transition-colors duration-300 disabled:bg-blue-300"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Sending OTP...' : 'Login'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-2">
              Verify OTP
            </h2>
            <p className="text-center text-gray-600 text-sm mb-6">
              An OTP has been sent to your registered email.
            </p>
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  One-Time Password
                </label>
                <input
                  type="text"
                  placeholder="Enter your OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full bg-gray-200 text-gray-800 font-medium py-2 rounded-xl hover:bg-gray-300 transition-colors duration-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-medium py-2 rounded-xl hover:bg-blue-700 transition-colors duration-300 disabled:bg-blue-300"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Verifying...' : 'Verify & Login'}
                </button>
              </div>
            </form>
          </>
        )}
        {error && (
          <div className="mt-4 text-sm text-red-600 text-center">{error}</div>
        )}
      </div>
    </div>
  );
}

export default Login;
