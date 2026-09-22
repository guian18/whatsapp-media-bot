import "./scripts/load-env.js";
const rawBundleId = "com.app.whatsappmediabotcontrol";
const bundleId = rawBundleId.replace(/[-_]/g, ".").replace(/[^a-zA-Z0-9.]/g, "").replace(/\.+/g, ".").replace(/^\.+|\.+$/g, "").toLowerCase().split(".").map((segment) => {
  return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
}).join(".") || "space.manus.app";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;
const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "WhatsApp Media Bot Control",
  appSlug: "whatsapp-media-bot-control",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "",
  scheme: schemeFromBundleId,
  androidPackage: bundleId
};
const config = {
  name: env.appName,
  slug: env.appSlug,
  platforms: ["android"],
  version: "1.0.7",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png"
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    versionCode: 1007,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*"
          }
        ],
        category: ["BROWSABLE", "DEFAULT"]
      }
    ]
  },
  extra: {
    eas: {
      projectId: "878d6c8f-d4eb-4e00-960d-128556f84efd"
    }
  },
  plugins: [
    "expo-router",
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone."
      }
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true
      }
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000"
        }
      }
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
          usesCleartextTraffic: true
        }
      }
    ]
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true
  }
};
var app_config_default = config;
export {
  app_config_default as default
};
