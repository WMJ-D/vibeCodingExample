/**
 * ControlPanel.tsx
 * ----------------------------------------------
 * 左上角浮动控制面板：自动旋转 / 线框 / 透射模式 / 重置视角
 */
export interface ControlPanelProps {
  autoRotate: boolean
  wireframe: boolean
  transmissionMode: boolean
  onAutoRotateChange: (v: boolean) => void
  onWireframeChange: (v: boolean) => void
  onTransmissionChange: (v: boolean) => void
  onResetCamera: () => void
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="text-[13px] text-slate-200">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
          checked ? 'bg-amber-400' : 'bg-slate-600'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </label>
  )
}

export function ControlPanel(props: ControlPanelProps) {
  return (
    <div className="fixed top-4 left-4 z-10 w-60 rounded-xl bg-slate-900/85 backdrop-blur-md text-slate-100 shadow-2xl border border-slate-700/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/60">
        <h3 className="text-sm font-semibold tracking-wide">显示控制</h3>
      </div>

      <div className="px-4 py-3 space-y-3">
        <Toggle
          label="自动旋转"
          checked={props.autoRotate}
          onChange={props.onAutoRotateChange}
        />
        <Toggle
          label="线框模式"
          checked={props.wireframe}
          onChange={props.onWireframeChange}
        />
        <Toggle
          label="半透明材质"
          checked={props.transmissionMode}
          onChange={props.onTransmissionChange}
        />
      </div>

      <div className="px-4 py-2.5 border-t border-slate-700/60">
        <button
          type="button"
          onClick={props.onResetCamera}
          className="w-full py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600/70 text-[12px] text-slate-200 transition-colors"
        >
          重置视角
        </button>
      </div>
    </div>
  )
}