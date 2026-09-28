// ============================================================
// pricing.js - Trang Bảng giá (pricing.html)
// - Top Contribution: xếp hạng theo tổng tiền đã nạp
// - Danh sách khóa học trả phí + trạng thái sở hữu
// (Phần VÍ + NẠP TIỀN đã dời sang profile.html / js/profile.js)
// Nhúng: firebase-*.js -> firebase-config.js -> auth.js ->
//        instructors-data.js -> wallet.js -> pricing.js
// ============================================================

const isPricingLoggedIn = !!getCurrentUser();// ---------- 1) Top Contribution (FULL danh sách) ----------
async function loadTopContribution() {
  const tbody = document.getElementById("top-contrib-tbody");
  const list = await fetchTopContributors(); // toàn bộ người đã nạp (wallet.js đã sort giảm dần)

  const medals = ["🥇", "🥈", "🥉"];
  const cardIds = ["topc-1", "topc-2", "topc-3"];
  const cardImgs = ["images/instructor1.jpg", "images/instructor2.jpg", "images/instructor3.jpg"];

  // Podium cố định 3 hạng cao nhất
  cardIds.forEach((id, i) => {
    const card = document.getElementById(id);
    if (!card) return;
    const u = list[i];
    const nameEl = card.querySelector(".topc-name");
    const amountEl = card.querySelector(".topc-amount");
    const avatarEl = card.querySelector(".topc-avatar");
    if (u) {
      nameEl.textContent = u.name;
      amountEl.textContent = vnd(u.totalDeposited);
      avatarEl.src = u.avatar || cardImgs[i];
    } else {
      nameEl.textContent = "Chưa có";
      amountEl.textContent = "0₫";
      avatarEl.src = cardImgs[i];
    }
  });

  // Bảng xếp hạng: hiển thị TẤT CẢ mọi người (hạng 1 -> hết danh sách)
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:24px; color:#94a3b8">Chưa có ai nạp tiền — hãy là người đầu tiên! 💪</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((u, i) => {
      const avatar = u.avatar
        ? `<img src="${u.avatar}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:-10px;margin-right:8px">`
        : '<i class="fas fa-user-circle" style="font-size:32px;vertical-align:-10px;margin-right:8px;color:#cbd5e1"></i>';
      const rank = `${medals[i] || ""} ${i + 1}`;
      const amountHtml = `<strong style="color:var(--primary)">${vnd(u.totalDeposited)}</strong>`;
      // Tô sáng top 3 trong bảng luôn cho đồng bộ với podium
      const rowStyle = i < 3 ? "background:linear-gradient(90deg,#fffbeb,transparent)" : "";
      return `
      <tr style="${rowStyle}">
        <td><strong>${rank}</strong></td>
        <td>${avatar}${escapeHtml(u.name)}</td>
        <td>${amountHtml}</td>
      </tr>`;
    })
    .join("");
}

// ---------- 2) Khóa học mua bằng ví ----------
async function loadPaidCourses() {
  const grid = document.getElementById("paid-courses-grid");
  if (!grid || !db) return;

  let courses = [];
  try {
    const snap = await db.collection("courses").where("status", "==", "published").get();
    snap.forEach((doc) => courses.push({ id: doc.id, ...doc.data() }));
  } catch (e) {
    grid.innerHTML = '<p style="color:#64748b">Không tải được danh sách khóa học.</p>';
    return;
  }

  // Chỉ hiện khóa học TRẢ PHÍ (price > 0)
  courses = courses.filter((c) => num(c.price, 0) > 0);

  if (!courses.length) {
    grid.innerHTML = '<p style="color:#64748b; grid-column:1/-1">Chưa có khóa học trả phí nào trong hệ thống.</p>';
    return;
  }

  // Trạng thái sở hữu của user (nếu đã đăng nhập)
  let ownedIds = new Set();
  if (isPricingLoggedIn) {
    const mine = await fetchMyEnrollments();
    ownedIds = new Set(mine.map((e) => e.courseId));
  }

  grid.innerHTML = courses
    .map((c, i) => {
      const img = courseImage(c.image, i);
      const owned = ownedIds.has(c.id);
      const footer = owned
        ? '<span class="paid-owned-badge"><i class="fas fa-check-circle"></i> Đã sở hữu</span>'
        : `<a class="btn btn-primary btn-sm" href="course-detail.html?id=${encodeURIComponent(c.id)}"><i class="fas fa-shopping-cart"></i> Mua</a>`;
      return `
      <div class="paid-course-card">
        <img class="paid-course-img" src="${img}" alt="${escapeHtml(c.title)}" />
        <div class="paid-course-body">
          <h3 class="paid-course-title"><a href="course-detail.html?id=${encodeURIComponent(c.id)}">${escapeHtml(c.title)}</a></h3>
          <p style="margin:0; font-size:13.5px; color:#64748b">${escapeHtml(c.desc || "")}</p>
          <div class="paid-course-footer">
            <span class="paid-course-price">${priceText(num(c.price, 0))}</span>
            ${footer}
          </div>
        </div>
      </div>`;
    })
    .join("");
}

// ---------- Khởi động ----------
document.addEventListener("DOMContentLoaded", () => {
  loadTopContribution();
  loadPaidCourses();
});
