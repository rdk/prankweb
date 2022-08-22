package cusbg.prankweb.pjtools.structure;

import org.biojava.nbio.structure.Structure;
import org.biojava.nbio.structure.io.CifFileReader;
import org.biojava.nbio.structure.io.LocalPDBDirectory;
import org.biojava.nbio.structure.io.PDBFileReader;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.zip.GZIPInputStream;

public class StructureAdapter {

    private static final String PDB_EXTENSION = ".pdb";

    private static final String PDB_GZ_EXTENSION = ".pdb.gz";

    private static final String ENT_GZ_EXTENSION = ".ent.gz";

    private static final String CIF_EXTENSION = ".cif";

    private static final String CIF_GZ_EXTENSION = ".cif.gz";

    public static Structure fromFile(File structureFile) throws IOException {
        return (new StructureAdapter()).loadStructure(structureFile);
    }

    protected Structure loadStructure(File structureFile) throws IOException {
        String fileName = structureFile.getName().toLowerCase();
        if (fileName.endsWith(PDB_EXTENSION)
                || fileName.endsWith(PDB_GZ_EXTENSION)
                || fileName.endsWith(ENT_GZ_EXTENSION)) {
            return loadPdbFile(structureFile);
        } else if (fileName.endsWith(CIF_EXTENSION)
                || fileName.endsWith(CIF_GZ_EXTENSION)) {
            return loadCifFile(structureFile);
        } else {
            throw new IOException(
                    "Unknown file format: " + structureFile.getName());
        }
    }

    protected Structure loadPdbFile(File pdbFile) throws IOException {
        PDBFileReader reader = new PDBFileReader();
        reader.setFetchBehavior(LocalPDBDirectory.FetchBehavior.LOCAL_ONLY);
        try (InputStream inputStream = openStream(pdbFile)) {
            return reader.getStructure(inputStream);
        }
    }

    protected Structure loadCifFile(File pdbFile) throws IOException {
        CifFileReader reader = new CifFileReader();
        reader.setFetchBehavior(LocalPDBDirectory.FetchBehavior.LOCAL_ONLY);
        try (InputStream inputStream = openStream(pdbFile)) {
            return reader.getStructure(inputStream);
        }
    }

    protected InputStream openStream(File file) throws IOException {
        if (file.getName().endsWith(".gz")) {
            return new GZIPInputStream(new FileInputStream(file));
        } else {
            return new FileInputStream(file);
        }
    }

}
