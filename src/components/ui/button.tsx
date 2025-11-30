import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'link';
  onClick?: () => void;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', onClick, children }) => {
  const baseStyles = 'px-4 py-2 rounded font-medium focus:outline-none';
  const variantStyles = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600',
    link: 'text-blue-500 underline hover:text-blue-600',
  };

  return (
    <button className={`${baseStyles} ${variantStyles[variant]}`} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;
