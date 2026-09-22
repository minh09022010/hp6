const instructors = [
    {
        id: "sarah",

        name: "Sarah Johnson",
        role: "Full-Stack Developer",
        image: "images/instructor1.jpg",

        students: "50,000+",
        coursesCount: 8,
        rating: 4.9,
        experience: "10+",

        about: [
            "Tôi là một Full-Stack Developer với hơn 10 năm kinh nghiệm xây dựng ứng dụng web cho các công ty Fortune 500. Tôi đam mê giảng dạy và giúp đỡ người khác phát triển kỹ năng lập trình.",

            "Các khóa học của tôi được thiết kế để đưa bạn từ người mới bắt đầu trở thành lập trình viên chuyên nghiệp thông qua các dự án thực tế."
        ],

        skills: [
            {
                name: "HTML5 & CSS3",
                percent: 95
            },
            {
                name: "JavaScript & TypeScript",
                percent: 92
            },
            {
                name: "React & Next.js",
                percent: 90
            },
            {
                name: "Node.js & Python",
                percent: 85
            }
        ],

        courses: [
            {
                title: "Complete Lập trình Web Bootcamp 2024",
                image: "images/course1.jpg",
                level: "Cơ bản",
                category: "Lập trình",
                description:
                    "Học HTML, CSS, JavaScript, React, Node.js. Xây dựng 10+ dự án thực tế.",
                duration: "32 giờ",
                rating: 4.8,
                price: "$49.99"
            },

            {
                title: "Python cho mọi người",
                image: "images/course7.jpg",
                level: "Cơ bản",
                category: "Lập trình",
                description:
                    "Học Python từ cơ bản đến nâng cao: OOP, APIs, tự động hóa.",
                duration: "24 giờ",
                rating: 4.7,
                price: "$29.99"
            },

            {
                title: "Advanced JavaScript: Patterns & Performance",
                image: "images/course8.jpg",
                level: "Nâng cao",
                category: "Lập trình",
                description:
                    "Master advanced JavaScript patterns and performance optimization.",
                duration: "18 giờ",
                rating: 4.9,
                price: "$44.99"
            }
        ]
    },


    {
        id: "michael",

        name: "Michael Chen",
        role: "Data Scientist",
        image: "images/instructor2.jpg",

        students: "35,000+",
        coursesCount: 6,
        rating: 4.8,
        experience: "8+",

        about: [
            "Tôi là Data Scientist chuyên về Machine Learning và AI.",
            "Tôi tập trung vào việc xây dựng các mô hình dữ liệu thực tế."
        ],

        skills: [
            {
                name: "Python",
                percent: 95
            },
            {
                name: "Machine Learning",
                percent: 92
            },
            {
                name: "TensorFlow",
                percent: 88
            },
            {
                name: "Data Analysis",
                percent: 90
            }
        ],

        courses: [
    {
        title: "Python Data Science từ A-Z",
        image: "images/course2.jpg",
        level: "Cơ bản",
        category: "DATA",
        description:
            "Học Python, NumPy, Pandas và trực quan hóa dữ liệu qua các dự án thực tế.",
        duration: "28 giờ",
        rating: 4.8,
        price: "$39.99"
    },
    {
        title: "Machine Learning thực chiến",
        image: "images/course5.jpg",
        level: "Nâng cao",
        category: "AI & MACHINE LEARNING",
        description:
            "Xây dựng và triển khai các mô hình Machine Learning từ dữ liệu thực tế.",
        duration: "36 giờ",
        rating: 4.9,
        price: "$54.99"
    },
    {
        title: "Deep Learning với TensorFlow",
        image: "images/course6.jpg",
        level: "Nâng cao",
        category: "AI",
        description:
            "Khám phá Neural Networks, Computer Vision và Deep Learning với TensorFlow.",
        duration: "32 giờ",
        rating: 4.8,
        price: "$49.99"
    }
]
    },
    {
    id: "emily",
    name: "Emily Rodriguez",
    role: "UI/UX Design Lead",
    image: "images/instructor3.jpg",

    students: "28K+",
    coursesCount: 5,
    rating: 4.7,
    experience: "7+",

    description:
        "Nhà thiết kế đạt giải thưởng với 7+ năm kinh nghiệm tạo sản phẩm số lấy người dùng làm trung tâm.",

    about: [
        "Tôi là UI/UX Designer chuyên xây dựng trải nghiệm số đơn giản, trực quan và lấy người dùng làm trung tâm.",
        "Tôi yêu thích việc biến những ý tưởng phức tạp thành những sản phẩm đẹp, dễ sử dụng và hiệu quả."
    ],

    skills: [
        { name: "Figma", percent: 95 },
        { name: "UI Design", percent: 92 },
        { name: "UX Research", percent: 90 },
        { name: "Prototyping", percent: 88 }
    ],
    courses: [
    {
        title: "UI/UX Design từ cơ bản đến chuyên nghiệp",
        image: "images/course3.jpg",
        level: "Cơ bản",
        category: "DESIGN",
        description:
            "Học quy trình thiết kế UI/UX và xây dựng sản phẩm số lấy người dùng làm trung tâm.",
        duration: "22 giờ",
        rating: 4.8,
        price: "$34.99"
    },
    {
        title: "Figma thực chiến",
        image: "images/course4.jpg",
        level: "Cơ bản",
        category: "DESIGN",
        description:
            "Làm chủ Figma qua wireframe, component, prototype và thiết kế giao diện thực tế.",
        duration: "18 giờ",
        rating: 4.7,
        price: "$29.99"
    },
    {
        title: "UX Research & Product Design",
        image: "images/course9.jpg",
        level: "Nâng cao",
        category: "UX",
        description:
            "Nghiên cứu người dùng, phân tích hành vi và chuyển insight thành sản phẩm hiệu quả.",
        duration: "24 giờ",
        rating: 4.9,
        price: "$44.99"
    }
    ]
    },
    {
    id: "david",
    name: "David Kim",
    role: "Mobile Developer",
    image: "images/instructor4.jpg",

    students: "20K+",
    coursesCount: 4,
    rating: 4.6,
    experience: "6+",

    description:
        "Chuyên gia React Native và Flutter với 6+ năm kinh nghiệm phát triển ứng dụng di động.",

    about: [
        "Tôi là Mobile Developer chuyên phát triển ứng dụng với React Native và Flutter.",
        "Tôi tập trung vào việc xây dựng ứng dụng nhanh, ổn định và có trải nghiệm tốt trên nhiều nền tảng."
    ],

    skills: [
        { name: "React Native", percent: 94 },
        { name: "Flutter", percent: 91 },
        { name: "Dart", percent: 87 },
        { name: "Mobile UI", percent: 90 }
    ],
    courses: [
    {
        title: "React Native từ A-Z",
        image: "images/course10.jpg",
        level: "Cơ bản",
        category: "MOBILE",
        description:
            "Xây dựng ứng dụng mobile đa nền tảng với React Native từ đầu.",
        duration: "26 giờ",
        rating: 4.8,
        price: "$39.99"
    },
    {
        title: "Flutter thực chiến",
        image: "images/course11.jpg",
        level: "Cơ bản",
        category: "MOBILE",
        description:
            "Phát triển ứng dụng Android và iOS với Flutter qua các dự án thực tế.",
        duration: "30 giờ",
        rating: 4.7,
        price: "$42.99"
    },
    {
        title: "Advanced Mobile App Development",
        image: "images/course12.jpg",
        level: "Nâng cao",
        category: "MOBILE",
        description:
            "Tối ưu hiệu năng, kiến trúc ứng dụng và triển khai ứng dụng mobile chuyên nghiệp.",
        duration: "27 giờ",
        rating: 4.9,
        price: "$49.99"
    }
    ]
    },
    {
    id: "lisa",
    name: "Lisa Wang",
    role: "Cloud Architect",
    image: "images/instructor5.jpg",

    students: "18K+",
    coursesCount: 4,
    rating: 4.8,
    experience: "12+",

    description:
        "Kiến trúc sư AWS certified với 12+ năm kinh nghiệm về cơ sở hạ tầng đám mây và DevOps.",

    about: [
        "Tôi là Cloud Architect với nhiều năm kinh nghiệm thiết kế và triển khai hệ thống trên nền tảng cloud.",
        "Tôi đặc biệt quan tâm đến AWS, DevOps, khả năng mở rộng và độ tin cậy của hệ thống."
    ],

    skills: [
        { name: "AWS", percent: 96 },
        { name: "Cloud Architecture", percent: 94 },
        { name: "DevOps", percent: 91 },
        { name: "Docker & Kubernetes", percent: 87 }
    ],
    courses: [
    {
        title: "AWS Cloud Practitioner",
        image: "images/course13.jpg",
        level: "Cơ bản",
        category: "CLOUD",
        description:
            "Nắm vững các khái niệm nền tảng về AWS, cloud computing và kiến trúc đám mây.",
        duration: "20 giờ",
        rating: 4.8,
        price: "$34.99"
    },
    {
        title: "AWS Solutions Architect",
        image: "images/course14.jpg",
        level: "Nâng cao",
        category: "CLOUD",
        description:
            "Thiết kế hệ thống AWS có khả năng mở rộng, bảo mật và tối ưu chi phí.",
        duration: "35 giờ",
        rating: 4.9,
        price: "$54.99"
    },
    {
        title: "DevOps với Docker & Kubernetes",
        image: "images/course15.jpg",
        level: "Nâng cao",
        category: "DEVOPS",
        description:
            "Xây dựng CI/CD pipeline và triển khai ứng dụng container với Docker và Kubernetes.",
        duration: "32 giờ",
        rating: 4.8,
        price: "$49.99"
    }
    ]
    },
    {
    id: "marcus",
    name: "Marcus Brown",
    role: "Cybersecurity Expert",
    image: "images/instructor6.jpg",

    students: "15K+",
    coursesCount: 3,
    rating: 4.7,
    experience: "15+",

    description:
        "Chuyên gia bảo mật với 15+ năm kinh nghiệm, từng làm việc cho các cơ quan chính phủ.",

    about: [
        "Tôi là chuyên gia Cybersecurity tập trung vào bảo mật hệ thống, mạng và bảo vệ dữ liệu.",
        "Tôi muốn giúp học viên hiểu các nguy cơ an ninh mạng và xây dựng tư duy bảo mật ngay từ đầu."
    ],

    skills: [
        { name: "Network Security", percent: 95 },
        { name: "Ethical Hacking", percent: 92 },
        { name: "Cloud Security", percent: 89 },
        { name: "Risk Management", percent: 94 }
    ],
    courses: [
    {
        title: "Cybersecurity Fundamentals",
        image: "images/course16.jpg",
        level: "Cơ bản",
        category: "SECURITY",
        description:
            "Tìm hiểu các nguyên tắc cơ bản về an ninh mạng, mối đe dọa và bảo vệ hệ thống.",
        duration: "18 giờ",
        rating: 4.7,
        price: "$29.99"
    },
    {
        title: "Ethical Hacking thực chiến",
        image: "images/course17.jpg",
        level: "Nâng cao",
        category: "CYBERSECURITY",
        description:
            "Khám phá phương pháp kiểm thử bảo mật và tư duy của một ethical hacker.",
        duration: "30 giờ",
        rating: 4.9,
        price: "$49.99"
    },
    {
        title: "Network Security & Defense",
        image: "images/course18.jpg",
        level: "Nâng cao",
        category: "SECURITY",
        description:
            "Bảo vệ hệ thống mạng trước các cuộc tấn công và xây dựng chiến lược phòng thủ.",
        duration: "26 giờ",
        rating: 4.8,
        price: "$44.99"
    }
    ]
    }
];