package cusbg.prankweb.pjtools.sequence;

import cusbg.prankweb.pjtools.util.ProteinUtils;
import org.biojava.nbio.structure.Chain;
import org.biojava.nbio.structure.Group;

public class SequenceAdapter {

    public static String fromChain(Chain chain) {
        StringBuilder result = new StringBuilder();
        for (Group group : chain.getAtomGroups()) {
            if (!ProteinUtils.isPolymer(group)) {
                continue;
            }
            String code = group.getChemComp().getOneLetterCode().toUpperCase();
            if (code.equals("?")) {
                continue;
            }
            result.append(code);
        }
        return result.toString();
    }

}
