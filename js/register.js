
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registerForm");

    if (!form) {
        console.error("Không tìm thấy form đăng ký.");
        return;
    }

    const firstnameInput = document.getElementById("firstname");
    const lastnameInput = document.getElementById("lastname");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput =
        document.getElementById("confirm-password");

    if (
        !firstnameInput ||
        !lastnameInput ||
        !emailInput ||
        !passwordInput ||
        !confirmPasswordInput
    ) {
        console.error("Thiếu input trong form.");
        return;
    }

    function getUsers() {
        try {
            const data = localStorage.getItem("users");

            if (!data) {
                return [];
            }

            const users = JSON.parse(data);

            return Array.isArray(users) ? users : [];
        } catch (error) {
            console.error(error);
            alert("Dữ liệu tài khoản bị lỗi.");
            return [];
        }
    }

    function saveUsers(users) {
        try {
            localStorage.setItem(
                "users",
                JSON.stringify(users)
            );

            return true;
        } catch (error) {
            console.error(error);
            alert("Không thể lưu tài khoản.");
            return false;
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidName(name) {
        return /^[\p{L}\s]+$/u.test(name);
    }

    function isValidPassword(password) {
        if (password.length < 8) {
            return "Mật khẩu phải có ít nhất 8 ký tự.";
        }

        if (/\s/.test(password)) {
            return "Mật khẩu không được chứa khoảng trắng.";
        }

        if (!/[A-Za-z]/.test(password)) {
            return "Mật khẩu phải chứa ít nhất một chữ cái.";
        }

        if (!/[0-9]/.test(password)) {
            return "Mật khẩu phải chứa ít nhất một chữ số.";
        }

        return null;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        try {
            const firstname = firstnameInput.value.trim();
            const lastname = lastnameInput.value.trim();
            const email = emailInput.value.trim().toLowerCase();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!firstname) {
                alert("Vui lòng nhập tên.");
                firstnameInput.focus();
                return;
            }

            if (!lastname) {
                alert("Vui lòng nhập họ.");
                lastnameInput.focus();
                return;
            }

            if (!email) {
                alert("Vui lòng nhập email.");
                emailInput.focus();
                return;
            }

            if (!password) {
                alert("Vui lòng nhập mật khẩu.");
                passwordInput.focus();
                return;
            }

            if (!confirmPassword) {
                alert("Vui lòng xác nhận mật khẩu.");
                confirmPasswordInput.focus();
                return;
            }

            if (!isValidName(firstname)) {
                alert("Tên không được chứa số hoặc ký tự đặc biệt.");
                firstnameInput.focus();
                return;
            }

            if (!isValidName(lastname)) {
                alert("Họ không được chứa số hoặc ký tự đặc biệt.");
                lastnameInput.focus();
                return;
            }

            if (!isValidEmail(email)) {
                alert("Địa chỉ email không hợp lệ.");
                emailInput.focus();
                return;
            }

            const passwordError = isValidPassword(password);

            if (passwordError) {
                alert(passwordError);
                passwordInput.focus();
                return;
            }

            if (password !== confirmPassword) {
                alert("Mật khẩu xác nhận không khớp.");
                confirmPasswordInput.focus();
                return;
            }

            const terms = form.querySelector(
                'input[name="terms"]'
            );

            if (terms && !terms.checked) {
                alert("Bạn phải đồng ý với điều khoản.");
                terms.focus();
                return;
            }

            const users = getUsers();

            const emailExists = users.some(
                user =>
                    user &&
                    typeof user.email === "string" &&
                    user.email.toLowerCase() === email
            );
            if (emailExists) {
                alert("Email này đã được đăng ký.");
                emailInput.focus();
                return;
            }
            const newUser = {
                id: crypto.randomUUID
                    ? crypto.randomUUID()
                    : Date.now().toString(),
                firstname,
                lastname,
                email,
                password,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);

            if (!saveUsers(users)) {
                return;
            }
            alert("Đăng ký tài khoản thành công!");

            form.reset();

            window.location.href = "login.html";

        } catch (error) {
            console.error(error);
            alert("Đã xảy ra lỗi. Vui lòng thử lại.");
        }
    });
});