// Comprehensive E2E & Input Form Test Suite for Bếp Quê
const BASE_URL = "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("   🧪 RUNNING BẾP QUÊ E2E & FORM VALIDATION SUITE      ");
  console.log("=======================================================\n");

  // SECTION 1: API FORM VALIDATION
  console.log("--- 1. API Form Validation Tests ---");

  // 1.1 Missing fullName
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "",
        phoneNumber: "0912345678",
        addressLine: "123 Cầu Giấy",
        districtId: "hn-cau-giay",
        items: [{ productId: "rural-food-01", name: "Cơm Niêu", finalPrice: 75000, quantity: 1 }],
      }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.error.includes("họ và tên"), "Rejects empty full name");
  } catch (err) {
    assert(false, "Rejects empty full name", err.message);
  }

  // 1.2 Missing phoneNumber
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Nguyễn Văn Test",
        phoneNumber: "",
        addressLine: "123 Cầu Giấy",
        districtId: "hn-cau-giay",
        items: [{ productId: "rural-food-01", name: "Cơm Niêu", finalPrice: 75000, quantity: 1 }],
      }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.error.includes("số điện thoại"), "Rejects empty phone number");
  } catch (err) {
    assert(false, "Rejects empty phone number", err.message);
  }

  // 1.3 Missing addressLine
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Nguyễn Văn Test",
        phoneNumber: "0912345678",
        addressLine: "",
        districtId: "hn-cau-giay",
        items: [{ productId: "rural-food-01", name: "Cơm Niêu", finalPrice: 75000, quantity: 1 }],
      }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.error.includes("địa chỉ"), "Rejects empty address");
  } catch (err) {
    assert(false, "Rejects empty address", err.message);
  }

  // 1.4 Empty items array
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Nguyễn Văn Test",
        phoneNumber: "0912345678",
        addressLine: "123 Cầu Giấy",
        districtId: "hn-cau-giay",
        items: [],
      }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.error.includes("chưa có món ăn"), "Rejects empty items array");
  } catch (err) {
    assert(false, "Rejects empty items array", err.message);
  }

  // 1.5 Invalid districtId
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Nguyễn Văn Test",
        phoneNumber: "0912345678",
        addressLine: "123 Cầu Giấy",
        districtId: "invalid-district-xyz",
        items: [{ productId: "rural-food-01", name: "Cơm Niêu", finalPrice: 75000, quantity: 1 }],
      }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.error.includes("Quận/Huyện"), "Rejects invalid districtId");
  } catch (err) {
    assert(false, "Rejects invalid districtId", err.message);
  }

  // SECTION 2: END-TO-END ORDER PLACEMENT FLOWS
  console.log("\n--- 2. End-to-End Order Placement & Pricing Integrity ---");

  let codOrderCode = "";
  let vietQrOrderCode = "";

  // 2.1 Standard COD Order (Hà Nội, Cầu Giấy, Subtotal 75k < 150k threshold => shipping 15k, total 90k)
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Trần Minh Quân",
        phoneNumber: "0988776655",
        email: "quan@example.com",
        addressLine: "Số 48 Ngõ 175 Cầu Giấy",
        city: "Hà Nội",
        districtId: "hn-cau-giay",
        deliveryTimingType: "asap",
        deliveryNote: "Gọi trước 5 phút",
        paymentMethod: "cod",
        codChangeOption: "Cần thối từ 200.000đ",
        items: [
          {
            productId: "rural-food-01",
            name: "Cơm Niêu Cá Bống Kho Tộ",
            finalPrice: 75000,
            quantity: 1,
            spicyNote: "Cay vừa (Chuẩn vị)",
            sweetNote: "Chuẩn vị truyền thống",
            portion: "Phần tiêu chuẩn (1 - 2 người)",
            extras: [{ name: "Thêm niêu cơm cháy giòn rụm", price: 15000 }],
            specialNote: "Nhiều tiêu thơm",
          },
        ],
      }),
    });
    const data = await res.json();
    assert(res.status === 201 && data.success, "Creates COD order successfully");
    assert(data.order && data.order.orderCode.startsWith("BQ-"), "Generates valid BQ order code format");
    assert(data.order.subtotalAmount === 75000, "Subtotal amount is exactly 75,000đ");
    assert(data.order.shippingFee === 15000, "Shipping fee is 15,000đ for Cầu Giấy");
    assert(data.order.totalAmount === 90000, "Total amount is 90,000đ (75k + 15k)");
    assert(data.order.codChangeOption === "Cần thối từ 200.000đ", "Preserves COD change note");
    codOrderCode = data.order.orderCode;
  } catch (err) {
    assert(false, "Standard COD order", err.message);
  }

  // 2.2 VietQR Order with Free Shipping Threshold (TP.HCM, Quận 1, Subtotal 290k > 180k threshold => shipping 0k)
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Lê Thị Mỹ Hạnh",
        phoneNumber: "0903123456",
        addressLine: "125 Lê Lợi, Phường Bến Nghé",
        city: "TP. Hồ Chí Minh",
        districtId: "hcm-quan-1",
        deliveryTimingType: "scheduled",
        scheduledSlot: "12:00 - 12:30 (Bữa trưa hôm nay)",
        deliveryNote: "Giao lễ tân tòa nhà",
        paymentMethod: "vietqr",
        items: [
          {
            productId: "rural-food-02",
            name: "Cá Lóc Nướng Trui Miền Tây",
            finalPrice: 145000,
            quantity: 2,
          },
        ],
      }),
    });
    const data = await res.json();
    assert(res.status === 201 && data.success, "Creates VietQR scheduled order");
    assert(data.order.subtotalAmount === 290000, "Subtotal is 290,000đ (145k x 2)");
    assert(data.order.shippingFee === 0, "Free shipping applied (Subtotal > 180k threshold)");
    assert(data.order.totalAmount === 290000, "Total amount is 290,000đ without shipping fee");
    assert(data.order.paymentMethod === "vietqr", "Payment method correctly stored as vietqr");
    vietQrOrderCode = data.order.orderCode;
  } catch (err) {
    assert(false, "VietQR Order with Free Shipping", err.message);
  }

  // 2.3 Coupon FOODIE99 (Free Shipping on any subtotal)
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Phạm Hoàng",
        phoneNumber: "0918776655",
        addressLine: "88 Láng Hạ",
        city: "Hà Nội",
        districtId: "hn-dong-da",
        deliveryTimingType: "asap",
        paymentMethod: "cod",
        couponCode: "FOODIE99",
        items: [
          {
            productId: "rural-food-04",
            name: "Canh Cua Đồng Rau Đay Cà Pháo",
            finalPrice: 55000,
            quantity: 1,
          },
        ],
      }),
    });
    const data = await res.json();
    assert(res.status === 201 && data.success, "Creates order with FOODIE99 voucher");
    assert(data.order.shippingFee === 0, "FOODIE99 correctly waives shipping fee to 0đ");
    assert(data.order.totalAmount === 55000, "Total equals subtotal 55,000đ with free shipping");
  } catch (err) {
    assert(false, "Coupon FOODIE99", err.message);
  }

  // 2.4 Coupon BEPQUE20 (-20k discount for orders >= 100k)
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Võ Mai Trang",
        phoneNumber: "0934556677",
        addressLine: "12 Phan Chu Trinh",
        city: "Hà Nội",
        districtId: "hn-hoan-kiem",
        deliveryTimingType: "asap",
        paymentMethod: "vietqr",
        couponCode: "BEPQUE20",
        items: [
          {
            productId: "rural-food-01",
            name: "Cơm Niêu Cá Bống Kho Tộ",
            finalPrice: 75000,
            quantity: 2, // 150k subtotal > 100k threshold
          },
        ],
      }),
    });
    const data = await res.json();
    assert(res.status === 201 && data.success, "Creates order with BEPQUE20 voucher");
    assert(data.order.discountAmount === 20000, "Applies exactly 20,000đ discount");
    // Hoan Kiem shipping is 30,000. Subtotal 150k < 300k threshold. Total = 150k + 30k - 20k = 160,000đ
    assert(data.order.totalAmount === 160000, "Total is 160,000đ (150k subtotal + 30k ship - 20k discount)");
  } catch (err) {
    assert(false, "Coupon BEPQUE20", err.message);
  }

  // SECTION 3: ORDER QUERY & TRACKING
  console.log("\n--- 3. Order Query & Tracking Tests ---");

  // 3.1 Tracking existing order
  try {
    const res = await fetch(`${BASE_URL}/api/orders?code=${codOrderCode}`);
    const data = await res.json();
    assert(res.status === 200 && data.success, "Finds order by tracking code");
    assert(data.order.recipientName === "Trần Minh Quân", "Tracking returns correct recipient name");
    assert(data.order.items.length === 1, "Tracking returns correct item list");
    assert(data.order.items[0].specialNote === "Nhiều tiêu thơm", "Tracking retains chef special note");
  } catch (err) {
    assert(false, "Tracking existing order", err.message);
  }

  // 3.2 Tracking VietQR order
  try {
    const res = await fetch(`${BASE_URL}/api/orders?code=${vietQrOrderCode}`);
    const data = await res.json();
    assert(res.status === 200 && data.success, "Finds VietQR order by tracking code");
    assert(data.order.paymentMethod === "vietqr", "Tracking confirms VietQR payment");
  } catch (err) {
    assert(false, "Tracking VietQR order", err.message);
  }

  // 3.2 Tracking non-existent order
  try {
    const res = await fetch(`${BASE_URL}/api/orders?code=BQ-NONEXISTENT-9999`);
    const data = await res.json();
    assert(res.status === 404 && !data.success, "Returns 404 for invalid order code");
    assert(data.error.includes("Không tìm thấy"), "Returns polite error message");
  } catch (err) {
    assert(false, "Tracking non-existent order", err.message);
  }

  // 3.3 Query all orders
  try {
    const res = await fetch(`${BASE_URL}/api/orders`);
    const data = await res.json();
    assert(res.status === 200 && data.success, "Queries all stored orders");
    assert(Array.isArray(data.orders) && data.orders.length >= 4, "Orders collection contains recent orders");
  } catch (err) {
    assert(false, "Query all orders", err.message);
  }

  // SECTION 4: FRONTEND ROUTES INTEGRITY
  console.log("\n--- 4. Frontend Route & Page Rendering Integrity ---");

  const routes = [
    { path: "/", name: "Homepage" },
    { path: "/checkout", name: "Checkout Page" },
    { path: "/tracking", name: "Tracking Page" },
    { path: `/tracking?code=${codOrderCode}`, name: "Tracking With Query Code" },
    { path: "/products/rural-food-01", name: "Product Detail (rural-food-01)" },
    { path: "/products/rural-food-02", name: "Product Detail (rural-food-02)" },
    { path: "/products/rural-food-03", name: "Product Detail (rural-food-03)" },
  ];

  for (const r of routes) {
    try {
      const res = await fetch(`${BASE_URL}${r.path}`);
      assert(res.status === 200, `Page renders 200 OK: ${r.name}`);
    } catch (err) {
      assert(false, `Page renders 200 OK: ${r.name}`, err.message);
    }
  }

  // 4.x Non-existent product -> 404
  try {
    const res = await fetch(`${BASE_URL}/products/non-existent-food-id`);
    assert(res.status === 404, "Invalid product returns 404 Not Found");
  } catch (err) {
    assert(false, "Invalid product returns 404 Not Found", err.message);
  }

  console.log("\n=======================================================");
  console.log(`   🏁 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
