import { useEffect, useMemo, useState } from "react";
import OperatingHoursBanner from "../components/OperatingHoursBanner";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ReviewForm from "../components/ReviewForm";
import { useAuth } from "../context/AuthContext";
import { apiFetch, apiGetCached, invalidateCache } from "../lib/api";

const FALLBACK_PRODUCTS = [
  { _id: "fallback-1", vendorId: null, name: "Milk 500ml", price: 80, category: "supermarket", image: "" },
  { _id: "fallback-2", vendorId: null, name: "Bread", price: 70, category: "supermarket", image: "" },
  { _id: "fallback-3", vendorId: null, name: "Rice 2kg", price: 310, category: "supermarket", image: "" },
  { _id: "fallback-4", vendorId: null, name: "Pilau Beef", price: 350, category: "food", image: "" },
  { _id: "fallback-5", vendorId: null, name: "Chapati Beans", price: 220, category: "food", image: "" },
  { _id: "fallback-6", vendorId: null, name: "Soda 500ml", price: 65, category: "drinks", image: "" },
];

function normalizeStatus(status) {
  const raw = String(status || "").toUpperCase();
  if (["DRAFT"].includes(raw)) return "DRAFT";
  if (["AWAITING_CONFIRMATION", "PAYMENT_PENDING", "PAYMENT_CONFIRMED"].includes(raw)) return "AWAITING_CONFIRMATION";
  if (["PAID"].includes(raw)) return "PAID";
  if (["SHOPPING", "PROCESSING", "VENDOR_ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "PENDING_RIDER", "RIDER_ASSIGNED"].includes(raw)) return "SHOPPING";
  if (["DELIVERING", "ON_THE_WAY"].includes(raw)) return "DELIVERING";
  if (raw === "DELIVERED") return "DELIVERED";
  if (raw === "REFUNDED") return "REFUNDED";
  if (raw === "CANCELLED") return "CANCELLED";
  return "DRAFT";
}

function buildDraftItem(product) {
  return {
    _id: product._id,
    vendorId: product.vendorId || null,
    name: product.name,
    quantity: 1,
    userEstimatedPrice: Number(product.price) || 0,
    note: "",
    image: product.image || "",
    category: product.category || "supermarket",
  };
}

function buildEditableReviewItems(order) {
  const sourceItems = Array.isArray(order?.finalItems) && order.finalItems.length > 0
    ? order.finalItems
    : Array.isArray(order?.items)
      ? order.items
      : [];

  return sourceItems.map((item, index) => ({
    _id: item._id || `${order?._id || "item"}-${index}`,
    name: item.name || "Item",
    quantity: Number(item.quantity) || 1,
    finalPrice: Number(item.finalPrice ?? item.price ?? item.userEstimatedPrice) || 0,
    userEstimatedPrice: Number(item.userEstimatedPrice ?? item.price) || 0,
    note: item.note || "",
    image: item.image || "",
    category: item.category || "",
  }));
}

export default function Order() {
  const { user } = useAuth();
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [listItems, setListItems] = useState([]);
  const [customerNote, setCustomerNote] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeOrder, setActiveOrder] = useState(null);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (user?.phone) {
      setMpesaPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const data = await apiGetCached("/api/vendors/nearby", { ttlMs: 15000 });
        const vendors = Array.isArray(data) ? data : data?.vendors || [];
        const flattened = vendors.flatMap((vendor) =>
          Array.isArray(vendor.inventory)
            ? vendor.inventory.map((item, index) => ({
                _id: item._id || `${vendor._id}-${index}`,
                vendorId: vendor._id || null,
                vendorName: vendor.storeName || "Neighbourhood Rider",
                name: item.name,
                price: Number(item.price) || 0,
                image: item.image || vendor.logo || "",
                category: item.category || vendor.category || "supermarket",
              }))
            : []
        );

        if (flattened.length > 0) {
          setProducts(flattened);
        }
      } catch (error) {
        console.error("Failed to fetch catalog", error);
      }
    };

    const fetchActiveOrder = async () => {
      try {
        const data = await apiFetch("/api/orders/my", { method: "GET" });
        const rows = Array.isArray(data) ? data : [];
        const latest = rows.find((order) => !["CANCELLED", "REFUNDED"].includes(String(order.status || "").toUpperCase()));
        if (latest) setActiveOrder(latest);
      } catch (error) {
        console.error("Failed to fetch active order", error);
      }
    };

    fetchCatalog();
    fetchActiveOrder();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const data = await apiFetch("/api/orders/my", { method: "GET" });
        const rows = Array.isArray(data) ? data : [];
        const latest = rows.find((order) => !["CANCELLED", "REFUNDED"].includes(String(order.status || "").toUpperCase()));
        if (latest) {
          setActiveOrder(latest);
        }
      } catch (error) {
        console.error("Failed to refresh active order", error);
      }
    }, 7000);

    return () => window.clearInterval(intervalId);
  }, []);

  const filteredProducts = products.filter(
    (product) => selectedCategory === "all" || product.category === selectedCategory
  );

  const estimatedTotal = useMemo(() => {
    return listItems.reduce((sum, item) => {
      return sum + (Number(item.userEstimatedPrice || 0) * Number(item.quantity || 1));
    }, 0);
  }, [listItems]);

  const orderStatus = normalizeStatus(activeOrder?.status);
  const activeRequestOpen = activeOrder && !["DELIVERED", "CANCELLED", "REFUNDED"].includes(orderStatus);
  const finalBreakdownItems = buildEditableReviewItems(activeOrder);

  const addToList = (product) => {
    setListItems((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, buildDraftItem(product)];
    });
  };

  const updateListItem = (itemId, field, value) => {
    setListItems((prev) =>
      prev.map((item) =>
        item._id === itemId
          ? {
              ...item,
              [field]: field === "quantity" || field === "userEstimatedPrice"
                ? Math.max(0, Number(value) || 0)
                : value,
            }
          : item
      )
    );
  };

  const removeListItem = (itemId) => {
    setListItems((prev) => prev.filter((item) => item._id !== itemId));
  };

  const submitRequest = async () => {
    if (!listItems.length) return;
    setIsSubmitting(true);

    try {
      const data = await apiFetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: listItems.map((item) => ({
            _id: item._id,
            name: item.name,
            quantity: Math.max(1, Number(item.quantity) || 1),
            price: Number(item.userEstimatedPrice) || 0,
            userEstimatedPrice: Number(item.userEstimatedPrice) || 0,
            note: item.note || "",
            image: item.image || "",
            category: item.category || "",
          })),
          customerNote,
        }),
      });

      setActiveOrder(data.order);
      setListItems([]);
      setCustomerNote("");
      invalidateCache("/api/orders/my");
      window.alert("Shopping request submitted. The rider will review it and send the final price.");
    } catch (error) {
      console.error(error);
      window.alert("Failed to submit shopping request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAndPay = async () => {
    if (!activeOrder?._id) return;
    setIsPaying(true);
    try {
      await apiFetch("/api/orders/pay-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeOrder._id,
          paymentMethod: "mpesa",
          phoneNumber: mpesaPhone,
        }),
      });
      window.alert("STK Push sent. Complete the payment on your phone.");
    } catch (error) {
      console.error(error);
      window.alert(error.message || "Failed to start payment.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!activeOrder?._id) return;
    const proceed = window.confirm("Cancel this shopping request?");
    if (!proceed) return;

    try {
      await apiFetch(`/api/orders/${activeOrder._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "USER_CANCELLED" }),
      });
      setActiveOrder((prev) => (prev ? { ...prev, status: "CANCELLED" } : prev));
      invalidateCache("/api/orders/my");
    } catch (error) {
      console.error(error);
      window.alert("Failed to cancel order.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-riderLight relative">
      <OperatingHoursBanner />
      <Navbar />

      <main className="flex-grow pt-20 md:pt-24 pb-24 md:pb-12 px-3 md:px-6 safe-pad-bottom">
        <div className="max-w-7xl mx-auto grid gap-5 md:gap-8 lg:grid-cols-[1.6fr_0.9fr]">
          <section className="space-y-8">
            <div className="rounded-[1.75rem] md:rounded-3xl bg-white p-4 sm:p-6 md:p-8 border border-gray-100 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-riderLight leading-tight">Assisted Shopping Requests</h1>
                  <p className="text-sm md:text-base text-gray-500 mt-2 max-w-2xl">
                    Build your list, submit it for review, receive a final price from the rider, then confirm and pay with M-Pesa.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 px-4 py-3 bg-gray-50 text-sm self-start md:self-auto">
                  <div className="font-bold text-riderLight">How it works</div>
                  <div className="text-gray-500">Submit list → Rider reviews → You confirm & pay</div>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
                {["all", "supermarket", "food", "drinks"].map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                      selectedCategory === category
                        ? "bg-riderMaroon text-white border-riderMaroon"
                        : "bg-white text-gray-500 border-gray-200 hover:border-riderMaroon/50"
                    }`}
                  >
                    {category === "all" ? "All Items" : category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {filteredProducts.map((product) => (
                  <article
                    key={product._id}
                    className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all"
                  >
                    <div className="h-40 bg-gray-200">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
                      )}
                    </div>
                    <div className="p-4 md:p-5">
                      <div>
                        <h3 className="font-bold text-riderLight text-base md:text-lg leading-snug">{product.name}</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{product.category}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">Add it to your list and set your own estimate in the request panel.</p>
                      <button
                        onClick={() => addToList(product)}
                        className="mt-4 w-full min-h-[46px] bg-riderBlue hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-all"
                      >
                        Add to List
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {activeOrder && (
              <section className="rounded-[1.75rem] md:rounded-3xl bg-white p-4 sm:p-6 md:p-8 border border-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-riderLight">Current Request</h2>
                    <p className="text-gray-500">Order #{String(activeOrder._id).slice(-6).toUpperCase()}</p>
                  </div>
                  <span className="px-4 py-2 rounded-full bg-riderBlue/10 text-riderBlue font-bold text-sm">
                    {orderStatus.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  {[
                    { key: "DRAFT", label: "Draft" },
                    { key: "AWAITING_CONFIRMATION", label: "Awaiting confirmation" },
                    { key: "PAID", label: "Paid" },
                    { key: "SHOPPING", label: "Shopping" },
                    { key: "DELIVERING", label: "Delivering" },
                    { key: "DELIVERED", label: "Delivered" },
                  ].map((step, index, steps) => {
                    const reached = steps.findIndex((item) => item.key === orderStatus);
                    const active = reached >= index;
                    return (
                      <div
                        key={step.key}
                        className={`rounded-2xl border px-3 md:px-4 py-4 text-center ${
                          active ? "bg-riderMaroon text-white border-riderMaroon" : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        <div className="text-[10px] md:text-xs uppercase tracking-wide font-bold mb-2">Step {index + 1}</div>
                        <div className="font-bold text-xs md:text-sm leading-snug">{step.label}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                    <h3 className="font-bold text-riderLight mb-3">Submitted List</h3>
                    <div className="space-y-3">
                      {(activeOrder.items || []).map((item, index) => (
                        <div key={`${activeOrder._id}-submitted-${index}`} className="rounded-xl bg-white border border-gray-100 p-3">
                          <div className="flex justify-between gap-3">
                            <div>
                              <div className="font-bold text-riderLight">{item.name || "Item"}</div>
                              <div className="text-xs text-gray-500">Qty: {item.quantity || 1}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-riderMaroon">KES {Number(item.userEstimatedPrice ?? item.price) || 0}</div>
                              <div className="text-[11px] text-gray-500">user estimate</div>
                            </div>
                          </div>
                          {item.note ? (
                            <div className="mt-2 text-xs text-gray-500">Note: {item.note}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                    <h3 className="font-bold text-riderLight mb-3">Rider Breakdown</h3>
                    {orderStatus === "DRAFT" ? (
                      <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                        Your list is waiting for rider review. Final prices and delivery fee will appear here.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(finalBreakdownItems || []).map((item, index) => (
                          <div key={`${activeOrder._id}-final-${index}`} className="rounded-xl bg-white border border-gray-100 p-3 flex justify-between gap-3">
                            <div>
                              <div className="font-bold text-riderLight">{item.name || "Item"}</div>
                              <div className="text-xs text-gray-500">Qty: {item.quantity || 1}</div>
                            </div>
                            <div className="text-right font-bold text-riderMaroon">
                              KES {(Number(item.finalPrice || 0) * Number(item.quantity || 1))}
                            </div>
                          </div>
                        ))}

                        <div className="pt-3 border-t border-gray-200 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Items total</span>
                            <span className="font-bold text-riderLight">KES {activeOrder.goodsTotal || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Delivery fee</span>
                            <span className="font-bold text-riderLight">KES {activeOrder.deliveryFee || 0}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <span className="font-bold text-riderLight">Final total</span>
                            <span className="font-bold text-riderMaroon">KES {activeOrder.finalTotal || activeOrder.amount || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {activeOrder.customerNote ? (
                  <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4">
                    <h3 className="font-bold text-amber-900 mb-2">Extra Request Note</h3>
                    <p className="text-sm text-amber-800 whitespace-pre-wrap">{activeOrder.customerNote}</p>
                  </div>
                ) : null}

                {orderStatus === "AWAITING_CONFIRMATION" && (
                  <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
                    <h3 className="font-bold text-green-700 mb-2">Confirm & Pay</h3>
                    <p className="text-sm text-gray-600 mb-3">Review the rider-updated total, then confirm payment to proceed.</p>
                    <input
                      type="tel"
                      value={mpesaPhone}
                      onChange={(event) => setMpesaPhone(event.target.value)}
                      placeholder="2547XXXXXXXX"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 mb-3"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={handleConfirmAndPay}
                        disabled={isPaying}
                        className="w-full min-h-[48px] bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold"
                      >
                        {isPaying ? "Sending STK Push..." : `Confirm & Pay KES ${activeOrder.finalTotal || activeOrder.amount || 0}`}
                      </button>
                      <button
                        onClick={handleCancelOrder}
                        className="w-full min-h-[48px] bg-white border border-gray-200 text-riderLight py-3 rounded-xl font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {orderStatus === "DRAFT" && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleCancelOrder}
                      className="min-h-[46px] bg-white border border-gray-200 text-riderLight px-5 py-3 rounded-xl font-bold"
                    >
                      Cancel Request
                    </button>
                  </div>
                )}

                {orderStatus === "DELIVERED" && (
                  <div className="mt-6 rounded-2xl bg-green-50 border border-green-200 p-4 text-sm text-green-700">
                    Delivered successfully.
                    {activeOrder.paidAt ? (
                      <div className="text-xs mt-1 text-green-700/80">Paid at {new Date(activeOrder.paidAt).toLocaleString()}</div>
                    ) : null}
                  </div>
                )}

                {orderStatus === "DELIVERED" && !activeOrder.isReviewed && (
                  <ReviewForm
                    orderId={activeOrder._id}
                    onReviewSubmit={() => {
                      setActiveOrder((prev) => (prev ? { ...prev, isReviewed: true } : prev));
                    }}
                  />
                )}
              </section>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-[1.75rem] md:rounded-3xl bg-white p-4 sm:p-6 border border-gray-100 shadow-sm sticky top-24 md:top-28">
              <h2 className="text-xl md:text-2xl font-bold text-riderLight mb-1">Your List</h2>
              <p className="text-sm text-gray-500 mb-6">Add what you need and send it for rider review.</p>

              {activeRequestOpen ? (
                <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-gray-500 text-sm">
                  You already have an active request. Finish that flow before sending another list.
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {listItems.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-gray-500">
                        Your list is empty.
                      </div>
                    ) : (
                      listItems.map((item) => (
                        <div key={item._id} className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                          <div className="flex justify-between gap-3 items-start">
                            <div className="flex-1">
                              <h3 className="font-bold text-riderLight">{item.name}</h3>
                              <p className="text-xs text-gray-500 mb-3">Set your estimate and add any item note for the rider.</p>
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">Quantity</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(event) => updateListItem(item._id, "quantity", event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">Est. Price</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.userEstimatedPrice}
                                    onChange={(event) => updateListItem(item._id, "userEstimatedPrice", event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">Note</label>
                                <input
                                  type="text"
                                  value={item.note}
                                  onChange={(event) => updateListItem(item._id, "note", event.target.value)}
                                  placeholder="Optional note for the rider"
                                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => removeListItem(item._id)}
                              className="text-xs font-bold text-red-500"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mb-5">
                    <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">Extra Request Note</label>
                    <textarea
                      value={customerNote}
                      onChange={(event) => setCustomerNote(event.target.value)}
                      rows={4}
                      placeholder="Need something not shown above? Tell the rider here, including brands, sizes, or extra household items."
                      className="w-full rounded-2xl border border-gray-200 px-3 py-3"
                    />
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Estimated items total</span>
                      <span className="font-bold text-riderLight">KES {estimatedTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivery fee</span>
                      <span className="font-bold text-riderLight">Added after review</span>
                    </div>
                  </div>

                  <button
                    onClick={submitRequest}
                    disabled={!listItems.length || isSubmitting}
                    className="mt-6 w-full min-h-[50px] bg-riderMaroon hover:bg-rose-700 disabled:opacity-50 text-white py-4 rounded-2xl font-bold transition-all"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </>
              )}
            </section>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
