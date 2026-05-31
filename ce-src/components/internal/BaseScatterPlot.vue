<script setup>
import { computed } from "vue";

const props = defineProps({
  points: {
    type: Array,
    required: true,
  },
  xKey: {
    type: String,
    required: true,
  },
  yKey: {
    type: String,
    required: true,
  },
  xLabel: {
    type: String,
    required: true,
  },
  yLabel: {
    type: String,
    required: true,
  },
  width: {
    type: Number,
    default: 520,
  },
  height: {
    type: Number,
    default: 320,
  },
  xDomain: {
    type: Array,
    default: null,
  },
  yDomain: {
    type: Array,
    default: null,
  },
  xTicks: {
    type: Array,
    default: null,
  },
  yTicks: {
    type: Array,
    default: null,
  },
  tickFontSize: {
    type: Number,
    default: 9,
  },
  axisLabelFontSize: {
    type: Number,
    default: 9,
  },
});

const margin = { top: 18, right: 18, bottom: 44, left: 52 };

const xRange = computed(() => {
  if (props.xDomain) return props.xDomain;
  const values = props.points.map((point) => Number(point[props.xKey]));
  return [Math.min(...values), Math.max(...values)];
});

const yRange = computed(() => {
  if (props.yDomain) return props.yDomain;
  const values = props.points.map((point) => Number(point[props.yKey]));
  return [Math.min(...values), Math.max(...values)];
});

function scaleX(value) {
  const [min, max] = xRange.value;
  const plotWidth = props.width - margin.left - margin.right;
  return margin.left + ((Number(value) - min) / Math.max(max - min, 1e-9)) * plotWidth;
}

function scaleY(value) {
  const [min, max] = yRange.value;
  const plotHeight = props.height - margin.top - margin.bottom;
  return props.height - margin.bottom - ((Number(value) - min) / Math.max(max - min, 1e-9)) * plotHeight;
}

const ticks = computed(() => {
  if (props.xTicks || props.yTicks) {
    return {
      x: props.xTicks ?? [],
      y: props.yTicks ?? [],
    };
  }
  const count = 5;
  const build = ([min, max]) =>
    Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
  return {
    x: build(xRange.value),
    y: build(yRange.value),
  };
});
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="plot">
    <line
      :x1="margin.left"
      :x2="width - margin.right"
      :y1="height - margin.bottom"
      :y2="height - margin.bottom"
      class="axis"
      stroke="#546e7a"
      stroke-width="1.2"
    />
    <line
      :x1="margin.left"
      :x2="margin.left"
      :y1="margin.top"
      :y2="height - margin.bottom"
      class="axis"
      stroke="#546e7a"
      stroke-width="1.2"
    />

    <g v-for="tick in ticks.x" :key="`x-${tick}`">
      <line
        :x1="scaleX(tick)"
        :x2="scaleX(tick)"
        :y1="margin.top"
        :y2="height - margin.bottom"
        class="grid"
        stroke="#c7d6e5"
        stroke-width="1.2"
      />
      <text
        :x="scaleX(tick)"
        :y="height - 12"
        text-anchor="middle"
        class="tick"
        :style="{ fontSize: `${tickFontSize}px`, fill: '#31475f' }"
      >
        {{ Number(tick).toFixed(1).replace(".0", "") }}
      </text>
    </g>

    <g v-for="tick in ticks.y" :key="`y-${tick}`">
      <line
        :x1="margin.left"
        :x2="width - margin.right"
        :y1="scaleY(tick)"
        :y2="scaleY(tick)"
        class="grid"
        stroke="#c7d6e5"
        stroke-width="1.2"
      />
      <text
        :x="margin.left - 8"
        :y="scaleY(tick) + 4"
        text-anchor="end"
        class="tick"
        :style="{ fontSize: `${tickFontSize}px`, fill: '#31475f' }"
      >
        {{ Number(tick).toFixed(1).replace(".0", "") }}
      </text>
    </g>

    <slot :scale-x="scaleX" :scale-y="scaleY" />

    <text
      :x="width / 2"
      :y="height - 2"
      text-anchor="middle"
      class="label"
      :style="{ fontSize: `${axisLabelFontSize}px`, fill: '#31475f', fontWeight: 600 }"
    >
      {{ xLabel }}
    </text>
    <text
      :x="16"
      :y="height / 2"
      text-anchor="middle"
      class="label"
      :transform="`rotate(-90 16 ${height / 2})`"
      :style="{ fontSize: `${axisLabelFontSize}px`, fill: '#31475f', fontWeight: 600 }"
    >
      {{ yLabel }}
    </text>
  </svg>
</template>

<style scoped>
.plot {
  width: 100%;
  display: block;
  background: linear-gradient(180deg, #ffffff, #f7fbff);
  border: 1px solid #d6e2ed;
  border-radius: 16px;
}
</style>
