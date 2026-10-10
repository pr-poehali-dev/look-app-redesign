import { Fragment } from "react";

const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAIL_RE = /[.,;:!?)\]}»]+$/;

interface Props {
  text: string;
  className?: string;
}

const LinkifiedText = ({ text, className = "text-[#61d4f0] underline underline-offset-2 hover:opacity-80 break-all" }: Props) => {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const trail = part.match(TRAIL_RE)?.[0] ?? "";
        const url = trail ? part.slice(0, -trail.length) : part;
        const href = url.startsWith("http") ? url : `https://${url}`;
        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={(e) => e.stopPropagation()}
              className={className}
            >
              {url}
            </a>
            {trail}
          </Fragment>
        );
      })}
    </>
  );
};

export default LinkifiedText;
