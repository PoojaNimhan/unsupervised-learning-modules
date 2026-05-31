function toMatrixRow(point) {
  return Array.isArray(point) ? point.map(Number) : [Number(point)];
}

export function absoluteDistanceBreakdown(value, center) {
  const pointValue = Number(value);
  const centerValue = Number(center);
  const delta = pointValue - centerValue;
  return {
    delta,
    distance: Math.abs(delta),
  };
}

export function euclideanDistanceBreakdown(point, center) {
  const pointRow = toMatrixRow(point);
  const centerRow = toMatrixRow(center);
  const deltas = pointRow.map((value, index) => value - centerRow[index]);
  const squares = deltas.map((value) => value ** 2);
  const sumSquares = squares.reduce((sum, value) => sum + value, 0);
  return {
    deltas,
    squares,
    sumSquares,
    distance: Math.sqrt(sumSquares),
  };
}

export function nearestCenterIndexForPoint(point, centers) {
  return centers.reduce(
    (best, center, index) => {
      const distance = euclideanDistanceBreakdown(point, center).distance;
      if (distance < best.distance) {
        return { index, distance };
      }
      return best;
    },
    { index: 0, distance: Number.POSITIVE_INFINITY }
  ).index;
}

export function buildDistanceMatrix(points, centers) {
  return points.map((point, pointIndex) => ({
    pointIndex,
    point: toMatrixRow(point),
    distances: centers.map((center, centerIndex) => ({
      centerIndex,
      center: toMatrixRow(center),
      distance: euclideanDistanceBreakdown(point, center).distance,
    })),
  }));
}
