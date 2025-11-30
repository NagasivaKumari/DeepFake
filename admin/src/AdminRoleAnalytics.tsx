import React, { useState, useEffect } from 'react';

const AdminRoleAnalytics = () => {
    const [analytics, setAnalytics] = useState([]);

    useEffect(() => {
        const mockData = [
            { role: 'Super Admin', activity: 120 },
            { role: 'Moderator', activity: 85 },
            { role: 'Content Reviewer', activity: 45 },
        ];
        setAnalytics(mockData);
    }, []);

    return (
        <div className="admin-role-analytics">
            <h1>Admin Role Analytics</h1>
            <p>Analyze how different admin roles are being utilized, including activity levels and feature usage.</p>
            <table>
                <thead>
                    <tr>
                        <th>Role</th>
                        <th>Activity Level</th>
                    </tr>
                </thead>
                <tbody>
                    {analytics.map((data, index) => (
                        <tr key={index}>
                            <td>{data.role}</td>
                            <td>{data.activity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminRoleAnalytics;