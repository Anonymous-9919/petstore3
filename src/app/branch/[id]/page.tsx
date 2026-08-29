"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CategoryHeader } from "@/components/Header";
import { DirectionsCarIcon, LocationOnIcon, PhoneIcon } from "@/components/MuiIcons";
import { useLang } from "@/lib/state";

type Branch = { name: string; nameAr: string; address: string | null; addressAr: string | null; phone: string | null; latitude: string | null; longitude: string | null; hours: Array<{ dayOfWeek: number; opensAt: string; closesAt: string; isClosed: boolean }> };
const DAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_AR = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

export default function BranchDetailPage() {
  const lang = useLang((state) => state.lang);
  const ar = lang === "ar";
  const { id } = useParams<{ id: string }>();
  const [branch, setBranch] = useState<Branch | null>();
  useEffect(() => { fetch(`/api/storefront/fulfillment?branchId=${id}`).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setBranch(data.branch)).catch(() => setBranch(null)); }, [id]);
  if (branch === undefined) return <><CategoryHeader showSearch={false} /><div className="pt-[80px]" /></>;
  if (!branch) return <><CategoryHeader showSearch={false} /><div className="pt-[80px] text-center text-[#666]">{ar ? "الفرع غير متاح" : "Branch unavailable"}</div></>;

  const name = ar ? branch.nameAr : branch.name;
  const address = ar ? branch.addressAr : branch.address;
  const maps = branch.latitude && branch.longitude ? `https://maps.google.com/maps?q=${branch.latitude},${branch.longitude}` : undefined;
  const days = ar ? DAYS_AR : DAYS_EN;
  return <><CategoryHeader showSearch={false} /><div className="pt-[80px]" dir={ar ? "rtl" : "ltr"}>
    <p className="box-title">{ar ? "التفاصيل" : "Details"}</p>
    <div className="bordered bg-white p-5 text-[14px] leading-5"><p className="mb-5 mt-1 font-bold text-brand">{name}</p>
      {branch.phone && <a href={`tel:${branch.phone}`} className="flex justify-between text-black"><b>{ar ? "اتصل" : "Call"}</b><span>{branch.phone} <PhoneIcon className="inline h-4 w-4 text-brand" /></span></a>}
      {maps && <a href={maps} target="_blank" rel="noreferrer" className="mt-5 flex justify-between text-black"><b>{ar ? "الاتجاهات" : "Get Directions"}</b><span>{address} <DirectionsCarIcon className="inline h-4 w-4 text-brand" /></span></a>}
    </div>
    {address && <><p className="box-title mt-[35px] px-[10px]">{ar ? "العنوان" : "Address"}</p><div className="bordered mt-[5px] flex bg-white p-5 text-[14px]"><LocationOnIcon className="h-[30px] w-[30px] shrink-0 text-brand" /><div className="ms-[10px]"><p className="mb-1 font-bold">{name}</p><p>{address}</p></div></div></>}
    <p className="box-title mt-[35px] px-[10px]">{ar ? "ساعات العمل" : "Hours"}</p>
    <div className="bordered mt-[5px] bg-white px-5 pb-1 pt-[25px] text-[14px] leading-5">{days.map((day, index) => {
      const hour = branch.hours.find((item) => item.dayOfWeek === (index + 1) % 7);
      return <div key={day} className="mb-[10px] grid grid-cols-[110px_auto_150px]"><p className="mb-[14px]">{day}</p><span /><p className="mb-0 text-end">{!hour || hour.isClosed ? (ar ? "مغلق" : "Closed") : `${hour.opensAt} - ${hour.closesAt}`}</p></div>;
    })}</div>
  </div></>;
}
