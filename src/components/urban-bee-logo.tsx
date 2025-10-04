import type { SVGProps } from 'react';

export function UrbanBeeLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>UrbanBee Logo</title>
      <path d="M12 2l7.79 4.5v9L12 20l-7.79-4.5v-9L12 2z" />
      <path d="M7.5 15.5l-2-3 2-3" />
      <path d="M16.5 15.5l2-3-2-3" />
      <path d="M12 9v6" />
      <path d="M12 9a2 2 0 00-2-2H8" />
      <path d="M12 9a2 2 0 012-2h2" />
    </svg>
  );
}
