package cz.siret.protein.utils.command.filterstrcuture;

import cz.siret.protein.utils.action.chainselector.ChainSelector;
import cz.siret.protein.utils.adapter.StructureAdapter;
import cz.siret.protein.utils.command.Command;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.Option;
import org.apache.commons.cli.Options;
import org.biojava.nbio.structure.Chain;
import org.biojava.nbio.structure.Structure;
import org.biojava.nbio.structure.io.FileConvert;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class FilterStructure extends Command {

    private static final Logger LOG =
            LoggerFactory.getLogger(FilterStructure.class);

    private FilterStructureArgs configuration;

    @Override
    public String getName() {
        return "filter-structure";
    }

    @Override
    public String getDescription() {
        return "Filter given structure.";
    }

    @Override
    public void execute(String[] args) throws IOException {
        CommandLine commandLine = parseArgs(args);
        if (commandLine == null) {
            LOG.error("Can't parse command line arguments.");
            return;
        }
        loadConfiguration(commandLine);
        Structure structure = loadStructure();
        Map<String, Chain> chains = selectChains(structure);
        writeStructureFile(chains.values());
    }

    private CommandLine parseArgs(String[] args) {
        Options options = new Options();
        options.addOption(null, "input", true, "Input structure file.");
        options.addOption(null, "output", true, "Output structure file.");
        options.addOption(Option.builder()
                .longOpt("chains")
                .argName("property=value")
                .desc("Comma separated list of chains.")
                .numberOfArgs(2)
                .valueSeparator('=')
                .build());
        return parseCommandLine(options, args);
    }

    private void loadConfiguration(CommandLine commandLine) {
        configuration = new FilterStructureArgs();
        configuration.structureFile = new File(
                commandLine.getOptionValue("input"));
        configuration.outputFile = new File(
                commandLine.getOptionValue("output"));
        if (commandLine.hasOption("chains")) {
            configuration.chains = new ArrayList<>();
            String chains = commandLine.getOptionValue("chains");
            for (String chain : chains.split(",")) {
                if (chain.isEmpty() || chain.isBlank()) {
                    continue;
                }
                configuration.chains.add(chain);
            }
            if (configuration.chains.isEmpty()) {
                configuration.chains = null;
            }
        } else {
            configuration.chains = null;
        }
    }

    private Structure loadStructure() throws IOException {
        StructureAdapter structureAdapter = new StructureAdapter();
        return structureAdapter.loadStructure(configuration.structureFile);
    }

    /**
     * We use chain id to identify the chains.
     */
    private Map<String, Chain> selectChains(Structure structure) {
        Map<String, Chain> result = new HashMap<>();
        if (configuration.chains == null) {
            for (Chain chain : structure.getChains()) {
                result.put(chain.getId(), chain);
            }
        } else {
            ChainSelector chainSelector = new ChainSelector();
            for (String chainName : configuration.chains) {
                chainSelector.selectByPdbName(structure, chainName).forEach(
                        chain -> result.put(chain.getId(), chain));
            }
        }
        return result;
    }

    private void writeStructureFile(Collection<Chain> chains)
            throws IOException {
        StringBuilder pdbBuilder = new StringBuilder();
        for (Chain chain : chains) {
            pdbBuilder.append(FileConvert.toPDB(chain));
        }
        try (FileWriter writer = new FileWriter(configuration.outputFile)) {
            writer.write(pdbBuilder.toString());
        }
    }

}
