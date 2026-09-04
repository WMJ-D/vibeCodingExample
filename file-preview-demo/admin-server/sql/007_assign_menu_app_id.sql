-- =========================================================
-- 菜单数据所属系统赋值
-- 说明：
--   1. 本脚本幂等：只更新 app_id 为 NULL 的菜单，重复执行不会覆盖手工调整过的归属。
--   2. 当前唯一子系统为主系统 main（后台管理系统），存量菜单统一归属 main。
--   3. 归属后其他子系统登录将看不到这些菜单（仅 app_id IS NULL 的菜单对所有系统可见）。
--   4. 若某菜单需要所有子系统可见，可在菜单管理中把「所属系统」清空（存回 NULL）。
-- =========================================================

UPDATE `sys_menu`
SET `app_id` = 'main', `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `deleted` = 0
  AND `app_id` IS NULL;

-- 验证：统计赋值结果
SELECT `app_id`, COUNT(*) AS menu_count
FROM `sys_menu`
WHERE `deleted` = 0
GROUP BY `app_id`;
