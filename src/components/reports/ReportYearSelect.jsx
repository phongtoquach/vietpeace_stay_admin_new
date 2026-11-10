const YEARS_BACK = 4;

export default function ReportYearSelect({ year, onChange }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: YEARS_BACK + 1 },
    (_, index) => currentYear - index,
  );

  return (
    <div className="filter-group">
      <label className="filter-label" htmlFor="report-year">
        Năm:
      </label>
      <select
        id="report-year"
        className="filter-select"
        value={year}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {years.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
