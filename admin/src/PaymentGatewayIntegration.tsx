import React, { useState } from 'react';

const PaymentGatewayIntegration = () => {
  const [paymentGateways, setPaymentGateways] = useState([
    { id: 1, name: 'Stripe', description: 'Popular payment gateway for online transactions.' },
    { id: 2, name: 'PayPal', description: 'Secure payment gateway for businesses and individuals.' },
  ]);

  const handleIntegration = (gatewayName) => {
    alert(`Integrating with ${gatewayName}...`);
  };

  return (
    <div className="payment-gateway-integration">
      <h2>Payment Gateway Integration</h2>
      <ul>
        {paymentGateways.map((gateway) => (
          <li key={gateway.id}>
            <h3>{gateway.name}</h3>
            <p>{gateway.description}</p>
            <button onClick={() => handleIntegration(gateway.name)}>Integrate</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PaymentGatewayIntegration;