import { Input } from "@/components/ui/input";

function formatWithCommas(value: number): string {
  if (!value && value !== 0) return "";
  return value.toLocaleString("en-US");
}

export function CurrencyInput({
  value,
  onChange,
  id,
  ...props
}: {
  value: number;
  onChange: (value: number) => void;
  id?: string;
} & Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "onChange" | "name"
>) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^\d]/g, "");
    onChange(digits ? Number(digits) : 0);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={value ? formatWithCommas(value) : ""}
      onChange={handleChange}
      {...props}
    />
  );
}
