/**
 * InfoCard.tsx
 * ----------------------------------------------
 * 右下角展示参考图与重建进度信息
 */
export interface InfoCardProps {
  partsCount: number
}

export function InfoCard({ partsCount }: InfoCardProps) {
  return (
    <div className="fixed bottom-4 right-4 z-10 w-72 rounded-xl bg-slate-900/85 backdrop-blur-md text-slate-100 shadow-2xl border border-slate-700/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/60">
        <h3 className="text-sm font-semibold tracking-wide">模型信息</h3>
      </div>
      <div className="px-4 py-3 text-[12px] text-slate-300 space-y-1.5 leading-relaxed">
        <Row label="程序化部件数" value={`${partsCount}`} />
        <Row label="几何来源" value="LatheGeometry + TubeGeometry" />
        <Row label="材质" value="MeshPhysicalMaterial" />
        <Row label="IBL" value="drei Environment: apartment" />
        <Row label="控制器" value="OrbitControls" />
        <Row label="风格" value="对原图重建（卡通精度）" />
      </div>
      <div className="px-4 py-2.5 border-t border-slate-700/60 text-[11px] text-slate-500">
        💡 提示：关闭半透明材质可观察内部液体形状
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-amber-200 truncate" title={value}>
        {value}
      </span>
    </div>
  )
}