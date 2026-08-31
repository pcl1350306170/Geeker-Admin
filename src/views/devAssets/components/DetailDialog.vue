<template>
  <el-dialog
    :model-value="visible"
    :title="detail?.title || '资产详情'"
    width="80%"
    top="5vh"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
    @open="handleOpen"
  >
    <div ref="rootRef" v-loading="loading" class="dev-assets-detail-dialog">
      <template v-if="detail">
        <!-- 头部信息 -->
        <div class="detail-header">
          <div class="detail-header__main">
            <h2 class="detail-header__title">
              <el-icon v-if="detail.isFavorite === 1" class="detail-header__star"><StarFilled /></el-icon>
              {{ detail.title }}
            </h2>
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
              <el-link type="primary" @click="handleViewParent">
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
            <el-button :icon="EditPen" @click="handleEdit">编辑</el-button>
            <el-button :icon="DocumentAdd" @click="handleDuplicate">基于此资产创建</el-button>
            <el-button type="danger" :icon="Delete" @click="handleDelete">删除</el-button>
          </div>
        </div>

        <!-- Markdown 正文 -->
        <div class="detail-content" @click="handleContentClick">
          <MdPreview :model-value="detail.content || ''" preview-theme="default" />
        </div>
      </template>
    </div>
  </el-dialog>
</template>

<script setup lang="ts" name="devAssetDetailDialog">
import { CopyDocument, Delete, DocumentAdd, EditPen, Star, StarFilled } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";
import { MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import { nextTick, ref, watch } from "vue";

import {
  deleteDevAssetApi,
  duplicateDevAssetApi,
  getDevAssetDetailApi,
  recordDevAssetCopyApi,
  toggleDevAssetFavoriteApi
} from "@/api/modules/devAssets";
import { DevAsset } from "@/api/interface";
import { ASSET_TYPE_MAP, ASSET_TYPE_TAG_TYPE } from "@/views/devAssets/config";
import { setupImgCdnFallback } from "@/views/devAssets/utils/imgFallback";

const props = defineProps<{
  visible: boolean;
  assetId: number | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", val: boolean): void;
  (e: "edit", assetId: number): void;
  (e: "create", parentId: number): void;
  (e: "deleted"): void;
  (e: "viewDetail", assetId: number): void;
}>();

const loading = ref(false);
const detail = ref<DevAsset.ResAssetDetail | null>(null);
const rootRef = ref<HTMLElement>();

/** 提取正文中第一个代码块内容（不含围栏标记） */
const extractFirstCodeBlock = (content: string): string | null => {
  const match = content?.match(/```[\w+-]*\r?\n([\s\S]*?)```/);
  return match ? match[1].replace(/\s+$/, "") : null;
};

const fetchDetail = async (id: number) => {
  loading.value = true;
  try {
    const { data } = await getDevAssetDetailApi(id);
    detail.value = data;
  } finally {
    loading.value = false;
  }
};

const handleOpen = () => {
  if (props.assetId) {
    fetchDetail(props.assetId);
  }
  nextTick(() => {
    if (rootRef.value) setupImgCdnFallback(rootRef.value);
  });
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
 */
const handleContentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.closest?.("svg.lucide-copy")) {
    recordDevAssetCopyApi(detail.value!.id);
  }
};

const handleFavorite = async () => {
  if (!detail.value) return;
  const { data } = await toggleDevAssetFavoriteApi(detail.value.id);
  detail.value.isFavorite = data.isFavorite;
  ElMessage.success(data.isFavorite === 1 ? "已收藏" : "已取消收藏");
};

const handleEdit = () => {
  if (!detail.value) return;
  emit("edit", detail.value.id);
};

const handleDuplicate = async () => {
  if (!detail.value) return;
  const { data } = await duplicateDevAssetApi(detail.value.id);
  ElMessage.success("已基于当前资产创建副本，请修改后保存");
  emit("create", data.id);
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
  emit("update:visible", false);
  emit("deleted");
};

const handleViewParent = () => {
  if (!detail.value?.parentId) return;
  emit("viewDetail", detail.value.parentId);
};

// 外部切换 assetId 时重新拉取
watch(
  () => props.assetId,
  id => {
    if (id && props.visible) {
      fetchDetail(id);
    }
  }
);
</script>

<style scoped lang="scss">
.dev-assets-detail-dialog {
  display: flex;
  flex-direction: column;
  max-height: 75vh;
  padding: 0 4px;
}
.detail-header {
  display: flex;
  flex-shrink: 0;
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
    font-size: 20px;
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
  flex: 1;
  padding-top: 8px;
  overflow-y: auto;
  :deep(.md-editor-preview-wrapper) {
    width: 100%;
    padding: 8px 0;
  }
}
</style>
