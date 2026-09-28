// ============================================================
// course-detail.js - Trang chi tiết khóa học (course-detail.html)
// - Đọc ?id= trên URL: id là document id của collection "courses" (Firestore)
// - CHỈ hiện khóa học thật trong hệ thống; không tìm thấy -> trang thông báo lỗi
// Nhúng: firebase-*.js -> firebase-config.js -> auth.js -> instructors-data.js -> course-detail.js
// ============================================================

const detailParams = new URLSearchParams(window.location.search);
const courseId = detailParams.get("id");

const viewerUser = getCurrentUser();
const viewerCanManage = !!(viewerUser && (viewerUser.role === "teacher" || viewerUser.role === "admin"));

// ---------- Trạng thái ghi danh + đánh giá của trang ----------
let currentCourse = null; // khóa học đang hiển thị
let viewerEnrolled = false; // người xem đã ghi danh khóa này chưa
let viewerReviewed = false; // người xem đã đánh giá khóa này chưa

// ---------- Helpers ----------
function starsHTML(count) {
  const filled = Math.max(0, Math.min(5, Math.round(num(count, 5))));
  let html = "";
  for (let i = 0; i < 5; i++) html += `<i class="${i < filled ? "fas" : "far"} fa-star"></i>`;
  return html;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Chuẩn hóa khóa học Firestore về 1 cấu trúc duy nhất để render
function normalizeCourse(id, d) {
  return {
    id,
    title: d.title || "Khóa học",
    category: d.category || "Khác",
    desc: d.desc || "",
    longDesc: d.longDesc || (d.desc ? [d.desc] : []),
    image: d.image || "",
    level: d.level || "Mọi trình độ",
    duration: d.duration ? `${d.duration}` : "",
    lessons: num(d.lessons, 0),
    language: d.language || "Tiếng Việt",
    rating: num(d.rating, 0),
    reviewsCount: num(d.reviewsCount, 0),
    studentsCount: num(d.studentsCount, 0),
    price: num(d.price, 0),
    originalPrice: num(d.originalPrice, 0),
    includes: d.includes || [],
    curriculum: d.curriculum || [],
    reviews: d.reviews || [],
    teacherId: d.teacherId || "",
    teacherName: d.teacherName || "",
    status: d.status || "draft",
  };
}

// ---------- Render toàn trang ----------
function renderCourse(c) {
  const badge = COURSE_BADGES[c.level] || "badge-beginner";
  const price = priceText(c.price);
  const original = c.originalPrice > c.price ? `<span class="original">${priceText(c.originalPrice)}</span>` : "";
  const teacherHref = `instructor-detail.html?id=${encodeURIComponent(c.teacherId || "")}`;

  // ----- Hero -----
  document.getElementById("cd-breadcrumb").textContent = c.title;
  document.getElementById("cd-category").innerHTML = `<i class="fas fa-tag"></i> ${escapeHtml(c.category)}`;
  document.getElementById("cd-title").textContent = c.title;
  document.getElementById("cd-desc").textContent = c.desc;

  const meta = document.getElementById("cd-meta");
  meta.innerHTML = `
    <span class="course-detail-meta-item"><i class="fas fa-star"></i> ${c.rating > 0 ? c.rating.toFixed(1) : "Mới"}${c.reviewsCount ? ` (${c.reviewsCount.toLocaleString("vi-VN")} đánh giá)` : ""}</span>
    ${c.studentsCount ? `<span class="course-detail-meta-item"><i class="fas fa-users"></i> ${c.studentsCount.toLocaleString("vi-VN")}+ đã ghi danh</span>` : ""}
    ${c.duration ? `<span class="course-detail-meta-item"><i class="far fa-clock"></i> ${escapeHtml(c.duration)}</span>` : ""}
    <span class="course-detail-meta-item"><i class="fas fa-signal"></i> ${escapeHtml(c.level)}</span>`;

  document.getElementById("cd-image").src = c.image || courseImage(null, 0);
  document.getElementById("cd-image").alt = c.title;
  document.getElementById("cd-price").innerHTML = `${price} ${original}`;
  renderEnrollButton();

  // ----- Về khóa học -----
  const about = document.getElementById("cd-about");
  about.innerHTML = "";
  (c.longDesc.length ? c.longDesc : [c.desc || "Chưa có mô tả."]).forEach((t) => {
    const p = document.createElement("p");
    p.textContent = t;
    about.appendChild(p);
  });

  // ----- Chương trình học -----
  const curr = document.getElementById("cd-curriculum");
  const totalLessons = c.curriculum.reduce((s, sec) => s + (num(sec.lessonsCount, 0) || (sec.lessons || []).length), 0);
  const currCount = document.getElementById("cd-curriculum-count");
  if (currCount) {
    currCount.textContent = `${c.duration || "—"} • ${c.curriculum.length} phần • ${totalLessons || c.lessons || 0} bài học`;
  }
  if (!c.curriculum.length) {
    curr.innerHTML = '<p style="color:#64748b">Chương trình học chưa được cập nhật.</p>';
  } else {
    curr.innerHTML = c.curriculum
      .map(
        (sec, idx) => {
          const lessonCount = num(sec.lessonsCount, (sec.lessons || []).length);
          const lessonsHTML = (sec.lessons || [])
            .map((l, li) => `
            <div class="curriculum-lesson cd-lesson-row" data-lesson="${idx}-${li}">
              <span class="curriculum-lesson-left">
                <i class="fas fa-play-circle"></i> ${escapeHtml(l.name)}
              </span>
              <span class="curriculum-lesson-duration">${escapeHtml(l.duration || "")}</span>
            </div>
            <div class="cd-lesson-detail" id="cd-ld-${idx}-${li}">
              <div class="cd-ld-inner">
                <div class="cd-ld-icon"><i class="fas fa-play-circle"></i></div>
                <div class="cd-ld-info">
                  <p class="cd-ld-title">${escapeHtml(l.name)}</p>
                  ${l.duration ? `<span class="cd-ld-meta"><i class="far fa-clock"></i> ${escapeHtml(l.duration)}</span>` : ""}
                  ${l.type   ? `<span class="cd-ld-meta"><i class="fas fa-file-alt"></i> ${escapeHtml(l.type)}</span>` : ""}
                  ${l.desc   ? `<p class="cd-ld-desc">${escapeHtml(l.desc)}</p>` : ""}
                </div>
              </div>
            </div>`)
            .join("");

          return `
          <div class="curriculum-item cd-accordion" data-section="${idx}">
            <div class="curriculum-item-header cd-accordion-header" role="button" tabindex="0"
                 aria-expanded="false" aria-controls="cd-sec-body-${idx}">
              <h4>
                <i class="fas fa-chevron-right cd-chevron"></i>
                <i class="fas fa-layer-group" style="color:var(--primary);margin-right:8px"></i>
                ${escapeHtml(sec.title)}
              </h4>
              <span>${escapeHtml(sec.duration || "")}${sec.duration ? " · " : ""}${lessonCount} bài</span>
            </div>
            <div class="curriculum-lessons cd-accordion-body" id="cd-sec-body-${idx}">
              ${lessonsHTML}
            </div>
          </div>`;
        }
      )
      .join("");

    // Gắn sự kiện accordion cho từng section
    curr.querySelectorAll(".cd-accordion-header").forEach(header => {
      const toggle = () => {
        const item    = header.closest(".cd-accordion");
        const body    = header.nextElementSibling;
        const chevron = header.querySelector(".cd-chevron");
        const isOpen  = item.classList.contains("cd-open");

        // Đóng tất cả section khác
        curr.querySelectorAll(".cd-accordion.cd-open").forEach(other => {
          if (other !== item) {
            other.classList.remove("cd-open");
            other.querySelector(".cd-accordion-body").style.maxHeight = "0";
            const oc = other.querySelector(".cd-chevron");
            if (oc) oc.style.transform = "rotate(0deg)";
            other.querySelector(".cd-accordion-header").setAttribute("aria-expanded", "false");
            // Đóng tất cả lesson detail trong section bị thu lại
            other.querySelectorAll(".cd-lesson-detail.cd-ld-open").forEach(ld => ld.classList.remove("cd-ld-open"));
          }
        });

        if (isOpen) {
          item.classList.remove("cd-open");
          body.style.maxHeight = "0";
          chevron.style.transform = "rotate(0deg)";
          header.setAttribute("aria-expanded", "false");
        } else {
          item.classList.add("cd-open");
          body.style.maxHeight = body.scrollHeight + "px";
          chevron.style.transform = "rotate(90deg)";
          header.setAttribute("aria-expanded", "true");
        }
      };

      header.addEventListener("click", toggle);
      header.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });

    // Gắn sự kiện click từng bài học để hiện detail
    curr.querySelectorAll(".cd-lesson-row").forEach(row => {
      row.addEventListener("click", () => {
        const key    = row.dataset.lesson;
        const detail = document.getElementById(`cd-ld-${key}`);
        if (!detail) return;

        const isOpen = detail.classList.contains("cd-ld-open");
        // Đóng tất cả detail trong cùng section
        const section = row.closest(".cd-accordion");
        section.querySelectorAll(".cd-lesson-detail.cd-ld-open").forEach(d => d.classList.remove("cd-ld-open"));

        if (!isOpen) {
          detail.classList.add("cd-ld-open");
          // Cập nhật lại maxHeight của body cha để đủ chỗ
          const body = section.querySelector(".cd-accordion-body");
          if (body) body.style.maxHeight = body.scrollHeight + 400 + "px";
        }
      });
    });

    // Mở section đầu tiên mặc định
    const firstHeader = curr.querySelector(".cd-accordion-header");
    if (firstHeader) firstHeader.click();
  }

  // ----- Giảng viên -----
  const tc = document.getElementById("cd-teacher");
  const tImg = document.getElementById("cd-teacher-image");
  tImg.src = teacherImgCache || instructorAvatar(null, 0);
  tImg.alt = c.teacherName || "Giảng viên";
  document.getElementById("cd-teacher-name").textContent = c.teacherName || "Đang cập nhật";
  document.getElementById("cd-teacher-role").textContent = teacherRoleCache || "";
  document.getElementById("cd-teacher-bio").textContent = teacherBioCache || "Giảng viên của khóa học này.";
  document.getElementById("cd-teacher-link").href = teacherHref;
  tc.style.display = "";

  // ----- Đánh giá mẫu (từ admin) + đánh giá thật (course-reviews) -----
  const rev = document.getElementById("cd-reviews");
  const revSection = document.getElementById("cd-reviews-section");
  revSection.style.display = ""; // luôn hiện: còn chứa form/hint đánh giá

  const demoReviewsHTML = (c.reviews || [])
    .map(
      (r) => `
    <div class="review-item">
      <div class="review-header">
        <div class="review-avatar"><i class="fas fa-user"></i></div>
        <div><h4>${escapeHtml(r.name)}</h4><div class="review-stars">${starsHTML(num(r.stars, 5))}</div></div>
        <span class="review-date">${escapeHtml(r.date || "")}</span>
      </div>
      <p class="review-text">"${escapeHtml(r.text)}"</p>
    </div>`
    )
    .join("");

  // Đánh giá thật được nạp bất đồng bộ (loadRealReviews)
  rev.innerHTML = '<div id="cd-real-reviews"></div>' + demoReviewsHTML;

  // ----- Sidebar: bao gồm + thông tin -----

  // ----- Sidebar: bao gồm + thông tin -----
  const inc = document.getElementById("cd-includes");
  if (c.includes.length) {
    document.getElementById("cd-includes-section").style.display = "";
    inc.innerHTML = c.includes.map((x) => `<li><i class="fas fa-check"></i> ${escapeHtml(x)}</li>`).join("");
  } else {
    document.getElementById("cd-includes-section").style.display = "none";
  }

  const info = document.getElementById("cd-info");
  info.innerHTML = `
    <li><a href="#">Thời lượng <span>${escapeHtml(c.duration || "—")}</span></a></li>
    <li><a href="#">Bài học <span>${totalLessons || c.lessons || "—"}</span></a></li>
    <li><a href="#">Cấp độ <span>${escapeHtml(c.level)}</span></a></li>
    <li><a href="#">Ngôn ngữ <span>${escapeHtml(c.language)}</span></a></li>`;

  // ----- Sidebar: khóa học liên quan -----
  loadRelatedCourses(c);

  // ----- Nút quản lý (giảng viên chủ nhiệm / admin) -----
  const manageBtn = document.getElementById("cd-manage-btn");
  if (viewerCanManage && (viewerUser.role === "admin" || viewerUser.id === c.teacherId)) {
    manageBtn.style.display = "";
    manageBtn.href =
      viewerUser.role === "admin" ? "admin.html?tab=courses" : "admin.html?tab=courses&instructor=" + encodeURIComponent(viewerUser.id);
  }

  document.title = `${c.title} - MinhThach Learning`;
}

// Cache thông tin giảng viên để điền vào card
let teacherImgCache = "";
let teacherRoleCache = "";
let teacherBioCache = "";

async function loadTeacherInfo(c) {
  if (!db || !c.teacherId) return;
  try {
    const doc = await db.collection("users").doc(c.teacherId).get();
    if (doc.exists) {
      const d = doc.data();
      teacherImgCache = d.image || d.photoURL || "";
      teacherRoleCache = d.title || d.teacherTitle || "";
      teacherBioCache = d.bio || "";
      document.getElementById("cd-teacher-image").src = teacherImgCache || instructorAvatar(null, 1);
      document.getElementById("cd-teacher-name").textContent =
        `${d.lastname || ""} ${d.firstname || ""}`.trim() || c.teacherName;
      document.getElementById("cd-teacher-role").textContent = teacherRoleCache;
      document.getElementById("cd-teacher-bio").textContent = teacherBioCache || "Giảng viên của khóa học này.";
    }
  } catch (e) {
    console.warn("[course-detail] Không tải được hồ sơ giảng viên:", e.code);
  }
}

// ---------- Khóa học liên quan (sidebar) ----------
async function loadRelatedCourses(c) {
  const list = document.getElementById("cd-related");
  if (!list) return;

  let items = [];

  // Ưu tiên khóa thật từ Firestore (khác khóa hiện tại, cùng danh mục nếu có)
  if (db) {
    try {
      const snap = await db.collection("courses").where("status", "==", "published").limit(10).get();
      snap.forEach((doc) => {
        if (doc.id === c.id) return;
        const d = doc.data();
        items.push({ id: doc.id, title: d.title, image: d.image || "", duration: d.duration || "", cat: d.category || "", price: num(d.price, 0) });
      });
    } catch (e) {
      console.warn("[course-detail] related blocked:", e.code);
    }
  }
  items = items.slice(0, 3);

  if (!items.length) {
    list.innerHTML = '<li style="color:#64748b;font-size:14px">Chưa có khóa học liên quan.</li>';
    return;
  }

  list.innerHTML = items
    .map(
      (it) => `
    <li>
      <div class="sidebar-post-image"><img src="${it.image || courseImage(null, 2)}" alt="${escapeHtml(it.title)}" /></div>
      <div class="sidebar-post-content">
        <h4><a href="course-detail.html?id=${encodeURIComponent(it.id)}">${escapeHtml(it.title)}</a></h4>
        <span class="sidebar-post-date">${escapeHtml(it.duration || "")}</span>
      </div>
    </li>`
    )
    .join("");
}

// ---------- Tải khóa học ----------
async function loadCourseDetail() {
  let course = null;

  if (db && courseId) {
    try {
      const doc = await db.collection("courses").doc(courseId).get();
      if (doc.exists) {
        const d = doc.data();
        // Khóa nháp: chỉ giảng viên chủ nhiệm / admin được xem
        const isOwner = viewerCanManage && (viewerUser.role === "admin" || viewerUser.id === d.teacherId);
        if (d.status === "published" || isOwner) {
          course = normalizeCourse(doc.id, d);
          loadTeacherInfo(course);
        } else {
          renderCourseError("Khóa học này chưa được xuất bản.");
          return;
        }
      }
    } catch (e) {
      console.warn("[course-detail] Firestore blocked:", e.code);
    }
  }

  if (!course) {
    renderCourseError("Khóa học không tồn tại hoặc đã bị xóa khỏi hệ thống.");
    return;
  }

  currentCourse = course; // phục vụ ghi danh + đánh giá
  renderCourse(course);

  // Sau khi render khung: nạp trạng thái ghi danh + đánh giá thật của người xem
  try {
    viewerEnrolled = await isEnrolledInCourse(course.id);
    renderEnrollButton();
    await loadRealReviews(); // bên trong gọi setupReviewForm()
  } catch (e) {
    console.warn("[course-detail] Lỗi nạp trạng thái ghi danh/đánh giá:", e);
  }
}

// ---------- Ghi danh + đánh giá (có check payment) ----------
function renderEnrollButton() {
  const btn = document.getElementById("cd-enroll");
  if (!btn || !currentCourse) return;

  if (!viewerUser) {
    btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Ghi danh ngay';
    btn.href = "login.html";
  } else if (viewerEnrolled) {
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Đã ghi danh';
    btn.href = "profile.html";
  } else {
    btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Ghi danh ngay';
    btn.href = "#enroll-action";
  }
}

async function handleEnrollClick(e) {
  e.preventDefault();
  if (!viewerUser) {
    window.location.href = "login.html";
    return;
  }
  if (viewerEnrolled) {
    window.location.href = "profile.html";
    return;
  }
  if (!currentCourse) return;

  // KHÓA TRẢ PHÍ: mua qua ví (kiểm tra số dư + trừ tiền trong purchaseCourse)
  const price = num(currentCourse.price, 0);
  if (price > 0) {
    const buy = await purchaseCourse(currentCourse);
    if (!buy.ok) {
      if (buy.already) {
        viewerEnrolled = true;
        renderEnrollButton();
        return;
      }
      // Không đủ tiền -> gợi ý nạp thêm
      if (confirm(buy.error + "\n\nĐi đến trang nạp tiền (Hồ sơ cá nhân) ngay?")) {
        window.location.href = "profile.html";
      }
      return;
    }
    viewerEnrolled = true;
    renderEnrollButton();
    setupReviewForm();
    refreshRealReviews();
    alert(`✅ Đã mua khóa học "${currentCourse.title}" bằng ${vnd(buy.charged)} từ ví!`);
    return;
  }

  // KHÓA MIỄN PHÍ: ghi danh thẳng như cũ
  const res = await enrollInCourse(currentCourse.id, currentCourse);
  if (!res.ok) {
    alert(res.error);
    return;
  }
  viewerEnrolled = true;
  renderEnrollButton();
  setupReviewForm();
  refreshRealReviews();
  alert(`✅ Đã ghi danh khóa học "${currentCourse.title}"! Giờ bạn có thể đánh giá khóa học này.`);
}

// Form đánh giá: chỉ hiện khi đã đăng nhập + đã ghi danh + chưa đánh giá
async function setupReviewForm() {
  const box = document.getElementById("cd-review-form-box");
  const hint = document.getElementById("cd-review-login-hint");
  if (!box || !hint) return;

  box.style.display = "none";
  hint.style.display = "none";

  if (!currentCourse) return;

  if (!viewerUser) {
    hint.innerHTML =
      'Đăng nhập và ghi danh khóa học để để lại đánh giá nhé! <a href="login.html" style="color:var(--primary);font-weight:600">Đăng nhập</a>';
    hint.style.display = "";
    return;
  }

  // Đã đánh giá rồi -> chỉ hiện ghi chú nhỏ
  if (viewerReviewed) {
    hint.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981"></i> Bạn đã đánh giá khóa học này. Cảm ơn bạn! 💙';
    hint.style.display = "";
    return;
  }

  if (!viewerEnrolled) {
    hint.innerHTML =
      '<i class="fas fa-lock"></i> Bạn cần <strong>ghi danh khóa học này</strong> mới có thể đánh giá. Bấm nút <strong>"Ghi danh ngay"</strong> ở trên nhé!';
    hint.style.display = "";
    return;
  }

  // Đủ điều kiện -> hiện form
  box.style.display = "";
  hint.style.display = "none";
}

// Đánh giá thật từ collection "course-reviews"
async function loadRealReviews() {
  const wrap = document.getElementById("cd-real-reviews");
  if (!wrap || !currentCourse) return;

  const reviews = await fetchCourseReviews(currentCourse.id);
  viewerReviewed = !!(viewerUser && reviews.some((r) => r.userId === viewerUser.id));

  if (!reviews.length) {
    wrap.innerHTML = '<p style="color:#64748b; font-size:14px">Chưa có đánh giá nào từ học viên. Hãy là người đầu tiên!</p>';
  } else {
    wrap.innerHTML =
      '<h3 style="margin:0 0 14px; font-size:16px; color:#334155">Đánh giá thực tế từ học viên đã ghi danh</h3>' +
      reviews
        .map((r) => {
          const avatar = r.userAvatar
            ? `<img src="${r.userAvatar}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover">`
            : '<i class="fas fa-user"></i>';
          const when = formatDateVN(r.createdAt);
          return `
    <div class="review-item">
      <div class="review-header">
        <div class="review-avatar">${avatar}</div>
        <div><h4>${escapeHtml(r.userName || "Học viên")}</h4><div class="review-stars">${starsHTML(num(r.stars, 5))}</div></div>
        <span class="review-date">${when}</span>
      </div>
      <p class="review-text">"${escapeHtml(r.text)}"</p>
    </div>`;
        })
        .join("");
  }

  setupReviewForm();
}

// Vẽ lại đánh giá + form sau khi gửi đánh giá mới
function refreshRealReviews() {
  loadRealReviews();
}

// Định dạng ngày viết đánh giá
function formatDateVN(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch (e) {
    return "";
  }
}

// ---------- Sự kiện form đánh giá ----------
let selectedStars = 0;

function paintStars(n) {
  document.querySelectorAll("#cd-review-stars i[data-star]").forEach((el) => {
    const val = Number(el.dataset.star);
    el.className = val <= n ? "fas fa-star" : "far fa-star";
  });
  const label = document.getElementById("cd-review-stars-label");
  if (label) label.textContent = n ? `${n}/5 sao` : "Chọn số sao";
}

document.querySelectorAll("#cd-review-stars i[data-star]").forEach((el) => {
  el.addEventListener("click", () => {
    selectedStars = Number(el.dataset.star);
    paintStars(selectedStars);
  });
});

document.getElementById("cd-review-submit").addEventListener("click", async () => {
  const errEl = document.getElementById("cd-review-error");
  errEl.textContent = "";

  if (!selectedStars) {
    errEl.textContent = "Hãy chọn số sao trước khi gửi.";
    return;
  }
  const text = document.getElementById("cd-review-text").value;

  const btn = document.getElementById("cd-review-submit");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

  const res = await submitCourseReview(currentCourse.id, currentCourse, selectedStars, text);

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi đánh giá';

  if (!res.ok) {
    errEl.textContent = res.error;
    return;
  }

  alert("Cảm ơn bạn đã đánh giá khóa học! 💙");
  selectedStars = 0;
  paintStars(0);
  document.getElementById("cd-review-text").value = "";
  refreshRealReviews(); // vẽ lại danh sách + form (sẽ thành trạng thái "đã đánh giá")
});

// Nút Ghi danh
const enrollBtn = document.getElementById("cd-enroll");
if (enrollBtn) enrollBtn.addEventListener("click", handleEnrollClick);

// Thay toàn bộ nội dung trang bằng thông báo lỗi
function renderCourseError(msg) {
  document.title = "Lỗi - MinhThach Learning";
  const section = document.querySelector(".course-content-section .container") || document.body;
  const hero = document.querySelector(".course-detail-hero");
  if (hero) hero.style.display = "none";
  section.innerHTML = `
    <div style="text-align:center; padding:80px 20px; color:#64748b">
      <i class="fas fa-exclamation-triangle" style="font-size:56px; margin-bottom:20px; color:#cbd5e1"></i>
      <h2 style="margin-bottom:10px; color:#334155">Không tải được khóa học</h2>
      <p style="margin-bottom:24px">${escapeHtml(msg)}</p>
      <a href="courses.html" class="btn btn-primary"><i class="fas fa-arrow-left"></i> Về trang khóa học</a>
    </div>`;
}

loadCourseDetail();
