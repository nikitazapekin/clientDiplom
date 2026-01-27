import styles from "./index.module.scss";
import type { ButtonProps } from "./types";

const Button = ({ text, onClick, color, width, textColor }: ButtonProps) => {
  const buttonStyle = {
    backgroundColor: color,
    maxWidth: width,
    color: textColor,
  };

  return (
    <button onClick={onClick} className={styles.button} style={buttonStyle}>
      {text}
    </button>
  );
};

export default Button;
