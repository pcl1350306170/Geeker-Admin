<template>
  <div v-loading="loading" class="dev-assets-detail card">
    <template v-if="detail">
      <!-- 头部信息 -->
      <div class="detail-header">
        <div class="detail-header__main">
          <h1 class="detail-header__title">
            <el-icon v-if="detail.isFavorite === 1" class="detail-header__star"><StarFilled /></el-icon>
            {{ detail.title }}
          </h1>
          <div class="detail-header__meta">
            <el-tag size="small" :type="(ASSET_TYPE_TAG_TYPE[detail.type] as any) || 'info'" effect="light">
              {{ ASSET_TYPE_MAP[detail.type] || detail.type }}
            </el-tag>
            <el-tag v-for="tag in detail.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
            <el-tag v-if="detail.language" size="small" type="success" effect="plain">{{ detail.language }}</el-tag>
            <span class="detail-header__info">
              更新于 {{ dayjs(detail.updatedAt).format("YYYY-MM-DD HH:mm") }} · 使用 {{ detail.usageCount }} 次
              <template v-if="detail.createdBy"> · {{ detail.createdBy }}</template>
            </span>
          </div>
          <p v-if="detail.description" class="detail-header__desc">{{ detail.description }}</p>
          <p v-if="detail.parentId" class="detail-header__parent">
            来源资产：
            <el-link type="primary" @click="router.push(`/devAssets/detail/${detail.parentId}`)">
              {{ detail.parentTitle || `#${detail.parentId}` }}
            </el-link>
          </p>
        </div>
        <div class="detail-header__actions">
          <el-button type="primary" :icon="CopyDocument" @click="handleCopyAsset">复制代码</el-button>
          <el-button :type="detail.isFavorite === 1 ? 'warning' : 'default'" @click="handleFavorite">
            <el-icon><StarFilled v-if="detail.isFavorite === 1" /><Star v-else /></el-icon>
            {{ detail.isFavorite === 1 ? "取消收藏" : "收藏" }}
          </el-button>
          <el-button :icon="EditPen" @click="router.push(`/devAssets/edit/${detail.id}`)">编辑</el-button>
          <el-button :icon="DocumentAdd" @click="handleDuplicate">基于此资产创建</el-button>
          <el-button type="danger" :icon="Delete" @click="handleDelete">删除</el-button>
        </div>
      </div>

      <!-- Markdown 正文（sanitize 默认开启，禁止执行任意 HTML/JS） -->
      <div class="detail-content" @click="handleContentClick">
        <MdPreview :model-value="detail.content || ''" preview-theme="default" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts" name="devAssetsDetail">
import { CopyDocument, Delete, DocumentAdd, EditPen, Star, StarFilled } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";
import { MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  deleteDevAssetApi,
  duplicateDevAssetApi,
  getDevAssetDetailApi,
  recordDevAssetCopyApi,
  toggleDevAssetFavoriteApi
} from "@/api/modules/devAssets";
import { DevAsset } from "@/api/interface";
import { ASSET_TYPE_MAP, ASSET_TYPE_TAG_TYPE } from "@/views/devAssets/config";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const detail = ref<DevAsset.ResAssetDetail | null>(null);

const assetId = ref(Number(route.params.id));

const fetchDetail = async () => {
  loading.value = true;
  try {
    const { data } = await getDevAssetDetailApi(assetId.value);
    detail.value = data;
  } finally {
    loading.value = false;
  }
};

/** 提取正文中第一个代码块内容（不含围栏标记） */
const extractFirstCodeBlock = (content: string): string | null => {
  const match = content?.match(/```[\w+-]*\r?\n([\s\S]*?)```/);
  return match ? match[1].replace(/\s+$/, "") : null;
};

/** 顶部「复制代码」：CODE/SNIPPET 优先复制第一个代码块，否则复制全文 */
const handleCopyAsset = async () => {
  if (!detail.value) return;
  const isCode = detail.value.type === "CODE" || detail.value.type === "SNIPPET";
  const text = (isCode ? extractFirstCodeBlock(detail.value.content) : null) ?? detail.value.content ?? "";
  await navigator.clipboard.writeText(text);
  ElMessage.success("复制成功");
  recordDevAssetCopyApi(detail.value.id);
};

/**
 * 事件委托：MdPreview 代码块内置复制按钮点击时同样上报 COPY
 * （内置复制按钮图标 class 含 lucide-copy）
 */
const handleContentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.closest?.("svg.lucide-copy")) {
    recordDevAssetCopyApi(assetId.value);
  }
};

const handleFavorite = async () => {
  if (!detail.value) return;
  const { data } = await toggleDevAssetFavoriteApi(detail.value.id);
  detail.value.isFavorite = data.isFavorite;
  ElMessage.success(data.isFavorite === 1 ? "已收藏" : "已取消收藏");
};

const handleDuplicate = async () => {
  if (!detail.value) return;
  const { data } = await duplicateDevAssetApi(detail.value.id);
  ElMessage.success("已基于当前资产创建副本，请修改后保存");
  router.replace(`/devAssets/edit/${data.id}`);
};

const handleDelete = async () => {
  if (!detail.value) return;
  await ElMessageBox.confirm("确定删除该资产吗？删除后无法恢复。", "删除确认", {
    confirmButtonText: "确定删除",
    cancelButtonText: "取消",
    type: "warning"
  });
  await deleteDevAssetApi(detail.value.id);
  ElMessage.success("删除成功");
  router.replace("/devAssets/list");
};

onMounted(fetchDetail);
// keep-alive 下切换到其他资产详情时重新拉取
watch(
  () => route.params.id,
  id => {
    if (id && Number(id) !== assetId.value) {
      assetId.value = Number(id);
      fetchDetail();
    }
  }
);
</script>

<style scoped lang="scss">
.dev-assets-detail {
  min-height: 100%;
  padding: 20px 24px;
}
.detail-header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  &__main {
    flex: 1;
    min-width: 300px;
  }
  &__title {
    display: flex;
    gap: 6px;
    align-items: center;
    margin: 0 0 10px;
    font-size: 22px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }
  &__star {
    color: var(--el-color-warning);
  }
  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  &__info {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  &__desc {
    margin: 10px 0 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--el-text-color-regular);
  }
  &__parent {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}
.detail-content {
  padding-top: 8px;
  :deep(.md-editor-preview-wrapper) {
    width: 100%;
    padding: 8px 0;
  }
}
</style>
