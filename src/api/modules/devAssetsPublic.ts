import http from "@/api";
import { DEV_ASSET_PUBLIC_PORT } from "@/api/config/servicePort";
import { DevAsset, DevTag, ResPage } from "@/api/interface/index";

/**
 * @description 公开接口（免登录，只读查询）
 */

/**
 * @description 分页查询 / 搜索资产（免登录）
 */
export const getPublicAssetListApi = (params: DevAsset.ReqQueryParams) => {
  return http.get<ResPage<DevAsset.ResAssetList>>(DEV_ASSET_PUBLIC_PORT, params, { loading: false, cancel: false });
};

/**
 * @description 标签字典（免登录）
 */
export const getPublicTagListApi = () => {
  return http.get<DevTag.ResTag[]>(DEV_ASSET_PUBLIC_PORT + `/tags`, {}, { loading: false });
};

/**
 * @description 资产详情（免登录，后端记录 VIEW）
 */
export const getPublicAssetDetailApi = (id: number) => {
  return http.get<DevAsset.ResAssetDetail>(DEV_ASSET_PUBLIC_PORT + `/${id}`, {}, { loading: false });
};

/**
 * @description 复制上报（免登录，usage_count + 1）
 */
export const recordPublicCopyApi = (id: number) => {
  return http.post(DEV_ASSET_PUBLIC_PORT + `/${id}/copy`, {}, { loading: false, cancel: false });
};
