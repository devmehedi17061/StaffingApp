export default function PageHeader({ icon, title, children }) {
  return (
    <div className="page-header">
      <h4 className="page-title">
        <i className={`bi ${icon} me-2`}></i>{title}
      </h4>
      <div className="page-actions">{children}</div>
    </div>
  );
}
