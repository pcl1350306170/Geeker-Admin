import axios, { AxiosInstance, AxiosResponse } from "axios";
import { ElMessage } from "element-plus";

import { BLOG_BASE_URL } from "@/api/config/blogHost";

/** blog 后端统一响应结构：{ resultCode, message/desc, data } */
export interface BlogResult<T = any> {
  resultCode: number;
  message?: string;
  desc?: string;
  data: T;
}

/**
 * 独立的 blog 接口请求实例（不复用 @/api 的 Geeker 封装）
 * 原因：
 *  1. baseURL 指向 blog（dev 为代理前缀，prod 为绝对地址）
 *  2. blog 的 CORS 为 allowCredentials(false)，必须 withCredentials:false
 *  3. blog 返回结构为 resultCode，与 Geeker 的 code 不同
 * 后续所有"复用 blog 接口"的功能都应使用本实例。
 */
const blogHttp: AxiosInstance = axios.create({
  baseURL: BLOG_BASE_URL,
  timeout: 30000,
  withCredentials: false,
  headers: { "Content-Type": "application/json" }
});

blogHttp.interceptors.response.use(
  response => {
    const d = response.data as BlogResult;
    // 直接解包为 BlogResult 返回（业务层通过 res.data 取数据），故对 axios 类型做断言
    if (d && d.resultCode === 200) return d as unknown as AxiosResponse;
    const msg = (d && (d.message || d.desc)) || "接口返回异常";
    ElMessage.error(msg);
    return Promise.reject(new Error(msg));
  },
  error => {
    const msg = error?.response?.data?.message || error?.message || "网络错误，请确认 blog 服务是否可用";
    ElMessage.error(msg);
    return Promise.reject(error);
  }
);

export default blogHttp;
