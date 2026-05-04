import { C } from './theme';

export function AppShell({ children }) {
  return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',background:'#060908' }}>
      <div style={{ position:'relative',width:'100%',maxWidth:430,height:'100%',display:'flex',flexDirection:'column',background:C.bg,overflow:'hidden' }}>
        <div style={{ position:'absolute',top:-80,left:'50%',transform:'translateX(-50%)',width:320,height:240,background:'radial-gradient(ellipse, rgba(0,232,122,0.14) 0%, transparent 70%)',pointerEvents:'none',zIndex:0 }} />
        <div style={{ position:'relative',zIndex:1,flex:1,display:'flex',flexDirection:'column',minHeight:0 }}>{children}</div>
      </div>
    </div>
  );
}

export function ProgressBar({ step, total }) {
  const pct = Math.round((step/total)*100);
  return (
    <div style={{ padding:'12px 24px 0',flexShrink:0 }}>
      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:7 }}>
        <span style={{ fontSize:11,color:C.muted,letterSpacing:'0.07em',fontWeight:500 }}>STEP {step} OF {total}</span>
        <span style={{ fontSize:11,color:C.accent,fontWeight:700 }}>{pct}%</span>
      </div>
      <div style={{ height:2,background:C.border,borderRadius:2,overflow:'hidden' }}>
        <div style={{ height:'100%',width:`${pct}%`,background:`linear-gradient(90deg, ${C.accentMid}, ${C.accent})`,borderRadius:2,transition:'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  );
}

export function SelectCard({ selected, onClick, children }) {
  return (
    <button onClick={onClick} style={{ width:'100%',textAlign:'left',cursor:'pointer',background:selected?C.accentLow:C.card,border:`1.5px solid ${selected?C.accent:C.border}`,borderRadius:14,padding:'12px 14px',transition:'border-color 0.15s, background 0.15s',display:'flex',alignItems:'center',gap:12,position:'relative',WebkitTapHighlightColor:'transparent' }}>
      {selected && <span style={{ position:'absolute',top:10,right:12,fontSize:12,color:C.accent,fontWeight:700,animation:'tickIn 0.18s ease' }}>✓</span>}
      {children}
    </button>
  );
}

export function PrimaryBtn({ onClick, disabled, children, loading }) {
  return (
    <button onClick={disabled||loading?undefined:onClick} style={{ width:'100%',padding:'15px',border:'none',borderRadius:14,fontSize:15,fontWeight:700,fontFamily:'Syne, sans-serif',letterSpacing:'0.02em',cursor:disabled||loading?'default':'pointer',background:disabled||loading?C.border:C.accent,color:disabled||loading?C.muted:'#051008',transition:'background 0.2s, color 0.2s',WebkitTapHighlightColor:'transparent' }}>
      {loading?'Loading…':children}
    </button>
  );
}

export function GhostBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width:'100%',padding:'13px',border:`1px solid ${C.border}`,borderRadius:14,fontSize:14,fontWeight:500,cursor:'pointer',background:'none',color:C.muted,fontFamily:'DM Sans, sans-serif',WebkitTapHighlightColor:'transparent' }}>
      {children}
    </button>
  );
}

export function Spinner({ size=40 }) {
  return <div style={{ width:size,height:size,borderRadius:'50%',border:`2.5px solid ${C.border}`,borderTopColor:C.accent,animation:'spin 0.85s linear infinite',flexShrink:0 }} />;
}

export function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'15px' }}>
      <div style={{ fontSize:10,color:C.muted,letterSpacing:'0.08em',marginBottom:6,fontWeight:600 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize:24,fontWeight:800,color:color||C.text,lineHeight:1,fontFamily:'Syne, sans-serif' }}>{value}</div>
      {sub && <div style={{ fontSize:11,color:color||C.muted,marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export function Pill({ label, color, bg }) {
  return <span style={{ fontSize:10,fontWeight:700,letterSpacing:'0.07em',color,background:bg,padding:'3px 9px',borderRadius:20,whiteSpace:'nowrap',flexShrink:0 }}>{label.toUpperCase()}</span>;
}

export function BackBtn({ onClick }) {
  return <button onClick={onClick} style={{ background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:22,padding:'0 0 14px',textAlign:'left',width:40,lineHeight:1,WebkitTapHighlightColor:'transparent' }}>←</button>;
}
