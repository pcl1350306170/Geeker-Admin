<template>
  <div class="table-box">
    <ProTable ref="proTable" :columns="columns" :request-api="getLogTableList" :data-callback="dataCallback">
      <!-- 表格 header 按钮 -->
      <template #tableHeader>
        <el-button v-auth="'export'" type="primary" :icon="Download" plain @click="downloadFile">导出日志</el-button>
        <el-button v-auth="'clean'" type="danger" :icon="Delete" plain @click="cleanLog">清空日志</el-button>
      </template>
      <!-- 表格操作 -->
      <template #operation="scope">
        <el-button type="primary" link :icon="View" @click="openDetail(scope.row)">详情</el-button>
        <el-button v-auth="'delete'" type="danger" link :icon="Delete" @click="deleteLog(scope.row)">删除</el-button>
      </template>
    </ProTable>
    <LogDetailDialog ref="dialogRef" />
  </div>
</template>

<script setup lang="tsx" name="systemLog">
import { Delete, Download, View } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, reactive, ref } from "vue";

import { Log } from "@/api/interface";
import { cleanLogApi, deleteLogApi, exportLogApi, getLogListApi } from "@/api/modules/log";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useDict } from "@/hooks/useDict";
import { useDownload } from "@/hooks/useDownload";
import { useHandleData } from "@/hooks/useHandleData";
import LogDetailDialog from "@/views/system/systemLog/components/LogDetailDialog.vue";

// ProTable 实例
const proTable = ref<ProTableInstance>();

// 日志类型字典（sys_log_type：1-操作 2-登录 3-异常）
const { sys_log_type } = useDict("sys_log_type");
const logTypeEnum = computed(() => sys_log_type.value.map(item => ({ label: item.label, value: Number(item.value) })));

// 操作状态枚举
const statusEnum = [
  { label: "成功", value: 1 },
  { label: "失败", value: 0 }
];

// 业务类型中文映射
const BUSINESS_TYPE_MAP: Record<string, string> = {
  INSERT: "新增",
  UPDATE: "修改",
  DELETE: "删除",
  SELECT: "查询",
  EXPORT: "导出",
  LOGIN: "登录",
  LOGOUT: "登出",
  OTHER: "其他"
};

const logTypeTag = (type?: number): "primary" | "success" | "danger" | "info" => {
  if (type === 1) return "primary";
  if (type === 2) return "success";
  if (type === 3) return "danger";
  return "info";
};

// 将搜索栏的 createTime 时间范围数组转换为 beginTime/endTime
const buildQuery = (params: any): Log.ReqLogParams => {
  const { createTime, ...rest } = params;
  const query: Log.ReqLogParams = { ...rest };
  if (Array.isArray(createTime) && createTime.length === 2) {
    query.beginTime = createTime[0];
    query.endTime = createTime[1];
  }
  return query;
};

// ProTable 请求方法（转换查询参数后调用接口）
const getLogTableList = (params: any) => {
  return getLogListApi(buildQuery(params));
};

// 后端返回的 data 已是 { list, total, pageNum, pageSize } 结构
const dataCallback = (data: any) => {
  return {
    list: data.list,
    total: data.total
  };
};

// 表格配置项
const columns = reactive<ColumnProps<Log.ResLogList>[]>([
  { type: "index", label: "#", width: 60 },
  {
    prop: "logType",
    label: "日志类型",
    width: 110,
    enum: logTypeEnum,
    search: { el: "select" },
    fieldNames: { label: "label", value: "value" },
    render: scope => {
      const item = logTypeEnum.value.find(d => d.value === scope.row.logType);
      return <el-tag type={logTypeTag(scope.row.logType)}>{item?.label ?? "-"}</el-tag>;
    }
  },
  { prop: "title", label: "操作模块", minWidth: 120, showOverflowTooltip: true },
  {
    prop: "businessType",
    label: "业务类型",
    width: 100,
    render: scope => <span>{BUSINESS_TYPE_MAP[scope.row.businessType] ?? scope.row.businessType ?? "-"}</span>
  },
  { prop: "operator", label: "操作人", width: 120, search: { el: "input" } },
  { prop: "requestMethod", label: "请求方式", width: 90, align: "center" },
  { prop: "requestUrl", label: "请求地址", minWidth: 200, showOverflowTooltip: true },
  { prop: "operatorIp", label: "操作IP", width: 130 },
  {
    prop: "status",
    label: "操作状态",
    width: 100,
    align: "center",
    enum: statusEnum,
    search: { el: "select" },
    fieldNames: { label: "label", value: "value" },
    render: scope => {
      return <el-tag type={scope.row.status === 1 ? "success" : "danger"}>{scope.row.status === 1 ? "成功" : "失败"}</el-tag>;
    }
  },
  {
    prop: "costTime",
    label: "耗时",
    width: 100,
    align: "center",
    render: scope => <span>{scope.row.costTime ?? 0} ms</span>
  },
  {
    prop: "createTime",
    label: "操作时间",
    width: 180,
    search: {
      el: "date-picker",
      span: 2,
      props: { type: "datetimerange", valueFormat: "YYYY-MM-DD HH:mm:ss" }
    },
    render: scope => {
      return <span>{scope.row.createTime ? dayjs(scope.row.createTime).format("YYYY-MM-DD HH:mm:ss") : ""}</span>;
    }
  },
  { prop: "operation", label: "操作", fixed: "right", width: 140 }
]);

// 删除单条日志
const deleteLog = async (params: Log.ResLogList) => {
  await useHandleData(deleteLogApi, params.id, `删除【${params.id}】号日志`);
  proTable.value?.getTableList();
};

// 清空日志
const cleanLog = () => {
  ElMessageBox.confirm("确认清空全部日志? 此操作不可恢复!", "温馨提示", { type: "warning" }).then(async () => {
    await cleanLogApi();
    ElMessage.success("清空成功!");
    proTable.value?.getTableList();
  });
};

// 导出日志（按当前查询条件）
const downloadFile = () => {
  ElMessageBox.confirm("确认导出系统日志数据?", "温馨提示", { type: "warning" }).then(() =>
    useDownload(exportLogApi, "系统日志", buildQuery(proTable.value?.searchParam ?? {}), true, ".csv")
  );
};

// 打开详情弹窗
const dialogRef = ref<InstanceType<typeof LogDetailDialog> | null>(null);
const openDetail = (row: Log.ResLogList) => {
  dialogRef.value?.acceptParams({ row: { ...row } });
};
</script>
