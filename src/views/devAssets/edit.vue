<template>
  <div v-loading="loading" class="dev-assets-edit card">
    <div class="edit-header">
      <h2 class="edit-header__title">{{ isEdit ? "编辑资产" : "新增资产" }}</h2>
      <div class="edit-header__actions">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </div>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" class="edit-form">
      <div class="edit-form__row">
        <el-form-item label="资产类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择资产类型">
            <el-option v-for="item in ASSET_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="代码语言">
          <el-select v-model="form.language" placeholder="非代码可留空" clearable filterable allow-create>
            <el-option v-for="lang in LANGUAGE_OPTIONS" :key="lang" :label="lang" :value="lang" />
          </el-select>
        </el-form-item>
      </div>
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="例如：Vue3 Sortable 限制拖拽范围" />
      </el-form-item>
      <el-form-item label="简介">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          maxlength="500"
          show-word-limit
          placeholder="一句话说明这个资产是什么、解决什么问题（会展示在搜索结果中）"
        />
      </el-form-item>
      <el-form-item label="标签">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入后回车添加，如：Vue3、Sortable、拖拽"
        >
          <el-option v-for="tag in SUGGEST_TAGS" :key="tag" :label="tag" :value="tag" />
        </el-select>
      </el-form-item>
      <el-form-item label="正文" prop="content">
        <MdEditor
          v-model="form.content"
          class="edit-form__editor"
          :preview="false"
          language="zh-CN"
          placeholder="支持 Markdown，代码块请使用 ``` 围栏并标注语言……"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts" name="devAssetsEdit">
import { ElMessage, FormInstance, FormRules } from "element-plus";
import { MdEditor } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { addDevAssetApi, getDevAssetDetailApi, updateDevAssetApi } from "@/api/modules/devAssets";
import { ASSET_TYPE_OPTIONS, LANGUAGE_OPTIONS, SUGGEST_TAGS } from "@/views/devAssets/config";

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  type: "CODE",
  title: "",
  description: "",
  content: "",
  language: "",
  tags: [] as string[]
});

const rules: FormRules = {
  type: [{ required: true, message: "请选择资产类型", trigger: "change" }],
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  content: [{ required: true, message: "请输入正文内容", trigger: "blur" }]
};

const loadDetail = async () => {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const { data } = await getDevAssetDetailApi(Number(route.params.id));
    form.type = data.type;
    form.title = data.title;
    form.description = data.description || "";
    form.content = data.content || "";
    form.language = data.language || "";
    form.tags = data.tags || [];
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  await formRef.value?.validate();
  saving.value = true;
  try {
    const params = {
      type: form.type,
      title: form.title,
      description: form.description,
      content: form.content,
      language: form.language,
      tags: form.tags
    };
    if (isEdit.value) {
      await updateDevAssetApi(Number(route.params.id), params);
      ElMessage.success("保存成功");
      router.replace(`/devAssets/detail/${route.params.id}`);
    } else {
      const { data } = await addDevAssetApi(params);
      ElMessage.success("新增成功");
      router.replace(`/devAssets/detail/${data.id}`);
    }
  } finally {
    saving.value = false;
  }
};

const handleCancel = () => {
  router.back();
};

onMounted(loadDetail);
// keep-alive 下在新增/不同资产编辑之间切换时重新加载
watch(
  () => route.fullPath,
  () => {
    if (route.name === "devAssetsEdit" || route.name === "devAssetsCreate") {
      resetForm();
      loadDetail();
    }
  }
);

const resetForm = () => {
  form.type = "CODE";
  form.title = "";
  form.description = "";
  form.content = "";
  form.language = "";
  form.tags = [];
  formRef.value?.clearValidate();
};
</script>

<style scoped lang="scss">
.dev-assets-edit {
  min-height: 100%;
  padding: 20px 24px;
}
.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}
.edit-form {
  max-width: 1200px;
  &__row {
    display: flex;
    gap: 24px;
    .el-form-item {
      flex: 1;
    }
  }
  &__editor {
    width: 100%;
    height: 480px;
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
  }
  :deep(.el-form-item__content) {
    display: block;
    .el-select,
    .el-input,
    .el-textarea {
      width: 100%;
    }
  }
}
</style>
