<template>
  <div class="table-box">
    <ProTable
      ref="proTable"
      row-key="id"
      :indent="20"
      :columns="columns"
      :request-api="getDepartmentTreeApi"
      :pagination="false"
      default-expand-all
    >
      <!-- 表格 header 按钮 -->
      <template #tableHeader>
        <el-button v-auth="'add'" type="primary" :icon="CirclePlus" @click="openDrawer('新增')">新增顶级部门</el-button>
        <el-button type="primary" plain :icon="isExpandAll ? Fold : Expand" @click="toggleExpandAll">
          {{ isExpandAll ? "折叠全部" : "展开全部" }}
        </el-button>
        <el-button type="primary" :icon="Download" plain @click="downloadFile">导出部门数据</el-button>
      </template>
      <!-- 表格操作 -->
      <template #operation="scope">
        <el-button v-auth="'add'" type="primary" link :icon="Plus" @click="openDrawer('新增', { parentId: scope.row.id })">
          新增下级
        </el-button>
        <el-button v-auth="'edit'" type="primary" link :icon="EditPen" @click="openDrawer('编辑', scope.row)">编辑</el-button>
        <el-button v-auth="'delete'" type="primary" link :icon="Delete" @click="deleteDepartment(scope.row)">删除</el-button>
      </template>
    </ProTable>
    <DepartmentDrawer ref="drawerRef" />
  </div>
</template>

<script setup lang="tsx" name="departmentManage">
import { CirclePlus, Delete, Download, EditPen, Expand, Fold, Plus } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { ElMessageBox } from "element-plus";
import { reactive, ref } from "vue";

import { Department } from "@/api/interface";
import {
  addDepartmentApi,
  changeDepartmentStatusApi,
  deleteDepartmentApi,
  exportDepartmentApi,
  getDepartmentTreeApi,
  updateDepartmentApi
} from "@/api/modules/department";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useAuthButtons } from "@/hooks/useAuthButtons";
import { useDownload } from "@/hooks/useDownload";
import { useHandleData } from "@/hooks/useHandleData";
import DepartmentDrawer from "@/views/system/departmentManage/components/DepartmentDrawer.vue";

// ProTable 实例
const proTable = ref<ProTableInstance>();

// 页面按钮权限
const { BUTTONS } = useAuthButtons();

// 状态字典（本地）
const statusEnum = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

// 表格配置项
const columns = reactive<ColumnProps<Department.ResDepartmentList>[]>([
  { prop: "name", label: "部门名称", minWidth: 220, search: { el: "input" } },
  { prop: "code", label: "部门编码", minWidth: 140 },
  { prop: "leader", label: "负责人", width: 120 },
  { prop: "phone", label: "联系电话", width: 140 },
  { prop: "email", label: "邮箱", minWidth: 180 },
  { prop: "sort", label: "排序", width: 80, align: "center" },
  {
    prop: "status",
    label: "状态",
    width: 100,
    align: "center",
    enum: statusEnum,
    search: { el: "select" },
    fieldNames: { label: "label", value: "value" },
    render: scope => {
      return (
        <>
          {BUTTONS.value.status ? (
            <el-switch
              model-value={scope.row.status}
              active-text="启用"
              inactive-text="禁用"
              active-value={1}
              inactive-value={0}
              onClick={() => changeStatus(scope.row)}
            />
          ) : (
            <el-tag type={scope.row.status === 1 ? "success" : "danger"}>{scope.row.status === 1 ? "启用" : "禁用"}</el-tag>
          )}
        </>
      );
    }
  },
  {
    prop: "createTime",
    label: "创建时间",
    width: 180,
    render: scope => {
      return <span>{scope.row.createTime ? dayjs(scope.row.createTime).format("YYYY-MM-DD HH:mm:ss") : ""}</span>;
    }
  },
  { prop: "operation", label: "操作", fixed: "right", width: 300 }
]);

// 表格数据拉平（展开/折叠全部用）
const flattenDepartments = (departments: Department.ResDepartmentList[]): Department.ResDepartmentList[] => {
  return departments.flatMap(item => [item, ...(item.children?.length ? flattenDepartments(item.children) : [])]);
};

// 展开/折叠全部
const isExpandAll = ref(true);
const toggleExpandAll = () => {
  const table = proTable.value?.element;
  flattenDepartments(proTable.value?.tableData ?? []).forEach(row => table?.toggleRowExpansion(row, !isExpandAll.value));
  isExpandAll.value = !isExpandAll.value;
};

// 删除部门
const deleteDepartment = async (params: Department.ResDepartmentList) => {
  await useHandleData(deleteDepartmentApi, params.id, `删除【${params.name}】部门`);
  proTable.value?.getTableList();
};

// 切换部门状态
const changeStatus = async (row: Department.ResDepartmentList) => {
  await useHandleData(changeDepartmentStatusApi, { id: row.id, status: row.status === 1 ? 0 : 1 }, `切换【${row.name}】部门状态`);
  proTable.value?.getTableList();
};

// 导出部门列表
const downloadFile = () => {
  ElMessageBox.confirm("确认导出部门数据?", "温馨提示", { type: "warning" }).then(() =>
    useDownload(exportDepartmentApi, "部门列表", {}, true, ".csv")
  );
};

// 打开 drawer(新增、编辑)
const drawerRef = ref<InstanceType<typeof DepartmentDrawer> | null>(null);
const openDrawer = (title: string, row: Partial<Department.ResDepartmentList> = {}) => {
  drawerRef.value?.acceptParams({
    title,
    isView: false,
    row: { ...row },
    departmentTree: proTable.value?.tableData ?? [],
    api: title === "新增" ? addDepartmentApi : updateDepartmentApi,
    getTableList: proTable.value?.getTableList
  });
};
</script>
