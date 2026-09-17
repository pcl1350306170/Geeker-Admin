<template>
  <el-dialog v-model="visible" title="添加家族间关系" width="520px" destroy-on-close :close-on-click-modal="false">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="本家族">
        <el-input :model-value="sourceFamilyName" disabled />
      </el-form-item>
      <el-form-item label="对方家族" prop="targetId">
        <el-select
          v-model="form.targetId"
          filterable
          remote
          clearable
          :remote-method="searchFamilies"
          :loading="familyLoading"
          placeholder="输入名称搜索家族"
          style="width: 100%"
        >
          <el-option
            v-for="item in familyOptions"
            :key="item.id"
            :label="item.name + (item.alias ? '（' + item.alias + '）' : '')"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="关系类型" prop="relationType">
        <el-select v-model="form.relationType" placeholder="请选择" style="width: 100%">
          <el-option v-for="item in relationTypeDict" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="关系状态">
        <el-radio-group v-model="form.status">
          <el-radio value="ACTIVE">存续</el-radio>
          <el-radio value="BROKEN">破裂</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="补充描述">
        <el-input v-model="form.description" type="textarea" :rows="3" maxlength="1000" placeholder="如：世代联姻，互为奥援" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts" name="novelFamilyAddRelationDialog">
import { ElMessage } from "element-plus";
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";

import { getFamilyListApi } from "@/api/modules/novelFamily";
import { addRelationApi } from "@/api/modules/novelRelation";
import { NovelFamily, NovelRelation } from "@/api/interface";
import { useDict } from "@/hooks/useDict";

const props = defineProps<{ visible: boolean; sourceFamilyId: number }>();
const emit = defineEmits<{ "update:visible": [value: boolean]; saved: [] }>();

const { novel_relation_type: relationTypeDict } = useDict("novel_relation_type");

const visible = computed({
  get: () => props.visible,
  set: value => emit("update:visible", value)
});

const formRef = ref<FormInstance>();
const saving = ref(false);
const sourceFamilyName = ref("");
const familyLoading = ref(false);
const familyOptions = ref<NovelFamily.ResFamilyList[]>([]);

const form = reactive<NovelRelation.ReqSaveRelation>({
  sourceType: "FAMILY",
  sourceId: 0,
  targetType: "FAMILY",
  targetId: undefined,
  relationType: "",
  description: "",
  status: "ACTIVE"
});

const rules: FormRules = {
  targetId: [{ required: true, message: "请选择对方家族", trigger: "change" }],
  relationType: [{ required: true, message: "请选择关系类型", trigger: "change" }]
};

watch(
  () => props.visible,
  async open => {
    if (!open) return;
    form.sourceId = props.sourceFamilyId;
    form.targetId = undefined;
    form.relationType = "";
    form.description = "";
    form.status = "ACTIVE";
    sourceFamilyName.value = "";
    familyOptions.value = [];
    formRef.value?.clearValidate();
    if (props.sourceFamilyId) {
      const { data } = await getFamilyListApi({ pageNum: 1, pageSize: 1 });
      const me = data.list.find(f => f.id === props.sourceFamilyId);
      sourceFamilyName.value = me ? me.name : "";
    }
  }
);

const searchFamilies = async (keyword: string) => {
  if (!keyword) {
    familyOptions.value = [];
    return;
  }
  familyLoading.value = true;
  try {
    const { data } = await getFamilyListApi({ pageNum: 1, pageSize: 20, keyword });
    familyOptions.value = (data.list || []).filter(f => f.id !== props.sourceFamilyId);
  } finally {
    familyLoading.value = false;
  }
};

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    await addRelationApi({ ...form, targetId: form.targetId as number });
    ElMessage.success("添加成功");
    visible.value = false;
    emit("saved");
  } finally {
    saving.value = false;
  }
};
</script>
