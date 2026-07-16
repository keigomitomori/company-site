// 日付表記の正本。表示形式を変えるときはここだけを直す。
export const fmt = (d: Date) =>
  `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

export const iso = (d: Date) => d.toISOString().split('T')[0];
