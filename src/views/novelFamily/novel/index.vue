<template>
  <div class="novel-index card">
    <!-- 筛选区 -->
    <div class="filter-bar">
      <el-input
        v-model="searchState.keyword"
        class="filter-bar__search"
        placeholder="搜索小说名称 / 别名 / 作者"
        clearable
        :prefix-icon="Search"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select v-model="searchState.status" class="filter-bar__select" placeholder="全部状态" clearable @change="handleSearch">
        <el-option label="正常" value="ACTIVE" />
        <el-option label="停用" value="DISABLED" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button type="primary" plain :icon="Plus" @click="openCreate">新增小说</el-button>
    </div>

    <!-- 表格 -->
    <el-table v-loading="loading" :data="novelList" stripe>
      <el-table-column prop="name" label="小说名称" min-width="140" fixed="left" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="novel-cell">
            <div class="novel-cell__title">{{ row.name }}</div>
            <div v-if="row.alias" class="novel-cell__alias">{{ row.alias }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="author" label="作者" width="140" show-overflow-tooltip />
      <el-table-column prop="introduction" label="简介" min-width="220" show-overflow-tooltip />
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">{{
            row.status === "ACTIVE" ? "正常" : "停用"
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="familyCount" label="家族数" width="80" align="center" />
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="{ row }">
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
    <el-dialog
      v-model="editVisible"
      :title="isEdit ? '编辑小说' : '新增小说'"
      width="560px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="小说名称" prop="name">
              <el-input v-model="form.name" placeholder="如：红楼梦" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="作者">
              <el-input v-model="form.author" placeholder="如：曹雪芹" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="别名">
              <el-input v-model="form.alias" placeholder="如：石头记" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" placeholder="请选择" style="width: 100%">
                <el-option label="正常" value="ACTIVE" />
                <el-option label="停用" value="DISABLED" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="简介">
              <el-input
                v-model="form.introduction"
                type="textarea"
                :rows="3"
                maxlength="1000"
                show-word-limit
                placeholder="小说简介"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts" name="novelIndex">
import { Plus, Search } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";

import { addNovelApi, deleteNovelApi, getNovelListApi, updateNovelApi } from "@/api/modules/novel";
import { Novel } from "@/api/interface";
import { formatTime } from "@/utils/format";

const loading = ref(false);
const novelList = ref<Novel.ResNovelList[]>([]);
const searchState = reactive({ keyword: "", status: "" });
const pageable = reactive({ pageNum: 1, pageSize: 10, total: 0 });

const editVisible = ref(false);
const editId = ref(0);
const isEdit = computed(() => editId.value > 0);

const formRef = ref<FormInstance>();
const saving = ref(false);
const form = reactive<Novel.ReqSaveNovel>({
  name: "",
  alias: "",
  author: "",
  introduction: "",
  status: "ACTIVE",
  sort: 0
});

const rules: FormRules = {
  name: [{ required: true, message: "请输入小说名称", trigger: "blur" }]
};

const fetchList = async () => {
  loading.value = true;
  try {
    const { data } = await getNovelListApi({
      pageNum: pageable.pageNum,
      pageSize: pageable.pageSize,
      keyword: searchState.keyword || undefined,
      status: searchState.status || undefined
    });
    novelList.value = data.list || [];
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
  editId.value = 0;
  Object.assign(form, { name: "", alias: "", author: "", introduction: "", status: "ACTIVE", sort: 0 });
  editVisible.value = true;
};

const openEdit = (row: Novel.ResNovelList) => {
  editId.value = row.id;
  Object.assign(form, {
    name: row.name,
    alias: row.alias || "",
    author: row.author || "",
    introduction: row.introduction || "",
    status: row.status || "ACTIVE",
    sort: row.sort ?? 0
  });
  editVisible.value = true;
};

const handleDelete = (row: Novel.ResNovelList) => {
  ElMessageBox.confirm(`确定删除小说「${row.name}」吗？该小说下存在家族时无法删除。`, "删除确认", {
    type: "warning",
    confirmButtonText: "删除",
    cancelButtonText: "取消"
  })
    .then(async () => {
      await deleteNovelApi(row.id);
      ElMessage.success("删除成功");
      fetchList();
    })
    .catch(() => {
      // 用户取消删除，无需处理
    });
};

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateNovelApi(editId.value, { ...form });
    } else {
      await addNovelApi({ ...form });
    }
    ElMessage.success("保存成功");
    editVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
};

onMounted(fetchList);
</script>

<style scoped>
.novel-index {
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
.novel-cell__title {
  font-weight: 600;
  color: #1f2329;
}
.novel-cell__alias {
  font-size: 12px;
  color: #86909c;
}
.table-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
