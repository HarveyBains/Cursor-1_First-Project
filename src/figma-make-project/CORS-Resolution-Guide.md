# CORS Resolution Guide for Firebase Integration

## Problem
You're experiencing CORS (Cross-Origin Resource Sharing) errors when trying to connect to Firebase from the Figma preview environment:

```
Fetch API cannot load https://firestore.googleapis.com/... due to access control checks.
```

## Root Cause
The Figma preview domain is not authorized in your Firebase project's settings, causing the browser to block requests due to CORS policy.

## Solutions

### Option 1: Add Authorized Domain (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mylocations-figmaapp`
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add the Figma preview domain (it should look like `*.figma.com` or the specific subdomain)

### Option 2: Use Firebase Emulator (Development)
For local development, you can use Firebase emulators:
```bash
npm install -g firebase-tools
firebase login
firebase init emulators
firebase emulators:start
```

### Option 3: Deploy to Authorized Domain
Deploy your app to a domain that's already authorized:
- `mylocations-figmaapp.firebaseapp.com` (automatically authorized)
- `localhost` (automatically authorized for development)

### Option 4: Use App with Graceful Degradation (Current Implementation)
The app now includes:
- **Local Storage Fallback**: Automatically switches to local storage when Firebase is unavailable
- **Connection Status Indicator**: Shows when using limited connectivity mode
- **Manual Refresh**: Refresh button to retry Firebase connection
- **Data Backup**: All changes are backed up locally

## Current App Behavior

### When Firebase Works:
- ✅ Real-time synchronization across devices
- ✅ Google Authentication
- ✅ Cloud storage and backup

### When CORS Blocks Firebase:
- ⚠️ Local storage mode (single device)
- ⚠️ No authentication required
- ⚠️ Manual refresh to retry cloud connection
- ✅ All location features still work
- ✅ Data is preserved locally

## Status Indicators
- 🟢 **Connected**: Full Firebase functionality
- 🟡 **Limited**: Using local storage due to CORS
- 🔴 **Offline**: No internet connection

## Testing the Fix
1. Add your domain to Firebase authorized domains
2. Refresh the app
3. The warning indicator should disappear
4. Google sign-in should work normally
5. Locations should sync in real-time

## Immediate Workaround
The app currently works in "local mode" when Firebase is blocked:
- All features are available
- Data is stored locally in your browser
- Manual refresh button attempts to reconnect to Firebase
- Once CORS is resolved, data will sync to the cloud

Your locations are safe and the app is fully functional even with the CORS restriction.