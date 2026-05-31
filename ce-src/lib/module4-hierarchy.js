function centroidOf(cluster, rows) {
  const members = cluster.memberIndexes.map((index) => rows[index]);
  const sums = members.reduce(
    (accumulator, row) => {
      accumulator.x += row.interest_x;
      accumulator.y += row.interest_y;
      return accumulator;
    },
    { x: 0, y: 0 }
  );
  return [sums.x / members.length, sums.y / members.length];
}

function clusterDistance(left, right, rows) {
  const [leftX, leftY] = centroidOf(left, rows);
  const [rightX, rightY] = centroidOf(right, rows);
  return Math.hypot(leftX - rightX, leftY - rightY);
}

function sortIndexes(memberIndexes) {
  return [...memberIndexes].sort((left, right) => left - right);
}

export function buildAdHierarchy(rows) {
  let nextId = rows.length;
  const clusters = rows.map((row, index) => ({
    id: index,
    label: row.display_name_de,
    memberIndexes: [index],
  }));
  const activeClusters = [...clusters];
  const merges = [];

  while (activeClusters.length > 1) {
    let bestPair = null;
    for (let leftIndex = 0; leftIndex < activeClusters.length - 1; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < activeClusters.length; rightIndex += 1) {
        const left = activeClusters[leftIndex];
        const right = activeClusters[rightIndex];
        const distance = clusterDistance(left, right, rows);
        const candidate = {
          distance,
          left,
          right,
          sortKey: `${Math.min(left.id, right.id)}-${Math.max(left.id, right.id)}`,
        };
        if (
          !bestPair ||
          distance < bestPair.distance - 1e-9 ||
          (Math.abs(distance - bestPair.distance) <= 1e-9 && candidate.sortKey < bestPair.sortKey)
        ) {
          bestPair = candidate;
        }
      }
    }

    const merged = {
      id: nextId,
      memberIndexes: sortIndexes([
        ...bestPair.left.memberIndexes,
        ...bestPair.right.memberIndexes,
      ]),
    };
    nextId += 1;
    merges.push({
      step: merges.length + 1,
      id: merged.id,
      distance: Number(bestPair.distance.toFixed(2)),
      leftId: bestPair.left.id,
      rightId: bestPair.right.id,
      labels: merged.memberIndexes.map((index) => rows[index].display_name_de),
    });
    activeClusters.splice(activeClusters.indexOf(bestPair.right), 1);
    activeClusters.splice(activeClusters.indexOf(bestPair.left), 1);
    activeClusters.push(merged);
  }

  return {
    rows,
    merges,
    maxDistance: merges.at(-1)?.distance ?? 0,
  };
}

export function groupsAtCutPercent(hierarchy, cutPercent) {
  const threshold = (Math.max(0, Math.min(100, Number(cutPercent))) / 100) * hierarchy.maxDistance;
  const activeClusters = hierarchy.rows.map((row, index) => ({
    id: index,
    memberIndexes: [index],
    labels: [row.display_name_de],
  }));
  const clusterMap = new Map(activeClusters.map((cluster) => [cluster.id, cluster]));

  for (const merge of hierarchy.merges) {
    if (merge.distance > threshold) break;
    const left = clusterMap.get(merge.leftId);
    const right = clusterMap.get(merge.rightId);
    if (!left || !right) continue;
    clusterMap.delete(merge.leftId);
    clusterMap.delete(merge.rightId);
    clusterMap.set(merge.id, {
      id: merge.id,
      memberIndexes: sortIndexes([...left.memberIndexes, ...right.memberIndexes]),
      labels: merge.labels,
    });
  }

  const groups = [...clusterMap.values()]
    .sort((left, right) => left.memberIndexes[0] - right.memberIndexes[0])
    .map((group, index) => ({
      ...group,
      colorIndex: index,
    }));

  const pointToGroup = new Map();
  for (const group of groups) {
    for (const memberIndex of group.memberIndexes) {
      pointToGroup.set(memberIndex, group.colorIndex);
    }
  }

  return {
    threshold: Number(threshold.toFixed(2)),
    groups,
    pointToGroup,
  };
}

export function buildHierarchyDendrogram(hierarchy, activeCut) {
  const leafCount = hierarchy.rows.length;
  const nodeMap = new Map(
    hierarchy.rows.map((row, index) => [
      index,
      {
        id: index,
        x: index,
        distance: 0,
        memberIndexes: [index],
        label: row.display_name_de,
      },
    ])
  );
  const segments = [];

  for (const merge of hierarchy.merges) {
    const left = nodeMap.get(merge.leftId);
    const right = nodeMap.get(merge.rightId);
    if (!left || !right) continue;

    const parent = {
      id: merge.id,
      x: (left.x + right.x) / 2,
      distance: merge.distance,
      memberIndexes: merge.labels.map((_, index) => merge.labels[index]),
    };
    nodeMap.set(merge.id, parent);

    segments.push({
      id: `${merge.id}-left`,
      x1: left.x,
      y1: left.distance,
      x2: left.x,
      y2: merge.distance,
      isActive: merge.distance <= activeCut.threshold,
    });
    segments.push({
      id: `${merge.id}-right`,
      x1: right.x,
      y1: right.distance,
      x2: right.x,
      y2: merge.distance,
      isActive: merge.distance <= activeCut.threshold,
    });
    segments.push({
      id: `${merge.id}-top`,
      x1: left.x,
      y1: merge.distance,
      x2: right.x,
      y2: merge.distance,
      isActive: merge.distance <= activeCut.threshold,
    });
  }

  const leaves = hierarchy.rows.map((row, index) => ({
    id: index,
    label: row.display_name_de,
    x: index,
    colorIndex: activeCut.pointToGroup.get(index) ?? 0,
  }));

  return {
    maxDistance: hierarchy.maxDistance,
    leafCount,
    leaves,
    segments,
  };
}
