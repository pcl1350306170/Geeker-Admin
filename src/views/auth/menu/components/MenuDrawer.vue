<template>
  <el-drawer v-model="drawerVisible" :destroy-on-close="true" size="480px" :title="`${drawerProps.title}菜单`">
    <el-form ref="ruleFormRef" label-width="100px" label-suffix=" :" :rules="rules" :model="drawerProps.row">
      <el-form-item label="上级菜单" prop="parentId">
        <el-tree-select
          v-model="drawerProps.row!.parentId"
          :data="menuTreeData"
          :props="{ label: 'label', children: 'children' }"
          node-key="value"
          check-strictly
          :render-after-expand="false"
          default-expand-all
          clearable
          placeholder="默认为顶级菜单"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="菜单标题" prop="title">
        <el-input v-model="drawerProps.row!.title" placeholder="请填写菜单标题" clearable></el-input>
      </el-form-item>
      <el-form-item label="菜单图标" prop="icon">
        <SelectIcon v-model:icon-value="drawerProps.row!.icon!" placeholder="请选择菜单图标" />
      </el-form-item>
      <el-form-item label="路由名称" prop="name">
        <el-input v-model="drawerProps.row!.name" placeholder="请填写路由 name（如 home）" clearable></el-input>
      </el-form-item>
      <el-form-item label="路由路径" prop="path">
        <el-input v-model="drawerProps.row!.path" placeholder="请填写路由 path（如 /home/index）" clearable></el-input>
      </el-form-item>
      <el-form-item label="组件路径" prop="component">
        <el-input v-model="drawerProps.row!.component" placeholder="请填写组件路径（如 /home/index）" clearable></el-input>
      </el-form-item>
      <el-form-item label="重定向" prop="redirect">
        <el-input v-model="drawerProps.row!.redirect" placeholder="请填写重定向路径（非必传）" clearable></el-input>
      </el-form-item>
      <el-form-item label="外链地址" prop="isLink">
        <el-input v-model="drawerProps.row!.isLink" placeholder="填写后点击菜单将打开外链（非必传）" clearable></el-input>
      </el-form-item>
      <el-form-item label="显示排序" prop="sort">
        <el-input-number v-model="drawerProps.row!.sort" :min="1" :max="9999" controls-position="right"></el-input-number>
      </el-form-item>
      <el-form-item label="菜单状态" prop="status">
        <el-switch
          v-model="drawerProps.row!.status"
          :active-value="1"
          :inactive-value="0"
          active-text="启用"
          inactive-text="禁用"
        ></el-switch>
      </el-form-item>
      <el-form-item label="隐藏菜单" prop="isHide">
        <el-switch v-model="drawerProps.row!.isHide" :active-value="1" :inactive-value="0"></el-switch>
      </el-form-item>
      <el-form-item label="全屏显示" prop="isFull">
        <el-switch v-model="drawerProps.row!.isFull" :active-value="1" :inactive-value="0"></el-switch>
      </el-form-item>
      <el-form-item label="固定标签" prop="isAffix">
        <el-switch v-model="drawerProps.row!.isAffix" :active-value="1" :inactive-value="0"></el-switch>
      </el-form-item>
      <el-form-item label="缓存页面" prop="isKeepAlive">
        <el-switch v-model="drawerProps.row!.isKeepAlive" :active-value="1" :inactive-value="0"></el-switch>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="drawerVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="MenuDrawer">
import { ElMessage, FormInstance } from "element-plus";
import { ref } from "vue";

import { MenuManage } from "@/api/interface";
import SelectIcon from "@/components/SelectIcon/index.vue";

interface DrawerProps {
  title: string;
  isView: boolean;
  row: Partial<MenuManage.ReqSaveMenu>;
  menuTree: MenuManage.ResMenuList[];
  api?: (params: MenuManage.ReqSaveMenu) => Promise<any>;
  getTableList?: () => void;
}

const drawerVisible = ref(false);
const drawerProps = ref<DrawerProps>({
  isView: false,
  title: "",
  row: {},
  menuTree: []
});

const rules = {
  title: [{ required: true, message: "请填写菜单标题", trigger: "blur" }],
  path: [{ required: true, message: "请填写路由路径", trigger: "blur" }]
};

// 上级菜单下拉树数据
interface MenuTreeNode {
  value: number;
  label: string;
  children?: MenuTreeNode[];
}
const menuTreeData = ref<MenuTreeNode[]>([]);
const buildTreeSelectData = (menus: MenuManage.ResMenuList[]): MenuTreeNode[] => {
  return menus.map(item => ({
    value: item.id,
    label: item.title,
    children: item.children?.length ? buildTreeSelectData(item.children) : undefined
  }));
};

// 接收父组件传过来的参数
const acceptParams = (params: DrawerProps) => {
  drawerProps.value = params;
  drawerProps.value.row.parentId ??= 0;
  drawerProps.value.row.sort ??= 1;
  drawerProps.value.row.status ??= 1;
  drawerProps.value.row.isHide ??= 0;
  drawerProps.value.row.isFull ??= 0;
  drawerProps.value.row.isAffix ??= 0;
  drawerProps.value.row.isKeepAlive ??= 1;
  menuTreeData.value = [{ value: 0, label: "顶级菜单" }, ...buildTreeSelectData(params.menuTree)];
  drawerVisible.value = true;
};

// 提交数据（新增/编辑）
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async valid => {
    if (!valid) return;
    try {
      // 提交时剔除接口不需要的字段
      const row: MenuManage.ReqSaveMenu = { ...drawerProps.value.row };
      delete (row as any).children;
      delete (row as any).meta;
      await drawerProps.value.api!(row);
      ElMessage.success({ message: `${drawerProps.value.title}菜单成功！` });
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
