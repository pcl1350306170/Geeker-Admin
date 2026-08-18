<template>
  <div class="dev-assets-tags card">
    <div class="tags-header">
      <h2 class="tags-header__title">标签管理</h2>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增标签</el-button>
    </div>
    <p class="tags-header__tip">
      标签仅维护候选项，供新增/编辑资产和筛选时选择；保存资产时输入的新标签会自动注册，资产搜索不受标签维护影响。
    </p>

    <el-table v-loading="loading" :data="tagList" border>
      <el-table-column prop="name" label="标签名" min-width="180">
        <template #default="{ row }">
          <el-tag effect="plain">{{ row.name }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="usageCount" label="使用数量" width="120" align="center">
        <template #default="{ row }">
          <el-link v-if="row.usageCount > 0" type="primary" @click="goSearchByTag(row.name)">
            {{ row.usageCount }}
          </el-link>
          <span v-else>0</span>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="100" align="center" />
      <el-table-column label="创建时间" width="180" align="center">
        <template #default="{ row }">{{ dayjs(row.createdAt).format("YYYY-MM-DD HH:mm") }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="EditPen" @click="openDialog(row)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无标签，点击右上角新增" />
      </template>
    </el-table>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑标签' : '新增标签'" width="420px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="70px">
        <el-form-item label="标签名" prop="name">
          <el-input v-model="form.name" maxlength="50" show-word-limit placeholder="例如：Vue3、拖拽" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" class="full-width" />
          <span class="sort-tip">数值越大越靠前，默认 0</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="devAssetsTags">
import { Delete, EditPen, Plus } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, FormInstance, FormRules } from "element-plus";
import dayjs from "dayjs";
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { addDevTagApi, deleteDevTagApi, getDevTagListApi, updateDevTagApi } from "@/api/modules/devTags";
import { DevTag } from "@/api/interface";

const router = useRouter();

const loading = ref(false);
const saving = ref(false);
const tagList = ref<DevTag.ResTag[]>([]);

const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const form = reactive<{ id: number | null; name: string; sort: number }>({
  id: null,
  name: "",
  sort: 0
});

const rules: FormRules = {
  name: [{ required: true, message: "请输入标签名", trigger: "blur" }]
};

const fetchList = async () => {
  loading.value = true;
  try {
    const { data } = await getDevTagListApi();
    tagList.value = data || [];
  } finally {
    loading.value = false;
  }
};

const openDialog = (row?: DevTag.ResTag) => {
  form.id = row?.id ?? null;
  form.name = row?.name ?? "";
  form.sort = row?.sort ?? 0;
  dialogVisible.value = true;
};

const handleSave = async () => {
  await formRef.value?.validate();
  saving.value = true;
  try {
    if (form.id) {
      await updateDevTagApi(form.id, { name: form.name, sort: form.sort });
      ElMessage.success("保存成功，改名已同步到相关资产");
    } else {
      await addDevTagApi({ name: form.name, sort: form.sort });
      ElMessage.success("新增成功");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (row: DevTag.ResTag) => {
  if (row.usageCount > 0) {
    ElMessage.warning(`标签「${row.name}」正在被 ${row.usageCount} 个资产使用，请先移除后再删除`);
    return;
  }
  await ElMessageBox.confirm(`确定删除标签「${row.name}」吗？`, "删除确认", {
    confirmButtonText: "确定删除",
    cancelButtonText: "取消",
    type: "warning"
  });
  await deleteDevTagApi(row.id);
  ElMessage.success("删除成功");
  fetchList();
};

/** 点击使用数量：跳转全部资产并按该标签筛选 */
const goSearchByTag = (tagName: string) => {
  router.push({ path: "/devAssets/list", query: { tag: tagName } });
};

onMounted(fetchList);
</script>

<style scoped lang="scss">
.dev-assets-tags {
  min-height: 100%;
  padding: 18px;
}
.tags-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  &__tip {
    margin: 0 0 14px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}
.full-width {
  width: 160px;
}
.sort-tip {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
