# -*- coding: utf-8 -*-
"""admin-server 端到端联调验证脚本：登录 -> 鉴权 -> 各模块 CRUD。"""
import json
import sys
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8788/api/v1"
results = []


def req(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {}


def check(name, cond, detail=""):
    results.append((name, cond, detail))
    print(("[PASS] " if cond else "[FAIL] ") + name + (" | " + str(detail)[:120] if detail else ""))


# 1. 健康检查（无鉴权，挂在根路径）
try:
    with urllib.request.urlopen("http://127.0.0.1:8788/health", timeout=10) as resp:
        s, b = resp.status, json.loads(resp.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    s, b = e.code, {}
check("健康检查", s == 200 and b.get("data", {}).get("status") == "UP", "HTTP %s" % s)

# 2. 错误密码登录应被拒绝
s, b = req("POST", "/auth/login", {"username": "admin", "password": "wrong-pass"})
check("错误密码被拒绝", s in (400, 401), "HTTP %s" % s)

# 3. 正确登录
s, b = req("POST", "/auth/login", {"username": "admin", "password": "123456"})
token = b.get("data", {}).get("token")
check("管理员登录", s == 200 and bool(token), "HTTP %s" % s)
if not token:
    print(json.dumps(results, ensure_ascii=False))
    sys.exit(1)

# 4. 当前用户与菜单
s, b = req("GET", "/auth/me", token=token)
check("获取当前用户", s == 200 and b.get("data", {}).get("username") == "admin", "HTTP %s" % s)
s, b = req("GET", "/auth/menus", token=token)
check("获取用户菜单", s == 200 and isinstance(b.get("data"), (list, dict)), "HTTP %s" % s)

# 5. 无 token 应 401
s, b = req("GET", "/system/users")
check("无token访问被拒绝", s == 401, "HTTP %s" % s)

# 6. 各模块列表查询
for name, path in [
    ("用户列表", "/system/users?pageNum=1&pageSize=10"),
    ("角色列表", "/system/roles?pageNum=1&pageSize=10"),
    ("菜单列表", "/system/menus"),
    ("组织树", "/system/orgs"),
    ("参数列表", "/system/params?pageNum=1&pageSize=10"),
    ("操作日志", "/logs/operation?pageNum=1&pageSize=10"),
    ("登录日志", "/logs/login?pageNum=1&pageSize=10"),
]:
    s, b = req("GET", path, token=token)
    check(name, s == 200 and b.get("code") == 0, "HTTP %s" % s)

# 7. 用户 CRUD 全流程（创建->修改->删除）
import time
suffix = str(int(time.time()))[-8:]
tmp_username = "e2e_" + suffix
tmp_param_key = "e2e.test." + suffix
s, b = req("POST", "/system/users", {
    "username": tmp_username, "password": "Test@123456",
    "nickname": "E2E临时用户", "status": 1, "roleIds": []
}, token=token)
uid = b.get("data", {}).get("id")
check("创建用户", s in (200, 201) and uid, "HTTP %s id=%s" % (s, uid))

if uid:
    s, b = req("PUT", "/system/users/%s" % uid, {
        "username": tmp_username, "nickname": "E2E已修改",
        "status": 1, "roleIds": []
    }, token=token)
    check("修改用户", s == 200 and b.get("code") == 0, "HTTP %s" % s)

    s, b = req("DELETE", "/system/users/%s" % uid, token=token)
    check("删除用户", s == 200 and b.get("code") == 0, "HTTP %s" % s)

    s, b = req("GET", "/system/users?username=" + tmp_username, token=token)
    rows = b.get("data", {}).get("list") or b.get("data", {}).get("rows") or []
    check("删除后查无此用户", s == 200 and len(rows) == 0, "HTTP %s rows=%d" % (s, len(rows)))

# 8. 参数 CRUD 全流程
s, b = req("POST", "/system/params", {
    "paramName": "E2E测试参数", "paramKey": tmp_param_key, "paramValue": "hello",
    "paramType": "N", "valueType": "string"
}, token=token)
pid = b.get("data", {}).get("id")
check("创建参数", s in (200, 201) and pid, "HTTP %s id=%s" % (s, pid))

if pid:
    s, b = req("PUT", "/system/params/%s" % pid, {
        "paramName": "E2E测试参数", "paramKey": tmp_param_key, "paramValue": "world",
        "paramType": "N", "valueType": "string"
    }, token=token)
    check("修改参数", s == 200 and b.get("code") == 0, "HTTP %s" % s)
    s, b = req("GET", "/system/params?paramKey=" + tmp_param_key, token=token)
    rows = b.get("data", {}).get("list") or []
    val = rows[0].get("paramValue") if rows else None
    check("参数修改已生效", s == 200 and val == "world", "HTTP %s value=%s" % (s, val))
    s, b = req("DELETE", "/system/params/%s" % pid, token=token)
    check("删除参数", s == 200 and b.get("code") == 0, "HTTP %s" % s)

passed = sum(1 for _, c, _ in results if c)
print("\n==== %d/%d 项通过 ====" % (passed, len(results)))
sys.exit(0 if passed == len(results) else 1)
