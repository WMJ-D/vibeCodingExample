/**
 * useExtensionDownload.js
 * Chrome 扩展打包下载 composable
 * - 从 public 目录拉取扩展文件
 * - 纯原生 ZIP 生成（无第三方依赖）
 */
import { ref } from 'vue'

/** 扩展文件清单（相对于 public/chrome-extension/） */
const EXTENSION_FILES = ['manifest.json', 'background.js', 'content.js', 'popup.html', 'popup.js']

export function useExtensionDownload() {
  const downloading = ref(false)

  /** 下载 Chrome 扩展 ZIP 包 */
  async function downloadExtension() {
    downloading.value = true
    try {
      const entries = await Promise.all(
        EXTENSION_FILES.map(async (name) => {
          const res = await fetch(`/chrome-extension/${name}`)
          const content = await res.text()
          return { name, content }
        })
      )
      const zipBlob = createZip(entries)
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'bookmarks-extension.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('扩展下载失败:', e)
    } finally {
      downloading.value = false
    }
  }

  return { downloading, downloadExtension }
}

/* ========== ZIP 生成工具（纯原生，无压缩） ========== */

/**
 * 构建 ZIP 二进制 Blob
 * @param {Array<{name: string, content: string}>} files
 * @returns {Blob}
 */
function createZip(files) {
  const encoder = new TextEncoder()
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const contentBytes = encoder.encode(file.content)
    const crc = crc32(contentBytes)

    // 本地文件头（30 字节 + 文件名）
    const local = new ArrayBuffer(30 + nameBytes.length)
    const lv = new DataView(local)
    lv.setUint32(0, 0x04034b50, true)               // 签名
    lv.setUint16(4, 20, true)                        // 版本
    lv.setUint16(8, 0, true)                         // 压缩方式：存储
    lv.setUint32(14, crc, true)                      // CRC-32
    lv.setUint32(18, contentBytes.length, true)      // 压缩后大小
    lv.setUint32(22, contentBytes.length, true)      // 原始大小
    lv.setUint16(26, nameBytes.length, true)         // 文件名长度
    new Uint8Array(local).set(nameBytes, 30)
    localParts.push(local, contentBytes)

    // 中央目录头（46 字节 + 文件名）
    const central = new ArrayBuffer(46 + nameBytes.length)
    const cv = new DataView(central)
    cv.setUint32(0, 0x02014b50, true)                // 签名
    cv.setUint16(4, 20, true)                        // 版本
    cv.setUint16(6, 20, true)                        // 最低版本
    cv.setUint16(12, 0, true)                        // 压缩方式
    cv.setUint32(16, crc, true)                      // CRC-32
    cv.setUint32(20, contentBytes.length, true)      // 压缩后大小
    cv.setUint32(24, contentBytes.length, true)      // 原始大小
    cv.setUint16(28, nameBytes.length, true)         // 文件名长度
    cv.setUint32(42, offset, true)                   // 本地头偏移
    new Uint8Array(central).set(nameBytes, 46)
    centralParts.push(central)

    offset += 30 + nameBytes.length + contentBytes.length
  }

  // 中央目录总大小
  const centralDirOffset = offset
  let centralDirSize = 0
  for (const c of centralParts) {
    centralDirSize += c.byteLength
  }

  // EOCD 记录（22 字节）
  const eocd = new ArrayBuffer(22)
  const ev = new DataView(eocd)
  ev.setUint32(0, 0x06054b50, true)                  // 签名
  ev.setUint16(8, files.length, true)                // 条目数
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralDirSize, true)             // 中央目录大小
  ev.setUint32(16, centralDirOffset, true)           // 中央目录偏移

  return new Blob([...localParts, ...centralParts, eocd], { type: 'application/zip' })
}

/** CRC-32 校验 */
function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}
