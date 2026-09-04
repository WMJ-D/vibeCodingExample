import { Router } from 'express'
import { getDb } from '../db/index.js'
import { authenticate } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { ok } from '../utils/response.js'

const router = Router()
router.use(authenticate)

router.get('/statistics', asyncHandler(async (_req, res) => {
  const [rows] = await getDb().query(`
    SELECT
      (SELECT COUNT(*) FROM sys_user WHERE deleted=0) AS user_count,
      (SELECT COUNT(*) FROM sys_role WHERE deleted=0) AS role_count,
      (SELECT COUNT(*) FROM sys_menu WHERE deleted=0 AND menu_type='C') AS menu_count,
      (
        SELECT COUNT(DISTINCT user_id)
        FROM sys_login_log
        WHERE deleted=0
          AND status=1
          AND user_id IS NOT NULL
          AND login_at >= CURRENT_DATE()
          AND login_at < CURRENT_DATE() + INTERVAL 1 DAY
      ) AS today_visit_count
  `)

  const statistics = rows[0] || {}
  ok(res, {
    userCount: Number(statistics.user_count || 0),
    roleCount: Number(statistics.role_count || 0),
    menuCount: Number(statistics.menu_count || 0),
    todayVisitCount: Number(statistics.today_visit_count || 0),
  })
}))

export default router
