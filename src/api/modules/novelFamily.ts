import http from "@/api";
import { NOVEL_FAMILY_PORT } from "@/api/config/servicePort";
import { NovelFamily, ResPage } from "@/api/interface/index";

/**
 * @description 分页查询家族
 */
export const getFamilyListApi = (params: NovelFamily.ReqQueryParams) => {
  return http.get<ResPage<NovelFamily.ResFamilyList>>(NOVEL_FAMILY_PORT, params, { loading: false, cancel: false });
};

/**
 * @description 家族详情（含成员统计、家主）
 */
export const getFamilyDetailApi = (id: number) => {
  return http.get<NovelFamily.ResFamilyDetail>(NOVEL_FAMILY_PORT + `/${id}`, {}, { loading: false });
};

/**
 * @description 新增家族
 */
export const addFamilyApi = (params: NovelFamily.ReqSaveFamily) => {
  return http.post<{ id: number }>(NOVEL_FAMILY_PORT, params, { loading: false });
};

/**
 * @description 编辑家族
 */
export const updateFamilyApi = (id: number, params: NovelFamily.ReqSaveFamily) => {
  return http.put(NOVEL_FAMILY_PORT + `/${id}`, params, { loading: false });
};

/**
 * @description 删除家族（有成员时后端拒绝）
 */
export const deleteFamilyApi = (id: number) => {
  return http.delete(NOVEL_FAMILY_PORT + `/${id}`, {}, { loading: false });
};
