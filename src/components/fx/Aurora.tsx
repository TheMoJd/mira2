/** Nappe « aurora » d'arrière-plan : 3 blobs flous très lents qui donnent de
 *  la matière au hero même quand le canvas est figé (reduced-motion).
 *  Tout le style/anim vit dans globals.css (.aurora-blob + keyframes). */
export default function Aurora() {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className="aurora-blob aurora-a" />
      <div className="aurora-blob aurora-b" />
      <div className="aurora-blob aurora-c" />
    </div>
  );
}
