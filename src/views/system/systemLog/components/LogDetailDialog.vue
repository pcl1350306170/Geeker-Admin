<template>
  <el-dialog v-model="dialogVisible" title="日志详情" width="720px" :destroy-on-close="true">
    <el-descriptions :column="2" border>
      <el-descriptions-item label="日志编号">{{ detail.id }}</el-descriptions-item>
      <el-descriptions-item label="日志类型">
        <el-tag :type="logTypeTag(detail.logType)">{{ logTypeLabel(detail.logType) }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="操作模块">{{ detail.title || "-" }}</el-descriptions-item>
      <el-descriptions-item label="业务类型">{{ businessTypeLabel(detail.businessType) }}</el-descriptions-item>
      <el-descriptions-item label="操作人">{{ detail.operator || "-" }}</el-descriptions-item>
      <el-descriptions-item label="操作IP">{{ detail.operatorIp || "-" }}</el-descriptions-item>
      <el-descriptions-item label="请求方式">{{ detail.requestMethod || "-" }}</el-descriptions-item>
      <el-descriptions-item label="操作状态">
        <el-tag :type="detail.status === 1 ? 'success' : 'danger'">{{ detail.status === 1 ? "成功" : "失败" }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="请求地址" :span="2">{{ detail.requestUrl || "-" }}</el-descriptions-item>
      <el-descriptions-item label="目标方法" :span="2">{{ detail.method || "-" }}</el-descriptions-item>
      <el-descriptions-item label="耗时">{{ detail.costTime ?? 0 }} ms</el-descriptions-item>
      <el-descriptions-item label="操作时间">{{ formatTime(detail.createTime) }}</el-descriptions-item>
      <el-descriptions-item label="请求参数" :span="2">
        <pre class="log-prettier">{{ pretty(detail.requestParam) }}</pre>
      </el-descriptions-item>
      <el-descriptions-item label="返回结果" :span="2">
        <pre class="log-prettier">{{ pretty(detail.responseResult) }}</pre>
      </el-descriptions-item>
      <el-descriptions-item v-if="detail.status === 0" label="错误信息" :span="2">
        <pre class="log-prettier log-error">{{ detail.errorMsg || "-" }}</pre>
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button type="primary" @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts" name="LogDetailDialog">
import dayjs from "dayjs";
import { ref } from "vue";

import { Log } from "@/api/interface";

interface DialogProps {
  row: Partial<Log.ResLogList>;
}

const dialogVisible = ref(false);
const detail = ref<Partial<Log.ResLogList>>({});

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

const businessTypeLabel = (value?: string) => (value ? (BUSINESS_TYPE_MAP[value] ?? value) : "-");

const logTypeLabel = (type?: number) => ({ 1: "操作日志", 2: "登录日志", 3: "异常日志" })[type ?? 0] ?? "-";

const logTypeTag = (type?: number): "primary" | "success" | "danger" | "info" => {
  if (type === 1) return "primary";
  if (type === 2) return "success";
  if (type === 3) return "danger";
  return "info";
};

const formatTime = (time?: string) => (time ? dayjs(time).format("YYYY-MM-DD HH:mm:ss") : "-");

// 尝试格式化 JSON 字符串，非 JSON 原样返回
const pretty = (text?: string) => {
  if (!text) return "-";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};

// 接收父组件传参
const acceptParams = (params: DialogProps) => {
  detail.value = params.row;
  dialogVisible.value = true;
};

defineExpose({ acceptParams });
</script>

<style scoped lang="scss">
.log-prettier {
  max-height: 200px;
  padding: 8px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
  white-space: pre-wrap;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}
.log-error {
  color: var(--el-color-danger);
}
</style>
