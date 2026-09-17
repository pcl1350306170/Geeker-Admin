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
        {{
          scope === "families"
            ? "节点=家族，连线=家族间关系；支持拖拽、缩放"
            : "成员按辈分从上到下分层展示，同辈横向排开；点击人物可查看并编辑其关系，支持拖拽、缩放"
        }}
      </span>
    </div>

    <!-- 图谱 -->
    <div v-loading="loading" class="graph-body">
      <div v-if="nodes.length" ref="chartRef" class="graph-body__chart" />
      <el-empty v-else :description="emptyText" />

      <!-- 人物关系面板 -->
      <transition name="el-fade-in">
        <div v-if="scope === 'members' && selectedMember" class="member-panel">
          <div class="member-panel__head">
            <span class="member-panel__name">{{ selectedMember.name }}</span>
            <div class="member-panel__actions">
              <el-button link type="primary" size="small" :icon="Plus" @click="openRelationCreate">添加</el-button>
              <span class="member-panel__close" @click="closePanel">×</span>
            </div>
          </div>
          <div v-if="memberMetaTags.length" class="member-panel__meta">
            <span v-for="tag in memberMetaTags" :key="tag" class="member-panel__tag">{{ tag }}</span>
          </div>
          <div class="member-panel__list">
            <div v-if="!memberRelations.length" class="member-panel__empty">暂无关联关系，点「添加」创建</div>
            <div v-for="(r, i) in memberRelations" :key="i" class="member-panel__item" @click="focusMember(r.otherId)">
              <div class="member-panel__info">
                <span class="member-panel__rel">{{ r.relationLabel }}</span>
                <span class="member-panel__other">{{ r.otherName }}</span>
              </div>
              <el-button link type="danger" size="small" class="member-panel__del" @click.stop="handleRelationDelete(r)">
                删
              </el-button>
            </div>
          </div>
        </div>
      </transition>

      <!-- 添加关系弹窗（复用成员模块） -->
      <AddRelationDialog
        v-if="selectedMember"
        v-model:visible="relationCreateVisible"
        :source-member-id="getMemberNumId(selectedMember.id)"
        @saved="loadMemberGraph"
      />
    </div>
  </div>
</template>

<script setup lang="ts" name="novelGraphIndex">
import * as echarts from "echarts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Plus } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { getFamilyListApi } from "@/api/modules/novelFamily";
import { getNovelAllApi } from "@/api/modules/novel";
import { deleteRelationApi, getFamilyGraphApi, getMemberGraphApi } from "@/api/modules/novelRelation";
import { Novel, NovelFamily, NovelRelation } from "@/api/interface";
import { getDictLabel, useDict } from "@/hooks/useDict";
import AddRelationDialog from "@/views/novelFamily/member/AddRelationDialog.vue";

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
const selectedMember = ref<NovelRelation.GraphNode>();
const relationCreateVisible = ref(false);

let chartInstance: echarts.ECharts | null = null;
const colorPalette = ["#3370ff", "#00b42a", "#ff7d00", "#f53f3f", "#722ed1", "#13c2c2", "#eb2f96", "#faad14", "#8c8c8c"];

const emptyText = computed(() => {
  if (scope.value === "families") return "暂无家族数据，请先创建家族";
  return selectedFamilyId.value ? "该家族暂无成员，或成员之间暂无关系" : "请选择家族查看成员关系";
});

// ---------- 辈分工具 ----------
const genNum = (g?: string) => {
  if (!g) return Number.MAX_SAFE_INTEGER;
  const n = parseInt(g.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
};
const genLabel = (g?: string) => {
  if (!g) return "";
  const n = parseInt(g.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? g : `第${n}代`;
};

// ---------- 阶梯型（世系）布局：按辈分从上到下分层、同辈横向排开 ----------
const buildGenerationLayout = (list: NovelRelation.GraphNode[], width: number, height: number) => {
  const pos = new Map<string, [number, number]>();
  const layers = new Map<number, NovelRelation.GraphNode[]>();
  list.forEach(n => {
    const key = genNum(n.generation);
    if (!layers.has(key)) layers.set(key, []);
    layers.get(key)!.push(n);
  });
  const keys = [...layers.keys()].sort((a, b) => a - b);
  const maxPerLayer = Math.max(...keys.map(k => layers.get(k)!.length), 1);
  const gapX = Math.max(72, Math.min(140, (width - 80) / maxPerLayer));
  const gapY = Math.max(120, Math.min(170, (height - 120) / Math.max(keys.length, 1)));
  const totalW = gapX * maxPerLayer;
  const totalH = gapY * (keys.length - 1);
  const offsetX = Math.max(20, (width - totalW) / 2);
  const offsetY = Math.max(70, (height - totalH) / 2);
  keys.forEach((k, i) => {
    // 层内：家主优先
    const members = [...layers.get(k)!].sort((a, b) => (b.isHead === 1 ? 1 : 0) - (a.isHead === 1 ? 1 : 0));
    const rowW = gapX * members.length;
    const startX = offsetX + (totalW - rowW) / 2 + gapX / 2;
    members.forEach((m, j) => {
      pos.set(m.id, [startX + j * gapX, offsetY + i * gapY]);
    });
  });
  return pos;
};

// ---------- 数据加载 ----------
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
  // 切换小说：重置家族选择与选中人物、按小说刷新家族下拉与家族图
  selectedFamilyId.value = undefined;
  selectedMember.value = undefined;
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
    // 保留当前选中人物，便于编辑后即时刷新面板
    const keepId = selectedMember.value?.id;
    if (keepId) {
      selectedMember.value = nodes.value.find(n => n.id === keepId) || undefined;
    }
  } finally {
    loading.value = false;
  }
};

const handleScopeChange = () => {
  selectedMember.value = undefined;
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

// ---------- 人物关系面板 ----------
const memberMetaTags = computed(() => {
  const m = selectedMember.value;
  if (!m) return [];
  const tags: string[] = [];
  if (m.sub) tags.push(m.sub);
  const gl = genLabel(m.generation);
  if (gl) tags.push(gl);
  if (m.isHead === 1) tags.push("家主");
  return tags;
});

const memberRelations = computed(() => {
  const m = selectedMember.value;
  if (!m) return [];
  return edges.value
    .filter(e => e.source === m.id || e.target === m.id)
    .map(e => {
      const otherId = e.source === m.id ? e.target : e.source;
      const other = nodes.value.find(n => n.id === otherId);
      return {
        relationId: e.relationId,
        otherId,
        otherName: other?.name || otherId,
        relationLabel: relationLabel(e.relationType),
        description: e.description
      };
    });
});

// 图谱节点 ID 形如 "M47"，还原成员数字 ID（供关系添加弹窗使用）
const getMemberNumId = (nodeId: string) => Number(nodeId.replace(/^\D+/, ""));

const focusMember = (id: string) => {
  const idx = nodes.value.findIndex(n => n.id === id);
  if (idx >= 0) {
    chartInstance?.dispatchAction({ type: "highlight", seriesIndex: 0, dataIndex: idx });
  }
};

const closePanel = () => {
  selectedMember.value = undefined;
  chartInstance?.dispatchAction({ type: "downplay", seriesIndex: 0 });
};

const openRelationCreate = () => {
  relationCreateVisible.value = true;
};

const handleRelationDelete = (r: { relationId?: number; relationLabel: string; otherName: string }) => {
  if (!r.relationId) return;
  ElMessageBox.confirm(
    `确定删除「${selectedMember.value?.name} × ${r.otherName}（${r.relationLabel}）」这条关系吗？`,
    "删除确认",
    {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消"
    }
  )
    .then(async () => {
      await deleteRelationApi(r.relationId!);
      ElMessage.success("删除成功");
      loadMemberGraph();
    })
    .catch(() => {
      // 用户取消删除，无需处理
    });
};

const onChartClick = (params: any) => {
  if (scope.value !== "members" || params.dataType !== "node") return;
  const node = nodes.value.find(n => n.id === params.data?.id);
  if (node) {
    selectedMember.value = node;
    focusMember(node.id);
  }
};

// ---------- 图表 ----------
const buildOption = (): echarts.EChartsOption => {
  const isFamilies = scope.value === "families";
  const width = chartRef.value?.clientWidth || 1200;
  const height = chartRef.value?.clientHeight || 700;
  // 成员关系图：按辈分计算阶梯坐标；家族总览图保持力导向布局
  const pos = isFamilies ? null : buildGenerationLayout(nodes.value, width, height);

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
        if (!isFamilies) {
          const gl = genLabel(n.generation);
          if (gl) lines.push(gl);
        }
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
        layout: isFamilies ? "force" : "none",
        roam: true,
        draggable: true,
        data: nodes.value.map(n => {
          const categoryIndex = [...categoryMap.keys()].indexOf(n.type || "");
          const isHead = n.isHead === 1;
          const p = pos?.get(n.id);
          return {
            id: n.id,
            name: n.name,
            category: categoryMap.get(n.type || "") || "未分类",
            sourceName: n.name,
            symbolSize: isFamilies ? (isHead ? 62 : 52) : isHead ? 54 : 42,
            x: p?.[0],
            y: p?.[1],
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
          const sameRow = pos ? pos.get(e.source)?.[1] === pos.get(e.target)?.[1] : false;
          return {
            source: e.source,
            target: e.target,
            relationType: e.relationType,
            sourceName: srcNode?.name || "",
            targetName: tgtNode?.name || "",
            label: { show: true, formatter: relationLabel(e.relationType), fontSize: 10, color: "#86909c" },
            lineStyle: isFamilies ? undefined : { curveness: sameRow ? 0.3 : 0.04 }
          };
        }),
        categories: categories.map((c, i) => ({ name: c, itemStyle: { color: colorPalette[i % colorPalette.length] } })),
        force: isFamilies ? { repulsion: 320, edgeLength: 140, gravity: 0.08 } : undefined,
        label: {
          show: true,
          position: isFamilies ? "right" : "bottom",
          fontSize: 12,
          color: "#1f2329",
          formatter: (p: any) => p.name
        },
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
    chartInstance.on("click", onChartClick);
  }
  chartInstance.setOption(buildOption(), { notMerge: true });
};

const handleResize = () => {
  chartInstance?.resize();
  // 阶梯型布局按容器尺寸计算坐标，需重算
  if (scope.value === "members") {
    nextTick(renderChart);
  }
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
  position: relative;
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
.member-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  width: 280px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 8%);
}
.member-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #f0f1f2;
}
.member-panel__name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}
.member-panel__actions {
  display: flex;
  gap: 2px;
  align-items: center;
}
.member-panel__close {
  padding: 0 2px;
  font-size: 18px;
  line-height: 1;
  color: #86909c;
  cursor: pointer;
}
.member-panel__close:hover {
  color: #1f2329;
}
.member-panel__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid #f0f1f2;
}
.member-panel__tag {
  padding: 2px 8px;
  font-size: 12px;
  color: #4e5969;
  background: #f2f3f5;
  border-radius: 4px;
}
.member-panel__list {
  flex: 1;
  padding: 8px;
  overflow: auto;
}
.member-panel__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}
.member-panel__item:hover {
  background: #f2f3f5;
}
.member-panel__info {
  display: flex;
  align-items: center;
  min-width: 0;
}
.member-panel__rel {
  flex-shrink: 0;
  margin-right: 8px;
  font-size: 12px;
  color: #4e5969;
}
.member-panel__other {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 500;
  color: #1f2329;
  white-space: nowrap;
}
.member-panel__del {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}
.member-panel__item:hover .member-panel__del {
  opacity: 1;
}
.member-panel__empty {
  padding: 24px 0;
  font-size: 12px;
  color: #86909c;
  text-align: center;
}
</style>
