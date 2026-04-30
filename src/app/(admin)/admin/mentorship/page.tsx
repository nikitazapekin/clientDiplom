"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import React from "react";

import styles from "./page.module.scss";

type TreeNode = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "student";
  type: "admin" | "course" | "student";
  children?: TreeNode[];
  expanded?: boolean;
};

type Announcement = {
  id: string;
  adminId: string;
  title: string;
  content: string;
  createdAt: string;
  author: string;
  updatedAt: string;
};

type Update = {
  id: string;
  title: string;
  content: string;
  version: string;
  createdAt: string;
};

type TabType = "announcements" | "updates" | "structure" | "users";

type User = {
  id: string;
  email: string;
  name: string;
  role: "client" | "admin";
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  middleName?: string;
  description?: string;
  auditoryId?: string;
  registeredAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  isActive?: boolean;
};

const MentorshipPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>("structure");
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRole, setSearchRole] = useState<"all" | "client" | "admin">("all");
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    middleName: "",
    phone: "",
    country: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showCreateAnnouncementModal, setShowCreateAnnouncementModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
  });
  const [announcementsPage, setAnnouncementsPage] = useState(1);
  const [announcementsPerPage, setAnnouncementsPerPage] = useState(5);

  useEffect(() => {
    loadData();
    loadUsers();
    loadAnnouncements();
  }, []);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);

      const [studentsRes, adminsRes] = await Promise.all([
        fetch("http://localhost:3002/students?page=1&limit=1000", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }),
        fetch("http://localhost:3002/students/admins-list", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }),
      ]);

      const studentsData = await studentsRes.json();
      const adminsData = await adminsRes.json();

      const students = (studentsData.students || []).map((student: any) => ({
        ...student,
        name: `${student.lastName} ${student.firstName}`,
        role: "client",
      }));

      const admins = (adminsData || []).map((admin: any) => ({
        ...admin,
        name: `${admin.lastName} ${admin.firstName}`,
        role: "admin",
      }));

      setUsers([...admins, ...students]);
    } catch (err: any) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await fetch("http://localhost:3002/announcements", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        setAnnouncements(data);
      }
    } catch (err: any) {
      console.error("Failed to load announcements:", err);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3002/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          ...newAdmin,
          role: "admin",
        }),
      });

      if (response.ok) {
        await loadUsers();
        setShowCreateAdminModal(false);
        setNewAdmin({
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          middleName: "",
          phone: "",
          country: "",
        });
      } else {
        const errorData = await response.json();

        setError(errorData.message || "Не удалось создать администратора");
      }
    } catch (err: any) {
      setError(err.message || "Не удалось создать администратора");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = searchRole === "all" || user.role === searchRole;

    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchRole]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3002/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(newAnnouncement),
      });

      if (response.ok) {
        await loadAnnouncements();
        setShowCreateAnnouncementModal(false);
        setNewAnnouncement({ title: "", content: "" });
      } else {
        const errorData = await response.json();

        setError(errorData.message || "Не удалось создать анонс");
      }
    } catch (err: any) {
      setError(err.message || "Не удалось создать анонс");
    }
  };

  const totalAnnouncementsPages = Math.ceil(announcements.length / announcementsPerPage);

  const paginatedAnnouncements = announcements.slice(
    (announcementsPage - 1) * announcementsPerPage,
    announcementsPage * announcementsPerPage
  );

  const handleAnnouncementPageChange = (page: number) => {
    setAnnouncementsPage(page);
  };

  const handleAnnouncementsPerPageChange = (newPerPage: number) => {
    setAnnouncementsPerPage(newPerPage);
    setAnnouncementsPage(1);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [adminsRes, coursesRes] = await Promise.all([
        fetch("http://localhost:3002/students/admins-list", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }),
        fetch("http://localhost:3002/courses"),
      ]);

      const adminsData = await adminsRes.json();
      const coursesData = await coursesRes.json();

      const mainAdmin = adminsData.find((a: any) => a.auditory?.email === "admin@example.com");
      const otherAdmins = adminsData.filter((a: any) => a.auditory?.email !== "admin@example.com");

      const adminNodes: TreeNode[] = [];
      const courses = coursesData.courses || [];

      if (mainAdmin) {
        const mainAdminCourses = courses.filter((c: any) => c.adminId === mainAdmin.id);
        const mainAdminNode: TreeNode = {
          id: mainAdmin.id,
          name: `${mainAdmin.lastName} ${mainAdmin.firstName}`,
          email: mainAdmin.auditory?.email || "",
          role: "admin",
          type: "admin",
          children: mainAdminCourses.map((course: any) => ({
            id: course.id,
            name: course.title,
            email: "",
            role: "admin",
            type: "course",
            children: [],
          })),
        };

        adminNodes.push(mainAdminNode);
      }

      otherAdmins.forEach((admin: any) => {
        const adminCourses = courses.filter((c: any) => c.adminId === admin.id);
        const adminNode: TreeNode = {
          id: admin.id,
          name: `${admin.lastName} ${admin.firstName}`,
          email: admin.auditory?.email || "",
          role: "admin",
          type: "admin",
          children: adminCourses.map((course: any) => ({
            id: course.id,
            name: course.title,
            email: "",
            role: "admin",
            type: "course",
            children: [],
          })),
        };

        adminNodes.push(adminNode);
      });

      setTreeData(adminNodes);

      setUpdates([
        {
          id: "1",
          title: "Версия 1.0.0",
          content: "Первый релиз портала для менторов с функцией управления курсами.",
          version: "1.0.0",
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string, nodes: TreeNode[]): TreeNode[] => {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return { ...node, expanded: !node.expanded };
      }

      if (node.children) {
        return { ...node, children: toggleNode(nodeId, node.children) };
      }

      return node;
    });
  };

  const handleNodeClick = (nodeId: string) => {
    setTreeData(toggleNode(nodeId, treeData));
  };

  const handleCourseClick = async (courseId: string) => {
    try {
      const response = await fetch(
        `http://localhost:3002/course-subscriptions/course/${courseId}/students`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.ok) {
        const students = await response.json();

        const updatedTree = treeData.map((node) => {
          if (node.children) {
            const updatedChildren = node.children.map((child) => {
              if (child.id === courseId && child.type === "course") {
                const studentNodes: TreeNode[] = students.map((student: any) => ({
                  id: student.auditoryId,
                  name: `${student.lastName} ${student.firstName}`,
                  email: student.email,
                  role: "student",
                  type: "student",
                }));

                return { ...child, children: studentNodes, expanded: true };
              }

              return child;
            });

            return { ...node, children: updatedChildren };
          }

          return node;
        });

        setTreeData(updatedTree);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
    }
  };

  const renderTree = (nodes: TreeNode[], level: number = 0): JSX.Element[] => {
    return nodes.map((node) => (
      <div key={node.id} style={{ marginLeft: level * 20 }}>
        <div
          className={`${styles.treeNode} ${
            node.type === "admin" ? styles.treeNode_admin : ""
          } ${node.type === "course" ? styles.treeNode_course : ""} ${
            node.type === "student" ? styles.treeNode_student : ""
          }`}
          onClick={() => {
            handleNodeClick(node.id);

            if (node.type === "course") {
              handleCourseClick(node.id);
            }
          }}
        >
          <span className={styles.treeNode__icon}>
            {node.type === "admin" && ""}
            {node.type === "course" && (node.expanded ? "" : "")}
            {node.type === "student" && ""}
          </span>
          <span className={styles.treeNode__name}>{node.name}</span>
          {node.email && <span className={styles.treeNode__email}>{node.email}</span>}
          {node.children && node.children.length > 0 && !node.expanded && (
            <span className={styles.treeNode__badge}>{node.children.length}</span>
          )}
        </div>
        {node.expanded && node.children && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Для менторов</h1>
        {activeTab === "announcements" && (
          <button
            className={styles.addAnnouncementBtn}
            onClick={() => setShowCreateAnnouncementModal(true)}
          >
            Добавить анонс
          </button>
        )}
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "announcements" ? styles.tab_active : ""}`}
          onClick={() => setActiveTab("announcements")}
        >
          Анонсы
        </button>
        <button
          className={`${styles.tab} ${activeTab === "updates" ? styles.tab_active : ""}`}
          onClick={() => setActiveTab("updates")}
        >
          Обновления
        </button>
        <button
          className={`${styles.tab} ${activeTab === "structure" ? styles.tab_active : ""}`}
          onClick={() => setActiveTab("structure")}
        >
          Структура
        </button>
        <button
          className={`${styles.tab} ${activeTab === "users" ? styles.tab_active : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Список пользователей
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "announcements" && (
          <div className={styles.announcements}>
            {announcements.length === 0 ? (
              <div className={styles.empty}>Нет анонсов</div>
            ) : (
              <>
                <div className={styles.announcements__list}>
                  {paginatedAnnouncements.map((announcement) => (
                    <div key={announcement.id} className={styles.card}>
                      <h3 className={styles.card__title}>{announcement.title}</h3>
                      <p className={styles.card__content}>{announcement.content}</p>
                      <div className={styles.card__meta}>
                        <span className={styles.card__author}>{announcement.author}</span>
                        <span className={styles.card__date}>
                          {new Date(announcement.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.pagination}>
                  <div className={styles.pagination__info}>
                    <span>
                      Показано: {(announcementsPage - 1) * announcementsPerPage + 1} -{" "}
                      {Math.min(announcementsPage * announcementsPerPage, announcements.length)} из{" "}
                      {announcements.length}
                    </span>
                  </div>

                  <div className={styles.pagination__controls}>
                    <select
                      value={announcementsPerPage}
                      onChange={(e) => handleAnnouncementsPerPageChange(Number(e.target.value))}
                      className={styles.pagination__select}
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                    </select>

                    <button
                      onClick={() => handleAnnouncementPageChange(announcementsPage - 1)}
                      disabled={announcementsPage === 1}
                      className={styles.pagination__btn}
                    >
                      &lt;
                    </button>

                    {Array.from({ length: totalAnnouncementsPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalAnnouncementsPages ||
                          (page >= announcementsPage - 1 && page <= announcementsPage + 1)
                      )
                      .map((page, idx, array) => (
                        <React.Fragment key={page}>
                          {idx > 0 && array[idx - 1] !== page - 1 && (
                            <span className={styles.pagination__ellipsis}>...</span>
                          )}
                          <button
                            onClick={() => handleAnnouncementPageChange(page)}

                            style={{backgroundColor: "#9F0FA7"}}
                            className={`${styles.pagination__btn} ${
                              announcementsPage === page ? styles.pagination__btn_active : ""
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}

                    <button
                      onClick={() => handleAnnouncementPageChange(announcementsPage + 1)}
                      disabled={announcementsPage === totalAnnouncementsPages}
                      className={styles.pagination__btn}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "updates" && (
          <div className={styles.updates}>
            {updates.length === 0 ? (
              <div className={styles.empty}>Нет обновлений</div>
            ) : (
              updates.map((update) => (
                <div key={update.id} className={styles.card}>
                  <h3 className={styles.card__title}>{update.title}</h3>
                  <span className={styles.card__version}>{update.version}</span>
                  <p className={styles.card__content}>{update.content}</p>
                  <div className={styles.card__date}>
                    {new Date(update.createdAt).toLocaleDateString("ru-RU")}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "structure" && (
          <div className={styles.structure}>
            <div className={styles.tree}>{renderTree(treeData)}</div>
          </div>
        )}

        {activeTab === "users" && (
          <div className={styles.users}>
            <div className={styles.users__header}>
              <div className={styles.users__search}>
                <input
                  type="text"
                  placeholder="Поиск по имени, фамилии или email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.users__searchInput}
                />
                <select
                  value={searchRole}
                  onChange={(e) => setSearchRole(e.target.value as "all" | "client" | "admin")}
                  className={styles.users__roleFilter}
                >
                  <option value="all">Все роли</option>
                  <option value="admin">Админ</option>
                  <option value="client">Клиент</option>
                </select>
              </div>
              <button
                className={styles.users__createBtn} 

                style={{backgroundColor: "#9F0FA7"}}
                onClick={() => setShowCreateAdminModal(true)}
              >
                Создать админа
              </button>
            </div>

            {usersLoading ? (
              <div className={styles.loading}>Загрузка пользователей...</div>
            ) : filteredUsers.length === 0 ? (
              <div className={styles.empty}>
                {searchQuery || searchRole !== "all"
                  ? "Пользователи не найдены"
                  : "Нет пользователей"}
              </div>
            ) : (
              <>
                <div className={styles.users__list}>
                  {paginatedUsers.map((user) => (
                    <div key={user.id} className={styles.users__item}>
                      <div className={styles.users__itemInfo}>
                        <h3 className={styles.users__itemName}>{user.name}</h3>
                        <p className={styles.users__itemEmail}>{user.email}</p>
                        {user.phone && <p className={styles.users__itemPhone}>{user.phone}</p>}
                        {user.country && (
                          <p className={styles.users__itemCountry}>{user.country}</p>
                        )}
                      </div>
                      <div className={styles.users__itemRole}>
                        <span
                          className={`${styles.users__roleBadge} ${
                            user.role === "admin" ? styles.users__roleBadge_admin : ""
                          }`}
                        >
                          {user.role === "admin" ? "Админ" : "Клиент"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.pagination}>
                  <div className={styles.pagination__info}>
                    <span>
                      Показано: {(currentPage - 1) * itemsPerPage + 1} -{" "}
                      {Math.min(currentPage * itemsPerPage, filteredUsers.length)} из{" "}
                      {filteredUsers.length}
                    </span>
                  </div>

                  <div className={styles.pagination__controls}>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className={styles.pagination__select}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>

                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={styles.pagination__btn}
                    >
                      &lt;
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                      )
                      .map((page, idx, array) => (
                        <React.Fragment key={page}>
                          {idx > 0 && array[idx - 1] !== page - 1 && (
                            <span className={styles.pagination__ellipsis}>...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(page)}
                            style={{backgroundColor: "#9F0FA7"}}
                            className={`${styles.pagination__btn} ${
                              currentPage === page ? styles.pagination__btn_active : ""
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={styles.pagination__btn}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {showCreateAdminModal && (
          <div className={styles.modal} onClick={() => setShowCreateAdminModal(false)}>
            <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modal__title}>Создать администратора</h2>
              <form onSubmit={handleCreateAdmin} className={styles.modal__form}>
                <div className={styles.modal__field}>
                  <label className={styles.modal__label}>Email</label>
                  <input
                    type="email"
                    required
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className={styles.modal__input}
                  />
                </div>
                <div className={styles.modal__field}>
                  <label className={styles.modal__label}>Пароль</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className={styles.modal__input}
                  />
                </div>
                <div className={styles.modal__field}>
                  <label className={styles.modal__label}>Имя</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.firstName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                    className={styles.modal__input}
                  />
                </div>
                <div className={styles.modal__field}>
                  <label className={styles.modal__label}>Фамилия</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.lastName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                    className={styles.modal__input}
                  />
                </div>
                <div className={styles.modal__field}>
                  <label className={styles.modal__label}>Отчество</label>
                  <input
                    type="text"
                    value={newAdmin.middleName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, middleName: e.target.value })}
                    className={styles.modal__input}
                  />
                </div>
                <div className={styles.modal__field}>
                  <label className={styles.modal__label}>Телефон</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.phone}
                    onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                    className={styles.modal__input}
                  />
                </div>
                <div className={styles.modal__field}>
                  <label className={styles.modal__label}>Страна</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.country}
                    onChange={(e) => setNewAdmin({ ...newAdmin, country: e.target.value })}
                    className={styles.modal__input}
                  />
                </div>
                <div className={styles.modal__actions}>
                  <button
                    type="button"

                     style={{ padding: "10px 20px"}}
                    onClick={() => setShowCreateAdminModal(false)}
                    className={styles.modal__btn_secondary}
                  >
                    Отмена
                  </button>
                  <button type="submit"  style={{color: "white", background: "#9f0fa7", padding: "10px 20px"}} className={styles.modal__btn_primary}>
                    Создать
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreateAnnouncementModal && (
          <div className={styles.modal} onClick={() => setShowCreateAnnouncementModal(false)}>
            <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modal__title}>Создать анонс</h2>
              <form onSubmit={handleCreateAnnouncement} className={styles.modal__form}>
                <div className={styles.modal__field}>
                  <label className={styles.modal__label}>Заголовок</label>
                  <input
                    type="text"
                    required
                    value={newAnnouncement.title}
                    onChange={(e) =>
                      setNewAnnouncement({ ...newAnnouncement, title: e.target.value })
                    }
                    className={styles.modal__input}
                  />
                </div>
                <div className={styles.modal__field}>
                  <label className={styles.modal__label}>Содержание</label>
                  <textarea
                    required
                    rows={6}
                    value={newAnnouncement.content}
                    onChange={(e) =>
                      setNewAnnouncement({ ...newAnnouncement, content: e.target.value })
                    }
                    className={styles.modal__textarea}
                  />
                </div>
                <div className={styles.modal__actions}>
                  <button
                    type="button"
                    onClick={() => setShowCreateAnnouncementModal(false)}
                    className={styles.modal__btn_secondary}
                  >
                    Отмена
                  </button>
                  <button type="submit" className={styles.modal__btn_primary}>
                    Создать
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorshipPage;
