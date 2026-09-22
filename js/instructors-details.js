const Params = new URLSearchParams(window.location.search);
const id = Params.get("id");
const instructor = instructors.find(
    item => item.id ===id
);
document.getElementById("profile-image").src = instructor.image;

document.getElementById("profile-image").alt = instructor.name;

document.getElementById("profile-name").textContent = instructor.name;

document.getElementById("profile-role").textContent = instructor.role;

document.getElementById("profile-students").textContent = instructor.students;

document.getElementById("profile-courses-count").textContent = instructor.coursesCount;

document.getElementById("profile-rating").textContent = instructor.rating;

document.getElementById("profile-experience").textContent = instructor.experience;

const aboutContainer = document.getElementById("profile-about");

instructor.about.forEach(text => {

    const p = document.createElement("p");

    p.textContent = text;

    aboutContainer.appendChild(p);
});

const skillsContainer = document.getElementById("profile-skills");

instructor.skills.forEach(skill => {

    skillsContainer.innerHTML += `
        <div class="skill-item">

            <div class="skill-header">
                <span>${skill.name}</span>
                <span>${skill.percent}%</span>
            </div>

            <div class="skill-bar">
                <div
                    class="skill-bar-fill"
                    style="width:${skill.percent}%">
                </div>
            </div>

        </div>
    `;
});

const coursesContainer = document.getElementById("profile-courses");
const coursesTitle = document.getElementById("courses-title");

coursesTitle.textContent = `Khóa học của ${instructor.name.split(" ")[0]}`;
instructor.courses.forEach(course => {
    coursesContainer.innerHTML += `
        <article class="course-card">

            <div class="course-card-image">

                <img
                    src="${course.image}"
                    alt="${course.title}"
                />

                <span class="course-card-badge ${
                    course.level === "Nâng cao"
                        ? "badge-advanced"
                        : "badge-beginner"
                }">
                    ${course.level}
                </span>

            </div>

            <div class="course-card-body">

                <div class="course-card-category">
                    ${course.category}
                </div>

                <h3 class="course-card-title">
                    <a href="course-detail.html">
                        ${course.title}
                    </a>
                </h3>

                <p class="course-card-description">
                    ${course.description}
                </p>

                <div class="course-card-meta">

                    <span class="course-card-meta-item">
                        <i class="far fa-clock"></i>
                        ${course.duration}
                    </span>

                    <span class="course-card-meta-item">
                        <i class="fas fa-star"></i>
                        ${course.rating}
                    </span>

                </div>

            </div>

            <div class="course-card-footer">

                <span class="course-card-price">
                    ${course.price}
                </span>

                <a
                    href="course-detail.html"
                    class="btn btn-primary btn-sm">
                    Ghi danh
                </a>

            </div>

        </article>
    `;
});

