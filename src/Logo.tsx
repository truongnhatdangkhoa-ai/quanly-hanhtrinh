export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 108 108" role="img" aria-label="Hành Trình">
      <defs>
        <mask id="logo-hole">
          <rect width="108" height="108" fill="#fff" />
          <circle cx="54" cy="44" r="7.5" fill="#000" />
        </mask>
      </defs>
      <g mask="url(#logo-hole)" fill="#f2b33d">
        <circle cx="54" cy="44" r="18" />
        <polygon points="38.2,52.5 69.8,52.5 54,75" />
      </g>
      <g fill="#d9ecef">
        <circle cx="30" cy="68" r="1.6" />
        <circle cx="33.4" cy="73.6" r="1.7" />
        <circle cx="38" cy="77.6" r="1.8" />
        <circle cx="43.4" cy="79.4" r="1.9" />
        <circle cx="48.4" cy="78.8" r="1.9" />
        <circle cx="53" cy="77" r="2" />
      </g>
    </svg>
  );
}
