import { defineStore } from "pinia";
import { ref } from "vue";

import { Dict } from "@/api/interface";
import { getDictDataByTypeApi } from "@/api/modules/dict";

/**
 * 全局字典缓存：按字典类型编码缓存已请求过的字典数据，避免重复请求
 */
export const useDictStore = defineStore("geeker-dict", () => {
  const dictMap = ref<Record<string, Dict.ResDictData[]>>({});
  // 进行中的请求，避免同一字典类型并发重复请求
  const pendingMap: Record<string, Promise<Dict.ResDictData[]>> = {};

  const getDict = (dictType: string): Promise<Dict.ResDictData[]> => {
    if (dictMap.value[dictType]) {
      return Promise.resolve(dictMap.value[dictType]);
    }
    if (!pendingMap[dictType]) {
      pendingMap[dictType] = getDictDataByTypeApi(dictType)
        .then(({ data }) => {
          dictMap.value[dictType] = data;
          return data;
        })
        .finally(() => {
          delete pendingMap[dictType];
        });
    }
    return pendingMap[dictType];
  };

  // 清除指定字典类型缓存；不传则清除全部
  const refreshDict = (dictType?: string) => {
    if (dictType) {
      delete dictMap.value[dictType];
    } else {
      dictMap.value = {};
    }
  };

  return {
    dictMap,
    getDict,
    refreshDict
  };
});
