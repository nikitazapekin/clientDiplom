"use client";

import { useState } from "react";
import Logo from "@assets/logo/logo.png";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import styles from "./index.module.scss";

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isAdminPath = pathname?.startsWith("/admin");

  const navItems = [
    { id: "problems", label: "Задачи", path: "/problems" },
    { id: "study", label: "Учиться", path: "/study" },
    { id: "articles", label: "Статьи", path: "/articles" },
    { id: "messages", label: "Сообщения", path: "/messages" },
    { id: "account", label: "Аккаунт", path: "/account" },
  ];

  const adminNavItems = [
    { id: "courses", label: "Курсы", path: "/admin/courses" },
    { id: "students", label: "Студенты", path: "/admin/students" },
    { id: "certificates", label: "Сертификаты", path: "/admin/certificates" },
    { id: "profile", label: "Профиль", path: "/admin/profile" },
    { id: "mentorship", label: "Для менторов", path: "/admin/mentorship" },
    { id: "coding", label: "Coding", path: "/admin/coding" },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + "/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.header__container}>
        <Image src={Logo} alt="Logo" />

        <nav className={styles.header__nav}>
          <ul className={styles.header__list}>
            {isAdminPath
              ? adminNavItems.map((item) => (
                  <li
                    key={item.id}
                    className={`${styles.header__item} ${
                      isActive(item.path) ? styles.header__item_active : ""
                    } ${hoveredItem === item.id ? styles.header__item_hover : ""}`}
                    onClick={() => handleNavigation(item.path)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {item.label}
                  </li>
                ))
              : navItems.map((item) => (
                  <li
                    key={item.id}
                    className={`${styles.header__item} ${
                      isActive(item.path) ? styles.header__item_active : ""
                    } ${hoveredItem === item.id ? styles.header__item_hover : ""}`}
                    onClick={() => handleNavigation(item.path)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {item.label}
                  </li>
                ))}

            <li className={styles.header__item}>
              <div className={styles.header__logout} onClick={() => handleNavigation("/login")}>
                Выход
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
