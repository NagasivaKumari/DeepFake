import ReactGA from 'react-ga';

const TRACKING_ID = process.env.REACT_APP_GA_TRACKING_ID || 'UA-XXXXXXXXX-X'; // Replace with your Google Analytics tracking ID

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