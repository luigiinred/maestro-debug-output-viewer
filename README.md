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

## License

[MIT](LICENSE)
