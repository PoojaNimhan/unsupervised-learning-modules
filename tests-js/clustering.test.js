import {
  assignPointsToNearestCenter,
  recomputeCenters,
  runKmeansStep,
} from "../ce-src/lib/clustering.js";
import {
  advanceKmeansIteration,
  assignKmeansStep,
  initializeKmeansStepper,
  recomputeKmeansStep,
} from "../ce-src/lib/kmeans-stepper.js";
import {
  absoluteDistanceBreakdown,
  buildDistanceMatrix,
  euclideanDistanceBreakdown,
  nearestCenterIndexForPoint,
} from "../ce-src/lib/kmeans-distance.js";
import { loadDataset } from "../ce-src/lib/datasets.js";
import { buildDensityComparison, summarizeDensityPatterns } from "../ce-src/lib/module4-density.js";
import { buildFuzzyPlotPoints, fuzzyMembershipFromFocus } from "../ce-src/lib/module4-fuzzy.js";
import { buildAdHierarchy, groupsAtCutPercent } from "../ce-src/lib/module4-hierarchy.js";

test("assigns points to the nearest center", () => {
  expect(
    assignPointsToNearestCenter(
      [
        [1, 1],
        [9, 9],
        [2, 2],
      ],
      [
        [0, 0],
        [10, 10],
      ]
    )
  ).toEqual([0, 1, 0]);
});

test("recomputes centers as cluster means", () => {
  expect(
    recomputeCenters(
      [
        [1, 1],
        [3, 3],
        [10, 10],
      ],
      [0, 0, 1],
      [
        [0, 0],
        [9, 9],
      ]
    )
  ).toEqual([
    [2, 2],
    [10, 10],
  ]);
});

test("runs one full k-means step", () => {
  const step = runKmeansStep(
    [
      [1, 1],
      [2, 2],
      [9, 9],
    ],
    [
      [0, 0],
      [10, 10],
    ]
  );

  expect(step.assignments).toEqual([0, 0, 1]);
  expect(step.centersAfter).toEqual([
    [1.5, 1.5],
    [9, 9],
  ]);
});

test("advances through the explicit stepper stages", () => {
  const points = [
    [1, 1],
    [2, 2],
    [9, 9],
  ];
  const initialized = initializeKmeansStepper(
    [
      [0, 0],
      [10, 10],
    ],
    { k: 2, presetKey: "test" }
  );
  const assigned = assignKmeansStep(initialized, points);
  const recomputed = recomputeKmeansStep(assigned, points);

  expect(assigned.stage).toBe("assigned");
  expect(assigned.lastAction).toBe("assign");
  expect(recomputed.stage).toBe("recomputed");
  expect(recomputed.lastAction).toBe("recompute");

  const iterated = advanceKmeansIteration(recomputed);
  expect(iterated.iteration).toBe(2);
  expect(iterated.stage).toBe("initialized");
  expect(iterated.lastAction).toBe("next_iteration");
});

test("keeps the converged state visible but still lets the student advance", () => {
  const stable = {
    stage: "recomputed",
    lastAction: "recompute",
    iteration: 2,
    k: 2,
    presetKey: "stable",
    currentCenters: [
      [2, 2],
      [10, 10],
    ],
    previousCenters: [
      [2, 2],
      [10, 10],
    ],
    assignments: [0, 0, 1],
    converged: true,
    history: [],
  };

  const iterated = advanceKmeansIteration(stable);
  expect(iterated.iteration).toBe(3);
  expect(iterated.stage).toBe("initialized");
  expect(iterated.lastAction).toBe("next_iteration");
});

test("records per-center movement deltas in the iteration history", () => {
  const points = [
    [1, 1],
    [3, 3],
    [10, 10],
  ];
  const initialized = initializeKmeansStepper(
    [
      [0, 0],
      [9, 9],
    ],
    { k: 2, presetKey: "test" }
  );
  const assigned = assignKmeansStep(initialized, points);
  const recomputed = recomputeKmeansStep(assigned, points);

  expect(recomputed.history).toHaveLength(1);
  expect(recomputed.history[0].iteration).toBe(1);
  expect(recomputed.history[0].centers).toEqual([
    [2, 2],
    [10, 10],
  ]);
  expect(recomputed.history[0].deltas[0]).toBeCloseTo(Math.hypot(2, 2), 5);
  expect(recomputed.history[0].deltas[1]).toBeCloseTo(Math.hypot(1, 1), 5);
  expect(recomputed.converged).toBe(false);

  const advanced = advanceKmeansIteration(recomputed);
  const reassigned = assignKmeansStep(advanced, points);
  const stable = recomputeKmeansStep(reassigned, points);

  expect(stable.converged).toBe(true);
  expect(stable.history).toHaveLength(2);
  expect(stable.history[1].deltas).toEqual([0, 0]);
});

test("assigns revised k=3 boundary points to the nearest of three centers", () => {
  expect(
    assignPointsToNearestCenter(
      [
        [1, 1],
        [2, 2],
        [3, 1],
        [5, 5],
        [6, 4],
        [8, 8],
        [9, 10],
        [11, 9],
      ],
      [
        [1, 1],
        [5, 5],
        [10, 10],
      ]
    )
  ).toEqual([0, 0, 0, 1, 1, 2, 2, 2]);
});

test("computes a one-dimensional absolute distance breakdown", () => {
  expect(absoluteDistanceBreakdown(10, 6)).toEqual({
    delta: 4,
    distance: 4,
  });
});

test("computes a two-dimensional Euclidean distance breakdown", () => {
  expect(euclideanDistanceBreakdown([3, 3], [2, 2])).toEqual({
    deltas: [1, 1],
    squares: [1, 1],
    sumSquares: 2,
    distance: Math.sqrt(2),
  });
});

test("finds the nearest center for a point", () => {
  expect(
    nearestCenterIndexForPoint(
      [9, 10],
      [
        [2, 2],
        [10, 10],
      ]
    )
  ).toBe(1);
});

test("builds a distance matrix for one center", () => {
  expect(
    buildDistanceMatrix(
      [
        [3, 4],
        [0, 0],
      ],
      [[0, 0]]
    )
  ).toEqual([
    {
      pointIndex: 0,
      point: [3, 4],
      distances: [
        {
          centerIndex: 0,
          center: [0, 0],
          distance: 5,
        },
      ],
    },
    {
      pointIndex: 1,
      point: [0, 0],
      distances: [
        {
          centerIndex: 0,
          center: [0, 0],
          distance: 0,
        },
      ],
    },
  ]);
});

test("builds a distance matrix with stable row and column ordering up to five centers", () => {
  const matrix = buildDistanceMatrix(
    [
      [1, 1],
      [2, 3],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ]
  );

  expect(matrix).toHaveLength(2);
  expect(matrix[0].pointIndex).toBe(0);
  expect(matrix[1].pointIndex).toBe(1);
  expect(matrix[0].distances.map((item) => item.centerIndex)).toEqual([0, 1, 2, 3, 4]);
  expect(matrix[1].distances[0].distance).toBeCloseTo(Math.sqrt(13));
  expect(matrix[1].distances[4].distance).toBeCloseTo(Math.sqrt(13));
});

test("shifts fuzzy memberships toward tech as the focus slider increases", () => {
  expect(fuzzyMembershipFromFocus(25)).toEqual({ tech: 35, style: 65 });
  expect(fuzzyMembershipFromFocus(75)).toEqual({ tech: 65, style: 35 });

  const points = buildFuzzyPlotPoints(loadDataset("ads_fuzzy"), 100);
  const hybrid = points.find((point) => point.role === "hybrid");
  expect(hybrid.tech_score).toBeGreaterThan(hybrid.style_score);
});

test("changes hierarchical group counts deterministically as the cut increases", () => {
  const hierarchy = buildAdHierarchy(loadDataset("ads_hierarchical"));
  const lowCut = groupsAtCutPercent(hierarchy, 10);
  const highCut = groupsAtCutPercent(hierarchy, 80);

  expect(lowCut.groups.length).toBeGreaterThan(highCut.groups.length);
  expect(lowCut.groups[0].labels[0]).toBe("Sportschuh-Anzeige");
  expect(highCut.groups.length).toBeGreaterThanOrEqual(2);
});

test("distinguishes compact, chain, and noise points in the density comparison", () => {
  const rows = loadDataset("density_examples");
  const points = buildDensityComparison(rows);
  const summary = summarizeDensityPatterns(rows);

  expect(summary).toEqual({ compact: 4, chain: 6, noise: 1 });
  expect(points.find((point) => point.pattern === "noise")?.density_cluster).toBe("Rauschen");
  expect(points.find((point) => point.pattern === "chain")?.center_cluster).toBe("links");
});
