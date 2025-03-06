# macOS Code Signing and Notarization Guide

This guide explains how to set up code signing and notarization for your macOS Electron application, both locally and in GitHub Actions.

## Prerequisites

1. An Apple Developer account ($99/year)
2. A Developer ID Application certificate
3. An app-specific password for your Apple ID

## Local Development Setup

### 1. Create a Developer ID Application Certificate

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list)
2. Click the "+" button to create a new certificate
3. Select "Developer ID Application" and follow the instructions
4. Download the certificate and double-click to install it in your Keychain

### 2. Export the Certificate as a .p12 File

1. Open Keychain Access
2. Find your Developer ID Application certificate
3. Right-click and select "Export"
4. Choose the .p12 format and set a password
5. Save the file in a secure location

### 3. Create a .env File

Create a `.env` file in the root of your project with the following variables:

```
APPLE_ID=your.apple.id@example.com
APPLE_ID_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=your-team-id
APPLE_TEAM_NAME=Your Team Name
CSC_LINK=base64-encoded-certificate
CSC_KEY_PASSWORD=your-certificate-password
```

To get the base64-encoded certificate, run:

```bash
base64 -i path/to/your/certificate.p12 | pbcopy
```

This will copy the encoded certificate to your clipboard, which you can then paste into the `.env` file.

### 4. Verify Your Setup

Run the following command to verify your local setup:

```bash
npm run check:signing
```

## GitHub Actions Setup

To enable code signing and notarization in GitHub Actions, you need to add the following secrets to your repository:

1. Go to your GitHub repository
2. Click on "Settings" tab
3. Click on "Secrets and variables" in the left sidebar
4. Click on "Actions"
5. Click on "New repository secret" button
6. Add the following secrets:

- `APPLE_ID`: Your Apple ID email
- `APPLE_ID_PASSWORD`: Your app-specific password
- `APPLE_TEAM_ID`: Your Apple Developer Team ID
- `APPLE_TEAM_NAME`: Your Apple Developer Team name
- `CSC_LINK`: Base64-encoded Developer ID Application certificate
- `CSC_KEY_PASSWORD`: Password for your certificate

You can run the following command to get guidance on setting up these secrets:

```bash
npm run check:github-secrets
```

## Troubleshooting

If you encounter code signing issues, you can use the following commands to debug and fix them:

```bash
# Debug code signing issues
npm run debug:signing

# Fix common code signing issues
npm run fix:signing
```

### Common Issues

1. **"code has no resources but signature indicates they must be present"**

   - This error occurs when the app bundle doesn't have any resources
   - Run `npm run fix:signing` to fix this issue

2. **"adhoc signature"**

   - This means the app is not properly signed with your Developer ID
   - Check that your environment variables are correctly set

3. **Notarization fails**
   - Make sure your app is properly signed
   - Check that your Apple ID and app-specific password are correct
   - Ensure your app has the correct entitlements

## Resources

- [Apple's Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Electron Forge Code Signing](https://www.electronforge.io/guides/code-signing)
- [Electron Notarization](https://www.electronjs.org/docs/latest/tutorial/notarization)
