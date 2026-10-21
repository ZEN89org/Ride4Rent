export const sanitizeMoney = (value: string): string => {
  const [whole, ...fraction] = value.replace(/[^\d.]/g, "").split(".");
  return whole.slice(0, 9) + (fraction.length ? "." + fraction.join("").slice(0, 2) : "");
};

export const normalizePhilippinePhone = (value: string): string => {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length >= 12) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  return digits ? "0" + digits : "";
};
