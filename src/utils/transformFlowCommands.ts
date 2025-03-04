import { Command, CommandEntry, RunFlowCommand } from '../types/commandTypes';

/**
 * Checks if a command entry is valid
 */
function isValidCommandEntry(cmd: any): cmd is CommandEntry {
  return cmd 
    && typeof cmd === 'object'
    && cmd.command 
    && typeof cmd.command === 'object'
    && cmd.metadata
    && typeof cmd.metadata === 'object';

}

    const findExecutedCommandIndex = (allCommands: CommandEntry[], command: Command): number => {
        return allCommands.findIndex(c => 
            JSON.stringify(c.command) === JSON.stringify(command)
        );
    }

const processRunCommands: (commandsToProcess: Command[], allCommands: CommandEntry[]) => CommandEntry[] = (commandsToProcess, allCommands) => {
    const result: CommandEntry[] = [];

    for (const command of commandsToProcess) {
        if (command.runFlowCommand) {
            // Find the executed runFlowCommand
            const executedRunFlowCommand = findExecutedCommandIndex(allCommands, command);

            if (executedRunFlowCommand == -1) {
                console.log('executedRunFlowCommand not found', command);
                continue;
            }

            const executedRunFlowCommandEntry = allCommands[executedRunFlowCommand];


            const executedCommands = processRunCommands(command.runFlowCommand.commands, allCommands);
            if (executedCommands.length > 0) {
                result.push({...executedRunFlowCommandEntry, command: { ...command, runFlowCommand: { ...command.runFlowCommand, commands: executedCommands } } });
            }
            continue;
        }

        const executedCommands = findExecutedCommandIndex(allCommands, command);


        if (executedCommands !== -1) {  
            result.push(allCommands[executedCommands]);
            allCommands.splice(executedCommands, 1);
        }
    }

    return result;
}

    function processCommands(cmds: CommandEntry[]): CommandEntry[] {
        const result: CommandEntry[] = [];
    
        // Deep clone the commands array to avoid modifying the original
        const remainingCmds: CommandEntry[] = JSON.parse(JSON.stringify(cmds));
    
        for (let currentIndex = 0; currentIndex < remainingCmds.length; currentIndex++) {
            const cmd = remainingCmds[currentIndex];
      
            // Skip invalid commands
            if (!isValidCommandEntry(cmd)) {
                console.warn('Skipping invalid command entry:', cmd);
                continue;
            }
        
            if (!cmd.command.runFlowCommand) {
                result.push(cmd);
                continue;
            }

      
            const runFlow = cmd.command.runFlowCommand;

            if (!runFlow.commands || !Array.isArray(runFlow.commands)) {
                result.push(cmd);
                continue;
            }

            const executedCommands = processRunCommands(runFlow.commands, remainingCmds);
            if (executedCommands.length > 0) {
                result.push({...cmd, command: { ...cmd.command, runFlowCommand: { ...runFlow, commands: executedCommands } } });
            }



        }

        return result;
    }
    


/**
 * Transforms the command structure by replacing planned commands with actual executed commands
 * @param commands Array of command executions
 * @returns Transformed array with actual execution data
 */
export function transformFlowCommands(commands: CommandEntry[]): CommandEntry[] {
    // Handle invalid input
    if (!Array.isArray(commands)) {
        console.warn('transformFlowCommands received invalid input:', commands);
        return [];
    }

    return processCommands(commands, 0);
}

