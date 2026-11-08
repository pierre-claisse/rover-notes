import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { labelForHref } from "./present";

export function MarkdownText({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        skipHtml
        components={{
          a: ({ href, children }) => {
            const raw = nodeText(children).trim();
            const visible = raw && /^https?:\/\//.test(raw) && href ? labelForHref(href, raw) : children;
            return (
              <a href={href} rel="noreferrer noopener" target="_blank">
                {visible}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((item) => nodeText(item)).join("");
  return "";
}
