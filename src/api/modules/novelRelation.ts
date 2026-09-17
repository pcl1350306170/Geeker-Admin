import http from "@/api";
import { NOVEL_RELATION_PORT } from "@/api/config/servicePort";
import { NovelRelation, ResPage } from "@/api/interface/index";

/**
 * @description 分页查询关系（memberId=xx 查成员关系；familyId=xx 查家族间关系）
 */
export const getRelationListApi = (params: NovelRelation.ReqQueryParams) => {
  return http.get<ResPage<NovelRelation.ResRelation>>(NOVEL_RELATION_PORT, params, { loading: false, cancel: false });
};

/**
 * @description 新增关系（后端校验两端存在且不重复）
 */
export const addRelationApi = (params: NovelRelation.ReqSaveRelation) => {
  return http.post<{ id: number }>(NOVEL_RELATION_PORT, params, { loading: false });
};

/**
 * @description 删除关系
 */
export const deleteRelationApi = (id: number) => {
  return http.delete(NOVEL_RELATION_PORT + `/${id}`, {}, { loading: false });
};

/**
 * @description 家族总览图（家族节点 + 家族间关系边）
 */
export const getFamilyGraphApi = () => {
  return http.get<NovelRelation.ResGraph>(NOVEL_RELATION_PORT + `/family-graph`, {}, { loading: false });
};

/**
 * @description 成员关系图（指定家族成员节点 + 成员间关系边）
 */
export const getMemberGraphApi = (familyId: number) => {
  return http.get<NovelRelation.ResGraph>(NOVEL_RELATION_PORT + `/member-graph`, { familyId }, { loading: false });
};
