const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: "C:\\Users\\osama\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const p = await b.newPage();
  await p.goto("https://www.petstorekuwait.com/product/pets-carrier-travel-bags/portable-travel-pet-cage-small-beige-orange", { waitUntil: "networkidle" });
  await new Promise((r) => setTimeout(r, 2000));
  const btns = await p.$$("button");
  console.log("total buttons:", btns.length);
  for (let i = 0; i < Math.min(btns.length, 12); i++) {
    const t = await btns[i].innerText();
    const a = await btns[i].getAttribute("aria-label");
    console.log("  btn[" + i + "]: text=" + JSON.stringify(t.slice(0, 30)) + " aria=" + a);
  }
  const uls = await p.$$("ul");
  console.log("total ul:", uls.length);
  for (let i = 0; i < uls.length; i++) {
    const t = await uls[i].innerText();
    console.log("  ul[" + i + "]: " + t.length + "b: " + t.slice(0, 200).replace(/\n/g, " | "));
  }
  await b.close();
})();
