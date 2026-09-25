// ============================================================
// admin.js - Trang quản trị (chỉ ADMIN mới vào được)
// Quản lý: người dùng, khóa học, hồ sơ giảng viên
// - admin: toàn quyền (users + courses + instructors)
// - teacher: quản lý khóa học CỦA CHÍNH MÌNH + tự sửa hồ sơ giảng viên
// Nhúng: firebase-*.js -> firebase-config.js -> auth.js -> instructors-data.js -> admin.js
// ============================================================

// Chặn người ngoài
const adminUser = getCurrentUser();
if (!adminUser) {
  window.location.href = "login.html";
} else {
  if (isAdminEmail(adminUser.email) && adminUser.role !== "admin") {
    adminUser.role = "admin";
    loginSession(adminUser);
    updateHeaderForUser();
  }
  if (adminUser.role !== "admin" && adminUser.role !== "teacher") {
    alert("Trang này chỉ dành cho Quản trị viên / Giảng viên!");
    window.location.href = "index.html";
  }
}

const isAdminUser = adminUser && adminUser.role === "admin";

// Teacher: ẩn tab Người dùng, đổi tab Giảng viên thành "Hồ sơ của tôi"
if (adminUser && !isAdminUser) {
  const usersTab = document.querySelector('.admin-tab[data-tab="users"]');
  if (usersTab) usersTab.style.display = "none";
  const instrTab = document.querySelector('.admin-tab[data-tab="instructors"]');
  if (instrTab) instrTab.innerHTML = '<i class="fas fa-user-edit"></i> Hồ sơ của tôi';
  const instrHint = document.getElementById("instructors-hint");
  if (instrHint) instrHint.innerHTML = "Cập nhật hồ sơ giảng viên công khai của bạn — hiển thị ở trang <strong>Giảng viên</strong> và trang chi tiết khóa học.";
}

// ---------- Bộ nhớ tạm của trang ----------
let cachedUsers = [];   // [{id, firstname, lastname, email, role, createdAt, title, image, bio, about, skills, social, students, rating, experience}]
let cachedCourses = []; // [{id, title, desc, longDesc, category, level, duration, lessons, price, originalPrice, status, teacherId, teacherName, image, language, rating, reviewsCount, studentsCount, includes, curriculum, reviews, createdAt}]
let editingCourseId = null;
let editingTeacherId = null;
let uploadedTeacherImage = null; // dataURL ảnh giảng viên vừa upload từ máy

// ---------- Tabs ----------
document.querySelectorAll(".admin-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
  });
});

// ---------- Load toàn bộ dữ liệu ----------
async function loadAll() {
  await Promise.all([loadUsers(), loadCourses()]);
  renderUsers();
  renderPermTable();
  renderCourses();

  // Mở sẵn modal hồ sơ nếu URL có ?instructor=<uid> (từ nút "Sửa hồ sơ" trên trang công khai)
  const openUid = new URLSearchParams(window.location.search).get("instructor");
  if (openUid && cachedUsers.some((u) => u.id === openUid)) {
    openTeacherModal(openUid);
  }
}

// ---------- USERS ----------
async function loadUsers() {
  cachedUsers = [];

  // 1) Ưu tiên đọc Firestore
  if (db) {
    try {
      const snap = await db.collection("users").get();
      snap.forEach((doc) => {
        const d = doc.data();
        cachedUsers.push({
          id: doc.id,
          firstname: d.firstname || "",
          lastname: d.lastname || "",
          email: d.email || "",
          role: isAdminEmail(d.email) ? "admin" : d.role || "student",
          createdAt: d.createdAt || null,
          tempPassword: d.tempPassword || "",
          // Hồ sơ giảng viên công khai
          title: d.title || "",
          image: d.image || "",
          bio: d.bio || "",
          about: d.about || [],
          skills: d.skills || [],
          social: d.social || {},
          students: num(d.students, 0),
          rating: num(d.rating, 0),
          experience: d.experience || "",
        });
      });
    } catch (e) {
      console.warn("[admin] Firestore users blocked:", e.code);
    }
  }

  // 2) Fallback: user hiện tại từ session cache
  if (cachedUsers.length === 0 && adminUser) {
    cachedUsers.push({
      id: adminUser.id,
      firstname: adminUser.firstname || "",
      lastname: adminUser.lastname || "",
      email: adminUser.email || "",
      role: adminUser.role || "admin",
      createdAt: adminUser.createdAt || null,
    });
  }
}

function roleBadge(role) {
  const map = {
    admin: '<span class="role-badge role-admin">Quản trị</span>',
    teacher: '<span class="role-badge role-teacher">Giảng viên</span>',
    student: '<span class="role-badge role-student">Học viên</span>',
  };
  return map[role] || map.student;
}

function renderStats() {
  const total = cachedUsers.length;
  const admins = cachedUsers.filter((u) => u.role === "admin").length;
  const teachers = cachedUsers.filter((u) => u.role === "teacher").length;
  const students = cachedUsers.filter((u) => u.role === "student").length;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set("stat-total", total);
  set("stat-admin", admins);
  set("stat-teacher", teachers);
  set("stat-student", students);
}

function renderUsers() {
  const tbody = document.getElementById("users-tbody");
  const keyword = (document.getElementById("search-users").value || "").toLowerCase();
  const roleFilter = document.getElementById("filter-role").value || "";

  renderStats(); // thẻ thống kê luôn phản ánh toàn bộ danh sách

  const filtered = cachedUsers.filter((u) => {
    const name = `${u.lastname} ${u.firstname}`.toLowerCase();
    const matchText = name.includes(keyword) || (u.email || "").toLowerCase().includes(keyword);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchText && matchRole;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">Không tìm thấy người dùng nào.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map((u) => {
      const name = `${u.lastname || ""} ${u.firstname || ""}`.trim() || "(Chưa có tên)";
      const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "—";
      const isSelf = u.id === adminUser.id;
      const selfCell = '<span style="color:#94a3b8; font-size:12.5px">Là bạn</span>';
      return `
      <tr>
        <td>
          <div class="admin-user-cell">
            <i class="fas fa-user-circle"></i>
            <div>
              <div class="admin-user-name">${escapeHtml(name)}</div>
              <div class="admin-user-email">${escapeHtml(u.email || "")}</div>
            </div>
          </div>
        </td>
        <td>${roleBadge(u.role)}</td>
        <td>${created}</td>
        <td class="admin-actions-cell">${isSelf ? selfCell : userActionButtons(u)}</td>
      </tr>`;
    })
    .join("");
}

function userActionButtons(u) {
  const roleBtn =
    u.role === "teacher"
      ? `<button class="btn-xs btn-outline" onclick="setRole('${u.id}', 'student')" title="Thu hồi quyền giảng viên">Hạ xuống học viên</button>`
      : u.role === "student"
      ? `<button class="btn-xs btn-outline" onclick="setRole('${u.id}', 'teacher')" title="Cấp quyền giảng viên">Cấp giảng viên</button>`
      : ""; // admin khác: không cho đổi quyền qua UI
  const profileBtn = u.role === "teacher" ? `<button class="btn-xs btn-outline" onclick="openTeacherModal('${u.id}')" title="Sửa hồ sơ giảng viên công khai"><i class="fas fa-user-edit"></i> Sửa hồ sơ</button>` : "";
  const mkBtn = u.tempPassword
    ? `<button class="btn-xs btn-outline" onclick="showSavedPassword('${u.id}')" title="Xem mật khẩu đã lưu">👁 MK</button>`
    : "";
  const resetBtn = `<button class="btn-xs btn-outline" onclick="resetPassword('${escapeAttr(u.email)}')" title="Gửi email đặt lại mật khẩu">Reset MK</button>`;
  const delBtn = `<button class="btn-xs btn-danger" onclick="deleteUser('${u.id}')" title="Xóa hồ sơ khỏi Firestore">Xóa hồ sơ</button>`;
  return [profileBtn, roleBtn, mkBtn, resetBtn, delBtn].filter(Boolean).join(" ");
}

function escapeAttr(s) {
  return String(s || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// Gửi email đặt lại mật khẩu cho user (Firebase Auth)
async function resetPassword(email) {
  if (!email) {
    alert("User này không có email để gửi reset mật khẩu.");
    return;
  }
  if (!confirm(`Gửi email đặt lại mật khẩu tới ${email}?`)) return;
  const result = await sendPasswordReset(email);
  alert(result.ok ? `Đã gửi email đặt lại mật khẩu tới ${email}.` : "Gửi thất bại: " + result.error);
}

// Đổi quyền (ghi Firestore; nếu chặn thì chỉ đổi trong cache + session của user đó)
async function setRole(userId, role) {
  const u = cachedUsers.find((x) => x.id === userId);
  if (!u) return;

  let savedToServer = false;
  if (db) {
    try {
      await db.collection("users").doc(userId).set({ role }, { merge: true });
      savedToServer = true;
    } catch (e) {
      console.warn("[admin] setRole blocked:", e.code);
    }
  }

  u.role = role; // cập nhật cache local để UI phản ánh ngay
  renderUsers();
  renderPermTable();
  renderCourses();

  alert(
    savedToServer
      ? `Đã lưu quyền mới lên server cho ${u.email}!`
      : `Firestore đang chặn nên quyền chỉ đổi tạm trong máy này.\nĐể lưu vĩnh viễn: publish rules mở trong Firestore -> Rules.`
  );
}

async function deleteUser(userId) {
  if (!confirm("Xóa hồ sơ này khỏi Firestore? (Tài khoản đăng nhập vẫn còn)")) return;
  if (db) {
    try {
      await db.collection("users").doc(userId).delete();
    } catch (e) {
      alert("Firestore chặn xóa: " + (e.code || e.message));
    }
  }
  cachedUsers = cachedUsers.filter((u) => u.id !== userId);
  renderUsers();
  renderPermTable();
}

// ---------- COURSES ----------
async function loadCourses() {
  cachedCourses = [];

  if (db) {
    try {
      const snap = await db.collection("courses").get();
      snap.forEach((doc) => {
        const d = doc.data();
        cachedCourses.push({
          id: doc.id,
          title: d.title || "",
          desc: d.desc || "",
          longDesc: d.longDesc || [],
          category: d.category || "",
          level: d.level || "",
          duration: num(d.duration, 0),
          lessons: num(d.lessons, 0),
          price: num(d.price, 0),
          originalPrice: num(d.originalPrice, 0),
          status: d.status || "draft",
          teacherId: d.teacherId || "",
          teacherName: d.teacherName || "",
          image: d.image || "",
          language: d.language || "Tiếng Việt",
          rating: num(d.rating, 0),
          reviewsCount: num(d.reviewsCount, 0),
          studentsCount: num(d.studentsCount, 0),
          includes: d.includes || [],
          curriculum: d.curriculum || [],
          reviews: d.reviews || [],
          createdAt: d.createdAt || null,
        });
      });
    } catch (e) {
      console.warn("[admin] Firestore courses blocked:", e.code);
      showFirestoreWarning();
    }
  }
}

function showFirestoreWarning() {
  const w = document.getElementById("firestore-warning");
  if (w) w.style.display = "block";
}

function renderCourses() {
  const tbody = document.getElementById("courses-tbody");

  // Teacher chỉ thấy khóa học của mình; admin thấy tất cả
  const visibleCourses = isAdminUser
    ? cachedCourses
    : cachedCourses.filter((c) => c.teacherId === adminUser.id);

  if (visibleCourses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">Chưa có khóa học nào. Bấm "Thêm khóa học" để tạo.</td></tr>';
    return;
  }

  const teacherOptions = cachedUsers.filter((u) => u.role === "teacher" || u.role === "admin");

  tbody.innerHTML = visibleCourses
    .map((c) => {
      const teacher = c.teacherName || (teacherOptions.find((u) => u.id === c.teacherId) || {}).email || "—";
      const price = c.price > 0 ? Number(c.price).toLocaleString("vi-VN") + "₫" : "Miễn phí";
      const status =
        c.status === "published"
          ? '<span class="role-badge status-published">Xuất bản</span>'
          : '<span class="role-badge status-draft">Nháp</span>';
      const meta = [c.category, c.level, c.duration ? c.duration + " giờ" : ""].filter(Boolean).join(" · ");
      return `
      <tr>
        <td>
          <div class="admin-user-name">${escapeHtml(c.title)}</div>
          <div class="admin-user-email">${meta ? escapeHtml(meta) + " — " : ""}${escapeHtml(c.desc || "")}</div>
        </td>
        <td>${escapeHtml(teacher)}</td>
        <td>${price}</td>
        <td>${status}</td>
        <td class="admin-actions-cell">
          <a class="btn-xs btn-outline" href="course-detail.html?id=${encodeURIComponent(c.id)}" target="_blank" title="Xem trang chi tiết"><i class="fas fa-eye"></i> Xem</a>
          <button class="btn-xs btn-outline" onclick="editCourse('${c.id}')">Sửa</button>
          <button class="btn-xs btn-danger" onclick="deleteCourse('${c.id}')">Xóa</button>
        </td>
      </tr>`;
    })
    .join("");
}

// ---------- Modal khóa học ----------
function fillSelect(id, options, placeholder) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML =
    (placeholder ? `<option value="">${placeholder}</option>` : "") +
    options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
}

function openCourseModal(course) {
  const modal = document.getElementById("course-modal");
  const teacherSelect = document.getElementById("course-teacher");

  // Dropdown giảng viên = các user có role teacher/admin
  const teachers = cachedUsers.filter((u) => u.role === "teacher" || u.role === "admin");
  teacherSelect.innerHTML =
    teachers.length === 0
      ? '<option value="">(Chưa có giảng viên - hãy cấp quyền ở tab Giảng viên)</option>'
      : teachers
          .map((t) => {
            const name = `${t.lastname || ""} ${t.firstname || ""}`.trim() || t.email;
            return `<option value="${t.id}">${escapeHtml(name)} (${escapeHtml(t.email)})</option>`;
          })
          .join("");

  // Dropdown danh mục + cấp độ + ảnh (từ instructors-data.js)
  fillSelect("course-category", COURSE_CATEGORIES, "");
  fillSelect("course-level", COURSE_LEVELS, "");
  const imgSel = document.getElementById("course-image");
  if (imgSel) {
    imgSel.innerHTML =
      '<option value="">Tự động (xoay vòng ảnh demo)</option>' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<option value="images/course${n}.jpg">course${n}.jpg</option>`).join("");
  }

  if (course) {
    // Chỉnh sửa
    document.getElementById("course-modal-title").textContent = "Sửa khóa học";
    document.getElementById("course-title").value = course.title || "";
    document.getElementById("course-desc").value = course.desc || "";
    document.getElementById("course-longdesc").value = (course.longDesc || []).join("\n");
    document.getElementById("course-category").value = course.category || COURSE_CATEGORIES[0];
    document.getElementById("course-level").value = course.level || COURSE_LEVELS[3];
    document.getElementById("course-duration").value = course.duration || "";
    document.getElementById("course-lessons").value = course.lessons || "";
    document.getElementById("course-price").value = course.price || 0;
    document.getElementById("course-original-price").value = course.originalPrice || "";
    document.getElementById("course-status").value = course.status || "draft";
    document.getElementById("course-image").value = course.image || "";
    document.getElementById("course-language").value = course.language || "Tiếng Việt";
    document.getElementById("course-rating").value = course.rating || "";
    document.getElementById("course-reviews-count").value = course.reviewsCount || "";
    document.getElementById("course-students-count").value = course.studentsCount || "";
    document.getElementById("course-includes").value = (course.includes || []).join("\n");
    renderCurriculumEditor(course.curriculum || []);
    renderReviewsEditor(course.reviews || []);
    teacherSelect.value = course.teacherId || adminUser.id;
    editingCourseId = course.id;
  } else {
    // Tạo mới
    document.getElementById("course-modal-title").textContent = "Thêm khóa học";
    ["course-title", "course-desc", "course-longdesc", "course-duration", "course-lessons", "course-price", "course-original-price", "course-rating", "course-reviews-count", "course-students-count", "course-includes"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.getElementById("course-category").value = COURSE_CATEGORIES[0];
    document.getElementById("course-level").value = COURSE_LEVELS[3];
    document.getElementById("course-status").value = "published";
    document.getElementById("course-image").value = "";
    document.getElementById("course-language").value = "Tiếng Việt";
    renderCurriculumEditor([]);
    renderReviewsEditor([]);
    teacherSelect.value = adminUser.id; // mặc định là người đang đăng nhập
    editingCourseId = null;
  }

  // Teacher không được chọn giảng viên khác (luôn là chính mình)
  teacherSelect.disabled = !isAdminUser;

  modal.style.display = "flex";
}

function closeCourseModal() {
  document.getElementById("course-modal").style.display = "none";
  document.getElementById("course-error").textContent = "";
}

document.getElementById("btn-new-course").addEventListener("click", () => openCourseModal(null));
document.getElementById("course-cancel").addEventListener("click", closeCourseModal);

function editCourse(courseId) {
  const course = cachedCourses.find((c) => c.id === courseId);
  if (course) openCourseModal(course);
}

async function deleteCourse(courseId) {
  if (!confirm("Xóa khóa học này?")) return;
  if (db) {
    try {
      await db.collection("courses").doc(courseId).delete();
    } catch (e) {
      alert("Firestore chặn xóa: " + (e.code || e.message));
    }
  }
  cachedCourses = cachedCourses.filter((c) => c.id !== courseId);
  renderCourses();
}

// ---------- Trình soạn chương trình học ----------
function addCurriculumSection(data) {
  const list = document.getElementById("course-curriculum-list");
  const box = document.createElement("div");
  box.className = "curriculum-section-item";
  box.innerHTML = `
    <div class="curriculum-section-head">
      <input class="form-input sec-title" placeholder="Tên phần (VD: Giới thiệu khóa học)" />
      <input class="form-input sec-duration" placeholder="3 giờ" style="max-width:100px" />
      <button type="button" class="btn btn-outline btn-xs sec-remove" title="Xóa phần này"><i class="fas fa-trash-alt"></i></button>
    </div>
    <textarea class="form-input form-textarea sec-lessons" style="min-height:64px" placeholder="Mỗi dòng 1 bài học:&#10;Welcome & Course Overview | 14:30"></textarea>`;
  box.querySelector(".sec-title").value = data.title || "";
  box.querySelector(".sec-duration").value = data.duration || "";
  const lessonLines = (data.lessons || []).map((l) => `${l.name || ""} | ${l.duration || ""}`);
  box.querySelector(".sec-lessons").value = lessonLines.join("\n");
  box.querySelector(".sec-remove").addEventListener("click", () => box.remove());
  list.appendChild(box);
}

function renderCurriculumEditor(sections) {
  const list = document.getElementById("course-curriculum-list");
  list.innerHTML = "";
  if (!sections.length) {
    addCurriculumSection({ title: "", duration: "", lessons: [] });
    return;
  }
  sections.forEach((s) => addCurriculumSection(s));
}

function collectCurriculum() {
  return Array.from(document.querySelectorAll("#course-curriculum-list .curriculum-section-item"))
    .map((box) => {
      const title = box.querySelector(".sec-title").value.trim();
      const duration = box.querySelector(".sec-duration").value.trim();
      const lessons = splitLines(box.querySelector(".sec-lessons").value).map((line) => {
        const idx = line.lastIndexOf("|");
        return {
          name: idx >= 0 ? line.slice(0, idx).trim() : line.trim(),
          duration: idx >= 0 ? line.slice(idx + 1).trim() : "",
        };
      });
      return { title, duration, lessonsCount: lessons.length, lessons };
    })
    .filter((s) => s.title || s.lessons.length);
}

document.getElementById("btn-add-section").addEventListener("click", () => addCurriculumSection({}));

// ---------- Trình soạn đánh giá ----------
function addReviewRow(data) {
  const list = document.getElementById("course-reviews-list");
  const row = document.createElement("div");
  row.className = "review-row";
  row.innerHTML = `
    <input class="form-input rv-name" placeholder="Tên học viên" />
    <select class="form-input rv-stars">
      <option value="5">5 ★</option>
      <option value="4">4 ★</option>
      <option value="3">3 ★</option>
      <option value="2">2 ★</option>
      <option value="1">1 ★</option>
    </select>
    <input class="form-input rv-date" placeholder="2 tuần trước" />
    <input class="form-input rv-text" placeholder="Nội dung đánh giá" />
    <button type="button" class="btn btn-outline btn-xs rv-remove" title="Xóa đánh giá"><i class="fas fa-trash-alt"></i></button>`;
  row.querySelector(".rv-name").value = data.name || "";
  row.querySelector(".rv-stars").value = String(num(data.stars, 5));
  row.querySelector(".rv-date").value = data.date || "";
  row.querySelector(".rv-text").value = data.text || "";
  row.querySelector(".rv-remove").addEventListener("click", () => row.remove());
  list.appendChild(row);
}

function renderReviewsEditor(reviews) {
  const list = document.getElementById("course-reviews-list");
  list.innerHTML = "";
  (reviews || []).forEach((r) => addReviewRow(r));
}

function collectReviews() {
  return Array.from(document.querySelectorAll("#course-reviews-list .review-row"))
    .map((row) => ({
      name: row.querySelector(".rv-name").value.trim(),
      stars: num(row.querySelector(".rv-stars").value, 5),
      date: row.querySelector(".rv-date").value.trim(),
      text: row.querySelector(".rv-text").value.trim(),
    }))
    .filter((r) => r.name || r.text);
}

document.getElementById("btn-add-review").addEventListener("click", () => addReviewRow({}));

// ---------- Lưu khóa học ----------
document.getElementById("course-save").addEventListener("click", async () => {
  const title = document.getElementById("course-title").value.trim();
  const desc = document.getElementById("course-desc").value.trim();
  const teacherId = document.getElementById("course-teacher").value;

  if (!title) {
    document.getElementById("course-error").textContent = "Vui lòng nhập tên khóa học.";
    return;
  }
  if (!teacherId) {
    document.getElementById("course-error").textContent = "Hãy cấp quyền giảng viên cho ít nhất 1 tài khoản trước.";
    return;
  }

  // Teacher: khóa học luôn thuộc về chính mình
  const finalTeacherId = isAdminUser ? teacherId : adminUser.id;
  const teacher = cachedUsers.find((u) => u.id === finalTeacherId);
  const data = {
    title,
    desc,
    longDesc: splitLines(document.getElementById("course-longdesc").value),
    category: document.getElementById("course-category").value,
    level: document.getElementById("course-level").value,
    duration: num(document.getElementById("course-duration").value, 0),
    lessons: num(document.getElementById("course-lessons").value, 0),
    price: num(document.getElementById("course-price").value, 0),
    originalPrice: num(document.getElementById("course-original-price").value, 0),
    status: document.getElementById("course-status").value,
    image: document.getElementById("course-image").value,
    language: document.getElementById("course-language").value.trim() || "Tiếng Việt",
    rating: num(document.getElementById("course-rating").value, 0),
    reviewsCount: num(document.getElementById("course-reviews-count").value, 0),
    studentsCount: num(document.getElementById("course-students-count").value, 0),
    includes: splitLines(document.getElementById("course-includes").value),
    curriculum: collectCurriculum(),
    reviews: collectReviews(),
    teacherId: finalTeacherId,
    teacherName: teacher ? `${teacher.lastname || ""} ${teacher.firstname || ""}`.trim() : "",
    updatedAt: new Date().toISOString(),
  };

  if (db) {
    try {
      if (editingCourseId) {
        await db.collection("courses").doc(editingCourseId).set(data, { merge: true });
      } else {
        data.createdAt = new Date().toISOString();
        const ref = await db.collection("courses").add(data);
        data.id = ref.id;
      }
    } catch (e) {
      alert("Firestore chặn lưu: " + (e.code || e.message));
      return;
    }
  }

  // Cập nhật cache + render
  if (editingCourseId) {
    const idx = cachedCourses.findIndex((c) => c.id === editingCourseId);
    if (idx !== -1) cachedCourses[idx] = { ...cachedCourses[idx], ...data };
  } else if (!db) {
    cachedCourses.push({ id: "local-" + Date.now(), ...data });
  }
  renderCourses();
  closeCourseModal();
});

// ---------- Giảng viên (tab 3): hồ sơ + phân quyền ----------
function renderPermTable() {
  const tbody = document.getElementById("perm-tbody");

  // Teacher chỉ thấy và sửa được hồ sơ của chính mình
  const visibleUsers = isAdminUser ? cachedUsers : cachedUsers.filter((u) => u.id === adminUser.id);

  if (visibleUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">Không có người dùng nào.</td></tr>';
    return;
  }

  tbody.innerHTML = visibleUsers
    .map((u) => {
      const name = `${u.lastname || ""} ${u.firstname || ""}`.trim() || "(Chưa có tên)";
      const isTeacherLike = u.role === "teacher" || u.role === "admin";
      const isSelf = u.id === adminUser.id;
      const profileDone = !!(u.title || u.bio || (u.about && u.about.length));
      const profileState = isTeacherLike
        ? profileDone
          ? '<span class="role-badge status-published">Đã có hồ sơ</span>'
          : '<span class="role-badge status-draft">Chưa cập nhật</span>'
        : '<span style="color:#94a3b8; font-size:12.5px">—</span>';

      // Hành động: Sửa hồ sơ (giảng viên) + xem trang công khai; admin được đổi quyền người khác
      const actions = [];
      if (isTeacherLike) {
        actions.push(`<button class="btn-xs btn-outline" onclick="openTeacherModal('${u.id}')"><i class="fas fa-user-edit"></i> Sửa hồ sơ</button>`);
        actions.push(`<a class="btn-xs btn-outline" href="instructor-detail.html?id=${encodeURIComponent(u.id)}" target="_blank" title="Xem trang hồ sơ công khai"><i class="fas fa-eye"></i> Xem trang</a>`);
      }
      if (isAdminUser && !isSelf) {
        actions.push(
          u.role === "teacher"
            ? `<button class="btn-xs btn-outline" onclick="setRole('${u.id}', 'student')">Thu hồi quyền</button>`
            : `<button class="btn-xs btn-outline" onclick="setRole('${u.id}', 'teacher')">Cấp quyền giảng viên</button>`
        );
      }

      return `
      <tr>
        <td>
          <div class="admin-user-cell">
            <i class="fas fa-user-circle"></i>
            <div>
              <div class="admin-user-name">${escapeHtml(name)}</div>
              <div class="admin-user-email">${escapeHtml(u.email || "")}</div>
            </div>
          </div>
        </td>
        <td>${roleBadge(u.role)}<div style="margin-top:4px">${profileState}</div></td>
        <td class="admin-actions-cell">${actions.join(" ") || '<span style="color:#94a3b8; font-size:12.5px">Là bạn</span>'}</td>
      </tr>`;
    })
    .join("");
}

// ---------- Modal hồ sơ giảng viên (2 cột + xem trước) ----------
function addSkillRow(data) {
  const list = document.getElementById("teacher-skills-list");
  const row = document.createElement("div");
  row.className = "skill-row";
  row.innerHTML = `
    <input class="form-input sk-name" placeholder="Tên kỹ năng" />
    <input type="number" class="form-input sk-percent" min="0" max="100" placeholder="%" />
    <div class="mini-bar"><div class="mini-bar-fill" style="width:0%"></div></div>
    <button type="button" class="btn btn-outline btn-xs sk-remove" title="Xóa kỹ năng"><i class="fas fa-trash-alt"></i></button>`;
  row.querySelector(".sk-name").value = data.name || "";
  row.querySelector(".sk-percent").value = num(data.percent, 0) || "";
  const syncBar = () => {
    row.querySelector(".mini-bar-fill").style.width = Math.max(0, Math.min(100, num(row.querySelector(".sk-percent").value, 0))) + "%";
  };
  syncBar();
  row.querySelector(".sk-percent").addEventListener("input", () => {
    syncBar();
    updateTeacherPreview();
  });
  row.querySelector(".sk-name").addEventListener("input", updateTeacherPreview);
  row.querySelector(".sk-remove").addEventListener("click", () => {
    row.remove();
    updateTeacherPreview();
  });
  list.appendChild(row);
}

function collectSkillRows() {
  return Array.from(document.querySelectorAll("#teacher-skills-list .skill-row"))
    .map((row) => ({
      name: row.querySelector(".sk-name").value.trim(),
      percent: Math.max(0, Math.min(100, num(row.querySelector(".sk-percent").value, 0))),
    }))
    .filter((s) => s.name);
}

function openTeacherModal(userId) {
  const u = cachedUsers.find((x) => x.id === userId);
  if (!u) return;
  uploadedTeacherImage = null; // mở modal mới -> bỏ ảnh upload cũ

  // Chỉ admin được sửa hồ sơ người khác; teacher chỉ sửa được của mình
  if (!isAdminUser && u.id !== adminUser.id) return;

  editingTeacherId = u.id;

  const name = `${u.lastname || ""} ${u.firstname || ""}`.trim() || u.email || "Giảng viên";
  document.getElementById("teacher-modal-title").textContent = `Sửa hồ sơ giảng viên — ${name}`;

  document.getElementById("teacher-title").value = u.title || "";
  document.getElementById("teacher-experience").value = u.experience || "";
  document.getElementById("teacher-bio").value = u.bio || "";
  document.getElementById("teacher-about").value = (u.about || []).join("\n");
  document.getElementById("teacher-students").value = u.students || "";
  document.getElementById("teacher-rating").value = u.rating || "";
  document.getElementById("teacher-twitter").value = (u.social && u.social.twitter) || "";
  document.getElementById("teacher-linkedin").value = (u.social && u.social.linkedin) || "";
  document.getElementById("teacher-github").value = (u.social && u.social.github) || "";
  document.getElementById("teacher-facebook").value = (u.social && u.social.facebook) || "";

  // Dropdown ảnh đại diện + ảnh upload từ máy (dataURL)
  const imgSel = document.getElementById("teacher-image");
  imgSel.innerHTML =
    '<option value="">Tự động (gợi ý theo danh sách)</option>' +
    [1, 2, 3, 4, 5, 6].map((n) => `<option value="images/instructor${n}.jpg">instructor${n}.jpg</option>`).join("");
  imgSel.value = u.image || "";
  if (imgSel.value === "" && u.image && String(u.image).startsWith("data:image/")) {
    // Ảnh đang dùng là ảnh upload -> thêm vào dropdown để hiển thị đúng lựa chọn
    const opt = document.createElement("option");
    opt.value = u.image;
    opt.textContent = "Ảnh đã tải lên";
    imgSel.add(opt);
    imgSel.value = u.image;
  }
  const errImg = document.getElementById("error-teacher-image");
  if (errImg) errImg.textContent = "";

  // Kỹ năng
  const skillList = document.getElementById("teacher-skills-list");
  skillList.innerHTML = "";
  (u.skills && u.skills.length ? u.skills : [{ name: "", percent: 80 }]).forEach((s) => addSkillRow(s));

  document.getElementById("teacher-error").textContent = "";
  updateTeacherPreview();
  document.getElementById("teacher-modal").style.display = "flex";
}

function closeTeacherModal() {
  document.getElementById("teacher-modal").style.display = "none";
  document.getElementById("teacher-error").textContent = "";
  editingTeacherId = null;
}

document.getElementById("teacher-cancel").addEventListener("click", closeTeacherModal);

// Cập nhật khung "Xem trước hồ sơ" theo dữ liệu đang nhập
function updateTeacherPreview() {
  const u = cachedUsers.find((x) => x.id === editingTeacherId) || {};
  const val = (id) => (document.getElementById(id) ? document.getElementById(id).value : "");

  document.getElementById("preview-avatar").src = uploadedTeacherImage || val("teacher-image") || u.image || instructorAvatar(null, 0);
  document.getElementById("preview-name").textContent =
    `${u.lastname || ""} ${u.firstname || ""}`.trim() || u.email || "Giảng viên";
  document.getElementById("preview-title").textContent = val("teacher-title") || "Chức danh";
  document.getElementById("preview-bio").textContent = val("teacher-bio") || "Giới thiệu ngắn sẽ hiển thị ở đây.";

  const students = num(val("teacher-students"), 0);
  document.getElementById("preview-students").textContent =
    students > 0 ? students.toLocaleString("vi-VN") + "+" : "0+";
  const rating = num(val("teacher-rating"), 0);
  document.getElementById("preview-rating").textContent = rating > 0 ? rating.toFixed(1) : "—";

  const skills = collectSkillRows();
  document.getElementById("preview-skills").innerHTML = skills.length
    ? skills
        .map(
          (s) => `
      <div class="skill-item">
        <div class="skill-header"><span>${escapeHtml(s.name)}</span><span>${s.percent}%</span></div>
        <div class="skill-bar"><div class="skill-bar-fill" style="width:${s.percent}%"></div></div>
      </div>`
        )
        .join("")
    : '<p style="font-size:12.5px; color:#94a3b8; text-align:left">Chưa có kỹ năng nào.</p>';
}

// Upload ảnh đại diện giảng viên từ file local
const teacherImageFile = document.getElementById("teacher-image-file");
const btnTeacherImageUpload = document.getElementById("btn-teacher-image-upload");

btnTeacherImageUpload.addEventListener("click", () => teacherImageFile.click());

teacherImageFile.addEventListener("change", async () => {
  const errImg = document.getElementById("error-teacher-image");
  if (errImg) errImg.textContent = "";
  const file = teacherImageFile.files && teacherImageFile.files[0];
  teacherImageFile.value = ""; // cho phép chọn lại cùng 1 file lần sau
  if (!file) return;

  btnTeacherImageUpload.disabled = true;
  btnTeacherImageUpload.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
  const res = await fileToCompressedDataUrl(file, 300);
  btnTeacherImageUpload.disabled = false;
  btnTeacherImageUpload.innerHTML = '<i class="fas fa-upload"></i> Tải ảnh lên';

  if (!res.ok) {
    if (errImg) errImg.textContent = res.error;
    return;
  }

  uploadedTeacherImage = res.dataUrl;
  document.getElementById("preview-avatar").src = uploadedTeacherImage; // xem trước ngay
});

// Cập nhật preview khi gõ
["teacher-title", "teacher-experience", "teacher-bio", "teacher-about", "teacher-students", "teacher-rating", "teacher-image"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", updateTeacherPreview);
});
document.getElementById("btn-add-skill").addEventListener("click", () => addSkillRow({}));

// Lưu hồ sơ giảng viên
document.getElementById("teacher-save").addEventListener("click", async () => {
  if (!editingTeacherId) return;
  const u = cachedUsers.find((x) => x.id === editingTeacherId);
  if (!u) return;

  const social = {};
  ["twitter", "linkedin", "github", "facebook"].forEach((k) => {
    const v = (document.getElementById("teacher-" + k) || {}).value || "";
    if (v.trim()) social[k] = v.trim();
  });

  const data = {
    title: document.getElementById("teacher-title").value.trim(),
    image: uploadedTeacherImage || document.getElementById("teacher-image").value,
    bio: document.getElementById("teacher-bio").value.trim(),
    about: splitLines(document.getElementById("teacher-about").value),
    skills: collectSkillRows(),
    students: num(document.getElementById("teacher-students").value, 0),
    rating: Math.max(0, Math.min(5, num(document.getElementById("teacher-rating").value, 0))),
    experience: document.getElementById("teacher-experience").value.trim(),
    social,
    updatedAt: new Date().toISOString(),
  };

  if (!data.title && !data.bio && data.about.length === 0) {
    document.getElementById("teacher-error").textContent = "Hãy điền ít nhất Chức danh, Giới thiệu ngắn hoặc Về tôi.";
    return;
  }

  const btn = document.getElementById("teacher-save");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

  let savedToServer = false;
  if (db) {
    try {
      await db.collection("users").doc(editingTeacherId).set(data, { merge: true });
      savedToServer = true;
    } catch (e) {
      alert("Firestore chặn lưu hồ sơ: " + (e.code || e.message));
    }
  }

  // Cập nhật cache + render lại các bảng
  Object.assign(u, data);
  renderUsers();
  renderPermTable();

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Lưu hồ sơ';
  closeTeacherModal();

  if (savedToServer) {
    alert(`Đã lưu hồ sơ giảng viên cho ${u.email}! Mở trang Giảng viên để xem kết quả.`);
  } else if (!db) {
    alert("Đã lưu tạm trong máy này (Firestore chưa kết nối).");
  }
});

// ---------- Search + filter + refresh ----------
document.getElementById("search-users").addEventListener("input", renderUsers);
document.getElementById("filter-role").addEventListener("change", renderUsers);
document.getElementById("refresh-users").addEventListener("click", loadAll);

// ---------- Tạo tài khoản phụ (chỉ ADMIN) ----------
function openUserModal() {
  if (!isAdminUser) return;
  document.getElementById("user-modal").style.display = "flex";
  document.getElementById("user-error").textContent = "";
  setTimeout(() => document.getElementById("new-user-firstname").focus(), 50);
}

function closeUserModal() {
  document.getElementById("user-modal").style.display = "none";
  ["new-user-firstname", "new-user-lastname", "new-user-email", "new-user-password"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("new-user-role").value = "student";
  document.getElementById("user-error").textContent = "";
}

document.getElementById("btn-new-user").addEventListener("click", openUserModal);
document.getElementById("user-cancel").addEventListener("click", closeUserModal);

// ============================================================
// Tạo tài khoản từ trang admin (dùng chung cho modal + TK test)
// Firebase Auth KHÔNG lưu mật khẩu đọc được -> với TK tạo từ đây,
// ta tự lưu thêm trường tempPassword vào hồ sơ để admin xem lại.
// ============================================================
// Trả về { ok, uid, existed, savedToServer, createdAt, error }
async function createAdminAccount({ firstname, lastname, email, password, role }) {
  // Tạo trên Firebase Auth bằng app PHỤ để không làm mất phiên đăng nhập admin
  let secondary;
  try {
    secondary = firebase.app("AdminCreator");
  } catch (e) {
    secondary = firebase.initializeApp(firebaseConfig, "AdminCreator");
  }

  let uid = null;
  let existed = false;
  try {
    const cred = await secondary.auth().createUserWithEmailAndPassword(email, password);
    uid = cred.user.uid;
    await secondary.auth().signOut();
  } catch (err) {
    if (err && err.code === "auth/email-already-in-use") {
      existed = true;
      const known = cachedUsers.find((u) => (u.email || "").toLowerCase() === email);
      if (known) uid = known.id;
    } else {
      return { ok: false, error: mapAuthError(err) };
    }
  }

  if (!uid) {
    return { ok: false, error: "Email đã tồn tại trên Firebase nhưng chưa có trong danh sách. Bấm 'Tải lại' rồi thử lại." };
  }

  // Ghi hồ sơ vào Firestore bằng quyền admin (db chính)
  const createdAt = new Date().toISOString();
  let savedToServer = false;
  if (db) {
    try {
      await db.collection("users").doc(uid).set(
        existed
          ? { role, tempPassword: password }
          : { firstname, lastname, email, role, tempPassword: password, createdAt },
        { merge: true }
      );
      savedToServer = true;
    } catch (e) {
      console.warn("[admin] ghi hồ sơ bị chặn:", e.code);
    }
  }
  return { ok: true, uid, existed, savedToServer, createdAt };
}

// Xem mật khẩu đã lưu của TK test (nút 👁 MK trong bảng)
function showSavedPassword(userId) {
  const u = cachedUsers.find((x) => x.id === userId);
  if (!u) return;
  if (!u.tempPassword) {
    alert(
      "Không có mật khẩu lưu cho user này.\n\n" +
        "Chỉ tài khoản tạo từ trang admin mới lưu mật khẩu để xem lại. " +
        "Mật khẩu đăng ký bình thường được Firebase mã hóa 1 chiều — không ai xem được."
    );
    return;
  }
  alert(`Tài khoản: ${u.email}\nMật khẩu: ${u.tempPassword}`);
}

// ---------- Tạo nhanh bộ TK test (chỉ ADMIN) ----------
const TEST_PASSWORD = "Test@1234";
const TEST_ACCOUNTS = [
  { email: "test.hocvien1@example.com", firstname: "HocVien", lastname: "Test 1", role: "student" },
  { email: "test.hocvien2@example.com", firstname: "HocVien", lastname: "Test 2", role: "student" },
  { email: "test.giangvien@example.com", firstname: "GiangVien", lastname: "Test", role: "teacher" },
];

async function createTestAccounts() {
  if (!isAdminUser) return;
  const summary = TEST_ACCOUNTS.map((t) => `• ${t.email} — ${t.role === "teacher" ? "Giảng viên" : "Học viên"}`).join("\n");
  if (!confirm(`Tạo ${TEST_ACCOUNTS.length} tài khoản test?\n\n${summary}\n\nMật khẩu chung: ${TEST_PASSWORD}`)) return;

  const results = [];
  for (const t of TEST_ACCOUNTS) {
    results.push({ email: t.email, role: t.role, ...(await createAdminAccount({ ...t, password: TEST_PASSWORD })) });
  }

  await loadUsers();
  renderUsers();
  renderPermTable();

  const lines = results.map((r) => {
    if (!r.ok) return `❌ ${r.email}: ${r.error}`;
    if (r.existed) return `♻️ ${r.email}: đã tồn tại — đã ghi lại mật khẩu vào hồ sơ`;
    return `✅ ${r.email}: tạo thành công${r.savedToServer ? "" : " (Firestore chặn ghi hồ sơ!)"}`;
  });
  alert(
    "Kết quả tạo TK test:\n\n" +
      lines.join("\n") +
      `\n\nMật khẩu chung: ${TEST_PASSWORD}\nBấm nút "👁 MK" trong bảng để xem lại mật khẩu.`
  );
}

document.getElementById("btn-test-accounts").addEventListener("click", createTestAccounts);

document.getElementById("user-save").addEventListener("click", async () => {
  const firstname = document.getElementById("new-user-firstname").value.trim();
  const lastname = document.getElementById("new-user-lastname").value.trim();
  const email = document.getElementById("new-user-email").value.trim().toLowerCase();
  const password = document.getElementById("new-user-password").value;
  const role = document.getElementById("new-user-role").value;
  const errEl = document.getElementById("user-error");

  // Validate giống trang đăng ký
  const regexVn = /^[\p{L}\s]{2,50}$/u;
  if (firstname.length < 2 || /\s/.test(firstname) || !regexVn.test(firstname)) {
    errEl.textContent = "Tên phải từ 2 ký tự trở lên, viết liền, không chứa số.";
    return;
  }
  if (lastname.length < 2 || !regexVn.test(lastname)) {
    errEl.textContent = "Họ phải từ 2 ký tự trở lên, không chứa số.";
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = "Email không đúng định dạng.";
    return;
  }
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errEl.textContent = "Mật khẩu cần 8+ ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.";
    return;
  }
  if (role === "admin") {
    errEl.textContent = "Không thể tạo tài khoản admin từ đây. Thêm email vào ADMIN_EMAILS trong js/firebase-config.js.";
    return;
  }

  const btn = document.getElementById("user-save");
  btn.disabled = true;
  btn.textContent = "Đang tạo...";

  try {
    const result = await createAdminAccount({ firstname, lastname, email, password, role });
    if (!result.ok) {
      errEl.textContent = result.error;
      return;
    }

    // Cập nhật cache + render ngay
    if (result.existed) {
      const known = cachedUsers.find((u) => u.id === result.uid);
      if (known) {
        known.role = role;
        known.tempPassword = password;
      }
    } else {
      cachedUsers.push({
        id: result.uid,
        firstname,
        lastname,
        email,
        role,
        createdAt: result.createdAt,
        tempPassword: password,
      });
    }
    renderUsers();
    renderPermTable();
    closeUserModal();

    alert(
      result.savedToServer
        ? `Đã tạo tài khoản ${email} (quyền: ${role === "teacher" ? "Giảng viên" : "Học viên"}).\nMật khẩu: ${password}\nBấm "👁 MK" trong bảng để xem lại bất cứ lúc nào.`
        : `Đã tạo tài khoản ${email} trên Firebase Auth, NHƯNG Firestore chặn ghi hồ sơ (không lưu được mật khẩu).\nMật khẩu: ${password}\nVui lòng publish rules mở rồi bấm Tải lại.`
    );
  } finally {
    btn.disabled = false;
    btn.textContent = "Tạo tài khoản";
  }
});

// ---------- Khởi động ----------
loadAll();
