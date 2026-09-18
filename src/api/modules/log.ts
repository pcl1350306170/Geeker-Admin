import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Log, ResPage } from "@/api/interface/index";

/**
 * @description 分页查询系统日志列表
 * @param params Log.ReqLogParams
 * @returns Promise<ResPage<Log.ResLogList>>
 */
export const getLogListApi = (params: Log.ReqLogParams) => {
  return http.get<ResPage<Log.ResLogList>>(PORT1 + `/log/list`, params, { loading: false });
};

/**
 * @description 删除单条日志
 * @param id number
 */
export const deleteLogApi = (id: number) => {
  return http.delete(PORT1 + `/log/${id}`, {}, { loading: false });
};

/**
 * @description 清空日志（logType 为空时清空全部）
 * @param logType number | undefined
 */
export const cleanLogApi = (logType?: number) => {
  return http.delete(PORT1 + `/log/clean`, { logType }, { loading: false });
};

/**
 * @description 导出日志列表（按当前查询条件）
 * @param params Log.ReqLogParams
 */
export const exportLogApi = (params: Partial<Log.ReqLogParams> = {}) => {
  return http.download(PORT1 + `/log/export`, params, { loading: false });
};
