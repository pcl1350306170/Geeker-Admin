<template>
  <div class="timing-task">
    <ProTable ref="jobTable" height="100%" :columns="columns" :request-api="getJobListApi" :data-callback="dataCallback">
      <!-- 表格 header 按钮 -->
      <template #tableHeader>
        <el-button v-auth="'add'" type="primary" :icon="CirclePlus" @click="openJobDrawer('新增')">新增任务</el-button>
        <el-button v-auth="'log'" type="info" :icon="Tickets" plain @click="openLogDrawer()">全部调度日志</el-button>
      </template>
      <!-- 表格操作 -->
      <template #operation="scope">
        <el-button v-auth="'run'" type="warning" link :icon="VideoPlay" @click="handleRun(scope.row)">执行一次</el-button>
        <el-button v-auth="'edit'" type="primary" link :icon="EditPen" @click="openJobDrawer('编辑', scope.row)">编辑</el-button>
        <el-button v-auth="'log'" type="info" link :icon="Tickets" @click="openLogDrawer(scope.row)">日志</el-button>
        <el-button v-auth="'delete'" type="danger" link :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
      </template>
    </ProTable>
    <JobDrawer ref="jobDrawerRef" />
    <JobLogDrawer ref="jobLogDrawerRef" />
  </div>
</template>

<script setup lang="tsx" name="timingTask">
import { CirclePlus, Delete, EditPen, Tickets, VideoPlay } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { reactive, ref } from "vue";

import { Job } from "@/api/interface";
import { addJobApi, changeJobStatusApi, deleteJobApi, getJobListApi, runJobApi, updateJobApi } from "@/api/modules/job";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useAuthButtons } from "@/hooks/useAuthButtons";
import { useHandleData } from "@/hooks/useHandleData";
import JobDrawer from "@/views/system/timingTask/components/JobDrawer.vue";
import JobLogDrawer from "@/views/system/timingTask/components/JobLogDrawer.vue";

const jobTable = ref<ProTableInstance>();

// 后端返回的 data 已经是 { list, total, pageNum, pageSize } 结构
const dataCallback = (data: any) => {
  return {
    list: data.list,
    total: data.total
  };
};

// 页面按钮权限
const { BUTTONS } = useAuthButtons();

const statusEnum = [
  { label: "启用", value: 1 },
  { label: "暂停", value: 0 }
];

const concurrentEnum = [
  { label: "禁止", value: 1 },
  { label: "允许", value: 0 }
];

// 表格配置项
const columns = reactive<ColumnProps<Job.ResJobList>[]>([
  { prop: "jobName", label: "任务名称", minWidth: 130, showOverflowTooltip: true, search: { el: "input" } },
  { prop: "jobGroup", label: "任务组", width: 110, search: { el: "input" } },
  { prop: "invokeTarget", label: "调用目标", minWidth: 200, showOverflowTooltip: true },
  { prop: "cronExpression", label: "cron 表达式", minWidth: 130 },
  {
    prop: "concurrent",
    label: "并发",
    width: 80,
    align: "center",
    enum: concurrentEnum,
    fieldNames: { label: "label", value: "value" },
    render: scope => {
      return (
        <el-tag type={scope.row.concurrent === 1 ? "info" : "warning"}>{scope.row.concurrent === 1 ? "禁止" : "允许"}</el-tag>
      );
    }
  },
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
              inactive-text="暂停"
              active-value={1}
              inactive-value={0}
              onClick={() => changeStatus(scope.row)}
            />
          ) : (
            <el-tag type={scope.row.status === 1 ? "success" : "danger"}>{scope.row.status === 1 ? "启用" : "暂停"}</el-tag>
          )}
        </>
      );
    }
  },
  { prop: "remark", label: "备注", minWidth: 140, showOverflowTooltip: true },
  {
    prop: "createTime",
    label: "创建时间",
    width: 170,
    render: scope => {
      return <span>{scope.row.createTime ? dayjs(scope.row.createTime).format("YYYY-MM-DD HH:mm:ss") : ""}</span>;
    }
  },
  { prop: "operation", label: "操作", fixed: "right", width: 260 }
]);

// 切换任务状态
const changeStatus = async (row: Job.ResJobList) => {
  const text = row.status === 1 ? "暂停" : "启用";
  await useHandleData(changeJobStatusApi, { id: row.id, status: row.status === 1 ? 0 : 1 }, `${text}【${row.jobName}】任务`);
  jobTable.value?.getTableList();
};

// 立即执行一次
const handleRun = async (row: Job.ResJobList) => {
  await useHandleData(runJobApi, row.id, `立即执行【${row.jobName}】任务`);
};

// 删除任务
const handleDelete = async (row: Job.ResJobList) => {
  await useHandleData(deleteJobApi, row.id, `删除【${row.jobName}】任务`);
  jobTable.value?.getTableList();
};

// 打开任务编辑抽屉（新增、编辑）
const jobDrawerRef = ref<InstanceType<typeof JobDrawer> | null>(null);
const openJobDrawer = (title: string, row: Partial<Job.ResJobList> = {}) => {
  jobDrawerRef.value?.acceptParams({
    title,
    isView: false,
    row: { ...row },
    api: title === "新增" ? addJobApi : updateJobApi,
    getTableList: () => jobTable.value?.getTableList()
  });
};

// 打开调度日志抽屉
const jobLogDrawerRef = ref<InstanceType<typeof JobLogDrawer> | null>(null);
const openLogDrawer = (row?: Job.ResJobList) => {
  jobLogDrawerRef.value?.acceptParams({
    jobId: row?.id,
    jobName: row?.jobName
  });
};
</script>

<style scoped lang="scss">
.timing-task {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
