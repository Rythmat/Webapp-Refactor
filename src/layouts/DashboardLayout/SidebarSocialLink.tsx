export function SidebarSocialLink(props: {
  icon: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <li>
      <a
        className="inline-block p-2 text-zinc-500 hover:text-zinc-800"
        href={props.href}
        rel="noreferrer"
        target="_blank"
      >
        {props.icon}
        <span className="sr-only">{props.label}</span>
      </a>
    </li>
  );
}
