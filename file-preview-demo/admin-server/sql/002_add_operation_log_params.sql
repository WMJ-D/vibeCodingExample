-- =========================================================
-- 迁移：为系统操作日志表增加「请求参数」与「响应结果」字段
-- =========================================================
-- 说明：
--   1. 本脚本幂等，可重复执行，不会因列已存在而报错。
--   2. 仅当列缺失时才执行 ALTER，已是最新结构的库可直接跳过。
--   3. request_params 记录请求入参（敏感字段已在写入前脱敏）。
--   4. response_result 记录接口响应摘要/响应体（敏感字段须脱敏）。
--
-- 执行方式（示例）：
--   mysql -h<host> -P<port> -u<user> -p<password> <db_name> < sql/002_add_operation_log_params.sql
-- =========================================================

SET @db_name = DATABASE();
SET @tbl_name = 'sys_operation_log';

-- 新增：请求参数
SET @has_request_params = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @tbl_name AND COLUMN_NAME = 'request_params'
);

SET @sql_request_params = IF(
  @has_request_params = 0,
  'ALTER TABLE `sys_operation_log` ADD COLUMN `request_params` JSON NULL COMMENT ''请求参数，敏感字段须脱敏'' AFTER `request_url`',
  'SELECT ''column request_params already exists, skip'' AS info'
);
PREPARE stmt FROM @sql_request_params;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 新增：响应结果
SET @has_response_result = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @tbl_name AND COLUMN_NAME = 'response_result'
);

SET @sql_response_result = IF(
  @has_response_result = 0,
  'ALTER TABLE `sys_operation_log` ADD COLUMN `response_result` JSON NULL COMMENT ''响应摘要/响应体，敏感字段须脱敏'' AFTER `request_params`',
  'SELECT ''column response_result already exists, skip'' AS info'
);
PREPARE stmt FROM @sql_response_result;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
