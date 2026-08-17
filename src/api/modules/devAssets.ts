import http from "@/api";
import { DEV_ASSET_PORT } from "@/api/config/servicePort";
import { DevAsset, ResPage } from "@/api/interface/index";

/**
 * @description 首页聚合数据（最近使用 / 收藏 / 常用 / 最近更新）
 */
export const getDevAssetHomeApi = () => {
  return http.get<DevAsset.ResHomeData>(DEV_ASSET_PORT + `/home`, {}, { loading: false });
};

/**
 * @description 分页查询 / 搜索资产
 */
export const getDevAssetListApi = (params: DevAsset.ReqQueryParams) => {
  return http.get<ResPage<DevAsset.ResAssetList>>(DEV_ASSET_PORT, params, { loading: false, cancel: false });
};

/**
 * @description 资产详情（后端记录 VIEW）
 */
export const getDevAssetDetailApi = (id: number) => {
  return http.get<DevAsset.ResAssetDetail>(DEV_ASSET_PORT + `/${id}`, {}, { loading: false });
};

/**
 * @description 新增资产
 */
export const addDevAssetApi = (params: DevAsset.ReqSaveAsset) => {
  return http.post<{ id: number }>(DEV_ASSET_PORT, params, { loading: false });
};

/**
 * @description 编辑资产
 */
export const updateDevAssetApi = (id: number, params: DevAsset.ReqSaveAsset) => {
  return http.put(DEV_ASSET_PORT + `/${id}`, params, { loading: false });
};

/**
 * @description 删除资产（逻辑删除）
 */
export const deleteDevAssetApi = (id: number) => {
  return http.delete(DEV_ASSET_PORT + `/${id}`, {}, { loading: false });
};

/**
 * @description 收藏 / 取消收藏
 */
export const toggleDevAssetFavoriteApi = (id: number) => {
  return http.put<{ isFavorite: number }>(DEV_ASSET_PORT + `/${id}/favorite`, {}, { loading: false });
};

/**
 * @description 复制上报（usage_count + 1）
 */
export const recordDevAssetCopyApi = (id: number) => {
  return http.post(DEV_ASSET_PORT + `/${id}/copy`, {}, { loading: false, cancel: false });
};

/**
 * @description 基于旧资产创建新资产
 */
export const duplicateDevAssetApi = (id: number) => {
  return http.post<{ id: number }>(DEV_ASSET_PORT + `/${id}/duplicate`, {}, { loading: false });
};
