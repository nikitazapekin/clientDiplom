import Articles from "@assets/icons/welcome/articles.png";
import Study from "@assets/icons/welcome/code.png";
import Problems from "@assets/icons/welcome/done.png";
import Achievements from "@assets/icons/welcome/medal.png";
import Profile from "@assets/icons/welcome/profile.png";

export const adminNavigation = [
  { id: 1, title: "Курсы", type: "/admin/courses", image: Study, path: "/admin/courses" },
  { id: 2, title: "Студенты", type: "/admin/students", image: Problems, path: "/admin/students" },
  {
    id: 3,
    title: "Сертификаты",
    type: "/admin/certificates",
    image: Articles,
    path: "/admin/certificates",
  },
  { id: 4, title: "Профиль", type: "/admin/profile", image: Profile, path: "/admin/profile" },
  {
    id: 5,
    title: "Для менторов",
    type: "/admin/mentorship",
    image: Achievements,
    path: "/admin/mentorship",
  },
  {
    id: 6,
    title: "Coding Tasks",
    type: "/admin/coding",
    image: Study,
    path: "/admin/coding",
  },
];
