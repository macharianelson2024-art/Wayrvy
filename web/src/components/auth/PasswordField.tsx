import { useState, forwardRef } from "react";
import { Field } from "./Field";

type Props = React.ComponentProps<typeof Field>;

export const PasswordField = forwardRef<HTMLInputElement, Props>(function PasswordField(
  props,
  ref
) {
  const [show, setShow] = useState(false);
  return (
    <Field
      {...props}
      ref={ref}
      type={show ? "text" : "password"}
      rightSlot={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="h-8 px-2 text-[11px] font-semibold text-muted hover:text-brand rounded-md"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? "Hide" : "Show"}
        </button>
      }
    />
  );
});