import React, { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * PostList component to display a list of posts.
 * @param {string} role - The role of the user (admin or user).
 */
const PostList: React.FC<{ role: string }> = ({ role }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get(`/api/posts?role=${role}`);
        setPosts(response.data);
      } catch (err) {
        setError('Failed to fetch posts');
      }
    };

    fetchPosts();
  }, [role]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (posts.length === 0) {
    return <div>No posts available</div>;
  }

  return (
    <div>
      <h2>{role === 'admin' ? 'Admin Posts' : 'User Posts'}</h2>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PostList;