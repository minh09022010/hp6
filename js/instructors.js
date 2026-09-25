// ============================================================
// instructors.js - Trang danh sách giảng viên (instructors.html)
// - CHỈ hiển thị giảng viên CÓ TÀI KHOẢN THẬT (users có role teacher/admin trong Firestore)
// - Firestore trống / chặn -> hiển thị trạng thái rỗng (không dùng dữ liệu demo)
// Nhúng: firebase-*.js -> firebase-config.js -> auth.js -> instructors-data.js -> instructors.js
// ============================================================

const instructorsGrid = document.querySelector(".instructors-grid");

// escapeHtml / socialLinksHTML / instructorAvatar / num đã có trong instructors-data.js

function instructorCardHTML(t, idx) {
  const img = instructorAvatar(t.image, idx);
  const name = escapeHtml(t.name);
  const title = escapeHtml(t.title || "Giảng viên");
  const bio = escapeHtml(t.bio || (t.about && t.about[0]) || "");
  const studentsNum = num(t.students, 0);
  const students = studentsNum > 0 ? studentsNum.toLocaleString("vi-VN") + "+" : "—";
  const coursesCount = num(t.coursesCount, 0) || (t.courses ? t.courses.length : 0);
  const rating = num(t.rating, 0) > 0 ? num(t.rating, 0).toFixed(1) : "—";
  return `
      <div class="instructor-profile-card">
        <img src="${img}" alt="${name}" />
        <h3>${name}</h3>
        <p class="role">${title}</p>
        <p>${bio}</p>
        <div class="instructor-social">${socialLinksHTML(t.social, t.name)}</div>
        <div class="instructor-profile-stats">
          <div><div class="instructor-profile-stat-value">${students}</div><div class="instructor-profile-stat-label">Học viên</div></div>
          <div><div class="instructor-profile-stat-value">${coursesCount}</div><div class="instructor-profile-stat-label">Khóa học</div></div>
          <div><div class="instructor-profile-stat-value">${rating}</div><div class="instructor-profile-stat-label">Đánh giá</div></div>
        </div>
        <a href="instructor-detail.html?id=${encodeURIComponent(t.id)}" class="btn btn-outline btn-sm" style="margin-top:20px">Xem hồ sơ</a>
      </div>`;
}

// ---------- Nạp giảng viên từ Firestore ----------
async function loadInstructors() {
  if (!db || !instructorsGrid) return;

  let list = [];

  // 1) Hồ sơ giảng viên thật từ collection "users"
  try {
    const snap = await db.collection("users").where("role", "in", ["teacher", "admin"]).get();
    snap.forEach((doc) => {
      const d = doc.data();
      list.push({
        id: doc.id,
        name: `${d.lastname || ""} ${d.firstname || ""}`.trim() || d.email || "Giảng viên",
        title: d.title || d.teacherTitle || "",
        image: d.image || d.avatar || d.photoURL || "",
        bio: d.bio || "",
        about: d.about || [],
        skills: d.skills || [],
        social: d.social || {},
        students: num(d.students, 0),
        coursesCount: num(d.coursesCount, 0),
        rating: num(d.rating, 0),
        experience: d.experience || "",
      });
    });
  } catch (e) {
    console.warn("[instructors] Firestore blocked:", e.code);
  }

  // Đếm khóa học đã xuất bản của từng giảng viên (hồ sơ thật chưa điền số)
  try {
    const counts = {};
    const cs = await db.collection("courses").where("status", "==", "published").get();
    cs.forEach((c) => {
      const tid = c.data().teacherId;
      if (tid) counts[tid] = (counts[tid] || 0) + 1;
    });
    list.forEach((t) => {
      if (!t.coursesCount && counts[t.id]) t.coursesCount = counts[t.id];
    });
  } catch (e) {
    /* Firestore chặn -> bỏ qua */
  }

  // Không có giảng viên nào trong hệ thống -> thông báo rỗng
  if (list.length === 0) {
    instructorsGrid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#64748b">
        <i class="fas fa-chalkboard-teacher" style="font-size:48px; margin-bottom:16px; color:#cbd5e1"></i>
        <h3 style="margin-bottom:8px; color:#334155">Chưa có giảng viên nào</h3>
        <p>Giảng viên sẽ xuất hiện ở đây sau khi được tạo tài khoản và cập nhật hồ sơ trong hệ thống.</p>
      </div>`;
    return;
  }

  instructorsGrid.innerHTML = list.map((t, i) => instructorCardHTML(t, i)).join("");
}

loadInstructors();
