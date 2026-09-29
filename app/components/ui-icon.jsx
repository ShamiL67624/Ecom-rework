export default function Icon({ name, size = 20, ...props }) {
  const paths = {
    arrow: <path d="M4 12h15M13 5l7 7-7 7" />,
    diagonal: <path d="M5 19 19 5M5 5h14v14" />,
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    heart: <path d="M20.2 4.8a5.5 5.5 0 0 0-7.8 0l-.4.4-.4-.4a5.5 5.5 0 0 0-7.8 7.8L12 21l8.2-8.4a5.5 5.5 0 0 0 0-7.8Z" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    menu: <path d="M3 7h18M3 16h18" />,
    rotate: <><path d="M20 7a9 9 0 1 0 1 8M20 3v5h-5" /><path d="m8 11 4-3 4 3v6H8v-6Z" /></>,
    truck: <><path d="M3 5h12v12H3zM15 10h4l3 4v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v10l9 5 9-5V8M12 13v10M7 5l10 6" /></>,
    leaf: <><path d="M20 3C9 2 2 7 5 16s17 6 15-13Z" /><path d="M3 21 15 9" /></>,
    pause: <path d="M8 5v14M16 5v14" />,
    play: <path d="m9 5 11 7-11 7V5Z" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    whatsapp: <><path d="M20.2 3.8A10 10 0 0 0 3.6 15l-1.4 6.7L9 20.4A10 10 0 0 0 20.2 3.8Z" /><path d="M8 7c0 5 4 9 9 9l1-3-3-1-1 1-3-3 1-1-1-3-3 1Z" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    ruler: <path d="m3 16 13-13 5 5L8 21l-5-5ZM11 8l3 3M7 12l3 3M15 4l3 3" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>;
}
