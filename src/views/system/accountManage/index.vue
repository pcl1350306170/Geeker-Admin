<template>
  <div class="table-box">
    <ProTable ref="proTable" :columns="columns" :request-api="getAccountListApi" :data-callback="dataCallback">
      <!-- 表格 header 按钮 -->
      <template #tableHeader>
        <el-button v-auth="'add'" type="primary" :icon="CirclePlus" @click="openDrawer('新增')">新增账号</el-button>
        <el-button type="primary" :icon="Download" plain @click="downloadFile">导出账号数据</el-button>
      </template>
      <!-- 表格操作 -->
      <template #operation="scope">
        <el-button v-auth="'edit'" type="primary" link :icon="EditPen" @click="openDrawer('编辑', scope.row)">编辑</el-button>
        <el-button v-auth="'resetPwd'" type="primary" link :icon="Refresh" @click="resetPass(scope.row)">重置密码</el-button>
        <el-button v-auth="'delete'" type="primary" link :icon="Delete" @click="deleteAccount(scope.row)">删除</el-button>
      </template>
    </ProTable>
    <AccountDrawer ref="drawerRef" />
  </div>
</template>

<script setup lang="tsx" name="accountManage">
import { CirclePlus, Delete, Download, EditPen, Refresh } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { ElMessageBox } from "element-plus";
import { reactive, ref } from "vue";

import { Account } from "@/api/interface";
import {
  addAccountApi,
  changeAccountStatusApi,
  deleteAccountApi,
  exportAccountApi,
  getAccountListApi,
  resetAccountPwdApi,
  updateAccountApi
} from "@/api/modules/account";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useAuthButtons } from "@/hooks/useAuthButtons";
import { useDownload } from "@/hooks/useDownload";
import { useHandleData } from "@/hooks/useHandleData";
import AccountDrawer from "@/views/system/accountManage/components/AccountDrawer.vue";

// ProTable 实例
const proTable = ref<ProTableInstance>();

// 后端返回的 data 已经是 { list, total, pageNum, pageSize } 结构
const dataCallback = (data: any) => {
  return {
    list: data.list,
    total: data.total
  };
};

// 页面按钮权限
const { BUTTONS } = useAuthButtons();

// 状态字典（本地）
const statusEnum = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

// 表格配置项
const columns = reactive<ColumnProps<Account.ResAccountList>[]>([
  { type: "index", label: "#", width: 60 },
  { prop: "username", label: "用户名", search: { el: "input" } },
  { prop: "nickname", label: "昵称", search: { el: "input" } },
  {
    prop: "avatar",
    label: "头像",
    width: 90,
    render: scope => {
      return <el-avatar src={scope.row.avatar} />;
    }
  },
  {
    prop: "status",
    label: "状态",
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
  { prop: "operation", label: "操作", fixed: "right", width: 240 }
]);

// 删除账号
const deleteAccount = async (params: Account.ResAccountList) => {
  await useHandleData(deleteAccountApi, params.id, `删除【${params.username}】账号`);
  proTable.value?.getTableList();
};

// 重置账号密码
const resetPass = async (params: Account.ResAccountList) => {
  await useHandleData(resetAccountPwdApi, { id: params.id }, `重置【${params.username}】账号密码`);
  proTable.value?.getTableList();
};

// 切换账号状态
const changeStatus = async (row: Account.ResAccountList) => {
  await useHandleData(
    changeAccountStatusApi,
    { id: row.id, status: row.status === 1 ? 0 : 1 },
    `切换【${row.username}】账号状态`
  );
  proTable.value?.getTableList();
};

// 导出账号列表
const downloadFile = () => {
  ElMessageBox.confirm("确认导出账号数据?", "温馨提示", { type: "warning" }).then(() =>
    useDownload(exportAccountApi, "账号列表", {}, true, ".csv")
  );
};

// 打开 drawer(新增、编辑)
const drawerRef = ref<InstanceType<typeof AccountDrawer> | null>(null);
const openDrawer = (title: string, row: Partial<Account.ResAccountList> = {}) => {
  const params = {
    title,
    isView: false,
    row: { ...row },
    api: title === "新增" ? addAccountApi : updateAccountApi,
    getTableList: proTable.value?.getTableList
  };
  drawerRef.value?.acceptParams(params);
};
</script>
