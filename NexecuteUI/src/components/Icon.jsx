import { Link } from "react-router-dom";

function Icon({ url = "/", h = 80 }) {
  return (
    <Link to={url}>
      <svg
        width={h}
        height={h}
        viewBox="10 18 102 102"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Nexecute"
      >
        <g transform="translate(10 12)">
          <g transform="translate(0,8)">
            <polygon points="8,30 28,46 28,84 8,98" fill="#FFFFFF" />
          </g>

          <g transform="translate(-5,2)">
            <polygon
              points="62,22 84,8 84,48 68,36 68,44 62,39"
              fill="#FFFFFF"
            />
          </g>

          <polygon
            points="8,8 66,52 66,44 94,66 70,90 70,82 8,34"
            fill="#7C3AED"
          />
        </g>
      </svg>
    </Link>
  );
}

export default Icon;
