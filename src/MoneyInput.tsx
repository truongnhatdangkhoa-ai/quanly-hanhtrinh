import { groupDigits } from "./utils";

// Ô nhập tiền: gõ 100000 tự hiện 100.000, đơn vị VNĐ nằm sẵn trong ô.
export default function MoneyInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string; // chỉ gồm chữ số
  onChange: (digits: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <span className="money-wrap">
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        value={value ? groupDigits(value) : ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+/, ""))}
      />
      <span className="money-unit">VNĐ</span>
    </span>
  );
}
