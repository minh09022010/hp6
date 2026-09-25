// ============================================================
// profile.js - Trang hồ sơ: xem/sửa thông tin + đổi mật khẩu
// (lưu trên Firebase Firestore / Auth)
// ============================================================

// Bắt buộc đăng nhập mới vào được trang này
const currentUser = getCurrentUser();
if (!currentUser) {
  window.location.href = "login.html";
}

const profileForm = document.getElementById("profile-form");
const passwordForm = document.getElementById("password-form");
const accountInfo = document.getElementById("account-info");

const firstnameInput = document.getElementById("firstname");
const lastnameInput = document.getElementById("lastname");
const emailInput = document.getElementById("email");

const currentPasswordInput = document.getElementById("current-password");
const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const errNewPassword = document.getElementById("error-new-password");
const errConfirm = document.getElementById("error-confirm");

// Phần ảnh đại diện
const avatarPreview = document.getElementById("avatar-preview");
const avatarInput = document.getElementById("avatar-input");
const btnChooseAvatar = document.getElementById("btn-choose-avatar");
const btnSaveAvatar = document.getElementById("btn-save-avatar");
const errAvatar = document.getElementById("error-avatar");
let pendingAvatar = null; // dataURL đang chờ lưu

// ---------- Đổ dữ liệu user vào form ----------
async function fillProfile() {
  const user = getCurrentUser(); // đọc lại session mới nhất
  if (!user) return;

  firstnameInput.value = user.firstname || "";
  lastnameInput.value = user.lastname || "";
  emailInput.value = user.email || "";

  const roleLabel =
    user.role === "admin"
      ? "Quản trị viên"
      : user.role === "teacher"
      ? "Giảng viên"
      : "Học viên";
  accountInfo.innerHTML = `
    <i class="fas fa-info-circle"></i>
    <strong>Email:</strong> ${user.email} &nbsp;|&nbsp;
    <strong>Quyền:</strong> ${roleLabel} &nbsp;|&nbsp;
    <strong>Ngày tạo:</strong> ${formatDate(user.createdAt)}`;

  // Ảnh đại diện hiện tại (ưu tiên session, đọc lại Firestore nếu chưa có)
  if (user.avatar) {
    avatarPreview.src = user.avatar;
  } else {
    avatarPreview.removeAttribute("src");
    try {
      const doc = await db.collection("users").doc(user.id).get();
      if (doc.exists && doc.data().avatar && avatarPreview.getAttribute("src") === null) {
        avatarPreview.src = doc.data().avatar;
      }
    } catch (e) {
      /* Firestore chặn -> bỏ qua */
    }
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch (e) {
    return "—";
  }
}

// ---------- Ảnh đại diện: chọn file -> nén -> lưu ----------
btnChooseAvatar.addEventListener("click", () => avatarInput.click());

avatarInput.addEventListener("change", async () => {
    errAvatar.textContent = "";

    const file = avatarInput.files?.[0];
    avatarInput.value = ""; //cho phép chạy lại cùng 1 file lần sau

    if (!file) return;

    btnChooseAvatar.disabled = true;
    btnChooseAvatar.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

    try {
        const res = await fileToCompressedDataUrl(file, 300);

        if (!res.ok) {
            errAvatar.textContent = res.error;
            return;
        }

        pendingAvatar = res.dataUrl;

        avatarPreview.src = pendingAvatar;//xem trước ngay
        btnSaveAvatar.disabled = false;
        btnSaveAvatar.style.display = "";

    } catch (error) {
        console.error("Lỗi xử lý ảnh:", error);

        errAvatar.textContent =
            "Không thể xử lý ảnh. Vui lòng thử ảnh khác.";

    } finally {
        btnChooseAvatar.disabled = false;
        btnChooseAvatar.innerHTML =
            '<i class="fas fa-upload"></i> Chọn ảnh từ máy';
    }
});

btnSaveAvatar.addEventListener("click", async () => {
  if (!pendingAvatar) return;

  btnSaveAvatar.disabled = true;
  btnSaveAvatar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
  const res = await updateUserAvatar(currentUser.id, pendingAvatar);
  btnSaveAvatar.disabled = false;
  btnSaveAvatar.innerHTML = '<i class="fas fa-save"></i> Lưu ảnh';

  if (!res.ok) {
    errAvatar.textContent = res.error;
    return;
  }

  pendingAvatar = null;
  btnSaveAvatar.style.display = "none";
  showMsg("profile-success-msg");
  updateHeaderForUser(); // avatar mới hiện ngay trên header
});

// ---------- Cập nhật thông tin cá nhân ----------
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const firstname = firstnameInput.value.trim();
  const lastname = lastnameInput.value.trim();

  // Validate giống trang đăng ký
  const noSpace = !/\s/.test(firstname);
  const regexVn = /^[\p{L}\s]{2,50}$/u;
  if (firstname.length < 2 || !noSpace || !regexVn.test(firstname)) {
    alert("Tên phải từ 2 ký tự trở lên, viết liền, không chứa số.");
    return;
  }
  if (lastname.length < 2 || !regexVn.test(lastname)) {
    alert("Họ phải từ 2 ký tự trở lên, không chứa số.");
    return;
  }

  // Lưu lên Firestore (server)
  const result = await updateUser(currentUser.id, { firstname, lastname });
  if (!result.ok) {
    alert(result.error);
    return;
  }

  showMsg("profile-success-msg");
  fillProfile(); // đổ lại dữ liệu mới
  updateHeaderForUser(); // vẽ lại header ngay lập tức
});

// ---------- Đổi mật khẩu ----------
function validateNewPassword() {
  const val = newPasswordInput.value;
  const strong =
    val.length >= 8 &&
    /[A-Z]/.test(val) &&
    /[a-z]/.test(val) &&
    /[0-9]/.test(val) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(val);

  if (val.length === 0) {
    errNewPassword.textContent = "";
    return false;
  }
  errNewPassword.textContent = strong
    ? ""
    : "Cần 8+ ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt";
  return strong;
}

newPasswordInput.addEventListener("input", () => {
  validateNewPassword();
  // Nếu đang gõ ô xác nhận thì kiểm tra lại khớp không
  if (confirmPasswordInput.value.length > 0) {
    errConfirm.textContent =
      confirmPasswordInput.value === newPasswordInput.value
        ? ""
        : "Mật khẩu xác nhận không trùng khớp";
  }
});

confirmPasswordInput.addEventListener("input", () => {
  if (confirmPasswordInput.value.length === 0) {
    errConfirm.textContent = "";
    return;
  }
  errConfirm.textContent =
    confirmPasswordInput.value === newPasswordInput.value
      ? ""
      : "Mật khẩu xác nhận không trùng khớp";
});

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateNewPassword()) {
    newPasswordInput.focus();
    return;
  }
  if (confirmPasswordInput.value !== newPasswordInput.value) {
    errConfirm.textContent = "Mật khẩu xác nhận không trùng khớp";
    confirmPasswordInput.focus();
    return;
  }

  // Firebase: xác thực lại rồi mới đổi mật khẩu
  const result = await changePassword(currentUser.id, currentPasswordInput.value, newPasswordInput.value);
  if (!result.ok) {
    alert(result.error);
    return;
  }

  passwordForm.reset();
  errNewPassword.textContent = "";
  errConfirm.textContent = "";
  showMsg("password-success-msg");
});

// ---------- Helper ----------
function showMsg(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

fillProfile();
