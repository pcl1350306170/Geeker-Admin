<template>
  <div class="dict-manage">
    <el-alert
      class="dict-alert"
      type="info"
      :closable="false"
      title="点击左侧字典类型行，右侧联动展示该类型下的字典数据；不选择时展示全部字典数据"
    />
    <el-row :gutter="15" class="dict-row">
      <el-col :span="10">
        <ProTable
          ref="typeTable"
          height="100%"
          :columns="typeColumns"
          :request-api="getDictTypeListApi"
          :data-callback="dataCallback"
          highlight-current-row
          @current-change="handleTypeSelect"
        >
          <!-- 表格 header 按钮 -->
          <template #tableHeader>
            <el-button v-auth="'add'" type="primary" :icon="CirclePlus" @click="openTypeDrawer('新增')">新增字典类型</el-button>
            <el-button type="primary" :icon="Download" plain @click="downloadTypeFile">导出字典类型</el-button>
            <el-button v-auth="'refreshCache'" type="warning" :icon="Refresh" plain @click="handleRefreshCache"
              >刷新缓存</el-button
            >
          </template>
          <!-- 表格操作 -->
          <template #operation="scope">
            <el-button v-auth="'edit'" type="primary" link :icon="EditPen" @click="openTypeDrawer('编辑', scope.row)"
              >编辑</el-button
            >
            <el-button v-auth="'delete'" type="primary" link :icon="Delete" @click="deleteDictType(scope.row)">删除</el-button>
          </template>
        </ProTable>
      </el-col>
      <el-col :span="14">
        <ProTable
          ref="dataTable"
          height="100%"
          :columns="dataColumns"
          :request-api="getDictDataListApi"
          :data-callback="dataCallback"
          :init-param="dataInitParam"
        >
          <!-- 表格 header 按钮 -->
          <template #tableHeader>
            <el-button v-auth="'add'" type="primary" :icon="CirclePlus" @click="openDataDrawer('新增')">新增字典数据</el-button>
            <el-button type="primary" :icon="Download" plain @click="downloadDataFile">导出字典数据</el-button>
          </template>
          <!-- 表格操作 -->
          <template #operation="scope">
            <el-button v-auth="'edit'" type="primary" link :icon="EditPen" @click="openDataDrawer('编辑', scope.row)"
              >编辑</el-button
            >
            <el-button v-auth="'delete'" type="primary" link :icon="Delete" @click="deleteDictData(scope.row)">删除</el-button>
          </template>
        </ProTable>
      </el-col>
    </el-row>
    <DictTypeDrawer ref="typeDrawerRef" />
    <DictDataDrawer ref="dataDrawerRef" />
  </div>
</template>

<script setup lang="tsx" name="dictManage">
import { CirclePlus, Delete, Download, EditPen, Refresh } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { ElMessageBox } from "element-plus";
import { computed, reactive, ref } from "vue";

import { Dict } from "@/api/interface";
import {
  addDictDataApi,
  addDictTypeApi,
  changeDictDataStatusApi,
  changeDictTypeStatusApi,
  deleteDictDataApi,
  deleteDictTypeApi,
  exportDictDataApi,
  exportDictTypeApi,
  getDictDataListApi,
  getDictTypeListApi,
  refreshDictCacheApi,
  updateDictDataApi,
  updateDictTypeApi
} from "@/api/modules/dict";
import ProTable from "@/components/ProTable/index.vue";
import { ColumnProps, ProTableInstance } from "@/components/ProTable/interface";
import { useAuthButtons } from "@/hooks/useAuthButtons";
import { useDownload } from "@/hooks/useDownload";
import { useHandleData } from "@/hooks/useHandleData";
import { useDictStore } from "@/stores/modules/dict";
import DictDataDrawer from "@/views/system/dictManage/components/DictDataDrawer.vue";
import DictTypeDrawer from "@/views/system/dictManage/components/DictTypeDrawer.vue";

const dictStore = useDictStore();

// ProTable 实例
const typeTable = ref<ProTableInstance>();
const dataTable = ref<ProTableInstance>();

// 后端返回的 data 已经是 { list, total, pageNum, pageSize } 结构
const dataCallback = (data: any) => {
  return {
    list: data.list,
    total: data.total
  };
};

// 页面按钮权限
const { BUTTONS } = useAuthButtons();

// 状态字典（本页面自身使用本地字典，避免依赖字典数据本身造成循环依赖）
const statusEnum = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

// 当前选中的字典类型编码（左侧行点击联动右侧表格）
const selectedDictType = ref<string>("");
const dataInitParam = computed(() => ({ dictType: selectedDictType.value }));

const handleTypeSelect = (row: Dict.ResDictType | null) => {
  selectedDictType.value = row?.type ?? "";
};

// 字典类型表格配置项
const typeColumns = reactive<ColumnProps<Dict.ResDictType>[]>([
  { prop: "name", label: "字典名称", minWidth: 120, search: { el: "input" } },
  { prop: "type", label: "字典类型编码", minWidth: 140, search: { el: "input" } },
  {
    prop: "status",
    label: "状态",
    width: 90,
    align: "center",
    enum: statusEnum,
    search: { el: "select" },
    fieldNames: { label: "label", value: "value" },
    render: scope => {
      return (
        <>
          {BUTTONS.value.status ? (
            <el-switch
              model-value={scope.row.status}
              active-text="启用"
              inactive-text="禁用"
              active-value={1}
              inactive-value={0}
              onClick={() => changeTypeStatus(scope.row)}
            />
          ) : (
            <el-tag type={scope.row.status === 1 ? "success" : "danger"}>{scope.row.status === 1 ? "启用" : "禁用"}</el-tag>
          )}
        </>
      );
    }
  },
  { prop: "remark", label: "备注", minWidth: 130, showOverflowTooltip: true },
  {
    prop: "createTime",
    label: "创建时间",
    width: 170,
    render: scope => {
      return <span>{scope.row.createTime ? dayjs(scope.row.createTime).format("YYYY-MM-DD HH:mm:ss") : ""}</span>;
    }
  },
  { prop: "operation", label: "操作", fixed: "right", width: 140 }
]);

// 字典数据表格配置项
const dataColumns = reactive<ColumnProps<Dict.ResDictData>[]>([
  { prop: "dictTypeName", label: "所属字典类型", minWidth: 120, showOverflowTooltip: true },
  { prop: "label", label: "字典标签", minWidth: 110, search: { el: "input" } },
  { prop: "value", label: "字典键值", minWidth: 100 },
  { prop: "sort", label: "排序", width: 70, align: "center" },
  {
    prop: "listClass",
    label: "样式类型",
    width: 100,
    align: "center",
    render: scope => {
      return (
        <>{scope.row.listClass ? <el-tag type={scope.row.listClass as any}>{scope.row.listClass}</el-tag> : <span>-</span>}</>
      );
    }
  },
  {
    prop: "isDefault",
    label: "是否默认",
    width: 90,
    align: "center",
    render: scope => {
      return <el-tag type={scope.row.isDefault === 1 ? "success" : "info"}>{scope.row.isDefault === 1 ? "是" : "否"}</el-tag>;
    }
  },
  {
    prop: "status",
    label: "状态",
    width: 90,
    align: "center",
    enum: statusEnum,
    search: { el: "select" },
    fieldNames: { label: "label", value: "value" },
    render: scope => {
      return (
        <>
          {BUTTONS.value.status ? (
            <el-switch
              model-value={scope.row.status}
              active-text="启用"
              inactive-text="禁用"
              active-value={1}
              inactive-value={0}
              onClick={() => changeDataStatus(scope.row)}
            />
          ) : (
            <el-tag type={scope.row.status === 1 ? "success" : "danger"}>{scope.row.status === 1 ? "启用" : "禁用"}</el-tag>
          )}
        </>
      );
    }
  },
  { prop: "remark", label: "备注", minWidth: 130, showOverflowTooltip: true },
  {
    prop: "createTime",
    label: "创建时间",
    width: 170,
    render: scope => {
      return <span>{scope.row.createTime ? dayjs(scope.row.createTime).format("YYYY-MM-DD HH:mm:ss") : ""}</span>;
    }
  },
  { prop: "operation", label: "操作", fixed: "right", width: 140 }
]);

// 字典类型/数据发生任何变更后，清除前端全局字典缓存，保证其他页面 useDict 拿到最新数据
const clearDictCache = () => {
  dictStore.refreshDict();
};

// 删除字典类型
const deleteDictType = async (params: Dict.ResDictType) => {
  await useHandleData(deleteDictTypeApi, params.id, `删除【${params.name}】字典类型`);
  typeTable.value?.getTableList();
  dataTable.value?.getTableList();
  clearDictCache();
};

// 切换字典类型状态
const changeTypeStatus = async (row: Dict.ResDictType) => {
  await useHandleData(
    changeDictTypeStatusApi,
    { id: row.id, status: row.status === 1 ? 0 : 1 },
    `切换【${row.name}】字典类型状态`
  );
  typeTable.value?.getTableList();
  clearDictCache();
};

// 删除字典数据
const deleteDictData = async (params: Dict.ResDictData) => {
  await useHandleData(deleteDictDataApi, params.id, `删除【${params.label}】字典数据`);
  dataTable.value?.getTableList();
  clearDictCache();
};

// 切换字典数据状态
const changeDataStatus = async (row: Dict.ResDictData) => {
  await useHandleData(
    changeDictDataStatusApi,
    { id: row.id, status: row.status === 1 ? 0 : 1 },
    `切换【${row.label}】字典数据状态`
  );
  dataTable.value?.getTableList();
  clearDictCache();
};

// 导出字典类型列表
const downloadTypeFile = () => {
  ElMessageBox.confirm("确认导出字典类型数据?", "温馨提示", { type: "warning" }).then(() =>
    useDownload(exportDictTypeApi, "字典类型列表", {}, true, ".csv")
  );
};

// 导出字典数据列表
const downloadDataFile = () => {
  ElMessageBox.confirm("确认导出字典数据?", "温馨提示", { type: "warning" }).then(() =>
    useDownload(exportDictDataApi, "字典数据列表", {}, true, ".csv")
  );
};

// 手动刷新后端字典缓存（同时清除前端本地缓存）
const handleRefreshCache = async () => {
  await useHandleData(refreshDictCacheApi, {}, "刷新字典缓存");
  clearDictCache();
};

// 打开字典类型 drawer(新增、编辑)
const typeDrawerRef = ref<InstanceType<typeof DictTypeDrawer> | null>(null);
const openTypeDrawer = (title: string, row: Partial<Dict.ResDictType> = {}) => {
  typeDrawerRef.value?.acceptParams({
    title,
    isView: false,
    row: { ...row },
    api: title === "新增" ? addDictTypeApi : updateDictTypeApi,
    getTableList: () => {
      typeTable.value?.getTableList();
      dataTable.value?.getTableList();
      clearDictCache();
    }
  });
};

// 打开字典数据 drawer(新增、编辑)
const dataDrawerRef = ref<InstanceType<typeof DictDataDrawer> | null>(null);
const openDataDrawer = (title: string, row: Partial<Dict.ResDictData> = {}) => {
  dataDrawerRef.value?.acceptParams({
    title,
    isView: false,
    row: { dictType: selectedDictType.value, ...row },
    api: title === "新增" ? addDictDataApi : updateDictDataApi,
    getTableList: () => {
      dataTable.value?.getTableList();
      clearDictCache();
    }
  });
};
</script>

<style scoped lang="scss">
/* 页面填满 el-main，内部采用多层 flex 链路，把可用高度传递到 el-table，
   再依靠 ProTable 上的 height="100%" 触发 Element Plus 内部滚动（表头固定，仅表体滚动）。 */
.dict-manage {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  .dict-alert {
    flex-shrink: 0;
    margin-bottom: 10px;
  }
  .dict-row {
    flex: 1 1 0;
    flex-wrap: nowrap;
    min-height: 0;
  }

  // el-col 作为 ProTable 的直接容器，需要变成列方向 flex，并把高度传递下去
  :deep(.el-col) {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  // 搜索区、表格头部按钮区、分页都固定，不参与滚动
  :deep(.table-search),
  :deep(.table-main > .table-header),
  :deep(.table-main > .el-pagination) {
    flex-shrink: 0;
  }

  // 覆盖 element.scss 中 .table-main 的 height:100%，避免与 flex-basis 冲突
  :deep(.table-main) {
    flex: 1 1 0;
    height: auto;
    min-height: 0;
    overflow: hidden;
  }

  // el-table 占满 .table-main 剩余空间，配合 height="100%" prop 启用内部滚动
  :deep(.table-main > .el-table) {
    flex: 1 1 0;
    min-height: 0;
  }
}
</style>
