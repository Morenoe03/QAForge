export default function BrandMark() {
  return (
    <span className="qaforge-brand">
      <svg
        aria-hidden="true"
        className="qaforge-brand-mark"
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 2.5 35 11.25v17.5L20 37.5 5 28.75v-17.5L20 2.5Z"
          fill="#2476e8"
        />
        <path
          d="m12.5 20.25 5 5 10-10.5"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
      <span className="qaforge-brand-wordmark">
        <span className="qaforge-brand-accent">QA</span>Forge
      </span>
    </span>
  )
}
