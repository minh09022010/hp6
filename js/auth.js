// ============================================================
// auth.js - Xác thực dùng FIREBASE (Auth + Firestore)
// Chiến lược lưu hồ sơ (2 lớp, không bao giờ kẹt):
//   1) Ưu tiên Firestore (collection "users")
//   2) Nếu Firestore bị chặn (permission-denied) -> lưu vào
//      displayName của tài khoản Firebase Auth (vẫn trên server)
// => Đăng ký/đăng nhập/hồ sơ luôn hoạt động được.
// Yêu cầu nhúng trong HTML theo thứ tự:
//   firebase-*-compat.js -> js/firebase-config.js -> js/auth.js
// ============================================================

const SESSION_KEY = "mt_session"; // Cache phiên đăng nhập để header hiện nhanh

// ---------- Phân quyền ----------
// Role: "admin" | "teacher" | "student" (mặc định student)
function getRole() {
  const user = getCurrentUser();
  return (user && user.role) || "student";
}

function isAdmin() {
  return getRole() === "admin";
}

function isTeacher() {
  const role = getRole();
  return role === "admin" || role === "teacher";
}

function isAdminEmail(email) {
  return Array.isArray(ADMIN_EMAILS) && ADMIN_EMAILS.includes((email || "").trim().toLowerCase());
}

// Xác định role khi vừa đăng nhập/đăng ký
function resolveRole(email) {
  if (isAdminEmail(email)) return "admin"; // email trong ADMIN_EMAILS -> admin
  return "student";
}

// ---------- Khởi tạo Firebase ----------
let auth = null;
let db = null;

if (typeof firebase === "undefined") {
  console.error(
    "[auth.js] Firebase chưa được tải! Hãy nhúng firebase-*-compat.js và js/firebase-config.js TRƯỚC js/auth.js trong HTML."
  );
} else {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
}

// Dịch lỗi Firebase sang tiếng Việt
function mapAuthError(err) {
  const code = (err && err.code) || "";
  const map = {
    "auth/email-already-in-use": "Email này đã được đăng ký.",
    "auth/invalid-email": "Email không đúng định dạng.",
    "auth/weak-password": "Mật khẩu quá yếu (cần tối thiểu 6 ký tự).",
    "auth/user-not-found": "Email chưa được đăng ký.",
    "auth/wrong-password": "Mật khẩu không đúng.",
    "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
    "auth/invalid-login-credentials": "Email hoặc mật khẩu không đúng.",
    "auth/too-many-requests": "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.",
    "auth/network-request-failed": "Lỗi kết nối mạng. Kiểm tra internet của bạn.",
    "auth/requires-recent-login": "Phiên đăng nhập cũ. Vui lòng đăng xuất và đăng nhập lại.",
    "auth/missing-password": "Vui lòng nhập mật khẩu.",
    "auth/configuration-not-found": "Firebase Authentication chưa được bật! Vào Console > Authentication > bật Email/Password.",
    "auth/operation-not-allowed": "Chưa bật đăng ký bằng Email/Password trong Firebase Console.",
    "auth/api-key-not-valid": "API key không hợp lệ - kiểm tra lại firebaseConfig.",
    "permission-denied": "Firestore bị chặn bởi Rules (chưaPublish rules mở) - hồ sơ vẫn được lưu qua tài khoản.",
  };
  return map[code] || "Đã xảy ra lỗi: " + (code || (err && err.message) || "không xác định");
}

// ---------- Đóng gói hồ sơ vào displayName (kế hoạch dự phòng) ----------
// displayName của Firebase Auth là 1 chuỗi -> mình nhét JSON vào đó
function packProfile(p) {
  return JSON.stringify({ f: p.firstname || "", l: p.lastname || "" });
}
function unpackProfile(str) {
  if (!str) return null;
  try {
    const o = JSON.parse(str);
    if (o && (o.f || o.l)) return { firstname: o.f || "", lastname: o.l || "" };
  } catch (e) {
    /* không phải JSON -> bỏ qua */
  }
  return null;
}

// Ghi hồ sơ: thử Firestore trước, chặn thì dùng displayName. Trả về true nếu lưu được ít nhất 1 nơi
async function saveProfile(uid, profile) {
  let saved = false;
  if (db) {
    try {
      await db.collection("users").doc(uid).set(profile, { merge: true });
      saved = true;
    } catch (e) {
      // Firestore bị chặn -> thử phương án 2 bên dưới
    }
  }
  if (!saved && auth && auth.currentUser && auth.currentUser.uid === uid) {
    try {
      await auth.currentUser.updateProfile({ displayName: packProfile(profile) });
      saved = true;
    } catch (e) {
      // Cả hai đều lỗi (mất mạng...) -> báo false
    }
  }
  return saved;
}

// Đọc hồ sơ: thử Firestore, chặn thì đọc displayName
async function loadProfile(uid, fallback) {
  const profile = { firstname: "", lastname: "", email: fallback.email, createdAt: fallback.createdAt || null };
  if (db) {
    try {
      const doc = await db.collection("users").doc(uid).get();
      if (doc.exists) {
        const d = doc.data();
        return { ...profile, ...d };
      }
    } catch (e) {
      // Firestore bị chặn -> dùng displayName bên dưới
    }
  }
  const packed = unpackProfile(fallback.displayName);
  if (packed) return { ...profile, ...packed };
  return profile;
}

// ---------- Đăng ký (tạo tài khoản trên Firebase) ----------
// Trả về Promise<{ ok: true, user } | { ok: false, error }>
async function addUser({ firstname, lastname, email, password }) {
  if (!auth) return { ok: false, error: "Firebase chưa được cấu hình. Kiểm tra js/firebase-config.js." };
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const cred = await auth.createUserWithEmailAndPassword(normalizedEmail, password);

    const profile = {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
    };

    // Lưu hồ sơ (Firestore hoặc displayName - xem saveProfile)
    profile.role = resolveRole(normalizedEmail); // gán role lúc đăng ký
    await saveProfile(cred.user.uid, profile);

    const user = { id: cred.user.uid, ...profile };
    loginSession(user);
    return { ok: true, user };
  } catch (err) {
    // Email đã tồn tại (VD: lần trước Auth tạo rồi mà Firestore chặn)
    // -> thử đăng nhập bằng mật khẩu vừa nhập, khớp thì hoàn tất hồ sơ luôn
    if ((err && err.code) === "auth/email-already-in-use") {
      try {
        const cred = await auth.signInWithEmailAndPassword(email.trim().toLowerCase(), password);
        await saveProfile(cred.user.uid, {
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          email: email.trim().toLowerCase(),
        });
        const profile = await loadProfile(cred.user.uid, {
          email: cred.user.email,
          displayName: cred.user.displayName,
          createdAt: cred.user.metadata ? cred.user.metadata.creationTime : null,
        });
        profile.role = resolveRole(normalizedEmail);
        const user = { id: cred.user.uid, ...profile };
        loginSession(user);
        return { ok: true, user };
      } catch (e2) {
        return {
          ok: false,
          error: "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.",
        };
      }
    }
    return { ok: false, error: mapAuthError(err) };
  }
}

// ---------- Đăng nhập ----------
// Trả về Promise<{ ok: true, user } | { ok: false, error }>
async function checkCredentials(email, password) {
  if (!auth) return { ok: false, error: "Firebase chưa được cấu hình. Kiểm tra js/firebase-config.js." };
  try {
    const cred = await auth.signInWithEmailAndPassword(email.trim().toLowerCase(), password);

    const profile = await loadProfile(cred.user.uid, {
      email: cred.user.email,
      displayName: cred.user.displayName,
      createdAt: cred.user.metadata ? cred.user.metadata.creationTime : null,
    });

    // Backfill: user cũ (đăng ký lúc Firestore còn bị chặn) chưa có doc trong
    // collection "users" -> tự tạo lại hồ sơ ngay lúc đăng nhập để admin thấy được
    try {
      const docSnap = await db.collection("users").doc(cred.user.uid).get();
      if (!docSnap.exists) {
        const packed = unpackProfile(cred.user.displayName) || {};
        const backfill = {
          firstname: profile.firstname || packed.firstname || "",
          lastname: profile.lastname || packed.lastname || "",
          email: cred.user.email,
          createdAt: cred.user.metadata ? cred.user.metadata.creationTime : null,
        };
        await saveProfile(cred.user.uid, backfill);
        profile.firstname = backfill.firstname;
        profile.lastname = backfill.lastname;
      }
    } catch (e) {
      // Firestore vẫn chặn -> bỏ qua, không ảnh hưởng đăng nhập
    }

    // Email trong ADMIN_EMAILS LUÔN là admin — ghi đè role cũ lưu trong Firestore
    // (fix: hồ sơ tạo trước khi thêm email vào ADMIN_EMAILS bị kẹt role "student")
    const finalEmail = (profile.email || cred.user.email || "").trim().toLowerCase();
    if (isAdminEmail(finalEmail)) {
      if (profile.role !== "admin") {
        await saveProfile(cred.user.uid, { role: "admin" }); // tự sửa lại hồ sơ trên server
      }
      profile.role = "admin";
    } else if (!profile.role) {
      profile.role = resolveRole(finalEmail);
    }

    const user = { id: cred.user.uid, ...profile };
    loginSession(user);
    return { ok: true, user };
  } catch (err) {
    return { ok: false, error: mapAuthError(err) };
  }
}

// ---------- Phiên đăng nhập (cache localStorage + Firebase Auth) ----------

// Đọc phiên đã cache (đồng bộ, dùng cho header mọi trang)
function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function loginSession(user) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      createdAt: user.createdAt || null,
      role: user.role || "student",
      avatar: user.avatar || null,
    })
  );
}

async function logout() {
  if (auth) {
    try {
      await auth.signOut();
    } catch (e) {
      /* vẫn xóa session local */
    }
  }
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

// ---------- Quên mật khẩu: gửi email đặt lại ----------
async function sendPasswordReset(email) {
  if (!auth) return { ok: false, error: "Firebase chưa được cấu hình." };
  try {
    await auth.sendPasswordResetEmail(email.trim().toLowerCase());
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapAuthError(err) };
  }
}

// ---------- Cập nhật hồ sơ / đổi mật khẩu ----------

// Cập nhật thông tin user (tên, ...) - Firestore + displayName dự phòng
async function updateUser(userId, changes) {
  const ok = await saveProfile(userId, changes);
  if (!ok) return { ok: false, error: "Không lưu được hồ sơ. Kiểm tra kết nối mạng rồi thử lại." };

  const session = getCurrentUser();
  if (session && session.id === userId) {
    loginSession({ ...session, ...changes });
  }
  return { ok: true, user: { ...(session || { id: userId }), ...changes } };
}

// Đổi mật khẩu: phải xác thực lại bằng mật khẩu hiện tại trước
async function changePassword(userId, currentPassword, newPassword) {
  if (!auth) return { ok: false, error: "Firebase chưa được cấu hình." };
  try {
    const fbUser = auth.currentUser;
    if (!fbUser || fbUser.uid !== userId) {
      return { ok: false, error: "Bạn cần đăng nhập lại để đổi mật khẩu." };
    }
    const cred = firebase.auth.EmailAuthProvider.credential(fbUser.email, currentPassword);
    await fbUser.reauthenticateWithCredential(cred);
    await fbUser.updatePassword(newPassword);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapAuthError(err) };
  }
}

// ---------- Ảnh đại diện (upload từ file local) ----------
// Ảnh gốc được nén về ô vuông ≤ 300px rồi encode base64 -> lưu thẳng vào
// Firestore (không cần Firebase Storage). Trả về chuỗi dataURL để lưu vào
// trường avatar (user) hoặc image (giảng viên).
async function fileToCompressedDataUrl(file, maxSize) {
  maxSize = maxSize || 300;
  const errors = {
    type: "Chỉ chấp nhận file ảnh (JPG, PNG, WebP, GIF).", // 1
    size: "Ảnh quá lớn (tối đa 5MB). Hãy chọn ảnh khác.", // 2
    read: "Không đọc được file ảnh. Thử file khác.", // 3
    decode: "File này không phải ảnh hợp lệ hoặc đã hỏng.", // 4
    empty: "Không nén được ảnh. Thử ảnh khác.", // 5
  };
  const fail = (key) => ({ ok: false, error: errors[key] });

  if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return fail("type");
  if (file.size > 5 * 1024 * 1024) return fail("size");

  // Đọc file thành dataURL
  const dataUrl = await new Promise((resolve, reject) =>
    Object.assign(new FileReader(), {
      onload: (e) => resolve(e.target.result),
      onerror: () => reject(new Error("read")),
    }).readAsDataURL(file)
  ).catch(() => null);
  if (!dataUrl) return fail("read");

  // GIF động: nén sẽ mất chuyển động -> giữ nguyên nếu đã đủ nhỏ
  if (file.type === "image/gif" && dataUrl.length <= 600 * 1024) {
    return { ok: true, dataUrl };
  }

  // Vẽ lên canvas: crop giữa về ô vuông maxSize x maxSize
  const img = await new Promise((resolve, reject) =>
    Object.assign(new Image(), {
      onload: () => resolve(img),
      onerror: () => reject(new Error("decode")),
    })
  );
  img.src = dataUrl;

  const side = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
  if (!side) return fail("empty");
  const out = Math.min(maxSize, side); // không phóng to ảnh nhỏ
  const sx = ((img.naturalWidth || img.width) - side) / 2;
  const sy = ((img.naturalHeight || img.height) - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);

  // PNG giữ độ trong suốt; loại khác xuất JPEG chất lượng 0.85
  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  let result = canvas.toDataURL(mime, 0.85);
  if (result.length > 600 * 1024 && mime === "image/png") {
    result = canvas.toDataURL("image/jpeg", 0.85); // PNG quá to -> hạ xuống JPEG
  }
  if (result.length > 600 * 1024) {
    result = canvas.toDataURL("image/jpeg", 0.7);
  }
  return { ok: true, dataUrl: result };
}

// Lưu avatar cho chính user đang đăng nhập (Firestore + session cache)
async function updateUserAvatar(userId, dataUrl) {
  const ok = await saveProfile(userId, { avatar: dataUrl });
  if (!ok) return { ok: false, error: "Không lưu được ảnh. Kiểm tra kết nối mạng rồi thử lại." };

  const session = getCurrentUser();
  if (session && session.id === userId) {
    loginSession({ ...session, avatar: dataUrl });
  }
  return { ok: true };
}

// ---------- Cập nhật header trên mọi trang ----------

function updateHeaderForUser() {
  const user = getCurrentUser();
  const navButtons = document.querySelector(".nav-buttons");
  const mobileOnly = document.querySelector(".mobile-only");
  if (!user || (!navButtons && !mobileOnly)) return;

  const userName = ` ${(user.lastname || "").trim()} ${(user.firstname || "").trim()}`.trim() || user.email;
  const avatarImg = user.avatar
    ? `<img src="${user.avatar}" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:-5px;margin-right:4px">`
    : '<i class="fas fa-user-circle"></i>';
  const roleBadge =
    user.role === "admin"
      ? '<span style="background:var(--primary);color:#fff;font-size:11px;padding:2px 8px;border-radius:999px;margin-left:6px">ADMIN</span>'
      : user.role === "teacher"
      ? '<span style="background:var(--secondary,#10b981);color:#fff;font-size:11px;padding:2px 8px;border-radius:999px;margin-left:6px">GIÁO VIÊN</span>'
      : "";
  const adminLink =
    user.role === "admin"
      ? '<a href="admin.html" class="btn btn-outline btn-sm"><i class="fas fa-cog"></i> Quản lý</a>'
      : user.role === "teacher"
      ? '<a href="admin.html" class="btn btn-outline btn-sm"><i class="fas fa-book"></i> Khóa học của tôi</a>'
      : "";
  const headerHtml = `
    <div class="nav-user">
      <a href="profile.html" class="nav-user-name" style="text-decoration:none">
        ${avatarImg} ${userName}${roleBadge}
      </a>
      ${adminLink}
      <a href="profile.html" class="btn btn-outline btn-sm">Hồ sơ</a>
      <a href="#" class="btn btn-primary btn-sm" onclick="logout(); return false;">Đăng xuất</a>
    </div>`;

  if (navButtons) navButtons.outerHTML = headerHtml;
  if (mobileOnly) mobileOnly.innerHTML = headerHtml;
}

document.addEventListener("DOMContentLoaded", updateHeaderForUser);
