import http from "@/api";
import { JOB_PORT } from "@/api/config/servicePort";
import { Job, ResPage } from "@/api/interface/index";

/**
 * @description 分页查询定时任务列表
 * @param params Job.ReqJobParams
 */
export const getJobListApi = (params: Job.ReqJobParams) => {
  return http.get<ResPage<Job.ResJobList>>(JOB_PORT + `/list`, params, { loading: false });
};

/**
 * @description 获取任务详情
 * @param id number
 */
export const getJobDetailApi = (id: number) => {
  return http.get<Job.ResJobList>(JOB_PORT + `/${id}`, {}, { loading: false });
};

/**
 * @description 新增任务
 * @param params Job.ReqSaveJob
 */
export const addJobApi = (params: Job.ReqSaveJob) => {
  return http.post(JOB_PORT, params, { loading: false });
};

/**
 * @description 编辑任务
 * @param params Job.ReqSaveJob
 */
export const updateJobApi = (params: Job.ReqSaveJob) => {
  return http.put(JOB_PORT, params, { loading: false });
};

/**
 * @description 删除任务
 * @param id number
 */
export const deleteJobApi = (id: number) => {
  return http.delete(JOB_PORT + `/${id}`, {}, { loading: false });
};

/**
 * @description 切换任务状态（启用/暂停）
 * @param params { id, status }
 */
export const changeJobStatusApi = (params: { id: number; status: number }) => {
  return http.put(JOB_PORT + `/changeStatus`, params, { loading: false });
};

/**
 * @description 立即执行一次
 * @param id number
 */
export const runJobApi = (id: number) => {
  return http.put(JOB_PORT + `/run/${id}`, {}, { loading: false });
};

/**
 * @description 预览 cron 未来执行时间
 * @param cron string
 * @param count number
 */
export const previewCronApi = (cron: string, count = 5) => {
  return http.get<string[]>(JOB_PORT + `/previewCron`, { cron, count }, { loading: false });
};

/**
 * @description 分页查询调度日志
 * @param params Job.ReqJobLogParams
 */
export const getJobLogListApi = (params: Job.ReqJobLogParams) => {
  return http.get<ResPage<Job.ResJobLogList>>(JOB_PORT + `/log/list`, params, { loading: false });
};

/**
 * @description 清空调度日志（jobId 为空时清空全部）
 * @param jobId number | undefined
 */
export const cleanJobLogApi = (jobId?: number) => {
  return http.delete(JOB_PORT + `/log/clean`, { jobId }, { loading: false });
};
