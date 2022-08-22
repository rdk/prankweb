package cusbg.prankweb.pjtools.cli;

import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;

public class CliCommandParser {

    private static final Logger LOG =
            LoggerFactory.getLogger(CliCommandParser.class);

    private final String command;

    private final String description;

    private final Options options;

    public CliCommandParser(
            String command,
            String description,
            Options options
    ) {
        this.command = command;
        this.description = description;
        this.options = options;
    }

    public CommandLine parse(String[] args) {
        if (Arrays.asList(args).contains("-h")) {
            printHelp(options);
            return null;
        }
        CommandLineParser parser = new DefaultParser();
        try {
            return parser.parse(options, args);
        } catch (ParseException ex) {
            LOG.error("Invalid command line arguments.");
            LOG.info("Reason: " + ex.getMessage());
            return null;
        }
    }

    private void printHelp(Options options) {
        HelpFormatter formatter = new HelpFormatter();
        formatter.printHelp(command, description, options, "", true);
    }

    public String getCommand() {
        return command;
    }

    public String getDescription() {
        return description;
    }

}
