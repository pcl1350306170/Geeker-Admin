import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { MenuManage } from "@/api/interface";

/**
 * @description 获取完整菜单树（不分页，菜单权限页面用）
 * @returns Promise<MenuManage.ResMenuList[]>
 */
export const getMenuAllListApi = () => {
  return http.get<MenuManage.ResMenuList[]>(PORT1 + `/menu/all`, {}, { loading: false });
};

/**
 * @description 新增菜单
 * @param params MenuManage.ReqSaveMenu
 */
export const addMenuApi = (params: MenuManage.ReqSaveMenu) => {
  return http.post(PORT1 + `/menu`, params, { loading: false });
};

/**
 * @description 编辑菜单
 * @param params MenuManage.ReqSaveMenu
 */
export const updateMenuApi = (params: MenuManage.ReqSaveMenu) => {
  return http.put(PORT1 + `/menu`, params, { loading: false });
};

/**
 * @description 删除菜单
 * @param id number
 */
export const deleteMenuApi = (id: number) => {
  return http.delete(PORT1 + `/menu/${id}`, {}, { loading: false });
};
