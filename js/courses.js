// ============================================================
// courses.js - Trang khóa học công khai (courses.html)
// - Hiển thị khóa học "Xuất bản" từ Firestore (do giảng viên/admin tạo)
// - Giảng viên / Admin thấy nút "Tạo khóa học" ngay trên trang này
// Yêu cầu: firebase-*-compat.js -> firebase-config.js -> auth.js -> courses.js
// ============================================================

const viewer = getCurrentUser();
const viewerIsTeacher = !!(viewer && (viewer.role === "teacher" || viewer.role === "admin"));

const coursesGrid = document.querySelector(".courses-grid");
const coursesCount = document.querySelector(".courses-count");

// Ảnh demo xoay vòng cho khóa học chưa có ảnh riêng
const COURSE_IMAGES = ["course1.jpg", "course2.jpg", "course3.jpg", "course4.jpg", "course5.jpg", "course6.jpg", "course7.jpg", "course8.jpg", "course9.jpg"];
const AVATARS = ["instructor1.jpg", "instructor2.jpg", "instructor3.jpg", "instructor4.jpg", "instructor5.jpg", "instructor6.jpg"];

let pubTeachers = []; // danh sách giảng viên cho admin chọn khi tạo khóa học

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------- Nút "Tạo khóa học" (chỉ giảng viên / admin thấy) ----------
if (viewerIsTeacher) {
  const filters = document.querySelector(".courses-filters");
  if (filters) {
    const btn = document.createElement("button");
    btn.className = "btn btn-primary btn-sm";
    btn.id = "btn-create-course";
    btn.innerHTML = '<i class="fas fa-plus"></i> Tạo khóa học';
    btn.addEventListener("click", openCreateCourseModal);
    filters.insertBefore(btn, filters.firstChild);
  }
}

// ---------- Hiển thị khóa học từ Firestore ----------
async function loadPublicCourses() {
  if (!db || !coursesGrid) return;

  let list = [];
  try {
    const snap = await db.collection("courses").where("status", "==", "published").get();
    snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.warn("[courses] Không đọc được Firestore:", e.code);
    showEmptyCourses("Không tải được danh sách khóa học. Vui lòng thử lại sau.");
    return;
  }

  if (list.length === 0) {
    showEmptyCourses(); // chưa có khóa học thật -> trạng thái rỗng
    return;
  }

  // Lấy ảnh giảng viên (nếu có) để hiển thị đúng trên card
  const teacherIds = [...new Set(list.map((c) => c.teacherId).filter(Boolean))];
  await Promise.all(
    teacherIds.map(async (tid) => {
      try {
        const doc = await db.collection("users").doc(tid).get();
        if (doc.exists) {
          const img = doc.data().image || doc.data().avatar || "";
          if (img) {
            list.forEach((c) => {
              if (c.teacherId === tid && !c.teacherImage) c.teacherImage = img;
            });
          }
        }
      } catch (e) {
        /* bỏ qua */
      }
    })
  );

  // Mới nhất lên đầu
  list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  coursesGrid.innerHTML = list.map((c, i) => courseCardHTML(c, i)).join("");
  if (coursesCount) {
    coursesCount.innerHTML = `Hiển thị <strong>1-${list.length}</strong> trong số <strong>${list.length}</strong> khóa học`;
  }
}

// Trạng thái rỗng cho lưới khóa học
function showEmptyCourses(msg) {
  if (!coursesGrid) return;
  coursesGrid.innerHTML = `
    <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#64748b">
      <i class="fas fa-book-open" style="font-size:48px; margin-bottom:16px; color:#cbd5e1"></i>
      <h3 style="margin-bottom:8px; color:#334155">Chưa có khóa học nào</h3>
      <p>${msg || "Các khóa học sẽ xuất hiện ở đây sau khi giảng viên tạo và xuất bản trong hệ thống."}</p>
    </div>`;
  if (coursesCount) coursesCount.innerHTML = "Hiển thị <strong>0</strong> khóa học";
}

function courseCardHTML(c, idx) {
  const img = c.image || COURSE_IMAGES[idx % COURSE_IMAGES.length];
  // Ưu tiên ảnh giảng viên đã lưu (bao gồm ảnh upload dataURL), fallback ảnh mặc định
  const teacherImg = c.teacherImage || c.teacherAvatar || "";
  const avatar = teacherImg || AVATARS[idx % AVATARS.length];
  const price = c.price > 0 ? Number(c.price).toLocaleString("vi-VN") + "₫" : "Miễn phí";
  const title = escapeHtml(c.title);
  const desc = escapeHtml(c.desc || "(Chưa có mô tả)");
  const teacher = escapeHtml(c.teacherName || "(Chưa rõ giảng viên)");
  const cat = escapeHtml(c.category || "Khác");
  const level = c.level || "Cơ bản";
  const badgeClass = COURSE_BADGES[level] || "badge-beginner";
  const created = c.createdAt ? new Date(c.createdAt).toLocaleDateString("vi-VN") : "";
  return `
      <article class="course-card">
        <div class="course-card-image">
          <img src="images/${img}" alt="${title}" />
          <span class="course-card-badge ${badgeClass}">${escapeHtml(level)}</span>
        </div>
        <div class="course-card-body">
          <div class="course-card-category">${cat}</div>
          <h3 class="course-card-title"><a href="course-detail.html?id=${c.id}">${title}</a></h3>
          <p class="course-card-description">${desc}</p>
          <div class="course-card-instructor">
            <img src="${String(avatar).startsWith("data:image/") ? avatar : "images/" + avatar}" alt="${teacher}" />
            <span class="course-card-instructor-name">${teacher}</span>
          </div>
          <div class="course-card-meta">
            <span class="course-card-meta-item"><i class="far fa-calendar"></i> ${created}</span>
            ${c.duration ? `<span class="course-card-meta-item"><i class="far fa-clock"></i> ${escapeHtml(String(c.duration))} giờ</span>` : ""}
            ${c.rating ? `<span class="course-card-meta-item"><i class="fas fa-star"></i> ${Number(c.rating).toFixed(1)}</span>` : ""}
          </div>
        </div>
        <div class="course-card-footer">
          <span class="course-card-price">${price}</span>
          <a href="course-detail.html?id=${c.id}" class="btn btn-primary btn-sm">Xem chi tiết</a>
        </div>
      </article>`;
}

// ---------- Modal tạo khóa học ----------
function openCreateCourseModal() {
  const modal = document.getElementById("create-course-modal");
  if (!modal) return;

  const teacherGroup = document.getElementById("pub-teacher-group");
  const teacherSelect = document.getElementById("pub-course-teacher");

  if (viewer.role === "admin") {
    // Admin được chọn giảng viên phụ trách bất kỳ
    if (teacherGroup) teacherGroup.style.display = "";
    if (teacherSelect) {
      teacherSelect.disabled = false;
      loadTeachersInto(teacherSelect);
    }
  } else if (teacherGroup) {
    // Teacher: khóa học luôn thuộc chính mình -> ẩn ô chọn
    teacherGroup.style.display = "none";
  }

  ["pub-course-title", "pub-course-desc", "pub-course-price"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("pub-course-category").value = "Lập trình";
  document.getElementById("pub-course-status").value = "published";
  document.getElementById("pub-course-error").textContent = "";

  modal.style.display = "flex";
  setTimeout(() => document.getElementById("pub-course-title").focus(), 50);
}

function closeCreateCourseModal() {
  const modal = document.getElementById("create-course-modal");
  if (modal) modal.style.display = "none";
}

const pubCancelBtn = document.getElementById("pub-course-cancel");
if (pubCancelBtn) pubCancelBtn.addEventListener("click", closeCreateCourseModal);

async function loadTeachersInto(select) {
  select.innerHTML = '<option value="">Đang tải...</option>';
  pubTeachers = [];
  if (!db) return;

  try {
    const snap = await db.collection("users").get();
    snap.forEach((doc) => {
      const d = doc.data();
      if (d.role === "teacher" || d.role === "admin") {
        pubTeachers.push({
          id: doc.id,
          name: `${d.lastname || ""} ${d.firstname || ""}`.trim(),
          email: d.email || "",
        });
      }
    });
  } catch (e) {
    console.warn("[courses] Không tải được danh sách giảng viên:", e.code);
  }

  select.innerHTML = pubTeachers.length
    ? pubTeachers.map((t) => `<option value="${t.id}">${escapeHtml(t.name)} (${escapeHtml(t.email)})</option>`).join("")
    : '<option value="">(Chưa có giảng viên nào)</option>';
}

// ---------- Lưu khóa học mới ----------
const pubSaveBtn = document.getElementById("pub-course-save");
if (pubSaveBtn) {
  pubSaveBtn.addEventListener("click", async () => {
    if (!viewerIsTeacher || !db) return;
    const errEl = document.getElementById("pub-course-error");
    errEl.textContent = "";

    const title = document.getElementById("pub-course-title").value.trim();
    const desc = document.getElementById("pub-course-desc").value.trim();
    const price = Number(document.getElementById("pub-course-price").value) || 0;
    const category = document.getElementById("pub-course-category").value;
    const level = document.getElementById("pub-course-level") ? document.getElementById("pub-course-level").value : "Mọi trình độ";
    const duration = Number(document.getElementById("pub-course-duration").value) || 0;
    const status = document.getElementById("pub-course-status").value;

    if (!title) {
      errEl.textContent = "Vui lòng nhập tên khóa học.";
      return;
    }

    // Teacher: khóa học thuộc chính mình; Admin: chọn giảng viên phụ trách
    let teacherId = viewer.id;
    let teacherName = `${viewer.lastname || ""} ${viewer.firstname || ""}`.trim();
    if (viewer.role === "admin") {
      teacherId = document.getElementById("pub-course-teacher").value;
      const t = pubTeachers.find((x) => x.id === teacherId);
      teacherName = t ? t.name : "";
      if (!teacherId) {
        errEl.textContent = "Hãy chọn giảng viên phụ trách cho khóa học.";
        return;
      }
    }

    const data = {
      title,
      desc,
      longDesc: desc ? [desc] : [],
      price,
      category,
      level,
      duration,
      lessons: 0,
      language: "Tiếng Việt",
      status,
      teacherId,
      teacherName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    pubSaveBtn.disabled = true;
    pubSaveBtn.textContent = "Đang lưu...";
    try {
      await db.collection("courses").add(data);
      closeCreateCourseModal();
      await loadPublicCourses(); // vẽ lại danh sách từ Firestore
      alert(
        status === "published"
          ? `Đã tạo và xuất bản khóa học "${title}" lên trang Khóa học!`
          : `Đã lưu khóa học "${title}" dạng NHÁP — học viên chưa thấy. Vào trang Quản lý để xuất bản.`
      );
    } catch (e) {
      errEl.textContent = "Không lưu được khóa học: " + (e.code || e.message);
    } finally {
      pubSaveBtn.disabled = false;
      pubSaveBtn.textContent = "Tạo khóa học";
    }
  });
}

// ---------- Khởi động ----------
loadPublicCourses();
