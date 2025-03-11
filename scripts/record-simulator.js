#!/usr/bin/env node

/**
 * iOS Simulator Video Recording Utility
 *
 * This script provides a way to start and stop video recording of the iOS Simulator
 * without needing to manually terminate with Ctrl+C.
 *
 * Usage:
 *   - Start recording: node record-simulator.js start [output_file.mov]
 *   - Stop recording: node record-simulator.js stop
 *
 * Example:
 *   node record-simulator.js start appvideo.mov
 *   node record-simulator.js stop
 */

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Path to store the recording process ID
const PID_FILE = path.join(os.tmpdir(), "simulator-recording-pid.txt");

// Start recording function
function startRecording(outputFile) {
  // Default output file if not provided
  const videoFile = outputFile || "simulator-recording.mov";

  console.log(`Starting iOS Simulator recording to: ${videoFile}`);

  // Start the recording process
  const recordProcess = spawn(
    "xcrun",
    ["simctl", "io", "booted", "recordVideo", videoFile],
    {
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
    }
  );

  // Store the process ID for later termination
  fs.writeFileSync(PID_FILE, recordProcess.pid.toString());

  console.log(`Recording started with PID: ${recordProcess.pid}`);
  console.log('Run "node record-simulator.js stop" to stop recording');

  // Unref the process to allow the script to exit while recording continues
  recordProcess.unref();
}

// Stop recording function
function stopRecording() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = fs.readFileSync(PID_FILE, "utf8").trim();

      console.log(`Stopping recording process with PID: ${pid}`);

      // Send SIGINT signal (equivalent to Ctrl+C)
      process.kill(parseInt(pid), "SIGINT");

      // Remove the PID file
      fs.unlinkSync(PID_FILE);

      console.log("Recording stopped successfully");
    } else {
      console.error("No active recording found. PID file does not exist.");
    }
  } catch (error) {
    console.error("Error stopping recording:", error.message);

    // If the process doesn't exist anymore, clean up the PID file
    if (error.code === "ESRCH" && fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
      console.log("PID file cleaned up");
    }
  }
}

// Check if simulator is running
function checkSimulatorRunning() {
  try {
    const output = execSync(
      "xcrun simctl list devices | grep Booted"
    ).toString();
    return output.includes("Booted");
  } catch (error) {
    return false;
  }
}

// Main function
function main() {
  const command = process.argv[2];

  if (!command) {
    console.error("Please specify a command: start or stop");
    process.exit(1);
  }

  switch (command.toLowerCase()) {
    case "start":
      if (!checkSimulatorRunning()) {
        console.error(
          "No booted iOS Simulator found. Please start a simulator first."
        );
        process.exit(1);
      }

      const outputFile = process.argv[3];
      startRecording(outputFile);
      break;

    case "stop":
      stopRecording();
      break;

    default:
      console.error('Unknown command. Use "start" or "stop"');
      process.exit(1);
  }
}

// Run the script
main();
