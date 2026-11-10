const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

export default function ReportMonthSelect({ month, onChange }) {
  return (
    <div className="filter-group">
      <label className="filter-label" htmlFor="report-month">
        Tháng:
      </label>
      <select
        id="report-month"
        className="filter-select"
        value={month ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          onChange(value === "" ? null : Number(value));
        }}
      >
        <option value="">Tất cả tháng</option>
        {MONTHS.map((value) => (
          <option key={value} value={value}>
            Tháng {value}
          </option>
        ))}
      </select>
    </div>
  );
}
