<template>
  <div class="dev-assets-favorite card">
    <div class="favorite-header">
      <h2 class="favorite-header__title">我的收藏</h2>
      <el-button type="primary" plain :icon="Plus" @click="router.push('/devAssets/create')">新增资产</el-button>
    </div>

    <div v-loading="loading" class="favorite-result">
      <div v-if="assetList.length" class="favorite-result__grid">
        <AssetCard v-for="item in assetList" :key="item.id" :asset="item" show-copy />
      </div>
      <el-empty v-if="!loading && !assetList.length" description="还没有收藏任何资产，去全部资产里看看吧" />
    </div>

    <el-pagination
      v-if="pageable.total > pageable.pageSize"
      v-model:current-page="pageable.pageNum"
      :page-size="pageable.pageSize"
      :total="pageable.total"
      layout="total, prev, pager, next"
      @current-change="fetchList"
    />
  </div>
</template>

<script setup lang="ts" name="devAssetsFavorite">
import { Plus } from "@element-plus/icons-vue";
import { onActivated, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getDevAssetListApi } from "@/api/modules/devAssets";
import { DevAsset } from "@/api/interface";
import AssetCard from "@/views/devAssets/components/AssetCard.vue";

const router = useRouter();

const loading = ref(false);
const assetList = ref<DevAsset.ResAssetList[]>([]);

const pageable = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0
});

const fetchList = async () => {
  loading.value = true;
  try {
    const { data } = await getDevAssetListApi({
      pageNum: pageable.pageNum,
      pageSize: pageable.pageSize,
      isFavorite: 1
    });
    assetList.value = data.list || [];
    pageable.total = data.total || 0;
  } finally {
    loading.value = false;
  }
};

onMounted(fetchList);
// 收藏状态变化后返回本页时刷新
onActivated(fetchList);
</script>

<style scoped lang="scss">
.dev-assets-favorite {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 18px;
}
.favorite-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}
.favorite-result {
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
