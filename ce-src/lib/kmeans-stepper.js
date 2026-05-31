import { assignPointsToNearestCenter, recomputeCenters } from "./clustering.js";

function asCenterMatrix(centers) {
  return centers.map((center) => (Array.isArray(center) ? [...center] : [Number(center)]));
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
  const updatedCenters = recomputeCenters(
    points,
    stepperState.assignments,
    stepperState.currentCenters
  );
  return {
    ...stepperState,
    lastAction: "recompute",
    previousCenters: stepperState.currentCenters.map((center) => [...center]),
    currentCenters: updatedCenters,
    converged: JSON.stringify(stepperState.currentCenters) === JSON.stringify(updatedCenters),
    stage: "recomputed",
  };
}

export function advanceKmeansIteration(stepperState) {
  if (stepperState.stage !== "recomputed") {
    throw new Error("A new iteration can only begin after recomputing centers.");
  }
  if (stepperState.converged) {
    throw new Error("The stepper has already converged and cannot advance.");
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
