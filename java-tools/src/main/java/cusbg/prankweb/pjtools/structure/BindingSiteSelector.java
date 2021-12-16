package cusbg.prankweb.pjtools.structure;

import cusbg.prankweb.pjtools.util.ProteinUtils;
import cusbg.prankweb.pjtools.util.StructureUtils;
import cusbg.prankweb.pjtools.ligand.Ligand;
import org.biojava.nbio.structure.Atom;
import org.biojava.nbio.structure.Group;
import org.biojava.nbio.structure.ResidueNumber;
import org.biojava.nbio.structure.Structure;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class BindingSiteSelector {

    /**
     * Atoms in this distance to the ligands are considered to be
     * a part of the binding site.
     */
    private static final double BINDING_SITE_DISTANCE = 4.0;

    public static Set<ResidueNumber> getBindingSites(
            Structure structure, List<Ligand> ligands) {
        Set<ResidueNumber> result = new HashSet<>();
        ligands.stream()
                .map(ligand -> getBindingSite(structure, ligand))
                .forEach(result::addAll);
        return result;
    }

    public static Set<ResidueNumber> getBindingSite(
            Structure structure, Ligand ligand) {
        List<Atom> structureAtoms = ProteinUtils.polymerAtoms(
                StructureUtils.getAllAtoms(structure));
        List<Atom> bindingSite = StructureUtils.selectInProximity(
                structureAtoms, ligand.atoms(), BINDING_SITE_DISTANCE);
        return bindingSite.stream()
                .map(Atom::getGroup)
                .map(Group::getResidueNumber)
                .collect(Collectors.toSet());
    }

}
