package cusbg.prankweb.pjtools.command.info;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class InfoOutputModel {

    /**
     * We store data, indices, sequence, binding ... in linear fashion,
     * so we use this to map those lists to structure.
     */
    public record Region(String name, int start, int end) {

    }

    public final List<String> indices = new ArrayList<>();

    public final List<String> sequence = new ArrayList<>();

    /**
     * Indices of binding sites' residues.
     */
    public final List<Integer> binding = new ArrayList<>();

    public final List<Region> regions = new ArrayList<>();

    /**
     * Under given key stores values per residue.
     */
    public final Map<String, List<Double>> scores = new HashMap<>();

}
