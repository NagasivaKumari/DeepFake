import React, { useState } from 'react';

function TwoFactorAuthSetup() {
  const [qrCode, setQrCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const generateQrCode = () => {
    // Simulate QR code generation
    setQrCode('https://example.com/qr-code');
  };

  const verifyCode = (code) => {
    // Simulate verification logic
    if (code === '123456') {
      setIsVerified(true);
      alert('2FA setup complete!');
    } else {
      alert('Invalid code. Please try again.');
    }
  };

  return (
    <div>
      <h1>Two-Factor Authentication Setup</h1>
      {!qrCode && <button onClick={generateQrCode}>Generate QR Code</button>}
      {qrCode && (
        <div>
          <img src={qrCode} alt="QR Code" />
          <p>Scan this QR code with your authenticator app.</p>
          <input
            type="text"
            placeholder="Enter verification code"
            onBlur={(e) => verifyCode(e.target.value)}
          />
        </div>
      )}
      {isVerified && <p>2FA is now enabled for your account.</p>}
    </div>
  );
}

export default TwoFactorAuthSetup;