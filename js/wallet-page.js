// ============================================================
// wallet-page.js - Trang Nạp tiền chuyên biệt (wallet.html)
// - Hiện QR + số tài khoản nhận tiền (từ wallet.js)
// - Chọn/nhập số tiền -> xác nhận -> tạo yêu cầu chờ duyệt
// - Lịch sử nạp của user
// Nhúng: firebase-*.js -> firebase-config.js -> auth.js ->
//        instructors-data.js -> wallet.js -> wallet-page.js
// ============================================================

const walletPageUser = getCurrentUser();

// ---------- Fill thông tin ngân hàng từ hằng số trong wallet.js ----------
function fillBankInfo() {
  const qr = document.getElementById("deposit-qr");
  const bank = document.getElementById("deposit-bank-name");
  const stk = document.getElementById("deposit-stk");
  const name = document.getElementById("deposit-account-name");

  if (qr) qr.src = WALLET_QR_IMAGE;
  if (bank) bank.textContent = WALLET_BANK_NAME;
  if (stk) stk.textContent = WALLET_ACCOUNT_NO;
  if (name) name.textContent = WALLET_ACCOUNT_NAME;
}

// ---------- Copy STK ----------
function initCopyStk() {
  const btn = document.getElementById("btn-copy-stk");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(WALLET_ACCOUNT_NO);
      btn.innerHTML = '<i class="fas fa-check"></i> Đã copy';
      setTimeout(() => (btn.innerHTML = '<i class="far fa-copy"></i> Copy'), 1500);
    } catch (e) {
      prompt("Copy số tài khoản:", WALLET_ACCOUNT_NO);
    }
  });
}

// ---------- Chọn nhanh số tiền ----------
function initAmountPicker() {
  const buttons = document.querySelectorAll(".deposit-amount-btn");
  const input = document.getElementById("deposit-amount");
  const display = document.getElementById("deposit-amount-display");

  const update = (amount) => {
    display.textContent = amount > 0 ? vnd(amount) : "—";
  };

  buttons.forEach((b) => {
    b.addEventListener("click", () => {
      buttons.forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      input.value = b.dataset.amount;
      update(Number(b.dataset.amount));
    });
  });

  // Gõ tay -> bỏ highlight nút nhanh
  input.addEventListener("input", () => {
    buttons.forEach((x) => x.classList.remove("active"));
    update(Number(input.value) || 0);
  });
}

// ---------- Xác nhận đã chuyển khoản ----------
function initConfirmDeposit() {
  const btn = document.getElementById("btn-confirm-deposit");
  const errEl = document.getElementById("deposit-error");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    errEl.textContent = "";
    const amount = Number(document.getElementById("deposit-amount").value) || 0;
    if (!amount) {
      errEl.textContent = "Hãy chọn hoặc nhập số tiền bạn đã chuyển.";
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi yêu cầu...';
    const res = await requestDeposit(amount, document.getElementById("deposit-note").value);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Tôi đã chuyển khoản';

    if (!res.ok) {
      errEl.textContent = res.error;
      return;
    }

    alert(
      "✅ Đã ghi nhận yêu cầu nạp " + vnd(amount) +
      ".\n\nYêu cầu đang CHỜ QUẢN TRỊ VIÊN XÁC NHẬN — tiền sẽ vào ví ngay sau khi được duyệt."
    );
    document.getElementById("deposit-amount").value = "";
    document.getElementById("deposit-note").value = "";
    document.getElementById("deposit-amount-display").textContent = "—";
    document.querySelectorAll(".deposit-amount-btn").forEach((x) => x.classList.remove("active"));

    loadDepositHistory(); // vẽ lại lịch sử (số dư chỉ đổi sau khi admin duyệt)
  });
}

// ---------- Số dư + lịch sử nạp ----------
async function loadBalance() {
  const el = document.getElementById("deposit-balance");
  if (!el) return;
  const w = await fetchMyBalance();
  el.textContent = vnd(w.balance);
}
async function loadDepositHistory() {
  const wrap = document.getElementById("deposit-history-wrap");
  const tbody = document.getElementById("deposit-history-tbody");
  if (!wrap || !tbody) return;

  const list = await fetchMyDeposits();
  if (!list.length) return; // chưa có -> ẩn khối

  const statusBadge = {
    pending: '<span class="role-badge dep-status-pending">Chờ duyệt</span>',
    approved: '<span class="role-badge dep-status-approved">Đã duyệt</span>',
    rejected: '<span class="role-badge dep-status-rejected">Từ chối</span>',
  };
  // "Đã duyệt" nhưng hồ sơ chưa kịp cộng tiền (kẹt do Firestore chặn ghi) -> cảnh báo riêng
  const badgeFor = (d) =>
    d.status === "approved" && d.credited !== true
      ? '<span class="role-badge dep-status-approved">Đã duyệt — vào ví</span>'
      : statusBadge[d.status] || d.status;

  wrap.style.display = "";
  tbody.innerHTML = list
    .map((d) => {
      const when = d.createdAt ? new Date(d.createdAt).toLocaleString("vi-VN") : "—";
      return `
      <tr>
        <td><strong>${vnd(d.amount)}</strong></td>
        <td>${when}</td>
        <td>${escapeHtml(d.note || "—")}</td>
        <td>${badgeFor(d)}</td>
      </tr>`;
    })
    .join("");
}

// ---------- Khởi động ----------
fillBankInfo();
initCopyStk();
initAmountPicker();
initConfirmDeposit();

if (!walletPageUser) {
  document.getElementById("deposit-login-required").style.display = "";
} else {
  document.getElementById("deposit-main").style.display = "";
  loadBalance();
  loadDepositHistory();

  // Tự refresh số dư + lịch sử khi quay lại tab (admin vừa duyệt ở tab khác,
  // người dùng chuyển sang tab Nạp tiền -> thấy ngay số mới)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && getCurrentUser()) {
      loadBalance();
      loadDepositHistory();
    }
  });
}
