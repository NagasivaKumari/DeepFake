import ReactGA from 'react-ga';

// Updated to use import.meta.env for browser compatibility
const TRACKING_ID =
  (typeof import.meta !== 'undefined' && import.meta.env.VITE_GA_TRACKING_ID) ||
  'UA-XXXXXXXXX-X'; // Replace with your Google Analytics tracking ID

export const initializeAnalytics = () => {
  ReactGA.initialize(TRACKING_ID);
  console.log('Google Analytics initialized');
};

export const trackPageView = (page: string) => {
  ReactGA.pageview(page);
  console.log(`Page view tracked: ${page}`);
};

export const trackEvent = (category: string, action: string, label?: string) => {
  ReactGA.event({
    category,
    action,
    label,
  });
  console.log(`Event tracked: ${category} - ${action}`);
};