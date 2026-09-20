<template>
  <el-drawer v-model="drawerVisible" :destroy-on-close="true" size="900px" :title="drawerTitle">
    <ProTable
      ref="logTable"
      height="100%"
      :columns="columns"
      :request-api="getJobLogListApi"
      :data-callback="dataCallback"
      :init-param="initParam"
    >
      <template #tableHeader>
        <el-button v-auth="'clean'" type="danger" :icon="Delete" plain @click="handleClean">清空调度日志</el-button>
      </template>
      <template #exceptionInfo="scope">
        <el-popover v-if="scope.row.exceptionInfo" placement="left" :width="400" trigger="click">
          <template #reference>
            <el-button type="danger" link>查看异常</el-button>
          </template>
          <pre class="exception-pre">{{ scope.row.exceptionInfo }}</pre>
        </el-popover>
        <span v-else>-</span>
      </template>
    </ProTable>
  </el-drawer>
</template>

<script setup lang="tsx" name="JobLogDrawer">
import { Delete } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { computed, reactive, ref } from "vue";

import { Job } from "@/api/interface";
import { cleanJobLogApi, getJobLogListApi } from "@/api/modules/job";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useHandleData } from "@/hooks/useHandleData";

const drawerVisible = ref(false);
const jobId = ref<number | undefined>(undefined);
const jobName = ref<string>("");

const drawerTitle = computed(() => (jobId.value ? `调度日志 - ${jobName.value}` : "全部调度日志"));
const initParam = computed(() => ({ jobId: jobId.value }));

const logTable = ref<ProTableInstance>();

const dataCallback = (data: any) => {
  return {
    list: data.list,
    total: data.total
  };
};

const statusEnum = [
  { label: "成功", value: 1 },
  { label: "失败", value: 0 }
];

const columns = reactive<ColumnProps<Job.ResJobLogList>[]>([
  { prop: "jobName", label: "任务名称", minWidth: 120, showOverflowTooltip: true, search: { el: "input" } },
  { prop: "jobGroup", label: "任务组", width: 100 },
  { prop: "invokeTarget", label: "调用目标", minWidth: 180, showOverflowTooltip: true },
  { prop: "jobMessage", label: "执行信息", minWidth: 100 },
  {
    prop: "status",
    label: "状态",
    width: 90,
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
    label: "耗时(ms)",
    width: 100,
    align: "center",
    render: scope => <span>{scope.row.costTime ?? 0}</span>
  },
  { prop: "exceptionInfo", label: "异常信息", width: 110, align: "center" },
  {
    prop: "createTime",
    label: "执行时间",
    width: 170,
    render: scope => {
      return <span>{scope.row.createTime ? dayjs(scope.row.createTime).format("YYYY-MM-DD HH:mm:ss") : ""}</span>;
    }
  }
]);

// 打开日志抽屉（传入 jobId 查看单任务日志，不传查看全部）
const acceptParams = (params: { jobId?: number; jobName?: string }) => {
  jobId.value = params.jobId;
  jobName.value = params.jobName ?? "";
  drawerVisible.value = true;
};

// 清空调度日志
const handleClean = async () => {
  await useHandleData(cleanJobLogApi, jobId.value, "清空调度日志");
  logTable.value?.getTableList();
};

defineExpose({
  acceptParams
});
</script>

<style scoped lang="scss">
.exception-pre {
  max-height: 300px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
