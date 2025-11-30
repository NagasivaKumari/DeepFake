import React from 'react';

const UserStats = () => {
    const stats = {
        totalUsers: 1500,
        activeUsers: 1200,
        inactiveUsers: 300,
    };

    const calculateActivePercentage = () => {
        return ((stats.activeUsers / stats.totalUsers) * 100).toFixed(2);
    };

    return (
        <div>
            <h2>User Statistics</h2>
            <ul>
                <li>Total Users: {stats.totalUsers}</li>
                <li>Active Users: {stats.activeUsers}</li>
                <li>Inactive Users: {stats.inactiveUsers}</li>
                <li>Active Percentage: {calculateActivePercentage()}%</li>
            </ul>
            <p>Last updated: {new Date().toLocaleString()}</p>
        </div>
    );
};

export default UserStats;