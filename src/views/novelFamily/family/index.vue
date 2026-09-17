<template>
  <div class="novel-family-index card">
    <!-- 筛选区 -->
    <div class="filter-bar">
      <el-input
        v-model="searchState.keyword"
        class="filter-bar__search"
        placeholder="搜索家族名称 / 别称 / 简介"
        clearable
        :prefix-icon="Search"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select v-model="searchState.type" class="filter-bar__select" placeholder="全部类型" clearable @change="handleSearch">
        <el-option v-for="item in familyTypeDict" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="searchState.status" class="filter-bar__select" placeholder="全部地位" clearable @change="handleSearch">
        <el-option v-for="item in familyStatusDict" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="searchState.novelId" class="filter-bar__select" placeholder="全部小说" clearable @change="handleSearch">
        <el-option v-for="item in novelOptions" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button type="primary" plain :icon="Plus" @click="openCreate">新增家族</el-button>
    </div>

    <!-- 表格 -->
    <el-table v-loading="loading" :data="familyList" stripe>
      <el-table-column prop="name" label="家族名称" min-width="140" fixed="left" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="family-cell">
            <el-image
              v-if="row.emblem"
              :src="row.emblem"
              fit="cover"
              class="family-cell__emblem"
              :preview-src-list="[row.emblem]"
              preview-teleported
            />
            <div class="family-cell__name">
              <div class="family-cell__title">{{ row.name }}</div>
              <div v-if="row.alias" class="family-cell__alias">{{ row.alias }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="所属小说" width="110" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.novelName" size="small" effect="plain">{{ row.novelName }}</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.type" :type="getDictTagType(familyTypeDict, row.type)" size="small">{{
            getDictLabel(familyTypeDict, row.type)
          }}</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="地位" width="90" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.status" :type="getDictTagType(familyStatusDict, row.status)" size="small">{{
            getDictLabel(familyStatusDict, row.status)
          }}</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="memberCount" label="成员数" width="80" align="center" />
      <el-table-column prop="coreCount" label="核心角色" width="90" align="center" />
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="table-footer">
      <el-pagination
        v-model:current-page="pageable.pageNum"
        v-model:page-size="pageable.pageSize"
        :total="pageable.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSearch"
        @current-change="fetchList"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <EditDialog v-model:visible="editVisible" :family-id="editFamilyId" @saved="handleSaved" />

    <!-- 详情抽屉 -->
    <DetailDrawer v-model:visible="detailVisible" :family-id="currentFamilyId" @changed="fetchList" />
  </div>
</template>

<script setup lang="ts" name="novelFamilyIndex">
import { Plus, Search } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { deleteFamilyApi, getFamilyListApi } from "@/api/modules/novelFamily";
import { getNovelAllApi } from "@/api/modules/novel";
import { Novel, NovelFamily } from "@/api/interface";
import { getDictLabel, getDictTagType, useDict } from "@/hooks/useDict";
import { formatTime } from "@/utils/format";
import DetailDrawer from "@/views/novelFamily/family/DetailDrawer.vue";
import EditDialog from "@/views/novelFamily/family/EditDialog.vue";

const route = useRoute();

const { novel_family_type: familyTypeDict, novel_family_status: familyStatusDict } = useDict(
  "novel_family_type",
  "novel_family_status"
);

const loading = ref(false);
const familyList = ref<NovelFamily.ResFamilyList[]>([]);
const novelOptions = ref<Novel.ResNovelList[]>([]);
const searchState = reactive({ keyword: "", type: "", status: "", novelId: undefined as number | undefined });
const pageable = reactive({ pageNum: 1, pageSize: 10, total: 0 });

const editVisible = ref(false);
const editFamilyId = ref(0);
const detailVisible = ref(false);
const currentFamilyId = ref(0);

const fetchList = async () => {
  loading.value = true;
  try {
    const { data } = await getFamilyListApi({
      pageNum: pageable.pageNum,
      pageSize: pageable.pageSize,
      keyword: searchState.keyword || undefined,
      type: searchState.type || undefined,
      status: searchState.status || undefined,
      novelId: searchState.novelId || undefined
    });
    familyList.value = data.list || [];
    pageable.total = data.total || 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pageable.pageNum = 1;
  fetchList();
};

const openCreate = () => {
  editFamilyId.value = 0;
  editVisible.value = true;
};

const openEdit = (row: NovelFamily.ResFamilyList) => {
  editFamilyId.value = row.id;
  editVisible.value = true;
};

const openDetail = (row: NovelFamily.ResFamilyList) => {
  currentFamilyId.value = row.id;
  detailVisible.value = true;
};

const handleDelete = (row: NovelFamily.ResFamilyList) => {
  ElMessageBox.confirm(`确定删除家族「${row.name}」吗？该家族下存在成员时无法删除。`, "删除确认", {
    type: "warning",
    confirmButtonText: "删除",
    cancelButtonText: "取消"
  })
    .then(async () => {
      await deleteFamilyApi(row.id);
      ElMessage.success("删除成功");
      fetchList();
    })
    .catch(() => {
      // 用户取消删除，无需处理
    });
};

const handleSaved = () => {
  fetchList();
};

/** 从成员页/图谱页跳转：?id=xx 时自动打开详情 */
const syncFromRoute = () => {
  const id = route.query.id;
  if (id) {
    currentFamilyId.value = Number(id);
    detailVisible.value = true;
  }
};

const loadNovelOptions = async () => {
  try {
    const { data } = await getNovelAllApi();
    novelOptions.value = data || [];
  } catch {
    novelOptions.value = [];
  }
};

onMounted(() => {
  fetchList();
  loadNovelOptions();
  syncFromRoute();
});
</script>

<style scoped>
.novel-family-index {
  padding: 16px;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.filter-bar__search {
  width: 260px;
}
.filter-bar__select {
  width: 140px;
}
.family-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}
.family-cell__emblem {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  background: #f2f3f5;
  border-radius: 6px;
}
.family-cell__title {
  font-weight: 600;
  color: #1f2329;
}
.family-cell__alias {
  font-size: 12px;
  color: #86909c;
}
.table-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
