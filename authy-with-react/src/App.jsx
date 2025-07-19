import React,{useEffect} from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux"
import { checkAuth, logoutAction } from './features/authSlice.js';
import Login from './component/Login.jsx';
import Register from './component/Register.jsx';
import PrivateRoute from './component/PrivateRoute.jsx';
import Dashboard from './component/DashBoard.jsx';


function App() {
  const dispatch = useDispatch();
  const { status, isAuthenticated } = useSelector(state => state.auth);

  const handleLogout = () => {
    dispatch(logoutAction());
  };

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);


  if (status === 'loading' && !isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen"><div>Loading authentication...</div></div>;
  }

  return (
    <Router>
      <div className="bg-gray-100 min-h-screen">
        <nav className="p-4 bg-white shadow mb-6 flex gap-4 justify-center items-center">
          {!isAuthenticated ? (
            <>
              <Link to="/" className="text-blue-600 hover:underline">Login</Link>
              <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
              <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Logout</button>
            </>
          )}
        </nav>

        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
