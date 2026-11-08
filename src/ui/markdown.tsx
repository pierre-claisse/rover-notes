import ReactMarkdown from "react-markdown";

export function MarkdownText({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a href={href} rel="noreferrer noopener" target="_blank">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
