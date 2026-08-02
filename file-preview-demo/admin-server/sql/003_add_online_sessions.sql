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

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `menu_name`, `menu_type`, `path`, `component`, `route_name`, `permission`, `icon`, `sort_order`, `visible`, `status`, `keep_alive`)
VALUES
  (330, 300, '在线用户', 'C', '/log/online', 'views/log/OnlineUser.vue', 'OnlineUser', 'log:online:list', 'Connection', 3, 1, 1, 0)
ON DUPLICATE KEY UPDATE
  `parent_id` = VALUES(`parent_id`), `menu_name` = VALUES(`menu_name`), `path` = VALUES(`path`),
  `component` = VALUES(`component`), `route_name` = VALUES(`route_name`), `permission` = VALUES(`permission`),
  `icon` = VALUES(`icon`), `sort_order` = VALUES(`sort_order`), `visible` = VALUES(`visible`),
  `status` = VALUES(`status`), `keep_alive` = VALUES(`keep_alive`);

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `menu_name`, `menu_type`, `permission`, `sort_order`, `visible`, `status`, `keep_alive`)
VALUES
  (3301, 330, '强制下线', 'F', 'log:online:kick', 1, 1, 1, 0),
  (3302, 330, '清理会话', 'F', 'log:online:clean', 2, 1, 1, 0)
ON DUPLICATE KEY UPDATE
  `parent_id` = VALUES(`parent_id`), `menu_name` = VALUES(`menu_name`),
  `sort_order` = VALUES(`sort_order`), `visible` = VALUES(`visible`), `status` = VALUES(`status`);

INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT r.`id`, m.`id`
FROM `sys_role` r
JOIN `sys_menu` m ON m.`id` IN (300, 330, 3301, 3302)
WHERE r.`role_key` = 'admin' AND r.`deleted` = 0;
