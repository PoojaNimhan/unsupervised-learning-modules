import { DatasetLoaderError, loadDataset } from "../ce-src/lib/datasets.js";
import { buildDensityComparison } from "../ce-src/lib/module4-density.js";
import { compareScaledPropertyGroupings } from "../ce-src/lib/module2-kmeans.js";

test("loads the broker dataset with normalized outlier flags", () => {
  const listings = loadDataset("real_estate_broker");
  expect(listings).toHaveLength(10);
  expect(listings.find((listing) => listing.listing_id === 9).is_outlier).toBe(true);
});

test("raises a clear error for unknown datasets", () => {
  expect(() => loadDataset("missing")).toThrow(DatasetLoaderError);
});

test("builds deterministic k=2 and k=3 comparison groupings", () => {
  const results = compareScaledPropertyGroupings(loadDataset("real_estate_cluster_demo"));
  expect(results.map((result) => result.k)).toEqual([2, 3]);
  expect(results[0].groupSizes).toEqual([2, 3]);
  expect(results[1].groupSizes).toEqual([2, 2, 1]);
});

test("loads the module 4 datasets with the expected contracts", () => {
  const fuzzyAds = loadDataset("ads_fuzzy");
  const hierarchyAds = loadDataset("ads_hierarchical");
  const densityPoints = loadDataset("density_examples");

  expect(fuzzyAds.find((ad) => ad.role === "hybrid")?.display_name_de).toBe("Smartwatch-Anzeige");
  expect(hierarchyAds).toHaveLength(10);
  expect(densityPoints.find((point) => point.pattern === "noise")?.is_noise).toBe(true);
});

test("can hide the density noise point without losing the chain points", () => {
  const densityPoints = loadDataset("density_examples");
  const visible = buildDensityComparison(densityPoints, { showNoise: false });

  expect(visible.some((point) => point.pattern === "noise")).toBe(false);
  expect(visible.filter((point) => point.pattern === "chain")).toHaveLength(6);
});
