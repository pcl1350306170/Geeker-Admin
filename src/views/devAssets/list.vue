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
        <el-option v-for="tag in tagOptions" :key="tag" :label="tag" :value="tag" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button type="primary" plain :icon="Plus" @click="router.push('/devAssets/create')">新增资产</el-button>
    </div>

    <!-- 结果列表 -->
    <div v-loading="loading" class="list-result">
      <div v-if="assetList.length" class="list-result__grid">
        <AssetCard v-for="item in assetList" :key="item.id" :asset="item" show-copy />
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
  </div>
</template>

<script setup lang="ts" name="devAssetsList">
import { Plus, Search } from "@element-plus/icons-vue";
import { computed, onActivated, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getDevAssetListApi } from "@/api/modules/devAssets";
import { DevAsset } from "@/api/interface";
import AssetCard from "@/views/devAssets/components/AssetCard.vue";
import { ASSET_TYPE_OPTIONS } from "@/views/devAssets/config";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const assetList = ref<DevAsset.ResAssetList[]>([]);
const tagOptions = ref<string[]>([]);

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
    // 汇总标签供筛选（仅取当前页）
    const tags = new Set<string>(tagOptions.value);
    assetList.value.forEach(item => item.tags?.forEach(tag => tags.add(tag)));
    tagOptions.value = [...tags];
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pageable.pageNum = 1;
  fetchList();
};

/** 从路由 query 同步搜索条件（首页搜索跳转过来） */
const syncFromRoute = () => {
  const kw = route.query.keyword;
  if (typeof kw === "string") {
    searchState.keyword = kw;
    pageable.pageNum = 1;
    fetchList();
  }
};

onMounted(() => {
  syncFromRoute();
  if (!route.query.keyword) fetchList();
});
onActivated(syncFromRoute);
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
