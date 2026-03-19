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

function computeDeliveryFee(hour, isRaining) {
  if (hour >= 6 && hour < 9) return isRaining ? 120 : 100;
  if (hour >= 9 && hour < 17) return isRaining ? 70 : 50;
  if (hour >= 18 && hour < 22) return isRaining ? 120 : 100;
  return isRaining ? 120 : 100;
}

function normalizeStatus(status) {
  const raw = String(status || "").toUpperCase();
  if (["CREATED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED"].includes(raw)) return "PAYMENT_PENDING";
  if (["PAID", "VENDOR_ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "PENDING_RIDER", "RIDER_ASSIGNED", "PROCESSING"].includes(raw)) return "PROCESSING";
  if (raw === "ON_THE_WAY") return "ON_THE_WAY";
  if (raw === "DELIVERED") return "DELIVERED";
  if (raw === "CANCELLED") return "CANCELLED";
  if (raw === "REFUNDED") return "REFUNDED";
  return raw;
}

export default function Order() {
  const { user } = useAuth();
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [cartVendorId, setCartVendorId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeOrder, setActiveOrder] = useState(null);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [weatherMode, setWeatherMode] = useState("sunny");
  const [serverHour, setServerHour] = useState(9);

  useEffect(() => {
    if (user?.phone) {
      setMpesaPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    const fetchSystemContext = async () => {
      try {
        const data = await apiGetCached("/api/system/time", { ttlMs: 15000 });
        if (typeof data.hour === "number") setServerHour(data.hour);
        if (data.isRaining === true) setWeatherMode("rainy");
        if (data.isRaining === false) setWeatherMode("sunny");
      } catch (error) {
        console.error("Failed to fetch system context", error);
      }
    };

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
                vendorLocation: vendor.location?.coordinates || null,
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
        const latest = rows.find((order) => !["DELIVERED", "CANCELLED", "REFUNDED"].includes(String(order.status || "").toUpperCase()));
        if (latest) setActiveOrder(latest);
      } catch (error) {
        console.error("Failed to fetch active order", error);
      }
    };

    fetchSystemContext();
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

  const deliveryFee = useMemo(
    () => computeDeliveryFee(serverHour, weatherMode === "rainy"),
    [serverHour, weatherMode]
  );
  const itemsTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  const finalTotal = itemsTotal + deliveryFee;

  const filteredProducts = products.filter(
    (product) => selectedCategory === "all" || product.category === selectedCategory
  );

  const addToCart = (product) => {
    if (cartVendorId && product.vendorId && cartVendorId !== product.vendorId) {
      const shouldReset = window.confirm("This MVP processes one store basket at a time. Clear the current cart and continue?");
      if (!shouldReset) return;
      setCart([]);
    }

    setCartVendorId(product.vendorId || null);
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, direction) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item._id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + direction) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const placeOrder = async () => {
    if (!cart.length) return;
    setIsSubmitting(true);

    try {
      const selectedVendor = cart.find((item) => item.vendorId) || {};
      const data = await apiFetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: selectedVendor.vendorId || null,
          items: cart.map((item) => ({
            _id: item._id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            category: item.category,
          })),
          address: "Ruaka - Gathigi Estate",
          pickupLng: selectedVendor.vendorLocation?.[0] || 36.7383,
          pickupLat: selectedVendor.vendorLocation?.[1] || -1.2667,
          dropoff: { address: "Ruaka - Gathigi Estate" },
          dropoffLat: -1.2667,
          dropoffLng: 36.7383,
        }),
      });

      setActiveOrder(data.order);
      setCart([]);
      setCartVendorId(null);
      invalidateCache("/api/orders/my");
      window.alert("Order created. Complete the M-Pesa payment to continue.");
    } catch (error) {
      console.error(error);
      window.alert("Failed to create order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMpesaPayment = async () => {
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
      window.alert("Failed to start M-Pesa payment.");
    } finally {
      setIsPaying(false);
    }
  };

  const currentStatus = normalizeStatus(activeOrder?.status);

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
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-riderLight leading-tight">Grocery & Food Delivery</h1>
                  <p className="text-sm md:text-base text-gray-500 mt-2 max-w-2xl">
                    Add items quickly, pay by M-Pesa, and follow every delivery update from your phone.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 px-4 py-3 bg-gray-50 text-sm self-start md:self-auto">
                  <div className="font-bold text-riderLight">
                    Weather: {weatherMode === "rainy" ? "Rainy" : "Sunny"}
                  </div>
                  <div className="text-gray-500">Estimated delivery fee: KES {deliveryFee}</div>
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
                      <div className="flex justify-between gap-3 items-start">
                        <div>
                          <h3 className="font-bold text-riderLight text-base md:text-lg leading-snug">{product.name}</h3>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">{product.category}</p>
                        </div>
                        <span className="text-riderMaroon font-bold">KES {product.price}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        {product.vendorName || "Neighbourhood Rider"} • Ruaka - Gathigi Estate
                      </p>
                      <button
                        onClick={() => addToCart(product)}
                        className="mt-4 w-full min-h-[46px] bg-riderBlue hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-all"
                      >
                        Add to Cart
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
                    <h2 className="text-2xl font-bold text-riderLight">Order Tracking</h2>
                    <p className="text-gray-500">Order #{String(activeOrder._id).slice(-6).toUpperCase()}</p>
                  </div>
                  <span className="px-4 py-2 rounded-full bg-riderBlue/10 text-riderBlue font-bold text-sm">
                    {currentStatus.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: "PAYMENT_PENDING", label: "Paid" },
                    { key: "PROCESSING", label: "Processing" },
                    { key: "ON_THE_WAY", label: "On the way" },
                    { key: "DELIVERED", label: "Delivered" },
                  ].map((step, index, steps) => {
                    const reached = steps.findIndex((item) => item.key === currentStatus);
                    const active = reached >= index || (currentStatus === "PAYMENT_PENDING" && index === 0);
                    return (
                      <div
                        key={step.key}
                        className={`rounded-2xl border px-3 md:px-4 py-4 md:py-5 text-center ${
                          active ? "bg-riderMaroon text-white border-riderMaroon" : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        <div className="text-xs uppercase tracking-wide font-bold mb-2">Step {index + 1}</div>
                        <div className="font-bold text-sm md:text-base leading-snug">{step.label}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-2xl bg-gray-50 p-5 border border-gray-100">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Items total</span>
                    <span className="font-bold text-riderLight">KES {activeOrder.goodsTotal || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Delivery fee</span>
                    <span className="font-bold text-riderLight">KES {activeOrder.deliveryFee || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="font-bold text-riderLight">Total paid</span>
                    <span className="font-bold text-riderMaroon">KES {activeOrder.amount || 0}</span>
                  </div>
                </div>

                {currentStatus === "DELIVERED" && !activeOrder.isReviewed && (
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
              <h2 className="text-xl md:text-2xl font-bold text-riderLight mb-1">Cart Summary</h2>
              <p className="text-sm text-gray-500 mb-6">Service area: Ruaka, Gathigi Estate only.</p>

              <div className="space-y-3 mb-5">
                {cart.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-gray-500">
                    Your cart is empty.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item._id} className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                      <div className="flex justify-between gap-3 items-start">
                        <div>
                          <h3 className="font-bold text-riderLight">{item.name}</h3>
                          <p className="text-xs text-gray-500">KES {item.price} each</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-riderMaroon">KES {item.price * item.quantity}</div>
                          <div className="flex items-center gap-2 mt-2 justify-end">
                            <button onClick={() => updateQuantity(item._id, -1)} className="w-9 h-9 rounded-full bg-white border border-gray-200 font-bold">-</button>
                            <span className="font-bold text-riderLight">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item._id, 1)} className="w-9 h-9 rounded-full bg-white border border-gray-200 font-bold">+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Items total</span>
                  <span className="font-bold text-riderLight">KES {itemsTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery fee</span>
                  <span className="font-bold text-riderLight">KES {deliveryFee}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <span className="font-bold text-riderLight">Final total</span>
                  <span className="font-bold text-riderMaroon">KES {finalTotal}</span>
                </div>
              </div>

              <button
                onClick={placeOrder}
                disabled={!cart.length || isSubmitting}
                className="mt-6 w-full min-h-[50px] bg-riderMaroon hover:bg-rose-700 disabled:opacity-50 text-white py-4 rounded-2xl font-bold transition-all"
              >
                {isSubmitting ? "Creating Order..." : "Checkout with M-Pesa"}
              </button>

              {activeOrder && !activeOrder.paid && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
                  <h3 className="font-bold text-green-700 mb-2">Complete payment</h3>
                  <p className="text-sm text-gray-600 mb-3">Pay the full order total before processing starts.</p>
                  <input
                    type="tel"
                    value={mpesaPhone}
                    onChange={(event) => setMpesaPhone(event.target.value)}
                    placeholder="2547XXXXXXXX"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 mb-3"
                  />
                  <button
                    onClick={handleMpesaPayment}
                    disabled={isPaying}
                    className="w-full min-h-[48px] bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold"
                  >
                    {isPaying ? "Sending STK Push..." : `Pay KES ${activeOrder.amount || finalTotal}`}
                  </button>
                </div>
              )}
            </section>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
