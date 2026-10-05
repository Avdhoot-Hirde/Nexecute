import { Link } from "react-router-dom"

function Button({llogo=null,url='/',content, rlogo=null,style}) {
  return (
    <Link to={url} className={`primary-button p-3 rounded-lg flex gap-1.5 justify-center ${style}`}>
          {llogo}{content}{rlogo}
    </Link>
  )
}

export default Button
