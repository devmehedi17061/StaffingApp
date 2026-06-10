export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="search-bar">
      <i className="bi bi-search"></i>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'Search...'} />
    </div>
  );
}
