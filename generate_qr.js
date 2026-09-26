const qrcode = require('qrcode');
const path = require('path');

// Direct GitHub Raw APK Download Link (Never 404s, works instantly on any phone camera)
const directRawUrl = 'https://github.com/NihalMishra3009/Junction-App/raw/main/public/junction-attendee.apk';

console.clear();
console.log('\x1b[33m%s\x1b[0m', '==========================================================');
console.log('\x1b[1m\x1b[37m%s\x1b[0m', '   📱 JUNCTION ATTENDEE APK - DIRECT QR CODE SCANNER');
console.log('\x1b[33m%s\x1b[0m', '==========================================================');
console.log(`Direct APK Download Link : \x1b[36m${directRawUrl}\x1b[0m\n`);

// 1. Render ASCII QR Code in terminal
qrcode.toString(directRawUrl, { type: 'terminal', small: true }, (err, qrText) => {
  if (err) {
    console.error('Error generating terminal QR:', err);
    return;
  }
  console.log(qrText);
  console.log('\x1b[32m%s\x1b[0m', '>> POINT ANY PHONE CAMERA AT THIS QR CODE TO DOWNLOAD & INSTALL APK INSTANTLY\n');
});

// 2. Save High-Res PNG image for README
const outputPng = path.join(__dirname, 'public', 'junction-qr.png');
qrcode.toFile(outputPng, directRawUrl, {
  width: 500,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
}, (err) => {
  if (!err) {
    console.log(`\x1b[90m✓ High-Res QR code saved to: public/junction-qr.png\x1b[0m\n`);
  }
});
