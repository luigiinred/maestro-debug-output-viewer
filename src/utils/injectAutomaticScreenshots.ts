import { CommandEntry } from "../types/commandTypes";

// Define the FlowImage interface here to match what's in FlowImages.tsx
interface FlowImage {
  path: string;
  url: string;
  timestamp: number;
  filename: string;
}

/**
 * Extracts timestamp from a screenshot filename if available
 * Example: "/Users/timmygarrabrant/.maestro/tests/2024-12-04_115429/screenshot-❌-1733338587084-(deeplinkFollow.yml).png"
 * @param filename The screenshot filename
 * @param defaultTimestamp The default timestamp to use if extraction fails
 * @returns The extracted timestamp or the default timestamp
 */
function extractTimestampFromFilename(
  filename: string,
  defaultTimestamp: number
): number {
  try {
    // Look for a pattern like "-1733338587084-" in the filename
    const matches = filename.match(/-(\d{13})-/);
    if (matches && matches[1]) {
      return parseInt(matches[1], 10);
    }

    // Alternative pattern: "-1733338587084("
    const altMatches = filename.match(/-(\d{13})\(/);
    if (altMatches && altMatches[1]) {
      return parseInt(altMatches[1], 10);
    }

    return defaultTimestamp;
  } catch (error) {
    console.error("Error extracting timestamp from filename:", error);
    return defaultTimestamp;
  }
}

/**
 * Injects automatic screenshot commands into the commands list based on flow images
 * @param commands The original commands list
 * @param flowImages The flow images to inject as commands
 * @returns A new commands list with injected screenshot commands
 */
export function injectAutomaticScreenshots(
  commands: CommandEntry[],
  flowImages: FlowImage[]
): CommandEntry[] {
  if (!flowImages || flowImages.length === 0) {
    return commands;
  }

  // Create a new array to hold all commands
  const result: CommandEntry[] = [...commands];

  // Create screenshot commands from flow images
  const screenshotCommands = flowImages.map((image) => {
    // Try to extract timestamp from filename, fallback to image.timestamp
    const timestamp = extractTimestampFromFilename(image.path, image.timestamp);

    return {
      command: {
        automaticScreenshotCommand: {
          imageUrl: image.url,
          imagePath: image.path,
          optional: false,
        },
      },
      metadata: {
        status: "COMPLETED" as const,
        timestamp: timestamp,
        duration: 0, // Screenshots are instantaneous
      },
    };
  });

  // Combine both arrays and sort by timestamp
  const combinedCommands = [...result, ...screenshotCommands].sort((a, b) => {
    return (a.metadata?.timestamp || 0) - (b.metadata?.timestamp || 0);
  });

  return combinedCommands;
}
