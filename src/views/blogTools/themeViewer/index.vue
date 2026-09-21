<template>
  <div class="theme-viewer card">
    <!-- 顶部标题 + 操作 -->
    <div class="tv-header">
      <div class="tv-header__text">
        <h2 class="tv-header__title">Theme 数据管理</h2>
        <p class="tv-header__tip">
          点击条目「复制内容」会自动拼接当前"使用中"的前缀；支持大类 / 类别 / 条目的在线增删改与 JSON 导入。
        </p>
      </div>
      <div class="tv-header__actions">
        <el-button type="primary" plain :icon="Setting" @click="prefixDialogVisible = true">内容前缀管理</el-button>
        <el-button type="primary" :icon="Upload" @click="openImport">导入 JSON 数据</el-button>
        <el-button type="primary" plain :icon="Upload" @click="openSubImport">导入子类数据</el-button>
        <el-button type="success" :icon="Plus" @click="openAddTheme">新增大类</el-button>
      </div>
    </div>

    <!-- 内容前缀管理（弹窗） -->
    <el-dialog v-model="prefixDialogVisible" title="内容前缀管理" width="920px" destroy-on-close>
      <div class="tv-dialog-toolbar">
        <el-button type="primary" :icon="Plus" size="small" @click="openAddPrefix">新增前缀</el-button>
      </div>
      <el-table :data="prefixes" border size="small" max-height="420">
        <el-table-column prop="dataKey" label="名称" width="160" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" min-width="220">
          <template #default="{ row }">
            <div class="tv-clamp">{{ row.content }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.active" type="success" size="small">使用中</el-tag>
            <span v-else class="tv-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="复制次数" width="100" align="center">
          <template #default="{ row }">
            <el-tooltip :content="row.lastCopyTime ? '最近复制: ' + row.lastCopyTime : '尚未复制'">
              <span>{{ row.copyCount || 0 }} 次</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="copyPrefix(row)">复制内容</el-button>
            <el-button link type="warning" @click="resetPrefixCount(row)">重置次数</el-button>
            <el-button v-if="!row.active" link type="success" @click="setActivePrefix(row)">设为使用中</el-button>
            <el-button link type="primary" @click="openEditPrefix(row)">编辑</el-button>
            <el-button link type="danger" @click="deletePrefix(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无前缀，点击左上角新增" :image-size="60" /></template>
      </el-table>
    </el-dialog>

    <div class="tv-body">
      <!-- 左侧导航树 -->
      <aside class="tv-sidebar">
        <div class="tv-sidebar__title">分类导航</div>
        <el-scrollbar class="tv-sidebar__scroll">
          <el-tree
            v-if="themeStructure.length"
            ref="treeRef"
            :data="treeData"
            node-key="key"
            :props="{ label: 'label', children: 'children' }"
            :expand-on-click-node="false"
            default-expand-all
            highlight-current
            @node-click="onTreeNodeClick"
          />
          <el-empty v-else description="暂无数据" :image-size="60" />
        </el-scrollbar>
      </aside>

      <!-- 右侧主内容：内部独立滚动 -->
      <el-scrollbar ref="mainScrollRef" class="tv-scroll">
        <main class="tv-main">
          <!-- 主题结构 -->
          <div v-loading="loading" class="tv-themes">
            <el-empty v-if="!loading && !themeStructure.length" description="暂无数据，请先导入 JSON 数据或新增大类" />

            <el-card v-for="(theme, ti) in themeStructure" :id="'theme-' + ti" :key="ti" class="theme-card" shadow="never">
              <template #header>
                <div class="tv-card-header">
                  <span class="theme-title">{{ theme.大类 }}</span>
                  <div>
                    <el-button link type="primary" :icon="Plus" @click="openAddCat(ti)">添加类别</el-button>
                    <el-button link type="danger" :icon="Delete" @click="deleteTheme(ti)">删除大类</el-button>
                  </div>
                </div>
              </template>

              <el-empty v-if="!theme.类别 || !theme.类别.length" description="该大类下暂无类别" :image-size="50" />

              <div v-for="(catName, ci) in theme.类别" :id="'cat-' + ti + '-' + ci" :key="ci" class="category-block">
                <div class="category-header" @click="toggleCategory(ti, ci)">
                  <el-icon class="cat-arrow" :class="{ 'is-expanded': isExpanded(ti, ci) }"><ArrowRight /></el-icon>
                  <span class="cat-name">{{ catName }}</span>
                  <el-tag v-if="isLoaded(ti, ci)" size="small" type="info">{{ itemCount(ti, ci) }} 条</el-tag>
                  <el-button link type="danger" :icon="Delete" class="cat-del" @click.stop="deleteCategory(ti, ci)"
                    >删除类别</el-button
                  >
                </div>

                <div v-show="isExpanded(ti, ci)" class="category-body">
                  <div v-if="!isLoaded(ti, ci)" class="tv-muted tv-loading-tip">加载中...</div>
                  <template v-else>
                    <el-table :data="themeItems[keyOf(ti, ci)] || []" border size="small">
                      <el-table-column type="index" label="#" width="50" align="center" />
                      <el-table-column prop="dataKey" label="名称" width="180" show-overflow-tooltip />
                      <el-table-column prop="content" label="描述" min-width="260">
                        <template #default="{ row }">
                          <div class="tv-clamp">{{ row.content }}</div>
                        </template>
                      </el-table-column>
                      <el-table-column label="复制次数" width="100" align="center">
                        <template #default="{ row }">
                          <el-tooltip :content="row.lastCopyTime ? '最近复制: ' + row.lastCopyTime : '尚未复制'">
                            <span>{{ row.copyCount || 0 }} 次</span>
                          </el-tooltip>
                        </template>
                      </el-table-column>
                      <el-table-column label="操作" width="280" align="center">
                        <template #default="{ row, $index }">
                          <el-button link type="primary" @click="copyItem(row)">复制内容</el-button>
                          <el-button link type="warning" @click="resetItemCount(row)">重置次数</el-button>
                          <el-button link type="primary" @click="openEditItem(ti, ci, $index)">编辑</el-button>
                          <el-button link type="danger" @click="deleteItem(ti, ci, $index)">删除</el-button>
                        </template>
                      </el-table-column>
                      <template #empty><el-empty description="暂无条目" :image-size="50" /></template>
                    </el-table>
                    <el-button class="add-item-btn" :icon="Plus" plain @click="openAddItem(ti, ci)">添加条目</el-button>
                  </template>
                </div>
              </div>
            </el-card>
          </div>
        </main>
      </el-scrollbar>
    </div>

    <el-backtop target=".tv-scroll .el-scrollbar__wrap" :right="30" :bottom="30" />

    <!-- 前缀 新增/编辑 -->
    <el-dialog
      v-model="prefixDialog.visible"
      :title="prefixDialog.mode === 'add' ? '新增内容前缀' : '编辑前缀'"
      width="560px"
      destroy-on-close
    >
      <el-form ref="prefixFormRef" :model="prefixDialog" :rules="prefixRules" label-width="90px">
        <el-form-item label="前缀名称" prop="dataKey">
          <el-input v-model="prefixDialog.dataKey" maxlength="100" placeholder="例如：通用前缀、16:9比例" />
        </el-form-item>
        <el-form-item label="前缀内容" prop="content">
          <el-input v-model="prefixDialog.content" type="textarea" :rows="5" placeholder="复制条目时将自动拼接到描述前面" />
        </el-form-item>
        <el-form-item label="设为使用中">
          <el-switch v-model="prefixDialog.active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="prefixDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="prefixDialog.saving" @click="savePrefix">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增大类 -->
    <el-dialog v-model="themeDialog.visible" title="新增大类主题" width="460px" destroy-on-close>
      <el-form ref="themeFormRef" :model="themeDialog" :rules="themeRules" label-width="120px">
        <el-form-item label="主题名称" prop="name">
          <el-input v-model="themeDialog.name" maxlength="100" placeholder="例如：赛博主题" />
        </el-form-item>
        <el-form-item label="首个类别名称">
          <el-input v-model="themeDialog.firstCat" maxlength="100" placeholder="可选，例如：自然风光" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="themeDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="themeDialog.saving" @click="doAddTheme">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增类别 -->
    <el-dialog v-model="catDialog.visible" title="新增类别" width="420px" destroy-on-close>
      <el-form ref="catFormRef" :model="catDialog" :rules="catRules" label-width="90px">
        <el-form-item label="所属大类">
          <el-input :model-value="themeStructure[catDialog.ti]?.大类" disabled />
        </el-form-item>
        <el-form-item label="类别名称" prop="name">
          <el-input v-model="catDialog.name" maxlength="100" placeholder="例如：星空宇宙" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="catDialog.saving" @click="doAddCategory">确定</el-button>
      </template>
    </el-dialog>

    <!-- 条目 新增/编辑 -->
    <el-dialog
      v-model="itemDialog.visible"
      :title="itemDialog.mode === 'add' ? '添加条目' : '编辑条目'"
      width="560px"
      destroy-on-close
    >
      <el-form ref="itemFormRef" :model="itemDialog" :rules="itemRules" label-width="70px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="itemDialog.name" maxlength="200" placeholder="条目名称" />
        </el-form-item>
        <el-form-item label="描述" prop="desc">
          <el-input v-model="itemDialog.desc" type="textarea" :rows="6" placeholder="条目描述内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="itemDialog.saving" @click="doSaveItem">保存</el-button>
      </template>
    </el-dialog>

    <!-- 导入 JSON 数据 -->
    <el-dialog v-model="importDialog.visible" title="导入 JSON 数据" width="720px" destroy-on-close>
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="导入将覆盖现有结构（大类 / 类别 / 条目）"
        class="tv-dialog-tip"
      />
      <el-input
        v-model="importDialog.json"
        type="textarea"
        :rows="12"
        placeholder='[{"大类":"主题名","分类数据":[{"类别":"类别名","内容":[{"名称":"xxx","描述":"xxx"}]}]}]'
      />
      <template #footer>
        <el-button @click="importDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="importDialog.importing" @click="doImport">开始导入</el-button>
      </template>
    </el-dialog>

    <!-- 导入子类数据 -->
    <el-dialog v-model="subImportDialog.visible" title="导入子类数据" width="720px" destroy-on-close>
      <el-form label-width="90px">
        <el-form-item label="子类">
          <el-select
            v-model="subImportDialog.dataType"
            placeholder="请选择要导入的子类（大类 / 类别）"
            filterable
            clearable
            class="tv-subimport-select"
          >
            <el-option v-for="opt in subImportTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="JSON 数据">
          <el-input
            v-model="subImportDialog.json"
            type="textarea"
            :rows="12"
            placeholder='[{"dataType":"名称","dataContent":"内容"},...]'
          />
        </el-form-item>
      </el-form>
      <div class="tv-muted tv-dialog-tip">JSON 中 dataType 字段将作为 dataKey，dataContent 作为描述内容。</div>
      <template #footer>
        <el-button @click="subImportDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="subImportDialog.importing" @click="doSubImport">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="blogToolsThemeViewer">
import { ArrowRight, Delete, Plus, Setting, Upload } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, ElNotification, FormInstance, FormRules } from "element-plus";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";

import {
  batchSaveGeneralData,
  GeneralData,
  getGeneralDataByType,
  removeGeneralData,
  removeGeneralDataByKey,
  saveGeneralData,
  saveOrUpdateGeneralData,
  updateGeneralData
} from "@/api/modules/generalData";

// ========== 类型 ==========
interface ThemeNode {
  大类: string;
  类别: string[];
}
interface ThemeItem {
  id: number | null;
  dataKey: string;
  dataContent: string;
  content: string;
  copyCount: number;
  lastCopyTime: string | null;
}
interface Prefix {
  id: number | null;
  dataKey: string;
  content: string;
  active: boolean;
  copyCount: number;
  lastCopyTime: string | null;
}

// ========== 常量与状态 ==========
/** 静默失败占位（复制计数等埋点更新失败不影响主流程） */
const noop = () => undefined;

const PREFIX_TYPE = "theme_viewer_prefix";
const STRUCT_TYPE = "theme_structure";

const loading = ref(false);
const themeStructure = ref<ThemeNode[]>([]);
const themeItems = reactive<Record<string, ThemeItem[]>>({});
const expandedCats = reactive(new Set<string>());
const prefixes = ref<Prefix[]>([]);
const prefixDialogVisible = ref(false);
const mainScrollRef = ref();
const treeRef = ref();

// ========== 数据解析工具 ==========
function parsePrefixData(jsonStr: string) {
  try {
    const obj = JSON.parse(jsonStr);
    return {
      content: obj.content || "",
      active: !!obj.active,
      copyCount: obj.copyCount || 0,
      lastCopyTime: obj.lastCopyTime || null
    };
  } catch {
    return { content: jsonStr || "", active: false, copyCount: 0, lastCopyTime: null };
  }
}
function buildPrefixJson(content: string, active: boolean, copyCount = 0, lastCopyTime: string | null = null) {
  return JSON.stringify({ content, active, copyCount, lastCopyTime });
}
function parseItemData(dataContent: string) {
  try {
    const obj = JSON.parse(dataContent);
    if (obj && typeof obj.content === "string") {
      return { content: obj.content, copyCount: obj.copyCount || 0, lastCopyTime: obj.lastCopyTime || null };
    }
  } catch {
    /* 兼容纯文本 */
  }
  return { content: dataContent || "", copyCount: 0, lastCopyTime: null };
}
function buildItemJson(content: string, copyCount = 0, lastCopyTime: string | null = null) {
  return JSON.stringify({ content, copyCount, lastCopyTime });
}
function mapRawItems(list: GeneralData[]): ThemeItem[] {
  return list.map(d => {
    const p = parseItemData(d.dataContent);
    return {
      id: d.id,
      dataKey: d.dataKey,
      dataContent: d.dataContent,
      content: p.content,
      copyCount: p.copyCount,
      lastCopyTime: p.lastCopyTime
    };
  });
}

// ========== key 工具 ==========
const keyOf = (ti: number, ci: number) => `${themeStructure.value[ti].大类}|${themeStructure.value[ti].类别[ci]}`;
const dtOf = (ti: number, ci: number) => `theme_${themeStructure.value[ti].大类}_${themeStructure.value[ti].类别[ci]}`;
const isExpanded = (ti: number, ci: number) => expandedCats.has(keyOf(ti, ci));
const isLoaded = (ti: number, ci: number) => !!themeItems[keyOf(ti, ci)];
const itemCount = (ti: number, ci: number) => (themeItems[keyOf(ti, ci)] || []).length;

// ========== 剪贴板 ==========
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 降级 */
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

// ========== 前缀管理 ==========
async function loadPrefixes() {
  try {
    const list = await getGeneralDataByType(PREFIX_TYPE);
    prefixes.value = list.map(d => {
      const p = parsePrefixData(d.dataContent);
      return {
        id: d.id,
        dataKey: d.dataKey,
        content: p.content,
        active: p.active,
        copyCount: p.copyCount,
        lastCopyTime: p.lastCopyTime
      };
    });
  } catch {
    prefixes.value = [];
  }
}

const prefixFormRef = ref<FormInstance>();
const prefixDialog = reactive({
  visible: false,
  saving: false,
  mode: "add" as "add" | "edit",
  id: null as number | null,
  oldKey: "",
  dataKey: "",
  content: "",
  active: false,
  copyCount: 0,
  lastCopyTime: null as string | null
});
const prefixRules: FormRules = { dataKey: [{ required: true, message: "请输入前缀名称", trigger: "blur" }] };

function openAddPrefix() {
  Object.assign(prefixDialog, {
    visible: true,
    saving: false,
    mode: "add",
    id: null,
    oldKey: "",
    dataKey: "",
    content: "",
    active: false,
    copyCount: 0,
    lastCopyTime: null
  });
}
function openEditPrefix(row: Prefix) {
  Object.assign(prefixDialog, {
    visible: true,
    saving: false,
    mode: "edit",
    id: row.id,
    oldKey: row.dataKey,
    dataKey: row.dataKey,
    content: row.content,
    active: row.active,
    copyCount: row.copyCount || 0,
    lastCopyTime: row.lastCopyTime
  });
}
async function deactivateOtherPrefixes(exceptKey: string) {
  for (const p of prefixes.value) {
    if (p.active && p.dataKey !== exceptKey && p.id) {
      await updateGeneralData(p.id, { dataContent: buildPrefixJson(p.content, false, p.copyCount, p.lastCopyTime) });
      p.active = false;
    }
  }
}
async function savePrefix() {
  await prefixFormRef.value?.validate();
  prefixDialog.saving = true;
  try {
    const name = prefixDialog.dataKey.trim();
    const content = prefixDialog.content.trim();
    if (prefixDialog.active) await deactivateOtherPrefixes(name);
    const json = buildPrefixJson(content, prefixDialog.active, prefixDialog.copyCount, prefixDialog.lastCopyTime);
    if (prefixDialog.mode === "add") {
      const id = await saveGeneralData({ dataType: PREFIX_TYPE, dataKey: name, dataContent: json });
      prefixes.value.push({ id, dataKey: name, content, active: prefixDialog.active, copyCount: 0, lastCopyTime: null });
    } else {
      const target = prefixDialog.id
        ? prefixes.value.find(p => p.id === prefixDialog.id)
        : prefixes.value.find(p => p.dataKey === prefixDialog.oldKey);
      if (target && target.id) {
        await updateGeneralData(target.id, { dataKey: name, dataContent: json });
        target.dataKey = name;
        target.content = content;
        target.active = prefixDialog.active;
      } else {
        const id = await saveGeneralData({ dataType: PREFIX_TYPE, dataKey: name, dataContent: json });
        prefixes.value.push({ id, dataKey: name, content, active: prefixDialog.active, copyCount: 0, lastCopyTime: null });
      }
    }
    ElMessage.success("保存成功");
    prefixDialog.visible = false;
  } finally {
    prefixDialog.saving = false;
  }
}
async function setActivePrefix(row: Prefix) {
  if (!row.id) return;
  await deactivateOtherPrefixes(row.dataKey);
  await updateGeneralData(row.id, { dataContent: buildPrefixJson(row.content, true, row.copyCount, row.lastCopyTime) });
  row.active = true;
  ElMessage.success("已设为使用中");
}
async function copyPrefix(row: Prefix) {
  const ok = await copyText(row.content || "");
  if (!ok) return ElMessage.error("复制失败，请手动复制");
  row.copyCount = (row.copyCount || 0) + 1;
  row.lastCopyTime = new Date().toLocaleString("zh-CN");
  if (row.id) {
    await updateGeneralData(row.id, {
      dataContent: buildPrefixJson(row.content, row.active, row.copyCount, row.lastCopyTime)
    }).catch(noop);
  }
  ElMessage.success("已复制");
}
async function resetPrefixCount(row: Prefix) {
  await ElMessageBox.confirm(`确定重置前缀「${row.dataKey}」的复制次数？`, "提示", { type: "warning" });
  row.copyCount = 0;
  row.lastCopyTime = null;
  if (row.id) await updateGeneralData(row.id, { dataContent: buildPrefixJson(row.content, row.active, 0, null) }).catch(noop);
  ElMessage.success("已重置");
}
async function deletePrefix(row: Prefix) {
  await ElMessageBox.confirm(`确定删除前缀「${row.dataKey}」？`, "删除确认", { type: "warning" });
  if (row.id) await removeGeneralData(row.id);
  else await removeGeneralDataByKey(PREFIX_TYPE, row.dataKey);
  prefixes.value = prefixes.value.filter(p => p.dataKey !== row.dataKey);
  ElMessage.success("删除成功");
}

// ========== 主题数据加载 ==========
async function loadAllData() {
  loading.value = true;
  try {
    const list = await getGeneralDataByType(STRUCT_TYPE);
    themeStructure.value = list.length ? JSON.parse(list[0].dataContent || "[]") : [];
  } catch {
    themeStructure.value = [];
  }
  Object.keys(themeItems).forEach(k => delete themeItems[k]);
  expandedCats.clear();
  loading.value = false;
  nextTick(initScrollSpy);
}
async function ensureCatLoaded(ti: number, ci: number) {
  const key = keyOf(ti, ci);
  if (themeItems[key]) return;
  try {
    themeItems[key] = mapRawItems(await getGeneralDataByType(dtOf(ti, ci)));
  } catch {
    themeItems[key] = [];
  }
}
async function toggleCategory(ti: number, ci: number) {
  const key = keyOf(ti, ci);
  if (expandedCats.has(key)) {
    expandedCats.delete(key);
    return;
  }
  expandedCats.add(key);
  if (!themeItems[key]) {
    await ensureCatLoaded(ti, ci);
    nextTick(initScrollSpy);
  }
}
async function saveStructure() {
  await saveOrUpdateGeneralData(STRUCT_TYPE, STRUCT_TYPE, JSON.stringify(themeStructure.value));
}

// ========== 新增大类 ==========
const themeFormRef = ref<FormInstance>();
const themeDialog = reactive({ visible: false, saving: false, name: "", firstCat: "" });
const themeRules: FormRules = { name: [{ required: true, message: "请输入主题名称", trigger: "blur" }] };
function openAddTheme() {
  Object.assign(themeDialog, { visible: true, saving: false, name: "", firstCat: "" });
}
async function doAddTheme() {
  await themeFormRef.value?.validate();
  themeDialog.saving = true;
  try {
    const name = themeDialog.name.trim();
    const firstCat = themeDialog.firstCat.trim();
    if (themeStructure.value.find(t => t.大类 === name)) return ElMessage.warning("该主题已存在");
    themeStructure.value.push({ 大类: name, 类别: firstCat ? [firstCat] : [] });
    if (firstCat) themeItems[`${name}|${firstCat}`] = [];
    await saveStructure();
    themeDialog.visible = false;
    nextTick(initScrollSpy);
    ElMessage.success("新增成功");
  } finally {
    themeDialog.saving = false;
  }
}
async function deleteTheme(ti: number) {
  const theme = themeStructure.value[ti];
  await ElMessageBox.confirm(`确定删除整个主题「${theme.大类}」及其所有数据？`, "删除确认", { type: "warning" });
  for (const catName of theme.类别 || []) {
    const key = `${theme.大类}|${catName}`;
    let items = themeItems[key];
    if (!items) {
      try {
        items = mapRawItems(await getGeneralDataByType(`theme_${theme.大类}_${catName}`));
      } catch {
        items = [];
      }
    }
    for (const item of items) if (item.id) await removeGeneralData(item.id).catch(noop);
    delete themeItems[key];
    expandedCats.delete(key);
  }
  themeStructure.value.splice(ti, 1);
  await saveStructure();
  nextTick(initScrollSpy);
  ElMessage.success("删除成功");
}

// ========== 新增类别 ==========
const catFormRef = ref<FormInstance>();
const catDialog = reactive({ visible: false, saving: false, ti: 0, name: "" });
const catRules: FormRules = { name: [{ required: true, message: "请输入类别名称", trigger: "blur" }] };
function openAddCat(ti: number) {
  Object.assign(catDialog, { visible: true, saving: false, ti, name: "" });
}
async function doAddCategory() {
  await catFormRef.value?.validate();
  catDialog.saving = true;
  try {
    const theme = themeStructure.value[catDialog.ti];
    const name = catDialog.name.trim();
    if (theme.类别.includes(name)) return ElMessage.warning("该类别已存在");
    theme.类别.push(name);
    themeItems[`${theme.大类}|${name}`] = [];
    await saveStructure();
    catDialog.visible = false;
    nextTick(initScrollSpy);
    ElMessage.success("新增成功");
  } finally {
    catDialog.saving = false;
  }
}
async function deleteCategory(ti: number, ci: number) {
  const theme = themeStructure.value[ti];
  const catName = theme.类别[ci];
  await ElMessageBox.confirm(`确定删除类别「${catName}」及其所有条目？`, "删除确认", { type: "warning" });
  const key = `${theme.大类}|${catName}`;
  let items = themeItems[key];
  if (!items) {
    try {
      items = mapRawItems(await getGeneralDataByType(`theme_${theme.大类}_${catName}`));
    } catch {
      items = [];
    }
  }
  for (const item of items) if (item.id) await removeGeneralData(item.id).catch(noop);
  theme.类别.splice(ci, 1);
  delete themeItems[key];
  expandedCats.delete(key);
  await saveStructure();
  nextTick(initScrollSpy);
  ElMessage.success("删除成功");
}

// ========== 条目 新增/编辑 ==========
const itemFormRef = ref<FormInstance>();
const itemDialog = reactive({
  visible: false,
  saving: false,
  mode: "add" as "add" | "edit",
  ti: 0,
  ci: 0,
  idx: 0,
  name: "",
  desc: ""
});
const itemRules: FormRules = { name: [{ required: true, message: "请输入名称", trigger: "blur" }] };
function openAddItem(ti: number, ci: number) {
  Object.assign(itemDialog, { visible: true, saving: false, mode: "add", ti, ci, idx: 0, name: "", desc: "" });
}
function openEditItem(ti: number, ci: number, idx: number) {
  const item = themeItems[keyOf(ti, ci)][idx];
  Object.assign(itemDialog, {
    visible: true,
    saving: false,
    mode: "edit",
    ti,
    ci,
    idx,
    name: item.dataKey,
    desc: item.content || ""
  });
}
async function doSaveItem() {
  await itemFormRef.value?.validate();
  itemDialog.saving = true;
  try {
    const { ti, ci } = itemDialog;
    const name = itemDialog.name.trim();
    const desc = itemDialog.desc.trim();
    const key = keyOf(ti, ci);
    const dt = dtOf(ti, ci);
    if (itemDialog.mode === "add") {
      await ensureCatLoaded(ti, ci);
      const dataContent = buildItemJson(desc, 0, null);
      const id = await saveGeneralData({ dataType: dt, dataKey: name, dataContent });
      themeItems[key].push({ id, dataKey: name, dataContent, content: desc, copyCount: 0, lastCopyTime: null });
      expandedCats.add(key);
    } else {
      const item = themeItems[key][itemDialog.idx];
      if (name !== item.dataKey) {
        const list = await getGeneralDataByType(dt);
        if (list.find(d => d.dataKey === name)) return ElMessage.warning("该名称已存在");
      }
      const json = buildItemJson(desc, item.copyCount || 0, item.lastCopyTime || null);
      if (item.id) await updateGeneralData(item.id, { dataContent: json, dataKey: name });
      else await saveOrUpdateGeneralData(dt, name, json);
      item.dataKey = name;
      item.content = desc;
      item.dataContent = json;
    }
    ElMessage.success("保存成功");
    itemDialog.visible = false;
    nextTick(initScrollSpy);
  } finally {
    itemDialog.saving = false;
  }
}
async function copyItem(item: ThemeItem) {
  const activePrefix = prefixes.value.find(p => p.active);
  const text = (activePrefix ? activePrefix.content : "") + (item.content || "");
  const ok = await copyText(text);
  if (!ok) return ElMessage.error("复制失败，请手动复制");
  item.copyCount = (item.copyCount || 0) + 1;
  item.lastCopyTime = new Date().toLocaleString("zh-CN");
  if (item.id) {
    await updateGeneralData(item.id, {
      dataContent: buildItemJson(item.content, item.copyCount, item.lastCopyTime)
    }).catch(noop);
  }
  ElMessage.success(`已复制（${item.copyCount}）`);
}
async function resetItemCount(item: ThemeItem) {
  await ElMessageBox.confirm(`确定重置「${item.dataKey}」的复制次数？`, "提示", { type: "warning" });
  item.copyCount = 0;
  item.lastCopyTime = null;
  if (item.id) await updateGeneralData(item.id, { dataContent: buildItemJson(item.content, 0, null) }).catch(noop);
  ElMessage.success("已重置");
}
async function deleteItem(ti: number, ci: number, idx: number) {
  const key = keyOf(ti, ci);
  const item = themeItems[key][idx];
  await ElMessageBox.confirm(`确定删除「${item.dataKey}」？`, "删除确认", { type: "warning" });
  if (item.id) await removeGeneralData(item.id);
  themeItems[key].splice(idx, 1);
  ElMessage.success("删除成功");
}

// ========== 导入 JSON ==========
const importDialog = reactive({ visible: false, importing: false, json: "" });
function openImport() {
  Object.assign(importDialog, { visible: true, importing: false, json: "" });
}
async function doImport() {
  const input = importDialog.json.trim();
  if (!input) return ElMessage.warning("请粘贴 JSON 内容");
  let jsonData: any;
  try {
    jsonData = JSON.parse(input);
  } catch (e: any) {
    return ElMessage.error("JSON 格式错误: " + e.message);
  }
  if (!Array.isArray(jsonData)) jsonData = [jsonData];
  importDialog.importing = true;
  notifyProgress("正在导入...");
  try {
    const newStruct: ThemeNode[] = jsonData.map((t: any) => ({
      大类: t["大类"] || "未命名",
      类别: (t["分类数据"] || []).map((c: any) => c["类别"] || "未命名")
    }));
    await saveOrUpdateGeneralData(STRUCT_TYPE, STRUCT_TYPE, JSON.stringify(newStruct));
    let total = 0;
    let done = 0;
    newStruct.forEach(t => t.类别.forEach(() => total++));
    for (let ti = 0; ti < jsonData.length; ti++) {
      const cats = jsonData[ti]["分类数据"] || [];
      for (let ci = 0; ci < cats.length; ci++) {
        const dt = `theme_${newStruct[ti].大类}_${newStruct[ti].类别[ci]}`;
        const items = cats[ci]["内容"] || [];
        for (let ii = 0; ii < items.length; ii++) {
          await saveOrUpdateGeneralData(dt, items[ii]["名称"] || `item_${ii}`, buildItemJson(items[ii]["描述"] || "", 0, null));
        }
        done++;
        notifyProgress(`导入进度: ${done} / ${total} 个类别`);
      }
    }
    importDialog.visible = false;
    await loadAllData();
    notifyProgress("导入完成！", "success");
  } catch (e: any) {
    ElMessage.error("导入失败: " + e.message);
  } finally {
    importDialog.importing = false;
  }
}

// 导入进度改为右下角通知，避免顶部提示条挤占固定高度布局
function notifyProgress(msg: string, type: "info" | "success" = "info") {
  ElNotification({ title: "导入提示", message: msg, type, position: "bottom-right", duration: 2000 });
}

// ========== 导入子类数据 ==========
const subImportDialog = reactive({ visible: false, importing: false, dataType: "", json: "" });
// 可选子类（大类 / 类别），value 为 dataType（theme_大类_类别），与 dtOf 规则一致
const subImportTypeOptions = computed(() =>
  themeStructure.value.flatMap(t => (t.类别 || []).map(c => ({ label: `${t.大类} / ${c}`, value: `theme_${t.大类}_${c}` })))
);
function openSubImport() {
  Object.assign(subImportDialog, { visible: true, importing: false, dataType: "", json: "" });
}
async function doSubImport() {
  const dataType = subImportDialog.dataType.trim();
  const jsonStr = subImportDialog.json.trim();
  if (!dataType) return ElMessage.warning("请选择子类");
  if (!jsonStr) return ElMessage.warning("请粘贴 JSON 数据");
  let jsonList: any;
  try {
    jsonList = JSON.parse(jsonStr);
  } catch (e: any) {
    return ElMessage.error("JSON 格式错误: " + e.message);
  }
  if (!Array.isArray(jsonList)) return ElMessage.error("JSON 必须是数组");
  subImportDialog.importing = true;
  notifyProgress(`正在批量保存 ${jsonList.length} 条数据...`);
  try {
    const batchList = jsonList.map(item => ({ dataType, dataKey: item.dataType || "", dataContent: item.dataContent || "" }));
    await batchSaveGeneralData(batchList);
    const match = dataType.match(/^theme_(.+)_(.+)$/);
    if (match) {
      const [, themeName, catName] = match;
      const themeObj = themeStructure.value.find(t => t.大类 === themeName);
      if (themeObj && themeObj.类别.includes(catName)) {
        themeItems[`${themeName}|${catName}`] = mapRawItems(await getGeneralDataByType(dataType));
      }
    }
    subImportDialog.visible = false;
    notifyProgress(`导入完成！共 ${batchList.length} 条`, "success");
  } catch (e: any) {
    ElMessage.error("导入失败: " + e.message);
  } finally {
    subImportDialog.importing = false;
  }
}

// ========== 导航树 ==========
const treeData = computed(() =>
  themeStructure.value.map((t, ti) => ({
    key: `theme-${ti}`,
    label: t.大类,
    isTheme: true,
    ti,
    ci: -1,
    children: (t.类别 || []).map((c, ci) => {
      const items = themeItems[`${t.大类}|${c}`];
      return { key: `cat-${ti}-${ci}`, label: items ? `${c} (${items.length}条)` : c, isTheme: false, ti, ci, children: [] };
    })
  }))
);
async function onTreeNodeClick(data: any) {
  if (data.isTheme) {
    scrollToSection(`theme-${data.ti}`);
    return;
  }
  await expandAndScrollToCat(data.ti, data.ci);
}
async function expandAndScrollToCat(ti: number, ci: number) {
  const key = keyOf(ti, ci);
  if (!expandedCats.has(key)) {
    expandedCats.add(key);
    if (!themeItems[key]) await ensureCatLoaded(ti, ci);
  }
  await nextTick();
  scrollToSection(`cat-${ti}-${ci}`);
}
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ========== 滚动高亮 ==========
let spyObserver: IntersectionObserver | null = null;
const visibleIds = new Set<string>();
let sectionOrder: string[] = [];
function updateScrollSpy() {
  let activeId: string | null = null;
  for (const id of sectionOrder) {
    if (visibleIds.has(id)) {
      activeId = id;
      break;
    }
  }
  if (activeId && treeRef.value) treeRef.value.setCurrentKey(activeId);
}
function initScrollSpy() {
  try {
    spyObserver?.disconnect();
    visibleIds.clear();
    sectionOrder = [];
    const root = (mainScrollRef.value?.wrapRef as HTMLElement) || null;
    spyObserver = new IntersectionObserver(
      entries => {
        entries.forEach(en => {
          const id = (en.target as HTMLElement).id;
          if (en.isIntersecting) visibleIds.add(id);
          else visibleIds.delete(id);
        });
        updateScrollSpy();
      },
      { root, rootMargin: "-60px 0px -55% 0px" }
    );
    document.querySelectorAll(".theme-card, .category-block").forEach(el => {
      const id = (el as HTMLElement).id;
      if (!id) return;
      sectionOrder.push(id);
      spyObserver?.observe(el);
    });
    updateScrollSpy();
  } catch {
    /* 忽略：滚动高亮为增强功能 */
  }
}

onMounted(() => {
  loadPrefixes();
  loadAllData();
});
onBeforeUnmount(() => {
  spyObserver?.disconnect();
  spyObserver = null;
});
</script>

<style scoped lang="scss">
.theme-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 18px;
  overflow: hidden;
}
.tv-header {
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
.tv-body {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 0;
}
.tv-sidebar {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 240px;
  min-height: 0;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  &__title {
    flex-shrink: 0;
    padding: 10px 14px;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    border-bottom: 1px solid var(--el-border-color-light);
  }
  &__scroll {
    flex: 1;
    min-height: 0;
    padding: 8px;
  }
}
.tv-scroll {
  flex: 1;
  min-width: 0;
}
.tv-main {
  min-width: 0;
  padding-right: 4px;
}
.tv-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.theme-card {
  margin-bottom: 16px;
  scroll-margin-top: 16px;
}
.theme-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.category-block {
  margin-bottom: 12px;
  scroll-margin-top: 16px;
}
.category-header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  &:hover {
    background: var(--el-fill-color);
  }
  .cat-arrow {
    transition: transform 0.2s;
    &.is-expanded {
      transform: rotate(90deg);
    }
  }
  .cat-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  .cat-del {
    margin-left: auto;
  }
}
.category-body {
  padding: 10px 4px 4px;
}
.add-item-btn {
  width: 100%;
  margin-top: 8px;
}
.tv-muted {
  color: var(--el-text-color-secondary);
}

/* 表格多行文本：最多显示 8 行，超出省略 */
.tv-clamp {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 8;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}
.tv-loading-tip {
  padding: 8px 0;
  font-size: 13px;
}
.tv-dialog-tip {
  margin-bottom: 10px;
}
.tv-dialog-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
.tv-subimport-select {
  width: 100%;
}
</style>
