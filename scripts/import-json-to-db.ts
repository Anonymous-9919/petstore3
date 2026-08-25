import { PrismaClient } from "@prisma/client";
import categoriesData from "../src/data/categories.json";
import deliveryData from "../src/data/delivery.json";
import productsData from "../src/data/products.json";
import storeData from "../src/data/store.json";

type LegacyCategory = (typeof categoriesData.categories)[number];
type LegacyProduct = (typeof productsData)[number];
type LegacyCoverage = (typeof deliveryData.branch_delivery_charges)[number];
type LegacyOption = NonNullable<LegacyProduct["options"]>[number];
type LegacyOptionValue = LegacyOption["choices"][number];

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL });
const unresolvedCategories: string[] = [];
const unresolvedCoverage: string[] = [];

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function numberOrUndefined(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function productImages(product: LegacyProduct): string[] {
  return [...new Set([product.photo, ...(product.gallery ?? []).map((image) => image.photo)].filter(Boolean))];
}

async function findCategory(category: LegacyCategory) {
  return prisma.category.findFirst({
    where: { OR: [{ legacyId: category.id }, { slug: category.slug }] },
  });
}

async function importCategories() {
  for (const category of categoriesData.categories) {
    const data = {
      legacyId: category.id,
      slug: category.slug,
      name: category.name,
      nameAr: category.ar_name || category.name,
      description: text(category.description),
      descriptionAr: text(category.ar_description),
      imagePath: text(category.photo),
      sortOrder: category.order ?? 0,
      isActive: true,
    };
    const existing = await findCategory(category);
    if (existing) await prisma.category.update({ where: { id: existing.id }, data });
    else await prisma.category.create({ data });
  }
}

async function importOptions(productId: string, options: LegacyOption[] | undefined) {
  for (const option of options ?? []) {
    const groupData = {
      legacyId: option.id,
      productId,
      name: option.name,
      nameAr: option.ar_name || option.name,
      isRequired: option.is_required,
      allowsMultiple: option.multiple,
      minSelections: option.minimum ?? 0,
      maxSelections: option.maximum,
      sortOrder: option.sort_order ?? 0,
    };
    const existingGroup = await prisma.productOptionGroup.findUnique({ where: { legacyId: option.id } });
    const group = existingGroup
      ? await prisma.productOptionGroup.update({ where: { id: existingGroup.id }, data: groupData })
      : await prisma.productOptionGroup.create({ data: groupData });

    for (const choice of option.choices ?? []) {
      await importOptionValue(group.id, choice);
    }
  }
}

async function importOptionValue(groupId: string, choice: LegacyOptionValue) {
  const data = {
    legacyId: choice.id,
    groupId,
    value: choice.value,
    valueAr: choice.ar_value || choice.value,
    priceDelta: choice.price ?? 0,
    compareAtDelta: choice.striked_price || undefined,
    imagePath: text(choice.photo),
    sortOrder: choice.sort_order ?? 0,
    isActive: true,
  };
  const existing = await prisma.productOptionValue.findUnique({ where: { legacyId: choice.id } });
  if (existing) await prisma.productOptionValue.update({ where: { id: existing.id }, data });
  else await prisma.productOptionValue.create({ data });
}

async function importProducts() {
  const categories = await prisma.category.findMany({ select: { id: true, legacyId: true, slug: true } });
  const byLegacyId = new Map(categories.flatMap((category) => category.legacyId === null ? [] : [[category.legacyId, category.id] as const]));
  const bySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const importedProductSlugs = new Set(
    (await prisma.product.findMany({ select: { slug: true } })).map((product) => product.slug)
  );

  for (const [index, product] of productsData.entries()) {
    if (index >= 375 || (index + 1) % 25 === 0) console.info(`Importing product ${index + 1}/${productsData.length}: ${product.slug}`);
    const categoryId = byLegacyId.get(product.category_id) ?? bySlug.get(product.category_slug) ?? bySlug.get(product.category);
    if (!categoryId) {
      unresolvedCategories.push(`product ${product.id} (${product.slug}): category_id=${product.category_id}, slug=${product.category_slug ?? product.category}`);
      continue;
    }
    // Resume large initial imports without repeatedly round-tripping every completed product.
    if (importedProductSlugs.has(product.slug)) {
      unresolvedCategories.push(`product ${product.id} (${product.slug}): duplicate slug skipped`);
      continue;
    }

    const data = {
      legacyId: product.id,
      categoryId,
      slug: product.slug,
      name: product.name,
      nameAr: product.ar_name || product.name,
      description: text(product.description),
      descriptionAr: text(product.ar_description),
      shortDescription: text(product.short_description),
      shortDescriptionAr: text(product.ar_short_description),
      basePrice: product.price,
      compareAtPrice: product.striked_price || undefined,
      currencyCode: product.currency === "KD" ? "KWD" : product.currency,
      isActive: !product.not_available,
      allowPreorder: product.allow_preordering,
      isDeliveryEnabled: product.is_delivered && !product.pickup_only,
      isPickupEnabled: !product.delivery_only,
      minQuantity: product.min_addable_quantity ?? 1,
      maxQuantity: product.max_addable_quantity,
      quantityIncrement: product.increments ?? 1,
      sortOrder: product.sort_order ?? 0,
      primaryImagePath: text(product.photo),
    };
    const saved = await prisma.product.create({ data: { ...data, variants: { create: { price: data.basePrice, compareAtPrice: data.compareAtPrice, isDefault: true, isActive: data.isActive } } } });
    importedProductSlugs.add(product.slug);

    for (const [sortOrder, path] of productImages(product).entries()) {
      await prisma.productImage.upsert({
        where: { productId_sortOrder: { productId: saved.id, sortOrder } },
        create: { productId: saved.id, path, sortOrder },
        update: { path },
      });
    }
    await importOptions(saved.id, product.options);
  }
}

async function importDelivery() {
  const coverages = deliveryData.branch_delivery_charges;
  const branchSources = new Map<number, LegacyCoverage>();
  for (const coverage of coverages) branchSources.set(coverage.branch, coverage);

  const branches = new Map<number, string>();
  for (const source of deliveryData.branches) {
    const branch = await prisma.branch.upsert({
      where: { legacyId: source.id },
      create: {
        legacyId: source.id,
        name: source.name,
        nameAr: source.ar_name || source.name,
        isActive: true,
        deliveryEnabled: true,
        pickupEnabled: true,
      },
      update: { name: source.name, nameAr: source.ar_name || source.name, isActive: true },
    });
    branches.set(source.id, branch.id);
  }
  for (const [legacyId, source] of branchSources) {
    const data = {
      legacyId,
      name: source.branch_name,
      nameAr: source.branch_name_ar || source.branch_name,
      isActive: true,
      deliveryEnabled: true,
      pickupEnabled: true,
    };
    const branch = await prisma.branch.upsert({ where: { legacyId }, create: data, update: data });
    branches.set(legacyId, branch.id);
  }

  const provinces = new Map<string, string>();
  for (const [sortOrder, name] of [...new Set(coverages.map((coverage) => coverage.province_en).filter(Boolean))].entries()) {
    const source = coverages.find((coverage) => coverage.province_en === name)!;
    const province = await prisma.province.upsert({
      where: { name },
      create: { name, nameAr: source.province.split(",")[1]?.trim() || name, sortOrder, isActive: true },
      update: { nameAr: source.province.split(",")[1]?.trim() || name, sortOrder, isActive: true },
    });
    provinces.set(name, province.id);
  }

  const areas = new Map<number, string>();
  for (const source of coverages) {
    const provinceId = provinces.get(source.province_en);
    if (!provinceId) {
      unresolvedCoverage.push(`coverage ${source.id}: province ${source.province_en} was not imported`);
      continue;
    }
    const data = {
      legacyId: source.area_id,
      provinceId,
      name: source.area,
      nameAr: source.area_ar || source.area,
      latitude: numberOrUndefined(source.area_lat),
      longitude: numberOrUndefined(source.area_lng),
      isActive: true,
    };
    const existing = await prisma.area.findFirst({ where: { OR: [{ legacyId: source.area_id }, { provinceId, name: source.area }] } });
    const area = existing
      ? await prisma.area.update({ where: { id: existing.id }, data })
      : await prisma.area.create({ data });
    areas.set(source.area_id, area.id);
  }

  for (const source of coverages) {
    const branchId = branches.get(source.branch);
    const areaId = areas.get(source.area_id);
    if (!branchId || !areaId) {
      unresolvedCoverage.push(`coverage ${source.id}: branch=${source.branch}, area=${source.area_id}`);
      continue;
    }
    const data = {
      legacyId: source.id,
      branchId,
      areaId,
      deliveryFee: source.price,
      minimumOrderValue: source.minimum_order_value ?? 0,
      priority: source.branch_priority ?? 0,
      isActive: !source.branch_is_busy,
    };
    const existing = await prisma.branchDeliveryCoverage.findFirst({ where: { OR: [{ legacyId: source.id }, { branchId, areaId }] } });
    if (existing) await prisma.branchDeliveryCoverage.update({ where: { id: existing.id }, data });
    else await prisma.branchDeliveryCoverage.create({ data });
  }

  return branches;
}

async function importInventory(branches: Map<number, string>) {
  if (branches.size !== 1) {
    unresolvedCoverage.push(`inventory was skipped because ${branches.size} branches were derived from delivery.json`);
    return;
  }
  const [branchId] = branches.values();
  const products = await prisma.product.findMany({ where: { legacyId: { not: null } }, select: { id: true, legacyId: true, variants: { where: { isDefault: true }, select: { id: true } } } });
  const productIds = new Map(products.flatMap((product) => product.legacyId === null || !product.variants[0] ? [] : [[product.legacyId, { id: product.id, variantId: product.variants[0].id }] as const]));
  for (const product of productsData) {
    const productRef = productIds.get(product.id);
    if (!productRef) continue;
    await prisma.inventoryLevel.upsert({
      where: { branchId_productId_variantId: { branchId, productId: productRef.id, variantId: productRef.variantId } },
      create: { branchId, productId: productRef.id, variantId: productRef.variantId, quantity: product.inventory_on_hand ?? 0 },
      update: { quantity: product.inventory_on_hand ?? 0 },
    });
  }
}

async function main() {
  await prisma.storeSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      name: storeData.name,
      nameAr: storeData.ar_name || storeData.name,
      slogan: text(storeData.slogan),
      sloganAr: text(storeData.ar_slogan),
      currencyCode: storeData.settings.currency_iso || "KWD",
      currencyLabel: storeData.settings.currency_english || "KD",
      currencyLabelAr: storeData.settings.currency_local || "د.ك",
      currencyDecimals: storeData.settings.currency_decimals ?? 3,
      deliveryEnabled: storeData.settings.enable_delivery,
      pickupEnabled: storeData.settings.enable_pickup,
      email: text(storeData.settings.contact_email),
      phone: text(storeData.settings.link_call_center),
      whatsapp: text(storeData.settings.link_whatsapp),
    },
    update: {
      name: storeData.name,
      nameAr: storeData.ar_name || storeData.name,
      slogan: text(storeData.slogan),
      sloganAr: text(storeData.ar_slogan),
      currencyCode: storeData.settings.currency_iso || "KWD",
      currencyLabel: storeData.settings.currency_english || "KD",
      currencyLabelAr: storeData.settings.currency_local || "د.ك",
      currencyDecimals: storeData.settings.currency_decimals ?? 3,
      deliveryEnabled: storeData.settings.enable_delivery,
      pickupEnabled: storeData.settings.enable_pickup,
      email: text(storeData.settings.contact_email),
      phone: text(storeData.settings.link_call_center),
      whatsapp: text(storeData.settings.link_whatsapp),
    },
  });
  await importCategories();
  await importProducts();
  const branches = await importDelivery();
  await importInventory(branches);

  console.info(`Imported ${categoriesData.categories.length} categories, ${productsData.length} products, and ${deliveryData.branch_delivery_charges.length} coverage rows.`);
  if (unresolvedCategories.length) console.warn("Unresolved product categories:\n" + unresolvedCategories.join("\n"));
  if (unresolvedCoverage.length) console.warn("Unresolved coverage/inventory rows:\n" + unresolvedCoverage.join("\n"));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
