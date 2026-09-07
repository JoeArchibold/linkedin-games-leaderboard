/**
 * A small "jump to a day" form for the daily pages. A plain GET form so it works
 * without JS: submitting navigates to the current path with `?date=YYYY-MM-DD`.
 */
export default function DatePicker({
  current,
  maxDate,
}: {
  current: string;
  maxDate: string;
}) {
  return (
    <form method="get" className="date-form">
      {/* key={current} forces the input to remount on navigation, so the
          displayed date updates even in browsers (e.g. Firefox) that otherwise
          preserve a stale defaultValue. */}
      <input
        key={current}
        type="date"
        name="date"
        defaultValue={current}
        max={maxDate}
        aria-label="Choose a day"
      />
      <button type="submit">Go</button>
    </form>
  );
}
