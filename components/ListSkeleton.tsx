export default function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div className="card student-row" key={i}>
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 16, width: '55%' }} />
            <div className="skeleton" style={{ height: 12, width: '35%', marginTop: 8 }} />
          </div>
          <div className="skeleton" style={{ height: 28, width: 72, borderRadius: 999 }} />
        </div>
      ))}
    </div>
  );
}
