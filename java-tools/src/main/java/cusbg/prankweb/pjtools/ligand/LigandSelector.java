package cusbg.prankweb.pjtools.ligand;

import cusbg.prankweb.pjtools.util.AtomUtils;
import cusbg.prankweb.pjtools.util.StructureUtils;
import cusbg.prankweb.pjtools.ligand.clustering.ClusterDistanceFunction;
import cusbg.prankweb.pjtools.ligand.clustering.Clustering;
import cusbg.prankweb.pjtools.ligand.clustering.GridBasedClustering;
import org.biojava.nbio.structure.Atom;
import org.biojava.nbio.structure.Group;
import org.biojava.nbio.structure.Structure;

import java.util.List;
import java.util.stream.Collectors;

public class LigandSelector {

    private static final double COVALENT_BOND_SIZE = 1.7;

    public static List<Ligand> selectLigands(Structure structure) {
        List<Group> ligandGroups = StructureUtils.getLigandGroups(structure);
        List<Atom> ligandAtoms = AtomUtils.getAllAtoms(ligandGroups);
        var clusters = detectLigandsByClustering(ligandAtoms);
        var ligandClusters = clusters.stream()
                .map(Clustering.Cluster::getItems)
                .collect(Collectors.toList());
        return createFromAtoms(ligandClusters);
    }

    private static List<Clustering.Cluster<Atom>> detectLigandsByClustering(
            List<Atom> atoms) {
        Clustering<Atom> clustering = new GridBasedClustering<>(Atom::getCoords);
        var distanceFunction = ClusterDistanceFunction.minDistance(
                AtomUtils::atomEuclideanDistance);
        return clustering.cluster(
                atoms, COVALENT_BOND_SIZE, distanceFunction);
    }

    private static List<Ligand> createFromAtoms(List<List<Atom>> ligandGroups) {
        return ligandGroups.stream()
                .map(Ligand::new)
                .collect(Collectors.toList());
    }

}
