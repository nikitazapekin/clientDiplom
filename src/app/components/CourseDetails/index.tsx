"use client";

import Certificate from "@assets/courses/Certificate.jpg";
import Image from "next/image";

import Button from "../Button";

import styles from "./index.module.scss";
import type { CourseResponse } from "./types";

const CourseDetails = ({ course }: CourseResponse) => {
  return (
    <div className={styles.courses}>
      <div className={styles.courses__container}>
        <div className={styles.courses__preview}>
          <Image
            src={course.logo}
            alt="Logo"
            className={styles.courses__image}
            width={300}
            height={300}
          />
          <div className={styles.courses__info}>
            <div className={styles.courses__infoPreview}>
              <h1 className={styles.courses__title}>{course.title}</h1>
              <p className={styles.courses__edit}>Редактировать</p>
            </div>

            <h2 className={styles.courses__description}>{course.description}</h2>

            <p className={styles.courses__detail}>Количество уроков: 0</p>

            <p className={styles.courses__detail}>Количество студентов: 0</p>

            <ul className={styles.courses__tags}>
              {course.tags.map((item, index) => (
                <li className={styles.courses__tag} key={index}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.course__details}>
          <h2 className={styles.course__subtitle}>О курсе</h2>

          <p className={styles.course__detailedDescription}>
            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Quia fugit expedita saepe
            culpa mollitia, quidem minus eligendi provident blanditiis voluptatem? Perspiciatis
            autem magni deserunt voluptatem assumenda ex et quidem doloribus. Lorem ipsum, dolor sit
            amet consectetur adipisicing elit. Impedit illo id officia sint, iusto distinctio,
            voluptatem velit vero tempore corporis perspiciatis ut voluptate maxime tenetur nam
            possimus non tempora odio? Lorem ipsum dolor, sit amet consectetur adipisicing elit.
            Similique maiores placeat voluptatibus facere velit. Ex tempore placeat ducimus quaerat
            quis nesciunt fugit. Eligendi sapiente odit officiis illo reprehenderit quidem hic.
          </p>
        </div>

        <div className={styles.courses__certificate}>
          <h3 className={styles.courses__certificateTitle}>
            Сертификат о успешном прохождении курса
          </h3>
          <Image
            src={Certificate}
            alt={"Certificate"}
            className={styles.courses__certificateImage}
          />
        </div>
        <div className={styles.courses__actions}>
          <Button
            text="Просмотреть карту курса"
            onClick={() => {}}
            width="313px"
            color="#9F0FA7"
            textColor="#fff"
          />
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;
