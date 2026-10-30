import { useState } from "react";

interface Props {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
}

const format = (digits: string) => {
  const d = digits.slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
};

const toIso = (digits: string): string => {
  if (digits.length !== 8) return "";
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));
  if (year < 1900 || month < 1 || month > 12 || day < 1) return "";
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return "";
  if (d.getTime() > Date.now()) return "";
  return `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
};

const fromIso = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
};

const BirthDateInput = ({ value, onChange, className }: Props) => {
  const [text, setText] = useState(fromIso(value));
  const digits = text.replace(/\D/g, "");
  const invalid = digits.length === 8 && !toIso(digits);

  return (
    <div className="flex flex-col gap-1">
      <input
        value={text}
        inputMode="numeric"
        autoComplete="bday"
        placeholder="ДД.ММ.ГГГГ"
        maxLength={10}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "").slice(0, 8);
          setText(format(next));
          onChange(toIso(next));
        }}
        className={className}
      />
      {invalid && <p className="text-[11px] text-[#FF5A3C]">Проверьте дату: например, 25.03.1998</p>}
    </div>
  );
};

export default BirthDateInput;
