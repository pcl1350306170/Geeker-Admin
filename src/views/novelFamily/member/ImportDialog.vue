<template>
  <el-dialog v-model="visible" title="批量导入成员" width="900px" destroy-on-close :close-on-click-modal="false">
    <!-- 结果态 -->
    <template v-if="result">
      <el-result
        v-if="result.ok"
        icon="success"
        :title="`成功导入 ${result.successCount} 位成员`"
        sub-title="成员已写入所选家族，关闭弹窗后可查看列表"
      />
      <div v-else class="import-error-block">
        <el-alert
          type="error"
          :closable="false"
          show-icon
          title="校验未通过，本次未写入任何数据"
          description="请修正以下问题后重新导入"
        />
        <el-table :data="result.errors" size="small" border max-height="360" class="error-table">
          <el-table-column prop="index" label="序号" width="70" align="center" />
          <el-table-column prop="name" label="姓名" width="130" show-overflow-tooltip />
          <el-table-column prop="message" label="问题" min-width="360" />
        </el-table>
      </div>
    </template>

    <!-- 编辑态 -->
    <div v-else class="import-body">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="支持成员数组或 { members: [...] }；姓名必填；单次最多 500 条，文件不超过 2MB。"
      />

      <div class="import-toolbar">
        <span class="import-toolbar__label">导入到家族</span>
        <el-select v-model="familyId" filterable placeholder="请选择家族" style="width: 220px">
          <el-option v-for="item in familyOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-button link type="primary" :icon="Download" @click="downloadTemplate">下载 JSON 模板</el-button>
      </div>

      <el-tabs v-model="inputMode" class="import-tabs">
        <el-tab-pane label="上传文件" name="file">
          <el-upload
            drag
            :auto-upload="false"
            :show-file-list="false"
            accept=".json,application/json"
            :on-change="handleFileChange"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将 JSON 文件拖到此处，或<em>点击选择</em></div>
            <template #tip>
              <div class="el-upload__tip">仅支持 .json 文件，导入成员归属上方所选家族</div>
            </template>
          </el-upload>
        </el-tab-pane>
        <el-tab-pane label="粘贴 JSON" name="paste">
          <el-input
            v-model="rawText"
            type="textarea"
            :rows="9"
            placeholder='粘贴 JSON，例如：{"members":[{"name":"景盛","gender":"M","generation":"G1","roleType":"MAJOR_SUPPORT"}]}'
            @input="resetPreview"
          />
          <div class="paste-actions">
            <el-button type="primary" plain size="small" @click="parseRawText">解析</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>

      <el-alert v-if="parseError" class="parse-error" type="error" :closable="false" show-icon :title="parseError" />

      <div v-if="rows.length" class="preview-head">
        预览：共 {{ rows.length }} 条
        <span v-if="invalidCount" class="preview-head__bad">（{{ invalidCount }} 条存在问题）</span>
        <span v-else class="preview-head__ok">（全部通过）</span>
      </div>
      <el-table v-if="rows.length" :data="rows" size="small" border max-height="300" class="preview-table">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column prop="name" label="姓名" width="120" show-overflow-tooltip />
        <el-table-column prop="genderText" label="性别" width="70" align="center" />
        <el-table-column prop="generation" label="辈分" width="80" show-overflow-tooltip />
        <el-table-column prop="title" label="头衔" min-width="120" show-overflow-tooltip />
        <el-table-column prop="roleLabel" label="角色" width="110" />
        <el-table-column label="校验" min-width="220">
          <template #default="{ row }">
            <span v-if="!row.issues.length" class="check-ok">通过</span>
            <span v-else class="check-err">{{ row.issues.join("；") }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <el-button @click="handleClose">{{ result ? "完成" : "取消" }}</el-button>
      <el-button v-if="!result" type="primary" :loading="submitting" :disabled="!canSubmit" @click="handleImport">
        确认导入
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts" name="novelMemberImportDialog">
import { Download, UploadFilled } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import type { UploadFile } from "element-plus";
import { computed, ref, watch } from "vue";

import { getFamilyListApi } from "@/api/modules/novelFamily";
import { getMemberListApi, importMembersApi } from "@/api/modules/novelMember";
import { NovelFamily, NovelMember } from "@/api/interface";
import { useDict } from "@/hooks/useDict";

const props = defineProps<{ visible: boolean; defaultFamilyId?: number; novelId?: number }>();
const emit = defineEmits<{ "update:visible": [value: boolean]; imported: [] }>();

const { novel_member_role: memberRoleDict } = useDict("novel_member_role");

const visible = computed({
  get: () => props.visible,
  set: value => emit("update:visible", value)
});

const MAX_COUNT = 500;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const IMPORT_FIELDS = [
  "familyId",
  "name",
  "alias",
  "gender",
  "generation",
  "title",
  "roleType",
  "age",
  "personality",
  "appearance",
  "bio",
  "isHead",
  "isCore",
  "sort"
] as const;

interface PreviewRow {
  name: string;
  genderText: string;
  generation: string;
  title: string;
  roleLabel: string;
  issues: string[];
}

const inputMode = ref<"file" | "paste">("file");
const familyId = ref<number>();
const familyOptions = ref<NovelFamily.ResFamilyList[]>([]);
const rawText = ref("");
const rawItems = ref<NovelMember.ReqImportMemberItem[]>([]);
const rows = ref<PreviewRow[]>([]);
const existingNames = ref<Set<string>>(new Set());
const parseError = ref("");
const submitting = ref(false);
const result = ref<NovelMember.ResImportResult | null>(null);

const roleValues = computed(() => new Set((memberRoleDict.value || []).map(item => item.value)));
const roleLabelMap = computed(() => {
  const map = new Map<string, string>();
  (memberRoleDict.value || []).forEach(item => map.set(item.value, item.label));
  return map;
});
const invalidCount = computed(() => rows.value.filter(row => row.issues.length > 0).length);
const canSubmit = computed(() => rows.value.length > 0 && invalidCount.value === 0 && !!familyId.value && !submitting.value);

const normalizeGender = (value?: string | null): string => {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  const key = text.toLowerCase();
  if (key === "m" || key === "male" || text === "男") return "M";
  if (key === "f" || key === "female" || text === "女") return "F";
  if (key === "未知" || key === "unknown" || key === "u") return "未知";
  return "";
};

const genderText = (value: string): string => {
  if (value === "M") return "男";
  if (value === "F") return "女";
  if (value === "未知") return "未知";
  return "-";
};

const parseInteger = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) return null;
  const num = Number(text);
  return Number.isSafeInteger(num) ? num : null;
};

const isValidFlag = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return value === 0 || value === 1;
  const text = String(value).trim().toLowerCase();
  return text === "0" || text === "1" || text === "true" || text === "false";
};

const personalityLength = (value: unknown): number => {
  if (value === undefined || value === null) return 0;
  if (Array.isArray(value)) {
    return JSON.stringify(value.map(item => String(item).trim()).filter(Boolean)).length;
  }
  return String(value).length;
};

const checkLength = (value: unknown, max: number, label: string, issues: string[]) => {
  if (value === undefined || value === null) return;
  if (String(value).length > max) issues.push(`${label}超过 ${max} 字符`);
};

const buildPreview = () => {
  const nameCount = new Map<string, number>();
  rawItems.value.forEach(item => {
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (name) nameCount.set(name, (nameCount.get(name) || 0) + 1);
  });

  rows.value = rawItems.value.map(item => {
    const issues: string[] = [];
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) issues.push("姓名不能为空");
    else if (name.length > 100) issues.push("姓名超过 100 字符");

    checkLength(item.alias, 200, "字/号/别称", issues);
    checkLength(item.generation, 50, "辈分", issues);
    checkLength(item.title, 100, "头衔", issues);
    checkLength(item.appearance, 1000, "外貌描述", issues);
    checkLength(item.bio, 20000, "人物小传", issues);

    const rawGender = item.gender;
    const gender = normalizeGender(rawGender);
    if (rawGender !== undefined && rawGender !== null && String(rawGender).trim() !== "" && !gender) {
      issues.push(`性别「${rawGender}」不支持（M/F/男/女/未知）`);
    }

    const roleType = item.roleType ? String(item.roleType).trim() : "";
    if (roleType && roleValues.value.size > 0 && !roleValues.value.has(roleType)) {
      issues.push(`角色「${roleType}」不在字典中`);
    }

    const age = parseInteger(item.age);
    if (item.age !== undefined && item.age !== null && item.age !== "" && age === null) {
      issues.push("年龄必须是整数");
    } else if (age !== null && (age < 0 || age > 9999)) {
      issues.push("年龄需在 0-9999 之间");
    }

    if (!isValidFlag(item.isHead)) issues.push("isHead 只能是 0/1 或 true/false");
    if (!isValidFlag(item.isCore)) issues.push("isCore 只能是 0/1 或 true/false");

    const sort = parseInteger(item.sort);
    if (item.sort !== undefined && item.sort !== null && item.sort !== "" && (sort === null || sort < 0)) {
      issues.push("排序必须是非负整数");
    }

    if (personalityLength(item.personality) > 500) issues.push("性格标签总长度超过 500 字符");

    if (name) {
      if ((nameCount.get(name) || 0) > 1) issues.push("本批数据中姓名重复");
      if (existingNames.value.has(name)) issues.push("该家族已存在同名成员");
    }

    return {
      name,
      genderText: genderText(gender),
      generation: item.generation || "",
      title: item.title || "",
      roleLabel: roleType ? roleLabelMap.value.get(roleType) || roleType : "-",
      issues
    };
  });
};

const resetPreview = () => {
  parseError.value = "";
  rawItems.value = [];
  rows.value = [];
};

const applyParsedText = (text: string) => {
  try {
    if (text.length > MAX_FILE_SIZE) throw new Error("内容超过 2MB");
    const data: unknown = JSON.parse(text);
    let list: unknown[];
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === "object" && Array.isArray((data as { members?: unknown }).members)) {
      list = (data as { members: unknown[] }).members;
    } else {
      throw new Error("JSON 需为成员数组，或包含 members 数组的对象");
    }
    if (list.length === 0) throw new Error("成员列表不能为空");
    if (list.length > MAX_COUNT) throw new Error(`单次最多导入 ${MAX_COUNT} 条成员`);
    rawItems.value = list.map(item =>
      item && typeof item === "object" ? (item as NovelMember.ReqImportMemberItem) : { name: "" }
    );
    parseError.value = "";
    buildPreview();
  } catch (error) {
    rawItems.value = [];
    rows.value = [];
    parseError.value = error instanceof Error ? error.message : "JSON 解析失败";
  }
};

const parseRawText = () => {
  const text = rawText.value.trim();
  if (!text) {
    resetPreview();
    parseError.value = "请先粘贴 JSON 内容";
    return;
  }
  applyParsedText(text);
};

const handleFileChange = (uploadFile: UploadFile) => {
  const raw = uploadFile.raw;
  if (!raw) return;
  if (raw.size > MAX_FILE_SIZE) {
    resetPreview();
    parseError.value = "文件超过 2MB";
    return;
  }
  if (!/\.json$/i.test(raw.name)) {
    resetPreview();
    parseError.value = "仅支持 .json 文件";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const text = typeof reader.result === "string" ? reader.result : "";
    applyParsedText(text);
  };
  reader.onerror = () => {
    resetPreview();
    parseError.value = "文件读取失败";
  };
  reader.readAsText(raw, "UTF-8");
};

const loadFamilyOptions = async () => {
  const { data } = await getFamilyListApi({
    pageNum: 1,
    pageSize: 200,
    novelId: props.novelId || undefined
  });
  familyOptions.value = data.list || [];
};

const loadExistingNames = async (id?: number) => {
  const target = id ?? familyId.value;
  if (!target) {
    existingNames.value = new Set();
    return;
  }
  try {
    const { data } = await getMemberListApi({
      pageNum: 1,
      pageSize: MAX_COUNT,
      familyId: target,
      novelId: props.novelId
    });
    existingNames.value = new Set((data.list || []).map(item => item.name));
  } catch {
    existingNames.value = new Set();
  }
};

const downloadTemplate = () => {
  const sample = {
    members: [
      {
        name: "景盛",
        alias: "字伯安",
        gender: "M",
        generation: "G1",
        title: "永安当二管事",
        roleType: "MAJOR_SUPPORT",
        age: 52,
        personality: ["稳重", "精于商道"],
        appearance: "面容方正，蓄短须",
        bio: "景逸胞兄，掌永安当账目。",
        isHead: 0,
        isCore: 0,
        sort: 1
      }
    ]
  };
  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "家族成员导入模板.json";
  link.click();
  URL.revokeObjectURL(url);
};

const pickImportFields = (item: NovelMember.ReqImportMemberItem) => {
  const output: NovelMember.ReqImportMemberItem = {};
  IMPORT_FIELDS.forEach(field => {
    if (item[field] !== undefined) {
      (output as Record<string, unknown>)[field] = item[field];
    }
  });
  return output;
};

const handleImport = async () => {
  if (!canSubmit.value || !familyId.value) return;
  submitting.value = true;
  try {
    const payload: NovelMember.ReqImportMembers = {
      familyId: familyId.value,
      members: rawItems.value.map(pickImportFields)
    };
    const { data } = await importMembersApi(payload);
    result.value = data;
    if (data.ok) {
      ElMessage.success(`成功导入 ${data.successCount} 位成员`);
      emit("imported");
    } else {
      ElMessage.warning("校验未通过，本次未写入任何数据");
    }
  } finally {
    submitting.value = false;
  }
};

const handleClose = () => {
  visible.value = false;
};

watch(
  () => props.visible,
  async open => {
    if (!open) return;
    result.value = null;
    parseError.value = "";
    inputMode.value = "file";
    rawText.value = "";
    resetPreview();
    familyId.value = props.defaultFamilyId;
    await loadFamilyOptions();
    await loadExistingNames();
    buildPreview();
  }
);

watch(familyId, async id => {
  await loadExistingNames(id);
  buildPreview();
});
</script>

<style scoped>
.import-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.import-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 4px;
}
.import-toolbar__label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.import-tabs {
  margin-top: 2px;
}
.paste-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.parse-error {
  margin-top: 2px;
}
.preview-head {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.preview-head__bad {
  font-weight: 400;
  color: var(--el-color-danger);
}
.preview-head__ok {
  font-weight: 400;
  color: var(--el-color-success);
}
.preview-table {
  margin-top: 6px;
}
.check-ok {
  color: var(--el-color-success);
}
.check-err {
  color: var(--el-color-danger);
}
.import-error-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.error-table {
  margin-top: 4px;
}
</style>
