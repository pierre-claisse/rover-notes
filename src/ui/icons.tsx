import type { ReactNode } from "react";

export type IconName =
  | "home"
  | "program"
  | "glossary"
  | "journal"
  | "week"
  | "lock"
  | "collapse"
  | "expand"
  | "read"
  | "write"
  | "external"
  | "eye"
  | "eye-off"
  | "check";

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <IconPaths name={name} />
    </svg>
  );
}

function IconPaths({ name }: { name: IconName }): ReactNode {
  switch (name) {
    case "home":
      return <path d="M4 11.2 12 5l8 6.2V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1z" />;
    case "program":
      return (
        <>
          <path d="M6 6h12" />
          <path d="M6 12h12" />
          <path d="M6 18h8" />
        </>
      );
    case "glossary":
      return <path d="M6 5.5h11a1 1 0 0 1 1 1V20l-6.5-3L5 20V6.5a1 1 0 0 1 1-1z" />;
    case "journal":
      return (
        <>
          <path d="M8 5h9a1 1 0 0 1 1 1v13l-5.5-2.6L8 19V6a1 1 0 0 1 1-1z" />
          <path d="M11 8.5h5" />
          <path d="M11 12h5" />
        </>
      );
    case "week":
      return (
        <>
          <path d="M7 4.5v2.5" />
          <path d="M17 4.5v2.5" />
          <path d="M5.5 9.5h13" />
          <path d="M6.5 5.5h11a1 1 0 0 1 1 1v12H5.5v-12a1 1 0 0 1 1-1z" />
        </>
      );
    case "lock":
      return (
        <>
          <path d="M8 11V8.2a4 4 0 0 1 8 0V11" />
          <path d="M7 11h10v8.5H7z" />
        </>
      );
    case "collapse":
      return <path d="M14.5 6.5 9 12l5.5 5.5" />;
    case "expand":
      return <path d="M9.5 6.5 15 12l-5.5 5.5" />;
    case "read":
      return (
        <>
          <path d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6z" />
          <circle cx="12" cy="12" r="2.4" />
        </>
      );
    case "write":
      return (
        <>
          <path d="M5.5 6.5h13v12h-13z" />
          <path d="M8.5 12.2 11 14.5l4.5-5" />
        </>
      );
    case "external":
      return (
        <>
          <path d="M14 6h4.5V10.5" />
          <path d="M13 11.5 18.2 6.3" />
          <path d="M17 13.5V18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4.5" />
        </>
      );
    case "eye":
      return (
        <>
          <path d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6z" />
          <circle cx="12" cy="12" r="2.4" />
        </>
      );
    case "eye-off":
      return (
        <>
          <path d="M4 6 20 18" />
          <path d="M9.2 9.4A3 3 0 0 0 14.6 14" />
          <path d="M6.1 7.7C4.4 9.1 3 12 3 12s3.6 6 9 6c1.5 0 2.9-.4 4.1-1" />
          <path d="M10 6.2A9 9 0 0 1 12 6c5.4 0 9 6 9 6a17 17 0 0 1-2.1 2.7" />
        </>
      );
    case "check":
      return <path d="M5 12.5 9.5 17 19 7.5" />;
    default: {
      const neverName: never = name;
      return neverName;
    }
  }
}
