import styles from "./index.module.scss";
import type { ButtonProps } from "./types";

const Button = ({ text, onClick, color, width, textColor, disabled }: ButtonProps) => {
  const buttonStyle = {
    backgroundColor: color,
    maxWidth: width,
    color: textColor,
  };

  return (
    <button onClick={onClick} className={styles.button} style={buttonStyle} disabled={disabled}>
      {text}
    </button>
  );
};

export default Button;
