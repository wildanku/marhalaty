import { Head, useForm } from "@inertiajs/react";
import { FormEventHandler } from "react";

export default function Login() {
  const { data, setData, post, processing, errors } = useForm({
    email: "",
    password: "",
    remember: false,
  });

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post("/god-mode/login");
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6 font-body">
      <Head title="God Mode - Login" />

      <div className="w-full max-w-md bg-[#161b22] border border-white/5 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            <span
              className="material-symbols-outlined text-white text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white font-headline tracking-tight">
            God Mode
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Restricted Access. Admins Only.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={data.email}
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              autoComplete="username"
              onChange={(e) => setData("email", e.target.value)}
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-400">{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={data.password}
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              autoComplete="current-password"
              onChange={(e) => setData("password", e.target.value)}
            />
            {errors.password && (
              <p className="mt-2 text-sm text-red-400">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="remember"
                checked={data.remember}
                onChange={(e) => setData("remember", e.target.checked)}
                className="rounded border-white/10 bg-[#0f1117] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-[#161b22]"
              />
              <span className="ml-2 text-sm text-white/60">Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0f1117] font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {processing ? "Authenticating..." : "Enter System"}
          </button>
        </form>
      </div>
    </div>
  );
}
