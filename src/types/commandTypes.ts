// Command types for Maestro test viewer

export type VisibilityCondition = {
  textRegex: string;
  optional: boolean;
};

export type Condition = {
  visible?: VisibilityCondition;
  notVisible?: VisibilityCondition;
};

export type AssertConditionCommand = {
  condition: Condition;
  optional: boolean;
};

export type SwipeCommand = {
  direction: "LEFT" | "RIGHT" | "UP" | "DOWN";
  duration: number;
  optional: boolean;
};

export type TapOnElementCommand = {
  selector: {
    textRegex: string;
    optional: boolean;
  };
  retryIfNoChange: boolean;
  waitUntilVisible: boolean;
  longPress: boolean;
  optional: boolean;
};

export type DefineVariablesCommand = {
  env: Record<string, string>;
  optional: boolean;
};

export type LaunchAppCommand = {
  appId: string;
  launchArguments?: Record<string, string>;
  optional: boolean;
};

export type StopAppCommand = {
  appId: string;
  optional: boolean;
};

export type OpenLinkCommand = {
  link: string;
  autoVerify: boolean;
  browser: boolean;
  optional: boolean;
};

export type TapOnElement = {
  selector: {
    textRegex: string;
    optional: boolean;
  };
  retryIfNoChange: boolean;
  waitUntilVisible: boolean;
  longPress: boolean;
  optional: boolean;
};

export type ApplyConfigurationCommand = {
  config: {
    appId: string;
  };
  optional: boolean;
};

export type ScriptCondition = {
  scriptCondition: string;
};

export type RunFlowCommand = {
  flow?: string;
  optional: boolean;
  commands?: Command[]; // For nested commands
  sourceDescription?: string; // Source file path
  condition?: Condition | ScriptCondition;
  config?: {
    appId: string;
    [key: string]: string;
  };
};

export type InputTextCommand = {
  text: string;
  optional: boolean;
};

export type WaitForAnimationCommand = {
  optional: boolean;
};

export type ScrollUntilVisibleCommand = {
  element: {
    textRegex: string;
  };
  direction: "UP" | "DOWN";
  optional: boolean;
};

export type EnhancedScrollUntilVisibleCommand = {
  selector: {
    textRegex: string;
    optional: boolean;
  };
  direction: "UP" | "DOWN" | "LEFT" | "RIGHT";
  scrollDuration: string;
  visibilityPercentage: number;
  timeout: string;
  centerElement: boolean;
  optional: boolean;
  visibilityPercentageNormalized: number;
};

export type SetAirplaneModeCommand = {
  value: "Enable" | "Disable";
  optional: boolean;
};

export type WaitForAnimationToEndCommand = {
  optional: boolean;
};

// Command type with optional properties for each command type
export type Command = {
  assertConditionCommand?: AssertConditionCommand;
  swipeCommand?: SwipeCommand;
  tapOnElementCommand?: TapOnElementCommand;
  applyConfigurationCommand?: ApplyConfigurationCommand;
  runFlowCommand?: RunFlowCommand;
  inputTextCommand?: InputTextCommand;
  waitForAnimationCommand?: WaitForAnimationCommand;
  scrollUntilVisibleCommand?: ScrollUntilVisibleCommand;
  defineVariablesCommand?: DefineVariablesCommand;
  launchAppCommand?: LaunchAppCommand;
  openLinkCommand?: OpenLinkCommand;
  tapOnElement?: TapOnElement;
  stopAppCommand?: StopAppCommand;
  scrollUntilVisible?: EnhancedScrollUntilVisibleCommand;
  setAirplaneModeCommand?: SetAirplaneModeCommand;
  waitForAnimationToEndCommand?: WaitForAnimationToEndCommand;
};

export type StackTrace = {
  classLoaderName: string;
  methodName: string;
  fileName: string;
  lineNumber: number;
  nativeMethod: boolean;
  className: string;
};

export type Metadata = {
  status: "COMPLETED" | "FAILED" | "SKIPPED";
  timestamp: number;
  duration: number;
  error?: {
    message: string;
    hierarchyRoot?: object;
    stackTrace?: StackTrace[];
  };
};

export type CommandEntry = {
  command: Command;
  metadata: Metadata;
}; 