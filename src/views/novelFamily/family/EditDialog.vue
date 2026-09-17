<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑家族' : '新增家族'"
    width="620px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="家族名称" prop="name">
            <el-input v-model="form.name" placeholder="如：琅琊王氏" maxlength="100" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="别称/称号">
            <el-input v-model="form.alias" placeholder="如：江左王氏" maxlength="200" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="家族类型">
            <el-select v-model="form.type" placeholder="请选择" clearable style="width: 100%">
              <el-option v-for="item in familyTypeDict" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="势力地位">
            <el-select v-model="form.status" placeholder="请选择" clearable style="width: 100%">
              <el-option v-for="item in familyStatusDict" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="家训/祖训">
            <el-input v-model="form.creed" placeholder="如：忠孝传家" maxlength="500" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="势力范围">
            <el-input v-model="form.territory" placeholder="如：青州琅琊郡" maxlength="200" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="族徽图URL">
            <el-input v-model="form.emblem" placeholder="图片链接（可选）" maxlength="500" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="封面图URL">
            <el-input v-model="form.cover" placeholder="图片链接（可选）" maxlength="500" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="排序">
            <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="简介">
            <el-input
              v-model="form.introduction"
              type="textarea"
              :rows="2"
              maxlength="1000"
              show-word-limit
              placeholder="家族一句话简介"
            />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="背景故事">
            <el-input
              v-model="form.background"
              type="textarea"
              :rows="6"
              maxlength="20000"
              placeholder="家族背景、兴衰史、重要事件（支持 Markdown）"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts" name="novelFamilyEditDialog">
import { ElMessage } from "element-plus";
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";

import { addFamilyApi, getFamilyDetailApi, updateFamilyApi } from "@/api/modules/novelFamily";
import { NovelFamily } from "@/api/interface";
import { useDict } from "@/hooks/useDict";

const props = defineProps<{ visible: boolean; familyId: number }>();
const emit = defineEmits<{ "update:visible": [value: boolean]; saved: [] }>();

const { novel_family_type: familyTypeDict, novel_family_status: familyStatusDict } = useDict(
  "novel_family_type",
  "novel_family_status"
);

const isEdit = computed(() => props.familyId > 0);
const visible = computed({
  get: () => props.visible,
  set: value => emit("update:visible", value)
});

const formRef = ref<FormInstance>();
const saving = ref(false);
const form = reactive<NovelFamily.ReqSaveFamily>({
  name: "",
  alias: "",
  type: "",
  status: "",
  introduction: "",
  background: "",
  creed: "",
  territory: "",
  emblem: "",
  cover: "",
  sort: 0
});

const rules: FormRules = {
  name: [{ required: true, message: "请输入家族名称", trigger: "blur" }]
};

watch(
  () => props.visible,
  async open => {
    if (!open) return;
    if (isEdit.value) {
      const { data } = await getFamilyDetailApi(props.familyId);
      Object.assign(form, {
        name: data.name,
        alias: data.alias || "",
        type: data.type || "",
        status: data.status || "",
        introduction: data.introduction || "",
        background: data.background || "",
        creed: data.creed || "",
        territory: data.territory || "",
        emblem: data.emblem || "",
        cover: data.cover || "",
        sort: data.sort ?? 0
      });
    } else {
      Object.assign(form, {
        name: "",
        alias: "",
        type: "",
        status: "",
        introduction: "",
        background: "",
        creed: "",
        territory: "",
        emblem: "",
        cover: "",
        sort: 0
      });
    }
    formRef.value?.clearValidate();
  }
);

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateFamilyApi(props.familyId, { ...form });
    } else {
      await addFamilyApi({ ...form });
    }
    ElMessage.success("保存成功");
    visible.value = false;
    emit("saved");
  } finally {
    saving.value = false;
  }
};
</script>
