package cusbg.prankweb.pjtools.cli;

public interface CliCommand {

    CliCommandParser getCliCommandParser();

    void execute(String[] argsAsString) throws Exception;

}
