import React ,{useEffect} from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useSelector,useDispatch } from 'react-redux';
import { checkAuth, logout } from './features/authSlice';
import Login from './component/Login';
import Register from './component/Register';
import Dashboard from './component/Dashboard';
import PrivateRoute from './component/PrivateRoute';
function App() {
  const dispatch = useDispatch();
  const { status, isAuthenticated } = useSelector(state => state.auth);


  const handleClick=()=>{
     dispatch(logout())
  };
useEffect(()=>{
dispatch(checkAuth());
},[dispatch])

if (status === 'loading' && !isAuthenticated) {
  // Show a loading spinner or splash screen while checking auth status
  return <div>Loading authentication...</div>;
}
  return (
    <Router>
      <div className="bg-gray-100 min-h-screen">
        {!isAuthenticated && (
          <nav className="p-4 bg-white shadow mb-6 flex gap-4 justify-center">
            <Link to="/" className="text-blue-600 hover:underline">Login</Link>
            <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
            <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
          </nav>
        )}
        {isAuthenticated && <button className="bg-red-100 px-8 py-6 text-black" onClick={handleClick}>Logout</button>}

        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
          />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;
