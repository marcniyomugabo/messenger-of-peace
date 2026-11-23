// Today's date as 'YYYY-MM-DD' in the server's local time zone (set TZ=Africa/Kigali in .env).
// new Date().toISOString() would give the UTC date, which is yesterday between 00:00 and 02:00 in Rwanda.
const today = () => {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

module.exports = { today };
