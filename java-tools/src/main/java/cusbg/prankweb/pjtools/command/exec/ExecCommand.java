package cusbg.prankweb.pjtools.command.exec;

import cusbg.prankweb.pjtools.Executor;
import cusbg.prankweb.pjtools.cli.CliCommand;
import cusbg.prankweb.pjtools.cli.CliCommandParser;
import org.apache.commons.cli.Options;
import org.apache.commons.lang.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.nio.file.Files;
import java.util.stream.Stream;

public class ExecCommand implements CliCommand {

    private static final Logger LOG =
            LoggerFactory.getLogger(ExecCommand.class);


    private final CliCommandParser cliParser;

    public ExecCommand() {
        var options = new Options();
        options.addOption("i", "input", true, "File with commands.");
        cliParser = new CliCommandParser(
                "exec",
                "Read given file line by line. Each command is executed" +
                        "in a same was as if the program would be executed" +
                        "with given arguments.",
                options
        );
    }

    @Override
    public CliCommandParser getCliCommandParser() {
        return cliParser;
    }

    @Override
    public void execute(String[] argsAsString) throws Exception {
        var args = loadArgs(argsAsString);
        LOG.info("Executing commands from {}", args.commands());
        try (Stream<String> stream = Files.lines(args.commands().toPath())) {
            stream.forEach(this::executeLine);
        }
    }

    private ExecArgs loadArgs(String[] argsAsString) throws Exception {
        var cmdLine = cliParser.parse(argsAsString);
        if (cmdLine == null) {
            throw new Exception("Can't parse command line.");
        }
        File input = new File(cmdLine.getOptionValue("input"));
        return new ExecArgs(input);
    }

    private void executeLine(String line) {
        String[] tokens = StringUtils.split(line);
        Executor executor = new Executor();
        CliCommand command = executor.getCommand(tokens);
        if (command == null) {
            LOG.warn("Ignoring unknown command: {}", line);
            return;
        }
        LOG.info("Executing command: {}", line);
        executor.executeCommand(command, tokens);
    }

}
