<template>
  <el-drawer v-model="drawerVisible" :destroy-on-close="true" size="480px" :title="`${drawerProps.title}部门`">
    <el-form ref="ruleFormRef" label-width="100px" label-suffix=" :" :rules="rules" :model="drawerProps.row">
      <el-form-item label="上级部门" prop="parentId">
        <el-tree-select
          v-model="drawerProps.row!.parentId"
          :data="departmentTreeData"
          :props="{ label: 'label', children: 'children' }"
          node-key="value"
          check-strictly
          :render-after-expand="false"
          default-expand-all
          clearable
          placeholder="默认为顶级部门"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="部门名称" prop="name">
        <el-input v-model="drawerProps.row!.name" placeholder="请填写部门名称" clearable></el-input>
      </el-form-item>
      <el-form-item label="部门编码" prop="code">
        <el-input v-model="drawerProps.row!.code" placeholder="请填写部门编码（如 RD）" clearable></el-input>
      </el-form-item>
      <el-form-item label="负责人" prop="leader">
        <el-input v-model="drawerProps.row!.leader" placeholder="请填写负责人" clearable></el-input>
      </el-form-item>
      <el-form-item label="联系电话" prop="phone">
        <el-input v-model="drawerProps.row!.phone" placeholder="请填写联系电话" clearable></el-input>
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="drawerProps.row!.email" placeholder="请填写邮箱" clearable></el-input>
      </el-form-item>
      <el-form-item label="显示排序" prop="sort">
        <el-input-number v-model="drawerProps.row!.sort" :min="1" :max="9999" controls-position="right"></el-input-number>
      </el-form-item>
      <el-form-item label="部门状态" prop="status">
        <el-switch
          v-model="drawerProps.row!.status"
          :active-value="1"
          :inactive-value="0"
          active-text="启用"
          inactive-text="禁用"
        ></el-switch>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="drawerVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="DepartmentDrawer">
import { ElMessage, FormInstance, FormRules } from "element-plus";
import { ref } from "vue";

import { Department } from "@/api/interface";

interface DrawerProps {
  title: string;
  isView: boolean;
  row: Partial<Department.ReqSaveDepartment>;
  departmentTree: Department.ResDepartmentList[];
  api?: (params: Department.ReqSaveDepartment) => Promise<any>;
  getTableList?: () => void;
}

const drawerVisible = ref(false);
const drawerProps = ref<DrawerProps>({
  isView: false,
  title: "",
  row: {},
  departmentTree: []
});

const rules: FormRules = {
  name: [{ required: true, message: "请填写部门名称", trigger: "blur" }],
  email: [{ type: "email", message: "请填写正确的邮箱", trigger: "blur" }]
};

// 上级部门下拉树数据
interface DepartmentTreeNode {
  value: number;
  label: string;
  children?: DepartmentTreeNode[];
}
const departmentTreeData = ref<DepartmentTreeNode[]>([]);
const buildTreeSelectData = (departments: Department.ResDepartmentList[]): DepartmentTreeNode[] => {
  return departments.map(item => ({
    value: item.id,
    label: item.name,
    children: item.children?.length ? buildTreeSelectData(item.children) : undefined
  }));
};

// 接收父组件传过来的参数
const acceptParams = (params: DrawerProps) => {
  drawerProps.value = params;
  drawerProps.value.row.parentId ??= 0;
  drawerProps.value.row.sort ??= 1;
  drawerProps.value.row.status ??= 1;
  departmentTreeData.value = [{ value: 0, label: "顶级部门" }, ...buildTreeSelectData(params.departmentTree)];
  drawerVisible.value = true;
};

// 提交数据（新增/编辑）
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async valid => {
    if (!valid) return;
    try {
      // 提交时剔除接口不需要的字段
      const row: Department.ReqSaveDepartment = { ...drawerProps.value.row };
      delete (row as any).children;
      delete (row as any).createTime;
      await drawerProps.value.api!(row);
      ElMessage.success({ message: `${drawerProps.value.title}部门成功！` });
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
