<template>
  <el-drawer v-model="drawerVisible" :destroy-on-close="true" size="450px" :title="`${drawerProps.title}字典类型`">
    <el-form ref="ruleFormRef" label-width="110px" label-suffix=" :" :rules="rules" :model="drawerProps.row">
      <el-form-item label="字典名称" prop="name">
        <el-input v-model="drawerProps.row!.name" placeholder="请填写字典名称（如：系统状态）" clearable></el-input>
      </el-form-item>
      <el-form-item label="字典类型编码" prop="type">
        <el-input v-model="drawerProps.row!.type" placeholder="请填写字典类型编码（如：sys_status）" clearable></el-input>
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

<script setup lang="ts" name="DictTypeDrawer">
import { ElMessage, FormInstance } from "element-plus";
import { ref } from "vue";

import { Dict } from "@/api/interface";

interface DrawerProps {
  title: string;
  isView: boolean;
  row: Partial<Dict.ReqSaveDictType>;
  api?: (params: Dict.ReqSaveDictType) => Promise<any>;
  getTableList?: () => void;
}

const drawerVisible = ref(false);
const drawerProps = ref<DrawerProps>({
  isView: false,
  title: "",
  row: {}
});

const rules = {
  name: [{ required: true, message: "请填写字典名称", trigger: "blur" }],
  type: [{ required: true, message: "请填写字典类型编码", trigger: "blur" }]
};

// 接收父组件传过来的参数
const acceptParams = (params: DrawerProps) => {
  drawerProps.value = params;
  drawerProps.value.row.status ??= 1;
  drawerVisible.value = true;
};

// 提交数据（新增/编辑）
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async valid => {
    if (!valid) return;
    try {
      const row: Dict.ReqSaveDictType = { ...drawerProps.value.row };
      delete (row as any).createTime;
      delete (row as any).updateTime;
      await drawerProps.value.api!(row);
      ElMessage.success({ message: `${drawerProps.value.title}字典类型成功！` });
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
