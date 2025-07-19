import React from 'react';
import { useSelector } from 'react-redux';

function Dashboard() {
    const { user } = useSelector(state => state.auth);
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold">Welcome to your Dashboard, {user?.username || 'User'}!</h1>
            <p className="mt-4">You are successfully logged in.</p>
        </div>
    )
}

export default Dashboard;
