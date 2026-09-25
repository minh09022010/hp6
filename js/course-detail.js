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
  document.getElementById("cd-enroll").href = viewerUser ? "profile.html" : "register.html";

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
        (sec) => `
      <div class="curriculum-item">
        <div class="curriculum-item-header">
          <h4><i class="fas fa-play-circle" style="color:var(--primary);margin-right:8px"></i> ${escapeHtml(sec.title)}</h4>
          <span>${escapeHtml(sec.duration || "")}${sec.duration ? " - " : ""}${num(sec.lessonsCount, (sec.lessons || []).length)} bài</span>
        </div>
        <div class="curriculum-lessons">
          ${(sec.lessons || [])
            .map(
              (l) => `
          <div class="curriculum-lesson">
            <span class="curriculum-lesson-left"><i class="fas fa-play-circle"></i> ${escapeHtml(l.name)}</span>
            <span class="curriculum-lesson-duration">${escapeHtml(l.duration || "")}</span>
          </div>`
            )
            .join("")}
        </div>
      </div>`
      )
      .join("");
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

  // ----- Đánh giá -----
  const rev = document.getElementById("cd-reviews");
  const revSection = document.getElementById("cd-reviews-section");
  if (!c.reviews.length) {
    revSection.style.display = "none";
  } else {
    revSection.style.display = "";
    rev.innerHTML = c.reviews
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
  }

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
    manageBtn.href = "admin.html";
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
        items.push({ id: doc.id, title: d.title, image: d.image || "", duration: d.duration || "", cat: d.category || "", price: num(d.price, 0), demo: false });
      });
    } catch (e) {
      console.warn("[course-detail] related blocked:", e.code);
    }
  }
  items = items.slice(0, 3);

  list.innerHTML = items
    .map(
      (it) => `
    <li>
      <div class="sidebar-post-image"><img src="${it.image || courseImage(null, 2)}" alt="${escapeHtml(it.title)}" /></div>
      <div class="sidebar-post-content">
        <h4><a href="${it.demo ? "courses.html" : "course-detail.html?id=" + encodeURIComponent(it.id)}">${escapeHtml(it.title)}</a></h4>
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

  renderCourse(course);
}

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
