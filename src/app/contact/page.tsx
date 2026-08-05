"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategoryHeader } from "@/components/Header";
import {
  EmailIcon,
  PhoneIphoneIcon,
  PhoneHandsetIcon,
  WebsiteIcon,
  HelpOutlineIcon,
} from "@/components/MuiIcons";
import { useLang } from "@/lib/state";

const WHATSAPP = "+96598805010";
const PHONES = ["98805010", "22207053"];
const EMAIL = "petstorekw@gmail.com";
const INSTAGRAM = "https://www.instagram.com/petstore.kw";
const WEBSITE = "https://www.petstorekuwait.com";

export default function ContactPage() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";

  const branches = ar
    ? [
        { id: 2712, name: "متجر للحيوانات الأليفة" },
        { id: 3285, name: "متجر للحيوانات الأليفة - السالمية" },
      ]
    : [
        { id: 2712, name: "Pet Store - Al Rai" },
        { id: 3285, name: "Pet Store - Salmiya" },
      ];

  const router = useRouter();

  type IconBtn = {
    order: number;
    node: React.ReactNode;
    href: string;
    external: boolean;
    size: number;
  };

  const iconBtns: IconBtn[] = [
    {
      order: 3,
      node: (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src="/assets/contact/whatsapp.png" alt="" style={{ width: 32, height: 32 }} />
      ),
      href: `https://api.whatsapp.com/send?phone=${WHATSAPP.replace("+", "")}`,
      external: true,
      size: 32,
    },
    {
      order: 2,
      node: (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src="/assets/contact/instagram.png" alt="" style={{ width: 32, height: 32 }} />
      ),
      href: INSTAGRAM,
      external: true,
      size: 32,
    },
    {
      order: 2,
      node: <WebsiteIcon style={{ width: 32, height: 32 }} />,
      href: WEBSITE,
      external: true,
      size: 32,
    },
    {
      order: 1,
      node: <PhoneIphoneIcon style={{ width: 32, height: 32 }} />,
      href: `tel:${PHONES[0]}`,
      external: false,
      size: 32,
    },
    {
      order: 1,
      node: <PhoneHandsetIcon style={{ width: 32, height: 32 }} />,
      href: `tel:${PHONES[1]}`,
      external: false,
      size: 32,
    },
    {
      order: 1,
      node: <EmailIcon style={{ width: 28, height: 28 }} />,
      href: `mailto:${EMAIL}`,
      external: false,
      size: 28,
    },
  ];

  return (
    <>
      <CategoryHeader showSearch={false} />
      <div className="pt-[80px]">
        <p className="box-title">
          {ar ? "أفرعنا" : "Our Branches"}
        </p>
        <div className="w-100 bordered" style={{ marginTop: 5 }}>
          <ul
            className="MuiList-root MuiList-dense MuiList-padding"
            style={{ padding: "8px 0 8px" }}
          >
            {branches.map((b) => (
              <li
                key={b.id}
                className="MuiListItem-container relative"
                style={{ listStyle: "none" }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/branch/${b.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/branch/${b.id}`);
                    }
                  }}
                  className="MuiButtonBase-root MuiListItem-root MuiListItem-dense MuiListItem-gutters MuiListItem-button MuiListItem-secondaryAction flex cursor-pointer items-center text-ink hover:bg-black/[0.04] active:bg-black/[0.08]"
                  style={{
                    margin: "10px 0 16px",
                    minHeight: 40,
                    padding: ar ? "0 16px 0 48px" : "0 48px 0 16px",
                    textAlign: ar ? "right" : "left",
                    direction: ar ? "rtl" : "ltr",
                  }}
                >
                  <div
                    className="MuiListItemText-root"
                    style={{ flex: "1 1 auto", minWidth: 0, margin: 0 }}
                  >
                    <span
                      className="MuiListItemText-primary MuiTypography-body2 MuiTypography-displayBlock"
                      style={{ display: "block" }}
                    >
                      <div
                        style={{
                          marginBottom: 3,
                          padding: "0 10px",
                          fontSize: 14,
                          lineHeight: "20px",
                          textAlign: ar ? "right" : "left",
                          direction: ar ? "rtl" : "ltr",
                        }}
                      >
                        {b.name}
                      </div>
                      <div>
                        <hr
                          className="MuiDivider-root"
                          style={{
                            position: "relative",
                            top: 8,
                            margin: 0,
                            border: "none",
                            height: 1,
                            backgroundColor: "rgba(0,0,0,0.12)",
                          }}
                        />
                      </div>
                    </span>
                  </div>
                </div>
                <div
                  className="MuiListItemSecondaryAction"
                  style={{
                    position: "absolute",
                    top: "20px",
                    transform: "translateY(-10.7422px)",
                    color: "#7d7d7d",
                    display: "block",
                    lineHeight: "19.999px",
                    fontSize: 14,
                    right: ar ? "unset" : 16,
                    left: ar ? 16 : "unset",
                  }}
                  onClick={() => router.push(`/branch/${b.id}`)}
                >
                  <HelpOutlineIcon
                    style={{
                      color: "#7d7d7d",
                      fontSize: 20,
                      cursor: "pointer",
                      width: 20,
                      height: 20,
                      display: "inline-block",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="box-title" style={{ padding: "0px 10px", marginTop: 30 }}>
          {ar ? "تواصل معنا" : "Connect with us"}
        </p>
        <div className="mt-[5px] w-100 text-center bordered pb-2" style={{ paddingTop: 14 }}>
          <div
            className="flex flex-wrap items-start justify-center"
            dir="ltr"
            style={{
              flexDirection: "row",
              marginTop: 5,
            }}
          >
            {iconBtns.map((b, i) => (
              <div
                key={i}
                className="flex shrink-0 items-center justify-center text-black/[0.54]"
                style={{
                  order: b.order,
                  flex: "1 1 0%",
                  height: 32,
                  flexGrow: 1,
                  padding: "0px 15px",
                }}
              >
                <Link
                  href={b.href}
                  target={b.external ? "_blank" : undefined}
                  rel={b.external ? "noreferrer" : undefined}
                  className="flex items-center justify-center"
                  style={{ width: b.size, height: b.size }}
                  aria-label={b.href}
                >
                  {b.node}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
