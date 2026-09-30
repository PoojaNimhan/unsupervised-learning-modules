import { assignPointsToNearestCenter, recomputeCenters } from "./clustering.js";
import { euclideanDistanceBreakdown } from "./kmeans-distance.js";

function asCenterMatrix(centers) {
  return centers.map((center) => (Array.isArray(center) ? [...center] : [Number(center)]));
}

function centerMovementDeltas(previousCenters, currentCenters) {
  return currentCenters.map(
    (center, index) => euclideanDistanceBreakdown(center, previousCenters[index]).distance
  );
}

export function initializeKmeansStepper(initialCenters, { k, presetKey }) {
  const centerMatrix = asCenterMatrix(initialCenters);
  if (centerMatrix.length !== k) {
    throw new Error("The number of initial centers must match k.");
  }
  return {
    stage: "initialized",
    lastAction: "initialize",
    iteration: 1,
    k,
    presetKey,
    currentCenters: centerMatrix,
    previousCenters: null,
    assignments: null,
    converged: false,
    history: [],
  };
}

export function assignKmeansStep(stepperState, points) {
  if (stepperState.stage !== "initialized") {
    throw new Error("Points can only be assigned after initialization.");
  }
  return {
    ...stepperState,
    assignments: assignPointsToNearestCenter(points, stepperState.currentCenters),
    lastAction: "assign",
    stage: "assigned",
  };
}

export function recomputeKmeansStep(stepperState, points) {
  if (stepperState.stage !== "assigned") {
    throw new Error("Centers can only be recomputed after an assignment step.");
  }
  const previousCenters = stepperState.currentCenters.map((center) => [...center]);
  const updatedCenters = recomputeCenters(
    points,
    stepperState.assignments,
    stepperState.currentCenters
  );
  const deltas = centerMovementDeltas(previousCenters, updatedCenters);
  return {
    ...stepperState,
    lastAction: "recompute",
    previousCenters,
    currentCenters: updatedCenters,
    converged: deltas.every((delta) => delta === 0),
    stage: "recomputed",
    history: [
      ...stepperState.history,
      {
        iteration: stepperState.iteration,
        centers: updatedCenters.map((center) => [...center]),
        deltas,
      },
    ],
  };
}

export function advanceKmeansIteration(stepperState) {
  if (stepperState.stage !== "recomputed") {
    throw new Error("A new iteration can only begin after recomputing centers.");
  }
  return {
    ...stepperState,
    iteration: stepperState.iteration + 1,
    lastAction: "next_iteration",
    stage: "initialized",
    previousCenters: null,
    assignments: null,
  };
}
