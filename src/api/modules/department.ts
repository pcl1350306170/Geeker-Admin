import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Department } from "@/api/interface/index";

/**
 * @description 获取部门树（不分页，支持按名称/状态过滤）
 * @param params Department.ReqDepartmentParams
 * @returns Promise<Department.ResDepartmentList[]>
 */
export const getDepartmentTreeApi = (params: Department.ReqDepartmentParams = {}) => {
  return http.get<Department.ResDepartmentList[]>(PORT1 + `/department/tree`, params, { loading: false });
};

/**
 * @description 新增部门
 * @param params Department.ReqSaveDepartment
 */
export const addDepartmentApi = (params: Department.ReqSaveDepartment) => {
  return http.post(PORT1 + `/department`, params, { loading: false });
};

/**
 * @description 编辑部门
 * @param params Department.ReqSaveDepartment
 */
export const updateDepartmentApi = (params: Department.ReqSaveDepartment) => {
  return http.put(PORT1 + `/department`, params, { loading: false });
};

/**
 * @description 删除部门
 * @param id number
 */
export const deleteDepartmentApi = (id: number) => {
  return http.delete(PORT1 + `/department/${id}`, {}, { loading: false });
};

/**
 * @description 切换部门状态
 * @param params { id, status }
 */
export const changeDepartmentStatusApi = (params: { id: number; status: number }) => {
  return http.put(PORT1 + `/department/status`, params, { loading: false });
};

/**
 * @description 导出部门列表
 */
export const exportDepartmentApi = () => {
  return http.download(PORT1 + `/department/export`, {}, { loading: false });
};
