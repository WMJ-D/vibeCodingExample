-- =========================================================
-- 多子系统架构改造
-- 说明：
--   1. 本脚本幂等，可重复执行。
--   2. 新增子系统表 sys_app，前端通过请求头 X-App-Id 携带 APPID。
--   3. sys_menu 增加所属子系统字段 app_id（NULL 表示所有系统可见）。
--   4. 操作日志 / 登录日志 / 在线会话增加所属系统字段 app_id。
--   5. 角色管理页新增「子系统管理」tab，配套按钮权限挂在角色管理菜单(220)下。
-- =========================================================

SET @db_name = DATABASE();

-- =========================================================
-- 1. 子系统表
-- =========================================================
CREATE TABLE IF NOT EXISTS `sys_app` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '子系统ID',
  `app_id` VARCHAR(64) NOT NULL COMMENT '子系统标识（APPID，对应请求头 X-App-Id）',
  `app_name` VARCHAR(100) NOT NULL COMMENT '子系统名称',
  `base_url` VARCHAR(255) NULL DEFAULT NULL COMMENT '前端访问地址',
  `icon` VARCHAR(100) NULL DEFAULT NULL COMMENT '图标',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  `remark` VARCHAR(500) NULL DEFAULT NULL COMMENT '备注',
  `created_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_by` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '更新人ID',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '逻辑删除：0否，1是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sys_app_appid` (`app_id`),
  KEY `idx_sys_app_status_deleted` (`status`, `deleted`),
  CONSTRAINT `chk_sys_app_status` CHECK (`status` IN (0, 1)),
  CONSTRAINT `chk_sys_app_deleted` CHECK (`deleted` IN (0, 1))
) ENGINE=InnoDB COMMENT='子系统表';

-- =========================================================
-- 2. sys_menu 增加 app_id 列（NULL 为所有系统可见）
-- =========================================================
SET @has_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'sys_menu' AND COLUMN_NAME = 'app_id');
SET @sql = IF(@has_col = 0,
  'ALTER TABLE `sys_menu` ADD COLUMN `app_id` VARCHAR(64) NULL DEFAULT NULL COMMENT ''所属子系统ID，NULL为所有系统'' AFTER `parent_id`',
  'SELECT ''sys_menu.app_id already exists, skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =========================================================
-- 3. 日志与会话表增加 app_id 列
-- =========================================================
SET @has_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'sys_operation_log' AND COLUMN_NAME = 'app_id');
SET @sql = IF(@has_col = 0,
  'ALTER TABLE `sys_operation_log` ADD COLUMN `app_id` VARCHAR(64) NULL DEFAULT NULL COMMENT ''所属子系统ID'' AFTER `trace_id`',
  'SELECT ''sys_operation_log.app_id already exists, skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'sys_login_log' AND COLUMN_NAME = 'app_id');
SET @sql = IF(@has_col = 0,
  'ALTER TABLE `sys_login_log` ADD COLUMN `app_id` VARCHAR(64) NULL DEFAULT NULL COMMENT ''所属子系统ID'' AFTER `user_id`',
  'SELECT ''sys_login_log.app_id already exists, skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'sys_user_session' AND COLUMN_NAME = 'app_id');
SET @sql = IF(@has_col = 0,
  'ALTER TABLE `sys_user_session` ADD COLUMN `app_id` VARCHAR(64) NULL DEFAULT NULL COMMENT ''所属子系统ID'' AFTER `session_id`',
  'SELECT ''sys_user_session.app_id already exists, skip'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =========================================================
-- 4. 初始化子系统数据
-- =========================================================
INSERT INTO `sys_app` (`id`, `app_id`, `app_name`, `base_url`, `icon`, `sort_order`, `status`, `remark`)
VALUES
  (1, 'main', '后台管理系统', 'http://localhost:5173', 'Platform', 1, 1, '主系统，默认前端 APPID 为 main')
ON DUPLICATE KEY UPDATE
  `app_name` = VALUES(`app_name`), `base_url` = VALUES(`base_url`),
  `icon` = VALUES(`icon`), `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`), `remark` = VALUES(`remark`), `deleted` = 0;

-- =========================================================
-- 5. 子系统管理按钮权限（挂在角色管理菜单 220 下）
-- =========================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `menu_name`, `menu_type`, `permission`, `sort_order`, `visible`, `status`, `keep_alive`)
VALUES
  (2205, 220, '子系统查询', 'F', 'system:app:list', 5, 1, 1, 0),
  (2206, 220, '新增子系统', 'F', 'system:app:add', 6, 1, 1, 0),
  (2207, 220, '修改子系统', 'F', 'system:app:edit', 7, 1, 1, 0),
  (2208, 220, '删除子系统', 'F', 'system:app:delete', 8, 1, 1, 0)
ON DUPLICATE KEY UPDATE
  `parent_id` = VALUES(`parent_id`), `menu_name` = VALUES(`menu_name`),
  `sort_order` = VALUES(`sort_order`), `visible` = VALUES(`visible`), `status` = VALUES(`status`);

-- 管理员角色分配子系统管理权限
INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT r.`id`, m.`id`
FROM `sys_role` r
JOIN `sys_menu` m ON m.`id` IN (2205, 2206, 2207, 2208)
WHERE r.`role_key` = 'admin' AND r.`deleted` = 0;
