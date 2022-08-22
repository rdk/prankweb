package cusbg.prankweb.pjtools.command.info;

import com.fasterxml.jackson.databind.ObjectMapper;
import cusbg.prankweb.pjtools.cli.CliCommand;
import cusbg.prankweb.pjtools.cli.CliCommandParser;
import cusbg.prankweb.pjtools.ligand.Ligand;
import cusbg.prankweb.pjtools.ligand.LigandSelector;
import cusbg.prankweb.pjtools.structure.BindingSiteSelector;
import cusbg.prankweb.pjtools.structure.StructureAdapter;
import org.apache.commons.cli.Options;
import org.biojava.nbio.structure.Atom;
import org.biojava.nbio.structure.Chain;
import org.biojava.nbio.structure.Group;
import org.biojava.nbio.structure.GroupType;
import org.biojava.nbio.structure.ResidueNumber;
import org.biojava.nbio.structure.Structure;
import org.rcsb.cif.CifIO;
import org.rcsb.cif.schema.StandardSchemata;
import org.rcsb.cif.schema.mm.MaQaMetricLocal;
import org.rcsb.cif.schema.mm.MmCifBlock;
import org.rcsb.cif.schema.mm.MmCifFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class InfoCommand implements CliCommand {

    private static final Logger LOG =
            LoggerFactory.getLogger(InfoCommand.class);

    private final CliCommandParser cliParser;

    public InfoCommand() {
        var options = new Options();
        options.addOption("i", "input", true, "Input structure file.");
        options.addOption("o", "output", true, "Output JSON file.");
        cliParser = new CliCommandParser(
                "structure-info",
                "Produce file with information about the structure.",
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
        Structure structure = loadStructure(args);
        MmCifFile mmCifFile = loadMmCifFile(args);
        InfoOutputModel model = createModel(structure, mmCifFile);
        saveOutput(args, model);
    }

    private InfoArgs loadArgs(String[] argsAsString) throws Exception {
        var cmdLine = cliParser.parse(argsAsString);
        if (cmdLine == null) {
            throw new Exception("Can't parse command line.");
        }
        File input = new File(cmdLine.getOptionValue("input"));
        File output = new File(cmdLine.getOptionValue("output"));
        return new InfoArgs(input, output);
    }

    private Structure loadStructure(InfoArgs args) throws IOException {
        return StructureAdapter.fromFile(args.input());
    }

    private MmCifFile loadMmCifFile(InfoArgs args) throws IOException {
        String fileName = args.input().getName().toLowerCase();
        if (fileName.endsWith(".cif")) {
            return CifIO.readFromPath(args.input().toPath())
                    .as(StandardSchemata.MMCIF);
        } else {
            // If structure is not mmCif file we just ignore this step.
            return null;
        }
    }

    private InfoOutputModel createModel(Structure structure, MmCifFile mmCif) {
        InfoOutputModel result = new InfoOutputModel();
        Set<ResidueNumber> binding = selectBindingSites(structure);
        Set<String> visited = new HashSet<>();
        for (Chain chain : structure.getChains()) {
            if (!shouldProcessChain(chain)) {
                continue;
            }
            // We have issue with 2EXT where java-tools produces:
            // {"name":"A","start":0,"end":62}
            // {"name":"B","start":63,"end":128}
            // {"name":"C","start":129,"end":194}
            // {"name":"B","start":195,"end":195}
            // {"name":"B","start":196,"end":196}
            // {"name":"B","start":197,"end":197}
            // As a solution we ignore the second version of the chain.
            String chainId = getChainPdbName(chain);
            if (visited.contains(chainId)) {
                continue;
            }
            visited.add(chainId);
            addChainInformation(binding, chain, chainId, result);
        }
        var maQaMetric = loadMaQaMetric(mmCif);
        addDataToModel(result, maQaMetric, "plddt", 0);
        return result;
    }

    /**
     * True if chain contains some AA data.
     */
    private boolean shouldProcessChain(Chain chain) {
        return chain.getAtomGroups(GroupType.AMINOACID).size() > 0;
    }

    private String getChainPdbName(Chain chain) {
        String id = chain.getName();
        return id.trim().isEmpty() ? "A" : id;
    }

    private Set<ResidueNumber> selectBindingSites(Structure structure) {
        Set<ResidueNumber> result = new HashSet<>();
        for (Ligand ligand : LigandSelector.selectLigands(structure)) {
            result.addAll(BindingSiteSelector.getBindingSite(structure, ligand));
        }
        return result;
    }

    private void addChainInformation(
            Set<ResidueNumber> binding, Chain chain, String chainId,
            InfoOutputModel model) {
        int startIndex = model.indices.size();
        for (Group group : chain.getAtomGroups(GroupType.AMINOACID)) {
            String groupCode = getGroupCode(group);
            if (groupCode == null) {
                groupCode = "X";
            }
            model.indices.add(group.getResidueNumber().printFull());
            model.sequence.add(groupCode);
            if (binding.contains(group.getResidueNumber())) {
                model.binding.add(model.indices.size() - 1);
            }
            for (Atom atom : group.getAtoms()) {
                atom.getTempFactor();
            }
        }
        int endIndex = model.indices.size() - 1;
        var region = new InfoOutputModel.Region(chainId, startIndex, endIndex);
        model.regions.add(region);
    }

    private String getGroupCode(Group group) {
        String code = group.getChemComp().getOneLetterCode();
        if ("?".equals(code)) {
            return null;
        } else {
            return code.toLowerCase().toUpperCase();
        }
    }

    private Map<String, Double> loadMaQaMetric(MmCifFile mmCif) {
        if (mmCif == null) {
            return null;
        }
        MaQaMetricLocal metric = null;
        for (MmCifBlock block : mmCif.getBlocks()) {
            var maqa = block.getMaQaMetricLocal();
            if (maqa == null) {
                continue;
            }
            metric = maqa;
            break;
        }
        if (metric == null) {
            return null;
        }
        var chains = metric.getLabelAsymId().values().toList();
        var seq = metric.getLabelSeqId().values().toArray();
        var values = metric.getMetricValue().values().toArray();
        Map<String, Double> result = new HashMap<>();
        for (int index = 0; index < seq.length; index++) {
            String key = chains.get(index) + "_" + seq[index];
            result.put(key, values[index]);
        }
        return result;
    }

    private void addDataToModel(
            InfoOutputModel model,
            Map<String, Double> residueBasedValues,
            String name, double defaultValue) {
        if (residueBasedValues == null) {
            return;
        }
        boolean reportedMissing = false;
        List<Double> values = new ArrayList<>(model.indices.size());
        for (String index : model.indices) {
            if (residueBasedValues.containsKey(index)) {
                values.add(residueBasedValues.get(index));
            } else {
                if (!reportedMissing) {
                    LOG.info("Missing '{}' value.", name);
                }
                reportedMissing = true;
                values.add(defaultValue);
            }
        }
        model.scores.put(name, values);
    }

    private void saveOutput(InfoArgs args, InfoOutputModel model) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            mapper.writeValue(args.output(), model);
        } catch (IOException ex) {
            LOG.error("Can't save JSON output file.", ex);
        }
    }

}
