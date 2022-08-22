package cusbg.prankweb.pjtools;

import cusbg.prankweb.pjtools.cli.CliCommand;
import cusbg.prankweb.pjtools.cli.CliCommandParser;
import cusbg.prankweb.pjtools.command.exec.ExecCommand;
import cusbg.prankweb.pjtools.command.info.InfoCommand;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.List;

public class Executor {

    private static final Logger LOG = LoggerFactory.getLogger(Executor.class);

    public static final List<CliCommand> COMMANDS = Arrays.asList(
            new InfoCommand(),
            new ExecCommand()
    );

    public CliCommand getCommand(String[] args) {
        if (args.length == 0) {
            return null;
        }
        String commandName = args[0];
        for (CliCommand command : COMMANDS) {
            CliCommandParser parser = command.getCliCommandParser();
            if (parser.getCommand().equals(commandName)) {
                return command;
            }
        }
        return null;
    }

    public int executeCommand(CliCommand command, String[] args) {
        String[] argsWithoutCommand = Arrays.copyOfRange(args, 1, args.length);
        try {
            command.execute(argsWithoutCommand);
            return 0;
        } catch (Exception ex) {
            LOG.error("Command execution failed.", ex);
            return 1;
        }
    }

}
