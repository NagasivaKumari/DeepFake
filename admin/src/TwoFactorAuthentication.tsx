import React, { useState } from 'react';
import QRCode from 'qrcode.react';

const TwoFactorAuthentication = () => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [secretKey] = useState('JBSWY3DPEHPK3PXP'); // Example secret key

  const toggle2FA = () => {
    setIs2FAEnabled(!is2FAEnabled);
  };

  return (
    <div>
      <h2>Two-Factor Authentication</h2>
      <label>
        <input type="checkbox" checked={is2FAEnabled} onChange={toggle2FA} />
        Enable Two-Factor Authentication
      </label>
      {is2FAEnabled && (
        <div>
          <p>Scan the QR code below with your authentication app:</p>
          <QRCode value={`otpauth://totp/AdminPanel?secret=${secretKey}&issuer=AdminPanel`} />
          <p><strong>Secret Key:</strong> {secretKey}</p>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuthentication;