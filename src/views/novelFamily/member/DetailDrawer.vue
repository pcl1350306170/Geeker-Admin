<template>
  <el-drawer
    v-model="visible"
    :title="detail ? detail.name : '成员详情'"
    size="720px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div v-if="detail" class="member-detail">
      <!-- 概览 -->
      <div class="member-detail__overview">
        <el-avatar :size="64" class="overview-avatar">{{ detail.name.slice(0, 1) }}</el-avatar>
        <div class="overview-info">
          <div class="overview-name">
            {{ detail.name }}
            <span v-if="detail.alias" class="overview-alias">（{{ detail.alias }}）</span>
          </div>
          <div class="overview-tags">
            <el-tag type="primary" size="small">{{ detail.familyName || "未知家族" }}</el-tag>
            <el-tag v-if="detail.title" type="info" size="small">{{ detail.title }}</el-tag>
            <el-tag v-if="detail.roleType" :type="getDictTagType(memberRoleDict, detail.roleType)" size="small">{{
              getDictLabel(memberRoleDict, detail.roleType)
            }}</el-tag>
            <el-tag v-if="detail.isHead === 1" type="danger" size="small">家主</el-tag>
            <el-tag v-if="detail.isCore === 1" type="warning" size="small">核心角色</el-tag>
          </div>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="member-detail__tabs">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="base">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="性别">{{ detail.gender || "-" }}</el-descriptions-item>
            <el-descriptions-item label="辈分">{{ detail.generation || "-" }}</el-descriptions-item>
            <el-descriptions-item label="年龄">{{ detail.age ?? "-" }}</el-descriptions-item>
            <el-descriptions-item label="创建人">{{ detail.createdBy || "-" }}</el-descriptions-item>
            <el-descriptions-item label="更新时间" :span="2">{{ formatTime(detail.updatedAt) }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="detail.personality?.length" class="block">
            <div class="block__title">性格标签</div>
            <div class="block__tags">
              <el-tag v-for="tag in detail.personality" :key="tag" size="small" effect="plain" class="block__tag">{{
                tag
              }}</el-tag>
            </div>
          </div>
          <div v-if="detail.appearance" class="block">
            <div class="block__title">外貌描述</div>
            <div class="block__content">{{ detail.appearance }}</div>
          </div>
          <div v-if="detail.bio" class="block">
            <div class="block__title">人物小传</div>
            <div class="block__content">{{ detail.bio }}</div>
          </div>
        </el-tab-pane>

        <!-- 关系 -->
        <el-tab-pane label="关系" name="relations">
          <div class="tab-toolbar">
            <span class="tab-toolbar__hint">共 {{ relationList.length }} 条关系</span>
            <el-button type="primary" plain :icon="Plus" @click="openRelationCreate">添加关系</el-button>
          </div>
          <el-table v-loading="relationLoading" :data="relationList" stripe size="small">
            <el-table-column label="关系" min-width="220">
              <template #default="{ row }">
                <div class="relation-cell">
                  <span class="relation-cell__name" :class="{ 'is-self': row.sourceId === props.memberId }">{{
                    row.sourceName
                  }}</span>
                  <el-tag size="small" class="relation-cell__type">{{
                    getDictLabel(relationTypeDict, row.relationType) || row.relationType
                  }}</el-tag>
                  <span class="relation-cell__name" :class="{ 'is-self': row.targetId === props.memberId }">{{
                    row.targetName
                  }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="140" show-overflow-tooltip />
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

    <!-- 成员关系添加弹窗 -->
    <AddRelationDialog v-model:visible="relationCreateVisible" :source-member-id="props.memberId" @saved="loadRelations" />
  </el-drawer>
</template>

<script setup lang="ts" name="novelMemberDetailDrawer">
import { Plus } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, ref, watch } from "vue";

import { getMemberDetailApi } from "@/api/modules/novelMember";
import { deleteRelationApi, getRelationListApi } from "@/api/modules/novelRelation";
import { NovelMember, NovelRelation } from "@/api/interface";
import { getDictLabel, getDictTagType, useDict } from "@/hooks/useDict";
import { formatTime } from "@/utils/format";
import AddRelationDialog from "@/views/novelFamily/member/AddRelationDialog.vue";

const props = defineProps<{ visible: boolean; memberId: number }>();
const emit = defineEmits<{ "update:visible": [value: boolean]; changed: [] }>();

const { novel_member_role: memberRoleDict, novel_relation_type: relationTypeDict } = useDict(
  "novel_member_role",
  "novel_relation_type"
);

const visible = computed({
  get: () => props.visible,
  set: value => emit("update:visible", value)
});

const activeTab = ref("base");
const detail = ref<NovelMember.ResMemberDetail>();
const relationLoading = ref(false);
const relationList = ref<NovelRelation.ResRelation[]>([]);
const relationCreateVisible = ref(false);

watch(
  () => props.visible,
  async open => {
    if (!open) return;
    activeTab.value = "base";
    const { data } = await getMemberDetailApi(props.memberId);
    detail.value = data;
    loadRelations();
  }
);

const loadRelations = async () => {
  if (!props.memberId) return;
  relationLoading.value = true;
  try {
    const { data } = await getRelationListApi({ pageNum: 1, pageSize: 200, memberId: props.memberId });
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
.member-detail__overview {
  display: flex;
  gap: 14px;
  padding-bottom: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid #f0f1f2;
}
.overview-avatar {
  flex-shrink: 0;
  font-size: 26px;
  background: #3370ff;
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
.block__tag {
  margin: 0 6px 6px 0;
}
.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
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
.relation-cell__name.is-self {
  font-weight: 600;
  color: #3370ff;
}
</style>
