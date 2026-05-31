export const GROUP_KEYS = ["unassigned", "group_a", "group_b"];

export function defaultFoodGroupState(foodNames) {
  return {
    unassigned: [...foodNames],
    group_a: [],
    group_b: [],
  };
}

export function normalizeFoodGroupState(foodNames, groupState) {
  const normalizedState = {
    unassigned: [],
    group_a: [],
    group_b: [],
  };
  const seenFoods = new Set();

  for (const groupKey of GROUP_KEYS) {
    const values = groupState?.[groupKey] ?? [];
    for (const foodName of values) {
      if (foodNames.includes(foodName) && !seenFoods.has(foodName)) {
        normalizedState[groupKey].push(foodName);
        seenFoods.add(foodName);
      }
    }
  }

  for (const foodName of foodNames) {
    if (!seenFoods.has(foodName)) {
      normalizedState.unassigned.push(foodName);
    }
  }

  return normalizedState;
}

export function groupCounts(groupState) {
  return {
    unassigned: groupState.unassigned.length,
    group_a: groupState.group_a.length,
    group_b: groupState.group_b.length,
  };
}
