package cusbg.prankweb.pjtools;

import cusbg.prankweb.pjtools.cli.CliCommand;
import cusbg.prankweb.pjtools.cli.CliCommandParser;
import cusbg.prankweb.pjtools.command.exec.ExecCommand;
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


    public static void main(String[] args) {
        int result = (new ApplicationEntry()).run(args);
        System.exit(result);
    }

    private int run(String[] args) {
        Executor executor = new Executor();
        CliCommand command = executor.getCommand(args);
        if (command == null) {
            LOG.error("No command found!");
            return 1;
        }
        LOG.info("Running command: {}",
                command.getCliCommandParser().getCommand());
        Instant start = Instant.now();
        int result = executor.executeCommand(command, args);
        Duration duration = Duration.between(start, Instant.now());
        LOG.info(String.format("Finished in %02d:%02d:%02d",
                duration.toHours(),
                duration.toMinutesPart(),
                duration.toSecondsPart()));
        return result;
    }



}
