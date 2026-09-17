<template>
  <el-dialog v-model="visible" title="添加成员关系" width="520px" destroy-on-close :close-on-click-modal="false">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="本成员">
        <el-input :model-value="sourceMemberName" disabled />
      </el-form-item>
      <el-form-item label="对方成员" prop="targetId">
        <el-select
          v-model="form.targetId"
          filterable
          remote
          clearable
          :remote-method="searchMembers"
          :loading="memberLoading"
          placeholder="输入姓名搜索成员（可跨家族）"
          style="width: 100%"
        >
          <el-option
            v-for="item in memberOptions"
            :key="item.id"
            :label="item.name + (item.familyName ? '（' + item.familyName + '）' : '')"
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
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          maxlength="1000"
          placeholder="如：虽是父子，却因夺嫡反目"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts" name="novelMemberAddRelationDialog">
import { ElMessage } from "element-plus";
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";

import { getMemberDetailApi, getMemberListApi } from "@/api/modules/novelMember";
import { addRelationApi } from "@/api/modules/novelRelation";
import { NovelMember, NovelRelation } from "@/api/interface";
import { useDict } from "@/hooks/useDict";

const props = defineProps<{ visible: boolean; sourceMemberId: number }>();
const emit = defineEmits<{ "update:visible": [value: boolean]; saved: [] }>();

const { novel_relation_type: relationTypeDict } = useDict("novel_relation_type");

const visible = computed({
  get: () => props.visible,
  set: value => emit("update:visible", value)
});

const formRef = ref<FormInstance>();
const saving = ref(false);
const sourceMemberName = ref("");
const memberLoading = ref(false);
const memberOptions = ref<NovelMember.ResMemberList[]>([]);

const form = reactive<NovelRelation.ReqSaveRelation>({
  sourceType: "MEMBER",
  sourceId: 0,
  targetType: "MEMBER",
  targetId: undefined,
  relationType: "",
  description: "",
  status: "ACTIVE"
});

const rules: FormRules = {
  targetId: [{ required: true, message: "请选择对方成员", trigger: "change" }],
  relationType: [{ required: true, message: "请选择关系类型", trigger: "change" }]
};

watch(
  () => props.visible,
  async open => {
    if (!open) return;
    form.sourceId = props.sourceMemberId;
    form.targetId = undefined;
    form.relationType = "";
    form.description = "";
    form.status = "ACTIVE";
    sourceMemberName.value = "";
    memberOptions.value = [];
    formRef.value?.clearValidate();
    if (props.sourceMemberId) {
      const { data } = await getMemberDetailApi(props.sourceMemberId);
      sourceMemberName.value = data.name + (data.familyName ? "（" + data.familyName + "）" : "");
    }
  }
);

const searchMembers = async (keyword: string) => {
  if (!keyword) {
    memberOptions.value = [];
    return;
  }
  memberLoading.value = true;
  try {
    const { data } = await getMemberListApi({ pageNum: 1, pageSize: 20, keyword });
    memberOptions.value = (data.list || []).filter(m => m.id !== props.sourceMemberId);
  } finally {
    memberLoading.value = false;
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
