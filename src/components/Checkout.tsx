"use client";

import { useState } from "react";
import { useLang } from "@/lib/state";
import { cn } from "@/lib/utils";
import { BackArrowIcon } from "@/components/MuiIcons";

export function CheckoutHeader() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const setLang = useLang((s) => s.setLang);

  const bar = (desktop: boolean) => (
    <div
      dir={ar ? "rtl" : "ltr"}
      className={cn(
        "fixed top-0 left-0 right-0 z-[1000] flex h-[55px] w-full items-center justify-between border-b border-[#dee2e6] bg-white px-[10px]",
        desktop ? "hidden lg:flex lg:w-[calc(100%*5/12)]" : "lg:hidden",
        ar && desktop && "lg:left-[calc(100%*7/12)]"
      )}
    >
      <button
        type="button"
        onClick={() => window.history.back()}
        aria-label="Back"
        className="flex h-[50px] w-[40px] shrink-0 items-center justify-center rounded-[4px]"
      >
        <BackArrowIcon
          className={cn("h-[21px] w-[21px] text-[rgba(0,0,0,0.87)]", !ar && "-scale-x-100")}
        />
      </button>
      {!desktop && (
        <button
          type="button"
          onClick={() => setLang(ar ? "en" : "ar")}
          aria-label="Toggle language"
          className="flex h-[50px] w-[42px] shrink-0 items-center justify-center rounded-[4px] text-[20px] font-medium text-black"
        >
          {ar ? "En" : "ع"}
        </button>
      )}
    </div>
  );

  return (
    <>
      {bar(false)}
      {bar(true)}
    </>
  );
}

export function CheckoutActionBar({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className={cn(
        "fixed bottom-0 z-[1000] flex h-[60px] w-full items-center bg-white p-[7px] pb-[8px]",
        ar ? "right-0 md:w-[41.7%]" : "left-0 md:w-[41.6%]"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        dir={ar ? "rtl" : "ltr"}
        className="mx-auto mb-[3.5px] flex h-[45px] w-[97%] items-center justify-center rounded-[4px] bg-brand text-[12.25px] font-medium leading-[21.4375px] text-black/[0.87] hover:bg-[#b24700] transition-colors"
      >
        {label}
      </button>
    </div>
  );
}

export function UnderlineField({
  label,
  value,
  onChange,
  type = "text",
  dir,
  inputMode,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  dir?: "ltr" | "rtl";
  inputMode?: "text" | "numeric" | "tel";
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const [focused, setFocused] = useState(false);
  const shrunk = focused || value.length > 0;

  return (
    <div className="relative h-[46px] w-full">
      <label
        className={cn(
          "pointer-events-none absolute top-0 text-[#6c757d]",
          shrunk ? "text-[20px] leading-[20px]" : "text-[14px] leading-[20px]",
          ar ? "right-0 origin-top-right" : "left-0 origin-top-left"
        )}
        style={{
          transform: shrunk ? "translateY(1.5px) scale(0.75)" : "translateY(24px) scale(1)",
          transition: "color 200ms cubic-bezier(0, 0, 0.2, 1), transform 200ms cubic-bezier(0, 0, 0.2, 1)",
        }}
      >
        {label}
      </label>
      <div className="absolute right-0 bottom-0 left-0 border-b border-[rgba(0,0,0,0.42)] transition-colors focus-within:border-b-2 focus-within:border-brand">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          dir={dir}
          inputMode={inputMode}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-transparent pt-[6px] pb-[7px] text-[14px] leading-[1.1876] text-[rgba(0,0,0,0.87)] outline-none placeholder:text-[#5b5b5b]"
        />
      </div>
    </div>
  );
}

export function UnderlinePhoneField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").replace(/^965/, "");
    onChange(`+965${digits}`);
  };

  const [focused, setFocused] = useState(false);
  const shrunk = focused || value.length > 0;

  return (
    <div className="relative h-[46px] w-full">
      <label
        className={cn(
          "pointer-events-none absolute top-0 text-[#6c757d]",
          shrunk ? "text-[20px] leading-[20px]" : "text-[14px] leading-[20px]",
          ar ? "right-0 origin-top-right" : "left-0 origin-top-left"
        )}
        style={{
          transform: shrunk ? "translateY(1.5px) scale(0.75)" : "translateY(24px) scale(1)",
          transition: "color 200ms cubic-bezier(0, 0, 0.2, 1), transform 200ms cubic-bezier(0, 0, 0.2, 1)",
        }}
      >
        {label}
      </label>
      <div
        dir="ltr"
        className="absolute right-0 bottom-0 left-0 flex items-center border-b border-[rgba(0,0,0,0.42)] transition-colors focus-within:border-b-2 focus-within:border-brand"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label="Select country"
          className="mr-[8px] flex h-[30px] w-[40px] shrink-0 items-center justify-center"
        >
          <KuwaitFlagIcon className="h-[11px] w-[16px]" />
        </button>
        <input
          type="tel"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          dir="ltr"
          inputMode="tel"
          placeholder={placeholder}
          className="w-full bg-transparent pt-[6px] pb-[7px] text-[14px] leading-[1.1876] text-[rgba(0,0,0,0.87)] outline-none placeholder:text-[#5b5b5b]"
        />
      </div>
    </div>
  );
}

export function KuwaitFlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 14" className={className} aria-hidden="true">
      <rect width="21" height="14" fill="#fff" />
      <rect y="0" width="21" height="4.667" fill="#007a3d" />
      <rect y="9.333" width="21" height="4.667" fill="#ce1126" />
      <path d="M0 0 L7 0 L7 14 L0 14 Z" fill="#000" />
      <path d="M7 0 L4 7 L7 14 Z" fill="#fff" />
    </svg>
  );
}

export function PhoneBoothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 -20 440.4 440"
      width="100"
      height="100"
      focusable="false"
      aria-hidden="true"
      className={className}
    >
      <path d="m440.398438 90.199219v290.859375c.003906 11.046875-8.953126 20.003906-20 20h-400.398438c-11.046875.003906-20.00390625-8.953125-20-20v-290.859375zm0 0" fill="#00efd1"></path>
      <path d="m440.398438 20.199219v70h-440.398438v-70c-.00390625-11.046875 8.953125-20.003907 20-20h400.398438c11.046874-.003907 20.003906 8.953125 20 20zm0 0" fill="#00acea"></path>
      <path d="m390.199219 29.171875h30v30h-30zm0 0" fill="#fedb41"></path>
      <path d="m338.199219 29.171875h30v30h-30zm0 0" fill="#fedb41"></path>
      <path d="m20.199219 29.171875h290v30h-290zm0 0" fill="#fedb41"></path>
      <path d="m169.410156 253.28125c9.964844 0 19.464844 4.21875 26.144532 11.613281 6.683593 7.394531 9.921874 17.269531 8.914062 27.183594v56.480469h-149.570312v-56.480469c-1.003907-9.914063 2.234374-19.792969 8.917968-27.1875s16.1875-11.613281 26.152344-11.609375h26.890625v.039062l4.78125 19.660157h-.519531l-7.019532 44.550781v.007812l15.589844 15 16.578125-15-8.070312-44.550781-16.558594-.007812h16.089844l4.789062-19.660157v-.039062zm0 0" fill="#00acea"></path>
      <path d="m162.429688 178.28125v26.207031c0 18.742188-15.191407 33.933594-33.929688 33.933594s-33.929688-15.191406-33.929688-33.933594v-25.648437c13.441407 2.238281 22.269532-4.589844 27.628907-12.410156h.011719c7.097656 10.410156 19.757812 20.628906 40.21875 11.851562zm0 0" fill="#f7caa5"></path>
      <path d="m162.429688 170.699219v7.582031c-20.460938 8.777344-33.121094-1.441406-40.21875-11.851562-3.273438-4.84375-5.816407-10.144532-7.539063-15.730469h27.757813c11.042968.003906 19.996093 8.957031 20 20zm0 0" fill="#4b5d63"></path>
      <path d="m138.199219 272.988281 8.070312 44.550781-16.578125 15-15.589844-15v-.007812l7.019532-44.550781h.519531zm0 0" fill="#fedb41"></path>
      <path d="m142.519531 253.28125v.039062l-4.789062 19.660157h-16.089844l-4.78125-19.660157v-.039062zm0 0" fill="#fedb41"></path>
      <path d="m122.210938 166.429688h-.011719c-5.359375 7.820312-14.1875 14.648437-27.628907 12.410156v-8.140625c.003907-11.042969 8.957032-19.996094 20-20h.101563c1.722656 5.585937 4.265625 10.886719 7.539063 15.730469zm0 0" fill="#4b5d63"></path>
      <g fill="#fedb41">
        <path d="m243.199219 195.628906h82c3.316406 0 6-2.683594 6-6 0-3.3125-2.683594-6-6-6h-82c-3.3125 0-6 2.6875-6 6 0 3.316406 2.6875 6 6 6zm0 0"></path>
        <path d="m243.199219 225.628906h142c3.316406 0 6-2.683594 6-6 0-3.3125-2.683594-6-6-6h-142c-3.3125 0-6 2.6875-6 6 0 3.316406 2.6875 6 6 6zm0 0"></path>
        <path d="m385.199219 243.628906h-142c-3.3125 0-6 2.6875-6 6 0 3.316406 2.6875 6 6 6h142c3.316406 0 6-2.683594 6-6 0-3.3125-2.683594-6-6-6zm0 0"></path>
        <path d="m385.199219 273.628906h-142c-3.3125 0-6 2.6875-6 6 0 3.316406 2.6875 6 6 6h142c3.316406 0 6-2.683594 6-6 0-3.3125-2.683594-6-6-6zm0 0"></path>
        <path d="m385.199219 303.628906h-142c-3.3125 0-6 2.6875-6 6 0 3.316406 2.6875 6 6 6h142c3.316406 0 6-2.683594 6-6 0-3.3125-2.683594-6-6-6zm0 0"></path>
      </g>
    </svg>
  );
}

export function DeliveryTimeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width="512"
      height="512"
      focusable="false"
      aria-hidden="true"
      className={className}
      style={{ width: 30, height: 30 }}
    >
      <g id="Flat">
        <circle cx="356" cy="124" fill="#d5d5d3" r="28"></circle>
        <path d="m408 200h-16v-21.194l-30.247-37.806 12.494-10 32 40a8 8 0 0 1 1.753 5z" fill="#d5d5d3"></path>
        <path d="m264 96-16 8v8a16 16 0 0 1 -16 16h-48v-80h64v24l5.33 8z" fill="#fdc8a2"></path>
        <path d="m253.33 80h-37.33v-16h32v8z" fill="#fdb683"></path>
        <path d="m40 352h56v48h-56z" fill="#c7483c"></path>
        <circle cx="120" cy="432" fill="#34507b" r="56"></circle>
        <circle cx="120" cy="432" fill="#d5d5d3" r="24"></circle>
        <path d="m40 136h96a16 16 0 0 1 16 16v112a0 0 0 0 1 0 0h-128a0 0 0 0 1 0 0v-112a16 16 0 0 1 16-16z" fill="#d65246"></path>
        <path d="m48 192h16v48h-16z" fill="#df6257"></path>
        <path d="m24 160h128v16h-128z" fill="#c7483c"></path>
        <path d="m311.029 408.971 49.942-49.942a24 24 0 0 0 7.029-16.97v-62.059a32 32 0 0 1 32-32v40a40 40 0 0 0 40 40v32h-17.844a32 32 0 0 0 -23.678 10.474l-60.956 67.052a32 32 0 0 1 -23.678 10.474h-289.844a105.442 105.442 0 0 1 86.58-103.742l1.42-.258v-32h136a27.672 27.672 0 0 1 -23.759 27.394 37.552 37.552 0 0 0 -32.241 37.175v1.879a37.553 37.553 0 0 0 37.552 37.552h64.507a24 24 0 0 0 16.97-7.029z" fill="#d65246"></path>
        <path d="m104.285 387.575-6.138-14.775a81.91 81.91 0 0 1 16.727-4.927l2.861 15.742a65.794 65.794 0 0 0 -13.45 3.96z" fill="#df6257"></path>
        <path d="m70.522 419.487-14.4-6.974a81.646 81.646 0 0 1 27.363-31.768l9.03 13.209a65.626 65.626 0 0 0 -21.993 25.533z" fill="#df6257"></path>
        <path d="m152 264h-128a8 8 0 0 0 -8 8v9.32a16.008 16.008 0 0 0 13.14 15.75l81.43 14.8a7.608 7.608 0 0 0 1.43.13h40a8 8 0 0 0 8-8v-32a8 8 0 0 0 -8-8zm-8 32h-31.28l-80.72-14.68v-1.32h112z" fill="#d5d5d3"></path>
        <path d="m256 64h-40v19a21 21 0 0 1 -32 17.89 20.611 20.611 0 0 1 -3.09-2.32 20.9 20.9 0 0 1 -6.8-13.48l-1.71-17.11a39.992 39.992 0 0 1 39.8-43.98h3.8a40 40 0 0 1 40 40z" fill="#d65246"></path>
        <path d="m184 240v16a24 24 0 0 0 24 24h80l-40 104h40l37.6-90.517a38.658 38.658 0 0 0 -2.388-34.441 38.655 38.655 0 0 0 -33.312-19.042z" fill="#7a432a"></path>
        <path d="m280 184-48-56h-48v112h64v-40l8.971 8.971a24 24 0 0 0 16.97 7.029h78.059v-32z" fill="#d65246"></path>
        <path d="m368 248h64v-56h-14.111a28.944 28.944 0 0 0 -25.889 16l-24 8z" fill="#d65246"></path>
        <path d="m488 432a55.967 55.967 0 1 1 -.57-8 56 56 0 0 1 .57 8z" fill="#34507b"></path>
        <path d="m487.43 424h-63.43l-31.68 47.52a56 56 0 1 1 95.11-47.52z" fill="#2f486e"></path>
        <path d="m455 432a24.025 24.025 0 1 1 -1.38-8 23.6 23.6 0 0 1 1.38 8z" fill="#cececc"></path>
        <path d="m453.62 424h-29.62l-13.57 20.35a23.994 23.994 0 1 1 43.19-20.35z" fill="#c6c6c4"></path>
        <path d="m396 419.151 24.5 24.5a14.849 14.849 0 0 0 21 0 14.849 14.849 0 0 0 0-21l-24.5-24.5z" fill="#d5d5d3"></path>
        <path d="m360 456h32l32-48h64a48 48 0 0 0 -48-48h-16a64 64 0 0 0 -64 64z" fill="#d65246"></path>
        <path d="m352 184v32l16 8v16h32v-40z" fill="#fdc8a2"></path>
        <circle cx="368" cy="232" fill="#34507b" r="16"></circle>
        <g fill="#c7483c">
          <path d="m112 336h56v16h-56z"></path>
          <path d="m278.059 432h-150.059v-16h166.059a24 24 0 0 0 16.97-7.029l.971-.971-16.971 16.971a24 24 0 0 1 -16.97 7.029z"></path>
          <path d="m424 352a72.1 72.1 0 0 0 -70.98 60h16.289a56.088 56.088 0 0 1 54.691-44h16v-16z"></path>
        </g>
        <rect fill="#34507b" height="32" rx="16" width="96" x="152" y="280"></rect>
        <path d="m248 201.373-26.343-26.343-11.314 11.313 37.657 37.657z" fill="#c7483c"></path>
        <path d="m248 384h48a16 16 0 0 1 16 16 16 16 0 0 1 -16 16h-48a0 0 0 0 1 0 0v-32a0 0 0 0 1 0 0z" fill="#d5d5d3"></path>
      </g>
    </svg>
  );
}

export function ChevronForwardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" className={className}>
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  );
}

export function EditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" className={className}>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" className={className}>
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z" />
    </svg>
  );
}

export function HomeTypeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" className={className}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

export function ApartmentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" className={className}>
      <path d="M17 11V3H7v4H3v14h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2z" />
    </svg>
  );
}

export function OfficeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" className={className}>
      <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
    </svg>
  );
}
