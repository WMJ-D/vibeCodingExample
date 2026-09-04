-- =========================================================
-- 新增菜单：AI 对话（挂载在「智能体应用」目录下）
-- 对应前端页面：src/views/ai/chat.vue
-- 依赖接口：POST /api/v1/ai/chat/stream（需登录，无需额外权限标识）
-- 说明：
--   1. 本脚本幂等，可重复执行。
--   2. 菜单 ID 采用 500 段：目录 500、子菜单 510、520。
--   3. 角色分配与「知识库智能体」(510) 保持一致：admin、editor。
-- =========================================================

INSERT INTO `sys_menu`
  (`id`, `parent_id`, `menu_name`, `menu_type`, `path`, `component`, `route_name`, `permission`, `icon`, `sort_order`, `visible`, `status`, `keep_alive`)
VALUES
  (520, 500, 'AI 对话', 'C', '/agent/chat', 'views/ai/chat.vue', 'AiChat', 'agent:chat:list', 'ChatLineRound', 2, 1, 1, 1)
ON DUPLICATE KEY UPDATE
  `parent_id` = VALUES(`parent_id`), `menu_name` = VALUES(`menu_name`), `path` = VALUES(`path`),
  `component` = VALUES(`component`), `route_name` = VALUES(`route_name`), `permission` = VALUES(`permission`),
  `icon` = VALUES(`icon`), `sort_order` = VALUES(`sort_order`), `visible` = VALUES(`visible`),
  `status` = VALUES(`status`), `keep_alive` = VALUES(`keep_alive`), `deleted` = 0;

-- 管理员：拥有全部菜单
INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT r.`id`, m.`id`
FROM `sys_role` r
JOIN `sys_menu` m ON m.`id` = 520
WHERE r.`role_key` = 'admin' AND r.`deleted` = 0;

-- 编辑角色：与知识库智能体(510)的分配保持一致
INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`) VALUES
  (3, 520);
