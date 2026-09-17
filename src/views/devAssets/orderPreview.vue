<template>
  <div class="order-preview card">
    <!-- 头部说明 -->
    <div class="preview-header">
      <h2 class="preview-header__title">订单预览</h2>
      <p class="preview-header__tip">
        自动筛选标签包含「门诊特殊订单」的资产，提取正文首图作为缩略图，点击卡片查看完整开发内容。
      </p>
    </div>

    <!-- 缩略图网格 -->
    <div v-loading="loading" class="preview-result">
      <div v-if="previewList.length" class="preview-result__grid">
        <div v-for="item in previewList" :key="item.id" class="preview-card" @click="openDetail(item.id)">
          <div class="preview-card__thumb">
            <el-image
              v-if="item.coverImage"
              :src="resolveSrc(item)"
              fit="cover"
              lazy
              class="preview-card__img"
              @error="handleImgError(item)"
            >
              <template #error>
                <div class="preview-card__broken">
                  <el-icon><PictureFilled /></el-icon>
                  <span>图片加载失败</span>
                </div>
              </template>
            </el-image>
            <div v-else class="preview-card__noimg">
              <el-icon><Picture /></el-icon>
              <span>正文无图片</span>
            </div>
          </div>
          <div class="preview-card__body">
            <span class="preview-card__title" :title="item.title">{{ item.title }}</span>
            <div class="preview-card__meta">
              <el-tag size="small" :type="(ASSET_TYPE_TAG_TYPE[item.type] as any) || 'info'" effect="light">
                {{ ASSET_TYPE_MAP[item.type] || item.type }}
              </el-tag>
              <span class="preview-card__date">{{ dayjs(item.updatedAt).format("YYYY-MM-DD") }}</span>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-if="!loading && !previewList.length" description="暂无「门诊特殊订单」相关资产" />
    </div>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="pageable.pageNum"
      v-model:page-size="pageable.pageSize"
      :total="pageable.total"
      :page-sizes="[24, 48, 96]"
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

<script setup lang="ts" name="devAssetsOrderPreview">
import { Picture, PictureFilled } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { onActivated, onMounted, reactive, ref } from "vue";

import { getDevAssetOrderPreviewApi } from "@/api/modules/devAssets";
import { DevAsset } from "@/api/interface";
import DetailDialog from "@/views/devAssets/components/DetailDialog.vue";
import EditDialog from "@/views/devAssets/components/EditDialog.vue";
import { ASSET_TYPE_MAP, ASSET_TYPE_TAG_TYPE } from "@/views/devAssets/config";
import { toLocalImgUrl } from "@/views/devAssets/utils/imgFallback";

const loading = ref(false);
const previewList = ref<DevAsset.ResAssetPreview[]>([]);

const pageable = reactive({
  pageNum: 1,
  pageSize: 24,
  total: 0
});

/** 记录已加载失败的资产，回退到后端本地直出地址 */
const fallbackIds = reactive<Record<number, boolean>>({});

const resolveSrc = (item: DevAsset.ResAssetPreview) => {
  if (!item.coverImage) return "";
  return fallbackIds[item.id] ? toLocalImgUrl(item.coverImage) : item.coverImage;
};

const handleImgError = (item: DevAsset.ResAssetPreview) => {
  if (!fallbackIds[item.id]) fallbackIds[item.id] = true;
};

const fetchList = async () => {
  loading.value = true;
  try {
    const { data } = await getDevAssetOrderPreviewApi({
      pageNum: pageable.pageNum,
      pageSize: pageable.pageSize
    });
    previewList.value = data.list || [];
    pageable.total = data.total || 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pageable.pageNum = 1;
  fetchList();
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

/** 编辑/新增保存后刷新列表 */
const handleEditSaved = () => {
  fetchList();
};

onMounted(fetchList);
onActivated(fetchList);
</script>

<style scoped lang="scss">
.order-preview {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 18px;
}
.preview-header {
  margin-bottom: 16px;
  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  &__tip {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}
.preview-result {
  flex: 1;
  min-height: 200px;
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
  }
}
.preview-card {
  overflow: hidden;
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: all 0.2s;
  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
    .preview-card__img {
      transform: scale(1.03);
    }
  }
  &__thumb {
    height: 150px;
    overflow: hidden;
    background: var(--el-fill-color-light);
  }
  &__img {
    width: 100%;
    height: 100%;
    transition: transform 0.3s;
  }
  &__noimg,
  &__broken {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    .el-icon {
      font-size: 28px;
    }
  }
  &__body {
    padding: 10px 12px;
  }
  &__title {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    white-space: nowrap;
  }
  &__meta {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }
  &__date {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
.el-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
