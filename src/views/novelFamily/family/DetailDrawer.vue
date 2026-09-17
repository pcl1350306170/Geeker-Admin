<template>
  <el-drawer
    v-model="visible"
    :title="detail ? detail.name : '家族详情'"
    size="760px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div v-if="detail" class="family-detail">
      <!-- 概览 -->
      <div class="family-detail__overview">
        <el-image
          v-if="detail.emblem"
          :src="detail.emblem"
          fit="cover"
          class="overview-emblem"
          :preview-src-list="[detail.emblem]"
          preview-teleported
        />
        <div class="overview-info">
          <div class="overview-name">
            {{ detail.name }}
            <span v-if="detail.alias" class="overview-alias">（{{ detail.alias }}）</span>
          </div>
          <div class="overview-tags">
            <el-tag v-if="detail.type" :type="getDictTagType(familyTypeDict, detail.type)" size="small">{{
              getDictLabel(familyTypeDict, detail.type)
            }}</el-tag>
            <el-tag v-if="detail.status" :type="getDictTagType(familyStatusDict, detail.status)" size="small">{{
              getDictLabel(familyStatusDict, detail.status)
            }}</el-tag>
            <el-tag v-if="detail.headName" type="danger" size="small">家主：{{ detail.headName }}</el-tag>
            <el-tag type="info" size="small">成员 {{ detail.memberCount }}</el-tag>
            <el-tag type="warning" size="small">核心 {{ detail.coreCount }}</el-tag>
          </div>
          <div v-if="detail.introduction" class="overview-intro">{{ detail.introduction }}</div>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="family-detail__tabs">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="base">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="家训/祖训">{{ detail.creed || "-" }}</el-descriptions-item>
            <el-descriptions-item label="势力范围">{{ detail.territory || "-" }}</el-descriptions-item>
            <el-descriptions-item label="创建人">{{ detail.createdBy || "-" }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatTime(detail.updatedAt) }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="detail.background" class="block">
            <div class="block__title">背景故事</div>
            <div class="block__content">{{ detail.background }}</div>
          </div>
          <div v-if="detail.cover" class="block">
            <div class="block__title">封面图</div>
            <el-image
              :src="detail.cover"
              fit="cover"
              style="max-width: 360px; border-radius: 8px"
              :preview-src-list="[detail.cover]"
              preview-teleported
            />
          </div>
        </el-tab-pane>

        <!-- 成员 -->
        <el-tab-pane label="成员" name="members">
          <div class="tab-toolbar">
            <el-input
              v-model="memberKeyword"
              class="tab-toolbar__search"
              placeholder="搜索成员姓名/字/号"
              clearable
              :prefix-icon="Search"
              @keyup.enter="loadMembers"
              @clear="loadMembers"
            />
            <el-button type="primary" plain :icon="Plus" @click="openMemberCreate">添加成员</el-button>
          </div>
          <el-table v-loading="memberLoading" :data="memberList" stripe size="small">
            <el-table-column prop="name" label="姓名" min-width="100" show-overflow-tooltip />
            <el-table-column prop="alias" label="字/号" width="110" show-overflow-tooltip />
            <el-table-column prop="title" label="头衔" min-width="110" show-overflow-tooltip />
            <el-table-column label="角色" width="90" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.roleType" :type="getDictTagType(memberRoleDict, row.roleType)" size="small">{{
                  getDictLabel(memberRoleDict, row.roleType)
                }}</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="标志" width="110" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.isHead === 1" type="danger" size="small">家主</el-tag>
                <el-tag v-if="row.isCore === 1" type="warning" size="small">核心</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button link type="primary" @click="openMemberEdit(row)">编辑</el-button>
                <el-button link type="danger" @click="handleMemberDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 家族间关系 -->
        <el-tab-pane label="家族间关系" name="relations">
          <div class="tab-toolbar">
            <span class="tab-toolbar__hint">共 {{ relationList.length }} 条关系</span>
            <el-button type="primary" plain :icon="Plus" @click="openRelationCreate">添加关系</el-button>
          </div>
          <el-table v-loading="relationLoading" :data="relationList" stripe size="small">
            <el-table-column label="关系" min-width="200">
              <template #default="{ row }">
                <div class="relation-cell">
                  <span class="relation-cell__name">{{ row.sourceName }}</span>
                  <el-tag size="small" class="relation-cell__type">{{
                    getDictLabel(relationTypeDict, row.relationType) || row.relationType
                  }}</el-tag>
                  <span class="relation-cell__name">{{ row.targetName }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="160" show-overflow-tooltip />
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'BROKEN' ? 'info' : 'success'" size="small">{{
                  row.status === "BROKEN" ? "破裂" : "存续"
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70" align="center">
              <template #default="{ row }">
                <el-button link type="danger" @click="handleRelationDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 成员编辑弹窗（复用成员模块） -->
    <MemberEditDialog
      v-model:visible="memberEditVisible"
      :member-id="memberEditId"
      :default-family-id="props.familyId"
      @saved="loadMembers"
    />

    <!-- 家族间关系添加弹窗 -->
    <AddRelationDialog v-model:visible="relationCreateVisible" :source-family-id="props.familyId" @saved="loadRelations" />
  </el-drawer>
</template>

<script setup lang="ts" name="novelFamilyDetailDrawer">
import { Plus, Search } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, ref, watch } from "vue";

import { getFamilyDetailApi } from "@/api/modules/novelFamily";
import { getMemberListApi, deleteMemberApi } from "@/api/modules/novelMember";
import { getRelationListApi, deleteRelationApi } from "@/api/modules/novelRelation";
import { NovelFamily, NovelMember, NovelRelation } from "@/api/interface";
import { getDictLabel, getDictTagType, useDict } from "@/hooks/useDict";
import { formatTime } from "@/utils/format";
import MemberEditDialog from "@/views/novelFamily/member/EditDialog.vue";
import AddRelationDialog from "@/views/novelFamily/family/AddRelationDialog.vue";

const props = defineProps<{ visible: boolean; familyId: number }>();
const emit = defineEmits<{ "update:visible": [value: boolean]; changed: [] }>();

const {
  novel_family_type: familyTypeDict,
  novel_family_status: familyStatusDict,
  novel_member_role: memberRoleDict,
  novel_relation_type: relationTypeDict
} = useDict("novel_family_type", "novel_family_status", "novel_member_role", "novel_relation_type");

const visible = computed({
  get: () => props.visible,
  set: value => emit("update:visible", value)
});

const activeTab = ref("base");
const detail = ref<NovelFamily.ResFamilyDetail>();

// 成员
const memberLoading = ref(false);
const memberList = ref<NovelMember.ResMemberList[]>([]);
const memberKeyword = ref("");
const memberEditVisible = ref(false);
const memberEditId = ref(0);

// 家族间关系
const relationLoading = ref(false);
const relationList = ref<NovelRelation.ResRelation[]>([]);
const relationCreateVisible = ref(false);

watch(
  () => props.visible,
  async open => {
    if (!open) return;
    activeTab.value = "base";
    const { data } = await getFamilyDetailApi(props.familyId);
    detail.value = data;
    loadMembers();
    loadRelations();
  }
);

const loadMembers = async () => {
  if (!props.familyId) return;
  memberLoading.value = true;
  try {
    const { data } = await getMemberListApi({
      pageNum: 1,
      pageSize: 200,
      familyId: props.familyId,
      keyword: memberKeyword.value || undefined
    });
    memberList.value = data.list || [];
  } finally {
    memberLoading.value = false;
  }
};

const openMemberCreate = () => {
  memberEditId.value = 0;
  memberEditVisible.value = true;
};

const openMemberEdit = (row: NovelMember.ResMemberList) => {
  memberEditId.value = row.id;
  memberEditVisible.value = true;
};

const handleMemberDelete = (row: NovelMember.ResMemberList) => {
  ElMessageBox.confirm(`确定删除成员「${row.name}」吗？其相关关系将一并删除。`, "删除确认", {
    type: "warning",
    confirmButtonText: "删除",
    cancelButtonText: "取消"
  })
    .then(async () => {
      await deleteMemberApi(row.id);
      ElMessage.success("删除成功");
      loadMembers();
      emit("changed");
    })
    .catch(() => {
      // 用户取消删除，无需处理
    });
};

const loadRelations = async () => {
  if (!props.familyId) return;
  relationLoading.value = true;
  try {
    const { data } = await getRelationListApi({ pageNum: 1, pageSize: 200, familyId: props.familyId });
    relationList.value = data.list || [];
  } finally {
    relationLoading.value = false;
  }
};

const openRelationCreate = () => {
  relationCreateVisible.value = true;
};

const handleRelationDelete = (row: NovelRelation.ResRelation) => {
  ElMessageBox.confirm(`确定删除「${row.sourceName} × ${row.targetName}」的关系吗？`, "删除确认", {
    type: "warning",
    confirmButtonText: "删除",
    cancelButtonText: "取消"
  })
    .then(async () => {
      await deleteRelationApi(row.id);
      ElMessage.success("删除成功");
      loadRelations();
    })
    .catch(() => {
      // 用户取消删除，无需处理
    });
};
</script>

<style scoped>
.family-detail__overview {
  display: flex;
  gap: 14px;
  padding-bottom: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid #f0f1f2;
}
.overview-emblem {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  background: #f2f3f5;
  border-radius: 10px;
}
.overview-name {
  font-size: 18px;
  font-weight: 700;
  color: #1f2329;
}
.overview-alias {
  font-size: 13px;
  font-weight: 400;
  color: #86909c;
}
.overview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.overview-intro {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #4e5969;
}
.block {
  margin-top: 14px;
}
.block__title {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}
.block__content {
  padding: 12px;
  font-size: 13px;
  line-height: 1.8;
  color: #4e5969;
  white-space: pre-wrap;
  background: #f7f8fa;
  border-radius: 8px;
}
.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.tab-toolbar__search {
  width: 240px;
}
.tab-toolbar__hint {
  font-size: 13px;
  color: #86909c;
}
.relation-cell {
  display: flex;
  gap: 6px;
  align-items: center;
}
.relation-cell__name {
  font-weight: 500;
}
</style>
