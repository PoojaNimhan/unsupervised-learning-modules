import { runKmeansUntilStable } from "./clustering.js";

function selectSeedIndices(pointCount, k) {
  const rawIndices = Array.from({ length: k }, (_, index) =>
    (index * (pointCount - 1)) / Math.max(k - 1, 1)
  );
  const used = new Set();
  return rawIndices.map((value) => {
    let index = Math.round(value);
    while (used.has(index) && index < pointCount - 1) index += 1;
    while (used.has(index) && index > 0) index -= 1;
    used.add(index);
    return index;
  });
}

function selectInitialCenters(points, k) {
  const sortedPoints = [...points].sort((left, right) =>
    left[0] === right[0] ? left[1] - right[1] : left[0] - right[0]
  );
  return selectSeedIndices(sortedPoints.length, k).map((index) => sortedPoints[index]);
}

export function compareScaledPropertyGroupings(properties) {
  const points = properties.map((property) => [
    property.living_area_unit,
    property.price_unit,
  ]);
  return [2, 3].map((k) => {
    const steps = runKmeansUntilStable(points, selectInitialCenters(points, k));
    const finalStep = steps.at(-1);
    const groupSizes = Array.from({ length: k }, (_, index) =>
      finalStep.assignments.filter((assignment) => assignment === index).length
    );
    return {
      k,
      assignments: finalStep.assignments,
      centers: finalStep.centersAfter,
      groupSizes,
    };
  });
}
