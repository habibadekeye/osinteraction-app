const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function format(date: Date, fmt: string): string {
  const d = date;
  return fmt
    .replace('EEEE', DAYS[d.getDay()])
    .replace('MMMM', MONTHS_FULL[d.getMonth()])
    .replace('MMM', MONTHS_SHORT[d.getMonth()])
    .replace('MM', pad(d.getMonth() + 1))
    .replace('dd', pad(d.getDate()))
    .replace('d', String(d.getDate()))
    .replace('yyyy', String(d.getFullYear()))
    .replace('yy', String(d.getFullYear()).slice(-2))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()));
}
