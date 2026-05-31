export class ClusteringInputError extends Error {}

function asPointMatrix(values, name) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new ClusteringInputError(`${name} must contain at least one row.`);
  }

  const matrix = values.map((row) => (Array.isArray(row) ? row : [row]).map(Number));
  const width = matrix[0].length;
  if (!width || matrix.some((row) => row.length !== width || row.some(Number.isNaN))) {
    throw new ClusteringInputError(`${name} must be a numeric one- or two-dimensional array.`);
  }
  return matrix;
}

function validateFeatureCount(points, centers) {
  if (points[0].length !== centers[0].length) {
    throw new ClusteringInputError(
      "Points and centers must have the same number of features."
    );
  }
}

function euclideanDistance(point, center) {
  return Math.sqrt(
    point.reduce((sum, value, index) => sum + (value - center[index]) ** 2, 0)
  );
}

export function assignPointsToNearestCenter(points, currentCenters) {
  const pointMatrix = asPointMatrix(points, "points");
  const centerMatrix = asPointMatrix(currentCenters, "currentCenters");
  validateFeatureCount(pointMatrix, centerMatrix);

  return pointMatrix.map((point) => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    centerMatrix.forEach((center, index) => {
      const distance = euclideanDistance(point, center);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  });
}

export function recomputeCenters(points, assignments, currentCenters) {
  const pointMatrix = asPointMatrix(points, "points");
  const centerMatrix = asPointMatrix(currentCenters, "currentCenters");
  validateFeatureCount(pointMatrix, centerMatrix);
  if (!Array.isArray(assignments) || assignments.length !== pointMatrix.length) {
    throw new ClusteringInputError(
      "assignments must contain one cluster index for each point."
    );
  }

  return centerMatrix.map((center, centerIndex) => {
    const assignedPoints = pointMatrix.filter(
      (_, pointIndex) => assignments[pointIndex] === centerIndex
    );
    if (assignedPoints.length === 0) {
      return [...center];
    }
    return center.map(
      (_, featureIndex) =>
        assignedPoints.reduce((sum, point) => sum + point[featureIndex], 0) /
        assignedPoints.length
    );
  });
}

export function runKmeansStep(points, currentCenters) {
  const centersBefore = asPointMatrix(currentCenters, "currentCenters");
  const assignments = assignPointsToNearestCenter(points, centersBefore);
  const centersAfter = recomputeCenters(points, assignments, centersBefore);
  return {
    centersBefore,
    assignments,
    centersAfter,
    converged: JSON.stringify(centersBefore) === JSON.stringify(centersAfter),
  };
}

export function runKmeansUntilStable(points, initialCenters, maxIterations = 20) {
  if (maxIterations < 1) {
    throw new ClusteringInputError("maxIterations must be at least 1.");
  }
  const steps = [];
  let centers = asPointMatrix(initialCenters, "initialCenters");

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const result = runKmeansStep(points, centers);
    steps.push(result);
    if (result.converged) {
      break;
    }
    centers = result.centersAfter;
  }

  return steps;
}
