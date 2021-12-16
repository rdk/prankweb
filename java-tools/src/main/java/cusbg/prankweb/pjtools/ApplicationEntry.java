package cusbg.prankweb.pjtools;

import cusbg.prankweb.pjtools.cli.CliCommand;
import cusbg.prankweb.pjtools.cli.CliCommandParser;
import cusbg.prankweb.pjtools.command.info.InfoCommand;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

public class ApplicationEntry {

    private static final Logger LOG =
            LoggerFactory.getLogger(ApplicationEntry.class);

    private static final List<CliCommand> COMMANDS = Arrays.asList(
            new InfoCommand()
    );

    public static void main(String[] args) {
        int result = (new ApplicationEntry()).run(args);
        System.exit(result);
    }

    private int run(String[] args) {
        CliCommand command = getCommand(args);
        if (command == null) {
            LOG.error("No command found!");
            return 1;
        }
        LOG.info("Running command: {}",
                command.getCliCommandParser().getCommand());
        Instant start = Instant.now();
        int result = executeCommand(command, args);
        Duration duration = Duration.between(start, Instant.now());
        LOG.info(String.format("Finished in %02d:%02d:%02d",
                duration.toHours(),
                duration.toMinutesPart(),
                duration.toSecondsPart()));
        return result;
    }

    private CliCommand getCommand(String[] args) {
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

    private int executeCommand(CliCommand command, String[] args) {
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
