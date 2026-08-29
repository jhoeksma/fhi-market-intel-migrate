import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-fhi-ink placeholder:text-slate-400 focus:border-fhi-blue focus:outline-none focus:ring-1 focus:ring-fhi-blue";

export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-fhi-slate">
        {label}
        {required && <span className="text-status-unconfirmed"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-fhi-slate">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} rows={props.rows ?? 3} className={inputClass} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />;
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-fhi-ink">
      <input type="checkbox" {...props} className="h-4 w-4 rounded border-slate-300 text-fhi-blue focus:ring-fhi-blue" />
      {label}
    </label>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-md bg-fhi-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      {children}
    </button>
  );
}

export function CancelLink({ href }: { href: string }) {
  return (
    <a href={href} className="rounded-md px-4 py-2 text-sm font-medium text-fhi-slate hover:text-fhi-ink">
      Cancel
    </a>
  );
}

export function DeleteButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button type="submit" className="text-xs font-medium text-status-unconfirmed hover:underline">
        Delete
      </button>
    </form>
  );
}

// For a submit button that must trigger a different server action than the
// form it lives inside (e.g. a per-row "Delete" next to a per-row "Save").
// A nested <form> is invalid HTML and gets silently collapsed by the parser,
// so this uses the button's own formAction override instead of a second <form>.
export function DeleteSubmitButton({ action }: { action: () => Promise<void> }) {
  return (
    <button
      type="submit"
      formAction={action}
      className="text-xs font-medium text-status-unconfirmed hover:underline"
    >
      Delete
    </button>
  );
}

export function FormCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-lg font-semibold text-fhi-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fhi-slate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export const th = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-fhi-slate";
export const td = "px-4 py-2.5 border-t border-slate-100";
