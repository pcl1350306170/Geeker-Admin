import blogHttp, { BlogResult } from "@/api/blogHttp";

/** 通用数据记录（对应 blog 的 general_data 表） */
export interface GeneralData {
  id: number;
  dataType: string;
  dataKey: string;
  dataContent: string;
  createTime?: string;
  updateTime?: string;
  isDeleted?: number;
}

/** 保存入参 */
export interface GeneralDataSaveParams {
  dataType: string;
  dataKey?: string;
  dataContent: string;
}

const BASE = "/api/v1/general-data";

/** 保存单条，返回新记录 id */
export const saveGeneralData = (params: GeneralDataSaveParams): Promise<number> =>
  blogHttp.post<number, BlogResult<number>>(`${BASE}/save`, params).then(res => res.data);

/** 批量保存（后端会按 dataContent 去重） */
export const batchSaveGeneralData = (list: GeneralDataSaveParams[]): Promise<any> =>
  blogHttp.post<any, BlogResult<any>>(`${BASE}/batch-save`, list).then(res => res.data);

/** 根据 id 更新字段 */
export const updateGeneralData = (id: number, fields: Partial<GeneralData>): Promise<any> =>
  blogHttp.post<any, BlogResult<any>>(`${BASE}/update`, { ...fields, id }).then(res => res.data);

/** 逻辑删除 */
export const removeGeneralData = (id: number): Promise<any> =>
  blogHttp.get<any, BlogResult<any>>(`${BASE}/delete`, { params: { id } }).then(res => res.data);

/** 按 id 查询 */
export const getGeneralDataById = (id: number): Promise<GeneralData> =>
  blogHttp.get<GeneralData, BlogResult<GeneralData>>(`${BASE}/get-by-id`, { params: { id } }).then(res => res.data);

/** 按类型查询全部 */
export const getGeneralDataByType = (dataType: string): Promise<GeneralData[]> =>
  blogHttp
    .get<GeneralData[], BlogResult<GeneralData[]>>(`${BASE}/get-by-type`, { params: { dataType } })
    .then(res => res.data || []);

/** 批量检查 dataKey，返回"不存在"的 key 列表 */
export const checkGeneralDataKeys = (dataType: string, dataKeys: string[]): Promise<string[]> =>
  blogHttp.post<string[], BlogResult<string[]>>(`${BASE}/check-keys`, { dataType, dataKeys }).then(res => res.data || []);

/** 智能保存：同类型下 dataKey 已存在则更新，否则新增 */
export const saveOrUpdateGeneralData = async (dataType: string, dataKey: string, dataContent: string) => {
  const list = await getGeneralDataByType(dataType);
  const existing = list.find(item => item.dataKey === dataKey);
  if (existing) return updateGeneralData(existing.id, { dataContent });
  return saveGeneralData({ dataType, dataKey, dataContent });
};

/** 按 dataKey 删除（先查后删） */
export const removeGeneralDataByKey = async (dataType: string, dataKey: string) => {
  const list = await getGeneralDataByType(dataType);
  const target = list.find(item => item.dataKey === dataKey);
  if (target) return removeGeneralData(target.id);
  throw new Error(`未找到 dataKey=${dataKey} 的记录`);
};
