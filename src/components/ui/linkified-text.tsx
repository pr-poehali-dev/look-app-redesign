import { Fragment, ReactNode } from "react";

const LABEL = "[a-zA-Z0-9а-яА-ЯёЁ](?:[a-zA-Z0-9а-яА-ЯёЁ-]*[a-zA-Z0-9а-яА-ЯёЁ])?";
const URL_PATTERN =
  `(?:https?:\\/\\/|www\\.)[^\\s<>"']+|(?:${LABEL}\\.)+(?:ru|com|рф|net|org)(?![a-zA-Z0-9а-яА-ЯёЁ-])(?:[\\/?#][^\\s<>"']*)?`;
const TRAIL_RE = /[.,;:!?)\]}»]+$/;

interface Props {
  text: string;
  className?: string;
}

const LinkifiedText = ({ text, className = "text-[#61d4f0] underline underline-offset-2 hover:opacity-80 break-all" }: Props) => {
  const re = new RegExp(URL_PATTERN, "gi");
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const prev = start > 0 ? text[start - 1] : "";
    if (prev === "@" || prev === "/" || prev === ".") continue;

    const raw = m[0];
    const trail = raw.match(TRAIL_RE)?.[0] ?? "";
    const url = trail ? raw.slice(0, -trail.length) : raw;
    if (!url) continue;
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    if (start > last) nodes.push(<Fragment key={key++}>{text.slice(last, start)}</Fragment>);
    nodes.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={(e) => e.stopPropagation()}
        className={className}
      >
        {url}
      </a>
    );
    if (trail) nodes.push(<Fragment key={key++}>{trail}</Fragment>);
    last = start + raw.length;
  }

  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return <>{nodes}</>;
};

export default LinkifiedText;
