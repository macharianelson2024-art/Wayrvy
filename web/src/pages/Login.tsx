import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Field } from "../components/auth/Field";
import { PasswordField } from "../components/auth/PasswordField";
import { Button } from "../components/ui/Button";
import { login } from "../lib/auth";
import { normalizePhone } from "../lib/phone";
import { fieldErrors } from "../lib/api";
import { useAuth } from "../store/auth";

export function Login() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: { pathname: string } } };
  const setSession = useAuth((s) => s.setSession);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const norm = normalizePhone(phone);
      const res = await login(norm, password);
      setSession(res);
      nav(loc.state?.from?.pathname ?? "/", { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
        <p className="text-sm text-muted mt-1">
          Log in to keep your savings growing.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {errors.__form && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
            {errors.__form}
          </div>
        )}

        <Field
          label="Phone number"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0712 345 678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <div className="flex justify-end -mt-1">
          <button
            type="button"
            className="text-xs font-semibold text-brand hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" fullWidth loading={loading}>
          Log in
        </Button>
      </form>

      <p className="text-sm text-muted text-center mt-6">
        New to Wayrvy?{" "}
        <Link to="/signup" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}