import { defineCustomElement } from "vue";

import ClusterFoodSorter from "./components/ClusterFoodSorter.ce.vue";
import ClusterAdFuzzyExplorer from "./components/ClusterAdFuzzyExplorer.ce.vue";
import ClusterAdHierarchyExplorer from "./components/ClusterAdHierarchyExplorer.ce.vue";
import ClusterKmeansDistanceExercise from "./components/ClusterKmeansDistanceExercise.ce.vue";
import ClusterKmeansStepper from "./components/ClusterKmeansStepper.ce.vue";
import ClusterDensityComparison from "./components/ClusterDensityComparison.ce.vue";
import ClusterRealEstateExplorer from "./components/ClusterRealEstateExplorer.ce.vue";
import ClusterSnackMap from "./components/ClusterSnackMap.ce.vue";

const definitions = [
  ["cluster-food-sorter", ClusterFoodSorter],
  ["cluster-snack-map", ClusterSnackMap],
  ["cluster-real-estate-explorer", ClusterRealEstateExplorer],
  ["cluster-kmeans-stepper", ClusterKmeansStepper],
  ["cluster-kmeans-distance-exercise", ClusterKmeansDistanceExercise],
  ["cluster-ad-fuzzy-explorer", ClusterAdFuzzyExplorer],
  ["cluster-ad-hierarchy-explorer", ClusterAdHierarchyExplorer],
  ["cluster-density-comparison", ClusterDensityComparison],
];

for (const [tagName, component] of definitions) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, defineCustomElement(component));
  }
}
