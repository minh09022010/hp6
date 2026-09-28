// ============================================================
// wallet.js - Ví nạp tiền + Top Contribution + Payment khóa học
// Thuật toán:
// - Người dùng nạp tiền qua chuyển khoản (QR / số tài khoản).
//   Họ bấm "Tôi đã chuyển khoản" -> tạo doc trong collection
//   "deposits" với status "pending" (chờ admin duyệt).
// - Admin duyệt trong trang Quản trị -> status "approved" ->
//   cộng vào tổng đã nạp của user (users.wallet.totalDeposited).
// - Mua khóa học trả phí: trừ số dư ví (balance = tổng nạp đã duyệt -
//   tổng đã tiêu). Miễn phí thì ghi danh thẳng.
// - Top Contribution: xếp hạng theo TỔNG TIỀN ĐÃ NẠP (quá khứ đến
//   hiện tại), đọc từ users.*.wallet.totalDeposited.
// Nhúng: firebase-*.js -> firebase-config.js -> auth.js -> wallet.js
// (wallet.js PHẢI nhúng trước các trang dùng: pricing.js, admin.js,
//  courses.js, course-detail.js)
// ============================================================

// ---------- Hằng số tài khoản nhận tiền (SỬA Ở ĐÂY) ----------
// ⚠️ Thay thông tin thật của bạn vào 2 dòng dưới, và thay file ảnh QR
//    images/qr-payment.png bằng ảnh QR thật của bạn.
const WALLET_BANK_NAME = "Vietcombank";     // Tên ngân hàng
const WALLET_ACCOUNT_NO = "0123456789";     // Số tài khoản nhận tiền
const WALLET_ACCOUNT_NAME = "NGUYEN VAN A"; // Tên chủ tài khoản
const WALLET_QR_IMAGE = "images/qr-payment.png"; // Ảnh QR chuyển khoản

// ---------- Helper ----------
function vnd(n) {
  return Number(n || 0).toLocaleString("vi-VN") + "₫";
}

// Đọc ví của user từ 1 doc users (d.topUp và d.wallet đều hỗ trợ)
// balance = tổng nạp (đã duyệt) + điều chỉnh thủ công (âm/dương) - tổng đã tiêu
function readWallet(d) {
  d = d || {};
  const w = d.wallet || d.topUp || {};
  const deposited = num(w.totalDeposited, 0);
  const spent = num(w.totalSpent, 0);
  const adjustment = num(w.adjustment, 0);
  return { totalDeposited: deposited, totalSpent: spent, adjustment, balance: deposited + adjustment - spent };
}

// Tổng tiền đã nạp (đã duyệt) của 1 user — dùng cho Top Contribution
function userTotalDeposited(u) {
  return num(u && (u.totalDeposited !== undefined ? u.totalDeposited : readWallet(u).totalDeposited), 0);
}

// ---------- Nạp tiền (tạo yêu cầu chờ duyệt) ----------
// Trả về { ok: true } hoặc { ok: false, error }
async function requestDeposit(amount, note) {
  const user = getCurrentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập để nạp tiền." };
  if (!db) return { ok: false, error: "Firestore chưa được cấu hình." };

  const value = Math.floor(Number(amount) || 0);
  if (!value || value < 10000) return { ok: false, error: "Số tiền nạp tối thiểu 10.000₫." };
  if (value > 100000000) return { ok: false, error: "Số tiền nạp tối đa 100.000.000₫ mỗi lần." };

  try {
    await db.collection("deposits").add({
      userId: user.id,
      userEmail: user.email || "",
      userName: `${user.lastname || ""} ${user.firstname || ""}`.trim(),
      amount: value,
      status: "pending", // chờ admin duyệt
      note: String(note || "").slice(0, 200),
      createdAt: new Date().toISOString(),
      processedAt: null,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Không tạo được yêu cầu nạp tiền: " + (e.code || e.message) };
  }
}

// Danh sách yêu cầu nạp của chính user hiện tại
async function fetchMyDeposits() {
  const user = getCurrentUser();
  if (!user || !db) return [];
  try {
    const snap = await db.collection("deposits").where("userId", "==", user.id).get();
    const list = [];
    snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return list;
  } catch (e) {
    console.warn("[wallet] Không đọc được deposits:", e.code);
    return [];
  }
}

// ---------- ADMIN: duyệt / từ chối yêu cầu nạp ----------
// Duyệt: đặt status approved + cộng totalDeposited vào hồ sơ user.
// Cờ "credited" đánh dấu ĐÃ cộng tiền vào ví -> tránh cộng 2 lần,
// nhưng cho phép DUỆT LẠI các yêu cầu bị kẹt (approved từ bản code lỗi
// chưa cộng tiền) để tự chữa lỗi: approved && !credited -> cộng lại được.
async function approveDeposit(depositId) {
  if (!db) return { ok: false, error: "Firestore chưa được cấu hình." };
  try {
    const ref = db.collection("deposits").doc(depositId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "Không tìm thấy yêu cầu nạp." };
    const d = snap.data();
    if (d.credited) return { ok: false, error: "Yêu cầu này đã được duyệt VÀ cộng tiền rồi." };

    // Đánh dấu đã duyệt (nếu chưa)
    if (d.status !== "approved") {
      await ref.update({
        status: "approved",
        processedAt: new Date().toISOString(),
        processedBy: (getCurrentUser() || {}).email || "",
      });
    }

    // Cộng tổng nạp vào hồ sơ user (transaction: đọc số dư hiện tại rồi cộng)
    try {
      await db.runTransaction(async (tx) => {
        const userRef = db.collection("users").doc(d.userId);
        const userDoc = await tx.get(userRef);
        const w = userDoc.exists
          ? readWallet(userDoc.data())
          : { totalDeposited: 0, totalSpent: 0, adjustment: 0, balance: 0 };
        tx.set(
          userRef,
          { wallet: { totalDeposited: w.totalDeposited + num(d.amount, 0) } },
          { merge: true }
        );
      });
    } catch (e) {
      // Ghi ví bị chặn (rules/mạng) -> báo lỗi rõ, yêu cầu vẫn "approved nhưng chưa
      // credited" nên admin bấm Duyệt lại là cộng tiếp (không mất yêu cầu)
      return {
        ok: false,
        error:
          "Đã duyệt yêu cầu nhưng KHÔNG cộng được tiền vào ví (Firestore chặn ghi: " +
          (e.code || e.message) +
          "). Bấm \"Duyệt\" lại để thử thêm lần nữa, hoặc dùng nút \"Ví\" ở tab Người dùng để cộng thủ công.",
      };
    }

    // Đánh dấu đã cộng tiền (tránh cộng 2 lần)
    try {
      await ref.update({ credited: true, creditedAt: new Date().toISOString() });
    } catch (e) {
      /* Không sao: lần duyệt sau sẽ tự kiểm tra */
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Không duyệt được: " + (e.code || e.message) };
  }
}

// Từ chối: đặt status rejected
async function rejectDeposit(depositId) {
  if (!db) return { ok: false, error: "Firestore chưa được cấu hình." };
  try {
    await db.collection("deposits").doc(depositId).update({
      status: "rejected",
      processedAt: new Date().toISOString(),
    });
  } catch (e) {
    return { ok: false, error: "Không từ chối được: " + (e.code || e.message) };
  }
  return { ok: true };
}

// ---------- ADMIN: điều chỉnh số dư thủ công ----------
// amount dương = cộng tiền, âm = trừ tiền.
// Ghi vào wallet.adjustment (KHÔNG đụng totalDeposited -> Top Contribution không bị ảnh hưởng)
// + ghi 1 dòng vào collection "wallet-adjustments" để theo dõi ai chỉnh lúc nào.
// Nếu Firestore CHẶN ghi vào users -> vẫn lưu vào sổ với applied:false, và
// effectiveWalletForUser() sẽ tự cộng phần này vào số dư người dùng (không mất tiền).
async function adminAdjustBalance(userId, amount, note) {
  if (!db) return { ok: false, error: "Firestore chưa được cấu hình." };
  const value = Math.floor(Number(amount) || 0);
  if (!value) return { ok: false, error: "Số tiền điều chỉnh phải khác 0 (âm để trừ, dương để cộng)." };
  if (Math.abs(value) > 100000000) return { ok: false, error: "Mỗi lần điều chỉnh tối đa 100.000.000₫." };

  try {
    const userRef = db.collection("users").doc(userId);
    const snap = await userRef.get();
    if (!snap.exists) return { ok: false, error: "Không tìm thấy hồ sơ người dùng này." };

    // Dùng số dư HIỆU QUẢ (gồm nạp đã duyệt chưa kịp cộng + điều chỉnh kẹt)
    // làm gốc -> cộng/trừ luôn đúng với con số người dùng đang thấy
    const raw = readWallet(snap.data());
    const w = await effectiveWalletForUser(userId, raw);

    // newAdjustment đã bao gồm các điều chỉnh kẹt (applied:false) trước đó
    const newAdjustment = w.adjustment + value;
    const newBalance = w.totalDeposited + newAdjustment - w.totalSpent;
    if (newBalance < 0) {
      return { ok: false, error: `Điều chỉnh này sẽ làm số dư thành ${vnd(newBalance)} (âm). Hãy giảm mức trừ.` };
    }

    try {
      await userRef.set({ wallet: { adjustment: newAdjustment } }, { merge: true });

      // Ghi thành công -> các điều chỉnh kẹt trước giờ đã nằm trong adjustment mới,
      // đánh dấu applied:true để không bị cộng 2 lần
      await markAdjustmentsApplied(userId);

      await db.collection("wallet-adjustments").add({
        userId,
        userEmail: d_email(snap.data()),
        userName: userNameOf(snap.data()),
        amount: value,
        adjustmentAfter: newAdjustment,
        balanceAfter: newBalance,
        note: String(note || "").slice(0, 200),
        createdBy: (getCurrentUser() || {}).email || "",
        createdAt: new Date().toISOString(),
        applied: true,
      });
      return { ok: true, balanceAfter: newBalance };
    } catch (writeErr) {
      // users bị chặn ghi (rules/mạng) -> vẫn lưu sổ với applied:false,
      // fetchMyBalance sẽ tự cộng vào số dư người dùng thấy
      try {
        await db.collection("wallet-adjustments").add({
          userId,
          userEmail: d_email(snap.data()),
          userName: userNameOf(snap.data()),
          amount: value,
          adjustmentAfter: newAdjustment,
          balanceAfter: newBalance,
          note: String(note || "").slice(0, 200),
          createdBy: (getCurrentUser() || {}).email || "",
          createdAt: new Date().toISOString(),
          applied: false,
          blockedReason: String(writeErr.code || writeErr.message || ""),
        });
        return {
          ok: true,
          balanceAfter: newBalance,
          warning:
            "Firestore đang CHẶN ghi vào hồ sơ người dùng (" + (writeErr.code || writeErr.message) +
          "). Điều chỉnh VẪN ĐƯỢC TÍNH (qua sổ điều chỉnh) — số dư sẽ tự khớp hoàn toàn khi quyền ghi được mở.",
        };
      } catch (e2) {
        return { ok: false, error: "Không điều chỉnh được số dư: " + (writeErr.code || writeErr.message) };
      }
    }
  } catch (e) {
    return { ok: false, error: "Không điều chỉnh được số dư: " + (e.code || e.message) };
  }
}

function d_email(d) {
  return (d && d.email) || "";
}
function userNameOf(d) {
  return `${(d && d.lastname) || ""} ${(d && d.firstname) || ""}`.trim() || (d && d.email) || "";
}

// Đánh dấu mọi điều chỉnh kẹt (applied:false) của 1 user là đã áp dụng
async function markAdjustmentsApplied(userId) {
  try {
    const snap = await db.collection("wallet-adjustments").where("userId", "==", userId).get();
    const updates = [];
    snap.forEach((doc) => {
      if (doc.data().applied === false) {
        updates.push(doc.ref.update({ applied: true, appliedAt: new Date().toISOString() }));
      }
    });
    await Promise.all(updates);
  } catch (e) {
    /* bỏ qua: lần điều chỉnh sau sẽ tự thử lại */
  }
}

// Đọc ví 1 user bất kỳ (dùng admin hiện số dư trước khi điều chỉnh)
// Số dư HIỆU QUẢ = ví hồ sơ + nạp đã duyệt chưa kịp cộng + điều chỉnh kẹt (applied:false)
async function fetchUserWallet(userId) {
  if (!db || !userId) return null;
  try {
    const doc = await db.collection("users").doc(userId).get();
    if (!doc.exists) return null;
    return await effectiveWalletForUser(userId, readWallet(doc.data()));
  } catch (e) {
    return null;
  }
}

// Lịch sử điều chỉnh gần đây (mới nhất trước)
async function fetchRecentAdjustments(limit) {
  if (!db) return [];
  try {
    const snap = await db.collection("wallet-adjustments").get();
    const list = [];
    snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return list.slice(0, limit || 10);
  } catch (e) {
    console.warn("[wallet] Không đọc được wallet-adjustments:", e.code);
    return [];
  }
}

// ---------- Số dư ví của user hiện tại ----------
// Số dư HIỂN THỊ = ví trên hồ sơ + các yêu cầu nạp ĐÃ DUYỆT nhưng chưa kịp
// cộng vào hồ sơ (credited != true) + các điều chỉnh thủ công bị KẸT (sổ
// wallet-adjustments có applied:false). Nhờ vậy "số dư" luôn khớp với lịch sử
// nạp và các thưởng sự kiện do admin cộng, ngay cả khi ghi vào users bị chặn.
// totalDeposited trả về cũng đã bao gồm phần nạp kẹt -> Top Contribution khớp luôn.
async function fetchMyBalance() {
  const user = getCurrentUser();
  if (!user || !db) return { totalDeposited: 0, totalSpent: 0, adjustment: 0, balance: 0 };
  try {
    const doc = await db.collection("users").doc(user.id).get();
    const w = doc.exists
      ? readWallet(doc.data())
      : { totalDeposited: 0, totalSpent: 0, adjustment: 0, balance: 0 };
    return await effectiveWalletForUser(user.id, w);
  } catch (e) {
    console.warn("[wallet] Không đọc được ví:", e.code);
    return { totalDeposited: 0, totalSpent: 0, adjustment: 0, balance: 0 };
  }
}

// Tính số dư HIỆU QUẢ của 1 user:
//   raw (readWallet hồ sơ) + deposits "approved" chưa credited + wallet-adjustments applied:false
// Đây là HÀM GỐC — fetchMyBalance / fetchUserWallet / adminAdjustBalance đều đi qua đây
// để mọi nơi thấy CÙNG MỘT con số.
async function effectiveWalletForUser(userId, raw) {
  let uncredited = 0; // nạp đã duyệt nhưng chưa cộng vào hồ sơ
  try {
    const snap = await db.collection("deposits").where("userId", "==", userId).get();
    snap.forEach((doc2) => {
      const d = doc2.data();
      if (d.status === "approved" && d.credited !== true) uncredited += num(d.amount, 0);
    });
  } catch (e2) {
    /* không đọc được deposits -> bỏ qua */
  }

  let stuckAdjust = 0; // điều chỉnh thủ công bị kẹt (chưa ghi được vào users)
  try {
    const snap2 = await db.collection("wallet-adjustments").where("userId", "==", userId).get();
    snap2.forEach((doc3) => {
      const a = doc3.data();
      if (a.applied === false) stuckAdjust += num(a.amount, 0);
    });
  } catch (e3) {
    /* không đọc được sổ -> bỏ qua */
  }

  const bonus = uncredited + stuckAdjust;
  if (bonus > 0) {
    raw.totalDeposited += uncredited;
    raw.adjustment += stuckAdjust;
    raw.balance += bonus;
  }
  return raw;
}

// ---------- Mua khóa học bằng ví ----------
// Miễn phí (price <= 0): ghi danh thẳng.
// Trả phí: trừ số dư (tăng wallet.totalSpent) rồi ghi danh trong 1 lượt.
async function purchaseCourse(course) {
  const user = getCurrentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập trước khi mua." };
  if (!db) return { ok: false, error: "Firestore chưa được cấu hình." };
  if (!course || !course.id) return { ok: false, error: "Không xác định được khóa học." };

  const price = num(course.price, 0);
  const docId = `${user.id}_${course.id}`;

  try {
    const ref = db.collection("enrollments").doc(docId);
    const snap = await ref.get();
    if (snap.exists) return { ok: false, error: "Bạn đã sở hữu khóa học này rồi.", already: true };

    if (price <= 0) {
      // Miễn phí: ghi danh thẳng (tái dùng enrollInCourse trong auth.js)
      const res = await enrollInCourse(course.id, course);
      return res.ok ? { ok: true, free: true } : res;
    }

    // Trả phí: kiểm tra + trừ tiền
    const userRef = db.collection("users").doc(user.id);
    const userSnap = await userRef.get();
    const w = userSnap.exists ? readWallet(userSnap.data()) : { totalDeposited: 0, totalSpent: 0, adjustment: 0, balance: 0 };
    // Dùng số dư HIỂN THỊ (fetchMyBalance) để khớp với lịch sử nạp:
    // gồm cả yêu cầu đã duyệt nhưng chưa kịp cộng vào hồ sơ
    const eff = await fetchMyBalance();
    if (eff.balance < price) {
      return { ok: false, error: `Số dư ví không đủ. Cần ${vnd(price)} nhưng bạn chỉ có ${vnd(eff.balance)}. Hãy nạp thêm ở trang Nạp tiền.` };
    }

    // Ghi enrollment + trừ tiền (2 lượt vì Firestore compat client không có transaction helper thuận tiện)
    await ref.set({
      userId: user.id,
      userEmail: user.email || "",
      userName: `${user.lastname || ""} ${user.firstname || ""}`.trim(),
      courseId: course.id,
      courseTitle: course.title || "",
      teacherId: course.teacherId || "",
      paidAmount: price,
      paymentMethod: "wallet",
      enrolledAt: new Date().toISOString(),
    });
    await userRef.set(
      { wallet: { totalSpent: w.totalSpent + price } },
      { merge: true }
    );
    return { ok: true, free: false, charged: price };
  } catch (e) {
    return { ok: false, error: "Không mua được khóa học: " + (e.code || e.message) };
  }
}

// Kiểm tra user hiện tại đã sở hữu khóa học (đã ghi danh) chưa — tái dùng auth.js
// (isEnrolledInCourse đã có trong auth.js, không định nghĩa lại)

// ---------- Top Contribution (xếp hạng theo tổng tiền đã nạp) ----------
// Đọc TOÀN BỘ users, lấy top N theo totalDeposited (chỉ đếm > 0)
async function fetchTopContributors(limit) {
  if (!db) return [];
  try {
    const snap = await db.collection("users").get();
    const list = [];
    snap.forEach((doc) => {
      const d = doc.data();
      const total = userTotalDeposited(d);
      if (total > 0) {
        list.push({
          id: doc.id,
          name: `${d.lastname || ""} ${d.firstname || ""}`.trim() || d.email || "Ẩn danh",
          avatar: d.avatar || "",
          totalDeposited: total,
        });
      }
    });
    // Đếm tổng số người trong toàn hệ thống để pricing.js biết còn thiếu hạng hay không
    window.totalUserCount = snap.size;
    list.sort((a, b) => b.totalDeposited - a.totalDeposited);
    return list;
  } catch (e) {
    console.warn("[wallet] Không đọc được top contribution:", e.code);
    return [];
  }
}

// ---------- QR modal dùng chung (nạp tiền từ mọi trang) ----------
function openWalletModal() {
  let modal = document.getElementById("wallet-qr-modal");

  // Tạo modal động nếu trang chưa có sẵn trong HTML
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "wallet-modal";
    modal.id = "wallet-qr-modal";
    modal.innerHTML = `
      <div class="wallet-modal-box">
        <button class="wallet-modal-close" title="Đóng"><i class="fas fa-times"></i></button>
        <h3><i class="fas fa-wallet"></i> Nạp tiền vào ví</h3>
        <p class="wallet-modal-hint">Chuyển khoản đến tài khoản bên dưới, sau đó bấm <strong>"Tôi đã chuyển khoản"</strong> và chờ quản trị viên xác nhận.</p>

        <div class="wallet-modal-body">
          <img class="wallet-qr-img" src="${WALLET_QR_IMAGE}" alt="Mã QR chuyển khoản" />
          <div class="wallet-info">
            <div class="wallet-info-row"><span>Ngân hàng</span><strong>${WALLET_BANK_NAME}</strong></div>
            <div class="wallet-info-row">
              <span>Số tài khoản</span>
              <strong class="wallet-stk">${WALLET_ACCOUNT_NO}</strong>
              <button class="wallet-copy-btn" id="wallet-copy-stk" title="Copy số tài khoản"><i class="far fa-copy"></i> Copy</button>
            </div>
            <div class="wallet-info-row"><span>Chủ tài khoản</span><strong>${WALLET_ACCOUNT_NAME}</strong></div>
            <div class="wallet-info-row"><span>Số tiền</span><strong id="wallet-amount-display">—</strong></div>
          </div>
        </div>

        <div class="wallet-amount-picker">
          <label>Số tiền muốn nạp (₫)</label>
          <div class="wallet-quick-amounts">
            <button type="button" data-amount="50000">50K</button>
            <button type="button" data-amount="100000">100K</button>
            <button type="button" data-amount="200000">200K</button>
            <button type="button" data-amount="500000">500K</button>
          </div>
          <input type="number" id="wallet-amount-input" class="form-input" min="10000" step="10000" placeholder="VD: 100000" />
        </div>

        <div class="wallet-modal-actions">
          <button class="btn btn-outline" id="wallet-cancel">Đóng</button>
          <button class="btn btn-primary" id="wallet-confirm"><i class="fas fa-paper-plane"></i> Tôi đã chuyển khoản</button>
        </div>
        <div class="error-msg" id="wallet-error"></div>
      </div>`;
    document.body.appendChild(modal);

    // Sự kiện đóng
    modal.querySelector(".wallet-modal-close").addEventListener("click", closeWalletModal);
    document.getElementById("wallet-cancel").addEventListener("click", closeWalletModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeWalletModal(); });

    // Nút chọn nhanh số tiền
    modal.querySelectorAll(".wallet-quick-amounts button").forEach((b) => {
      b.addEventListener("click", () => {
        modal.querySelectorAll(".wallet-quick-amounts button").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        document.getElementById("wallet-amount-input").value = b.dataset.amount;
        document.getElementById("wallet-amount-display").textContent = vnd(b.dataset.amount);
      });
    });

    // Copy STK
    document.getElementById("wallet-copy-stk").addEventListener("click", async () => {
      const no = WALLET_ACCOUNT_NO;
      try {
        await navigator.clipboard.writeText(no);
        const btn = document.getElementById("wallet-copy-stk");
        btn.innerHTML = '<i class="fas fa-check"></i> Đã copy';
        setTimeout(() => (btn.innerHTML = '<i class="far fa-copy"></i> Copy'), 1500);
      } catch (e) {
        prompt("Copy số tài khoản:", no);
      }
    });

    // Xác nhận đã chuyển khoản -> tạo yêu cầu chờ duyệt
    document.getElementById("wallet-confirm").addEventListener("click", async () => {
      const errEl = document.getElementById("wallet-error");
      errEl.textContent = "";
      const amount = Number(document.getElementById("wallet-amount-input").value) || 0;
      if (!amount) {
        errEl.textContent = "Hãy nhập số tiền bạn đã chuyển.";
        return;
      }
      const btn = document.getElementById("wallet-confirm");
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
      const res = await requestDeposit(amount, "Nạp qua QR/STK");
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Tôi đã chuyển khoản';
      if (!res.ok) {
        errEl.textContent = res.error;
        return;
      }
      closeWalletModal();
      alert("✅ Đã ghi nhận yêu cầu nạp " + vnd(amount) + ". Yêu cầu đang chờ quản trị viên xác nhận — tiền sẽ vào ví sau khi được duyệt.");
    });
  }

  // Hiện modal
  modal.style.display = "flex";
  const inp = document.getElementById("wallet-amount-input");
  if (inp) inp.focus();
}

function closeWalletModal() {
  const modal = document.getElementById("wallet-qr-modal");
  if (modal) modal.style.display = "none";
}

// Nút "Nạp tiền" có thể đặt ở bất kỳ đâu:
//   <button onclick="openWalletModal()">Nạp tiền</button>
window.openWalletModal = openWalletModal;
