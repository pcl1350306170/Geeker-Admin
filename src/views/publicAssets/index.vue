<template>
  <div ref="rootRef" class="public-assets">
    <!-- 页头 -->
    <header class="public-assets__header">
      <div class="public-assets__header-inner">
        <h1 class="public-assets__title">
          <el-icon class="public-assets__logo"><Collection /></el-icon>
          开发资产库
        </h1>
        <span class="public-assets__subtitle">快速检索历史开发资产：代码 / 方案 / 踩坑记录 / 脚本</span>
      </div>
    </header>

    <main class="public-assets__main">
      <!-- 筛选区 -->
      <div class="public-filter">
        <el-input
          v-model="searchState.keyword"
          class="public-filter__search"
          placeholder="搜索标题、标签、简介、正文、错误信息……"
          clearable
          :prefix-icon="Search"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select
          v-model="searchState.type"
          class="public-filter__select"
          placeholder="全部类型"
          clearable
          @change="handleSearch"
        >
          <el-option v-for="item in ASSET_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select
          v-model="searchState.tag"
          class="public-filter__select"
          placeholder="全部标签"
          clearable
          filterable
          @change="handleSearch"
        >
          <el-option v-for="tag in tagOptions" :key="tag.id" :label="tag.name" :value="tag.name" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      </div>

      <!-- 结果列表 -->
      <div v-loading="loading" class="public-result">
        <div v-if="assetList.length" class="public-result__grid">
          <div v-for="item in assetList" :key="item.id" class="pub-card" @click="openDetail(item.id)">
            <div class="pub-card__header">
              <span class="pub-card__title" :title="item.title">{{ item.title }}</span>
              <el-tag size="small" :type="(ASSET_TYPE_TAG_TYPE[item.type] as any) || 'info'" effect="light">
                {{ ASSET_TYPE_MAP[item.type] || item.type }}
              </el-tag>
            </div>
            <div v-if="item.tags?.length || item.language" class="pub-card__tags">
              <span v-for="tag in item.tags" :key="tag" class="pub-card__tag">{{ tag }}</span>
              <span v-if="item.language" class="pub-card__tag pub-card__tag--lang">{{ item.language }}</span>
            </div>
            <p v-if="item.description" class="pub-card__desc">{{ item.description }}</p>
            <div class="pub-card__footer">
              <span class="pub-card__meta">
                更新于 {{ dayjs(item.updatedAt).format("YYYY-MM-DD") }} · 使用 {{ item.usageCount }} 次
              </span>
              <el-button size="small" type="primary" link @click.stop="openDetail(item.id)">查看详情</el-button>
            </div>
          </div>
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
    </main>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" width="860px" top="5vh" destroy-on-close class="public-detail-dialog">
      <template #header>
        <div class="public-detail__header">
          <h2 class="public-detail__title">{{ detail?.title }}</h2>
          <div v-if="detail" class="public-detail__meta">
            <el-tag size="small" :type="(ASSET_TYPE_TAG_TYPE[detail.type] as any) || 'info'" effect="light">
              {{ ASSET_TYPE_MAP[detail.type] || detail.type }}
            </el-tag>
            <el-tag v-for="tag in detail.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
            <el-tag v-if="detail.language" size="small" type="success" effect="plain">{{ detail.language }}</el-tag>
            <span class="public-detail__info">
              更新于 {{ dayjs(detail.updatedAt).format("YYYY-MM-DD HH:mm") }} · 使用 {{ detail.usageCount }} 次
            </span>
          </div>
          <p v-if="detail?.description" class="public-detail__desc">{{ detail.description }}</p>
        </div>
      </template>
      <div v-loading="detailLoading" class="public-detail__body">
        <!-- Markdown 正文（sanitize 默认开启，禁止执行任意 HTML/JS） -->
        <div v-if="detail" class="public-detail__content" @click="handleContentClick">
          <MdPreview :model-value="detail.content || ''" preview-theme="default" />
        </div>
      </div>
      <template #footer>
        <el-button type="primary" :icon="CopyDocument" @click="handleCopyAsset">复制代码</el-button>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="publicAssets">
import { Collection, CopyDocument, Search } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import dayjs from "dayjs";
import { MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import {
  getPublicAssetDetailApi,
  getPublicAssetListApi,
  getPublicTagListApi,
  recordPublicCopyApi
} from "@/api/modules/devAssetsPublic";
import { DevAsset, DevTag } from "@/api/interface";
import { ASSET_TYPE_MAP, ASSET_TYPE_OPTIONS, ASSET_TYPE_TAG_TYPE } from "@/views/devAssets/config";
import { setupImgCdnFallback } from "@/views/devAssets/utils/imgFallback";

const route = useRoute();

const loading = ref(false);
const assetList = ref<DevAsset.ResAssetList[]>([]);
const tagOptions = ref<DevTag.ResTag[]>([]);
const rootRef = ref<HTMLElement>();

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

// 详情弹窗
const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<DevAsset.ResAssetDetail | null>(null);

const emptyText = computed(() => {
  return searchState.keyword ? `没有找到与「${searchState.keyword}」相关的资产，换个关键词试试` : "暂无资产数据";
});

const fetchList = async () => {
  loading.value = true;
  try {
    const { data } = await getPublicAssetListApi({
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

const loadTagOptions = async () => {
  const { data } = await getPublicTagListApi();
  tagOptions.value = data || [];
};

const handleSearch = () => {
  pageable.pageNum = 1;
  fetchList();
};

/** 打开详情弹窗（后端记录 VIEW） */
const openDetail = async (id: number) => {
  detailVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  try {
    const { data } = await getPublicAssetDetailApi(id);
    detail.value = data;
  } finally {
    detailLoading.value = false;
  }
};

/** 提取正文中第一个代码块内容（不含围栏标记） */
const extractFirstCodeBlock = (content: string): string | null => {
  const match = content?.match(/```[\w+-]*\r?\n([\s\S]*?)```/);
  return match ? match[1].replace(/\s+$/, "") : null;
};

/** 「复制代码」：CODE/SNIPPET 优先复制第一个代码块，否则复制全文 */
const handleCopyAsset = async () => {
  if (!detail.value) return;
  const isCode = detail.value.type === "CODE" || detail.value.type === "SNIPPET";
  const text = (isCode ? extractFirstCodeBlock(detail.value.content) : null) ?? detail.value.content ?? "";
  await navigator.clipboard.writeText(text);
  ElMessage.success("复制成功");
  recordPublicCopyApi(detail.value.id);
};

/**
 * 事件委托：MdPreview 代码块内置复制按钮点击时同样上报 COPY
 * （内置复制按钮图标 class 含 lucide-copy）
 */
const handleContentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.closest?.("svg.lucide-copy") && detail.value) {
    recordPublicCopyApi(detail.value.id);
  }
};

/** 从路由 query 同步搜索条件（支持外部分享搜索链接 #/public/assets?keyword=xx） */
const syncFromRoute = () => {
  const kw = route.query.keyword;
  const type = route.query.type;
  const tag = route.query.tag;
  if (typeof kw === "string") searchState.keyword = kw;
  if (typeof type === "string") searchState.type = type;
  if (typeof tag === "string") searchState.tag = tag;
};

onMounted(() => {
  syncFromRoute();
  loadTagOptions();
  fetchList();
  // CDN 图片未 push 时自动回退到后端本地直出地址（弹窗未 teleport，事件可冒泡到根元素）
  if (rootRef.value) setupImgCdnFallback(rootRef.value);
});
</script>

<style scoped lang="scss">
.public-assets {
  min-height: 100vh;
  background: var(--el-bg-color-page);
}
.public-assets__header {
  padding: 26px 0 18px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  &-inner {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    align-items: baseline;
    width: min(1200px, 92%);
    margin: 0 auto;
  }
}
.public-assets__title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.public-assets__logo {
  color: var(--el-color-primary);
}
.public-assets__subtitle {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.public-assets__main {
  width: min(1200px, 92%);
  padding: 18px 0 40px;
  margin: 0 auto;
}
.public-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
  &__search {
    width: 400px;
    max-width: 100%;
  }
  &__select {
    width: 160px;
  }
}
.public-result {
  min-height: 200px;
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
  }
}
.pub-card {
  box-sizing: border-box;
  padding: 16px 18px;
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: all 0.2s;
  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 4px 12px rgb(0 0 0 / 6%);
  }
  &__header {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  &__title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    white-space: nowrap;
  }
  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }
  &__tag {
    padding: 1px 8px;
    font-size: 12px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 4px;
    &--lang {
      color: var(--el-color-success);
      background: var(--el-color-success-light-9);
    }
  }
  &__desc {
    display: -webkit-box;
    margin: 10px 0 0;
    overflow: hidden;
    -webkit-line-clamp: 2;
    font-size: 13px;
    line-height: 1.6;
    color: var(--el-text-color-regular);
    -webkit-box-orient: vertical;
  }
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
  }
  &__meta {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
.el-pagination {
  justify-content: flex-end;
  margin-top: 18px;
}
.public-detail__header {
  padding-right: 20px;
}
.public-detail__title {
  margin: 0 0 10px;
  font-size: 19px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.public-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.public-detail__info {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.public-detail__desc {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}
.public-detail__body {
  min-height: 200px;
  max-height: 68vh;
  overflow-y: auto;
}
.public-detail__content {
  :deep(.md-editor-preview-wrapper) {
    width: 100%;
    padding: 8px 0;
  }
}
</style>
