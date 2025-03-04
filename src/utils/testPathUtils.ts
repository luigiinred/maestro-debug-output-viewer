interface TestPathInfo {
  flowName: string;
  directory: string;
}

export function extractTestPathInfo(testId: string): TestPathInfo {
  // Default values
  const defaultResult: TestPathInfo = {
    flowName: '',
    directory: ''
  };

  if (!testId) return defaultResult;

  try {
    console.log('Attempting to extract info from testId:', testId);
    
    // Extract the flow name from the commands-(flowname).json pattern
    const flowNameMatch = testId.match(/commands-\((.*?)\)\.json$/);
    if (!flowNameMatch) {
      console.warn('No flow name match found for testId:', testId);
      return defaultResult;
    }

    const flowName = flowNameMatch[1];
    console.log('Extracted flow name:', flowName);
    
    // Extract the directory (everything up to the commands file)
    const lastSlashIndex = testId.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      console.warn('No directory path found in testId:', testId);
      return defaultResult;
    }

    const directory = testId.substring(0, lastSlashIndex);
    console.log('Extracted directory:', directory);

    return {
      flowName,
      directory
    };
  } catch (error) {
    console.error('Error parsing test path:', error);
    return defaultResult;
  }
} 