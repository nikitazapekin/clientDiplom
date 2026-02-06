import Articles from "@assets/icons/welcome/articles.png";
import Study from "@assets/icons/welcome/code.png";
import Problems from "@assets/icons/welcome/done.png";
import Achievements from "@assets/icons/welcome/medal.png";
import Profile from "@assets/icons/welcome/profile.png";

export const adminNavigation = [
  { id: 1, title: "Курсы", type: "/admin/courses", image: Study },
  { id: 2, title: "Студенты", type: "/admin/students", image: Problems },
  { id: 3, title: "Сертификаты", type: "/admin/certificates", image: Articles },
  { id: 4, title: "Профиль", type: "/admin/profile", image: Profile },
  { id: 5, title: "Для менторов", type: "/admin/mentorship", image: Achievements },
];
