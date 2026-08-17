import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Role } from "@/api/interface";

/**
 * @description 获取角色列表（固定字典）
 * @returns Promise<Role.ResRoleList[]>
 */
export const getRoleListApi = () => {
  return http.get<Role.ResRoleList[]>(PORT1 + `/role/list`, {}, { loading: false });
};

/**
 * @description 查询角色可见的菜单ID集合
 * @param role string
 * @returns Promise<number[]>
 */
export const getRoleMenuIdsApi = (role: string) => {
  return http.get<number[]>(PORT1 + `/role/menus`, { role }, { loading: false });
};

/**
 * @description 保存角色的菜单权限
 * @param params Role.ReqSaveRoleMenus
 */
export const saveRoleMenusApi = (params: Role.ReqSaveRoleMenus) => {
  return http.post(PORT1 + `/role/menus`, params, { loading: false });
};
