import React, { createContext, useContext, useState } from 'react';

// Define the shape of the role context
interface RoleContextType {
  currentRole: string;
  setRole: (role: string) => void;
}

// Create the RoleContext
const RoleContext = createContext<RoleContextType | undefined>(undefined);

// RoleProvider component to wrap the app
export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState('Viewer'); // Default role

  return (
    <RoleContext.Provider value={{ currentRole, setRole: setCurrentRole }}>
      {children}
    </RoleContext.Provider>
  );
};

// Custom hook to use the RoleContext
export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};