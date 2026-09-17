import http from "@/api";
import { NOVEL_MEMBER_PORT } from "@/api/config/servicePort";
import { NovelMember, ResPage } from "@/api/interface/index";

/**
 * @description 分页查询成员（支持按家族 / 关键词 / 角色定位筛选）
 */
export const getMemberListApi = (params: NovelMember.ReqQueryParams) => {
  return http.get<ResPage<NovelMember.ResMemberList>>(NOVEL_MEMBER_PORT, params, { loading: false, cancel: false });
};

/**
 * @description 成员详情（含性格标签、人物小传）
 */
export const getMemberDetailApi = (id: number) => {
  return http.get<NovelMember.ResMemberDetail>(NOVEL_MEMBER_PORT + `/${id}`, {}, { loading: false });
};

/**
 * @description 新增成员
 */
export const addMemberApi = (params: NovelMember.ReqSaveMember) => {
  return http.post<{ id: number }>(NOVEL_MEMBER_PORT, params, { loading: false });
};

/**
 * @description 编辑成员
 */
export const updateMemberApi = (id: number, params: NovelMember.ReqSaveMember) => {
  return http.put(NOVEL_MEMBER_PORT + `/${id}`, params, { loading: false });
};

/**
 * @description 删除成员（级联删除其相关关系）
 */
export const deleteMemberApi = (id: number) => {
  return http.delete(NOVEL_MEMBER_PORT + `/${id}`, {}, { loading: false });
};
