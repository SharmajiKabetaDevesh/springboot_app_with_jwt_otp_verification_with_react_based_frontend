import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { registerAction, checkUsernameAvailability } from "../features/authSlice.js";

function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    status,
    error,
    usernameCheckStatus,
    isUsernameAvailable,
    usernameCheckError,
  } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: ["user"],
  });

  const [usernameTimer, setUsernameTimer] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    // Handle username availability check with debounce
    if (name === "username") {
      if (usernameTimer) clearTimeout(usernameTimer);

      const timer = setTimeout(() => {
        if (value.trim().length > 2) {
          console.log(value);
          dispatch(checkUsernameAvailability(value.trim()));
        }
      }, 500);

      setUsernameTimer(timer);
    }
  };

  const handleRoleChange = (e) => {
    const value = e.target.value;
    setFormData((prevData) => ({
      ...prevData,
      role: [value],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isUsernameAvailable) {
      alert("Username is already taken. Please choose another.");
      return;
    }

    try {
      await dispatch(registerAction(formData)).unwrap();
      navigate("/");
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Create Your Account
        </h2>
        {status === "loading" && (
          <div className="mb-4 text-sm text-blue-600 text-center">
            Registering...
          </div>
        )}
        {error && (
          <div className="mb-4 text-sm text-red-600 text-center">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              name="username"
              type="text"
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {usernameCheckStatus === "loading" && (
              <p className="text-sm text-blue-500 mt-1">
                Checking availability...
              </p>
            )}
            {usernameCheckStatus === "succeeded" && isUsernameAvailable && (
              <p className="text-sm text-green-600 mt-1">
                ✅ Username is available
              </p>
            )}
            {usernameCheckStatus === "succeeded" && !isUsernameAvailable && (
              <p className="text-sm text-red-600 mt-1">
                ❌ Username is already taken
              </p>
            )}
            {usernameCheckStatus === "failed" && usernameCheckError && (
              <p className="text-sm text-red-500 mt-1">{usernameCheckError}</p>
            )}
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Role Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              onChange={handleRoleChange}
              value={formData.role[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">User</option>
              <option value="mod">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-medium py-2 rounded-xl hover:bg-blue-700 transition-colors duration-300"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;
