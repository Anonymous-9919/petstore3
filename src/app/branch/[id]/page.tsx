"use client";

import { useParams, notFound } from "next/navigation";
import { CategoryHeader } from "@/components/Header";
import { DirectionsCarIcon, LocationOnIcon, PhoneIcon } from "@/components/MuiIcons";
import { getBranches } from "@/data/loader";
import { useLang } from "@/lib/state";

type BranchInfo = {
  phone: string;
  maps?: string;
  areaAr?: string;
  areaEn?: string;
  addressAr?: string;
  addressEn?: string;
};

const BRANCH_INFO: Record<number, BranchInfo> = {
  2712: {
    phone: "98805010",
    maps: "https://maps.google.com/maps?q=27.39286285613608,42.97160625457764",
    areaAr: "الراي",
    areaEn: "AlRai",
    addressAr: "قطعة: 4, شارع: 9, مبنى: Shop No. 6",
    addressEn: "Block: 4, Street: 9, Building: Shop No. 6",
  },
  3285: {
    phone: "22207053",
  },
};

const DAYS_AR = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
const DAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function BranchDetailPage() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const branch = getBranches().find((b) => b.id === id);
  const info = BRANCH_INFO[id];
  const days = ar ? DAYS_AR : DAYS_EN;

  if (!branch || !info) notFound();

  const hasAddress = !!info.areaAr;
  const textAlign = ar ? "right" : "left";
  const floatSide = ar ? "right" : "left";
  const floatOpposite = ar ? "left" : "right";
  const phoneHref = `tel:+965${info.phone}`;
  const phoneLabel = ar ? `965${info.phone}+` : `+965${info.phone}`;

  return (
    <>
      <CategoryHeader showSearch={false} />
      <div className="pt-[80px]">
        <p className="box-title">{ar ? "التفاصيل" : "Details"}</p>
        <div
          className="w-100 bordered"
          style={{
            minHeight: 70,
            direction: ar ? "rtl" : "ltr",
            backgroundColor: "white",
            textAlign,
            padding: 20,
            marginTop: 5,
            fontSize: 14,
            lineHeight: "19.999px",
          }}
        >
          <p
            className="font-bold"
            style={{
              color: "#ff6600",
              marginBottom: 20,
              marginTop: 5,
            }}
          >
            {ar ? branch.ar_name : branch.name}
          </p>
          <a href={phoneHref} style={{ color: "black" }}>
            <div style={{ display: "inline-block", width: "100%" }}>
              <span className="font-bold" style={{ float: floatSide }}>
                {ar ? "اتصل" : "Call"}
              </span>
              <span style={{ float: floatOpposite }}>
                {phoneLabel}{" "}
                <PhoneIcon
                  style={{
                    fontSize: 16,
                    color: "#ff6600",
                    display: "inline-block",
                    verticalAlign: "middle",
                    marginRight: ar ? 5 : undefined,
                    marginLeft: ar ? undefined : 5,
                  }}
                />
              </span>
            </div>
          </a>
          {hasAddress && info.maps && (
            <a href={info.maps} target="_blank" rel="noreferrer" style={{ color: "black" }}>
              <div style={{ display: "inline-block", width: "100%", marginTop: 20 }}>
                <span className="font-bold" style={{ float: floatSide }}>
                  {ar ? "الاتجاهات" : "Get Directions"}
                </span>
                <span style={{ float: floatOpposite, cursor: "pointer" }}>
                  {ar ? info.areaAr : info.areaEn}{" "}
                  <DirectionsCarIcon
                    style={{
                      fontSize: 16,
                      color: "#ff6600",
                      display: "inline-block",
                      verticalAlign: "middle",
                      marginRight: ar ? 5 : undefined,
                      marginLeft: ar ? undefined : 5,
                    }}
                  />
                </span>
              </div>
            </a>
          )}
        </div>

        {hasAddress && (
          <>
            <p className="box-title" style={{ padding: "0 10px", marginTop: 35 }}>
              {ar ? "العنوان" : "Address"}
            </p>
            <div
              className="w-100 bordered"
              style={{
                minHeight: 70,
                direction: ar ? "rtl" : "ltr",
                backgroundColor: "white",
                display: "grid",
                gridTemplateColumns: "40px auto",
                padding: 20,
                textAlign,
                marginTop: 5,
                fontSize: 14,
                lineHeight: "19.999px",
              }}
            >
              <div>
                <LocationOnIcon
                  style={{ fontSize: 30, color: "#ff6600", display: "inline-block", verticalAlign: "middle" }}
                />
              </div>
              <div style={{ paddingRight: ar ? 10 : undefined, paddingLeft: ar ? undefined : 10 }}>
                <p className="font-bold" style={{ marginBottom: 4 }}>
                  {ar ? info.areaAr : info.areaEn}
                </p>
                <p style={{ marginBottom: 0 }}>
                  {ar ? info.addressAr : info.addressEn}
                </p>
              </div>
            </div>
          </>
        )}

        <p className="box-title" style={{ padding: "0 10px", marginTop: 35 }}>
          {ar ? "ساعات العمل" : "Hours"}
        </p>
        <div
          className="w-100 bordered"
          style={{
            minHeight: 70,
            direction: ar ? "rtl" : "ltr",
            backgroundColor: "white",
            textAlign,
            padding: "25px 20px 1px",
            marginTop: 5,
            fontSize: 14,
            lineHeight: "19.999px",
          }}
        >
          {days.map((d) => (
            <div
              key={d}
              style={{ display: "grid", gridTemplateColumns: "110px auto 150px", marginBottom: 10 }}
            >
              <p style={{ textAlign, marginBottom: 14 }}>{d}</p>
              <span />
              <div>
                <p
                  style={{
                    textAlign: ar ? "left" : "right",
                    marginBottom: 0,
                  }}
                >
                  {ar ? "10:00 ص - 10:00 م" : "10:00 AM - 10:00 PM"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
