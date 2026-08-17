<template>
  <div class="table-box">
    <ProTable
      ref="proTable"
      row-key="id"
      :indent="20"
      :columns="columns"
      :request-api="getMenuAllListApi"
      :pagination="false"
      default-expand-all
    >
      <!-- 表格 header 按钮 -->
      <template #tableHeader>
        <el-button v-auth="'add'" type="primary" :icon="CirclePlus" @click="openDrawer('新增')">新增顶级菜单</el-button>
        <el-button type="primary" plain :icon="isExpandAll ? Fold : Expand" @click="toggleExpandAll">
          {{ isExpandAll ? "折叠全部" : "展开全部" }}
        </el-button>
      </template>
      <!-- 表格操作 -->
      <template #operation="scope">
        <el-button v-auth="'add'" type="primary" link :icon="Plus" @click="openDrawer('新增', { parentId: scope.row.id })">
          新增子菜单
        </el-button>
        <el-button v-auth="'edit'" type="primary" link :icon="EditPen" @click="openDrawer('编辑', scope.row)">编辑</el-button>
        <el-button v-auth="'delete'" type="primary" link :icon="Delete" @click="deleteMenu(scope.row)">删除</el-button>
      </template>
    </ProTable>
    <MenuDrawer ref="drawerRef" />
  </div>
</template>

<script setup lang="tsx" name="authMenu">
import * as Icons from "@element-plus/icons-vue";
import { CirclePlus, Delete, EditPen, Expand, Fold, Plus } from "@element-plus/icons-vue";
import { reactive, ref } from "vue";

import { MenuManage } from "@/api/interface";
import { addMenuApi, deleteMenuApi, getMenuAllListApi, updateMenuApi } from "@/api/modules/menu";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useHandleData } from "@/hooks/useHandleData";
import { useAuthStore } from "@/stores/modules/auth";
import MenuDrawer from "@/views/auth/menu/components/MenuDrawer.vue";

const authStore = useAuthStore();

// ProTable 实例
const proTable = ref<ProTableInstance>();

// 状态字典（本地）
const statusEnum = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

// 表格配置项
const columns = reactive<ColumnProps<MenuManage.ResMenuList>[]>([
  {
    prop: "title",
    label: "菜单名称",
    minWidth: 220,
    render: scope => {
      const Icon = (Icons as any)[scope.row.icon];
      return (
        <>
          {Icon ? (
            <el-icon style="margin-right: 8px">
              <Icon />
            </el-icon>
          ) : null}
          <span>{scope.row.title}</span>
        </>
      );
    }
  },
  { prop: "name", label: "路由名称", minWidth: 150 },
  { prop: "path", label: "路由路径", minWidth: 180 },
  { prop: "component", label: "组件路径", minWidth: 180 },
  { prop: "sort", label: "排序", width: 80, align: "center" },
  {
    prop: "status",
    label: "状态",
    width: 90,
    align: "center",
    enum: statusEnum,
    fieldNames: { label: "label", value: "value" },
    render: scope => {
      return <el-tag type={scope.row.status === 1 ? "success" : "danger"}>{scope.row.status === 1 ? "启用" : "禁用"}</el-tag>;
    }
  },
  { prop: "operation", label: "操作", fixed: "right", width: 300 }
]);

// 表格数据拉平（展开/折叠全部用）
const flattenMenus = (menus: MenuManage.ResMenuList[]): MenuManage.ResMenuList[] => {
  return menus.flatMap(item => [item, ...(item.children?.length ? flattenMenus(item.children) : [])]);
};

// 展开/折叠全部
const isExpandAll = ref(true);
const toggleExpandAll = () => {
  const table = proTable.value?.element;
  flattenMenus(proTable.value?.tableData ?? []).forEach(row => table?.toggleRowExpansion(row, !isExpandAll.value));
  isExpandAll.value = !isExpandAll.value;
};

// 刷新表格并同步左侧动态菜单
const refreshAndSync = () => {
  proTable.value?.getTableList();
  authStore.getAuthMenuList();
};

// 删除菜单
const deleteMenu = async (params: MenuManage.ResMenuList) => {
  await useHandleData(deleteMenuApi, params.id, `删除【${params.title}】菜单`);
  refreshAndSync();
};

// 打开 drawer(新增、编辑)
const drawerRef = ref<InstanceType<typeof MenuDrawer> | null>(null);
const openDrawer = (title: string, row: Partial<MenuManage.ResMenuList> = {}) => {
  drawerRef.value?.acceptParams({
    title,
    isView: false,
    row: { ...row },
    menuTree: proTable.value?.tableData ?? [],
    api: title === "新增" ? addMenuApi : updateMenuApi,
    getTableList: refreshAndSync
  });
};
</script>

<style scoped lang="scss">
@use "./index";
</style>
