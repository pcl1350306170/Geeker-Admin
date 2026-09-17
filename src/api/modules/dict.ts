import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Dict, ResPage } from "@/api/interface/index";

// ========== 字典类型 ==========

/**
 * @description 分页查询字典类型列表
 * @param params Dict.ReqDictTypeParams
 * @returns Promise<ResPage<Dict.ResDictType>>
 */
export const getDictTypeListApi = (params: Dict.ReqDictTypeParams) => {
  return http.get<ResPage<Dict.ResDictType>>(PORT1 + `/dict/type/list`, params, { loading: false });
};

/**
 * @description 查询全部启用的字典类型（不分页，用于字典数据表单选择所属类型）
 * @returns Promise<Dict.ResDictType[]>
 */
export const getAllDictTypeApi = () => {
  return http.get<Dict.ResDictType[]>(PORT1 + `/dict/type/all`, {}, { loading: false });
};

/**
 * @description 新增字典类型
 * @param params Dict.ReqSaveDictType
 */
export const addDictTypeApi = (params: Dict.ReqSaveDictType) => {
  return http.post(PORT1 + `/dict/type`, params, { loading: false });
};

/**
 * @description 编辑字典类型
 * @param params Dict.ReqSaveDictType
 */
export const updateDictTypeApi = (params: Dict.ReqSaveDictType) => {
  return http.put(PORT1 + `/dict/type`, params, { loading: false });
};

/**
 * @description 删除字典类型
 * @param id number
 */
export const deleteDictTypeApi = (id: number) => {
  return http.delete(PORT1 + `/dict/type/${id}`, {}, { loading: false });
};

/**
 * @description 切换字典类型状态
 * @param params { id, status }
 */
export const changeDictTypeStatusApi = (params: { id: number; status: number }) => {
  return http.put(PORT1 + `/dict/type/status`, params, { loading: false });
};

/**
 * @description 导出字典类型列表
 */
export const exportDictTypeApi = () => {
  return http.download(PORT1 + `/dict/type/export`, {}, { loading: false });
};

// ========== 字典数据 ==========

/**
 * @description 分页查询字典数据列表
 * @param params Dict.ReqDictDataParams
 * @returns Promise<ResPage<Dict.ResDictData>>
 */
export const getDictDataListApi = (params: Dict.ReqDictDataParams) => {
  return http.get<ResPage<Dict.ResDictData>>(PORT1 + `/dict/data/list`, params, { loading: false });
};

/**
 * @description 按字典类型编码查询启用的字典数据（不分页，供全局 useDict 调用）
 * @param dictType string
 * @returns Promise<Dict.ResDictData[]>
 */
export const getDictDataByTypeApi = (dictType: string) => {
  return http.get<Dict.ResDictData[]>(PORT1 + `/dict/data/type/${dictType}`, {}, { loading: false });
};

/**
 * @description 新增字典数据
 * @param params Dict.ReqSaveDictData
 */
export const addDictDataApi = (params: Dict.ReqSaveDictData) => {
  return http.post(PORT1 + `/dict/data`, params, { loading: false });
};

/**
 * @description 编辑字典数据
 * @param params Dict.ReqSaveDictData
 */
export const updateDictDataApi = (params: Dict.ReqSaveDictData) => {
  return http.put(PORT1 + `/dict/data`, params, { loading: false });
};

/**
 * @description 删除字典数据
 * @param id number
 */
export const deleteDictDataApi = (id: number) => {
  return http.delete(PORT1 + `/dict/data/${id}`, {}, { loading: false });
};

/**
 * @description 切换字典数据状态
 * @param params { id, status }
 */
export const changeDictDataStatusApi = (params: { id: number; status: number }) => {
  return http.put(PORT1 + `/dict/data/status`, params, { loading: false });
};

/**
 * @description 导出字典数据列表
 */
export const exportDictDataApi = () => {
  return http.download(PORT1 + `/dict/data/export`, {}, { loading: false });
};

// ========== 缓存 ==========

/**
 * @description 手动刷新后端全部字典缓存
 */
export const refreshDictCacheApi = () => {
  return http.post(PORT1 + `/dict/cache/refresh`, {}, { loading: false });
};
