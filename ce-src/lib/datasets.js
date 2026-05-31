import adsFuzzy from "@generated/datasets/ads_fuzzy.json";
import adsHierarchical from "@generated/datasets/ads_hierarchical.json";
import densityExamples from "@generated/datasets/density_examples.json";
import foods from "@generated/datasets/foods.json";
import neighborhoodPlanner from "@generated/datasets/neighborhood_planner.json";
import realEstateBroker from "@generated/datasets/real_estate_broker.json";
import realEstateClusterDemo from "@generated/datasets/real_estate_cluster_demo.json";
import schoolyard1d from "@generated/datasets/schoolyard_1d.json";
import schoolyard2d from "@generated/datasets/schoolyard_2d.json";
import schoolyardK32d from "@generated/datasets/schoolyard_k3_2d.json";
import snacks from "@generated/datasets/snacks.json";

export class DatasetLoaderError extends Error {}

const DATASETS = {
  ads_fuzzy: adsFuzzy,
  ads_hierarchical: adsHierarchical,
  density_examples: densityExamples,
  foods,
  neighborhood_planner: neighborhoodPlanner,
  real_estate_broker: realEstateBroker,
  real_estate_cluster_demo: realEstateClusterDemo,
  schoolyard_1d: schoolyard1d,
  schoolyard_2d: schoolyard2d,
  schoolyard_k3_2d: schoolyardK32d,
  snacks,
};

const REQUIRED_COLUMNS = {
  ads_fuzzy: ["ad_id", "display_name_de", "tech_score", "style_score", "ad_group", "role"],
  ads_hierarchical: [
    "ad_id",
    "display_name_de",
    "interest_x",
    "interest_y",
    "theme_family",
  ],
  density_examples: ["point_id", "x", "y", "pattern", "is_noise"],
  foods: [
    "food_name",
    "display_name_de",
    "emoji",
    "calories_kcal",
    "sugar_g",
    "fat_g",
    "fiber_g",
  ],
  snacks: ["snack_name", "display_name_de", "emoji", "sugar_g", "fat_g", "example_type"],
  real_estate_broker: [
    "listing_id",
    "area_sqm",
    "rooms",
    "condition_score",
    "price_eur",
    "description",
    "is_outlier",
  ],
  real_estate_cluster_demo: [
    "property_name",
    "living_area_unit",
    "price_unit",
    "intended_pattern",
    "is_outlier",
  ],
  neighborhood_planner: ["house_id", "living_area_unit", "price_unit", "is_outlier"],
  schoolyard_1d: ["visitor_id", "position_x"],
  schoolyard_2d: ["visitor_id", "x", "y"],
  schoolyard_k3_2d: ["visitor_id", "x", "y"],
};

export function loadDataset(name) {
  const dataset = DATASETS[name];
  if (!dataset) {
    throw new DatasetLoaderError(`Unknown dataset '${name}'.`);
  }
  const requiredColumns = REQUIRED_COLUMNS[name] ?? [];
  const missingColumns = requiredColumns.filter((column) => !(column in dataset[0]));
  if (missingColumns.length > 0) {
    throw new DatasetLoaderError(
      `Dataset '${name}' is missing required column(s): ${missingColumns.join(", ")}`
    );
  }
  return dataset.map((row) => ({ ...row }));
}
