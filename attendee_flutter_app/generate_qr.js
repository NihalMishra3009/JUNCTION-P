const qrcode = require('qrcode');
const os = require('os');
const path = require('path');
const fs = require('fs');

// 1. Get Local Wi-Fi IPv4 Address dynamically
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIP();
const apkUrl = `http://${localIP}:3000/junction-attendee.apk`;

console.clear();
console.log('\x1b[33m%s\x1b[0m', '==========================================================');
console.log('\x1b[1m\x1b[37m%s\x1b[0m', '   📱 JUNCTION ATTENDEE APK - QR CODE SCANNER');
console.log('\x1b[33m%s\x1b[0m', '==========================================================');
console.log(`\nLocal IP Detected : \x1b[32m${localIP}\x1b[0m`);
console.log(`Direct APK Link   : \x1b[36m${apkUrl}\x1b[0m\n`);

// 2. Render ASCII QR Code right in the terminal
qrcode.toString(apkUrl, { type: 'terminal', small: true }, (err, qrText) => {
  if (err) {
    console.error('Error generating QR:', err);
    return;
  }
  console.log(qrText);
  console.log('\x1b[33m%s\x1b[0m', '>> POINT ANY PHONE CAMERA AT THIS TERMINAL TO INSTALL APP\n');
});

// 3. Save PNG image as well
const outputPng = path.join(__dirname, 'public', 'junction-qr.png');
qrcode.toFile(outputPng, apkUrl, { width: 400 }, (err) => {
  if (!err) {
    console.log(`\x1b[90m✓ High-Res image saved to: public/junction-qr.png\x1b[0m\n`);
  }
});
