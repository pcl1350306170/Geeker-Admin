<template>
  <el-drawer v-model="drawerVisible" :destroy-on-close="true" size="480px" :title="`${drawerProps.title}字典数据`">
    <el-form ref="ruleFormRef" label-width="110px" label-suffix=" :" :rules="rules" :model="drawerProps.row">
      <el-form-item label="所属字典类型" prop="dictType">
        <el-select v-model="drawerProps.row!.dictType" placeholder="请选择所属字典类型" filterable style="width: 100%">
          <el-option
            v-for="item in dictTypeOptions"
            :key="item.type"
            :label="`${item.name}（${item.type}）`"
            :value="item.type"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="字典标签" prop="label">
        <el-input v-model="drawerProps.row!.label" placeholder="请填写字典标签（如：启用）" clearable></el-input>
      </el-form-item>
      <el-form-item label="字典键值" prop="value">
        <el-input v-model="drawerProps.row!.value" placeholder="请填写字典键值（如：1）" clearable></el-input>
      </el-form-item>
      <el-form-item label="显示排序" prop="sort">
        <el-input-number v-model="drawerProps.row!.sort" :min="1" :max="9999" controls-position="right"></el-input-number>
      </el-form-item>
      <el-form-item label="样式类型" prop="listClass">
        <el-select
          v-model="drawerProps.row!.listClass"
          placeholder="请选择 el-tag 样式类型（可留空）"
          clearable
          style="width: 100%"
        >
          <el-option v-for="item in listClassOptions" :key="item.value" :label="item.label" :value="item.value">
            <el-tag :type="item.value === 'primary' ? undefined : item.value">{{ item.label }}</el-tag>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="是否默认" prop="isDefault">
        <el-switch
          v-model="drawerProps.row!.isDefault"
          :active-value="1"
          :inactive-value="0"
          active-text="是"
          inactive-text="否"
        ></el-switch>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-switch
          v-model="drawerProps.row!.status"
          :active-value="1"
          :inactive-value="0"
          active-text="启用"
          inactive-text="禁用"
        ></el-switch>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="drawerProps.row!.remark" type="textarea" :rows="3" placeholder="请填写备注" clearable></el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="drawerVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="DictDataDrawer">
import { ElMessage, FormInstance } from "element-plus";
import { ref } from "vue";

import { Dict } from "@/api/interface";
import { getAllDictTypeApi } from "@/api/modules/dict";

interface DrawerProps {
  title: string;
  isView: boolean;
  row: Partial<Dict.ReqSaveDictData>;
  api?: (params: Dict.ReqSaveDictData) => Promise<any>;
  getTableList?: () => void;
}

const drawerVisible = ref(false);
const drawerProps = ref<DrawerProps>({
  isView: false,
  title: "",
  row: {}
});

// el-tag 样式类型选项
type TagType = "primary" | "success" | "info" | "warning" | "danger";
const listClassOptions: { label: string; value: TagType }[] = [
  { label: "primary（默认）", value: "primary" },
  { label: "success", value: "success" },
  { label: "info", value: "info" },
  { label: "warning", value: "warning" },
  { label: "danger", value: "danger" }
];

const rules = {
  dictType: [{ required: true, message: "请选择所属字典类型", trigger: "change" }],
  label: [{ required: true, message: "请填写字典标签", trigger: "blur" }],
  value: [{ required: true, message: "请填写字典键值", trigger: "blur" }]
};

// 所属字典类型下拉选项
const dictTypeOptions = ref<Dict.ResDictType[]>([]);
const loadDictTypeOptions = async () => {
  const { data } = await getAllDictTypeApi();
  dictTypeOptions.value = data;
};

// 接收父组件传过来的参数
const acceptParams = async (params: DrawerProps) => {
  drawerProps.value = params;
  drawerProps.value.row.sort ??= 1;
  drawerProps.value.row.status ??= 1;
  drawerProps.value.row.isDefault ??= 0;
  await loadDictTypeOptions();
  drawerVisible.value = true;
};

// 提交数据（新增/编辑）
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async valid => {
    if (!valid) return;
    try {
      const row: Dict.ReqSaveDictData = { ...drawerProps.value.row };
      delete (row as any).dictTypeName;
      delete (row as any).createTime;
      delete (row as any).updateTime;
      await drawerProps.value.api!(row);
      ElMessage.success({ message: `${drawerProps.value.title}字典数据成功！` });
      drawerProps.value.getTableList!();
      drawerVisible.value = false;
    } catch (error) {
      console.log(error);
    }
  });
};

defineExpose({
  acceptParams
});
</script>
