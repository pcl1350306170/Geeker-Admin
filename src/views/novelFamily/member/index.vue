<template>
  <div class="novel-member-index card">
    <!-- 筛选区 -->
    <div class="filter-bar">
      <el-input
        v-model="searchState.keyword"
        class="filter-bar__search"
        placeholder="搜索姓名 / 字 / 号 / 头衔"
        clearable
        :prefix-icon="Search"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select
        v-model="searchState.familyId"
        class="filter-bar__select"
        placeholder="全部家族"
        clearable
        filterable
        @change="handleSearch"
      >
        <el-option v-for="item in familyOptions" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-select
        v-model="searchState.roleType"
        class="filter-bar__select"
        placeholder="全部角色"
        clearable
        @change="handleSearch"
      >
        <el-option v-for="item in memberRoleDict" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-checkbox v-model="searchState.coreOnly" @change="handleSearch">仅核心角色</el-checkbox>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button type="primary" plain :icon="Plus" @click="openCreate">新增成员</el-button>
    </div>

    <!-- 表格 -->
    <el-table v-loading="loading" :data="memberList" stripe>
      <el-table-column prop="name" label="姓名" min-width="110" fixed="left" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="member-cell">
            <span class="member-cell__name">{{ row.name }}</span>
            <span v-if="row.alias" class="member-cell__alias">{{ row.alias }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="familyName" label="所属家族" min-width="130" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" @click="goFamily(row.familyId)">{{ row.familyName || "-" }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="性别" width="60" align="center">
        <template #default="{ row }">{{ row.gender || "-" }}</template>
      </el-table-column>
      <el-table-column prop="generation" label="辈分" width="90" show-overflow-tooltip />
      <el-table-column prop="title" label="头衔" min-width="120" show-overflow-tooltip />
      <el-table-column label="角色" width="90" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.roleType" :type="getDictTagType(memberRoleDict, row.roleType)" size="small">{{
            getDictLabel(memberRoleDict, row.roleType)
          }}</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="age" label="年龄" width="70" align="center">
        <template #default="{ row }">{{ row.age ?? "-" }}</template>
      </el-table-column>
      <el-table-column label="标志" width="110" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.isHead === 1" type="danger" size="small">家主</el-tag>
          <el-tag v-if="row.isCore === 1" type="warning" size="small">核心</el-tag>
        </template>
      </el-table-column>
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
    <EditDialog v-model:visible="editVisible" :member-id="editMemberId" @saved="handleSaved" />

    <!-- 详情抽屉 -->
    <DetailDrawer v-model:visible="detailVisible" :member-id="currentMemberId" @changed="fetchList" />
  </div>
</template>

<script setup lang="ts" name="novelMemberIndex">
import { Plus, Search } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getFamilyListApi } from "@/api/modules/novelFamily";
import { deleteMemberApi, getMemberListApi } from "@/api/modules/novelMember";
import { NovelFamily, NovelMember } from "@/api/interface";
import { getDictLabel, getDictTagType, useDict } from "@/hooks/useDict";
import { formatTime } from "@/utils/format";
import DetailDrawer from "@/views/novelFamily/member/DetailDrawer.vue";
import EditDialog from "@/views/novelFamily/member/EditDialog.vue";

const route = useRoute();
const router = useRouter();

const { novel_member_role: memberRoleDict } = useDict("novel_member_role");

const loading = ref(false);
const memberList = ref<NovelMember.ResMemberList[]>([]);
const familyOptions = ref<NovelFamily.ResFamilyList[]>([]);

const searchState = reactive({
  keyword: "",
  familyId: undefined as number | undefined,
  roleType: "",
  coreOnly: false
});
const pageable = reactive({ pageNum: 1, pageSize: 10, total: 0 });

const editVisible = ref(false);
const editMemberId = ref(0);
const detailVisible = ref(false);
const currentMemberId = ref(0);

const fetchList = async () => {
  loading.value = true;
  try {
    const { data } = await getMemberListApi({
      pageNum: pageable.pageNum,
      pageSize: pageable.pageSize,
      keyword: searchState.keyword || undefined,
      familyId: searchState.familyId,
      roleType: searchState.roleType || undefined,
      isCore: searchState.coreOnly ? 1 : undefined
    });
    memberList.value = data.list || [];
    pageable.total = data.total || 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pageable.pageNum = 1;
  fetchList();
};

const loadFamilyOptions = async () => {
  const { data } = await getFamilyListApi({ pageNum: 1, pageSize: 200 });
  familyOptions.value = data.list || [];
};

const syncFromRoute = () => {
  const familyId = route.query.familyId;
  if (familyId) {
    searchState.familyId = Number(familyId);
    pageable.pageNum = 1;
    fetchList();
  }
};

const goFamily = (familyId: number) => {
  router.push({ path: "/novelFamily/family", query: { id: familyId } });
};

const openCreate = () => {
  editMemberId.value = 0;
  editVisible.value = true;
};

const openEdit = (row: NovelMember.ResMemberList) => {
  editMemberId.value = row.id;
  editVisible.value = true;
};

const openDetail = (row: NovelMember.ResMemberList) => {
  currentMemberId.value = row.id;
  detailVisible.value = true;
};

const handleDelete = (row: NovelMember.ResMemberList) => {
  ElMessageBox.confirm(`确定删除成员「${row.name}」吗？其相关关系将一并删除。`, "删除确认", {
    type: "warning",
    confirmButtonText: "删除",
    cancelButtonText: "取消"
  })
    .then(async () => {
      await deleteMemberApi(row.id);
      ElMessage.success("删除成功");
      fetchList();
    })
    .catch(() => {
      // 用户取消删除，无需处理
    });
};

const handleSaved = () => {
  fetchList();
  loadFamilyOptions();
};

onMounted(() => {
  loadFamilyOptions();
  syncFromRoute();
});
</script>

<style scoped>
.novel-member-index {
  padding: 16px;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}
.filter-bar__search {
  width: 240px;
}
.filter-bar__select {
  width: 150px;
}
.member-cell__name {
  font-weight: 600;
  color: #1f2329;
}
.member-cell__alias {
  margin-left: 4px;
  font-size: 12px;
  color: #86909c;
}
.table-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
