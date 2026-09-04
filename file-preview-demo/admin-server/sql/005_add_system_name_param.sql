INSERT INTO `sys_param`
  (`param_name`, `param_key`, `param_value`, `param_type`, `value_type`, `remark`)
VALUES
  ('系统名称', 'sys.index.name', '后台管理', 'Y', 'string', '后台侧边栏与页面标题显示名称')
ON DUPLICATE KEY UPDATE
  `param_name` = VALUES(`param_name`),
  `param_type` = VALUES(`param_type`),
  `value_type` = VALUES(`value_type`),
  `remark` = VALUES(`remark`),
  `deleted` = 0;
