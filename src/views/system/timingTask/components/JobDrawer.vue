<template>
  <el-drawer v-model="drawerVisible" :destroy-on-close="true" size="520px" :title="`${drawerProps.title}定时任务`">
    <el-form ref="ruleFormRef" label-width="110px" label-suffix=" :" :rules="rules" :model="drawerProps.row">
      <el-form-item label="任务名称" prop="jobName">
        <el-input v-model="drawerProps.row!.jobName" placeholder="请填写任务名称（如：清理历史日志）" clearable></el-input>
      </el-form-item>
      <el-form-item label="任务组名" prop="jobGroup">
        <el-input v-model="drawerProps.row!.jobGroup" placeholder="请填写任务组名（默认 DEFAULT）" clearable></el-input>
      </el-form-item>
      <el-form-item label="调用目标" prop="invokeTarget">
        <el-input
          v-model="drawerProps.row!.invokeTarget"
          placeholder="格式：beanName.method(args)，如 sampleTask.cleanExpiredLog(30)"
          clearable
        ></el-input>
        <div class="invoke-tip">
          仅允许调用 <code>com.example.geekeradmin.task</code> 包下的 Spring Bean 方法，示例：
          <code>sampleTask.noParams()</code>、<code>sampleTask.showMessage('hello')</code>
        </div>
      </el-form-item>
      <el-form-item label="cron 表达式" prop="cronExpression">
        <el-input v-model="drawerProps.row!.cronExpression" placeholder="如：0 0 3 * * ?" clearable>
          <template #append>
            <el-button :icon="Clock" @click="handlePreviewCron">预览</el-button>
          </template>
        </el-input>
        <div v-if="cronPreview.length" class="cron-preview">
          <div class="cron-preview-title">最近 {{ cronPreview.length }} 次执行时间：</div>
          <div v-for="(time, index) in cronPreview" :key="index" class="cron-preview-item">{{ index + 1 }}、{{ time }}</div>
        </div>
      </el-form-item>
      <el-form-item label="是否并发" prop="concurrent">
        <el-radio-group v-model="drawerProps.row!.concurrent">
          <el-radio :value="1">禁止</el-radio>
          <el-radio :value="0">允许</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="任务状态" prop="status">
        <el-switch
          v-model="drawerProps.row!.status"
          :active-value="1"
          :inactive-value="0"
          active-text="启用"
          inactive-text="暂停"
        ></el-switch>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="drawerProps.row!.remark" type="textarea" :rows="3" placeholder="请填写备注" clearable></el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="drawerVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="JobDrawer">
import { Clock } from "@element-plus/icons-vue";
import { ElMessage, FormInstance } from "element-plus";
import { ref } from "vue";

import { Job } from "@/api/interface";
import { previewCronApi } from "@/api/modules/job";

interface DrawerProps {
  title: string;
  isView: boolean;
  row: Partial<Job.ResJobList>;
  api?: (params: Job.ReqSaveJob) => Promise<any>;
  getTableList?: () => void;
}

const drawerVisible = ref(false);
const drawerProps = ref<DrawerProps>({
  isView: false,
  title: "",
  row: {}
});

const cronPreview = ref<string[]>([]);

const rules = {
  jobName: [{ required: true, message: "请填写任务名称", trigger: "blur" }],
  invokeTarget: [{ required: true, message: "请填写调用目标", trigger: "blur" }],
  cronExpression: [{ required: true, message: "请填写 cron 表达式", trigger: "blur" }]
};

// 接收父组件传过来的参数
const acceptParams = (params: DrawerProps) => {
  drawerProps.value = params;
  drawerProps.value.row.jobGroup ??= "DEFAULT";
  drawerProps.value.row.concurrent ??= 1;
  drawerProps.value.row.status ??= 0;
  cronPreview.value = [];
  drawerVisible.value = true;
};

// 预览 cron 未来执行时间
const handlePreviewCron = async () => {
  const cron = drawerProps.value.row.cronExpression;
  if (!cron) {
    ElMessage.warning("请先填写 cron 表达式");
    return;
  }
  try {
    const { data } = await previewCronApi(cron, 5);
    cronPreview.value = data || [];
    if (!cronPreview.value.length) ElMessage.warning("该 cron 表达式无后续执行时间");
  } catch {
    cronPreview.value = [];
  }
};

// 提交数据（新增/编辑）
const ruleFormRef = ref<FormInstance>();
const handleSubmit = () => {
  ruleFormRef.value!.validate(async valid => {
    if (!valid) return;
    try {
      const row: Job.ReqSaveJob = { ...drawerProps.value.row };
      delete (row as any).createTime;
      delete (row as any).updateTime;
      await drawerProps.value.api!(row);
      ElMessage.success({ message: `${drawerProps.value.title}定时任务成功！` });
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

<style scoped lang="scss">
.invoke-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  code {
    padding: 0 4px;
    background: var(--el-fill-color-light);
    border-radius: 3px;
  }
}
.cron-preview {
  width: 100%;
  padding: 8px 12px;
  margin-top: 6px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  .cron-preview-title {
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-regular);
  }
  .cron-preview-item {
    font-size: 12px;
    line-height: 1.8;
    color: var(--el-text-color-secondary);
  }
}
</style>
