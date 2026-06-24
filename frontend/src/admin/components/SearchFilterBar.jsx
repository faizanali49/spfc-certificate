// src/admin/components/SearchFilterBar.jsx
const SearchFilterBar = ({ search, onSearch, filterCity, onFilterCity, cities }) => (
  <div className="search-bar">
    <div className="search-input-wrap">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        placeholder="Search by name, CNIC, or certificate ID…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      {search && (
        <button className="clear-search" onClick={() => onSearch("")}>
          ✕
        </button>
      )}
    </div>

    <select
      value={filterCity}
      onChange={(e) => onFilterCity(e.target.value)}
      className="city-filter"
    >
      <option value="">All Cities</option>
      {cities.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  </div>
);

export default SearchFilterBar;
