"use client";

import { JSX, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  title: string;
  content: string;
  createdAt: string;
  author: string;
};

type Update = {
  id: string;
  title: string;
  content: string;
  version: string;
  createdAt: string;
};

type TabType = "announcements" | "updates" | "structure";

const MentorshipPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("structure");
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

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

      setAnnouncements([
        {
          id: "1",
          title: "Добро пожаловать в портал для менторов!",
          content: "Теперь вы можете управлять своими курсами и отслеживать прогресс студентов.",
          createdAt: new Date().toISOString(),
          author: "System",
        },
      ]);

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
        },
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
            {node.type === "admin" && "👤"}
            {node.type === "course" && (node.expanded ? "📂" : "📁")}
            {node.type === "student" && "👨‍🎓"}
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
      <h1 className={styles.title}>Для менторов</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${
            activeTab === "announcements" ? styles.tab_active : ""
          }`}
          onClick={() => setActiveTab("announcements")}
        >
          Анонсы
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "updates" ? styles.tab_active : ""
          }`}
          onClick={() => setActiveTab("updates")}
        >
          Обновления
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "structure" ? styles.tab_active : ""
          }`}
          onClick={() => setActiveTab("structure")}
        >
          Структура
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "announcements" && (
          <div className={styles.announcements}>
            {announcements.length === 0 ? (
              <div className={styles.empty}>Нет анонсов</div>
            ) : (
              announcements.map((announcement) => (
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
              ))
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
      </div>
    </div>
  );
};

export default MentorshipPage;
