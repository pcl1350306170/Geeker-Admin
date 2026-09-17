<template>
  <el-drawer v-model="drawerVisible" :destroy-on-close="true" size="450px" :title="`${drawerProps.title}账号`">
    <el-form
      ref="ruleFormRef"
      label-width="100px"
      label-suffix=" :"
      :rules="rules"
      :disabled="drawerProps.isView"
      :model="drawerProps.row"
      :hide-required-asterisk="drawerProps.isView"
    >
      <el-form-item label="用户头像" prop="avatar">
        <UploadImg v-model:image-url="drawerProps.row!.avatar" width="105px" height="105px" :file-size="3">
          <template #empty>
            <el-icon><Avatar /></el-icon>
            <span>请上传头像</span>
          </template>
          <template #tip> 头像大小不能超过 3M </template>
        </UploadImg>
      </el-form-item>
      <el-form-item label="用户名" prop="username">
        <el-input v-model="drawerProps.row!.username" placeholder="请填写用户名" clearable></el-input>
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="drawerProps.row!.nickname" placeholder="请填写昵称" clearable></el-input>
      </el-form-item>
      <el-form-item label="所属部门" prop="deptId">
        <el-tree-select
          v-model="drawerProps.row!.deptId"
          :data="departmentTreeData"
          :props="{ label: 'label', children: 'children' }"
          node-key="value"
          check-strictly
          :render-after-expand="false"
          default-expand-all
          clearable
          placeholder="请选择所属部门"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="数据范围" prop="dataScope">
        <el-select v-model="dataScopeModel" placeholder="请选择数据范围" style="width: 100%">
          <el-option v-for="item in dataScopeEnum" :key="item.value" :label="item.label" :value="Number(item.value)" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="!isEdit" label="密码" prop="password">
        <el-input
          v-model="drawerProps.row!.password"
          type="password"
          placeholder="请填写密码"
          show-password
          clearable
          autocomplete="new-password"
        ></el-input>
      </el-form-item>
      <el-form-item v-else label="密码" prop="password">
        <el-input
          v-model="drawerProps.row!.password"
          type="password"
          placeholder="留空则不修改密码"
          show-password
          clearable
          autocomplete="new-password"
        ></el-input>
      </el-form-item>
      <el-form-item label="账号状态" prop="status">
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
      <el-button v-show="!drawerProps.isView" type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="AccountDrawer">
import { ElMessage, FormInstance } from "element-plus";
import md5 from "md5";
import { computed, ref } from "vue";

import { Account, Department } from "@/api/interface";
import { getDepartmentTreeApi } from "@/api/modules/department";
import UploadImg from "@/components/Upload/Img.vue";
import { useDict } from "@/hooks/useDict";

interface DrawerProps {
  title: string;
  isView: boolean;
  row: Partial<Account.ReqSaveAccount>;
  api?: (params: Account.ReqSaveAccount) => Promise<any>;
  getTableList?: () => void;
}

const drawerVisible = ref(false);
const drawerProps = ref<DrawerProps>({
  isView: false,
  title: "",
  row: {}
});

const isEdit = computed(() => drawerProps.value.title === "编辑");

// 数据范围字典（改为全局字典 sys_data_scope，与后端 UserService.SCOPE_* 对应）
const { sys_data_scope } = useDict("sys_data_scope");
const dataScopeEnum = computed(() => sys_data_scope.value);

const rules = computed(() => ({
  username: [{ required: true, message: "请填写用户名", trigger: "blur" }],
  nickname: [{ required: true, message: "请填写昵称", trigger: "blur" }],
  password: [{ required: !isEdit.value, message: "请填写密码", trigger: "blur" }]
}));

// el-select 的 modelValue 不接受 null，而 ReqSaveAccount.dataScope 允许 null；
// 这里用 computed getter/setter 桥接 null ↔ undefined，避免修改接口类型影响调用方。
const dataScopeModel = computed<number | undefined>({
  get: () => drawerProps.value.row.dataScope ?? undefined,
  set: val => {
    drawerProps.value.row.dataScope = val ?? null;
  }
});

// 接收父组件传过来的参数
const acceptParams = async (params: DrawerProps) => {
  drawerProps.value = params;
  drawerProps.value.row.status ??= 1;
  drawerProps.value.row.dataScope ??= 1;
  await loadDepartmentTree();
  drawerVisible.value = true;
};

// 所属部门下拉树数据
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
const loadDepartmentTree = async () => {
  const { data } = await getDepartmentTreeApi();
  departmentTreeData.value = buildTreeSelectData(data);
};

// 提交数据（新增/编辑）
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async valid => {
    if (!valid) return;
    try {
      // 密码与登录流程保持一致：前端先 MD5，后端再 BCrypt 存储
      const row = { ...drawerProps.value.row };
      if (row.password) {
        row.password = md5(row.password);
      } else {
        delete row.password;
      }
      await drawerProps.value.api!(row);
      ElMessage.success({ message: `${drawerProps.value.title}账号成功！` });
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
