export function GlassCard({ as: Component = "div", className = "", children, ...props }) {
  return (
    <Component className={`glass-panel rounded-2xl ${className}`} {...props}>
      {children}
    </Component>
  );
}
