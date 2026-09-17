import { ref, Ref } from "vue";

import { Dict } from "@/api/interface";
import { useDictStore } from "@/stores/modules/dict";

/**
 * @description 获取字典数据（全局缓存，多个组件复用同一份数据，不会重复请求）
 * @param dictTypes 字典类型编码，可传多个
 * @returns 以字典类型编码为 key 的响应式字典数据集合
 * */
export const useDict = (...dictTypes: string[]): Record<string, Ref<Dict.ResDictData[]>> => {
  const dictStore = useDictStore();
  const result: Record<string, Ref<Dict.ResDictData[]>> = {};
  dictTypes.forEach(dictType => {
    const dictRef = ref<Dict.ResDictData[]>([]) as Ref<Dict.ResDictData[]>;
    dictStore.getDict(dictType).then(data => {
      dictRef.value = data;
    });
    result[dictType] = dictRef;
  });
  return result;
};

/**
 * @description 根据字典键值查找对应的字典标签
 * */
export const getDictLabel = (dict: Dict.ResDictData[], value: string | number): string => {
  const item = dict.find(d => String(d.value) === String(value));
  return item ? item.label : "";
};

/** el-tag 样式类型（对应 Element Plus Tag type，空值返回 undefined 走默认样式） */
export type TagType = "primary" | "success" | "warning" | "info" | "danger";

/**
 * @description 根据字典键值查找对应的 el-tag 样式类型（listClass）
 * */
export const getDictTagType = (dict: Dict.ResDictData[], value: string | number): TagType | undefined => {
  const item = dict.find(d => String(d.value) === String(value));
  return (item?.listClass as TagType) || undefined;
};
