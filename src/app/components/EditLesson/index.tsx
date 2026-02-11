"use client";

import Button from "../Button";

import styles from "./index.module.scss";

const EditLesson = () => {
  return (
    <section className={styles.lesson}>
      <div className={styles.lesson__container}>
        <h1 className={styles.lesson__title}>Редактирование урока</h1>

        <Button
          width="413px"
          color="#9F0FA7"
          textColor="#fff"
          text="Создать слайд"
          onClick={() => {}}
        />
        <form className={styles.form}>
          <div className={styles.form__content}>
            <div className={styles.form__panel}>
              <div className={styles.form__subpreview}>
                <label className={styles.form__label}>Название слайда</label>
                <p className={styles.form__error}>error</p>
              </div>
              <input
                className={styles.form__input}
                placeholder="Введите название"
                type="email"
                //   disabled={isLoading}
                // {...register("email")}
              />
            </div>

            <div className={styles.form__panel}>
              <div className={styles.form__subpreview}>
                <label className={styles.form__label}>Тип слайда</label>
                <p className={styles.form__error}>error</p>
              </div>
              <select>
                <option>Урок</option>
                <option>Задача</option>
              </select>
              {/*  <input
                className={styles.form__input}
                placeholder="Введите название"
                type="email"
              //   disabled={isLoading}
              // {...register("email")}
              /> */}
            </div>

            <div className={styles.form__panel}>
              <div className={styles.form__subpreview}>
                <label className={styles.form__label}>Добавить текст</label>
                <p className={styles.form__error}>error</p>
              </div>

              <div className={styles.form__wrapper}>
                <input
                  className={styles.form__input}
                  placeholder="Введите название"
                  type="email"
                  //   disabled={isLoading}
                  // {...register("email")}
                />

                <Button color="#9F0FA7" width="50px" textColor="#fff" text="+" onClick={() => {}} />
              </div>
            </div>

            <div className={styles.form__panel}>
              <div className={styles.form__subpreview}>
                <label className={styles.form__label}>Добавить кодовый приме</label>
                <p className={styles.form__error}>error</p>
              </div>

              <div className={styles.form__wrapper}>
                <input
                  className={styles.form__input}
                  placeholder="Введите код"
                  type="email"
                  //   disabled={isLoading}
                  // {...register("email")}
                />

                <select>
                  <option>JavaScript</option>
                  <option>C#</option>
                  <option>Python</option>
                  <option>Java</option>
                  <option>Go</option>
                </select>

                <select>
                  <option>Запуск</option>
                  <option>Демо</option>
                </select>

                <Button color="#9F0FA7" width="50px" textColor="#fff" text="+" onClick={() => {}} />
              </div>
            </div>

            <div className={styles.form__panel}>
              <div className={styles.form__subpreview}>
                <label className={styles.form__label}>Добавить таблицу</label>
                <p className={styles.form__error}>error</p>
              </div>

              <div className={styles.form__wrapper}>
                <input
                  className={styles.form__input}
                  placeholder="Введите код"
                  type="email"
                  //   disabled={isLoading}
                  // {...register("email")}
                />

                <select>
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5</option>
                  <option>6</option>
                  <option>7</option>
                  <option>8</option>
                  <option>9</option>
                </select>

                <select>
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5</option>
                  <option>6</option>
                  <option>7</option>
                  <option>8</option>
                  <option>9</option>
                </select>

                <Button color="#9F0FA7" width="50px" textColor="#fff" text="+" onClick={() => {}} />
              </div>
            </div>

            <div className={styles.form__panel}>
              <div className={styles.form__subpreview}>
                <label className={styles.form__label}>Добавить источник</label>
                <p className={styles.form__error}>error</p>
              </div>

              <div className={styles.form__wrapper}>
                <input
                  className={styles.form__input}
                  placeholder="Введите ссылку на источник"
                  type="email"
                  //   disabled={isLoading}
                  // {...register("email")}
                />

                <Button color="#9F0FA7" width="50px" textColor="#fff" text="+" onClick={() => {}} />
              </div>
            </div>

            <div className={styles.form__panel}>
              <div className={styles.form__subpreview}>
                <label className={styles.form__label}>Добавить изображение</label>
                <p className={styles.form__error}>error</p>
              </div>

              <div className={styles.form__wrapper}>
                <input
                  className={styles.form__input}
                  placeholder="Выберите изображение"
                  type="email"
                  //   disabled={isLoading}
                  // {...register("email")}
                />

                <Button color="#9F0FA7" width="50px" textColor="#fff" text="+" onClick={() => {}} />
              </div>
            </div>
          </div>
        </form>

        <div className={styles.preview}>
          <h2 className={styles.preview__title}>Превью урока</h2>

          <div className={styles.preview__wrapper}>
            <div className={styles.preview__content}>
              <h3 className={styles.preview__subtitle}>Переменные var let const</h3>
            </div>
          </div>
        </div>
        <Button
          color="#9F0FA7"
          width="413px"
          textColor="#fff"
          text="Сохранить изменения"
          onClick={() => {}}
        />

        <Button
          color="#F5F4F4"
          width="413px"
          textColor="#000"
          text="Комментарии пользователей"
          onClick={() => {}}
        />

        <Button
          color="#F5F4F4"
          width="413px"
          textColor="#000"
          text="Обсуждения"
          onClick={() => {}}
        />
      </div>
    </section>
  );
};

export default EditLesson;

/*
 <div className={styles.form__inputs}>
          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Почта</label>
              {errors.email && <p className={styles.form__error}>{errors.email.message}</p>}
            </div>
            <input
              className={styles.form__input}
              placeholder="Введите почту"
              type="email"
              disabled={isLoading}
              {...register("email")}
            />
          </div>







          //@use '@styles/' as *;
@use "../../styles/index.scss" as *;

.form {
  background-color: $color-darkLight;

  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  &__content {
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 9px 10px 4px 0 rgba(0, 0, 0, 0.25);
    background-color: $color-white;
    max-width: $container-xs;
    width: 100%;
    flex-direction: column;
    padding: px($spacing-md);
    row-gap: px($spacing-md);
    border-radius: px($radius-large);
  }
  &__preview {
    display: flex;
    column-gap: px($spacing-lg);
    align-items: center;
    justify-content: center;
    flex-direction: row-reverse;
  }

  &__inputs {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 413px;
    row-gap: px($spacing-lg);
  }

  &__panel {
    display: flex;
    flex-direction: column;
  }

  &__subpreview {
    width: 100%;
    display: flex;
    justify-content: space-between;
    flex-direction: row;
  }

  &__input { 
    border: none;
    outline: none;
    cursor: pointer;
    padding: px($spacing-xs);
    background-color: $color-grayLight ;
    border-radius: $radius-small;
  }
  &__label {

  }
  &__error {
    margin-left: 20px;
    text-align: right;
    color: $color-red
  }
}
          */
