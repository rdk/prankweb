package cz.siret.protein.utils.command.selectbindingsite;

import com.fasterxml.jackson.databind.ObjectMapper;
import cz.siret.protein.utils.action.bindingsiteselector.BindingSiteSelector;
import cz.siret.protein.utils.action.ligandselector.LigandSelector;
import cz.siret.protein.utils.adapter.StructureAdapter;
import cz.siret.protein.utils.command.Command;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.Options;
import org.biojava.nbio.structure.Chain;
import org.biojava.nbio.structure.Group;
import org.biojava.nbio.structure.GroupType;
import org.biojava.nbio.structure.ResidueNumber;
import org.biojava.nbio.structure.Structure;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.util.Collection;
import java.util.Set;

public class SelectBindingSite extends Command {

    private static final Logger LOG =
            LoggerFactory.getLogger(SelectBindingSite.class);

    private SelectBindingSiteArgs configuration;

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String getName() {
        return "select-binding-site";
    }

    @Override
    public String getDescription() {
        return "Select binding site.";
    }

    @Override
    public void execute(String[] args) throws Exception {
        CommandLine commandLine = parseArgs(args);
        if (commandLine == null) {
            LOG.error("Can't parse command line arguments.");
            return;
        }
        loadConfiguration(commandLine);
        Structure structure = loadStructure();
        Set<ResidueNumber> bindingSites = getBindingSites(structure);
        SelectBindingSiteOutput output = createOutput(structure, bindingSites);
        mapper.writeValue(configuration.outputFile, output);
    }

    private CommandLine parseArgs(String[] args) {
        Options options = new Options();
        options.addOption(null, "structure", true, "Structure file.");
        options.addOption(null, "output", true, "Output file.");
        return parseCommandLine(options, args);
    }

    private void loadConfiguration(CommandLine commandLine) {
        configuration = new SelectBindingSiteArgs();
        configuration.structureFile = new File(
                commandLine.getOptionValue("structure"));
        configuration.outputFile = new File(
                commandLine.getOptionValue("output"));
    }


    private Structure loadStructure() throws IOException {
        StructureAdapter structureAdapter = new StructureAdapter();
        return structureAdapter.loadStructure(configuration.structureFile);
    }


    private Set<ResidueNumber> getBindingSites(Structure structure) {
        LigandSelector ligandSelector = new LigandSelector();
        BindingSiteSelector siteSelector = new BindingSiteSelector();
        var ligands = ligandSelector.selectLigands(structure);
        return siteSelector.getBindingSites(structure, ligands);
    }

    private SelectBindingSiteOutput createOutput(
            Structure structure, Collection<ResidueNumber> bindingSites) {
        SelectBindingSiteOutput result = new SelectBindingSiteOutput();
        for (Chain chain : structure.getChains()) {
            if (chain.getAtomGroups(GroupType.AMINOACID).size() <= 0) {
                continue;
            }
            String chainId = getChainId(chain);
            int start = result.indices.size();
            for (Group group : chain.getAtomGroups(GroupType.AMINOACID)) {
                String code = getGroupLetter(group);
                if (code.equals("?")) {
                    continue;
                }
                result.seq.add(code);
                ResidueNumber resNum = group.getResidueNumber();
                result.indices.add(resNum.printFull());
                if (bindingSites != null && bindingSites.contains(resNum)) {
                    result.bindingSites.add(result.indices.size() - 1);
                }
            }
            // The region is defined for given chain.
            result.regions.add(new SelectBindingSiteOutput.Region(
                    chainId, start, result.indices.size() - 1));
        }
        return result;
    }

    /**
     * Return chain or "A" if no chain is provided.
     */
    private String getChainId(Chain chain) {
        String id = chain.getId();
        return id.trim().isEmpty() ? "A" : id;
    }

    private String getGroupLetter(Group group) {
        return group.getChemComp().getOne_letter_code().toUpperCase();
    }

}
