# 🚀 Junction — Deployment & Universal Installation Guide

This guide explains how to deploy the **Junction Backend & Web Platform** to **Railway** in minutes and how to install and access the app on **any device, anywhere, anytime**.

---

## 🌟 Architecture Overview

1. **Backend / Web Application (Next.js 16 Standalone Container)**:
   - Contains the complete web dashboard for **Organizers**, **Partners**, and **Attendees**.
   - Contains mock data services, simulation engine, and capacity analytics.
   - Hosts the downloadable **Android APK** directly at `/junction-attendee.apk`.
   - Production Docker containerized and pre-configured for **Railway** deployment.

2. **Attendee Cross-Platform App**:
   - **Option A (Instant Web / PWA App)**: Progressive Web App installable directly on iOS, Android, macOS, and Windows from any browser.
   - **Option B (Native Android APK)**: Pre-compiled standalone release APK distributed via your Railway URL or built via Flutter.

---

## 🚆 Part 1: Deploying to Railway (Step-by-Step)

### Method 1: Deploy via GitHub (Recommended — 2 Minutes)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "feat: railway deployment ready and pwa configured"
   git push origin main
   ```

2. **Open Railway**:
   - Visit [railway.com](https://railway.com) and log in (or sign up with GitHub).
   - Click **"New Project"** -> **"Deploy from GitHub repo"**.
   - Select your `Junction` repository.

3. **Railway Auto-Detects Everything**:
   - Railway will automatically detect the [Dockerfile](file:///c:/Users/nihal/OneDrive/Desktop/Junction/Junction/Dockerfile) and [railway.json](file:///c:/Users/nihal/OneDrive/Desktop/Junction/Junction/railway.json).
   - Click **Deploy**.

4. **Generate Public Domain**:
   - In your Railway dashboard, click on your service.
   - Go to the **Settings** tab.
   - Under **Networking**, click **Generate Domain** (e.g. `junction-production.up.railway.app`).
   - Your live app is now active with HTTPS and worldwide CDN routing!

---

### Method 2: Deploy using Railway CLI

If you have the [Railway CLI](https://docs.railway.com/guides/cli) installed:

```bash
# Login to Railway
railway login

# Link or create new project
railway init

# Deploy directly from your machine
railway up
```

---

## 📱 Part 2: Installing the App on Any Device Anywhere

Once your Railway backend is live (e.g. `https://your-junction-domain.up.railway.app`):

### 1. Android Phones & Tablets (PWA or APK)
- **Instant Web Install (PWA)**:
  1. Open the live URL in Google Chrome.
  2. Tap the **"Add Junction to Home screen"** prompt banner at the bottom (or tap the 3 dots `⋮` -> **"Install app"**).
  3. The app will install as a native full-screen app on your phone.
- **Direct APK Install**:
  1. Download the APK directly from your deployment: `https://your-junction-domain.up.railway.app/junction-attendee.apk`
  2. Tap the downloaded file to install.

### 2. iPhones & iPads (iOS)
1. Open the live URL in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add**. The Junction app icon will appear on your home screen and run full-screen like a native iOS app.

### 3. Windows / Mac / Linux PC
1. Open the live URL in **Google Chrome** or **Microsoft Edge**.
2. Click the **Install** icon in the address bar (or menu -> **"Install Junction..."**).
3. The app launches in its own dedicated window with full offline caching.

---

## 🛠️ Part 3: Rebuilding the Mobile App (Flutter)

If you modify the Flutter attendee mobile app inside `attendee_flutter_app/`:

### Building Android APK:
```bash
cd attendee_flutter_app
flutter pub get
flutter build apk --release
```
The output APK will be at `attendee_flutter_app/build/app/outputs/flutter-apk/app-release.apk`.
Copy it to `public/junction-attendee.apk` to update the downloadable web link:
```bash
cp build/app/outputs/flutter-apk/app-release.apk ../public/junction-attendee.apk
```

### Building Flutter Web App:
```bash
cd attendee_flutter_app
flutter build web --release
```

---

## 🩺 Verifying Health & Status

Once deployed on Railway, test the health check endpoint:
```
GET https://<your-domain>.up.railway.app/api/health
```
Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-09-07T12:40:00.000Z",
  "service": "junction-app",
  "version": "1.0.0"
}
```
