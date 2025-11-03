🧩 React Native Project Setup Guide
⚙️ Environment Requirements

Node.js: 18.20.8

npm: 10.8.2

React Native: (auto-detected from package.json)

Xcode (for iOS builds)

Android Studio (for Android builds)

🚀 Step 1. Clone the Repository
git clone https://github.com/quocthinhlk/vfcomr.git
cd vfcomr

📦 Step 2. Install Dependencies
npm install

🍎 Step 3. Install iOS Pods
cd ios
pod install
cd ..

▶️ Step 4. Run the Project
🔹 Run on iOS
npx react-native run-ios

🔹 Run on Android
npm run android

🧹 CLEAR CACHE & REBUILD
🧱 iOS

To clear cache and rebuild iOS:

rm -rf ios/build ios/Pods
cd ios
pod install
cd ..

🤖 Android

To clean Android build cache:

cd android
./gradlew clean
cd ..


To build release APK:

cd android
./gradlew assembleRelease --no-build-cache


Output file:

android/app/build/outputs/apk/release/app-release.apk
