<template>
  <div class="dev-assets-home card">
    <!-- 搜索区 -->
    <div class="home-hero">
      <h1 class="home-hero__title">我的开发资产库</h1>
      <p class="home-hero__sub">搜索代码、方案、脚本、问题…… 10 秒找到历史方案</p>
      <div class="home-hero__search">
        <el-input
          v-model="keyword"
          size="large"
          placeholder="搜索代码、方案、脚本、问题……"
          clearable
          @keyup.enter="goSearch"
          @clear="goSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button :icon="Search" @click="goSearch">搜索</el-button>
          </template>
        </el-input>
        <span class="home-hero__hint">Enter 搜索 · Ctrl + K 快捷键（V1.1 支持）</span>
      </div>
      <el-button type="primary" size="large" :icon="Plus" @click="openCreateDialog"> 新增资产 </el-button>
    </div>

    <!-- 最近使用 -->
    <section v-if="homeData.recentUsed.length" class="home-section">
      <h2 class="home-section__title">最近使用</h2>
      <div class="home-section__grid">
        <AssetCard v-for="item in homeData.recentUsed" :key="item.id" :asset="item" show-copy @view="openDetail" />
      </div>
    </section>

    <!-- 常用资产 -->
    <section v-if="homeData.mostUsed.length" class="home-section">
      <h2 class="home-section__title">常用资产</h2>
      <div class="home-section__grid">
        <AssetCard v-for="item in homeData.mostUsed" :key="item.id" :asset="item" show-copy @view="openDetail" />
      </div>
    </section>

    <!-- 我的收藏 -->
    <section v-if="homeData.favorites.length" class="home-section">
      <h2 class="home-section__title">我的收藏</h2>
      <div class="home-section__grid">
        <AssetCard v-for="item in homeData.favorites" :key="item.id" :asset="item" show-copy @view="openDetail" />
      </div>
    </section>

    <!-- 最近更新 -->
    <section v-if="homeData.recentUpdated.length" class="home-section">
      <h2 class="home-section__title">最近更新</h2>
      <div class="home-section__grid">
        <AssetCard v-for="item in homeData.recentUpdated" :key="item.id" :asset="item" show-copy @view="openDetail" />
      </div>
    </section>

    <!-- 空状态 -->
    <el-empty v-if="isEmpty" description="资产库还是空的，点击「新增资产」开始沉淀你的开发经验" />

    <!-- 详情弹窗 -->
    <DetailDialog
      v-model:visible="detailVisible"
      :asset-id="currentAssetId"
      @edit="openEditFromDetail"
      @create="openCreateFromDetail"
      @deleted="fetchHome"
      @view-detail="openDetail"
    />

    <!-- 编辑/新增弹窗 -->
    <EditDialog v-model:visible="editVisible" :asset-id="editAssetId" @saved="handleEditSaved" />
  </div>
</template>

<script setup lang="ts" name="devAssetsIndex">
import { Plus, Search } from "@element-plus/icons-vue";
import { computed, onActivated, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getDevAssetHomeApi } from "@/api/modules/devAssets";
import { DevAsset } from "@/api/interface";
import AssetCard from "@/views/devAssets/components/AssetCard.vue";
import DetailDialog from "@/views/devAssets/components/DetailDialog.vue";
import EditDialog from "@/views/devAssets/components/EditDialog.vue";

const router = useRouter();
const keyword = ref("");

const homeData = reactive<DevAsset.ResHomeData>({
  recentUsed: [],
  favorites: [],
  mostUsed: [],
  recentUpdated: []
});

const isEmpty = computed(() => {
  return !homeData.recentUsed.length && !homeData.favorites.length && !homeData.mostUsed.length && !homeData.recentUpdated.length;
});

const fetchHome = async () => {
  const { data } = await getDevAssetHomeApi();
  homeData.recentUsed = data.recentUsed || [];
  homeData.favorites = data.favorites || [];
  homeData.mostUsed = data.mostUsed || [];
  homeData.recentUpdated = data.recentUpdated || [];
};

const goSearch = () => {
  router.push({ path: "/devAssets/list", query: keyword.value ? { keyword: keyword.value } : {} });
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

/** 首页「新增资产」按钮 */
const openCreateDialog = () => {
  editAssetId.value = null;
  editVisible.value = true;
};

/** 编辑/新增保存后刷新首页数据 */
const handleEditSaved = () => {
  fetchHome();
};

onMounted(fetchHome);
// 从详情/编辑返回时刷新首页数据（keep-alive）
onActivated(fetchHome);
</script>

<style scoped lang="scss">
.dev-assets-home {
  min-height: 100%;
  padding: 24px;
}
.home-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0 32px;
  &__title {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }
  &__sub {
    margin: 10px 0 24px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
  &__search {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 640px;
    margin-bottom: 20px;
    :deep(.el-input-group__append) {
      padding: 0;
      .el-button {
        height: 100%;
        padding: 0 20px;
        margin: 0;
        color: #ffffff;
        background: var(--el-color-primary);
        border: none;
      }
    }
  }
  &__hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }
}
.home-section {
  max-width: 1200px;
  margin: 0 auto 28px;
  &__title {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
  }
}
</style>
