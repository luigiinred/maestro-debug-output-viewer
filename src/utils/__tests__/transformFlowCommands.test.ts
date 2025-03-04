/// <reference types="jest" />
import { transformFlowCommands } from '../transformFlowCommands';
import { CommandEntry } from '../../types/commandTypes';
import inputCommands from './fixtures/input.json';
import expectedOutput from './fixtures/expectedOutput.json';

describe('transformFlowCommands', () => {
  it('should transform commands correctly', () => {
    const result = transformFlowCommands(inputCommands as CommandEntry[]);
    expect(result).toEqual(expectedOutput);
  });
}); 