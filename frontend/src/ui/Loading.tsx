export function Loading({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <div style={{ padding: 24 }} className="muted">
      {label}
    </div>
  )
}

