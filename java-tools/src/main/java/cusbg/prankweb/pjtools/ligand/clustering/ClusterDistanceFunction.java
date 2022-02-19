package cusbg.prankweb.pjtools.ligand.clustering;

public class ClusterDistanceFunction {

    @FunctionalInterface
    public interface ElementDistance<T> {

        double apply(T left, T right);

    }

    /**
     * Return and find distance that is either smaller than the threshold
     * or minimum distance.
     */
    public static <T> Clustering.Distance<T> minDistanceOrThreshold(
            ElementDistance<T> distanceFunction, double threshold) {
        return (Clustering.Cluster<T> left, Clustering.Cluster<T> right) -> {
            double result = Double.POSITIVE_INFINITY;
            for (T leftItem : left.getItems()) {
                for (T rightItem : right.getItems()) {
                    result = Math.min(
                            distanceFunction.apply(leftItem, rightItem),
                            result);
                }
                if (result < threshold) {
                    return result;
                }
            }
            return result;
        };
    }

}
