"use client";

import { useEffect, useState } from "react";
import Logo from "@assets/logo/logo.png";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import styles from "./index.module.scss";

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdminPath = pathname?.startsWith("/admin");

  const navItems = [
    { id: "problems", label: "Задачи", path: "/problems" },
    { id: "study", label: "Учиться", path: "/study" },
    { id: "articles", label: "Статьи", path: "/articles" },
    { id: "forum", label: "Форум", path: "/forum" },
    { id: "messages", label: "Сообщения", path: "/messages" },
    { id: "achievements", label: "Достижения", path: "/achievements" },
    { id: "my-courses", label: "Мои курсы", path: "/my-courses" },
    { id: "account", label: "Профиль", path: "/account" },
  ];

  const adminNavItems = [
    { id: "courses", label: "Курсы", path: "/admin/courses" },
    { id: "students", label: "Студенты", path: "/admin/students" },
    { id: "certificates", label: "Сертификаты", path: "/admin/certificates" },
    { id: "profile", label: "Профиль", path: "/admin/profile" },
    { id: "mentorship", label: "Для менторов", path: "/admin/mentorship" },
    { id: "coding", label: "Задачи", path: "/admin/coding" },
  ];

  const items = isAdminPath ? adminNavItems : navItems;

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + "/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.header__container}>
        <button className={styles.header__logoButton} onClick={() => handleNavigation("/homepage")} type="button">
          <Image src={Logo} alt="Logo" />
        </button>

        <button
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
          className={`${styles.header__burger} ${isMenuOpen ? styles.header__burger_active : ""}`}
          onClick={() => setIsMenuOpen((current) => !current)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={styles.header__nav}>
          <ul className={styles.header__list}>
            {items.map((item) => (
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

      <div
        className={`${styles.header__overlay} ${isMenuOpen ? styles.header__overlay_active : ""}`}
        onClick={() => setIsMenuOpen(false)}
      />

      <aside className={`${styles.header__sidebar} ${isMenuOpen ? styles.header__sidebar_active : ""}`}>
        <div className={styles.header__sidebarTop}>
          <button className={styles.header__logoButton} onClick={() => handleNavigation("/homepage")} type="button">
            <Image src={Logo} alt="Logo" />
          </button>
          <button
            aria-label="Закрыть меню"
            className={styles.header__close}
            onClick={() => setIsMenuOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>

        <nav className={styles.header__sidebarNav}>
          <ul className={styles.header__sidebarList}>
            {items.map((item) => (
              <li
                key={item.id}
                className={`${styles.header__sidebarItem} ${
                  isActive(item.path) ? styles.header__sidebarItem_active : ""
                }`}
                onClick={() => handleNavigation(item.path)}
              >
                {item.label}
              </li>
            ))}
            <li className={styles.header__sidebarItem}>
              <div className={styles.header__sidebarLogout} onClick={() => handleNavigation("/login")}>
                Выход
              </div>
            </li>
          </ul>
        </nav>
      </aside>
    </header>
  );
};

export default Header;
