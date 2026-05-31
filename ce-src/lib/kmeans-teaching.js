import { euclideanDistanceBreakdown } from "./kmeans-distance.js";

function formatValue(value) {
  return Number(value);
}

function visitorLabel(visitor) {
  return String(visitor.visitor_id);
}

function sumFormula(values) {
  return values.map(formatValue).join(" + ");
}

export function buildAssignmentConnections(visitors, centers, assignments) {
  if (!assignments || !centers) return [];

  return visitors.map((visitor, index) => {
    const centerIndex = assignments[index];
    const center = centers[centerIndex];
    const breakdown = euclideanDistanceBreakdown([visitor.x, visitor.y], center);
    return {
      visitor,
      center,
      centerIndex,
      distance: breakdown.distance,
    };
  });
}

export function buildCenterTeachingCards(visitors, centers, assignments, previousCenters = null) {
  if (!centers) return [];

  return centers.map((center, index) => {
    const assignedVisitors = assignments
      ? visitors.filter((_, visitorIndex) => assignments[visitorIndex] === index)
      : [];
    const xValues = assignedVisitors.map((visitor) => visitor.x);
    const yValues = assignedVisitors.map((visitor) => visitor.y);
    const previousCenter = previousCenters?.[index] ?? null;

    return {
      center,
      centerIndex: index,
      previousCenter,
      assignedVisitors,
      visitorIds: assignedVisitors.map(visitorLabel),
      xFormula: xValues.length
        ? `mu${index + 1},x = (${sumFormula(xValues)}) / ${xValues.length} = ${formatValue(center[0])}`
        : null,
      yFormula: yValues.length
        ? `mu${index + 1},y = (${sumFormula(yValues)}) / ${yValues.length} = ${formatValue(center[1])}`
        : null,
    };
  });
}
