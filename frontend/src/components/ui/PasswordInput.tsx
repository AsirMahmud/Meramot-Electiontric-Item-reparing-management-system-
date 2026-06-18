import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean;
}

function getPasswordChecks(password: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function getPasswordBar(password: string) {
  const checks = getPasswordChecks(password);
  const passed = Object.values(checks).filter(Boolean).length;

  if (!password) {
    return { width: "20%", color: "bg-red-500", label: "Weak" };
  }
  if (passed <= 2) {
    return { width: "30%", color: "bg-red-500", label: "Weak" };
  }
  if (passed <= 4) {
    return { width: "65%", color: "bg-yellow-400", label: "Medium" };
  }
  return { width: "100%", color: "bg-green-500", label: "Strong" };
}

export function PasswordInput({
  className,
  showStrength = false,
  value,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [meterVisible, setMeterVisible] = useState(true);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const valString = (value as string) || "";
  const passwordBar = getPasswordBar(valString);

  React.useEffect(() => {
    setMeterVisible(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (passwordBar.label === "Strong" && valString.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setMeterVisible(false);
      }, 1500);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [valString, passwordBar.label]);

  return (
    <div className="w-full flex flex-col">
      <div className="relative w-full">
        <input
          {...props}
          value={value}
          type={showPassword ? "text" : "password"}
          className={`w-full pr-12 ${className || ""}`}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showStrength && valString.length > 0 && (
        <div
          className={`mt-1 flex flex-col gap-1 transition-opacity duration-500 ${
            meterVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all duration-300 ${passwordBar.color}`}
              style={{ width: passwordBar.width }}
            />
          </div>
          <p className="text-xs font-medium text-right text-gray-500">
            {passwordBar.label}
          </p>
        </div>
      )}
    </div>
  );
}
