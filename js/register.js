const registerForm = document.querySelector("form");
const firstnameInput = document.getElementById("firstname");
const lastnameInput = document.getElementById("lastname");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPassword = document.getElementById("confirm-password");
const btnSubmit = document.getElementById("submit-btn");
const successMsg = document.getElementById("success-msg");
const termsInput = document.querySelector('input[name="terms"]');

const errFirstname = document.getElementById("error-firstname");
const errLastname = document.getElementById("error-lastname")
const errEmail = document.getElementById("error-email");
const errPassword = document.getElementById("error-password");
const errConfirm = document.getElementById("error-confirm");

let isFirstNameValid = false;
let isLastNameValid = false;
let isEmailValid = false;
let isPasswordValid = false;
let isConfirmValid = false;

function updateFieldStatus(input, errElement, isValid, errorText) {
  if (input.value.length === 0) {
    // Chưa nhập gì -> viền xám mặc định, xóa lỗi
    input.classList.remove("valid", "invalid");
    errElement.textContent = "";
  } else if (isValid) {
    // Hợp lệ -> viền xanh
    input.classList.add("valid");
    input.classList.remove("invalid");
    errElement.textContent = "";
  } else {
    // Sai -> viền đỏ, hiển thị lỗi
    input.classList.add("invalid");
    input.classList.remove("valid");
    errElement.textContent = errorText;
  }
}

function checkAllValid(){
  if (
    isFirstNameValid &&
    isLastNameValid &&
    isEmailValid &&
    isPasswordValid &&
    isConfirmValid&&
    termsInput.checked
) {
    btnSubmit.disabled = false;
} else {
    btnSubmit.disabled = true;
}
}
firstnameInput.addEventListener("input",()=>{
    const val = firstnameInput.value 
    const noSpace = !/\s/.test(val);
    const regexVn =/^[\p{L}\s]{2,50}$/u;
    isFirstNameValid = val.length >= 2 && noSpace && regexVn.test(val);

  updateFieldStatus(
    firstnameInput,
    errFirstname,
    isFirstNameValid,
    "Họ phải từ 2 ký tự trở lên, viết liền không dấu cách và không chứa số"
  );
  checkAllValid();
})

lastnameInput.addEventListener("input", () => {
    const val = lastnameInput.value 
    const regexVn = /^[\p{L}\s]{2,50}$/u;
    isLastNameValid = val.length >= 2 && regexVn.test(val);

  updateFieldStatus(
    lastnameInput,
    errLastname,
    isLastNameValid,
    "Tên không chứa số, ký tự đặc biệt và phải từ 2 ký tự trở lên"
  );
  checkAllValid();
})

emailInput.addEventListener("input", () => {
  const val = emailInput.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  isEmailValid = emailRegex.test(val);

  updateFieldStatus(
    emailInput,
    errEmail,
    isEmailValid,
    "Email không đúng định dạng (cần có @ và .)"
  );
  checkAllValid();
});

passwordInput.addEventListener("input", () => {
  const val = passwordInput.value;

  const hasLength = val.length >= 8;
  const hasUpper = /[A-Z]/.test(val);
  const hasLower = /[a-z]/.test(val);
  const hasNumber = /[0-9]/.test(val);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(val);

  isPasswordValid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial;

  updateFieldStatus(
    passwordInput,
    errPassword,
    isPasswordValid,
    "Cần 8+ ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt"
  );

  // Nếu ô xác nhận mật khẩu đã được gõ thì kiểm tra lại khớp không
  if (confirmPassword.value.length > 0) {
    isConfirmValid = confirmPassword.value === passwordInput.value;
    updateFieldStatus(
      confirmPassword,
      errConfirm,
      isConfirmValid,
      "Mật khẩu xác nhận không trùng khớp"
    );
  }

  checkAllValid();
});

confirmPassword.addEventListener("input", () => {
  isConfirmValid = confirmPassword.value.length > 0 && confirmPassword.value === passwordInput.value;

  updateFieldStatus(
    confirmPassword,
    errConfirm,
    isConfirmValid,
    "Mật khẩu xác nhận không trùng khớp"
  );
  checkAllValid();
});
termsInput.addEventListener("change", () => {
    checkAllValid();
});
function validateAllFields() {
    firstnameInput.dispatchEvent(new Event("input"));
    lastnameInput.dispatchEvent(new Event("input"));
    emailInput.dispatchEvent(new Event("input"));
    passwordInput.dispatchEvent(new Event("input"));
    confirmPassword.dispatchEvent(new Event("input"));
    checkAllValid();
}

validateAllFields();
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Đảm bảo tất cả field hợp lệ trước khi gửi lên server
    validateAllFields();
    if (!checkAllValidSilently()) return;

    // Khóa nút trong lúc chờ Firebase
    btnSubmit.disabled = true;

    // Tạo tài khoản trên Firebase (Auth) + lưu hồ sơ lên Firestore (server)
    const result = await addUser({
      firstname: firstnameInput.value,
      lastname: lastnameInput.value,
      email: emailInput.value,
      password: passwordInput.value,
    });

    if (!result.ok) {
      // VD: email đã tồn tại, mật khẩu yếu... -> báo lỗi dưới ô email
      isEmailValid = false;
      updateFieldStatus(emailInput, errEmail, false, result.error);
      checkAllValid();
      return;
    }

    // Đã tự động đăng nhập trong addUser() -> hiện thông báo thành công
    successMsg.classList.add("show");

    // Chuyển về trang chủ sau 1.2 giây
    setTimeout(() => {
        window.location.href = "index.html";
    }, 1200);
});

// Kiểm tra hợp lệ mà không cần dispatch lại event (dùng trước khi lưu)
function checkAllValidSilently() {
  return (
    isFirstNameValid &&
    isLastNameValid &&
    isEmailValid &&
    isPasswordValid &&
    isConfirmValid &&
    termsInput.checked
  );
}