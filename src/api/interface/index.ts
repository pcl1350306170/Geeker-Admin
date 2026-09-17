// 请求响应参数（不包含data）
export interface Result {
  code: string;
  msg: string;
}

// 请求响应参数（包含data）
export interface ResultData<T = any> extends Result {
  data: T;
}

// 分页响应参数
export interface ResPage<T> {
  list: T[];
  pageNum: number;
  pageSize: number;
  total: number;
}

// 分页请求参数
export interface ReqPage {
  pageNum: number;
  pageSize: number;
}

// 文件上传模块
export namespace Upload {
  export interface ResFileUrl {
    fileUrl: string;
  }
}

// 登录模块
export namespace Login {
  export interface ReqLoginForm {
    username: string;
    password: string;
  }
  export interface ResLogin {
    access_token: string;
  }
  export interface ResAuthButtons {
    [key: string]: string[];
  }
}

// 用户管理模块
export namespace User {
  export interface ReqUserParams extends ReqPage {
    username: string;
    gender: number;
    idCard: string;
    email: string;
    address: string;
    createTime: string[];
    status: number;
  }
  export interface ResUserList {
    id: string;
    username: string;
    gender: number;
    user: { detail: { age: number } };
    idCard: string;
    email: string;
    address: string;
    createTime: string;
    status: number;
    avatar: string;
    photo: any[];
    children?: ResUserList[];
  }
  export interface ResStatus {
    userLabel: string;
    userValue: number;
  }
  export interface ResGender {
    genderLabel: string;
    genderValue: number;
  }
  export interface ResDepartment {
    id: string;
    name: string;
    children?: ResDepartment[];
  }
  export interface ResRole {
    id: string;
    name: string;
    children?: ResDepartment[];
  }
}

// 角色管理模块（轻量方案：固定角色字典）
export namespace Role {
  // 角色信息
  export interface ResRoleList {
    code: string;
    name: string;
    description: string;
    /** 菜单权限是否固定不可编辑（admin 为 true） */
    menusFixed: boolean;
  }
  // 保存角色菜单权限参数
  export interface ReqSaveRoleMenus {
    role: string;
    menuIds: number[];
  }
}

// 菜单权限模块
export namespace MenuManage {
  // 菜单信息（与后端 sys_menu 对应）
  export interface ResMenuList {
    id: number;
    parentId: number;
    path: string;
    name: string;
    component: string;
    redirect: string;
    icon: string;
    title: string;
    isLink: string;
    isHide: number;
    isFull: number;
    isAffix: number;
    isKeepAlive: number;
    activeMenu: string;
    sort: number;
    status: number;
    children?: ResMenuList[];
  }
  // 新增/编辑参数
  export type ReqSaveMenu = Partial<ResMenuList>;
}

// 开发资产库模块
export namespace DevAsset {
  // 资产类型
  export type AssetType = "CODE" | "SOLUTION" | "TROUBLESHOOTING" | "PROCEDURE" | "SNIPPET";
  // 查询参数
  export interface ReqQueryParams extends ReqPage {
    keyword?: string;
    type?: string;
    tag?: string;
    isFavorite?: number;
  }
  // 列表项（不含正文）
  export interface ResAssetList {
    id: number;
    title: string;
    type: AssetType;
    description: string;
    language: string;
    tags: string[];
    isFavorite: number;
    usageCount: number;
    parentId: number | null;
    updatedAt: string;
  }
  // 订单预览项（列表项 + 正文首图缩略图）
  export interface ResAssetPreview {
    id: number;
    title: string;
    description: string;
    type: AssetType;
    tags: string[];
    coverImage: string | null;
    isFavorite: number;
    usageCount: number;
    updatedAt: string;
  }
  // 详情（含正文）
  export interface ResAssetDetail {
    id: number;
    title: string;
    type: AssetType;
    description: string;
    content: string;
    language: string;
    tags: string[];
    isFavorite: number;
    usageCount: number;
    parentId: number | null;
    parentTitle: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }
  // 新增/编辑参数
  export interface ReqSaveAsset {
    type?: string;
    title?: string;
    description?: string;
    content?: string;
    language?: string;
    tags?: string[];
  }
  // 首页聚合数据
  export interface ResHomeData {
    recentUsed: ResAssetList[];
    favorites: ResAssetList[];
    mostUsed: ResAssetList[];
    recentUpdated: ResAssetList[];
  }
}

// 开发资产库-标签字典模块
export namespace DevTag {
  // 标签项（含使用数量）
  export interface ResTag {
    id: number;
    name: string;
    sort: number;
    usageCount: number;
    createdAt: string;
  }
  // 新增/编辑参数
  export interface ReqSaveTag {
    name?: string;
    sort?: number;
  }
}

// 账号管理模块
export namespace Account {
  // 查询参数
  export interface ReqAccountParams extends ReqPage {
    username?: string;
    nickname?: string;
    status?: number | "";
    deptId?: number | "";
  }
  // 账号信息
  export interface ResAccountList {
    id: number;
    username: string;
    nickname: string;
    avatar: string;
    status: number;
    deptId: number | null;
    deptName: string | null;
    dataScope: number | null;
    createTime: string;
  }
  // 新增/编辑参数（password 为 MD5 后的值）
  export interface ReqSaveAccount {
    id?: number;
    username?: string;
    password?: string;
    nickname?: string;
    avatar?: string;
    status?: number;
    deptId?: number | null;
    dataScope?: number | null;
  }
}

// 部门管理模块
export namespace Department {
  // 查询参数（树形列表，不分页）
  export interface ReqDepartmentParams {
    name?: string;
    status?: number | "";
  }
  // 部门信息（与后端 sys_department 对应）
  export interface ResDepartmentList {
    id: number;
    parentId: number;
    name: string;
    code: string;
    leader: string;
    phone: string;
    email: string;
    sort: number;
    status: number;
    createTime: string;
    children?: ResDepartmentList[];
  }
  // 新增/编辑参数
  export type ReqSaveDepartment = Partial<ResDepartmentList>;
}

// 字典管理模块
export namespace Dict {
  // 字典类型查询参数
  export interface ReqDictTypeParams extends ReqPage {
    name?: string;
    type?: string;
    status?: number | "";
  }
  // 字典类型信息（与后端 sys_dict_type 对应）
  export interface ResDictType {
    id: number;
    name: string;
    type: string;
    status: number;
    remark: string;
    createTime: string;
    updateTime: string;
  }
  // 字典类型新增/编辑参数
  export type ReqSaveDictType = Partial<ResDictType>;

  // 字典数据查询参数
  export interface ReqDictDataParams extends ReqPage {
    dictType?: string;
    label?: string;
    status?: number | "";
  }
  // 字典数据信息（与后端 sys_dict_data 对应）
  export interface ResDictData {
    id: number;
    dictType: string;
    dictTypeName?: string;
    label: string;
    value: string;
    sort: number;
    status: number;
    listClass: string;
    isDefault: number;
    remark: string;
    createTime: string;
    updateTime: string;
  }
  // 字典数据新增/编辑参数
  export type ReqSaveDictData = Partial<ResDictData>;
}

// ========== 小说家族管理 ==========

export namespace NovelFamily {
  // 查询参数
  export interface ReqQueryParams extends ReqPage {
    keyword?: string;
    type?: string;
    status?: string;
    novelId?: number;
  }
  // 列表项（含成员数统计）
  export interface ResFamilyList {
    id: number;
    name: string;
    alias: string;
    type: string;
    status: string;
    introduction: string;
    emblem: string;
    cover: string;
    memberCount: number;
    novelId: number;
    novelName: string;
    coreCount: number;
    updatedAt: string;
  }
  // 详情（含背景故事、家主）
  export interface ResFamilyDetail {
    id: number;
    name: string;
    alias: string;
    type: string;
    status: string;
    introduction: string;
    background: string;
    creed: string;
    territory: string;
    emblem: string;
    cover: string;
    sort: number;
    novelId: number;
    novelName: string;
    memberCount: number;
    coreCount: number;
    headName: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }
  // 新增/编辑参数
  export interface ReqSaveFamily {
    name?: string;
    alias?: string;
    type?: string;
    status?: string;
    introduction?: string;
    background?: string;
    creed?: string;
    territory?: string;
    emblem?: string;
    cover?: string;
    novelId?: number;
    sort?: number;
  }
}

export namespace NovelMember {
  // 查询参数
  export interface ReqQueryParams extends ReqPage {
    keyword?: string;
    familyId?: number;
    novelId?: number;
    generation?: string;
    roleType?: string;
    isCore?: number;
  }
  // 列表项（含家族名）
  export interface ResMemberList {
    id: number;
    familyId: number;
    familyName: string;
    novelId: number;
    novelName: string;
    name: string;
    alias: string;
    gender: string;
    generation: string;
    title: string;
    roleType: string;
    age: number;
    isHead: number;
    isCore: number;
    sort: number;
    updatedAt: string;
  }
  // 详情（含性格标签、人物小传）
  export interface ResMemberDetail {
    id: number;
    familyId: number;
    familyName: string;
    novelId: number;
    novelName: string;
    name: string;
    alias: string;
    gender: string;
    generation: string;
    title: string;
    roleType: string;
    age: number;
    personality: string[];
    appearance: string;
    bio: string;
    isHead: number;
    isCore: number;
    sort: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }
  // 新增/编辑参数
  export interface ReqSaveMember {
    familyId?: number;
    name?: string;
    novelId?: number;
    alias?: string;
    gender?: string;
    generation?: string;
    title?: string;
    roleType?: string;
    age?: number;
    personality?: string[];
    appearance?: string;
    bio?: string;
    isHead?: number;
    isCore?: number;
    sort?: number;
  }
}

export namespace NovelRelation {
  // 查询参数
  export interface ReqQueryParams extends ReqPage {
    relationType?: string;
    memberId?: number;
    novelId?: number;
    familyId?: number;
    status?: string;
  }
  // 关系项（两端带显示名）
  export interface ResRelation {
    id: number;
    sourceType: string;
    novelId: number;
    sourceId: number;
    sourceName: string;
    sourceSub: string;
    targetType: string;
    targetId: number;
    targetName: string;
    targetSub: string;
    relationType: string;
    description: string;
    status: string;
    createdBy: string;
    createdAt: string;
  }
  // 新增参数
  export interface ReqSaveRelation {
    sourceType?: string;
    sourceId?: number;
    targetType?: string;
    targetId?: number;
    relationType?: string;
    description?: string;
    status?: string;
  }
  // 图谱节点
  export interface GraphNode {
    id: string;
    name: string;
    category: string;
    familyId: number;
    type: string;
    isHead: number;
    sub: string;
  }
  // 图谱边
  export interface GraphEdge {
    source: string;
    target: string;
    relationType: string;
    description: string;
  }
  // 图谱数据
  export interface ResGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
  }
}

// 小说模块
export namespace Novel {
  // 查询参数
  export interface ReqQueryParams extends ReqPage {
    keyword?: string;
    status?: string;
  }
  // 列表项（含家族数）
  export interface ResNovelList {
    id: number;
    name: string;
    alias: string;
    author: string;
    introduction: string;
    status: string;
    sort: number;
    familyCount: number;
    updatedAt: string;
  }
  // 新增/编辑参数
  export interface ReqSaveNovel {
    name?: string;
    alias?: string;
    author?: string;
    introduction?: string;
    status?: string;
    sort?: number;
  }
}
