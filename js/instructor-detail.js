// ============================================================
// instructor-detail.js - Trang hồ sơ giảng viên (instructor-detail.html)
// - Đọc ?id= trên URL: id là UID trong Firestore (collection "users")
// - CHỈ hiện hồ sơ giảng viên CÓ TÀI KHOẢN THẬT; không tìm thấy -> trang thông báo rỗng
// Nhúng: firebase-*.js -> firebase-config.js -> auth.js -> instructors-data.js -> instructor-detail.js
// ============================================================

const params = new URLSearchParams(window.location.search);
const profileId = params.get("id");

// ---------- Render hồ sơ vào trang ----------
function renderInstructor(t) {
  // Sidebar
  document.getElementById("profile-image").src = t.image || instructorAvatar(null, 0);
  document.getElementById("profile-image").alt = t.name || "";
  document.getElementById("profile-name").textContent = t.name || "Giảng viên";
  document.getElementById("profile-role").textContent = t.title || "Giảng viên";

  // Social
  const socialEl = document.getElementById("profile-social");
  if (socialEl) socialEl.innerHTML = socialLinksHTML(t.social);

  // Stats
  document.getElementById("profile-students").textContent =
    num(t.students, 0) > 0 ? num(t.students, 0).toLocaleString("vi-VN") + "+" : "—";
  document.getElementById("profile-courses-count").textContent = num(t.coursesCount, 0) || (t.courses ? t.courses.length : 0);
  document.getElementById("profile-rating").textContent = num(t.rating, 0) > 0 ? num(t.rating, 0).toFixed(1) : "—";
  document.getElementById("profile-experience").textContent = t.experience ? `${t.experience}` : "—";

  // Breadcrumb: tên giảng viên
  const bc = document.getElementById("profile-breadcrumb");
  if (bc) bc.textContent = t.name || "Giảng viên";
  const heroTitle = document.getElementById("profile-hero-name");
  if (heroTitle) heroTitle.textContent = t.name || "";

  // Về tôi
  const aboutContainer = document.getElementById("profile-about");
  aboutContainer.innerHTML = "";
  const aboutArr = Array.isArray(t.about) && t.about.length ? t.about : t.bio ? [t.bio] : ["Giảng viên chưa cập nhật giới thiệu."];
  aboutArr.forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    aboutContainer.appendChild(p);
  });

  // Kỹ năng
  const skillsContainer = document.getElementById("profile-skills");
  const skills = t.skills || [];
  if (!skills.length) {
    skillsContainer.innerHTML = '<p style="color:#64748b">Chưa cập nhật kỹ năng.</p>';
  } else {
    skillsContainer.innerHTML = skills
      .map(
        (skill) => `
      <div class="skill-item">
        <div class="skill-header">
          <span>${escapeHtml(skill.name)}</span>
          <span>${num(skill.percent, 0)}%</span>
        </div>
        <div class="skill-bar">
          <div class="skill-bar-fill" style="width:${num(skill.percent, 0)}%"></div>
        </div>
      </div>`
      )
      .join("");
  }

  // Khóa học của giảng viên
  const coursesContainer = document.getElementById("profile-courses");
  const coursesTitle = document.getElementById("courses-title");
  coursesTitle.textContent = `Khóa học của ${(t.name || "giảng viên").split(" ")[0]}`;

  const courses = t.courses || [];
  if (!courses.length) {
    coursesContainer.innerHTML = '<p style="color:#64748b">Giảng viên chưa có khóa học nào.</p>';
    return;
  }
  coursesContainer.innerHTML = courses
    .map((course, i) => {
      const badge = COURSE_BADGES[course.level] || "badge-beginner";
      // Tất cả khóa học đều là khóa thật -> trang chi tiết theo id
      const detailLink = `course-detail.html?id=${encodeURIComponent(course.id || "")}`;
      return `
      <article class="course-card">
        <div class="course-card-image">
          <img src="${courseImage(course.image, i)}" alt="${escapeHtml(course.title)}" />
          <span class="course-card-badge ${badge}">${escapeHtml(course.level || "Cơ bản")}</span>
        </div>
        <div class="course-card-body">
          <div class="course-card-category">${escapeHtml(course.category || "Khác")}</div>
          <h3 class="course-card-title"><a href="${detailLink}">${escapeHtml(course.title)}</a></h3>
          <p class="course-card-description">${escapeHtml(course.desc || "")}</p>
          <div class="course-card-meta">
            <span class="course-card-meta-item"><i class="far fa-clock"></i> ${escapeHtml(course.duration || "")}</span>
            <span class="course-card-meta-item"><i class="fas fa-star"></i> ${num(course.rating, 0).toFixed(1)}</span>
          </div>
        </div>
        <div class="course-card-footer">
          <span class="course-card-price">${priceText(num(course.price, 0))}</span>
          <a href="${detailLink}" class="btn btn-primary btn-sm">Xem chi tiết</a>
        </div>
      </article>`;
    })
    .join("");
}

// ---------- Tải hồ sơ từ Firestore ----------
async function loadInstructorProfile() {
  let instructor = null;

  if (db && profileId) {
    try {
      const doc = await db.collection("users").doc(profileId).get();
      if (doc.exists) {
        const d = doc.data();
        if (d.role === "teacher" || d.role === "admin") {
          instructor = {
            id: doc.id,
            isReal: true,
            name: `${d.lastname || ""} ${d.firstname || ""}`.trim() || d.email || "Giảng viên",
            title: d.title || d.teacherTitle || "",
            image: d.image || d.avatar || d.photoURL || "",
            bio: d.bio || "",
            about: d.about || [],
            skills: d.skills || [],
            social: d.social || {},
            students: d.students || 0,
            coursesCount: d.coursesCount || 0,
            rating: d.rating || 0,
            experience: d.experience || "",
          };

          // Kèm khóa học đã xuất bản của giảng viên này
          try {
            const cs = await db.collection("courses").where("teacherId", "==", doc.id).where("status", "==", "published").get();
            const courses = [];
            cs.forEach((c) => {
              const cd = c.data();
              courses.push({
                id: c.id,
                title: cd.title,
                image: cd.image || "",
                level: cd.level || "",
                category: cd.category || "",
                desc: cd.desc || "",
                duration: cd.duration ? `${cd.duration} giờ` : "",
                rating: cd.rating || 0,
                price: cd.price || 0,
              });
            });
            instructor.courses = courses;
            if (!instructor.coursesCount) instructor.coursesCount = courses.length;
          } catch (e) {
            console.warn("[instructor-detail] Không đọc được khóa học:", e.code);
            instructor.courses = [];
          }
        }
      }
    } catch (e) {
      console.warn("[instructor-detail] Firestore blocked:", e.code);
    }
  }

  // Không tìm thấy hồ sơ giảng viên thật -> hiển thị trạng thái rỗng
  if (!instructor) {
    renderEmptyProfile();
    return;
  }

  // Nút "Sửa hồ sơ": chỉ hiện với chủ hồ sơ hoặc admin
  const editBtn = document.getElementById("profile-edit-btn");
  if (editBtn) {
    const viewer = getCurrentUser();
    const canEdit = !!(viewer && (viewer.role === "admin" || viewer.id === profileId));
    editBtn.style.display = canEdit ? "" : "none";
    if (canEdit) editBtn.href = "admin.html?instructor=" + encodeURIComponent(profileId);
  }

  document.title = `${instructor.name} - Hồ sơ giảng viên - MinhThach Learning`;
  renderInstructor(instructor);
}

// Ẩn nội dung và hiện thông báo khi không tìm thấy giảng viên
function renderEmptyProfile() {
  const section = document.querySelector(".instructor-detail-section .container");
  document.title = "Không tìm thấy giảng viên - MinhThach Learning";
  if (!section) return;
  section.innerHTML = `
    <div style="text-align:center; padding:80px 20px; color:#64748b">
      <i class="fas fa-user-slash" style="font-size:56px; margin-bottom:20px; color:#cbd5e1"></i>
      <h2 style="margin-bottom:10px; color:#334155">Không tìm thấy giảng viên</h2>
      <p style="margin-bottom:24px">Giảng viên này không tồn tại hoặc chưa có tài khoản trong hệ thống.</p>
      <a href="instructors.html" class="btn btn-primary"><i class="fas fa-arrow-left"></i> Xem danh sách giảng viên</a>
    </div>`;
}

loadInstructorProfile();
