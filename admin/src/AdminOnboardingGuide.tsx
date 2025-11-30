import React from 'react';

const AdminOnboardingGuide = () => {
    const steps = [
        'Step 1: Familiarize yourself with the dashboard layout.',
        'Step 2: Set up your profile and preferences.',
        'Step 3: Explore the user management tools.',
        'Step 4: Review the analytics and reports section.',
        'Step 5: Configure notifications and integrations.',
    ];

    return (
        <div className="admin-onboarding-guide">
            <h1>Admin Onboarding Guide</h1>
            <p>Welcome new admins! Follow this guide to get familiar with the dashboard features.</p>
            <ol>
                {steps.map((step, index) => (
                    <li key={index}>{step}</li>
                ))}
            </ol>
        </div>
    );
};

export default AdminOnboardingGuide;