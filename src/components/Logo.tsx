import Image from "next/image";

export default function Logo({ size = 44 }: { size?: number }) {
  return (
    <Image
      src="/MML_Blue_Logo.webp"
      alt="MML logo"
      width={size}
      height={size}
      className="rounded-full"
      priority
    />
  );
}
