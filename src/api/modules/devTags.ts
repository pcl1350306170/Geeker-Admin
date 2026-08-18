import http from "@/api";
import { DEV_TAG_PORT } from "@/api/config/servicePort";
import { DevTag } from "@/api/interface/index";

/**
 * @description 全部标签（含使用数量）
 */
export const getDevTagListApi = () => {
  return http.get<DevTag.ResTag[]>(DEV_TAG_PORT, {}, { loading: false, cancel: false });
};

/**
 * @description 新增标签
 */
export const addDevTagApi = (params: DevTag.ReqSaveTag) => {
  return http.post<{ id: number }>(DEV_TAG_PORT, params, { loading: false });
};

/**
 * @description 修改标签（改名会同步更新资产中的标签）
 */
export const updateDevTagApi = (id: number, params: DevTag.ReqSaveTag) => {
  return http.put(DEV_TAG_PORT + `/${id}`, params, { loading: false });
};

/**
 * @description 删除标签（有资产使用时后端拒绝）
 */
export const deleteDevTagApi = (id: number) => {
  return http.delete(DEV_TAG_PORT + `/${id}`, {}, { loading: false });
};
