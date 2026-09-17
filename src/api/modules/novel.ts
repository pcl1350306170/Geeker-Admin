import http from "@/api";
import { NOVEL_PORT } from "@/api/config/servicePort";
import { Novel, ResPage } from "@/api/interface/index";

/**
 * @description 分页查询小说
 */
export const getNovelListApi = (params: Novel.ReqQueryParams) => {
  return http.get<ResPage<Novel.ResNovelList>>(NOVEL_PORT, params, { loading: false, cancel: false });
};

/**
 * @description 全量小说下拉列表（家族/成员/图谱选择用）
 */
export const getNovelAllApi = () => {
  return http.get<Novel.ResNovelList[]>(NOVEL_PORT + "/all", {}, { loading: false });
};

/**
 * @description 新增小说
 */
export const addNovelApi = (params: Novel.ReqSaveNovel) => {
  return http.post<{ id: number }>(NOVEL_PORT, params, { loading: false });
};

/**
 * @description 编辑小说
 */
export const updateNovelApi = (id: number, params: Novel.ReqSaveNovel) => {
  return http.put(NOVEL_PORT + `/${id}`, params, { loading: false });
};

/**
 * @description 删除小说（名下仍有家族时后端拒绝）
 */
export const deleteNovelApi = (id: number) => {
  return http.delete(NOVEL_PORT + `/${id}`, {}, { loading: false });
};
