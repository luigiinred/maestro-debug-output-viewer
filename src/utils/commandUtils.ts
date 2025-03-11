import { Command } from "../types/commandTypes";

export const getCommandName = (command: Command): string => {
  const key = Object.keys(command)[0];
  return key.replace("Command", "");

  // Ensure command is a valid object
  if (!command || typeof command !== "object") return "Unknown Command";

  if (command.assertConditionCommand) return "Assert";
  if (command.swipeCommand) return "Swipe";
  if (command.tapOnElementCommand)
    return command.tapOnElementCommand?.longPress ? "Long Press" : "Tap";
  if (command.applyConfigurationCommand) return "Apply Configuration";
  if (command.runFlowCommand) return "Run Flow";
  if (command.inputTextCommand) return "Input Text";
  if (command.waitForAnimationCommand) return "Wait for Animation";
  if (command.scrollUntilVisibleCommand) return "Scroll Until Visible";
  // New command types
  if (command.defineVariablesCommand) return "Define Variables";
  if (command.launchAppCommand) return "Launch App";
  if (command.openLinkCommand) return "Open Link";
  if (command.tapOnElement)
    return command.tapOnElement?.longPress ? "Long Press" : "Tap";
  if (command.stopAppCommand) return "Stop App";
  // Added new command types
  if (command.scrollUntilVisible) return "Scroll Until Visible";
  if (command.setAirplaneModeCommand) return "Set Airplane Mode";
  if (command.waitForAnimationToEndCommand) return "Wait for Animation to End";
  if (command.automaticScreenshotCommand) return "Automatic Screenshot";

  // If we get here, log the unknown command type for debugging
  console.warn("Unknown command type:", Object.keys(command)[0]);
  return `Unknown: ${Object.keys(command)[0] || "No Type"}`;
};

export const isUnknownCommand = (command: Command): boolean => {
  // First ensure command is a valid object
  if (!command || typeof command !== "object") return true;

  return (
    !command.assertConditionCommand &&
    !command.swipeCommand &&
    !command.tapOnElementCommand &&
    !command.applyConfigurationCommand &&
    !command.runFlowCommand &&
    !command.inputTextCommand &&
    !command.waitForAnimationCommand &&
    !command.scrollUntilVisibleCommand &&
    // New command types
    !command.defineVariablesCommand &&
    !command.launchAppCommand &&
    !command.openLinkCommand &&
    !command.tapOnElement &&
    !command.stopAppCommand &&
    // Added new command types
    !command.scrollUntilVisible &&
    !command.setAirplaneModeCommand &&
    !command.waitForAnimationToEndCommand &&
    !command.automaticScreenshotCommand
  );
};

export const getCommandDetails = (command: Command): string => {
  // Ensure command is a valid object
  if (!command || typeof command !== "object") return "No details available";

  if (command.assertConditionCommand) {
    const { condition } = command.assertConditionCommand;
    if (condition?.visible)
      return `"${condition.visible.textRegex}" is visible`;
    if (condition?.notVisible)
      return `"${condition.notVisible.textRegex}" is not visible`;
    return "Unknown condition";
  }

  if (command.swipeCommand) {
    const { direction, duration } = command.swipeCommand;
    return `Direction: ${direction}, Duration: ${duration}ms`;
  }

  if (command.tapOnElementCommand) {
    const { selector, longPress } = command.tapOnElementCommand;
    return `${longPress ? "Long press" : "Tap"} on "${
      selector?.textRegex || "Unknown"
    }"`;
  }

  if (command.applyConfigurationCommand) {
    const { config } = command.applyConfigurationCommand;
    return `App ID: ${config?.appId || "Unknown"}`;
  }

  if (command.runFlowCommand) {
    const { flow, sourceDescription, condition } = command.runFlowCommand;
    let details = flow ? `: ${flow}` : "";

    if (sourceDescription) {
      details = details
        ? `${details} (${sourceDescription})`
        : `Source: ${sourceDescription}`;
    }

    // Add condition information if there's no flow path
    if (!flow && condition) {
      if ("scriptCondition" in condition) {
        details = details
          ? `${details} when: ${condition.scriptCondition}`
          : `when: ${condition.scriptCondition}`;
      } else if (condition.visible) {
        details = details
          ? `${details} when: Visible "${condition.visible.textRegex}"`
          : `when: Visible "${condition.visible.textRegex}"`;
      } else if (condition.notVisible) {
        details = details
          ? `${details} when: Not Visible "${condition.notVisible.textRegex}"`
          : `when: Not Visible "${condition.notVisible.textRegex}"`;
      }
    }

    return details || "Unknown flow";
  }

  if (command.inputTextCommand) {
    return `Text: "${command.inputTextCommand.text || "Empty"}"`;
  }

  if (command.waitForAnimationCommand) {
    return "Waiting for animation to complete";
  }

  if (command.scrollUntilVisibleCommand) {
    const { element, direction } = command.scrollUntilVisibleCommand;
    return `Scroll ${direction} until "${
      element?.textRegex || "Unknown"
    }" is visible`;
  }

  // New command types
  if (command.defineVariablesCommand) {
    const variables = Object.keys(
      command.defineVariablesCommand.env || {}
    ).join(", ");
    return `Variables: ${variables || "None"}`;
  }

  if (command.launchAppCommand) {
    return `App ID: ${command.launchAppCommand.appId || "Unknown"}`;
  }

  if (command.openLinkCommand) {
    return `Link: ${command.openLinkCommand.link || "Unknown"}`;
  }

  if (command.tapOnElement) {
    const { selector, longPress } = command.tapOnElement;
    return `${longPress ? "Long press" : "Tap"} on "${
      selector?.textRegex || "Unknown"
    }"`;
  }

  if (command.stopAppCommand) {
    return `App ID: ${command.stopAppCommand.appId || "Unknown"}`;
  }

  // Added new command types
  if (command.scrollUntilVisible) {
    const { selector, direction } = command.scrollUntilVisible;
    return `Scroll ${direction} until "${
      selector?.textRegex || "Unknown"
    }" is visible`;
  }

  if (command.setAirplaneModeCommand) {
    return `Airplane Mode: ${
      command.setAirplaneModeCommand.value ? "Enabled" : "Disabled"
    }`;
  }

  if (command.waitForAnimationToEndCommand) {
    return "Waiting for animation to end";
  }

  if (command.automaticScreenshotCommand) {
    const imagePath = command.automaticScreenshotCommand.imagePath;
    // Extract the filename from the path
    const filename = imagePath.split("/").pop() || "screenshot";
    return `Captured: ${filename}`;
  }

  return "Unknown command type";
};

export const formatTimestamp = (
  timestamp: number | undefined | null,
  index: number,
  startTime: number | null
): string => {
  if (!timestamp) return `Step ${index + 1}`;

  if (startTime) {
    // Calculate relative time from start
    const relativeTimeMs = timestamp - startTime;
    const seconds = Math.floor(relativeTimeMs / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      const paddedSeconds = (seconds % 60).toString().padStart(2, "0");
      return `${minutes.toString().padStart(2, "0")}:${paddedSeconds}`;
    } else {
      return `00:${seconds.toString().padStart(2, "0")}`;
    }
  }

  // Fallback to absolute time
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
