<template>
  <div class="asset-card" @click="goDetail">
    <div class="asset-card__header">
      <el-icon v-if="asset.isFavorite === 1" class="asset-card__star"><StarFilled /></el-icon>
      <span class="asset-card__title" :title="asset.title">{{ asset.title }}</span>
      <el-tag size="small" :type="(ASSET_TYPE_TAG_TYPE[asset.type] as any) || 'info'" effect="light">
        {{ ASSET_TYPE_MAP[asset.type] || asset.type }}
      </el-tag>
    </div>
    <div v-if="asset.tags?.length" class="asset-card__tags">
      <span v-for="tag in asset.tags" :key="tag" class="asset-card__tag">{{ tag }}</span>
      <span v-if="asset.language" class="asset-card__tag asset-card__tag--lang">{{ asset.language }}</span>
    </div>
    <p v-if="asset.description" class="asset-card__desc">{{ asset.description }}</p>
    <div class="asset-card__footer">
      <span class="asset-card__meta">
        更新于 {{ dayjs(asset.updatedAt).format("YYYY-MM-DD") }} · 使用 {{ asset.usageCount }} 次
      </span>
      <span class="asset-card__actions">
        <el-button size="small" type="primary" link @click.stop="goDetail">查看</el-button>
        <el-button v-if="showCopy" size="small" type="primary" link @click.stop="handleQuickCopy">复制代码</el-button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts" name="devAssetCard">
import { StarFilled } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import dayjs from "dayjs";

import { getDevAssetDetailApi, recordDevAssetCopyApi } from "@/api/modules/devAssets";
import { DevAsset } from "@/api/interface";
import { ASSET_TYPE_MAP, ASSET_TYPE_TAG_TYPE } from "@/views/devAssets/config";

const props = defineProps<{
  asset: DevAsset.ResAssetList;
  showCopy?: boolean;
}>();

const emit = defineEmits<{
  (e: "view", assetId: number): void;
}>();

const goDetail = () => {
  emit("view", props.asset.id);
};

/**
 * 卡片上直接复制：CODE/SNIPPET 类型取正文中第一个代码块，否则复制简介
 */
const handleQuickCopy = async () => {
  const { data } = await getDevAssetDetailApi(props.asset.id);
  const code = extractFirstCodeBlock(data.content);
  const text = code ?? data.description ?? data.title;
  await navigator.clipboard.writeText(text);
  ElMessage.success("复制成功");
  recordDevAssetCopyApi(props.asset.id);
};

/** 提取 Markdown 正文中第一个代码块内容（不含围栏标记） */
const extractFirstCodeBlock = (content: string): string | null => {
  if (!content) return null;
  const match = content.match(/```[\w+-]*\r?\n([\s\S]*?)```/);
  return match ? match[1].replace(/\s+$/, "") : null;
};
</script>

<style scoped lang="scss">
.asset-card {
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
  &__star {
    flex-shrink: 0;
    color: var(--el-color-warning);
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
</style>
