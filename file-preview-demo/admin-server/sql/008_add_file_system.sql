-- =========================================================
-- 文件系统模块
-- 说明：
--   1. 本脚本幂等，可重复执行。
--   2. 文件二进制存储在服务端 app.file.storage-path 指定目录，数据库仅保存元数据与相对存储路径。
--   3. app_id 记录文件所属子系统；NULL 表示公共文件。
--   4. 菜单挂在功能示例目录 400 下，权限按钮挂在文件系统菜单 411 下。
-- =========================================================

CREATE TABLE IF NOT EXISTS `sys_file` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '文件ID',
  `app_id` VARCHAR(64) NULL DEFAULT NULL COMMENT '所属子系统APPID，NULL为公共文件',
  `original_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `stored_name` VARCHAR(120) NOT NULL COMMENT '服务端存储文件名',
  `storage_path` VARCHAR(500) NOT NULL COMMENT '相对存储路径',
  `content_type` VARCHAR(255) NULL DEFAULT NULL COMMENT 'MIME类型',
  `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件大小，字节',
  `file_hash` CHAR(64) NULL DEFAULT NULL COMMENT 'SHA-256摘要',
  `uploader_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '上传人ID',
  `uploader_username` VARCHAR(64) NULL DEFAULT NULL COMMENT '上传人用户名快照',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '上传时间',
  `deleted` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '逻辑删除：0否，1是',
  PRIMARY KEY (`id`),
  KEY `idx_sys_file_app_created` (`app_id`, `created_at`),
  KEY `idx_sys_file_name` (`original_name`),
  KEY `idx_sys_file_hash` (`file_hash`),
  KEY `idx_sys_file_deleted_created` (`deleted`, `created_at`),
  CONSTRAINT `chk_sys_file_deleted` CHECK (`deleted` IN (0, 1))
) ENGINE=InnoDB COMMENT='文件元数据表';

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `app_id`, `menu_name`, `menu_type`, `path`, `component`, `route_name`, `permission`, `icon`, `sort_order`, `visible`, `status`, `keep_alive`)
VALUES
  (411, 400, 'main', '文件系统', 'C', '/demo/file-system', 'views/system/FileSystem.vue', 'FileSystem', 'system:file:list', 'FolderOpened', 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE
  `parent_id` = VALUES(`parent_id`), `app_id` = VALUES(`app_id`), `menu_name` = VALUES(`menu_name`), `path` = VALUES(`path`),
  `component` = VALUES(`component`), `route_name` = VALUES(`route_name`), `permission` = VALUES(`permission`),
  `icon` = VALUES(`icon`), `sort_order` = VALUES(`sort_order`), `visible` = VALUES(`visible`),
  `status` = VALUES(`status`), `keep_alive` = VALUES(`keep_alive`), `deleted` = 0;

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `app_id`, `menu_name`, `menu_type`, `permission`, `sort_order`, `visible`, `status`, `keep_alive`)
VALUES
  (4111, 411, 'main', '上传文件', 'F', 'system:file:upload', 1, 1, 1, 0),
  (4112, 411, 'main', '删除文件', 'F', 'system:file:delete', 2, 1, 1, 0),
  (4113, 411, 'main', '下载文件', 'F', 'system:file:download', 3, 1, 1, 0)
ON DUPLICATE KEY UPDATE
  `parent_id` = VALUES(`parent_id`), `app_id` = VALUES(`app_id`), `menu_name` = VALUES(`menu_name`),
  `sort_order` = VALUES(`sort_order`), `visible` = VALUES(`visible`), `status` = VALUES(`status`);

INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT r.`id`, m.`id`
FROM `sys_role` r
JOIN `sys_menu` m ON m.`id` IN (411, 4111, 4112, 4113)
WHERE r.`role_key` = 'admin' AND r.`deleted` = 0;
