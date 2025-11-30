import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TwoFactorAuthentication = () => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [secretKey] = useState('JBSWY3DPEHPK3PXP'); // Example secret key
  const [qrValue, setQrValue] = useState(`otpauth://totp/AdminPanel?secret=${secretKey}&issuer=AdminPanel`);

  const toggle2FA = () => {
    setIs2FAEnabled(!is2FAEnabled);
  };

  return (
    <div className="two-factor-authentication">
      <h2>Two-Factor Authentication</h2>
      <label>
        <input type="checkbox" checked={is2FAEnabled} onChange={toggle2FA} />
        Enable Two-Factor Authentication
      </label>
      {is2FAEnabled && (
        <div>
          <p>Scan the QR code below with your authentication app:</p>
          <QRCodeSVG value={qrValue} size={256} />
          <p><strong>Secret Key:</strong> {secretKey}</p>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuthentication;