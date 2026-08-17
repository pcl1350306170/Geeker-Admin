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

import { Account } from "@/api/interface";
import UploadImg from "@/components/Upload/Img.vue";

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

const rules = computed(() => ({
  username: [{ required: true, message: "请填写用户名", trigger: "blur" }],
  nickname: [{ required: true, message: "请填写昵称", trigger: "blur" }],
  password: [{ required: !isEdit.value, message: "请填写密码", trigger: "blur" }]
}));

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
