// ============================================================
// instructors-data.js - DỮ LIỆU DEMO (dùng chung)
// Dùng làm fallback khi Firestore chưa có dữ liệu / bị chặn.
// Cấu trúc GIỐNG NHAU với hồ sơ giảng viên & khóa học lưu Firestore
// để trang hiển thị dùng chung 1 bộ hàm render.
// Nhúng TRƯỚC js/instructors.js / js/instructor-detail.js / js/courses.js
// ============================================================

// ---------- 6 giảng viên demo ----------
// Cấu trúc: id, name, role(chức danh), bio(ngắn), image, about[], skills[], courses[]
// Trường hasPublicProfile=false -> chỉ tồn tại demo, không tạo bởi tài khoản thật
const DEMO_INSTRUCTORS = [
  {
    id: "sarah",
    name: "Sarah Johnson",
    title: "Full-Stack Developer",
    image: "images/instructor1.jpg",
    students: 50000,
    coursesCount: 8,
    rating: 4.9,
    experience: 10,
    social: { twitter: "#", linkedin: "#", github: "#" },
    bio: "Senior developer với 10+ năm kinh nghiệm xây dựng ứng dụng web cho các công ty Fortune 500.",
    about: [
      "Tôi là một Full-Stack Developer với hơn 10 năm kinh nghiệm xây dựng ứng dụng web cho các công ty Fortune 500. Tôi đam mê giảng dạy và giúp đỡ người khác phát triển kỹ năng lập trình.",
      "Các khóa học của tôi được thiết kế để đưa bạn từ người mới bắt đầu trở thành lập trình viên chuyên nghiệp thông qua các dự án thực tế.",
    ],
    skills: [
      { name: "HTML5 & CSS3", percent: 95 },
      { name: "JavaScript & TypeScript", percent: 92 },
      { name: "React & Next.js", percent: 90 },
      { name: "Node.js & Python", percent: 85 },
    ],
    courses: [
      {
        id: "demo-web",
        title: "Complete Lập trình Web Bootcamp 2024",
        image: "images/course1.jpg",
        level: "Cơ bản",
        category: "Lập trình",
        desc: "Học HTML, CSS, JavaScript, React, Node.js. Xây dựng 10+ dự án thực tế.",
        duration: "32 giờ",
        lessons: 145,
        rating: 4.8,
        reviews: 2450,
        price: 4999000,
        originalPrice: 9999000,
        status: "published",
      },
      {
        id: "demo-python",
        title: "Python cho mọi người",
        image: "images/course7.jpg",
        level: "Cơ bản",
        category: "Lập trình",
        desc: "Học Python từ cơ bản đến nâng cao: OOP, APIs, tự động hóa.",
        duration: "24 giờ",
        lessons: 96,
        rating: 4.7,
        reviews: 1100,
        price: 2999000,
        originalPrice: 0,
        status: "published",
      },
      {
        id: "demo-advjs",
        title: "Advanced JavaScript: Patterns & Performance",
        image: "images/course8.jpg",
        level: "Nâng cao",
        category: "Lập trình",
        desc: "Master advanced JavaScript patterns and performance optimization.",
        duration: "18 giờ",
        lessons: 72,
        rating: 4.9,
        reviews: 860,
        price: 4499000,
        originalPrice: 0,
        status: "published",
      },
    ],
  },
  {
    id: "michael",
    name: "Michael Chen",
    title: "Data Scientist",
    image: "images/instructor2.jpg",
    students: 35000,
    coursesCount: 6,
    rating: 4.8,
    experience: 8,
    social: { twitter: "#", linkedin: "#", github: "#" },
    bio: "Tiến sĩ Machine Learning với 8+ năm kinh nghiệm trong AI và phân tích dữ liệu lớn.",
    about: [
      "Tôi là Data Scientist chuyên về Machine Learning và AI.",
      "Tôi tập trung vào việc xây dựng các mô hình dữ liệu thực tế.",
    ],
    skills: [
      { name: "Python", percent: 95 },
      { name: "Machine Learning", percent: 92 },
      { name: "TensorFlow", percent: 88 },
      { name: "Data Analysis", percent: 90 },
    ],
    courses: [
      {
        id: "demo-ds",
        title: "Python Data Science từ A-Z",
        image: "images/course2.jpg",
        level: "Cơ bản",
        category: "Khoa học dữ liệu",
        desc: "Học Python, NumPy, Pandas và trực quan hóa dữ liệu qua các dự án thực tế.",
        duration: "28 giờ",
        lessons: 120,
        rating: 4.8,
        reviews: 1520,
        price: 3999000,
        originalPrice: 0,
        status: "published",
      },
      {
        id: "demo-ml",
        title: "Machine Learning thực chiến",
        image: "images/course5.jpg",
        level: "Nâng cao",
        category: "AI & ML",
        desc: "Xây dựng và triển khai các mô hình Machine Learning từ dữ liệu thực tế.",
        duration: "36 giờ",
        lessons: 150,
        rating: 4.9,
        reviews: 980,
        price: 5499000,
        originalPrice: 0,
        status: "published",
      },
    ],
  },
  {
    id: "emily",
    name: "Emily Rodriguez",
    title: "UI/UX Design Lead",
    image: "images/instructor3.jpg",
    students: 28000,
    coursesCount: 5,
    rating: 4.7,
    experience: 7,
    social: { twitter: "#", linkedin: "#", dribbble: "#" },
    bio: "Nhà thiết kế đạt giải thưởng với 7+ năm kinh nghiệm tạo sản phẩm số lấy người dùng làm trung tâm.",
    about: [
      "Tôi là UI/UX Designer chuyên xây dựng trải nghiệm số đơn giản, trực quan và lấy người dùng làm trung tâm.",
      "Tôi yêu thích việc biến những ý tưởng phức tạp thành những sản phẩm đẹp, dễ sử dụng và hiệu quả.",
    ],
    skills: [
      { name: "Figma", percent: 95 },
      { name: "UI Design", percent: 92 },
      { name: "UX Research", percent: 90 },
      { name: "Prototyping", percent: 88 },
    ],
    courses: [
      {
        id: "demo-uiux",
        title: "UI/UX Design từ cơ bản đến chuyên nghiệp",
        image: "images/course3.jpg",
        level: "Cơ bản",
        category: "Thiết kế",
        desc: "Học quy trình thiết kế UI/UX và xây dựng sản phẩm số lấy người dùng làm trung tâm.",
        duration: "22 giờ",
        lessons: 88,
        rating: 4.8,
        reviews: 1320,
        price: 3499000,
        originalPrice: 0,
        status: "published",
      },
    ],
  },
  {
    id: "david",
    name: "David Kim",
    title: "Mobile Developer",
    image: "images/instructor4.jpg",
    students: 20000,
    coursesCount: 4,
    rating: 4.6,
    experience: 6,
    social: { twitter: "#", linkedin: "#", github: "#" },
    bio: "Chuyên gia React Native và Flutter với 6+ năm kinh nghiệm phát triển ứng dụng di động.",
    about: [
      "Tôi là Mobile Developer chuyên phát triển ứng dụng với React Native và Flutter.",
      "Tôi tập trung vào việc xây dựng ứng dụng nhanh, ổn định và có trải nghiệm tốt trên nhiều nền tảng.",
    ],
    skills: [
      { name: "React Native", percent: 94 },
      { name: "Flutter", percent: 91 },
      { name: "Dart", percent: 87 },
      { name: "Mobile UI", percent: 90 },
    ],
    courses: [
      {
        id: "demo-rn",
        title: "React Native từ A-Z",
        image: "images/course4.jpg",
        level: "Cơ bản",
        category: "Mobile",
        desc: "Xây dựng ứng dụng mobile đa nền tảng với React Native từ đầu.",
        duration: "26 giờ",
        lessons: 104,
        rating: 4.8,
        reviews: 760,
        price: 3999000,
        originalPrice: 0,
        status: "published",
      },
    ],
  },
  {
    id: "lisa",
    name: "Lisa Wang",
    title: "Cloud Architect",
    image: "images/instructor5.jpg",
    students: 18000,
    coursesCount: 4,
    rating: 4.8,
    experience: 12,
    social: { twitter: "#", linkedin: "#", github: "#" },
    bio: "Kiến trúc sư AWS certified với 12+ năm kinh nghiệm về cơ sở hạ tầng đám mây và DevOps.",
    about: [
      "Tôi là Cloud Architect với nhiều năm kinh nghiệm thiết kế và triển khai hệ thống trên nền tảng cloud.",
      "Tôi đặc biệt quan tâm đến AWS, DevOps, khả năng mở rộng và độ tin cậy của hệ thống.",
    ],
    skills: [
      { name: "AWS", percent: 96 },
      { name: "Cloud Architecture", percent: 94 },
      { name: "DevOps", percent: 91 },
      { name: "Docker & Kubernetes", percent: 87 },
    ],
    courses: [
      {
        id: "demo-aws",
        title: "AWS Certified Solutions Architect 2024",
        image: "images/course5.jpg",
        level: "Trung cấp",
        category: "Cloud",
        desc: "Chuẩn bị cho kỳ thi AWS SAA-C03 với các phòng lab thực hành.",
        duration: "42 giờ",
        lessons: 168,
        rating: 4.8,
        reviews: 1140,
        price: 7499000,
        originalPrice: 15999000,
        status: "published",
      },
    ],
  },
  {
    id: "marcus",
    name: "Marcus Brown",
    title: "Cybersecurity Expert",
    image: "images/instructor6.jpg",
    students: 15000,
    coursesCount: 3,
    rating: 4.7,
    experience: 15,
    social: { twitter: "#", linkedin: "#", github: "#" },
    bio: "Chuyên gia bảo mật với 15+ năm kinh nghiệm, từng làm việc cho các cơ quan chính phủ.",
    about: [
      "Tôi là chuyên gia Cybersecurity tập trung vào bảo mật hệ thống, mạng và bảo vệ dữ liệu.",
      "Tôi muốn giúp học viên hiểu các nguy cơ an ninh mạng và xây dựng tư duy bảo mật ngay từ đầu.",
    ],
    skills: [
      { name: "Network Security", percent: 95 },
      { name: "Ethical Hacking", percent: 92 },
      { name: "Cloud Security", percent: 89 },
      { name: "Risk Management", percent: 94 },
    ],
    courses: [
      {
        id: "demo-cyber",
        title: "Advanced Cybersecurity: Ethical Hacking",
        image: "images/course6.jpg",
        level: "Nâng cao",
        category: "An ninh mạng",
        desc: "Học penetration testing, network security, và các kỹ thuật bảo mật nâng cao.",
        duration: "50 giờ",
        lessons: 200,
        rating: 4.7,
        reviews: 890,
        price: 8499000,
        originalPrice: 17999000,
        status: "published",
      },
    ],
  },
];

// ---------- Khóa học demo đầy đủ (cho course-detail.html khi không có ?id=) ----------
// Đây là bản chi tiết của khóa "Complete Lập trình Web Bootcamp 2024"
const DEMO_COURSE_DETAIL = {
  id: "demo-web",
  title: "Complete Lập trình Web Bootcamp 2024",
  category: "Lập trình",
  desc: "Học HTML, CSS, JavaScript, React, Node.js. Xây dựng 10+ dự án thực tế.",
  longDesc: [
    "Chào mừng đến với Lập trình Web Bootcamp 2024 — khóa học duy nhất bạn cần để học phát triển web và trở thành full-stack developer chuyên nghiệp.",
    "Với hơn 32 giờ nội dung video HD, 120+ tài liệu có thể tải và 10+ dự án thực tế, bạn sẽ có được kinh nghiệm thực tế xây dựng ứng dụng web hiện đại.",
  ],
  image: "images/course1.jpg",
  level: "Mọi trình độ",
  duration: "32 giờ",
  lessons: 145,
  language: "Tiếng Việt",
  rating: 4.8,
  reviewsCount: 2450,
  studentsCount: 12500,
  price: 4999000,
  originalPrice: 9999000,
  status: "published",
  includes: [
    "32 giờ video theo yêu cầu",
    "120 tài nguyên tải về",
    "Truy cập trọn đời",
    "Chứng chỉ hoàn thành",
    "Bài tập & dự án thực tế",
  ],
  curriculum: [
    {
      title: "Introduction to Web Development",
      duration: "3 giờ",
      lessonsCount: 12,
      lessons: [
        { name: "Welcome & Course Overview", duration: "14:30" },
        { name: "How the Internet Works", duration: "18:45" },
        { name: "Setting Up Your Environment", duration: "22:10" },
      ],
    },
    {
      title: "HTML5 & Semantic Markup",
      duration: "4 giờ",
      lessonsCount: 15,
      lessons: [
        { name: "HTML Document Structure", duration: "16:20" },
        { name: "Semantic Elements & Accessibility", duration: "20:15" },
        { name: "Forms & Input Validation", duration: "28:30" },
      ],
    },
    {
      title: "CSS3 & Modern Styling",
      duration: "5 giờ",
      lessonsCount: 20,
      lessons: [
        { name: "CSS Selectors & Specificity", duration: "19:45" },
        { name: "Flexbox & CSS Grid", duration: "32:10" },
        { name: "Responsive Design & Media Queries", duration: "24:30" },
      ],
    },
  ],
  reviews: [
    {
      name: "John Anderson",
      stars: 5,
      date: "2 tuần trước",
      text: "This is hands-down the best web development course I've ever taken. The projects are practical and the instructor explains complex concepts perfectly.",
    },
    {
      name: "Maria Garcia",
      stars: 5,
      date: "1 tháng trước",
      text: "I love how the course is structured. Each section builds on the previous one. I've already recommended this course to my colleagues!",
    },
  ],
  // Giảng viên tham chiếu theo id trong DEMO_INSTRUCTORS
  teacherId: "sarah",
  teacherName: "Sarah Johnson",
};

// Danh mục + cấp độ dùng chung cho filter/modal
const COURSE_CATEGORIES = ["Lập trình", "Khoa học dữ liệu", "Thiết kế", "Kinh doanh", "Mobile", "An ninh mạng", "Cloud", "AI & ML"];
const COURSE_LEVELS = ["Cơ bản", "Trung cấp", "Nâng cao", "Mọi trình độ"];
const COURSE_BADGES = { "Cơ bản": "badge-beginner", "Trung cấp": "badge-intermediate", "Nâng cao": "badge-advanced", "Mọi trình độ": "badge-beginner" };

// ---------- Helpers dùng chung ----------
function priceText(price) {
  return price > 0 ? Number(price).toLocaleString("vi-VN") + "₫" : "Miễn phí";
}

// Xử lý ảnh khóa học: nếu Firestore chưa có ảnh thì xoay vòng ảnh demo
function courseImage(img, idx) {
  const pool = ["course1.jpg", "course2.jpg", "course3.jpg", "course4.jpg", "course5.jpg", "course6.jpg", "course7.jpg", "course8.jpg", "course9.jpg"];
  if (img) return img;
  return "images/" + pool[(idx || 0) % pool.length];
}

function instructorAvatar(avatar, idx) {
  const pool = ["instructor1.jpg", "instructor2.jpg", "instructor3.jpg", "instructor4.jpg", "instructor5.jpg", "instructor6.jpg"];
  if (avatar) return avatar;
  return "images/" + pool[(idx || 0) % pool.length];
}

// Ép kiểu số an toàn (Firestore trả về string nếu nhập thủ công)
function num(v, d) {
  const n = Number(v);
  return isFinite(n) ? n : d || 0;
}

// Escape HTML chống XSS (dùng chung mọi trang)
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Icon mạng xã hội của giảng viên (dùng chung instructors + instructor-detail)
function socialLinksHTML(social) {
  if (!social) return "";
  const list = [];
  if (social.twitter) list.push(`<a href="${escapeHtml(social.twitter)}" aria-label="Twitter"><i class="fab fa-twitter"></i></a>`);
  if (social.linkedin) list.push(`<a href="${escapeHtml(social.linkedin)}" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>`);
  if (social.github) list.push(`<a href="${escapeHtml(social.github)}" aria-label="GitHub"><i class="fab fa-github"></i></a>`);
  if (social.dribbble) list.push(`<a href="${escapeHtml(social.dribbble)}" aria-label="Dribbble"><i class="fab fa-dribbble"></i></a>`);
  if (social.facebook) list.push(`<a href="${escapeHtml(social.facebook)}" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>`);
  return list.join("");
}

// Tách chuỗi nhiều dòng thành mảng (mỗi dòng 1 phần tử, bỏ dòng trống)
function splitLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Parse kỹ năng từ textarea: mỗi dòng "Tên kỹ năng | 95"
function parseSkillsText(text) {
  return splitLines(text)
    .map((line) => {
      const idx = line.lastIndexOf("|");
      const name = idx >= 0 ? line.slice(0, idx).trim() : line.trim();
      const percent = idx >= 0 ? num(line.slice(idx + 1), 0) : 0;
      return { name, percent: Math.max(0, Math.min(100, percent)) };
    })
    .filter((s) => s.name);
}

// Ngược lại: mảng skills -> text cho textarea
function skillsToText(skills) {
  return (skills || []).map((s) => `${s.name} | ${num(s.percent, 0)}`).join("\n");
}
