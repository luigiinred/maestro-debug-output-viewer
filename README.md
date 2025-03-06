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

### Publishing to GitHub Releases

To publish the application to GitHub Releases:

1. Make sure you have a GitHub token with the `repo` scope:

   - Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens)
   - Create a new token with the `repo` scope
   - Add the token to your `.env` file as `GITHUB_TOKEN=your_token_here`

2. Build and publish the application:

```bash
npm run publish
```

This will:

- Build the application for all configured platforms
- Create a new GitHub release (as a draft by default)
- Upload the build artifacts to the release

You can customize the publishing behavior in the `forge.config.cjs` file under the `publishers` section.

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

## GitHub Actions Setup

To enable automatic building and signing of the application in GitHub Actions, you need to set up the following secrets in your GitHub repository:

1. `APPLE_ID`: Your Apple ID email
2. `APPLE_ID_PASSWORD`: Your app-specific password for your Apple ID
3. `APPLE_TEAM_ID`: Your Apple Developer Team ID
4. `APPLE_TEAM_NAME`: Your Apple Developer Team Name
5. `CSC_LINK`: Base64-encoded certificate (.p12 file)
6. `CSC_KEY_PASSWORD`: Password for the certificate
7. `KEYCHAIN_PASSWORD`: A temporary password for the keychain in GitHub Actions (can be any secure string)
8. `GITHUB_TOKEN`: Your GitHub personal access token with `repo` scope (for publishing releases)

### Setting up the KEYCHAIN_PASSWORD secret

The `KEYCHAIN_PASSWORD` is used by the GitHub Actions workflow to create a temporary keychain for storing your code signing certificate during the build process. This can be any secure string you choose, as it's only used temporarily during the build.

1. Go to your GitHub repository
2. Click on "Settings" > "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Name: `KEYCHAIN_PASSWORD`
5. Value: Create a secure password (e.g., a random string)
6. Click "Add secret"

## License

[MIT](LICENSE)
