# Maestro Viewer

A desktop application for viewing and analyzing Maestro debug output.

## Features

- Browse and view Maestro debug output files
- Analyze test results
- View detailed logs and screenshots

## Development

### Prerequisites

- Node.js (v16 or later)
- npm (v7 or later)
- ImageMagick (for icon generation)

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Running in Development Mode

To run the application in development mode:

```bash
npm run electron:dev
```

This will start both the Vite development server and Electron.

### Building the Application

To build the application for production:

```bash
# Generate app icons (requires ImageMagick)
npm run create-icons

# Build the application
npm run electron:build
```

The built application will be available in the `release` directory.

## Mac App

To build the Mac app:

1. Make sure you have ImageMagick installed:

```bash
brew install imagemagick
```

2. Generate the app icons:

```bash
npm run create-icons
```

3. Build the Mac app:

```bash
npm run electron:build
```

The built Mac app will be available in the `release` directory.

## GitHub Actions Code Signing

This project uses Electron Forge for building and signing the application. To enable code signing in GitHub Actions, you need to set up the following secrets in your GitHub repository:

### For macOS Code Signing and Notarization

1. **APPLE_CERTIFICATE_P12**: Base64-encoded Apple Developer certificate (p12 file)

   ```bash
   base64 -i path/to/certificate.p12 | pbcopy
   ```

2. **APPLE_CERTIFICATE_PASSWORD**: Password for the p12 certificate

3. **KEYCHAIN_PASSWORD**: Password for the temporary keychain created during the build
   (Can be any secure string you choose)

4. **APPLE_ID**: Your Apple Developer account email

5. **APPLE_ID_PASSWORD**: Your app-specific password for your Apple ID
   (Generate at https://appleid.apple.com/account/manage)

6. **APPLE_TEAM_ID**: Your Apple Developer Team ID
   (Find in your Apple Developer account)

7. **APPLE_TEAM_NAME**: Your Apple Developer Team Name
   (Find in your Apple Developer account)

### Setting Up Secrets in GitHub

1. Go to your GitHub repository
2. Click on "Settings" > "Secrets and variables" > "Actions"
3. Click "New repository secret" and add each of the secrets listed above

### Local Development with Code Signing

For local development with code signing:

1. Create a `.env` file based on `.env.example` with your signing credentials
2. Run the check:signing script to verify your environment:
   ```bash
   npm run check:signing
   ```
3. Build the app with Electron Forge:
   ```bash
   npm run make
   ```

The signed app will be available in the `out/make` directory.

## License

[MIT](LICENSE)
