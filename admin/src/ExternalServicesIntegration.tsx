import React from 'react';

const ExternalServicesIntegration = () => {
  const services = [
    { name: 'Zapier', description: 'Automate workflows by connecting with Zapier.' },
    { name: 'Google Analytics', description: 'Track and analyze user interactions on your platform.' },
  ];

  return (
    <div className="external-services-integration">
      <h2>Integration with External Services</h2>
      <ul>
        {services.map((service, index) => (
          <li key={index}>
            <strong>{service.name}</strong>: {service.description}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ExternalServicesIntegration;