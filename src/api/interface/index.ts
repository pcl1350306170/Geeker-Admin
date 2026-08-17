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

// 账号管理模块
export namespace Account {
  // 查询参数
  export interface ReqAccountParams extends ReqPage {
    username?: string;
    nickname?: string;
    status?: number | "";
  }
  // 账号信息
  export interface ResAccountList {
    id: number;
    username: string;
    nickname: string;
    avatar: string;
    status: number;
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
  }
}
