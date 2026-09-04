-- file-preview-demo 后台管理系统数据库初始化脚本
-- 适用版本：MySQL 8.0+
-- 默认数据库：file_preview_demo
-- 字符集：utf8mb4
-- 说明：本脚本创建当前前端系统管理与日志管理所需表，并写入基础组织、角色、菜单和参数数据。

SET NAMES utf8mb4;
SET time_zone = '+08:00';

CREATE DATABASE IF NOT EXISTS `file_preview_demo`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `file_preview_demo`;

-- =========================================================
-- 1. 组织机构
-- =========================================================
CREATE TABLE IF NOT EXISTS `sys_org` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '组织ID',
  `parent_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '上级组织ID，顶级为NULL',
  `ancestors` VARCHAR(1000) NOT NULL DEFAULT '' COMMENT '祖级路径，如1,11',
  `org_name` VARCHAR(100) NOT NULL COMMENT '组织名称',
  `org_code` VARCHAR(64) NULL DEFAULT NULL COMMENT '组织编码',
  `leader` VARCHAR(64) NULL DEFAULT NULL COMMENT '负责人',
  `phone` VARCHAR(32) NULL DEFAULT NULL COMMENT '联系电话',
  `email` VARCHAR(128) NULL DEFAULT NULL COMMENT '联系邮箱',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  `created_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '更新人ID',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '逻辑删除：0否，1是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sys_org_code` (`org_code`),
  KEY `idx_sys_org_parent_sort` (`parent_id`, `sort_order`),
  KEY `idx_sys_org_name` (`org_name`),
  KEY `idx_sys_org_status_deleted` (`status`, `deleted`),
  CONSTRAINT `fk_sys_org_parent` FOREIGN KEY (`parent_id`) REFERENCES `sys_org` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_sys_org_status` CHECK (`status` IN (0, 1)),
  CONSTRAINT `chk_sys_org_deleted` CHECK (`deleted` IN (0, 1))
) ENGINE=InnoDB COMMENT='组织机构表';

-- =========================================================
-- 2. 角色
-- =========================================================
CREATE TABLE IF NOT EXISTS `sys_role` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `role_name` VARCHAR(64) NOT NULL COMMENT '角色名称',
  `role_key` VARCHAR(64) NOT NULL COMMENT '角色权限标识',
  `data_scope` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '数据范围：1全部，2自定义，3本组织，4本组织及下级，5仅本人',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  `remark` VARCHAR(500) NULL DEFAULT NULL COMMENT '备注',
  `created_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '更新人ID',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '逻辑删除：0否，1是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sys_role_name` (`role_name`),
  UNIQUE KEY `uk_sys_role_key` (`role_key`),
  KEY `idx_sys_role_status_sort` (`status`, `sort_order`),
  KEY `idx_sys_role_deleted` (`deleted`),
  CONSTRAINT `chk_sys_role_scope` CHECK (`data_scope` IN (1, 2, 3, 4, 5)),
  CONSTRAINT `chk_sys_role_status` CHECK (`status` IN (0, 1)),
  CONSTRAINT `chk_sys_role_deleted` CHECK (`deleted` IN (0, 1))
) ENGINE=InnoDB COMMENT='角色信息表';

-- =========================================================
-- 3. 用户
-- =========================================================
CREATE TABLE IF NOT EXISTS `sys_user` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `org_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '所属组织ID',
  `username` VARCHAR(64) NOT NULL COMMENT '登录用户名',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希，禁止存储明文',
  `nickname` VARCHAR(64) NOT NULL COMMENT '用户昵称',
  `phone` VARCHAR(32) NULL DEFAULT NULL COMMENT '手机号',
  `email` VARCHAR(128) NULL DEFAULT NULL COMMENT '邮箱',
  `avatar_url` VARCHAR(500) NULL DEFAULT NULL COMMENT '头像地址',
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  `last_login_ip` VARCHAR(64) NULL DEFAULT NULL COMMENT '最后登录IP',
  `last_login_at` DATETIME(3) NULL DEFAULT NULL COMMENT '最后登录时间',
  `password_updated_at` DATETIME(3) NULL DEFAULT NULL COMMENT '密码最后修改时间',
  `created_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '更新人ID',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '逻辑删除：0否，1是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sys_user_username` (`username`),
  UNIQUE KEY `uk_sys_user_phone` (`phone`),
  UNIQUE KEY `uk_sys_user_email` (`email`),
  KEY `idx_sys_user_org` (`org_id`),
  KEY `idx_sys_user_status_deleted` (`status`, `deleted`),
  KEY `idx_sys_user_created_at` (`created_at`),
  CONSTRAINT `fk_sys_user_org` FOREIGN KEY (`org_id`) REFERENCES `sys_org` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_sys_user_status` CHECK (`status` IN (0, 1)),
  CONSTRAINT `chk_sys_user_deleted` CHECK (`deleted` IN (0, 1))
) ENGINE=InnoDB COMMENT='用户信息表';

-- =========================================================
-- 4. 菜单与按钮权限
-- =========================================================
CREATE TABLE IF NOT EXISTS `sys_menu` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
  `parent_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '上级菜单ID，顶级为NULL',
  `menu_name` VARCHAR(100) NOT NULL COMMENT '菜单名称',
  `menu_type` CHAR(1) NOT NULL COMMENT '类型：M目录，C菜单，F按钮',
  `path` VARCHAR(255) NULL DEFAULT NULL COMMENT '前端路由地址',
  `component` VARCHAR(255) NULL DEFAULT NULL COMMENT '前端组件路径',
  `route_name` VARCHAR(100) NULL DEFAULT NULL COMMENT '前端路由名称',
  `permission` VARCHAR(128) NULL DEFAULT NULL COMMENT '权限标识，如system:user:add',
  `icon` VARCHAR(100) NULL DEFAULT NULL COMMENT '菜单图标',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `visible` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '是否显示：1显示，0隐藏',
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  `keep_alive` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '页面缓存：1缓存，0不缓存',
  `external_link` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '是否外链：1是，0否',
  `remark` VARCHAR(500) NULL DEFAULT NULL COMMENT '备注',
  `created_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '更新人ID',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '逻辑删除：0否，1是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sys_menu_permission` (`permission`),
  KEY `idx_sys_menu_parent_sort` (`parent_id`, `sort_order`),
  KEY `idx_sys_menu_type_status` (`menu_type`, `status`),
  KEY `idx_sys_menu_path` (`path`),
  KEY `idx_sys_menu_deleted` (`deleted`),
  CONSTRAINT `fk_sys_menu_parent` FOREIGN KEY (`parent_id`) REFERENCES `sys_menu` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_sys_menu_type` CHECK (`menu_type` IN ('M', 'C', 'F')),
  CONSTRAINT `chk_sys_menu_visible` CHECK (`visible` IN (0, 1)),
  CONSTRAINT `chk_sys_menu_status` CHECK (`status` IN (0, 1)),
  CONSTRAINT `chk_sys_menu_keep_alive` CHECK (`keep_alive` IN (0, 1)),
  CONSTRAINT `chk_sys_menu_external` CHECK (`external_link` IN (0, 1)),
  CONSTRAINT `chk_sys_menu_deleted` CHECK (`deleted` IN (0, 1))
) ENGINE=InnoDB COMMENT='菜单和按钮权限表';

-- =========================================================
-- 5. 用户角色关联
-- =========================================================
CREATE TABLE IF NOT EXISTS `sys_user_role` (
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`user_id`, `role_id`),
  KEY `idx_sys_user_role_role` (`role_id`),
  CONSTRAINT `fk_sys_user_role_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_sys_user_role_role` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户与角色关联表';

-- =========================================================
-- 6. 角色菜单关联
-- =========================================================
CREATE TABLE IF NOT EXISTS `sys_role_menu` (
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `menu_id` BIGINT UNSIGNED NOT NULL COMMENT '菜单ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`role_id`, `menu_id`),
  KEY `idx_sys_role_menu_menu` (`menu_id`),
  CONSTRAINT `fk_sys_role_menu_role` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_sys_role_menu_menu` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='角色与菜单权限关联表';

-- =========================================================
-- 7. 系统参数
-- =========================================================
CREATE TABLE IF NOT EXISTS `sys_param` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '参数ID',
  `param_name` VARCHAR(200) NOT NULL COMMENT '参数名称',
  `param_key` VARCHAR(200) NOT NULL COMMENT '参数键名',
  `param_value` TEXT NOT NULL COMMENT '参数键值',
  `param_type` CHAR(1) NOT NULL DEFAULT 'N' COMMENT '参数类型：Y系统内置，N自定义',
  `value_type` VARCHAR(20) NOT NULL DEFAULT 'string' COMMENT '值类型：string、number、boolean、json',
  `remark` VARCHAR(1000) NULL DEFAULT NULL COMMENT '备注',
  `created_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '更新人ID',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '逻辑删除：0否，1是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sys_param_key` (`param_key`),
  KEY `idx_sys_param_name` (`param_name`),
  KEY `idx_sys_param_type_deleted` (`param_type`, `deleted`),
  CONSTRAINT `chk_sys_param_type` CHECK (`param_type` IN ('Y', 'N')),
  CONSTRAINT `chk_sys_param_value_type` CHECK (`value_type` IN ('string', 'number', 'boolean', 'json')),
  CONSTRAINT `chk_sys_param_deleted` CHECK (`deleted` IN (0, 1))
) ENGINE=InnoDB COMMENT='系统参数表';

-- =========================================================
-- 8. 操作日志
-- =========================================================
CREATE TABLE IF NOT EXISTS `sys_operation_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '操作日志ID',
  `trace_id` VARCHAR(64) NULL DEFAULT NULL COMMENT '请求链路ID',
  `module` VARCHAR(100) NOT NULL COMMENT '操作模块',
  `operation_type` VARCHAR(32) NOT NULL COMMENT '操作类型：CREATE、UPDATE、DELETE、QUERY、EXPORT、IMPORT、OTHER',
  `description` VARCHAR(500) NOT NULL COMMENT '操作描述',
  `operator_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '操作人用户ID',
  `operator_username` VARCHAR(64) NULL DEFAULT NULL COMMENT '操作人用户名快照',
  `request_method` VARCHAR(16) NULL DEFAULT NULL COMMENT 'HTTP请求方法',
  `request_url` VARCHAR(500) NULL DEFAULT NULL COMMENT '请求地址',
  `request_params` JSON NULL COMMENT '请求参数，敏感字段须脱敏',
  `response_result` JSON NULL COMMENT '响应摘要，敏感字段须脱敏',
  `ip_address` VARCHAR(64) NULL DEFAULT NULL COMMENT '操作IP',
  `location` VARCHAR(255) NULL DEFAULT NULL COMMENT 'IP归属地',
  `user_agent` VARCHAR(1000) NULL DEFAULT NULL COMMENT 'User-Agent',
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态：1成功，0失败',
  `error_message` TEXT NULL COMMENT '异常信息',
  `duration_ms` INT UNSIGNED NULL DEFAULT NULL COMMENT '执行耗时，毫秒',
  `operated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '操作时间',
  `deleted` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '逻辑删除：0否，1是',
  PRIMARY KEY (`id`),
  KEY `idx_sys_oper_log_module_time` (`module`, `operated_at`),
  KEY `idx_sys_oper_log_operator_time` (`operator_username`, `operated_at`),
  KEY `idx_sys_oper_log_type_time` (`operation_type`, `operated_at`),
  KEY `idx_sys_oper_log_status_time` (`status`, `operated_at`),
  KEY `idx_sys_oper_log_trace` (`trace_id`),
  KEY `idx_sys_oper_log_deleted_time` (`deleted`, `operated_at`),
  CONSTRAINT `chk_sys_oper_log_status` CHECK (`status` IN (0, 1)),
  CONSTRAINT `chk_sys_oper_log_deleted` CHECK (`deleted` IN (0, 1))
) ENGINE=InnoDB COMMENT='系统操作日志表';

-- =========================================================
-- 9. 登录日志
-- =========================================================
CREATE TABLE IF NOT EXISTS `sys_login_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '登录日志ID',
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '用户ID，登录失败时可能为空',
  `username` VARCHAR(64) NOT NULL COMMENT '登录用户名快照',
  `ip_address` VARCHAR(64) NULL DEFAULT NULL COMMENT '登录IP',
  `location` VARCHAR(255) NULL DEFAULT NULL COMMENT '登录地点',
  `browser` VARCHAR(100) NULL DEFAULT NULL COMMENT '浏览器',
  `os` VARCHAR(100) NULL DEFAULT NULL COMMENT '操作系统',
  `user_agent` VARCHAR(1000) NULL DEFAULT NULL COMMENT 'User-Agent',
  `login_type` VARCHAR(32) NOT NULL DEFAULT 'PASSWORD' COMMENT '登录方式：PASSWORD、TOKEN、OTHER',
  `status` TINYINT UNSIGNED NOT NULL COMMENT '登录状态：1成功，0失败',
  `message` VARCHAR(500) NULL DEFAULT NULL COMMENT '提示信息',
  `login_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '登录时间',
  `deleted` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '逻辑删除：0否，1是',
  PRIMARY KEY (`id`),
  KEY `idx_sys_login_log_username_time` (`username`, `login_at`),
  KEY `idx_sys_login_log_ip_time` (`ip_address`, `login_at`),
  KEY `idx_sys_login_log_status_time` (`status`, `login_at`),
  KEY `idx_sys_login_log_user_time` (`user_id`, `login_at`),
  KEY `idx_sys_login_log_deleted_time` (`deleted`, `login_at`),
  CONSTRAINT `chk_sys_login_log_status` CHECK (`status` IN (0, 1)),
  CONSTRAINT `chk_sys_login_log_deleted` CHECK (`deleted` IN (0, 1))
) ENGINE=InnoDB COMMENT='系统登录日志表';

-- =========================================================
-- 10. 用户在线会话
-- =========================================================
CREATE TABLE IF NOT EXISTS `sys_user_session` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '会话主键',
  `session_id` CHAR(36) NOT NULL COMMENT '会话唯一标识，对应JWT的jti',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `username` VARCHAR(64) NOT NULL COMMENT '用户名快照',
  `ip_address` VARCHAR(64) NULL DEFAULT NULL COMMENT '登录IP',
  `location` VARCHAR(255) NULL DEFAULT NULL COMMENT 'IP归属地',
  `browser` VARCHAR(100) NULL DEFAULT NULL COMMENT '浏览器',
  `os` VARCHAR(100) NULL DEFAULT NULL COMMENT '操作系统',
  `user_agent` VARCHAR(1000) NULL DEFAULT NULL COMMENT 'User-Agent',
  `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE、LOGOUT、KICKED、EXPIRED',
  `login_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '登录时间',
  `last_active_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最后活跃时间',
  `expires_at` DATETIME(3) NOT NULL COMMENT '令牌过期时间',
  `logout_at` DATETIME(3) NULL DEFAULT NULL COMMENT '退出时间',
  `kicked_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '强退操作人ID',
  `kicked_at` DATETIME(3) NULL DEFAULT NULL COMMENT '强退时间',
  `kick_reason` VARCHAR(500) NULL DEFAULT NULL COMMENT '强退原因',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sys_user_session_sid` (`session_id`),
  KEY `idx_sys_user_session_user_status` (`user_id`, `status`),
  KEY `idx_sys_user_session_active` (`status`, `last_active_at`),
  KEY `idx_sys_user_session_expires` (`expires_at`),
  CONSTRAINT `fk_sys_user_session_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `chk_sys_user_session_status` CHECK (`status` IN ('ACTIVE', 'LOGOUT', 'KICKED', 'EXPIRED'))
) ENGINE=InnoDB COMMENT='用户在线会话表';

-- =========================================================
-- 11. 初始化组织数据
-- =========================================================
INSERT INTO `sys_org`
  (`id`, `parent_id`, `ancestors`, `org_name`, `org_code`, `leader`, `phone`, `sort_order`, `status`)
VALUES
  (1, NULL, '', '总公司', 'HEADQUARTERS', '张总', '13800000001', 1, 1)
ON DUPLICATE KEY UPDATE
  `org_name` = VALUES(`org_name`), `leader` = VALUES(`leader`), `phone` = VALUES(`phone`), `status` = VALUES(`status`);

INSERT INTO `sys_org`
  (`id`, `parent_id`, `ancestors`, `org_name`, `org_code`, `leader`, `phone`, `sort_order`, `status`)
VALUES
  (11, 1, '1', '技术部', 'TECH', '李工', '13800000011', 1, 1),
  (12, 1, '1', '产品部', 'PRODUCT', '刘产品', '13800000012', 2, 1),
  (13, 1, '1', '运营部', 'OPERATIONS', '孙运营', '13800000013', 3, 1),
  (14, 1, '1', '市场部', 'MARKETING', '周市场', '13800000014', 4, 0)
ON DUPLICATE KEY UPDATE
  `org_name` = VALUES(`org_name`), `leader` = VALUES(`leader`), `phone` = VALUES(`phone`), `status` = VALUES(`status`);

INSERT INTO `sys_org`
  (`id`, `parent_id`, `ancestors`, `org_name`, `org_code`, `leader`, `phone`, `sort_order`, `status`)
VALUES
  (111, 11, '1,11', '前端组', 'TECH_FRONTEND', '王前端', '13800000111', 1, 1),
  (112, 11, '1,11', '后端组', 'TECH_BACKEND', '赵后端', '13800000112', 2, 1)
ON DUPLICATE KEY UPDATE
  `org_name` = VALUES(`org_name`), `leader` = VALUES(`leader`), `phone` = VALUES(`phone`), `status` = VALUES(`status`);

-- =========================================================
-- 11. 初始化角色数据
-- =========================================================
INSERT INTO `sys_role`
  (`id`, `role_name`, `role_key`, `data_scope`, `sort_order`, `status`, `remark`)
VALUES
  (1, '超级管理员', 'admin', 1, 1, 1, '拥有系统全部权限'),
  (2, '普通用户', 'user', 5, 2, 1, '基础查看权限'),
  (3, '编辑', 'editor', 3, 3, 1, '内容编辑权限'),
  (4, '审核员', 'auditor', 3, 4, 0, '内容审核权限'),
  (5, '访客', 'guest', 5, 5, 1, '只读权限')
ON DUPLICATE KEY UPDATE
  `role_name` = VALUES(`role_name`), `data_scope` = VALUES(`data_scope`),
  `sort_order` = VALUES(`sort_order`), `status` = VALUES(`status`), `remark` = VALUES(`remark`);

-- =========================================================
-- 12. 初始化超级管理员用户
-- 默认账号：admin
-- 默认密码：123456
-- 密码格式：scrypt$<salt_hex>$<derived_key_hex>
-- 注意：重复执行时不会覆盖管理员已经修改过的密码。
-- =========================================================
INSERT INTO `sys_user`
  (`org_id`, `username`, `password_hash`, `nickname`, `phone`, `email`, `status`, `password_updated_at`, `deleted`)
VALUES
  (1, 'admin', 'scrypt$c1e9fc373a1fc692405aa9dc4657b9c7$75af9a2630dcc81f8f1ed6ff53f90130fb71e47327d35b8d1e75c60942bc2d2ab8e4a2f2629903f86db5047268436e655cb8c84849dbe7f6d80f30088c914f9f', '超级管理员', NULL, NULL, 1, CURRENT_TIMESTAMP(3), 0)
ON DUPLICATE KEY UPDATE
  `org_id` = VALUES(`org_id`),
  `nickname` = VALUES(`nickname`),
  `status` = VALUES(`status`),
  `deleted` = 0;

INSERT IGNORE INTO `sys_user_role` (`user_id`, `role_id`)
SELECT u.`id`, r.`id`
FROM `sys_user` u
JOIN `sys_role` r ON r.`role_key` = 'admin' AND r.`deleted` = 0
WHERE u.`username` = 'admin' AND u.`deleted` = 0;

-- =========================================================
-- 13. 初始化菜单数据
-- ID规则仅用于初始化：一级100段、二级110段、按钮1101段。
-- =========================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `menu_name`, `menu_type`, `path`, `component`, `route_name`, `permission`, `icon`, `sort_order`, `visible`, `status`, `keep_alive`)
VALUES
  (100, NULL, '首页', 'C', '/dashboard', 'views/dashboard/Dashboard.vue', 'Dashboard', NULL, 'HomeFilled', 1, 1, 1, 1),
  (101, NULL, '我的地图', 'C', '/my-map', 'views/MyMap.vue', 'MyMap', NULL, 'Location', 2, 1, 1, 1),
  (200, NULL, '系统管理', 'M', '/system', NULL, NULL, NULL, 'Setting', 3, 1, 1, 1),
  (300, NULL, '日志管理', 'M', '/log', NULL, NULL, NULL, 'Document', 4, 1, 1, 1),
  (400, NULL, '功能示例', 'M', '/demo', NULL, NULL, NULL, 'Monitor', 5, 1, 1, 1),
  (500, NULL, '智能体应用', 'M', '/agent', NULL, NULL, NULL, 'Cpu', 6, 1, 1, 1)
ON DUPLICATE KEY UPDATE
  `menu_name` = VALUES(`menu_name`), `path` = VALUES(`path`), `component` = VALUES(`component`),
  `route_name` = VALUES(`route_name`), `icon` = VALUES(`icon`), `sort_order` = VALUES(`sort_order`),
  `visible` = VALUES(`visible`), `status` = VALUES(`status`), `keep_alive` = VALUES(`keep_alive`);

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `menu_name`, `menu_type`, `path`, `component`, `route_name`, `permission`, `icon`, `sort_order`, `visible`, `status`, `keep_alive`)
VALUES
  (210, 200, '用户管理', 'C', '/system/user', 'views/system/UserManage.vue', 'UserManage', 'system:user:list', 'User', 1, 1, 1, 1),
  (220, 200, '角色管理', 'C', '/system/role', 'views/system/RoleManage.vue', 'RoleManage', 'system:role:list', 'UserFilled', 2, 1, 1, 1),
  (230, 200, '菜单管理', 'C', '/system/menu', 'views/system/MenuManage.vue', 'MenuManage', 'system:menu:list', 'Menu', 3, 1, 1, 1),
  (240, 200, '组织管理', 'C', '/system/org', 'views/system/OrgManage.vue', 'OrgManage', 'system:org:list', 'OfficeBuilding', 4, 1, 1, 1),
  (250, 200, '参数管理', 'C', '/system/param', 'views/system/ParamManage.vue', 'ParamManage', 'system:param:list', 'Operation', 5, 1, 1, 1),
  (310, 300, '操作日志', 'C', '/log/operation', 'views/log/OperationLog.vue', 'OperationLog', 'log:operation:list', 'Document', 1, 1, 1, 1),
  (320, 300, '登录日志', 'C', '/log/login', 'views/log/LoginLog.vue', 'LoginLog', 'log:login:list', 'Key', 2, 1, 1, 1),
  (410, 400, '文件预览', 'C', '/demo/file-preview', 'components/FilePreview.vue', 'FilePreview', NULL, 'Picture', 1, 1, 1, 1),
  (420, 400, '列表示例', 'C', '/demo/list-page', 'components/ListPage.vue', 'ListPage', NULL, 'List', 2, 1, 1, 1),
  (430, 400, '数据大屏', 'C', '/demo/chart-dashboard', 'components/ChartDashboard.vue', 'ChartDashboard', NULL, 'PieChart', 3, 1, 1, 1),
  (440, 400, '局域网互传', 'C', '/demo/lan-transfer', 'views/demo/LanTransfer.vue', 'LanTransfer', NULL, 'Connection', 4, 1, 1, 1),
  (450, 400, '局域网视频', 'C', '/demo/lan-video', 'views/demo/LanVideo.vue', 'LanVideo', NULL, 'VideoCamera', 5, 1, 1, 1),
  (460, 400, '我的 Cesium', 'C', '/demo/my-cesium', 'views/demo/MyCesium.vue', 'MyCesium', NULL, 'Location', 6, 1, 1, 0),
  (470, 400, '愤怒的小鸟', 'C', '/demo/angry-birds', 'views/demo/AngryBirds.vue', 'AngryBirds', NULL, 'Promotion', 7, 1, 1, 0),
  (480, 400, 'VR演示', 'C', '/demo/vr-demo', 'views/demo/VRDemo.vue', 'VRDemo', NULL, 'VideoCamera', 8, 1, 1, 0),
  (490, 400, '我的世界', 'C', '/demo/minecraft', 'views/demo/MineCraft.vue', 'MineCraft', NULL, 'Box', 9, 1, 1, 0),
  (510, 500, '知识库智能体', 'C', '/agent/knowledge', 'views/agent/KnowledgeAgent.vue', 'KnowledgeAgent', NULL, 'ChatDotRound', 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE
  `parent_id` = VALUES(`parent_id`), `menu_name` = VALUES(`menu_name`), `path` = VALUES(`path`),
  `component` = VALUES(`component`), `route_name` = VALUES(`route_name`),
  `permission` = VALUES(`permission`), `icon` = VALUES(`icon`), `sort_order` = VALUES(`sort_order`),
  `visible` = VALUES(`visible`), `status` = VALUES(`status`), `keep_alive` = VALUES(`keep_alive`);

-- 系统管理按钮权限
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `menu_name`, `menu_type`, `permission`, `sort_order`, `visible`, `status`, `keep_alive`)
VALUES
  (2101, 210, '新增用户', 'F', 'system:user:add', 1, 1, 1, 0),
  (2102, 210, '修改用户', 'F', 'system:user:edit', 2, 1, 1, 0),
  (2103, 210, '删除用户', 'F', 'system:user:delete', 3, 1, 1, 0),
  (2104, 210, '重置密码', 'F', 'system:user:reset-password', 4, 1, 1, 0),
  (2105, 210, '修改状态', 'F', 'system:user:change-status', 5, 1, 1, 0),
  (2201, 220, '新增角色', 'F', 'system:role:add', 1, 1, 1, 0),
  (2202, 220, '修改角色', 'F', 'system:role:edit', 2, 1, 1, 0),
  (2203, 220, '删除角色', 'F', 'system:role:delete', 3, 1, 1, 0),
  (2204, 220, '分配权限', 'F', 'system:role:permission', 4, 1, 1, 0),
  (2301, 230, '新增菜单', 'F', 'system:menu:add', 1, 1, 1, 0),
  (2302, 230, '修改菜单', 'F', 'system:menu:edit', 2, 1, 1, 0),
  (2303, 230, '删除菜单', 'F', 'system:menu:delete', 3, 1, 1, 0),
  (2401, 240, '新增组织', 'F', 'system:org:add', 1, 1, 1, 0),
  (2402, 240, '修改组织', 'F', 'system:org:edit', 2, 1, 1, 0),
  (2403, 240, '删除组织', 'F', 'system:org:delete', 3, 1, 1, 0),
  (2501, 250, '新增参数', 'F', 'system:param:add', 1, 1, 1, 0),
  (2502, 250, '修改参数', 'F', 'system:param:edit', 2, 1, 1, 0),
  (2503, 250, '删除参数', 'F', 'system:param:delete', 3, 1, 1, 0),
  (3101, 310, '删除操作日志', 'F', 'log:operation:delete', 1, 1, 1, 0),
  (3102, 310, '导出操作日志', 'F', 'log:operation:export', 2, 1, 1, 0),
  (3201, 320, '删除登录日志', 'F', 'log:login:delete', 1, 1, 1, 0),
  (3202, 320, '导出登录日志', 'F', 'log:login:export', 2, 1, 1, 0)
ON DUPLICATE KEY UPDATE
  `parent_id` = VALUES(`parent_id`), `menu_name` = VALUES(`menu_name`),
  `sort_order` = VALUES(`sort_order`), `visible` = VALUES(`visible`), `status` = VALUES(`status`);

-- =========================================================
-- 14. 初始化角色菜单关系
-- 超级管理员拥有全部菜单与按钮权限。
-- =========================================================
INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT 1, `id` FROM `sys_menu` WHERE `deleted` = 0;

-- 普通用户：仅基础页面查看权限
INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`) VALUES
  (2, 100), (2, 101), (2, 400), (2, 410), (2, 420), (2, 430),
  (3, 100), (3, 101), (3, 400), (3, 410), (3, 420), (3, 430), (3, 500), (3, 510),
  (5, 100), (5, 101);

-- =========================================================
-- 15. 初始化系统参数
-- =========================================================
INSERT INTO `sys_param`
  (`id`, `param_name`, `param_key`, `param_value`, `param_type`, `value_type`, `remark`)
VALUES
  (1, '主框架页-默认皮肤样式名称', 'sys.index.skinName', 'skin-blue', 'Y', 'string', '蓝色 skin-blue、绿色 skin-green、紫色 skin-purple、红色 skin-red、黄色 skin-yellow'),
  (2, '用户管理-账号初始密码', 'sys.user.initPassword', '123456', 'Y', 'string', '仅作为新用户临时密码，后端保存前必须哈希，首次登录应强制修改'),
  (3, '主框架页-侧边栏主题', 'sys.index.sideTheme', 'theme-dark', 'Y', 'string', '深色主题 theme-dark，浅色主题 theme-light'),
  (4, '账号自助-是否开启用户注册功能', 'sys.account.registerUser', 'false', 'Y', 'boolean', '是否开启注册用户功能'),
  (5, '用户登录-验证码开关', 'sys.login.captchaEnabled', 'true', 'Y', 'boolean', '是否开启验证码功能'),
  (6, '用户登录-黑名单开关', 'sys.login.blacklistEnabled', 'false', 'Y', 'boolean', '是否开启登录黑名单校验'),
  (7, '文件上传-最大大小限制', 'sys.upload.maxSize', '50', 'N', 'number', '单位 MB'),
  (8, '文件上传-允许的文件类型', 'sys.upload.allowTypes', 'jpg,png,pdf,doc,xlsx', 'N', 'string', '允许上传的文件后缀，逗号分隔'),
  (9, '系统通知-邮件发送开关', 'sys.notify.emailEnabled', 'true', 'N', 'boolean', '是否启用邮件通知'),
  (10, '系统通知-短信发送开关', 'sys.notify.smsEnabled', 'false', 'N', 'boolean', '是否启用短信通知'),
  (11, '数据导出-单次最大条数', 'sys.export.maxRows', '10000', 'N', 'number', '单次导出最大行数限制'),
  (12, '会话超时时间', 'sys.session.timeout', '30', 'Y', 'number', '单位分钟')
ON DUPLICATE KEY UPDATE
  `param_name` = VALUES(`param_name`), `param_value` = VALUES(`param_value`),
  `param_type` = VALUES(`param_type`), `value_type` = VALUES(`value_type`), `remark` = VALUES(`remark`);

-- =========================================================
-- 16. 执行后验证
-- 默认管理员：admin / 123456。首次登录后必须修改默认密码。
-- =========================================================
SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;

SELECT 'sys_org' AS table_name, COUNT(*) AS row_count FROM `sys_org`
UNION ALL SELECT 'sys_role', COUNT(*) FROM `sys_role`
UNION ALL SELECT 'sys_user', COUNT(*) FROM `sys_user`
UNION ALL SELECT 'sys_user_role', COUNT(*) FROM `sys_user_role`
UNION ALL SELECT 'sys_menu', COUNT(*) FROM `sys_menu`
UNION ALL SELECT 'sys_role_menu', COUNT(*) FROM `sys_role_menu`
UNION ALL SELECT 'sys_param', COUNT(*) FROM `sys_param`;

SELECT
  u.`id`, u.`username`, u.`nickname`, u.`status`, o.`org_name`,
  GROUP_CONCAT(r.`role_key` ORDER BY r.`id` SEPARATOR ',') AS `role_keys`
FROM `sys_user` u
LEFT JOIN `sys_org` o ON o.`id` = u.`org_id`
LEFT JOIN `sys_user_role` ur ON ur.`user_id` = u.`id`
LEFT JOIN `sys_role` r ON r.`id` = ur.`role_id`
WHERE u.`username` = 'admin' AND u.`deleted` = 0
GROUP BY u.`id`, u.`username`, u.`nickname`, u.`status`, o.`org_name`;
