package cusbg.prankweb.pjtools.ligand.clustering;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * We start with each element in its own cluster.
 * Then for each cluster we try to merge it with all others.
 * <p>
 * We start by wrapping up the elements into NamedClusters. One cluster
 * per element. Next we put the clusters into grid. Next we start merging
 * the clusters. But we do not try to merge every cluster with all other
 * clusters but instead only with clusters that are in close cells.
 * <p>
 * This gives us better performance.
 */
public class GridBasedClustering<T> implements Clustering<T> {

    private static class NamedCluster<T> extends Clustering.Cluster<T> {

        Integer id;

        /**
         * Original cluster position set by the first element inserted
         * into the cluster.
         */
        final double[] position;

        /**
         * I.e. all named clusters that are part of this cluster. When
         * merging clusters together we also need to update IDs af all
         * other clusters.
         */
        List<NamedCluster<T>> parts = new ArrayList<>();

        public NamedCluster(int id, T element, double[] position) {
            super(element);
            this.id = id;
            this.position = position;
            this.parts.add(this);
        }

        public void mergeWith(NamedCluster<T> other) {
            this.items.addAll(other.items);
            // Propagate to all members of the other cluster.
            List<NamedCluster<T>> otherParts = other.parts;
            for (NamedCluster<T> part : otherParts) {
                part.id = this.id;
                part.items = this.items;
                part.parts = this.parts;
            }
            this.parts.addAll(otherParts);
        }

    }

    private static class Cell<T> {

        final int x;

        final int y;

        final int z;

        public Cell(int x, int y, int z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }

        List<NamedCluster<T>> content = new ArrayList<>();

    }

    private final Position<T> positionGetter;

    private List<NamedCluster<T>> clusters;

    private List<Cell<T>> cells;

    public GridBasedClustering(Position<T> positionGetter) {
        this.positionGetter = positionGetter;
    }

    @Override
    public List<Cluster<T>> cluster(
            List<T> elements, double minDist, Distance<T> distanceFunction) {
        wrapElementsToClusters(elements);
        double resolution = minDist * 2;
        createGrid(resolution);
        mergeClusters(minDist, distanceFunction);
        return collectClusters();
    }

    private void wrapElementsToClusters(List<T> elements) {
        this.clusters = new ArrayList<>(elements.size());
        int counter = 0;
        for (T element : elements) {
            var position = this.positionGetter.apply(element);
            if (position.length != 3) {
                throw new RuntimeException(
                        "This algorithm works only with 3D data.");
            }
            this.clusters.add(new NamedCluster<>(++counter, element, position));
        }
    }

    private void createGrid(double resolution) {
        this.cells = new ArrayList<>();
        for (NamedCluster<T> cluster : clusters) {
            Cell<T> cell = getCell(cluster.position, resolution);
            cell.content.add(cluster);
        }
    }

    /**
     * Return a cell for given position.
     */
    private Cell<T> getCell(double[] position, double resolution) {
        int x = (int) (position[0] / resolution);
        int y = (int) (position[1] / resolution);
        int z = (int) (position[2] / resolution);
        for (Cell<T> cell : cells) {
            if (cell.x == x && cell.y == y && cell.z == z) {
                return cell;
            }
        }
        Cell<T> result = new Cell<>(x, y, z);
        this.cells.add(result);
        return result;
    }

    private void mergeClusters(double minDist, Distance<T> distanceFunction) {
        for (Cell<T> cell : cells) {
            for (Cell<T> other : getNeighbourCell(cell)) {
                mergeCells(minDist, distanceFunction, cell, other);
            }
        }
    }

    /**
     * For each cell return all cells in distance of one.
     */
    private List<Cell<T>> getNeighbourCell(Cell<T> center) {
        List<Cell<T>> result = new ArrayList<>(8);
        for (Cell<T> cell : cells) {
            if (Math.abs(cell.x - center.x) <= 1
                    && Math.abs(cell.y - center.y) <= 1
                    && Math.abs(cell.z - center.z) <= 1) {
                result.add(cell);
            }
        }
        return result;
    }

    private void mergeCells(
            double minDist, Distance<T> distanceFunction,
            Cell<T> left, Cell<T> right) {
        // There can be multiple instances of the same clusters in a
        // cell (right) in order to avoid testing duplicities
        // in testing we keep tract of what we have already tried to merge.
        Set<Integer> tested = new HashSet<>();
        for (NamedCluster<T> leftItem : left.content) {
            tested.clear();
            for (NamedCluster<T> rightItem : right.content) {
                if (Objects.equals(leftItem.id, rightItem.id)) {
                    // Same cluster.
                    continue;
                }
                if (tested.contains(rightItem.id)) {
                    // We have already tried to merge those two clusters,
                    // and it was not working.
                    continue;
                }
                tested.add(rightItem.id);
                double distance = distanceFunction.apply(leftItem, rightItem);
                if (distance <= minDist) {
                    leftItem.mergeWith(rightItem);
                }
            }
        }
    }

    private List<Cluster<T>> collectClusters() {
        Map<Integer, Cluster<T>> result = new HashMap<>();
        for (NamedCluster<T> cluster : clusters) {
            if (result.containsKey(cluster.id)) {
                continue;
            }
            result.put(cluster.id, new Cluster<T>(cluster.items));
        }
        return new ArrayList<>(result.values());
    }

}
