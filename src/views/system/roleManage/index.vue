<template>
  <div class="table-box">
    <ProTable
      ref="proTable"
      row-key="code"
      :columns="columns"
      :request-api="getRoleListApi"
      :pagination="false"
      :tool-button="false"
    >
      <!-- 表格操作 -->
      <template #operation="scope">
        <el-button v-auth="'menus'" type="primary" link :icon="Menu" @click="openMenuDialog(scope.row)">菜单权限</el-button>
      </template>
    </ProTable>

    <!-- 分配菜单权限 -->
    <el-dialog v-model="dialogVisible" :title="`分配菜单权限 - ${currentRole?.name ?? ''}`" width="500px" destroy-on-close>
      <el-alert
        v-if="currentRole?.menusFixed"
        title="超级管理员默认拥有全部菜单，不可修改"
        type="info"
        :closable="false"
        style="margin-bottom: 15px"
      />
      <el-scrollbar max-height="400px">
        <el-tree
          ref="menuTreeRef"
          :data="menuTree"
          :props="{ label: 'title', children: 'children' }"
          node-key="id"
          show-checkbox
          default-expand-all
          :disabled="currentRole?.menusFixed"
        />
      </el-scrollbar>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-if="!currentRole?.menusFixed" type="primary" :loading="saving" @click="handleSaveMenus">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="tsx" name="roleManage">
import { Menu } from "@element-plus/icons-vue";
import { ElMessage, ElTree } from "element-plus";
import { nextTick, reactive, ref } from "vue";

import { MenuManage, Role } from "@/api/interface";
import { getMenuAllListApi } from "@/api/modules/menu";
import { getRoleListApi, getRoleMenuIdsApi, saveRoleMenusApi } from "@/api/modules/role";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useAuthStore } from "@/stores/modules/auth";

const authStore = useAuthStore();

// ProTable 实例
const proTable = ref<ProTableInstance>();

// 表格配置项
const columns = reactive<ColumnProps<Role.ResRoleList>[]>([
  { prop: "name", label: "角色名称", minWidth: 150 },
  { prop: "code", label: "角色编码", minWidth: 150 },
  { prop: "description", label: "角色描述", minWidth: 250 },
  { prop: "operation", label: "操作", width: 180, fixed: "right" }
]);

// 菜单权限弹窗
const dialogVisible = ref(false);
const saving = ref(false);
const currentRole = ref<Role.ResRoleList | null>(null);
const menuTree = ref<MenuManage.ResMenuList[]>([]);
const menuTreeRef = ref<InstanceType<typeof ElTree>>();

// 拉平菜单树，找出叶子节点ID（el-tree 级联模式下只回填叶子，父节点自动勾选）
const collectLeafIds = (menus: MenuManage.ResMenuList[], allIds: number[]): number[] => {
  const leafIds: number[] = [];
  const walk = (list: MenuManage.ResMenuList[]) => {
    list.forEach(item => {
      if (item.children?.length) {
        walk(item.children);
      } else if (allIds.includes(item.id)) {
        leafIds.push(item.id);
      }
    });
  };
  walk(menus);
  // 选中的顶级菜单（无子级时本身就是叶子）已在上面处理
  return leafIds;
};

// 打开菜单权限弹窗
const openMenuDialog = async (row: Role.ResRoleList) => {
  currentRole.value = row;
  dialogVisible.value = true;
  const [{ data: tree }, { data: checkedIds }] = await Promise.all([getMenuAllListApi(), getRoleMenuIdsApi(row.code)]);
  menuTree.value = tree;
  await nextTick();
  menuTreeRef.value?.setCheckedKeys(collectLeafIds(tree, checkedIds));
};

// 保存角色菜单权限
const handleSaveMenus = async () => {
  if (!currentRole.value) return;
  const checked = menuTreeRef.value?.getCheckedKeys(false) as number[];
  const halfChecked = menuTreeRef.value?.getHalfCheckedKeys() as number[];
  saving.value = true;
  try {
    await saveRoleMenusApi({ role: currentRole.value.code, menuIds: [...checked, ...halfChecked] });
    ElMessage.success("菜单权限保存成功！");
    dialogVisible.value = false;
    // 当前登录账号的左侧菜单可能受影响，立即同步
    authStore.getAuthMenuList();
  } finally {
    saving.value = false;
  }
};
</script>
