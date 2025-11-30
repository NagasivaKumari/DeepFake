import React, { useEffect, useState } from 'react';
import { fetchUserProfile } from '../api/authClient';

/**
 * UserProfile component to display user profile information.
 */
const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const userProfile = await fetchUserProfile();
        setProfile(userProfile);
      } catch (err) {
        setError('Failed to fetch user profile');
      }
    };

    getProfile();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>User Profile</h2>
      <p><strong>Name:</strong> {profile.name}</p>
      <p><strong>Email:</strong> {profile.email}</p>
      <p><strong>Role:</strong> {profile.role}</p>
    </div>
  );
};

export default UserProfile;