<template>
  <div class="dev-assets-list card">
    <!-- 筛选区 -->
    <div class="list-filter">
      <el-input
        v-model="searchState.keyword"
        class="list-filter__search"
        placeholder="搜索标题、标签、简介、正文、错误信息……"
        clearable
        :prefix-icon="Search"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select v-model="searchState.type" class="list-filter__type" placeholder="全部类型" clearable @change="handleSearch">
        <el-option v-for="item in ASSET_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select
        v-model="searchState.tag"
        class="list-filter__type"
        placeholder="全部标签"
        clearable
        filterable
        allow-create
        default-first-option
        @change="handleSearch"
      >
        <el-option v-for="tag in tagOptions" :key="tag.id" :label="tag.name" :value="tag.name" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button type="primary" plain :icon="Plus" @click="openCreateDialog">新增资产</el-button>
    </div>

    <!-- 结果列表 -->
    <div v-loading="loading" class="list-result">
      <div v-if="assetList.length" class="list-result__grid">
        <AssetCard v-for="item in assetList" :key="item.id" :asset="item" show-copy @view="openDetail" />
      </div>
      <el-empty v-if="!loading && !assetList.length" :description="emptyText" />
    </div>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="pageable.pageNum"
      v-model:page-size="pageable.pageSize"
      :total="pageable.total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="handleSearch"
      @current-change="fetchList"
    />

    <!-- 详情弹窗 -->
    <DetailDialog
      v-model:visible="detailVisible"
      :asset-id="currentAssetId"
      @edit="openEditFromDetail"
      @create="openCreateFromDetail"
      @deleted="fetchList"
      @view-detail="openDetail"
    />

    <!-- 编辑/新增弹窗 -->
    <EditDialog v-model:visible="editVisible" :asset-id="editAssetId" @saved="handleEditSaved" />
  </div>
</template>

<script setup lang="ts" name="devAssetsList">
import { Plus, Search } from "@element-plus/icons-vue";
import { computed, onActivated, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { getDevAssetListApi } from "@/api/modules/devAssets";
import { getDevTagListApi } from "@/api/modules/devTags";
import { DevAsset, DevTag } from "@/api/interface";
import AssetCard from "@/views/devAssets/components/AssetCard.vue";
import DetailDialog from "@/views/devAssets/components/DetailDialog.vue";
import EditDialog from "@/views/devAssets/components/EditDialog.vue";
import { ASSET_TYPE_OPTIONS } from "@/views/devAssets/config";

const route = useRoute();

const loading = ref(false);
const assetList = ref<DevAsset.ResAssetList[]>([]);
const tagOptions = ref<DevTag.ResTag[]>([]);

const searchState = reactive({
  keyword: "",
  type: "",
  tag: ""
});

const pageable = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0
});

const emptyText = computed(() => {
  return searchState.keyword ? `没有找到与「${searchState.keyword}」相关的资产，换个关键词试试` : "暂无资产，点击右上角新增";
});

const fetchList = async () => {
  loading.value = true;
  try {
    const { data } = await getDevAssetListApi({
      pageNum: pageable.pageNum,
      pageSize: pageable.pageSize,
      keyword: searchState.keyword || undefined,
      type: searchState.type || undefined,
      tag: searchState.tag || undefined
    });
    assetList.value = data.list || [];
    pageable.total = data.total || 0;
  } finally {
    loading.value = false;
  }
};

/** 标签筛选项来自标签字典 */
const loadTagOptions = async () => {
  const { data } = await getDevTagListApi();
  tagOptions.value = data || [];
};

const handleSearch = () => {
  pageable.pageNum = 1;
  fetchList();
};

/** 从路由 query 同步搜索条件（首页搜索 / 标签管理页跳转过来） */
const syncFromRoute = () => {
  let changed = false;
  const kw = route.query.keyword;
  if (typeof kw === "string") {
    searchState.keyword = kw;
    changed = true;
  }
  const tag = route.query.tag;
  if (typeof tag === "string") {
    searchState.tag = tag;
    changed = true;
  }
  if (changed) {
    pageable.pageNum = 1;
    fetchList();
  }
};

// ─── 弹窗状态 ───────────────────────────────────────────────
const detailVisible = ref(false);
const currentAssetId = ref<number | null>(null);

const editVisible = ref(false);
const editAssetId = ref<number | null>(null);

/** 打开详情弹窗 */
const openDetail = (assetId: number) => {
  currentAssetId.value = assetId;
  detailVisible.value = true;
};

/** 从详情弹窗点击「编辑」：关闭详情，打开编辑 */
const openEditFromDetail = (assetId: number) => {
  detailVisible.value = false;
  editAssetId.value = assetId;
  editVisible.value = true;
};

/** 从详情弹窗点击「基于此资产创建」：关闭详情，打开新增 */
const openCreateFromDetail = (newAssetId: number) => {
  detailVisible.value = false;
  editAssetId.value = newAssetId;
  editVisible.value = true;
};

/** 「新增资产」按钮 */
const openCreateDialog = () => {
  editAssetId.value = null;
  editVisible.value = true;
};

/** 编辑/新增保存后刷新列表 */
const handleEditSaved = () => {
  fetchList();
};

onMounted(() => {
  loadTagOptions();
  syncFromRoute();
  if (!route.query.keyword && !route.query.tag) fetchList();
});
onActivated(() => {
  // 标签字典可能在其它页面有变动，回本页时刷新选项
  loadTagOptions();
  syncFromRoute();
});
</script>

<style scoped lang="scss">
.dev-assets-list {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 18px;
}
.list-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
  &__search {
    width: 360px;
  }
  &__type {
    width: 160px;
  }
}
.list-result {
  flex: 1;
  min-height: 200px;
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
  }
}
.el-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
