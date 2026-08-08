import Link from "next/link";

const WHATSAPP = "+96598805010";

export default function WhatsAppFloat() {
  return (
    <Link
      href={`https://wa.me/${WHATSAPP.replace(/\+/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="fixed right-0 top-[342px] z-[1500] block h-[60px] w-[40px] transition-opacity hover:opacity-90 lg:top-[330px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/whatsapp-float.png"
        alt=""
        width={40}
        height={60}
        className="h-full w-full"
      />
    </Link>
  );
}
