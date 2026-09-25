// ============================================================
// login.js - Xử lý Đăng nhập (qua Firebase Authentication)
// ============================================================

const loginForm = document.querySelector("form");
const loginEmail = document.getElementById("email");
const loginPassword = document.getElementById("password");
const loginError = document.getElementById("login-error");
const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  // Kiểm tra nhập đủ chưa
  if (!email || !password) {
    showError("Vui lòng nhập email và mật khẩu.");
    return;
  }

  setLoading(true);

  // Firebase kiểm tra email + mật khẩu trên server
  const result = await checkCredentials(email, password);

  setLoading(false);

  if (!result.ok) {
    showError(result.error);
    return;
  }

  // Đăng nhập thành công (phiên đã được lưu trong checkCredentials)
  if (loginError) loginError.classList.remove("show");
  loginForm.reset();

  window.location.href = "index.html";
});

function showError(message) {
  if (!loginError) {
    alert(message);
    return;
  }
  loginError.textContent = message;
  loginError.classList.add("show");
}

function setLoading(isLoading) {
  if (loginSubmitBtn) loginSubmitBtn.disabled = isLoading;
}

// ---------- Quên mật khẩu ----------
const forgotLink = document.getElementById("forgot-link");
if (forgotLink) {
  forgotLink.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = prompt(
      "Nhập email bạn đã đăng ký, hệ thống sẽ gửi link đặt lại mật khẩu:"
    );
    if (email === null) return; // người dùng bấm Cancel

    const trimmed = email.trim();
    if (!trimmed) {
      showError("Bạn chưa nhập email.");
      return;
    }

    const result = await sendPasswordReset(trimmed);
    if (!result.ok) {
      showError(result.error);
      return;
    }

    showError(""); // xóa lỗi cũ nếu có
    if (loginError) {
      loginError.classList.remove("show");
    }
    alert(
      "📧 Đã gửi email hướng dẫn đặt lại mật khẩu tới " +
        trimmed +
        "!\nHãy kiểm tra hộp thư (cả mục Spam) và làm theo link trong email."
    );
  });
}
