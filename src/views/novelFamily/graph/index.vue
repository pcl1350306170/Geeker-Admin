<template>
  <div class="novel-graph-index card">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-radio-group v-model="scope" @change="handleScopeChange">
        <el-radio-button value="families">家族总览</el-radio-button>
        <el-radio-button value="members">成员关系</el-radio-button>
      </el-radio-group>
      <el-select v-model="selectedNovelId" class="toolbar__novel" placeholder="全部小说" clearable @change="handleNovelChange">
        <el-option v-for="item in novelOptions" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-select
        v-if="scope === 'members'"
        v-model="selectedFamilyId"
        class="toolbar__family"
        placeholder="选择家族查看成员关系"
        clearable
        filterable
        @change="loadMemberGraph"
      >
        <el-option v-for="item in familyOptions" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <span class="toolbar__hint">
        {{ scope === "families" ? "节点=家族，连线=家族间关系；支持拖拽、缩放" : "节点=成员，连线=成员间关系；支持拖拽、缩放" }}
      </span>
    </div>

    <!-- 图谱 -->
    <div v-loading="loading" class="graph-body">
      <div v-if="nodes.length" ref="chartRef" class="graph-body__chart" />
      <el-empty v-else :description="emptyText" />
    </div>
  </div>
</template>

<script setup lang="ts" name="novelGraphIndex">
import * as echarts from "echarts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { getFamilyListApi } from "@/api/modules/novelFamily";
import { getNovelAllApi } from "@/api/modules/novel";
import { getFamilyGraphApi, getMemberGraphApi } from "@/api/modules/novelRelation";
import { Novel, NovelFamily, NovelRelation } from "@/api/interface";
import { getDictLabel, useDict } from "@/hooks/useDict";

const {
  novel_family_type: familyTypeDict,
  novel_family_status: familyStatusDict,
  novel_member_role: memberRoleDict,
  novel_relation_type: relationTypeDict
} = useDict("novel_family_type", "novel_family_status", "novel_member_role", "novel_relation_type");

const scope = ref<"families" | "members">("families");
const loading = ref(false);
const nodes = ref<NovelRelation.GraphNode[]>([]);
const edges = ref<NovelRelation.GraphEdge[]>([]);
const familyOptions = ref<NovelFamily.ResFamilyList[]>([]);
const novelOptions = ref<Novel.ResNovelList[]>([]);
const selectedNovelId = ref<number>();
const selectedFamilyId = ref<number>();
const chartRef = ref<HTMLDivElement>();

let chartInstance: echarts.ECharts | null = null;
const colorPalette = ["#3370ff", "#00b42a", "#ff7d00", "#f53f3f", "#722ed1", "#13c2c2", "#eb2f96", "#faad14", "#8c8c8c"];

const emptyText = computed(() => {
  if (scope.value === "families") return "暂无家族数据，请先创建家族";
  return selectedFamilyId.value ? "该家族暂无成员，或成员之间暂无关系" : "请选择家族查看成员关系";
});

const loadFamilyOptions = async () => {
  const { data } = await getFamilyListApi({
    pageNum: 1,
    pageSize: 200,
    novelId: selectedNovelId.value || undefined
  });
  familyOptions.value = data.list || [];
};

const loadNovelOptions = async () => {
  try {
    const { data } = await getNovelAllApi();
    novelOptions.value = data || [];
  } catch {
    novelOptions.value = [];
  }
};

const handleNovelChange = () => {
  // 切换小说：重置家族选择、按小说刷新家族下拉与家族图
  selectedFamilyId.value = undefined;
  loadFamilyOptions();
  if (scope.value === "families") {
    loadFamilyGraph();
  }
};

const loadFamilyGraph = async () => {
  loading.value = true;
  try {
    const { data } = await getFamilyGraphApi(selectedNovelId.value);
    nodes.value = data.nodes || [];
    edges.value = data.edges || [];
  } finally {
    loading.value = false;
  }
};

const loadMemberGraph = async () => {
  if (!selectedFamilyId.value) {
    nodes.value = [];
    edges.value = [];
    return;
  }
  loading.value = true;
  try {
    const { data } = await getMemberGraphApi(selectedFamilyId.value);
    nodes.value = data.nodes || [];
    edges.value = data.edges || [];
  } finally {
    loading.value = false;
  }
};

const handleScopeChange = () => {
  if (scope.value === "families") {
    loadFamilyGraph();
  } else {
    if (selectedFamilyId.value) {
      loadMemberGraph();
    } else {
      nodes.value = [];
      edges.value = [];
    }
  }
};

const relationLabel = (type: string) => getDictLabel(relationTypeDict.value, type) || type;

const buildOption = (): echarts.EChartsOption => {
  const isFamilies = scope.value === "families";
  // 分类：家族总览按家族类型，成员关系按角色定位
  const categoryMap = new Map<string, string>();
  nodes.value.forEach(n => {
    const type = n.type || "";
    if (!categoryMap.has(type)) {
      categoryMap.set(
        type,
        isFamilies ? getDictLabel(familyTypeDict.value, type) || "未分类" : getDictLabel(memberRoleDict.value, type) || "未分类"
      );
    }
  });
  const categories = [...categoryMap.values()];

  return {
    tooltip: {
      formatter: (params: any) => {
        if (params.dataType === "edge") {
          return `${params.data.sourceName || ""} —${relationLabel(params.data.relationType)}— ${params.data.targetName || ""}`;
        }
        const n = params.data;
        const typeLabel = isFamilies ? getDictLabel(familyTypeDict.value, n.type) : getDictLabel(memberRoleDict.value, n.type);
        const statusLabel = isFamilies ? getDictLabel(familyStatusDict.value, n.type) : "";
        const lines = [`<b>${n.name}</b>`];
        if (n.sub) lines.push(n.sub);
        if (typeLabel) lines.push(typeLabel);
        if (isFamilies && statusLabel) lines.push(statusLabel);
        if (n.isHead === 1) lines.push("家主");
        return lines.join("<br/>");
      }
    },
    legend: {
      data: categories,
      top: 6,
      type: "scroll",
      textStyle: { fontSize: 12 }
    },
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        draggable: true,
        data: nodes.value.map(n => {
          const categoryIndex = [...categoryMap.keys()].indexOf(n.type || "");
          const isHead = n.isHead === 1;
          return {
            id: n.id,
            name: n.name,
            category: categoryMap.get(n.type || "") || "未分类",
            sourceName: n.name,
            symbolSize: isFamilies ? (isHead ? 62 : 52) : isHead ? 54 : 42,
            itemStyle: {
              color: colorPalette[categoryIndex % colorPalette.length],
              borderColor: isHead ? "#f53f3f" : "#fff",
              borderWidth: isHead ? 3 : 1
            }
          };
        }),
        links: edges.value.map(e => {
          const srcNode = nodes.value.find(n => n.id === e.source);
          const tgtNode = nodes.value.find(n => n.id === e.target);
          return {
            source: e.source,
            target: e.target,
            relationType: e.relationType,
            sourceName: srcNode?.name || "",
            targetName: tgtNode?.name || "",
            label: { show: true, formatter: relationLabel(e.relationType), fontSize: 10, color: "#86909c" }
          };
        }),
        categories: categories.map((c, i) => ({ name: c, itemStyle: { color: colorPalette[i % colorPalette.length] } })),
        force: { repulsion: 320, edgeLength: 140, gravity: 0.08 },
        label: { show: true, position: "right", fontSize: 12, color: "#1f2329", formatter: (p: any) => p.name },
        lineStyle: { color: "source", curveness: 0.12, width: 1.5, opacity: 0.7 },
        emphasis: {
          focus: "adjacency",
          lineStyle: { width: 3, opacity: 1 },
          label: { fontSize: 13, fontWeight: 700 }
        }
      }
    ]
  };
};

const renderChart = () => {
  // 图谱容器可能因切换视图被重建，实例绑定旧 DOM 时需重新初始化
  if (!chartRef.value) {
    chartInstance?.dispose();
    chartInstance = null;
    return;
  }
  if (!chartInstance || chartInstance.getDom() !== chartRef.value) {
    chartInstance?.dispose();
    chartInstance = echarts.init(chartRef.value);
  }
  chartInstance.setOption(buildOption(), { notMerge: true });
};

const handleResize = () => {
  chartInstance?.resize();
};

watch([nodes, edges], () => {
  nextTick(renderChart);
});

onMounted(() => {
  loadNovelOptions();
  loadFamilyOptions();
  loadFamilyGraph();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<style scoped>
.novel-graph-index {
  display: flex;
  flex-direction: column;
  padding: 16px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.toolbar__family {
  width: 220px;
}
.toolbar__novel {
  width: 160px;
}
.toolbar__hint {
  font-size: 12px;
  color: #86909c;
}
.graph-body {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 220px);
  min-height: 420px;
  background: #fafbfc;
  border: 1px solid #f0f1f2;
  border-radius: 10px;
}
.graph-body__chart {
  width: 100%;
  height: 100%;
}
</style>
