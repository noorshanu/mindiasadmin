import { useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Label from "../components/form/Label";
import { Modal } from "../components/ui/modal";
import {
  createStoreCategory,
  createStoreProduct,
  deleteStoreCategory,
  deleteStoreProduct,
  fetchStoreCategories,
  fetchStoreOrders,
  fetchStoreProducts,
  uploadStoreCategoryImage,
  uploadStoreProductImage,
  updateStoreProduct,
  updateStoreOrderStatus,
  type AdminStoreCategory,
  type AdminStoreOrder,
  type AdminStoreProduct,
} from "../lib/api";

type TabId = "categories" | "products" | "orders";

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/%20/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function StoreManagement() {
  const [tab, setTab] = useState<TabId>("categories");
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<AdminStoreCategory[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", description: "" });
  const [savingCategory, setSavingCategory] = useState(false);
  const [newCategoryImage, setNewCategoryImage] = useState<File | null>(null);
  const [uploadingCategoryId, setUploadingCategoryId] = useState<string | null>(null);

  const [products, setProducts] = useState<AdminStoreProduct[]>([]);
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [newProduct, setNewProduct] = useState({
    title: "",
    slug: "",
    categoryId: "",
    shortDescription: "",
    description: "",
    priceInr: "",
    mrpInr: "",
    stockQty: "0",
    isDigital: false,
    status: "active" as "draft" | "active" | "archived",
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [newProductImage, setNewProductImage] = useState<File | null>(null);
  const [editingProduct, setEditingProduct] = useState<AdminStoreProduct | null>(null);
  const [savingEditProduct, setSavingEditProduct] = useState(false);
  const [editProductForm, setEditProductForm] = useState({
    title: "",
    slug: "",
    categoryId: "",
    shortDescription: "",
    description: "",
    priceInr: "",
    mrpInr: "",
    stockQty: "0",
    isDigital: false,
    status: "active" as "draft" | "active" | "archived",
  });

  const [orders, setOrders] = useState<AdminStoreOrder[]>([]);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetchStoreCategories();
      setCategories(res.items);
      setNewProduct((p) => ({ ...p, categoryId: p.categoryId || res.items[0]?._id || "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetchStoreProducts({ page: productPage, limit: 20 });
      setProducts(res.items);
      setProductTotalPages(Math.max(1, res.pagination?.totalPages ?? 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    }
  }, [productPage]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetchStoreOrders({ page: orderPage, limit: 20 });
      setOrders(res.items);
      setOrderTotalPages(Math.max(1, res.pagination?.totalPages ?? 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    }
  }, [orderPage]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);
  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);
  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c._id, label: `${c.name} (${c.slug})` })),
    [categories],
  );
  const productStatusClass = (status: "draft" | "active" | "archived") =>
    status === "active"
      ? "bg-green-100 text-green-700"
      : status === "draft"
        ? "bg-amber-100 text-amber-700"
        : "bg-gray-200 text-gray-700";
  const orderStatusClass = (status: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled") =>
    status === "delivered"
      ? "bg-green-100 text-green-700"
      : status === "cancelled"
        ? "bg-red-100 text-red-700"
        : status === "shipped"
          ? "bg-blue-100 text-blue-700"
          : "bg-amber-100 text-amber-700";

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim() || !newCategory.slug.trim()) return;
    setSavingCategory(true);
    setError(null);
    try {
      const res = await createStoreCategory({
        name: newCategory.name.trim(),
        slug: newCategory.slug.trim(),
        description: newCategory.description.trim() || undefined,
      });
      let item = res.item;
      if (newCategoryImage) {
        const up = await uploadStoreCategoryImage(res.item._id, newCategoryImage);
        item = up.item;
      }
      setCategories((prev) => [...prev.filter((x) => x._id !== item._id), item].sort((a, b) => a.sortOrder - b.sortOrder));
      setNewCategory({ name: "", slug: "", description: "" });
      setNewCategoryImage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.title.trim() || !newProduct.slug.trim() || !newProduct.categoryId) return;
    setSavingProduct(true);
    setError(null);
    try {
      const res = await createStoreProduct({
        title: newProduct.title.trim(),
        slug: newProduct.slug.trim(),
        categoryId: newProduct.categoryId,
        shortDescription: newProduct.shortDescription.trim() || undefined,
        description: newProduct.description.trim() || undefined,
        priceInr: Math.max(1, Number(newProduct.priceInr || 0)),
        mrpInr: newProduct.mrpInr ? Math.max(1, Number(newProduct.mrpInr)) : undefined,
        stockQty: Math.max(0, Number(newProduct.stockQty || 0)),
        isDigital: newProduct.isDigital,
        status: newProduct.status,
      });
      let item = res.item;
      if (newProductImage) {
        const up = await uploadStoreProductImage(res.item._id, newProductImage, newProduct.title.trim());
        item = up.item;
      }
      setProducts((prev) => [item, ...prev.filter((x) => x._id !== item._id)]);
      setNewProduct((prev) => ({
        ...prev,
        title: "",
        slug: "",
        shortDescription: "",
        description: "",
        priceInr: "",
        mrpInr: "",
        stockQty: "0",
        isDigital: false,
        status: "active",
      }));
      setNewProductImage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create product");
    } finally {
      setSavingProduct(false);
    }
  };

  const openEditProductModal = (product: AdminStoreProduct) => {
    const categoryId =
      typeof product.categoryId === "string" ? product.categoryId : product.categoryId?._id || "";
    setEditingProduct(product);
    setEditProductForm({
      title: product.title || "",
      slug: product.slug || "",
      categoryId,
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      priceInr: String(product.priceInr ?? ""),
      mrpInr: product.mrpInr != null ? String(product.mrpInr) : "",
      stockQty: String(product.stockQty ?? 0),
      isDigital: !!product.isDigital,
      status: product.status || "active",
    });
  };

  const handleSaveEditedProduct = async () => {
    if (!editingProduct) return;
    if (!editProductForm.title.trim() || !editProductForm.slug.trim() || !editProductForm.categoryId) return;
    setSavingEditProduct(true);
    setError(null);
    try {
      const res = await updateStoreProduct(editingProduct._id, {
        title: editProductForm.title.trim(),
        slug: normalizeSlug(editProductForm.slug),
        categoryId: editProductForm.categoryId,
        shortDescription: editProductForm.shortDescription.trim() || undefined,
        description: editProductForm.description.trim() || undefined,
        priceInr: Math.max(1, Number(editProductForm.priceInr || 0)),
        mrpInr: editProductForm.mrpInr ? Math.max(1, Number(editProductForm.mrpInr)) : undefined,
        stockQty: Math.max(0, Number(editProductForm.stockQty || 0)),
        isDigital: editProductForm.isDigital,
        status: editProductForm.status,
      });
      setProducts((prev) => prev.map((p) => (p._id === editingProduct._id ? res.item : p)));
      setEditingProduct(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update product");
    } finally {
      setSavingEditProduct(false);
    }
  };

  return (
    <>
      <PageMeta title="Store Management | Admin" description="Manage store categories, products and orders" />
      <PageBreadcrumb pageTitle="Store Management" />

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
          {(["categories", "products", "orders"] as const).map((id) => (
            <Button key={id} size="sm" variant={tab === id ? "primary" : "outline"} onClick={() => setTab(id)} className="capitalize">
              {id[0]?.toUpperCase() + id.slice(1)}
            </Button>
          ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Manage storefront catalog and order operations from one place.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {tab === "categories" && (
          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800">Create Category</h2>
              <p className="mt-1 text-xs text-gray-500">Add category details and optional image.</p>
              <div className="mt-4 space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={newCategory.name} onChange={(e) => setNewCategory((x) => ({ ...x, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={newCategory.slug} onChange={(e) => setNewCategory((x) => ({ ...x, slug: normalizeSlug(e.target.value) }))} />
                </div>
                <div>
                  <Label>Description</Label>
                  <TextArea value={newCategory.description} onChange={(v) => setNewCategory((x) => ({ ...x, description: v }))} rows={3} />
                </div>
                <div>
                  <Label>Category image (optional)</Label>
                  <label className="mt-1 flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm hover:border-brand-300 hover:bg-brand-50/40">
                    <span className="truncate text-gray-600">
                      {newCategoryImage ? newCategoryImage.name : "Choose category image"}
                    </span>
                    <span className="ml-3 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm">Browse</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewCategoryImage(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
                <Button onClick={() => void handleCreateCategory()} disabled={savingCategory}>
                  {savingCategory ? "Saving..." : "Create category"}
                </Button>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Categories</h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                  {categories.length} total
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {categories.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                    No categories yet.
                  </div>
                )}
                {categories.map((c) => (
                  <article key={c._id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No img</div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer text-sm text-brand-600 hover:underline">
                        {uploadingCategoryId === c._id ? "Uploading..." : "Upload image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingCategoryId === c._id}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            setUploadingCategoryId(c._id);
                            try {
                              const res = await uploadStoreCategoryImage(c._id, file);
                              setCategories((prev) => prev.map((x) => (x._id === c._id ? res.item : x)));
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Image upload failed");
                            } finally {
                              setUploadingCategoryId(null);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline"
                        onClick={async () => {
                          if (!window.confirm(`Delete ${c.name}?`)) return;
                          try {
                            await deleteStoreCategory(c._id);
                            setCategories((prev) => prev.filter((x) => x._id !== c._id));
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Delete failed");
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "products" && (
          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800">Create Product</h2>
              <p className="mt-1 text-xs text-gray-500">Create catalog item with pricing, stock, and image.</p>
              <div className="mt-4 space-y-3">
                <div><Label>Title</Label><Input value={newProduct.title} onChange={(e) => setNewProduct((x) => ({ ...x, title: e.target.value }))} /></div>
                <div><Label>Slug</Label><Input value={newProduct.slug} onChange={(e) => setNewProduct((x) => ({ ...x, slug: normalizeSlug(e.target.value) }))} /></div>
                <div>
                  <Label>Category</Label>
                  <select
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct((x) => ({ ...x, categoryId: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm"
                  >
                    {categoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div><Label>Short description</Label><TextArea value={newProduct.shortDescription} onChange={(v) => setNewProduct((x) => ({ ...x, shortDescription: v }))} rows={2} /></div>
                <div><Label>Description</Label><TextArea value={newProduct.description} onChange={(v) => setNewProduct((x) => ({ ...x, description: v }))} rows={3} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Price (INR)</Label><Input type="number" value={newProduct.priceInr} onChange={(e) => setNewProduct((x) => ({ ...x, priceInr: e.target.value }))} /></div>
                  <div><Label>MRP (INR)</Label><Input type="number" value={newProduct.mrpInr} onChange={(e) => setNewProduct((x) => ({ ...x, mrpInr: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Stock</Label><Input type="number" value={newProduct.stockQty} onChange={(e) => setNewProduct((x) => ({ ...x, stockQty: e.target.value }))} /></div>
                  <div>
                    <Label>Status</Label>
                    <select value={newProduct.status} onChange={(e) => setNewProduct((x) => ({ ...x, status: e.target.value as "draft" | "active" | "archived" }))} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm">
                      <option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={newProduct.isDigital} onChange={(e) => setNewProduct((x) => ({ ...x, isDigital: e.target.checked }))} />
                  Digital product (no delivery charge)
                </label>
                <div>
                  <Label>Product image (optional)</Label>
                  <label className="mt-1 flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm hover:border-brand-300 hover:bg-brand-50/40">
                    <span className="truncate text-gray-600">
                      {newProductImage ? newProductImage.name : "Choose product image"}
                    </span>
                    <span className="ml-3 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm">Browse</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewProductImage(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
                <Button onClick={() => void handleCreateProduct()} disabled={savingProduct}>{savingProduct ? "Saving..." : "Create product"}</Button>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Products</h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                  {products.length} on page
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {products.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                    No products found.
                  </div>
                )}
                {products.map((p) => (
                  <article key={p._id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt={p.images[0].alt || p.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No img</div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.title}</p>
                        <p className="text-xs text-gray-500">₹{p.priceInr}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${productStatusClass(p.status)}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-sm text-gray-700 hover:underline"
                        onClick={() => openEditProductModal(p)}
                      >
                        Edit
                      </button>
                      <label className="cursor-pointer text-sm text-brand-600 hover:underline">
                        {uploadingProductId === p._id ? "Uploading..." : "Upload image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingProductId === p._id}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            setUploadingProductId(p._id);
                            try {
                              const res = await uploadStoreProductImage(p._id, file, p.title);
                              setProducts((prev) => prev.map((x) => (x._id === p._id ? res.item : x)));
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Image upload failed");
                            } finally {
                              setUploadingProductId(null);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline"
                        onClick={async () => {
                          if (!window.confirm(`Delete ${p.title}?`)) return;
                          try {
                            await deleteStoreProduct(p._id);
                            setProducts((prev) => prev.filter((x) => x._id !== p._id));
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Delete failed");
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button size="sm" variant="outline" disabled={productPage <= 1} onClick={() => setProductPage((p) => p - 1)}>Prev</Button>
                <span className="px-2 text-sm text-gray-500">Page {productPage} / {productTotalPages}</span>
                <Button size="sm" variant="outline" disabled={productPage >= productTotalPages} onClick={() => setProductPage((p) => p + 1)}>Next</Button>
              </div>
            </section>
          </div>
        )}

        {tab === "orders" && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Orders</h2>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                {orders.length} on page
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {orders.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                  No orders yet.
                </div>
              )}
              {orders.map((o) => (
                <article key={o._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 hover:border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">{o.orderNumber}</p>
                    <p className="text-xs text-gray-500">{o.customerName} · {o.email} · ₹{o.totalInr}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${orderStatusClass(o.status)}`}>
                      {o.status}
                    </span>
                    <select
                      value={o.status}
                      onChange={async (e) => {
                        setUpdatingOrderId(o._id);
                        try {
                          const res = await updateStoreOrderStatus(
                            o._id,
                            e.target.value as "placed" | "confirmed" | "shipped" | "delivered" | "cancelled",
                          );
                          setOrders((prev) => prev.map((x) => (x._id === o._id ? res.item : x)));
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Status update failed");
                        } finally {
                          setUpdatingOrderId(null);
                        }
                      }}
                      className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                      disabled={updatingOrderId === o._id}
                    >
                      {["placed", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" disabled={orderPage <= 1} onClick={() => setOrderPage((p) => p - 1)}>Prev</Button>
              <span className="px-2 text-sm text-gray-500">Page {orderPage} / {orderTotalPages}</span>
              <Button size="sm" variant="outline" disabled={orderPage >= orderTotalPages} onClick={() => setOrderPage((p) => p + 1)}>Next</Button>
            </div>
          </section>
        )}
      </div>

      <Modal
        isOpen={!!editingProduct}
        onClose={() => (savingEditProduct ? null : setEditingProduct(null))}
        className="w-full max-w-2xl p-6 lg:p-7"
      >
        <div className="pr-10">
          <h3 className="text-xl font-semibold text-gray-900">Edit Product</h3>
          <p className="mt-1 text-sm text-gray-500">Update pricing, status, stock, and catalog details.</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={editProductForm.title} onChange={(e) => setEditProductForm((x) => ({ ...x, title: e.target.value }))} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={editProductForm.slug} onChange={(e) => setEditProductForm((x) => ({ ...x, slug: normalizeSlug(e.target.value) }))} />
          </div>
        </div>

        <div className="mt-3">
          <Label>Category</Label>
          <select
            value={editProductForm.categoryId}
            onChange={(e) => setEditProductForm((x) => ({ ...x, categoryId: e.target.value }))}
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm"
          >
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="mt-3">
          <Label>Short description</Label>
          <TextArea value={editProductForm.shortDescription} onChange={(v) => setEditProductForm((x) => ({ ...x, shortDescription: v }))} rows={2} />
        </div>
        <div className="mt-3">
          <Label>Description</Label>
          <TextArea value={editProductForm.description} onChange={(v) => setEditProductForm((x) => ({ ...x, description: v }))} rows={3} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><Label>Price (INR)</Label><Input type="number" value={editProductForm.priceInr} onChange={(e) => setEditProductForm((x) => ({ ...x, priceInr: e.target.value }))} /></div>
          <div><Label>MRP (INR)</Label><Input type="number" value={editProductForm.mrpInr} onChange={(e) => setEditProductForm((x) => ({ ...x, mrpInr: e.target.value }))} /></div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><Label>Stock</Label><Input type="number" value={editProductForm.stockQty} onChange={(e) => setEditProductForm((x) => ({ ...x, stockQty: e.target.value }))} /></div>
          <div>
            <Label>Status</Label>
            <select
              value={editProductForm.status}
              onChange={(e) => setEditProductForm((x) => ({ ...x, status: e.target.value as "draft" | "active" | "archived" }))}
              className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={editProductForm.isDigital} onChange={(e) => setEditProductForm((x) => ({ ...x, isDigital: e.target.checked }))} />
          Digital product (no delivery charge)
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditingProduct(null)} disabled={savingEditProduct}>Cancel</Button>
          <Button onClick={() => void handleSaveEditedProduct()} disabled={savingEditProduct}>
            {savingEditProduct ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
