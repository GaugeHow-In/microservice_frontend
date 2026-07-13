import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MentorMarkdownProps = {
  content: string;
};

export function MentorMarkdown({ content }: MentorMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children, href }) => (
          <a
            className="font-medium text-orange-700 underline decoration-orange-300 underline-offset-2 hover:text-orange-800"
            href={href}
            target="_blank"
            rel="noreferrer noopener"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-orange-300 pl-3 text-slate-600">
            {children}
          </blockquote>
        ),
        code: ({ children, className }) => (
          <code className={`${className ?? ""} rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[0.9em] text-slate-900`}>
            {children}
          </code>
        ),
        h1: ({ children }) => <h1 className="mb-2 mt-4 text-lg font-bold text-slate-950 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-bold text-slate-950 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1.5 mt-3 font-semibold text-slate-950 first:mt-0">{children}</h3>,
        hr: () => <hr className="my-4 border-slate-300" />,
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        pre: ({ children }) => (
          <pre className="my-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-5 text-slate-100 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
            {children}
          </pre>
        ),
        strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
        table: ({ children }) => (
          <table className="my-3 w-full border-collapse text-left text-xs">{children}</table>
        ),
        td: ({ children }) => <td className="border border-slate-300 p-2 align-top">{children}</td>,
        th: ({ children }) => <th className="border border-slate-300 bg-slate-200 p-2 font-semibold text-slate-900">{children}</th>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
