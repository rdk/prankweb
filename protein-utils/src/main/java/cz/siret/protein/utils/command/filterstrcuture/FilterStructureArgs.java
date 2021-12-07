package cz.siret.protein.utils.command.filterstrcuture;

import java.io.File;
import java.util.List;

class FilterStructureArgs {

    /**
     * Input structure file.
     */
    public File structureFile;

    /**
     * Output directory.
     */
    public File outputFile;

    /**
     * Chains to select, when null use all available chains.
     */
    public List<String> chains;

}
