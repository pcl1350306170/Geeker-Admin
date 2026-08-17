import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Account, ResPage } from "@/api/interface/index";

/**
 * @description 分页查询账号列表
 * @param params Account.ReqAccountParams
 * @returns Promise<ResPage<Account.ResAccountList>>
 */
export const getAccountListApi = (params: Account.ReqAccountParams) => {
  return http.get<ResPage<Account.ResAccountList>>(PORT1 + `/user/list`, params, { loading: false });
};

/**
 * @description 新增账号
 * @param params Account.ReqSaveAccount
 */
export const addAccountApi = (params: Account.ReqSaveAccount) => {
  return http.post(PORT1 + `/user`, params, { loading: false });
};

/**
 * @description 编辑账号
 * @param params Account.ReqSaveAccount
 */
export const updateAccountApi = (params: Account.ReqSaveAccount) => {
  return http.put(PORT1 + `/user`, params, { loading: false });
};

/**
 * @description 删除账号
 * @param id number
 */
export const deleteAccountApi = (id: number) => {
  return http.delete(PORT1 + `/user/${id}`, {}, { loading: false });
};

/**
 * @description 切换账号状态
 * @param params { id, status }
 */
export const changeAccountStatusApi = (params: { id: number; status: number }) => {
  return http.put(PORT1 + `/user/status`, params, { loading: false });
};

/**
 * @description 重置账号密码（重置为 123456）
 * @param params { id }
 */
export const resetAccountPwdApi = (params: { id: number }) => {
  return http.put(PORT1 + `/user/resetPwd`, params, { loading: false });
};

/**
 * @description 导出账号列表
 */
export const exportAccountApi = () => {
  return http.download(PORT1 + `/user/export`, {}, { loading: false });
};
