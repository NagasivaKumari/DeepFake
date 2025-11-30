import React, { useState } from 'react';

const AlgorandSubscription = () => {
  const [subscriptionPlan, setSubscriptionPlan] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = () => {
    if (subscriptionPlan) {
      // Simulate Algorand subscription logic
      console.log(`Subscribing to ${subscriptionPlan} plan using Algorand.`);
      setIsSubscribed(true);
    }
  };

  return (
    <div className="algorand-subscription">
      <h2>Algorand-Based Subscription</h2>
      <div className="subscription-options">
        <label>
          <input
            type="radio"
            name="plan"
            value="Basic"
            onChange={(e) => setSubscriptionPlan(e.target.value)}
          />
          Basic Plan
        </label>
        <label>
          <input
            type="radio"
            name="plan"
            value="Premium"
            onChange={(e) => setSubscriptionPlan(e.target.value)}
          />
          Premium Plan
        </label>
      </div>
      <button onClick={handleSubscribe} disabled={!subscriptionPlan}>
        Subscribe
      </button>
      {isSubscribed && <p>Successfully subscribed to the {subscriptionPlan} plan!</p>}
    </div>
  );
};

export default AlgorandSubscription;