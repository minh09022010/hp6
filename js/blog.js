// ============================================================
// blog.js — blog.html
// Yêu cầu: firebase-*-compat.js → firebase-config.js → auth.js → blog.js
// ============================================================

let allPosts       = [];
let blogViewer     = null;
let uploadedBlogImage = null; // dataURL ảnh bìa vừa chọn (null = chưa chọn / đã xóa)

const blogGrid       = document.querySelector(".blog-grid");
const blogCount      = document.querySelector(".courses-count");
const filterSels     = document.querySelectorAll(".filter-select");
const blogFilterCat  = filterSels[0] || null;
const blogFilterSort = filterSels[1] || null;

// ---------- Helpers ----------
function escBlog(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

const BLOG_IMGS = [
  "images/course1.jpg","images/course2.jpg","images/course3.jpg",
  "images/course4.jpg","images/course5.jpg","images/course6.jpg",
  "images/course7.jpg","images/course8.jpg","images/course9.jpg"
];

// ---------- Render card ----------
function postCardHTML(p) {
  const img     = p.image || BLOG_IMGS[Math.abs(hashCode(p.id || p.title || "")) % BLOG_IMGS.length];
  const title   = escBlog(p.title);
  const raw     = p.excerpt || p.content || "";
  const excerpt = escBlog(raw).substring(0, 120) + (raw.length > 120 ? "…" : "");
  const author  = escBlog(p.authorName || "Ẩn danh");
  const cat     = escBlog(p.category   || "Chung");
  const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString("vi-VN") : "";
  const avStyle = p.authorAvatar
    ? `background-image:url('${escBlog(p.authorAvatar)}');background-size:cover;background-position:center`
    : "";
  const avInner = p.authorAvatar ? "" : '<i class="fas fa-user"></i>';

  return `
  <article class="blog-card" style="cursor:pointer"
    onclick="window.location='blog-detail.html?id=${escBlog(p.id)}'">
    <div class="blog-card-image">
      <img src="${escBlog(img)}" alt="${title}" onerror="this.src='images/course1.jpg'" />
    </div>
    <div class="blog-card-body">
      <div class="blog-card-meta">
        <span class="blog-card-category">${cat}</span>
        <span><i class="far fa-calendar-alt"></i> ${dateStr}</span>
      </div>
      <h3 class="blog-card-title">
        <a href="blog-detail.html?id=${escBlog(p.id)}">${title}</a>
      </h3>
      <p class="blog-card-excerpt">${excerpt}</p>
      <div class="blog-card-author">
        <div class="blog-card-avatar" style="${avStyle}">${avInner}</div>
        <span class="blog-card-author-name">${author}</span>
      </div>
    </div>
  </article>`;
}

// ---------- Filter + Sort ----------
function applyBlogFilters() {
  const cat  = blogFilterCat  ? blogFilterCat.value  : "";
  const sort = blogFilterSort ? blogFilterSort.value : "Mới nhất";

  let list = [...allPosts];

  if (cat && cat !== "Tất cả danh mục") {
    list = list.filter(p => p.category === cat);
  }

  if (sort === "Cũ nhất") {
    list.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  } else if (sort === "Phổ biến nhất") {
    list.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
  } else {
    list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }

  if (!blogGrid) return;

  if (list.length === 0) {
    blogGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#64748b">
        <i class="fas fa-search" style="font-size:48px;margin-bottom:16px;color:#cbd5e1;display:block"></i>
        <h3 style="margin-bottom:8px;color:#334155">Không tìm thấy bài viết</h3>
        <p>Thử thay đổi bộ lọc để xem thêm kết quả.</p>
      </div>`;
  } else {
    blogGrid.innerHTML = list.map(postCardHTML).join("");
  }

  if (blogCount) {
    const total = allPosts.length;
    const shown = list.length;
    blogCount.innerHTML = shown === total
      ? `Hiển thị <strong>1-${total}</strong> trong số <strong>${total}</strong> bài viết`
      : `Tìm thấy <strong>${shown}</strong> trong số <strong>${total}</strong> bài viết`;
  }

  const pagination = document.querySelector(".pagination");
  if (pagination) pagination.style.display = "none";
}

filterSels.forEach(sel => sel && sel.addEventListener("change", applyBlogFilters));

// ---------- Load từ Firestore ----------
async function loadBlogPosts() {
  if (!blogGrid) return;

  // Đợi db sẵn sàng
  let tries = 0;
  while (typeof db === "undefined" || !db) {
    if (tries++ > 20) break;
    await new Promise(r => setTimeout(r, 100));
  }

  if (!db) {
    showEmptyBlog("Không kết nối được cơ sở dữ liệu.");
    return;
  }

  let list = [];
  try {
    const snap = await db.collection("blog-posts")
      .where("status", "==", "published").get();
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.warn("[blog] Firestore:", e.message);
    showEmptyBlog("Không tải được bài viết. Vui lòng thử lại sau.");
    return;
  }

  allPosts = list;
  applyBlogFilters();
}

function showEmptyBlog(msg) {
  if (!blogGrid) return;
  blogGrid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#64748b">
      <i class="fas fa-newspaper" style="font-size:48px;margin-bottom:16px;color:#cbd5e1;display:block"></i>
      <h3 style="margin-bottom:8px;color:#334155">Chưa có bài viết nào</h3>
      <p>${msg || "Hãy là người đầu tiên chia sẻ kiến thức!"}</p>
      ${blogViewer
        ? '<button class="btn btn-primary" style="margin-top:12px" onclick="openBlogModal()"><i class="fas fa-pen"></i> Viết bài ngay</button>'
        : '<a href="login.html" class="btn btn-outline" style="margin-top:12px">Đăng nhập để viết bài</a>'}
    </div>`;
  if (blogCount) blogCount.innerHTML = "Hiển thị <strong>0</strong> bài viết";
}

// ============================================================
// ---------- Ảnh bìa: helpers ----------
// ============================================================

// Hiện ảnh trong drop zone
function setBlogImagePreview(src) {
  const drop    = document.getElementById("bm-img-drop");
  const ph      = document.getElementById("bm-img-placeholder");
  const wrap    = document.getElementById("bm-img-preview-wrap");
  const preview = document.getElementById("bm-img-preview");
  if (!drop || !ph || !wrap || !preview) return;

  if (src) {
    preview.src         = src;
    wrap.style.display  = "block";
    ph.style.display    = "none";
  } else {
    wrap.style.display  = "none";
    ph.style.display    = "flex";
    preview.src         = "";
  }
}

// Xóa ảnh đã chọn
function removeBlogImage() {
  uploadedBlogImage = null;
  setBlogImagePreview(null);
  const fileInput = document.getElementById("blog-post-image-file");
  if (fileInput) fileInput.value = "";
  const errEl = document.getElementById("bm-img-error");
  if (errEl) errEl.textContent = "";
}

// Xử lý file được chọn
async function handleBlogImageFile(file) {
  const errEl = document.getElementById("bm-img-error");
  if (errEl) errEl.textContent = "";

  if (!file) return;

  // Dùng fileToCompressedDataUrl từ auth.js (keepAspectRatio=true cho ảnh bìa)
  const result = await fileToCompressedDataUrl(file, 1200, true);

  if (!result.ok) {
    if (errEl) errEl.textContent = result.error;
    return;
  }

  uploadedBlogImage = result.dataUrl;
  setBlogImagePreview(uploadedBlogImage);
}

// ---------- Modal viết / sửa bài ----------
function openBlogModal(post) {
  blogViewer = blogViewer || getCurrentUser();
  if (!blogViewer) { window.location.href = "login.html"; return; }

  const modal = document.getElementById("blog-post-modal");
  if (!modal) return;

  // Reset ảnh
  uploadedBlogImage = null;
  if (post && post.image) {
    // Hiện ảnh bìa hiện tại của bài đang sửa
    setBlogImagePreview(post.image);
    uploadedBlogImage = post.image; // giữ nguyên nếu không thay
  } else {
    setBlogImagePreview(null);
  }
  const fileInput = document.getElementById("blog-post-image-file");
  if (fileInput) fileInput.value = "";
  const imgErr = document.getElementById("bm-img-error");
  if (imgErr) imgErr.textContent = "";

  // Reset form
  document.getElementById("blog-post-id").value       = (post && post.id)      || "";
  document.getElementById("blog-post-title").value    = (post && post.title)   || "";
  document.getElementById("blog-post-excerpt").value  = (post && post.excerpt) || "";
  document.getElementById("blog-post-content").value  = (post && post.content) || "";
  document.getElementById("blog-post-status").value   = (post && post.status)  || "published";
  document.getElementById("blog-post-error").textContent = "";
  document.getElementById("blog-modal-title").textContent = post ? "Chỉnh sửa bài viết" : "Viết bài mới";

  const catSel = document.getElementById("blog-post-category");
  if (catSel && post && post.category) catSel.value = post.category;

  const cc = document.getElementById("blog-content-count");
  if (cc) cc.textContent = document.getElementById("blog-post-content").value.length;

  modal.style.display = "flex";
  setTimeout(() => document.getElementById("blog-post-title")?.focus(), 50);
}

function closeBlogModal() {
  const modal = document.getElementById("blog-post-modal");
  if (modal) modal.style.display = "none";
}

// ---------- Lưu bài viết ----------
async function saveBlogPost() {
  blogViewer = blogViewer || getCurrentUser();
  if (!blogViewer || !db) return;

  const errEl   = document.getElementById("blog-post-error");
  const saveBtn = document.getElementById("blog-post-save");
  errEl.textContent = "";

  const postId   = document.getElementById("blog-post-id").value.trim();
  const title    = document.getElementById("blog-post-title").value.trim();
  const category = document.getElementById("blog-post-category").value;
  const excerpt  = document.getElementById("blog-post-excerpt").value.trim();
  const content  = document.getElementById("blog-post-content").value.trim();
  const status   = document.getElementById("blog-post-status").value;

  if (!title)   { errEl.textContent = "Vui lòng nhập tiêu đề bài viết."; return; }
  if (!content) { errEl.textContent = "Vui lòng nhập nội dung bài viết."; return; }

  const data = {
    title,
    category,
    excerpt: excerpt || content.substring(0, 150),
    content,
    status,
    authorId:     blogViewer.id,
    authorName:   `${blogViewer.lastname || ""} ${blogViewer.firstname || ""}`.trim() || blogViewer.email,
    authorAvatar: blogViewer.avatar || "",
    updatedAt:    new Date().toISOString(),
  };

  // Chỉ cập nhật trường image khi có ảnh (không xóa ảnh cũ nếu không đổi)
  if (uploadedBlogImage !== null) {
    data.image = uploadedBlogImage;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

  try {
    if (postId) {
      const snap = await db.collection("blog-posts").doc(postId).get();
      if (snap.exists && snap.data().authorId !== blogViewer.id && blogViewer.role !== "admin") {
        errEl.textContent = "Bạn không có quyền chỉnh sửa bài viết này.";
        return;
      }
      await db.collection("blog-posts").doc(postId).set(data, { merge: true });
    } else {
      data.createdAt = new Date().toISOString();
      await db.collection("blog-posts").add(data);
    }

    closeBlogModal();
    await loadBlogPosts();
    alert(status === "published"
      ? `Đã đăng bài "${title}" lên Blog!`
      : `Đã lưu nháp bài "${title}".`);
  } catch (e) {
    errEl.textContent = "Không lưu được: " + (e.code || e.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Đăng bài';
  }
}

// ---------- DOMContentLoaded ----------
document.addEventListener("DOMContentLoaded", () => {
  blogViewer = getCurrentUser();

  // Nút viết bài cho user đã đăng nhập
  if (blogViewer) {
    const filters = document.querySelector(".courses-filters");
    if (filters && !document.getElementById("btn-write-post")) {
      const btn = document.createElement("button");
      btn.className = "btn btn-primary btn-sm";
      btn.id        = "btn-write-post";
      btn.innerHTML = '<i class="fas fa-pen"></i> Viết bài';
      btn.addEventListener("click", () => openBlogModal());
      filters.insertBefore(btn, filters.firstChild);
    }
  }

  // Sự kiện modal
  document.getElementById("blog-post-cancel")  ?.addEventListener("click", closeBlogModal);
  document.getElementById("blog-post-cancel-2")?.addEventListener("click", closeBlogModal);
  document.getElementById("blog-post-save")    ?.addEventListener("click", saveBlogPost);

  // Đếm ký tự textarea
  const ta = document.getElementById("blog-post-content");
  const cc = document.getElementById("blog-content-count");
  if (ta && cc) ta.addEventListener("input", () => { cc.textContent = ta.value.length; });

  // Click ngoài modal → đóng
  document.getElementById("blog-post-modal")?.addEventListener("click", e => {
    if (e.target === document.getElementById("blog-post-modal")) closeBlogModal();
  });

  // ---- Upload ảnh bìa ----
  const fileInput = document.getElementById("blog-post-image-file");
  const dropZone  = document.getElementById("bm-img-drop");

  if (fileInput) {
    fileInput.addEventListener("change", e => {
      if (e.target.files[0]) handleBlogImageFile(e.target.files[0]);
    });
  }

  if (dropZone) {
    // Drag & drop
    dropZone.addEventListener("dragover", e => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
    dropZone.addEventListener("drop", e => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      const file = e.dataTransfer?.files?.[0];
      if (file) handleBlogImageFile(file);
    });
  }

  // Kiểm tra sessionStorage (quay về từ detail để sửa bài)
  const editId = sessionStorage.getItem("editPostId");
  if (editId) {
    sessionStorage.removeItem("editPostId");
    const tryEdit = setInterval(() => {
      const post = allPosts.find(p => p.id === editId);
      if (post) {
        clearInterval(tryEdit);
        openBlogModal(post);
      }
    }, 300);
    setTimeout(() => clearInterval(tryEdit), 5000);
  }

  // Load bài viết
  loadBlogPosts();
});
