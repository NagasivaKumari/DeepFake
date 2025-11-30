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

    const calculateInactivePercentage = () => {
        return ((stats.inactiveUsers / stats.totalUsers) * 100).toFixed(2);
    };

    // Added a new calculated metric: User Growth Rate
    const calculateUserGrowthRate = (previousTotal: number, currentTotal: number): string => {
        if (previousTotal === 0) return "N/A";
        const growthRate = ((currentTotal - previousTotal) / previousTotal) * 100;
        return growthRate.toFixed(2);
    };

    // Example previous total for demonstration
    const previousTotalUsers = 1400;

    return (
        <div>
            <h2>User Statistics</h2>
            <ul>
                <li>Total Users: {stats.totalUsers}</li>
                <li>Active Users: {stats.activeUsers}</li>
                <li>Inactive Users: {stats.inactiveUsers}</li>
                <li>Active Percentage: {calculateActivePercentage()}%</li>
                <li>Inactive Percentage: {calculateInactivePercentage()}%</li>
                <li>User Growth Rate: {calculateUserGrowthRate(previousTotalUsers, stats.totalUsers)}%</li>
            </ul>
            <p>Last updated: {new Date().toLocaleString()}</p>
        </div>
    );
};

export default UserStats;