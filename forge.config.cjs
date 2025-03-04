const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("path");

module.exports = {
  packagerConfig: {
    asar: true,
    osxSign: {
      identity: process.env.APPLE_TEAM_ID
        ? `Developer ID Application: ${process.env.APPLE_TEAM_NAME} (${process.env.APPLE_TEAM_ID})`
        : undefined,
      hardenedRuntime: true,
      entitlements: path.resolve("electron/build/entitlements.mac.plist"),
      entitlementsInherit: path.resolve(
        "electron/build/entitlements.mac.plist"
      ),
      gatekeeperAssess: false,
      "gatekeeper-assess": false,
      type: "distribution",
      platform: "darwin",
      "signature-flags": "library",
      "signature-size": 12000,
      ignore: [
        "/node_modules/.cache",
        "/node_modules/.bin",
        ".git",
        ".github",
        "scripts",
        "docs",
      ],
      preAutoEntitlements: false,
      binaries: [],
      "resource-rules": path.resolve("electron/build/resource-rules.plist"),
    },
    osxNotarize:
      process.env.APPLE_ID &&
      process.env.APPLE_ID_PASSWORD &&
      process.env.APPLE_TEAM_ID
        ? {
            tool: "notarytool",
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_ID_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
          }
        : undefined,
    icon: path.resolve("electron/icons/icon"),
    appBundleId: "com.maestro.viewer",
    appCategoryType: "public.app-category.developer-tools",
    protocols: [
      {
        name: "Maestro Viewer",
        schemes: ["maestro-viewer"],
      },
    ],
    extraResource: [
      path.resolve("assets"),
      path.resolve("electron/build/dummy.txt"),
    ],
    afterCopy: [
      (buildPath, electronVersion, platform, arch, callback) => {
        const fs = require("fs");
        const resourcesPath = path.join(buildPath, "Resources");

        if (!fs.existsSync(resourcesPath)) {
          fs.mkdirSync(resourcesPath, { recursive: true });
        }

        fs.writeFileSync(
          path.join(resourcesPath, "dummy.txt"),
          "This file ensures resources are present for code signing."
        );

        callback();
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {},
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
      config: {
        options: {
          icon: path.resolve("electron/icons/icon.icns"),
        },
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        icon: path.resolve("electron/icons/icon.icns"),
        background: path.resolve("assets/dmg-background.png"),
        format: "ULFO",
      },
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "timmyg",
          name: "maestro-debug-output-viewer",
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
};
