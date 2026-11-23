import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Field } from "../components/auth/Field";
import { PasswordField } from "../components/auth/PasswordField";
import { WithdrawPreference } from "../components/auth/WithdrawPreference";
import { Button } from "../components/ui/Button";
import { signup, type WithdrawAfter } from "../lib/auth";
import { normalizePhone } from "../lib/phone";
import { checkPassword } from "../lib/password";
import { fieldErrors } from "../lib/api";
import { useAuth } from "../store/auth";

export function Signup() {
  const nav = useNavigate();
  const setSession = useAuth((s) => s.setSession);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [withdrawAfter, setWithdrawAfter] = useState<WithdrawAfter>(24);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const pw = checkPassword(password);
  const pwOk = pw.ok && password === confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const local: Record<string, string> = {};
    if (!first.trim()) local.first_name = "Required";
    if (!last.trim()) local.second_name = "Required";
    if (!email.trim()) local.email = "Required";
    if (!phone.trim()) local.phone = "Required";
    if (!pwOk) local.password = "Password doesn't meet requirements or doesn't match.";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setLoading(true);
    try {
      const norm = normalizePhone(phone);
      const res = await signup({
        phone: norm,
        first_name: first.trim(),
        second_name: last.trim(),
        email: email.trim(),
        password,
        withdraw_after: withdrawAfter,
      });
      setSession(res);
      nav("/", { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
        <p className="text-sm text-muted mt-1">
          Start saving towards what matters.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {errors.__form && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
            {errors.__form}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First name"
            name="first_name"
            autoComplete="given-name"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            error={errors.first_name}
          />
          <Field
            label="Last name"
            name="last_name"
            autoComplete="family-name"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            error={errors.second_name}
          />
        </div>

        <Field
          label="Phone number"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0712 345 678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          hint="Withdrawals go to this M-PESA number."
        />

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <PasswordField
          label="Confirm password"
          name="confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {(password || confirm) && (
          <ul className="text-[11px] text-muted space-y-0.5 pl-1">
            <Rule ok={pw.length} text="At least 8 characters" />
            <Rule ok={pw.notNumeric} text="Not entirely numeric" />
            <Rule ok={pw.notCommon} text="Not a common password" />
            <Rule ok={password === confirm && confirm.length > 0} text="Passwords match" />
          </ul>
        )}

        <div className="pt-2">
          <WithdrawPreference value={withdrawAfter} onChange={setWithdrawAfter} />
        </div>

        <Button type="submit" fullWidth loading={loading} disabled={!pwOk}>
          Create account
        </Button>
      </form>

      <p className="text-sm text-muted text-center mt-6">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={ok ? "text-brand" : ""}>
      {ok ? "✓" : "•"} {text}
    </li>
  );
}