
const filterDataByTimeRange = (data, range) => {
    // Override Date for testing if needed, or rely on system time
    // But here I'll just use manual Date construction inside the function for 'today' if I could, 
    // but the original function uses `new Date()`.
    // So for the test to be deterministic I should perhaps mock `Date`.
    // Alternatively, I will just copy the logic and replace `today` with a fixed date.

    const today = new Date('2026-02-15T12:00:00'); // Simulated Today

    console.log(`Testing Range: ${range}`);
    // console.log(`Today: ${today.toISOString()}`);

    let filtered = [...data];

    switch (range) {
        case '1m': {
            // เฉพาะเดือนปัจจุบัน
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            filtered = filtered.filter(item => {
                const d = new Date(item.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            break;
        }
        case '3m': {
            // 2 เดือนก่อนหน้า + เดือนปัจจุบัน
            const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
            // console.log(`3m Start Date: ${start.toISOString()}`); // e.g. 2025-12-01
            filtered = filtered.filter(item => new Date(item.date) >= start);
            break;
        }
        case '6m': {
            // 5 เดือนก่อนหน้า + เดือนปัจจุบัน
            const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
            // console.log(`6m Start Date: ${start.toISOString()}`); // e.g. 2025-09-01
            filtered = filtered.filter(item => new Date(item.date) >= start);
            break;
        }
        case '1y': {
            // เฉพาะปีปัจจุบัน
            const currentYear = today.getFullYear();
            filtered = filtered.filter(item => new Date(item.date).getFullYear() === currentYear);
            break;
        }
        default:
            break;
    }
    return filtered.map(f => f.date);
};

const testData = [
    { date: '2026-02-10T00:00:00' }, // Current Month (Feb 2026)
    { date: '2026-01-15T00:00:00' }, // Previous Month (Jan 2026) -> included in 3m
    { date: '2025-12-15T00:00:00' }, // 2 Months ago (Dec 2025) -> included in 3m
    { date: '2025-11-15T00:00:00' }, // 3 Months ago (Nov 2025) -> NOT in 3m (2 prev + current = Feb, Jan, Dec).
    { date: '2025-09-15T00:00:00' }, // 5 Months ago (Sep 2025) -> included in 6m
    { date: '2025-08-30T00:00:00' }, // Just before 6m start? (Sep 1 starts 6m). So Aug 30 is NOT included.
    { date: '2025-08-15T00:00:00' }, // 6 Months ago (Aug 2025) -> NOT in 6m (5 prev + current = Feb, Jan, Dec, Nov, Oct, Sep).
];

console.log("--- 1m (Feb 2026 only) ---");
console.log(filterDataByTimeRange(testData, '1m'));

console.log("--- 3m (Feb, Jan, Dec) ---");
console.log(filterDataByTimeRange(testData, '3m'));

console.log("--- 6m (Feb, Jan, Dec, Nov, Oct, Sep) ---");
console.log(filterDataByTimeRange(testData, '6m'));

console.log("--- 1y (2026 only) ---"); // Assuming "Current Year" logic
console.log(filterDataByTimeRange(testData, '1y'));
