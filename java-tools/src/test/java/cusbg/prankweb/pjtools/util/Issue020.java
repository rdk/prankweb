package cusbg.prankweb.pjtools.util;

import cusbg.prankweb.pjtools.TestUtils;
import cusbg.prankweb.pjtools.structure.BindingSiteSelector;
import cusbg.prankweb.pjtools.ligand.LigandSelector;
import org.biojava.nbio.structure.Structure;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

public class Issue020 {

    /**
     * This test was introduced as execution with the given input data
     * with over 45 minutes processing.
     */
    @Test
    @Timeout(value = 15)
    public void issue020For1gac() throws Exception {
        Structure structure = TestUtils.fetchPdb("7bv2");
        BindingSiteSelector.getBindingSites(
                structure, LigandSelector.selectLigands(structure));
    }

    /**
     * Another performance test with a lots of small molecules and
     * multiple models.
     */
    @Test
    @Timeout(value = 10)
    public void issue020For19hc() throws Exception {
        Structure structure = TestUtils.fetchPdb("19hc");
        BindingSiteSelector.getBindingSites(
                structure, LigandSelector.selectLigands(structure));
    }

}
