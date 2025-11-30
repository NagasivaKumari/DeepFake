import React from 'react';

type ButtonProps = {
  label: string;
  onClick: () => void;
  style?: React.CSSProperties;
};

const Button: React.FC<ButtonProps> = ({ label, onClick, style }) => {
  return (
    <button onClick={onClick} style={{ padding: '10px 20px', ...style }}>
      {label}
    </button>
  );
};

export default Button;