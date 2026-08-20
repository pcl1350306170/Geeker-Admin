<template>
  <div ref="rootRef" class="public-assets">
    <!-- 中心搜索区：极简单框 -->
    <main class="public-hero">
      <div class="public-hero__inner">
        <h1 class="public-hero__title">
          <el-icon class="public-hero__logo"><Collection /></el-icon>
          开发资产库
        </h1>
        <p class="public-hero__sub">快速检索历史开发资产：代码 / 方案 / 踩坑记录 / 脚本</p>
        <el-input
          v-model="keyword"
          class="public-hero__search"
          size="large"
          autofocus
          clearable
          placeholder="搜索标题、标签、简介、正文、错误信息……"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button :icon="Search" :loading="loading" @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
        <p class="public-hero__tip">输入关键词后按 Enter 搜索，结果弹窗展示，按 Esc 关闭</p>
      </div>
    </main>

    <!-- 第一层：搜索结果列表弹窗 -->
    <el-dialog v-model="resultVisible" width="760px" top="8vh" class="public-result-dialog">
      <template #header>
        <span class="public-result__title">「{{ searchedKeyword }}」的搜索结果</span>
      </template>
      <div v-loading="loading" class="public-result">
        <div v-if="assetList.length" class="public-result__list">
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
        <p v-if="assetList.length && assetList.length < total" class="public-result__more">
          共 {{ total }} 条，仅展示前 {{ assetList.length }} 条，请细化关键词
        </p>
      </div>
      <template #footer>
        <el-button @click="resultVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 第二层：详情弹窗（Esc 优先关闭本层，再按关闭结果列表层） -->
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
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { getPublicAssetDetailApi, getPublicAssetListApi, recordPublicCopyApi } from "@/api/modules/devAssetsPublic";
import { DevAsset } from "@/api/interface";
import { ASSET_TYPE_MAP, ASSET_TYPE_TAG_TYPE } from "@/views/devAssets/config";
import { setupImgCdnFallback } from "@/views/devAssets/utils/imgFallback";

const route = useRoute();

const PAGE_SIZE = 20;

const keyword = ref("");
// 分享链接携带的隐式筛选条件（无 UI，仅透传给后端）
const hiddenFilter = { type: "", tag: "" };
// 实际发起搜索时使用的关键词（用于弹窗标题与空态文案）
const searchedKeyword = ref("");

const loading = ref(false);
const resultVisible = ref(false);
const assetList = ref<DevAsset.ResAssetList[]>([]);
const total = ref(0);
const rootRef = ref<HTMLElement>();

// 详情弹窗
const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<DevAsset.ResAssetDetail | null>(null);

const emptyText = computed(() => {
  return searchedKeyword.value ? `没有找到与「${searchedKeyword.value}」相关的资产，换个关键词试试` : "暂无资产数据";
});

/** 关键字搜索：空关键字不请求，仅轻提示 */
const handleSearch = async () => {
  // 防连击：请求进行中忽略重复触发
  if (loading.value) return;
  const kw = keyword.value.trim();
  if (!kw) {
    ElMessage.info("请输入搜索关键词");
    return;
  }
  searchedKeyword.value = kw;
  resultVisible.value = true;
  loading.value = true;
  try {
    const { data } = await getPublicAssetListApi({
      pageNum: 1,
      pageSize: PAGE_SIZE,
      keyword: kw,
      type: hiddenFilter.type || undefined,
      tag: hiddenFilter.tag || undefined
    });
    assetList.value = data.list || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
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

/** 从路由 query 同步搜索条件（支持外部分享搜索链接 /public/assets?keyword=xx&type=&tag=） */
const syncFromRoute = () => {
  const kw = route.query.keyword;
  const type = route.query.type;
  const tag = route.query.tag;
  if (typeof kw === "string") keyword.value = kw;
  if (typeof type === "string") hiddenFilter.type = type;
  if (typeof tag === "string") hiddenFilter.tag = tag;
  return !!keyword.value.trim();
};

onMounted(() => {
  // 分享链接携带关键词时自动发起搜索
  if (syncFromRoute()) handleSearch();
  // CDN 图片未 push 时自动回退到后端本地直出地址（弹窗未 teleport，事件可冒泡到根元素）
  if (rootRef.value) setupImgCdnFallback(rootRef.value);
});
</script>

<style scoped lang="scss">
.public-assets {
  min-height: 100vh;
  background: var(--el-bg-color-page);
}
.public-hero {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 0 16px;
  &__inner {
    width: min(680px, 92%);
    text-align: center;
  }
  &__title {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    margin: 0;
    font-size: 30px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }
  &__logo {
    font-size: 30px;
    color: var(--el-color-primary);
  }
  &__sub {
    margin: 12px 0 32px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  /* 搜索框整体放大 1.5 倍（高度 40 → 60px、字号 14 → 21px），居中占据视觉焦点 */
  &__search {
    --el-component-size-large: 60px;
    --el-input-height: 60px;

    font-size: 21px;
    :deep(.el-input__inner) {
      font-size: 21px;
    }
    :deep(.el-input__prefix) {
      font-size: 22px;
    }
    :deep(.el-input-group__append .el-button) {
      padding: 0 24px;
      font-size: 19px;
      .el-icon {
        font-size: 21px;
      }
    }
  }
  &__tip {
    margin: 14px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
.public-result {
  min-height: 200px;
  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  &__list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  &__more {
    margin: 14px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
}
.pub-card {
  box-sizing: border-box;
  padding: 14px 16px;
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
    margin-top: 10px;
  }
  &__meta {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
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
