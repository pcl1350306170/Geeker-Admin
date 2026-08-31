<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑资产' : '新增资产'"
    width="80%"
    top="5vh"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
    @open="handleOpen"
  >
    <div ref="rootRef" v-loading="loading" class="dev-assets-edit-dialog">
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
            <el-option v-for="tag in tagOptions" :key="tag.id" :label="tag.name" :value="tag.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="正文" prop="content">
          <MdEditor
            v-model="form.content"
            class="edit-form__editor"
            :preview="false"
            language="zh-CN"
            placeholder="支持 Markdown，代码块请使用 ``` 围栏并标注语言……"
            @on-upload-img="handleUploadImg"
          />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button :disabled="saving" @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts" name="devAssetEditDialog">
import { ElMessage, FormInstance, FormRules } from "element-plus";
import { MdEditor } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import { computed, nextTick, reactive, ref } from "vue";

import { addDevAssetApi, getDevAssetDetailApi, updateDevAssetApi } from "@/api/modules/devAssets";
import { getDevTagListApi } from "@/api/modules/devTags";
import { uploadImg } from "@/api/modules/upload";
import { DevTag } from "@/api/interface";
import { ASSET_TYPE_OPTIONS, LANGUAGE_OPTIONS } from "@/views/devAssets/config";
import { setupImgCdnFallback } from "@/views/devAssets/utils/imgFallback";

const props = defineProps<{
  visible: boolean;
  assetId: number | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", val: boolean): void;
  (e: "saved", assetId: number): void;
}>();

const isEdit = computed(() => !!props.assetId);
const loading = ref(false);
const saving = ref(false);
const formRef = ref<FormInstance>();
const rootRef = ref<HTMLElement>();
const tagOptions = ref<DevTag.ResTag[]>([]);

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

const resetForm = () => {
  form.type = "CODE";
  form.title = "";
  form.description = "";
  form.content = "";
  form.language = "";
  form.tags = [];
  nextTick(() => formRef.value?.clearValidate());
};

const loadDetail = async (id: number) => {
  loading.value = true;
  try {
    const { data } = await getDevAssetDetailApi(id);
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

/** 标签候选项来自标签字典 */
const loadTagOptions = async () => {
  const { data } = await getDevTagListApi();
  tagOptions.value = data || [];
};

const handleOpen = () => {
  resetForm();
  loadTagOptions();
  if (props.assetId) {
    loadDetail(props.assetId);
  }
  nextTick(() => {
    if (rootRef.value) setupImgCdnFallback(rootRef.value);
  });
};

const handleSave = async () => {
  if (saving.value) return;
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (saving.value) return;
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
    if (isEdit.value && props.assetId) {
      await updateDevAssetApi(props.assetId, params);
      ElMessage.success("保存成功");
      emit("update:visible", false);
      emit("saved", props.assetId);
    } else {
      const { data } = await addDevAssetApi(params);
      ElMessage.success("新增成功");
      emit("update:visible", false);
      emit("saved", data.id);
    }
  } finally {
    saving.value = false;
  }
};

const handleCancel = () => {
  emit("update:visible", false);
};

// MdEditor 图片上传
const handleUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
  try {
    const urls: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await uploadImg(formData);
      urls.push(data.fileUrl);
    }
    callback(urls);
  } catch {
    ElMessage.error("图片上传失败");
  }
};
</script>

<style scoped lang="scss">
.dev-assets-edit-dialog {
  max-height: 70vh;
  padding: 0 4px;
  overflow-y: auto;
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
    height: 400px;
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
