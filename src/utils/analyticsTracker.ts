export const trackUserAction = (action, category, label) => {
  if (typeof ga === 'function') {
    ga('send', 'event', category, action, label);
    console.log(`Tracked action: ${action}, Category: ${category}, Label: ${label}`);
  } else {
    console.warn('Google Analytics is not initialized');
  }
};