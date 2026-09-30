<template>
  <div class="image-gallery card">
    <!-- 顶部标题 + 操作 -->
    <div class="ig-header">
      <div class="ig-header__text">
        <h2 class="ig-header__title">照片管理</h2>
        <p class="ig-header__tip">导入远程图片地址，自动获取并压缩为 base64 保存（单张 ≤ 300KB），支持相册浏览、搜索与增删改。</p>
      </div>
      <div class="ig-header__actions">
        <el-button type="primary" :icon="Upload" @click="openImport">导入图片地址</el-button>
        <el-button type="success" plain :icon="Refresh" @click="loadAllImages">刷新列表</el-button>
      </div>
    </div>

    <!-- dataType + 搜索 工具栏 -->
    <div class="ig-toolbar">
      <div class="ig-datatype">
        <span class="ig-datatype__label">dataType：</span>
        <el-tag v-if="currentDataType" type="info" effect="plain">{{ currentDataType }}</el-tag>
        <span v-else class="ig-muted">未设置</span>
      </div>
      <div class="ig-search">
        <el-input
          v-model="keyword"
          placeholder="搜索图片地址关键字"
          clearable
          :prefix-icon="Search"
          class="ig-search__input"
          @keyup.enter="doSearch"
          @clear="doSearch"
        />
        <el-button type="primary" :icon="Search" @click="doSearch">搜索</el-button>
      </div>
    </div>

    <!-- 统计 -->
    <div class="ig-stats">
      <template v-if="totalRecords">共 {{ totalRecords }} 张图片，已加载 {{ imageList.length }} 张</template>
      <template v-else-if="!loading">暂无图片</template>
      <span v-if="activeKeyword" class="ig-muted">（搜索：{{ activeKeyword }}）</span>
    </div>

    <!-- 相册网格（无限滚动） -->
    <div
      v-loading="loading"
      v-infinite-scroll="loadNextPage"
      class="ig-scroll"
      :infinite-scroll-disabled="scrollDisabled"
      :infinite-scroll-distance="200"
    >
      <el-empty v-if="!loading && !imageList.length" :description="emptyText" />
      <div v-else class="ig-gallery">
        <div v-for="(img, idx) in imageList" :key="img.dataKey" class="ig-card">
          <div class="ig-card__img" :class="{ portrait: img.orient === 'portrait' }">
            <el-image
              :src="img.src"
              :fit="img.orient === 'portrait' ? 'contain' : 'cover'"
              :preview-src-list="previewList"
              :initial-index="idx"
              preview-teleported
              class="ig-card__el-image"
            >
              <template #error>
                <div class="ig-card__tip ig-card__tip--err">加载失败</div>
              </template>
              <template #placeholder>
                <div class="ig-card__tip">加载中...</div>
              </template>
            </el-image>
            <span class="ig-card__badge" :class="img.orient">{{ img.orient === "portrait" ? "竖屏" : "横屏" }}</span>
          </div>
          <div class="ig-card__body">
            <div class="ig-card__url" :title="img.dataKey">{{ img.dataKey }}</div>
            <div class="ig-card__actions">
              <el-button link type="primary" size="small" @click="copyUrl(img)">复制地址</el-button>
              <el-button link type="primary" size="small" @click="openEdit(img)">编辑</el-button>
              <el-button link type="danger" size="small" @click="deleteImage(img)">删除</el-button>
              <el-button link type="warning" size="small" @click="openOriginal(img)">原图</el-button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="imageList.length && imageList.length < totalRecords" class="ig-load-tip">向下滚动加载更多...</div>
      <div v-else-if="totalRecords > PAGE_LIMIT" class="ig-load-tip">已全部加载（共 {{ totalRecords }} 张）</div>
    </div>

    <!-- 导入图片地址 -->
    <el-dialog v-model="importDialog.visible" title="导入图片地址" width="640px" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="图片地址列表（每行一个 URL）">
          <el-input
            v-model="importDialog.urls"
            type="textarea"
            :rows="8"
            :disabled="importDialog.importing"
            placeholder="粘贴图片地址，每行一个，例如：&#10;https://raw.githubusercontent.com/xxx/img1.png&#10;https://raw.githubusercontent.com/xxx/img2.jpg"
          />
        </el-form-item>
        <el-form-item label="dataType（数据分类，留空则自动从首个 URL 推导）">
          <el-input v-model="importDialog.dataType" :disabled="importDialog.importing" placeholder="留空自动推导" />
        </el-form-item>
      </el-form>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="系统会自动获取远程图片并压缩为 base64 保存，单张不超过 300KB。"
        class="ig-dialog-tip"
      />

      <div v-if="importDialog.importing || importDialog.done" class="ig-import-progress">
        <el-progress :percentage="importDialog.percent" :status="importDialog.status" />
        <div class="ig-progress-text">{{ importDialog.text }}</div>
      </div>

      <div v-if="importDialog.failed.length" class="ig-failed">
        <el-scrollbar max-height="140px">
          <div v-for="(f, i) in importDialog.failed" :key="i" class="ig-failed__item">
            <el-tag size="small" :type="f.phase === 'fetch' ? 'warning' : 'danger'">
              {{ f.phase === "fetch" ? "获取失败" : "保存失败" }}
            </el-tag>
            <span class="ig-failed__url" :title="f.url">{{ f.url }}</span>
          </div>
        </el-scrollbar>
      </div>

      <template #footer>
        <el-button :disabled="importDialog.importing" @click="importDialog.visible = false">关闭</el-button>
        <el-button v-if="importDialog.failed.length" type="warning" :loading="importDialog.importing" @click="retryFailed">
          重试失败项（{{ importDialog.failed.length }}）
        </el-button>
        <el-button type="primary" :loading="importDialog.importing" @click="doImport">开始导入</el-button>
      </template>
    </el-dialog>

    <!-- 编辑图片信息 -->
    <el-dialog v-model="editDialog.visible" title="编辑图片信息" width="560px">
      <el-form label-position="top">
        <el-form-item label="图片地址（dataKey）">
          <el-input v-model="editDialog.url" placeholder="图片地址" />
        </el-form-item>
      </el-form>
      <div class="ig-muted ig-dialog-tip">修改地址后，图片预览将使用新地址（需确保新地址可访问）。</div>
      <template #footer>
        <el-button @click="editDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="editDialog.saving" @click="doEditImage">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="blogToolsImageGallery">
import { Refresh, Search, Upload } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";

import {
  checkGeneralDataKeys,
  GeneralData,
  GeneralDataSaveParams,
  getGeneralDataPage,
  removeGeneralData,
  removeGeneralDataByKey,
  saveGeneralData,
  saveOrUpdateGeneralData,
  updateGeneralData
} from "@/api/modules/generalData";

// ========== 常量 ==========
const PAGE_LIMIT = 20;
const DEFAULT_DATA_TYPE = "cdn-jsdelivr-net-gh-pcl1350306170";
const SIZE_LIMIT_KB = 300;
const LS_DATA_TYPE = "geeker_imageGallery_dataType";
const LS_ORIENT_CACHE = "geeker_imageGallery_orientCache";

// ========== 类型 ==========
interface ImageItem {
  id: number | null;
  dataKey: string;
  dataContent: string;
  src: string;
  orient: "landscape" | "portrait";
}
interface FailedItem {
  url: string;
  base64: string | null;
  phase: "fetch" | "save";
}

// ========== 状态 ==========
const loading = ref(false);
const currentDataType = ref("");
const keyword = ref("");
const activeKeyword = ref("");
const imageList = ref<ImageItem[]>([]);
const totalRecords = ref(0);
const currentPage = ref(1);
const isLoadingPage = ref(false);
const loadedDataKeys = ref<Set<string>>(new Set());

// 方向缓存（跨会话，key 为 dataKey）
let orientCache: Record<string, "landscape" | "portrait"> = {};

// ========== 计算属性 ==========
const previewList = computed(() => imageList.value.map(i => i.src));
const scrollDisabled = computed(
  () => loading.value || isLoadingPage.value || !currentDataType.value || imageList.value.length >= totalRecords.value
);
const emptyText = computed(() => {
  if (!currentDataType.value) return "暂无数据，请先点击「导入图片地址」";
  if (activeKeyword.value) return `未找到匹配「${activeKeyword.value}」的图片`;
  return "暂无图片数据，请先导入";
});

// ========== 剪贴板 ==========
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 降级到 execCommand */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}
async function copyUrl(img: ImageItem) {
  const ok = await copyText(img.dataKey);
  if (ok) ElMessage.success("地址已复制");
  else ElMessage.error("复制失败，请手动复制");
}

// ========== 工具：从 URL 推导 dataType ==========
function deriveDataType(url: string): string {
  try {
    const u = new URL(url);
    const hostParts = u.hostname.split(".");
    const pathParts = u.pathname.split("/").filter(Boolean);
    const pathPrefix = pathParts.slice(0, Math.min(2, pathParts.length));
    return [...hostParts, ...pathPrefix].join("-");
  } catch {
    return "image_gallery";
  }
}

// ========== 工具：远程图片压缩为 base64（≤300KB） ==========
function fetchImageAsBase64(url: string, maxWidth = 1920, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const sizeKB = (b64: string) => (b64.length * 0.75) / 1024;
      const renderAt = (rw: number, rh: number, q: number) => {
        const canvas = document.createElement("canvas");
        canvas.width = rw;
        canvas.height = rh;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, rw, rh);
        return { base64: canvas.toDataURL("image/jpeg", q), w: rw, h: rh };
      };
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      // 先降质量，仍超限再逐步缩小分辨率
      let result = renderAt(w, h, quality);
      if (sizeKB(result.base64) > SIZE_LIMIT_KB) result = renderAt(w, h, 0.6);
      if (sizeKB(result.base64) > SIZE_LIMIT_KB) result = renderAt(w, h, 0.4);
      if (sizeKB(result.base64) > SIZE_LIMIT_KB) result = renderAt(w, h, 0.2);
      while (sizeKB(result.base64) > SIZE_LIMIT_KB && result.w > 80 && result.h > 80) {
        result = renderAt(Math.round(result.w * 0.75), Math.round(result.h * 0.75), 0.2);
      }
      resolve(result.base64);
    };
    img.onerror = () => reject(new Error("图片加载失败: " + url));
    img.src = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
  });
}

// ========== 工具：方向检测 + 缓存 ==========
function loadOrientCache(): Record<string, "landscape" | "portrait"> {
  try {
    return JSON.parse(localStorage.getItem(LS_ORIENT_CACHE) || "{}");
  } catch {
    return {};
  }
}
function saveOrientCache(cache: Record<string, "landscape" | "portrait">) {
  try {
    localStorage.setItem(LS_ORIENT_CACHE, JSON.stringify(cache));
  } catch {
    /* 存储超限时忽略 */
  }
}
function detectOrientation(src: string): Promise<"landscape" | "portrait"> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth >= img.naturalHeight ? "landscape" : "portrait");
    img.onerror = () => resolve("landscape");
    img.src = src;
  });
}
function toSrc(rec: GeneralData): string {
  return rec.dataContent && rec.dataContent.startsWith("data:") ? rec.dataContent : rec.dataKey;
}
function makeItem(rec: GeneralData): ImageItem {
  return {
    id: rec.id ?? null,
    dataKey: rec.dataKey,
    dataContent: rec.dataContent,
    src: toSrc(rec),
    orient: orientCache[rec.dataKey] || "landscape"
  };
}
async function detectAndCacheOrient(items: ImageItem[]) {
  const need = items.filter(it => !orientCache[it.dataKey]);
  if (!need.length) return;
  const BATCH = 6;
  for (let b = 0; b < need.length; b += BATCH) {
    const batch = need.slice(b, b + BATCH);
    await Promise.all(
      batch.map(async it => {
        const orient = await detectOrientation(it.src);
        it.orient = orient;
        orientCache[it.dataKey] = orient;
      })
    );
  }
  saveOrientCache(orientCache);
}

// ========== 列表加载 ==========
async function appendItems(recs: GeneralData[]) {
  const items = recs.filter(rec => !loadedDataKeys.value.has(rec.dataKey)).map(makeItem);
  if (!items.length) return;
  await detectAndCacheOrient(items);
  items.forEach(it => {
    imageList.value.push(it);
    loadedDataKeys.value.add(it.dataKey);
  });
}

async function loadAllImages() {
  if (!currentDataType.value) {
    currentDataType.value = localStorage.getItem(LS_DATA_TYPE) || DEFAULT_DATA_TYPE;
  }
  loading.value = true;
  currentPage.value = 1;
  totalRecords.value = 0;
  imageList.value = [];
  loadedDataKeys.value = new Set();
  activeKeyword.value = keyword.value.trim();
  try {
    const res = await getGeneralDataPage({
      dataType: currentDataType.value,
      keyword: activeKeyword.value || undefined,
      page: 1,
      limit: PAGE_LIMIT
    });
    totalRecords.value = res.total || 0;
    localStorage.setItem(LS_DATA_TYPE, currentDataType.value);
    await appendItems(res.list || []);
  } catch {
    imageList.value = [];
    totalRecords.value = 0;
  } finally {
    loading.value = false;
  }
}

async function loadNextPage() {
  if (scrollDisabled.value) return;
  isLoadingPage.value = true;
  const nextPage = currentPage.value + 1;
  try {
    const res = await getGeneralDataPage({
      dataType: currentDataType.value,
      keyword: activeKeyword.value || undefined,
      page: nextPage,
      limit: PAGE_LIMIT
    });
    currentPage.value = nextPage;
    totalRecords.value = res.total || 0;
    await appendItems(res.list || []);
  } catch {
    /* 加载失败，保持当前页码 */
  } finally {
    isLoadingPage.value = false;
  }
}

function doSearch() {
  loadAllImages();
}

// ========== 导入 ==========
const importDialog = reactive({
  visible: false,
  importing: false,
  done: false,
  urls: "",
  dataType: "",
  percent: 0,
  status: "" as "" | "success" | "exception" | "warning",
  text: "",
  failed: [] as FailedItem[]
});
function openImport() {
  Object.assign(importDialog, {
    visible: true,
    importing: false,
    done: false,
    urls: "",
    dataType: currentDataType.value || "",
    percent: 0,
    status: "",
    text: "",
    failed: []
  });
}
async function saveWithRetry(item: GeneralDataSaveParams, maxRetries = 2): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await saveGeneralData(item);
      return true;
    } catch {
      if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return false;
}
async function doImport() {
  const rawUrls = importDialog.urls
    .split("\n")
    .map(u => u.trim())
    .filter(u => u && u.startsWith("http"));
  if (!rawUrls.length) {
    ElMessage.warning("未找到有效的图片地址（需以 http 开头，每行一个）");
    return;
  }
  // 1. 输入列表内部去重
  const beforeDedup = rawUrls.length;
  let urls = [...new Set(rawUrls)];
  const inputDupCount = beforeDedup - urls.length;

  // 2. 确定 dataType（留空自动推导）
  let dataType = importDialog.dataType.trim();
  if (!dataType) dataType = deriveDataType(urls[0]);

  Object.assign(importDialog, { importing: true, done: false, failed: [], percent: 0, status: "" });

  // 3. 接口去重：仅保留后端不存在的 dataKey
  let apiDedupCount = 0;
  try {
    const notExistKeys = await checkGeneralDataKeys(dataType, urls);
    const notExistSet = new Set(notExistKeys || []);
    apiDedupCount = urls.length - notExistSet.size;
    urls = urls.filter(u => notExistSet.has(u));
  } catch {
    /* 去重失败则用原始列表继续 */
  }

  if (!urls.length) {
    let msg = "所有地址均已跳过";
    if (inputDupCount > 0) msg += `（输入重复 ${inputDupCount} 条）`;
    if (apiDedupCount > 0) msg += `（已存在 ${apiDedupCount} 条）`;
    Object.assign(importDialog, { importing: false, done: true, percent: 100, status: "warning", text: msg });
    ElMessage.info(msg);
    return;
  }

  currentDataType.value = dataType;
  localStorage.setItem(LS_DATA_TYPE, dataType);

  // 4. 逐张获取压缩并保存
  const total = urls.length;
  let savedCount = 0;
  const failed: FailedItem[] = [];
  const dupInfo = inputDupCount || apiDedupCount ? `（去重：输入重复 ${inputDupCount}，已存在 ${apiDedupCount}）` : "";
  importDialog.text = `待处理 ${total} 张${dupInfo}`;

  for (let i = 0; i < total; i++) {
    const url = urls[i];
    importDialog.percent = Math.round((i / total) * 100);
    importDialog.text = `[${i + 1}/${total}] 获取图片中...`;
    let base64: string;
    try {
      base64 = await fetchImageAsBase64(url);
    } catch {
      failed.push({ url, base64: null, phase: "fetch" });
      continue;
    }
    importDialog.text = `[${i + 1}/${total}] 保存中...`;
    const ok = await saveWithRetry({ dataType, dataKey: url, dataContent: base64 });
    if (ok) savedCount++;
    else failed.push({ url, base64, phase: "save" });
    importDialog.percent = Math.round(((i + 1) / total) * 100);
  }

  Object.assign(importDialog, { importing: false, done: true, percent: 100, failed });
  if (!failed.length) {
    importDialog.status = "success";
    importDialog.text = `导入完成！共 ${savedCount} 张全部保存成功`;
    ElMessage.success(importDialog.text);
    importDialog.visible = false;
  } else {
    importDialog.status = "exception";
    importDialog.text = `完成：成功 ${savedCount} 张，失败 ${failed.length} 张`;
    ElMessage.warning(importDialog.text);
  }
  loadAllImages();
}

async function retryFailed() {
  const failed = importDialog.failed;
  if (!failed.length) return;
  const dataType = currentDataType.value;
  Object.assign(importDialog, { importing: true, done: false, status: "", percent: 0 });
  const stillFailed: FailedItem[] = [];
  let successCount = 0;
  const total = failed.length;
  for (let i = 0; i < total; i++) {
    const f = failed[i];
    importDialog.percent = Math.round((i / total) * 100);
    importDialog.text = `[${i + 1}/${total}] 重试${f.phase === "fetch" ? "获取" : "保存"}...`;
    let base64 = f.base64;
    if (!base64) {
      try {
        base64 = await fetchImageAsBase64(f.url);
      } catch {
        stillFailed.push({ url: f.url, base64: null, phase: "fetch" });
        continue;
      }
    }
    const ok = await saveWithRetry({ dataType, dataKey: f.url, dataContent: base64 });
    if (ok) successCount++;
    else stillFailed.push({ url: f.url, base64, phase: "save" });
  }
  Object.assign(importDialog, { importing: false, done: true, percent: 100, failed: stillFailed });
  importDialog.status = stillFailed.length ? "exception" : "success";
  importDialog.text = `重试完成：成功 ${successCount}/${total}`;
  if (stillFailed.length) ElMessage.warning(importDialog.text);
  else ElMessage.success(importDialog.text);
  loadAllImages();
}

// ========== 编辑 ==========
const editDialog = reactive({ visible: false, saving: false, item: null as ImageItem | null, url: "" });
function openEdit(img: ImageItem) {
  Object.assign(editDialog, { visible: true, saving: false, item: img, url: img.dataKey });
}
async function doEditImage() {
  const item = editDialog.item;
  if (!item) return;
  const newUrl = editDialog.url.trim();
  if (!newUrl) {
    ElMessage.warning("地址不能为空");
    return;
  }
  editDialog.saving = true;
  try {
    if (item.id) await updateGeneralData(item.id, { dataKey: newUrl });
    else await saveOrUpdateGeneralData(currentDataType.value, newUrl, item.dataContent);
    const oldKey = item.dataKey;
    item.dataKey = newUrl;
    // 原本展示的是远程地址（非 base64）时，预览也切到新地址
    if (!item.dataContent || !item.dataContent.startsWith("data:")) item.src = newUrl;
    loadedDataKeys.value.delete(oldKey);
    loadedDataKeys.value.add(newUrl);
    if (orientCache[oldKey]) {
      orientCache[newUrl] = orientCache[oldKey];
      delete orientCache[oldKey];
      saveOrientCache(orientCache);
    }
    editDialog.visible = false;
    ElMessage.success("保存成功");
  } catch (e: any) {
    ElMessage.error("保存失败: " + (e?.message || e));
  } finally {
    editDialog.saving = false;
  }
}

// ========== 删除 ==========
async function deleteImage(img: ImageItem) {
  const shortUrl = img.dataKey.length > 60 ? img.dataKey.slice(0, 60) + "..." : img.dataKey;
  try {
    await ElMessageBox.confirm(`确定删除此图片？\n${shortUrl}`, "删除确认", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消"
    });
  } catch {
    return;
  }
  try {
    if (img.id) await removeGeneralData(img.id);
    else await removeGeneralDataByKey(currentDataType.value, img.dataKey);
    const idx = imageList.value.findIndex(i => i.dataKey === img.dataKey);
    if (idx > -1) imageList.value.splice(idx, 1);
    loadedDataKeys.value.delete(img.dataKey);
    totalRecords.value = Math.max(0, totalRecords.value - 1);
    ElMessage.success("删除成功");
  } catch (e: any) {
    ElMessage.error("删除失败: " + (e?.message || e));
  }
}

// ========== 原图 ==========
function openOriginal(img: ImageItem) {
  window.open(img.dataKey, "_blank");
}

// ========== 初始化 ==========
onMounted(() => {
  orientCache = loadOrientCache();
  currentDataType.value = localStorage.getItem(LS_DATA_TYPE) || DEFAULT_DATA_TYPE;
  loadAllImages();
});
</script>

<style scoped lang="scss">
.image-gallery {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 18px;
  overflow: hidden;
}
.ig-header {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  &__tip {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
  &__actions {
    display: flex;
    flex-shrink: 0;
    gap: 10px;
  }
}
.ig-toolbar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.ig-datatype {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  &__label {
    color: var(--el-text-color-secondary);
  }
}
.ig-search {
  display: flex;
  gap: 8px;
  align-items: center;
  &__input {
    width: 280px;
  }
}
.ig-stats {
  flex-shrink: 0;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.ig-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.ig-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  padding-bottom: 16px;
}
.ig-card {
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  transition:
    border-color 0.2s,
    transform 0.2s;
  &:hover {
    border-color: var(--el-color-primary);
    transform: translateY(-2px);
  }
  &__img {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    cursor: pointer;
    background: var(--el-fill-color-light);
    &.portrait {
      aspect-ratio: 9 / 14;
    }
  }
  &__el-image {
    width: 100%;
    height: 100%;
  }
  &__badge {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 2;
    padding: 2px 8px;
    font-size: 11px;
    color: #ffffff;
    pointer-events: none;
    border-radius: 4px;
    &.landscape {
      background: var(--el-color-primary);
    }
    &.portrait {
      background: var(--el-color-warning);
    }
  }
  &__tip {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    &--err {
      color: var(--el-color-danger);
    }
  }
  &__body {
    padding: 10px 12px;
  }
  &__url {
    display: -webkit-box;
    margin-bottom: 8px;
    overflow: hidden;
    -webkit-line-clamp: 2;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
    overflow-wrap: break-word;
    -webkit-box-orient: vertical;
  }
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
}
.ig-load-tip {
  padding: 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
.ig-muted {
  color: var(--el-text-color-secondary);
}
.ig-dialog-tip {
  margin-bottom: 10px;
}
.ig-import-progress {
  margin-top: 12px;
}
.ig-progress-text {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
.ig-failed {
  margin-top: 12px;
  &__item {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 4px 0;
    font-size: 12px;
  }
  &__url {
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
}
</style>
