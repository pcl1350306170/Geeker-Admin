<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑成员' : '新增成员'"
    width="640px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="所属家族" prop="familyId">
            <el-select v-model="form.familyId" placeholder="请选择家族" filterable style="width: 100%">
              <el-option v-for="item in familyOptions" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="form.name" placeholder="成员姓名" maxlength="100" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="字/号/别称">
            <el-input v-model="form.alias" placeholder="如：字子瑜" maxlength="200" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="性别">
            <el-select v-model="form.gender" placeholder="请选择" clearable style="width: 100%">
              <el-option label="男" value="男" />
              <el-option label="女" value="女" />
              <el-option label="未知" value="未知" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="辈分">
            <el-input v-model="form.generation" placeholder="如：第三代 / 玄字辈" maxlength="50" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="身份/头衔">
            <el-input v-model="form.title" placeholder="如：家主 / 嫡长子 / 大长老" maxlength="100" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="角色定位">
            <el-select v-model="form.roleType" placeholder="请选择" clearable style="width: 100%">
              <el-option v-for="item in memberRoleDict" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="年龄">
            <el-input-number v-model="form.age" :min="0" :max="9999" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="是否家主">
            <el-switch v-model="form.isHead" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="核心角色">
            <el-switch v-model="form.isCore" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="排序">
            <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="性格标签">
            <el-select
              v-model="form.personality"
              multiple
              filterable
              allow-create
              default-first-option
              :reserve-keyword="false"
              placeholder="输入后回车创建标签"
              style="width: 100%"
            >
              <el-option v-for="tag in personalityOptions" :key="tag" :label="tag" :value="tag" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="外貌描述">
            <el-input v-model="form.appearance" type="textarea" :rows="2" maxlength="1000" placeholder="外貌、衣着、气质特征" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="人物小传">
            <el-input
              v-model="form.bio"
              type="textarea"
              :rows="5"
              maxlength="20000"
              placeholder="人物经历、性格背景、剧情作用（支持 Markdown）"
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

<script setup lang="ts" name="novelMemberEditDialog">
import { ElMessage } from "element-plus";
import { computed, reactive, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";

import { getFamilyListApi } from "@/api/modules/novelFamily";
import { addMemberApi, getMemberDetailApi, updateMemberApi } from "@/api/modules/novelMember";
import { NovelFamily, NovelMember } from "@/api/interface";
import { useDict } from "@/hooks/useDict";

const props = defineProps<{ visible: boolean; memberId: number; defaultFamilyId?: number }>();
const emit = defineEmits<{ "update:visible": [value: boolean]; saved: [] }>();

const { novel_member_role: memberRoleDict } = useDict("novel_member_role");

const isEdit = computed(() => props.memberId > 0);
const visible = computed({
  get: () => props.visible,
  set: value => emit("update:visible", value)
});

const formRef = ref<FormInstance>();
const saving = ref(false);
const familyOptions = ref<NovelFamily.ResFamilyList[]>([]);
const personalityOptions = ref<string[]>([
  "隐忍",
  "果决",
  "谋略",
  "坦荡",
  "偏执",
  "温润",
  "冷傲",
  "张扬",
  "护短",
  "怯懦",
  "圆滑",
  "赤诚"
]);

const form = reactive<NovelMember.ReqSaveMember>({
  familyId: undefined,
  name: "",
  alias: "",
  gender: "",
  generation: "",
  title: "",
  roleType: "",
  age: undefined,
  personality: [],
  appearance: "",
  bio: "",
  isHead: 0,
  isCore: 0,
  sort: 0
});

const rules: FormRules = {
  familyId: [{ required: true, message: "请选择所属家族", trigger: "change" }],
  name: [{ required: true, message: "请输入成员姓名", trigger: "blur" }]
};

const loadFamilyOptions = async () => {
  const { data } = await getFamilyListApi({ pageNum: 1, pageSize: 200 });
  familyOptions.value = data.list || [];
};

watch(
  () => props.visible,
  async open => {
    if (!open) return;
    await loadFamilyOptions();
    if (isEdit.value) {
      const { data } = await getMemberDetailApi(props.memberId);
      Object.assign(form, {
        familyId: data.familyId,
        name: data.name,
        alias: data.alias || "",
        gender: data.gender || "",
        generation: data.generation || "",
        title: data.title || "",
        roleType: data.roleType || "",
        age: data.age ?? undefined,
        personality: data.personality || [],
        appearance: data.appearance || "",
        bio: data.bio || "",
        isHead: data.isHead ?? 0,
        isCore: data.isCore ?? 0,
        sort: data.sort ?? 0
      });
    } else {
      Object.assign(form, {
        familyId: props.defaultFamilyId || undefined,
        name: "",
        alias: "",
        gender: "",
        generation: "",
        title: "",
        roleType: "",
        age: undefined,
        personality: [],
        appearance: "",
        bio: "",
        isHead: 0,
        isCore: 0,
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
      await updateMemberApi(props.memberId, { ...form });
    } else {
      await addMemberApi({ ...form });
    }
    ElMessage.success("保存成功");
    visible.value = false;
    emit("saved");
  } finally {
    saving.value = false;
  }
};
</script>
