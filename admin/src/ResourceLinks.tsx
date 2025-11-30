import React from 'react';

type Resource = {
  id: number;
  name: string;
  url: string;
};

type ResourceLinksProps = {
  resources: Resource[];
};

const ResourceLinks: React.FC<ResourceLinksProps> = ({ resources }) => {
  return (
    <div className="resource-links" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Resource Links</h2>
      <ul>
        {resources.map((resource) => (
          <li key={resource.id} style={{ marginBottom: '10px' }}>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              {resource.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ResourceLinks;